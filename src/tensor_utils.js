const { Tensor } = require('onnxruntime-web');

// TODO extend Tensor

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

module.exports = {
    transpose
}