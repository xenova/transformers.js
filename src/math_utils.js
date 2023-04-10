
/**
 * @typedef {Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array} TypedArray
 * @typedef {BigInt64Array | BigUint64Array} BigTypedArray
 * @typedef {TypedArray | BigTypedArray} AnyTypedArray
 */

/**
 * @param {TypedArray} input
 */
function interpolate(input, [in_channels, in_height, in_width], [out_height, out_width], mode = 'bilinear', align_corners = false) {
    // TODO use mode and align_corners

    // Output image dimensions
    const x_scale = out_width / in_width;
    const y_scale = out_height / in_height;

    // Output image
    // @ts-ignore
    const out_img = new input.constructor(out_height * out_width * in_channels);

    // Pre-calculate strides
    const inStride = in_height * in_width;
    const outStride = out_height * out_width;

    for (let i = 0; i < out_height; ++i) {
        for (let j = 0; j < out_width; ++j) {
            // Calculate output offset
            const outOffset = i * out_width + j;

            // Calculate input pixel coordinates
            const x = (j + 0.5) / x_scale - 0.5;
            const y = (i + 0.5) / y_scale - 0.5;

            // Calculate the four nearest input pixels
            // We also check if the input pixel coordinates are within the image bounds
            let x1 = Math.floor(x);
            let y1 = Math.floor(y);
            const x2 = Math.min(x1 + 1, in_width - 1);
            const y2 = Math.min(y1 + 1, in_height - 1);

            x1 = Math.max(x1, 0);
            y1 = Math.max(y1, 0);


            // Calculate the fractional distances between the input pixel and the four nearest pixels
            const s = x - x1;
            const t = y - y1;

            // Perform bilinear interpolation
            const w1 = (1 - s) * (1 - t);
            const w2 = s * (1 - t);
            const w3 = (1 - s) * t;
            const w4 = s * t;

            // Calculate the four nearest input pixel indices
            const yStride = y1 * in_width;
            const xStride = y2 * in_width;
            const idx1 = yStride + x1;
            const idx2 = yStride + x2;
            const idx3 = xStride + x1;
            const idx4 = xStride + x2;

            for (let k = 0; k < in_channels; ++k) {
                // Calculate channel offset
                const cOffset = k * inStride;

                out_img[k * outStride + outOffset] =
                    w1 * input[cOffset + idx1] +
                    w2 * input[cOffset + idx2] +
                    w3 * input[cOffset + idx3] +
                    w4 * input[cOffset + idx4];
            }
        }
    }

    return out_img;
}


/**
 * Helper method to transpose a AnyTypedArray directly
 * @param {T} array 
 * @template {AnyTypedArray} T 
 * @param {number[]} dims 
 * @param {number[]} axes 
 * @returns {[T, number[]]} The transposed array and the new shape.
 */
function transpose_data(array, dims, axes) {
    // Calculate the new shape of the transposed array
    // and the stride of the original array
    const shape = new Array(axes.length);
    const stride = new Array(axes.length);

    for (let i = axes.length - 1, s = 1; i >= 0; --i) {
        stride[i] = s;
        shape[i] = dims[axes[i]];
        s *= shape[i];
    }

    // Precompute inverse mapping of stride
    const invStride = axes.map((_, i) => stride[axes.indexOf(i)]);

    // Create the transposed array with the new shape
    // @ts-ignore
    const transposedData = new array.constructor(array.length);

    // Transpose the original array to the new array
    for (let i = 0; i < array.length; ++i) {
        let newIndex = 0;
        for (let j = dims.length - 1, k = i; j >= 0; --j) {
            newIndex += (k % dims[j]) * invStride[j];
            k = Math.floor(k / dims[j]);
        }
        transposedData[newIndex] = array[i];
    }

    return [transposedData, shape];
}

module.exports = {
    interpolate,
    transpose: transpose_data,
}
