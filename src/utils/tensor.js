/**
 * @file Helper module for `Tensor` processing.
 * 
 * These functions and classes are only used internally, 
 * meaning an end-user shouldn't need to access anything here.
 * 
 * @module utils/tensor
 */

import { ONNX } from '../backends/onnx.js';

import {
    interpolate_data,
    transpose_data
} from './maths.js';


/**
 * @typedef {import('./maths.js').AnyTypedArray} AnyTypedArray
 */

const ONNXTensor = ONNX.Tensor;

export class Tensor extends ONNXTensor {
    /**
     * Create a new Tensor or copy an existing Tensor.
     * @param {[string, Array|AnyTypedArray, number[]]|[ONNXTensor]} args
     */
    constructor(...args) {
        if (args[0] instanceof ONNX.Tensor) {
            // Create shallow copy
            super(args[0].type, args[0].data, args[0].dims);

        } else {
            // Create new
            super(...args);
        }

        return new Proxy(this, {
            get: (obj, key) => {
                if (typeof key === 'string') {
                    let index = Number(key);
                    if (Number.isInteger(index)) {
                        // key is an integer (i.e., index)
                        return obj._getitem(index);
                    }
                }
                // @ts-ignore
                return obj[key];
            },
            set: (obj, key, value) => {
                // TODO allow setting of data

                // @ts-ignore
                return obj[key] = value;
            }
        });
    }

    /**
     * Returns an iterator object for iterating over the tensor data in row-major order.
     * If the tensor has more than one dimension, the iterator will yield subarrays.
     * @returns {Iterator} An iterator object for iterating over the tensor data in row-major order.
     */
    *[Symbol.iterator]() {
        const [iterLength, ...iterDims] = this.dims;

        if (iterDims.length > 0) {
            const iterSize = iterDims.reduce((a, b) => a * b);
            for (let i = 0; i < iterLength; ++i) {
                yield this._subarray(i, iterSize, iterDims);
            }
        } else {
            yield* this.data
        }

    }

    /**
     * Index into a Tensor object.
     * @param {number} index The index to access.
     * @returns {Tensor} The data at the specified index.
     */
    _getitem(index) {
        const [iterLength, ...iterDims] = this.dims;

        if (index >= iterLength || index < -iterLength) {
            throw new Error(`Index ${index} is out of bounds for dimension 0 with size ${iterLength}`);
        }
        if (index < 0) {
            // Negative indexing
            index += iterLength;
        }

        if (iterDims.length > 0) {
            const iterSize = iterDims.reduce((a, b) => a * b);
            return this._subarray(index, iterSize, iterDims);
        } else {
            return new Tensor(this.type, [this.data[index]], iterDims);
        }
    }

    /**
     * @param {number|bigint} item The item to search for in the tensor
     * @returns {number} The index of the first occurrence of item in the tensor data.
     */
    indexOf(item) {
        for (let index = 0; index < this.data.length; ++index) {
            // Note: == instead of === so we can match Ints with BigInts
            if (this.data[index] == item) {
                return index;
            }
        }
        return -1;
    }

    /**
     * @param {number} index 
     * @param {number} iterSize 
     * @param {any} iterDims 
     * @returns {Tensor}
     */
    _subarray(index, iterSize, iterDims) {
        let data = this.data.subarray(index * iterSize, (index + 1) * iterSize);
        return new Tensor(this.type, data, iterDims);
    }

    /**
     * Returns the value of this tensor as a standard JavaScript Number. This only works
     * for tensors with one element. For other cases, see `Tensor.tolist()`.
     * @returns {number} The value of this tensor as a standard JavaScript Number.
     * @throws {Error} If the tensor has more than one element.
     */
    item() {
        if (this.data.length !== 1) {
            throw new Error(`a Tensor with ${this.data.length} elements cannot be converted to Scalar`);
        }
        return this.data[0];
    }

    /**
     * Convert tensor data to a n-dimensional JS list
     * @returns {Array}
     */
    tolist() {
        return reshape(this.data, this.dims)
    }

    /**
     * Return a new Tensor the sigmoid function applied to each element.
     * @returns {Tensor} The tensor with the sigmoid function applied.
     */
    sigmoid() {
        return this.clone().sigmoid_();
    }

    /**
     * Applies the sigmoid function to the tensor in place.
     * @returns {Tensor} Returns `this`.
     */
    sigmoid_() {
        for (let i = 0; i < this.data.length; ++i) {
            this.data[i] = 1 / (1 + Math.exp(-this.data[i]));
        }
        return this;
    }

    clone() {
        return new Tensor(this.type, this.data.slice(), this.dims.slice());
    }

    slice(...slices) {
        // This allows for slicing with ranges and numbers
        let newTensorDims = [];
        let newOffsets = [];

        // slices is an array of numbers or arrays of numbers
        // e.g., slices = [0, [1, 3], null, [0, 3]]
        for (let sliceIndex = 0; sliceIndex < this.dims.length; ++sliceIndex) {
            let slice = slices[sliceIndex];

            if (slice === null || slice === undefined) {
                // null or undefined means take the whole dimension
                newOffsets.push([0, this.dims[sliceIndex]]);
                newTensorDims.push(this.dims[sliceIndex]);

            } else if (typeof slice === 'number') {
                if (slice < -this.dims[sliceIndex] || slice >= this.dims[sliceIndex]) {
                    throw new Error(`IndexError: index ${slice} is out of bounds for dimension ${sliceIndex} with size ${this.dims[sliceIndex]}`);
                }
                if (slice < 0) {
                    slice += this.dims[sliceIndex];
                }

                // A number means take a single element
                newOffsets.push([slice, slice + 1]);

            } else if (Array.isArray(slice) && slice.length === 2) {
                // An array of length 2 means take a range of elements

                if (slice[0] > slice[1]) {
                    throw new Error(`Invalid slice: ${slice}`);
                }

                let offsets = [
                    Math.max(slice[0], 0),
                    Math.min(slice[1], this.dims[sliceIndex])
                ];

                newOffsets.push(offsets);
                newTensorDims.push(offsets[1] - offsets[0]);

            } else {
                throw new Error(`Invalid slice: ${slice}`);
            }
        }

        let newDims = newOffsets.map(([start, end]) => end - start);
        let newBufferSize = newDims.reduce((a, b) => a * b);

        // Allocate memory
        let data = new this.data.constructor(newBufferSize);

        // Precompute strides
        const stride = new Array(this.dims.length);
        for (let i = newDims.length - 1, s2 = 1; i >= 0; --i) {
            stride[i] = s2;
            s2 *= this.dims[i];
        }

        for (let i = 0; i < newBufferSize; ++i) {
            let originalIndex = 0;
            for (let j = newDims.length - 1, num = i; j >= 0; --j) {
                const size = newDims[j];
                originalIndex += ((num % size) + newOffsets[j][0]) * stride[j];
                num = Math.floor(num / size);
            }
            data[i] = this.data[originalIndex];
        }
        return new Tensor(this.type, data, newTensorDims);

    }

    /**
     * Return a transposed version of this Tensor, according to the provided dimensions.
     * @param  {...number} dims Dimensions to transpose.
     * @returns {Tensor} The transposed tensor.
     */
    transpose(...dims) {
        return transpose(this, dims);
    }

    // TODO add .max() and .min() methods
}

/**
 * This creates a nested array of a given type and depth (see examples).
 * 
 * @example
 *   NestArray<string, 1>; // string[]
 * @example
 *   NestArray<number, 2>; // number[][]
 * @example
 *   NestArray<string, 3>; // string[][][] etc.
 * @template T
 * @template {number} Depth
 * @template {never[]} [Acc=[]]
 * @typedef {Acc['length'] extends Depth ? T : NestArray<T[], Depth, [...Acc, never]>} NestArray
 */

/**
 * Reshapes a 1-dimensional array into an n-dimensional array, according to the provided dimensions.
 *
 * @example
 *   reshape([10                    ], [1      ]); // Type: number[]      Value: [10]
 *   reshape([1, 2, 3, 4            ], [2, 2   ]); // Type: number[][]    Value: [[1, 2], [3, 4]]
 *   reshape([1, 2, 3, 4, 5, 6, 7, 8], [2, 2, 2]); // Type: number[][][]  Value: [[[1, 2], [3, 4]], [[5, 6], [7, 8]]]
 *   reshape([1, 2, 3, 4, 5, 6, 7, 8], [4, 2   ]); // Type: number[][]    Value: [[1, 2], [3, 4], [5, 6], [7, 8]]
 * @param {T[]} data The input array to reshape.
 * @param {DIM} dimensions The target shape/dimensions.
 * @template T
 * @template {[number]|[number, number]|[number, number, number]|[number, number, number, number]} DIM
 * @returns {NestArray<T, DIM["length"]>} The reshaped array.
 */
function reshape(data, dimensions) {

    const totalElements = data.length;
    const dimensionSize = dimensions.reduce((a, b) => a * b);

    if (totalElements !== dimensionSize) {
        throw Error(`cannot reshape array of size ${totalElements} into shape (${dimensions})`);
    }

    /** @type {any} */
    let reshapedArray = data;

    for (let i = dimensions.length - 1; i >= 0; i--) {
        reshapedArray = reshapedArray.reduce((acc, val) => {
            let lastArray = acc[acc.length - 1];

            if (lastArray.length < dimensions[i]) {
                lastArray.push(val);
            } else {
                acc.push([val]);
            }

            return acc;
        }, [[]]);
    }

    return reshapedArray[0];
}

/**
 * Transposes a tensor according to the provided axes.
 * @param {any} tensor The input tensor to transpose.
 * @param {Array} axes The axes to transpose the tensor along.
 * @returns {Tensor} The transposed tensor.
 */
export function transpose(tensor, axes) {
    const [transposedData, shape] = transpose_data(tensor.data, tensor.dims, axes);
    return new Tensor(tensor.type, transposedData, shape);
}


/**
 * Concatenates an array of tensors along the 0th dimension.
 *
 * @param {any} tensors The array of tensors to concatenate.
 * @returns {Tensor} The concatenated tensor.
 */
export function cat(tensors) {
    if (tensors.length === 0) {
        return tensors[0];
    }
    // NOTE: tensors must be batched
    // NOTE: currently only supports dim=0
    // TODO: add support for dim != 0


    let tensorType = tensors[0].type;
    let tensorShape = [...tensors[0].dims];
    tensorShape[0] = tensors.length;

    // Calculate total size to allocate
    let total = 0;
    for (let t of tensors) {
        total += t.data.length;
    }

    // Create output tensor of same type as first
    let data = new tensors[0].data.constructor(total);

    let offset = 0;
    for (let t of tensors) {
        data.set(t.data, offset);
        offset += t.data.length;
    }

    return new Tensor(tensorType, data, tensorShape)
}

/**
 * Interpolates an Tensor to the given size.
 * @param {Tensor} input The input tensor to interpolate. Data must be channel-first (i.e., [c, h, w])
 * @param {number[]} size The output size of the image
 * @param {string} mode The interpolation mode
 * @param {boolean} align_corners Whether to align corners.
 * @returns {Tensor} The interpolated tensor.
 */
export function interpolate(input, [out_height, out_width], mode = 'bilinear', align_corners = false) {

    // Input image dimensions
    const in_channels = input.dims.at(-3) ?? 1;
    const in_height = input.dims.at(-2);
    const in_width = input.dims.at(-1);

    let output = interpolate_data(
        input.data,
        [in_channels, in_height, in_width],
        [out_height, out_width],
        mode,
        align_corners
    );
    return new Tensor(input.type, output, [in_channels, out_height, out_width]);
}
