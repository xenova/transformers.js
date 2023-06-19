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

/** @type {Object} */
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
     * Return a new Tensor with the sigmoid function applied to each element.
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

    /**
     * Returns the sum of each row of the input tensor in the given dimension dim.
     * 
     * @param {number} [dim=null] The dimension or dimensions to reduce. If `null`, all dimensions are reduced.
     * @param {boolean} keepdim Whether the output tensor has `dim` retained or not.
     * @returns The summed tensor
     */
    sum(dim = null, keepdim = false) {
        return this.norm(1, dim, keepdim);
    }

    /**
     * Returns the matrix norm or vector norm of a given tensor.
     * @param {number|string} [p='fro'] The order of norm
     * @param {number} [dim=null] Specifies which dimension of the tensor to calculate the norm across.
     * If dim is None, the norm will be calculated across all dimensions of input.
     * @param {boolean} [keepdim=false] Whether the output tensors have dim retained or not.
     * @returns {Tensor} The norm of the tensor.
     */
    norm(p = 'fro', dim = null, keepdim = false) {
        if (p === 'fro') {
            // NOTE: Since we only support integer dims, Frobenius norm produces the same result as p=2.
            p = 2;
        } else if (typeof p === 'string') {
            throw Error(`Unsupported norm: ${p}`);
        }

        if (dim === null) {
            // @ts-ignore
            let val = this.data.reduce((a, b) => a + (b ** p), 0) ** (1 / p);
            return new Tensor(this.type, [val], [1]);
        }

        if (dim < 0) {
            // Negative indexing
            dim += this.dims.length;
        }


        // Calculate the shape of the resulting array after summation
        const resultDims = this.dims.slice(); // Copy the original dimensions
        resultDims[dim] = 1; // Remove the specified axis

        // Create a new array to store the accumulated values
        const result = new this.data.constructor(this.data.length / this.dims[dim]);

        // Iterate over the data array
        for (let i = 0; i < this.data.length; ++i) {

            // Calculate the index in the resulting array
            let resultIndex = 0;

            for (let j = this.dims.length - 1, num = i, resultMultiplier = 1; j >= 0; --j) {
                const size = this.dims[j];
                if (j !== dim) {
                    const index = num % size;
                    resultIndex += index * resultMultiplier;
                    resultMultiplier *= resultDims[j];
                }
                num = Math.floor(num / size);
            }

            // Accumulate the value at the current index
            result[resultIndex] += (this.data[i]) ** p;
        }

        if (p !== 1) {
            for (let i = 0; i < result.length; ++i) {
                result[i] = result[i] ** (1 / p);
            }
        }

        if (!keepdim) {
            resultDims.splice(dim, 1);
        }

        return new Tensor(this.type, result, resultDims);
    }

    /**
     * Performs `L_p` normalization of inputs over specified dimension. Operates in place.
     * @param {number} [p=2] The exponent value in the norm formulation
     * @param {number} [dim=1] The dimension to reduce
     * @returns {Tensor} `this` for operation chaining.
     */
    normalize_(p = 2.0, dim = 1) {
        if (dim < 0) {
            // Negative indexing
            dim += this.dims.length;
        }

        const norm = this.norm(p, dim, true);

        for (let i = 0; i < this.data.length; ++i) {

            // Calculate the index in the resulting array
            let resultIndex = 0;

            for (let j = this.dims.length - 1, num = i, resultMultiplier = 1; j >= 0; --j) {
                const size = this.dims[j];
                if (j !== dim) {
                    const index = num % size;
                    resultIndex += index * resultMultiplier;
                    resultMultiplier *= this.dims[j];
                }
                num = Math.floor(num / size);
            }

            // Divide by normalized value
            this.data[i] /= norm.data[resultIndex];
        }

        return this;
    }

    /**
     * Performs `L_p` normalization of inputs over specified dimension.
     * @param {number} [p=2] The exponent value in the norm formulation
     * @param {number} [dim=1] The dimension to reduce
     * @returns {Tensor} The normalized tensor.
     */
    normalize(p = 2.0, dim = 1) {
        return this.clone().normalize_(p, dim);
    }

    /**
     * Compute and return the stride of this tensor.
     * Stride is the jump necessary to go from one element to the next one in the specified dimension dim.
     * @returns {number[]} The stride of this tensor.
     */
    stride() {
        const stride = new Array(this.dims.length);
        for (let i = this.dims.length - 1, s2 = 1; i >= 0; --i) {
            stride[i] = s2;
            s2 *= this.dims[i];
        }
        return stride;
    }

    /**
     * Returns a tensor with all specified dimensions of input of size 1 removed.
     * 
     * NOTE: The returned tensor shares the storage with the input tensor, so changing the contents of one will change the contents of the other.
     * If you would like a copy, use `tensor.clone()` before squeezing.
     * 
     * @param {number} [dim=null] If given, the input will be squeezed only in the specified dimensions.
     * @returns The squeezed tensor
     */
    squeeze(dim = null) {
        return new Tensor(
            this.type,
            this.data,
            calc_squeeze_dims(this.dims, dim)
        )
    }

    /**
     * In-place version of @see {@link Tensor.squeeze}
     */
    squeeze_(dim = null) {
        this.dims = calc_squeeze_dims(this.dims, dim);
        return this;
    }

    /**
     * Returns a new tensor with a dimension of size one inserted at the specified position.
     * 
     * NOTE: The returned tensor shares the same underlying data with this tensor.
     * 
     * @param {number} dim The index at which to insert the singleton dimension
     * @returns The unsqueezed tensor
     */
    unsqueeze(dim = null) {
        return new Tensor(
            this.type,
            this.data,
            calc_unsqueeze_dims(this.dims, dim)
        );
    }

    /**
     * In-place version of @see {@link Tensor.unsqueeze}
     */
    unsqueeze_(dim = null) {
        this.dims = calc_unsqueeze_dims(this.dims, dim);
        return this;
    }

    /**
     * In-place version of @see {@link Tensor.flatten}
     */
    flatten_(start_dim = 0, end_dim = -1) {
        // TODO validate inputs
        end_dim = (end_dim + this.dims.length) % this.dims.length;

        let dimsToKeepBefore = this.dims.slice(0, start_dim);
        let dimsToFlatten = this.dims.slice(start_dim, end_dim + 1);
        let dimsToKeepAfter = this.dims.slice(end_dim + 1);

        this.dims = [...dimsToKeepBefore, dimsToFlatten.reduce((a, b) => a * b, 1), ...dimsToKeepAfter]
        return this;
    }

    /**
     * Flattens input by reshaping it into a one-dimensional tensor.
     * If `start_dim` or `end_dim` are passed, only dimensions starting with `start_dim`
     * and ending with `end_dim` are flattened. The order of elements in input is unchanged.
     * @param {*} start_dim the first dim to flatten
     * @param {*} end_dim the last dim to flatten
     * @returns The flattened tensor.
     */
    flatten(start_dim = 0, end_dim = -1) {
        return this.clone().flatten_(start_dim, end_dim);
    }

    /**
     * Returns a new tensor with the same data as the `self` tensor but of a different `shape`.
     * @param  {...number} dims the desired size
     * @returns {Tensor} The tensor with the same data but different shape
     */
    view(...dims) {
        // TODO: validate dims
        let inferredIndex = -1;
        for (let i = 0; i < dims.length; ++i) {
            if (dims[i] === -1) {
                if (inferredIndex !== -1) {
                    throw new Error("Only one dimension can be inferred");
                }
                inferredIndex = i;
            }
        }

        if (inferredIndex !== -1) {
            // Some dimension must be inferred
            const productOther = dims.reduce((product, curr, index) => {
                return index !== inferredIndex ? product * curr : product
            }, 1);

            dims[inferredIndex] = this.data.length / productOther;
        }
        return new Tensor(this.type, this.data, dims); // NOTE: uses same underlying storage
    }
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

/**
 * Perform mean pooling of the last hidden state followed by a normalization step.
 * @param {Tensor} last_hidden_state Tensor of shape [batchSize, seqLength, embedDim]
 * @param {Tensor} attention_mask Tensor of shape [batchSize, seqLength]
 * @returns {Tensor} Returns a new Tensor of shape [batchSize, embedDim].
 */
export function mean_pooling(last_hidden_state, attention_mask) {
    // last_hidden_state: [batchSize, seqLength, embedDim]
    // attention_mask:    [batchSize, seqLength]

    let shape = [last_hidden_state.dims[0], last_hidden_state.dims[2]];
    let returnedData = new last_hidden_state.data.constructor(shape[0] * shape[1]);
    let [batchSize, seqLength, embedDim] = last_hidden_state.dims;

    let outIndex = 0;
    for (let i = 0; i < batchSize; ++i) {
        let offset = i * embedDim * seqLength;

        for (let k = 0; k < embedDim; ++k) {
            let sum = 0;
            let count = 0;

            let attnMaskOffset = i * seqLength;
            let offset2 = offset + k;
            // Pool over all words in sequence
            for (let j = 0; j < seqLength; ++j) {
                // index into attention mask
                let attn = Number(attention_mask.data[attnMaskOffset + j]);

                count += attn;
                sum += last_hidden_state.data[offset2 + j * embedDim] * attn;
            }

            let avg = sum / count;
            returnedData[outIndex++] = avg;
        }
    }

    return new Tensor(
        last_hidden_state.type,
        returnedData,
        shape
    )
}

/**
 * Helper function to calculate new dimensions when performing a squeeze operation.
 * @param {number[]} dims The dimensions of the tensor.
 * @param {number|number[]|null} dim The dimension(s) to squeeze.
 * @returns The new dimensions.
 * @private
 */
function calc_squeeze_dims(dims, dim) {
    dims = dims.slice();
    if (dim === null) {
        dims = dims.filter((d) => d !== 1);
    } else if (typeof dim === 'number') {
        if (dims[dim] === 1) {
            dims.splice(dim, 1);
        }
    } else if (Array.isArray(dim)) {
        dims = dims.filter((x, i) => {
            return x !== 1 || !dim.includes(i);
        });
    }
    return dims;
}

/**
 * Helper function to calculate new dimensions when performing an unsqueeze operation.
 * @param {number[]} dims The dimensions of the tensor.
 * @param {number} dim The dimension to unsqueeze.
 * @returns The new dimensions.
 * @private
 */
function calc_unsqueeze_dims(dims, dim) {
    // TODO: add bounds error checking

    dims = dims.slice();
    if (dim < 0) {
        // Negative indexing, ensuring positive index
        dim = ((dim % dims.length) + dims.length) % dims.length;
    }

    // Insert 1 into specified dimension
    dims.splice(dim, 0, 1);
    return dims;
}
