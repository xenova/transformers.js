const { ONNX } = require('./backends/onnx.js');

const { interpolate: interpolate_data, transpose: transpose_data } = require('./math_utils.js');


/**
 * @typedef {import('./math_utils.js').AnyTypedArray} AnyTypedArray
 */

const ONNXTensor = ONNX.Tensor;

// TODO: fix error below
class Tensor extends ONNXTensor {
    /**
     * Create a new Tensor or copy an existing Tensor.
     * @param  {[string, Array|AnyTypedArray, number[]]|[ONNXTensor]} args 
     */
    constructor(...args) {
        if (args[0] instanceof ONNX.Tensor) {
            // Create shallow copy
            super(args[0].type, args[0].data, args[0].dims);

        } else {
            // Create new
            super(...args)
        }
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
     * 
     * @param {number} index 
     * @returns {Tensor}
     * @todo Set type based on dims
     */
    get(index) {
        const iterDims = this.dims.slice(1);
        if (iterDims.length > 0) {
            const iterSize = iterDims.reduce((a, b) => a * b);
            return this._subarray(index, iterSize, iterDims);
        } else {
            return this.data[index];
        }
    }

    /**
     * @param {any} item 
     * @returns {number}
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

    tolist() {
        // Convert tensor data to a n-dimensional JS list
        return reshape(this.data, this.dims)
    }

    /**
     * Return a new Tensor the sigmoid function applied to each element.
     * @returns {Tensor} - The tensor with the sigmoid function applied.
     */
    sigmoid() {
        return this.clone().sigmoid_();
    }

    /**
     * Applies the sigmoid function to the tensor in place.
     * @returns {Tensor} - Returns `this`.
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

    // TODO add .slice()

    /**
     * Return a transposed version of this Tensor, according to the provided dimensions.
     * @param  {...number} dims - Dimensions to transpose.
     * @returns {Tensor} - The transposed tensor.
     */
    transpose(...dims) {
        return transpose(this, dims);
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
 * @param {T[]} data - The input array to reshape.
 * @param {DIM} dimensions - The target shape/dimensions.
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
 * @param {any} tensor - The input tensor to transpose.
 * @param {Array} axes - The axes to transpose the tensor along.
 * @returns {Tensor} The transposed tensor.
 */
function transpose(tensor, axes) {
    const [transposedData, shape] = transpose_data(tensor.data, tensor.dims, axes);
    return new Tensor(tensor.type, transposedData, shape);
}


/**
 * Concatenates an array of tensors along the 0th dimension.
 *
 * @param {any} tensors - The array of tensors to concatenate.
 * @returns {Tensor} - The concatenated tensor.
 */
function cat(tensors) {
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
 * @param {Tensor} input - The input tensor to interpolate. Data must be channel-first (i.e., [c, h, w])
 * @param {number[]} size - The output size of the image
 * @param {string} mode - The interpolation mode
 * @param {boolean} align_corners - Whether to align corners.
 * @returns {Tensor} - The interpolated tensor.
 */
function interpolate(input, [out_height, out_width], mode = 'bilinear', align_corners = false) {

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

module.exports = {
    Tensor,
    transpose,
    cat,
    interpolate,
    transpose_data,
}
