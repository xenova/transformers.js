export = FFT;
/**
 * FFT class provides functionality for performing Fast Fourier Transform on arrays
 * Code adapted from https://www.npmjs.com/package/fft.js
 */
declare class FFT {
    /**
     * @param {number} size - The size of the input array. Must be a power of two and bigger than 1.
     * @throws {Error} FFT size must be a power of two and bigger than 1.
     */
    constructor(size: number);
    size: number;
    _csize: number;
    table: Float64Array;
    _width: number;
    _bitrev: Int32Array;
    /**
     * Create a complex number array with size `2 * size`
     *
     * @returns {Float64Array} - A complex number array with size `2 * size`
     */
    createComplexArray(): Float64Array;
    /**
     * Converts a complex number representation stored in a Float64Array to an array of real numbers.
     *
     * @param {Float64Array} complex - The complex number representation to be converted.
     * @param {number[]} [storage] - An optional array to store the result in.
     * @returns {number[]} An array of real numbers representing the input complex number representation.
     */
    fromComplexArray(complex: Float64Array, storage?: number[]): number[];
    /**
     * Convert a real-valued input array to a complex-valued output array.
     * @param {Float64Array} input - The real-valued input array.
     * @param {Float64Array} [storage] - Optional buffer to store the output array.
     * @returns {Float64Array} The complex-valued output array.
     */
    toComplexArray(input: Float64Array, storage?: Float64Array): Float64Array;
    /**
     * Completes the spectrum by adding its mirrored negative frequency components.
     * @param {Float64Array} spectrum - The input spectrum.
     * @returns {void}
     */
    completeSpectrum(spectrum: Float64Array): void;
    /**
     * Performs a Fast Fourier Transform (FFT) on the given input data and stores the result in the output buffer.
     *
     * @param {Float64Array} out - The output buffer to store the result.
     * @param {Float64Array} data - The input data to transform.
     *
     * @throws {Error} Input and output buffers must be different.
     *
     * @returns {void}
     */
    transform(out: Float64Array, data: Float64Array): void;
    /**
     * Performs a real-valued forward FFT on the given input buffer and stores the result in the given output buffer.
     * The input buffer must contain real values only, while the output buffer will contain complex values. The input and
     * output buffers must be different.
     *
     * @param {Float64Array} out - The output buffer.
     * @param {Float64Array} data - The input buffer containing real values.
     *
     * @throws {Error} If the input and output buffers are the same.
     */
    realTransform(out: Float64Array, data: Float64Array): void;
    /**
     * Performs an inverse FFT transformation on the given `data` array, and stores the result in `out`.
     * The `out` array must be a different buffer than the `data` array. The `out` array will contain the
     * result of the transformation. The `data` array will not be modified.
     *
     * @param {Float64Array} out - The output buffer for the transformed data.
     * @param {Float64Array} data - The input data to transform.
     * @throws {Error} If `out` and `data` refer to the same buffer.
     * @returns {void}
     */
    inverseTransform(out: Float64Array, data: Float64Array): void;
    /**
     * Performs a radix-4 implementation of a discrete Fourier transform on a given set of data.
     *
     * @param {Float64Array} out - The output buffer for the transformed data.
     * @param {Float64Array} data - The input buffer of data to be transformed.
     * @param {number} inv - A scaling factor to apply to the transform.
     * @returns {void}
     */
    _transform4(out: Float64Array, data: Float64Array, inv: number): void;
    /**
     * Performs a radix-2 implementation of a discrete Fourier transform on a given set of data.
     *
     * @param {Float64Array} data - The input buffer of data to be transformed.
     * @param {Float64Array} out - The output buffer for the transformed data.
     * @param {number} outOff - The offset at which to write the output data.
     * @param {number} off - The offset at which to begin reading the input data.
     * @param {number} step - The step size for indexing the input data.
     * @returns {void}
     */
    _singleTransform2(data: Float64Array, out: Float64Array, outOff: number, off: number, step: number): void;
    /**
     * Performs radix-4 transformation on input data of length 8
     *
     * @param {Float64Array} data - Input data array of length 8
     * @param {Float64Array} out - Output data array of length 8
     * @param {number} outOff - Index of output array to start writing from
     * @param {number} off - Index of input array to start reading from
     * @param {number} step - Step size between elements in input array
     * @param {number} inv - Scaling factor for inverse transform
     *
     * @returns {void}
     */
    _singleTransform4(data: Float64Array, out: Float64Array, outOff: number, off: number, step: number, inv: number): void;
    /**
     * Real input radix-4 implementation
     * @param {Float64Array} out - Output array for the transformed data
     * @param {Float64Array} data - Input array of real data to be transformed
     * @param {number} inv - The scale factor used to normalize the inverse transform
     */
    _realTransform4(out: Float64Array, data: Float64Array, inv: number): void;
    /**
     * Performs a single real input radix-2 transformation on the provided data
     *
     * @param {Float64Array} data - The input data array
     * @param {Float64Array} out - The output data array
     * @param {number} outOff - The output offset
     * @param {number} off - The input offset
     * @param {number} step - The step
     *
     * @returns {void}
     */
    _singleRealTransform2(data: Float64Array, out: Float64Array, outOff: number, off: number, step: number): void;
    /**
     * Computes a single real-valued transform using radix-4 algorithm.
     * This method is only called for len=8.
     *
     * @param {Float64Array} data - The input data array.
     * @param {Float64Array} out - The output data array.
     * @param {number} outOff - The offset into the output array.
     * @param {number} off - The offset into the input array.
     * @param {number} step - The step size for the input array.
     * @param {number} inv - The value of inverse.
     */
    _singleRealTransform4(data: Float64Array, out: Float64Array, outOff: number, off: number, step: number, inv: number): void;
}
