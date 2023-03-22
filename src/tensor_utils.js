const { ONNX } = require('./backends/onnx.js');

class Tensor extends ONNX.Tensor {
    constructor(...args) {
        if (args[0] instanceof ONNX.Tensor) {
            // Create shallow copy
            super(args[0].type, args[0].data, args[0].dims);

        } else {
            // Create new
            super(...args)
        }
    }

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

    get(index) {
        const iterDims = this.dims.slice(1);
        if (iterDims.length > 0) {
            const iterSize = iterDims.reduce((a, b) => a * b);
            return this._subarray(index, iterSize, iterDims);
        } else {
            return this.data[index];
        }
    }

    indexOf(item) {
        for (let index = 0; index < this.data.length; ++index) {
            // Note: == instead of === so we can match Ints with BigInts
            if (this.data[index] == item) {
                return index;
            }
        }
        return -1;
    }

    _subarray(index, iterSize, iterDims) {
        let data = this.data.subarray(index * iterSize, (index + 1) * iterSize);
        return new Tensor(this.type, data, iterDims);
    }

    tolist() {
        // Convert tensor data to a n-dimensional JS list
        return reshape(this.data, this.dims)
    }

    // TODO add .slice()
}


function reshape(data, dimensions) {

    const totalElements = data.length;
    const dimensionSize = dimensions.reduce((a, b) => a * b);

    if (totalElements !== dimensionSize) {
        throw Error(`cannot reshape array of size ${totalElements} into shape (${dimensions})`);
    }

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

function transpose(tensor, axes) {
    // Calculate the new shape of the transposed array
    // and the stride of the original array
    const shape = new Array(axes.length);
    const stride = new Array(axes.length);

    for (let i = axes.length - 1, s = 1; i >= 0; --i) {
        stride[i] = s;
        shape[i] = tensor.dims[axes[i]];
        s *= shape[i];
    }

    // Precompute inverse mapping of stride
    const invStride = axes.map((_, i) => stride[axes.indexOf(i)]);

    // Create the transposed array with the new shape
    const transposedData = new tensor.data.constructor(tensor.data.length);

    // Transpose the original array to the new array
    for (let i = 0; i < tensor.data.length; ++i) {
        let newIndex = 0;
        for (let j = tensor.dims.length - 1, k = i; j >= 0; --j) {
            newIndex += (k % tensor.dims[j]) * invStride[j];
            k = Math.floor(k / tensor.dims[j]);
        }
        transposedData[newIndex] = tensor.data[i];
    }
    return new Tensor(tensor.type, transposedData, shape);
}

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



module.exports = {
    Tensor,
    transpose,
    cat
}
