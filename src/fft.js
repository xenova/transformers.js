
/**
 * FFT class provides functionality for performing Fast Fourier Transform on arrays
 * Code adapted from https://www.npmjs.com/package/fft.js
 */
class FFT {
    /**
     * @param {number} size - The size of the input array. Must be a power of two and bigger than 1.
     * @throws {Error} FFT size must be a power of two and bigger than 1.
     */
    constructor(size) {
        this.size = size | 0; // convert to a 32-bit signed integer
        if (this.size <= 1 || (this.size & (this.size - 1)) !== 0)
            throw new Error('FFT size must be a power of two and bigger than 1');

        this._csize = size << 1;

        this.table = new Float64Array(this.size * 2);
        for (let i = 0; i < this.table.length; i += 2) {
            const angle = Math.PI * i / this.size;
            this.table[i] = Math.cos(angle);
            this.table[i + 1] = -Math.sin(angle);
        }

        // Find size's power of two
        let power = 0;
        for (let t = 1; this.size > t; t <<= 1)
            ++power;

        // Calculate initial step's width:
        //   * If we are full radix-4 - it is 2x smaller to give inital len=8
        //   * Otherwise it is the same as `power` to give len=4
        this._width = power % 2 === 0 ? power - 1 : power;

        // Pre-compute bit-reversal patterns
        this._bitrev = new Int32Array(1 << this._width);
        for (let j = 0; j < this._bitrev.length; ++j) {
            this._bitrev[j] = 0;
            for (let shift = 0; shift < this._width; shift += 2) {
                const revShift = this._width - shift - 2;
                this._bitrev[j] |= ((j >>> shift) & 3) << revShift;
            }
        }
    }

    /**
     * Create a complex number array with size `2 * size`
     *
     * @returns {Float64Array} - A complex number array with size `2 * size`
     */
    createComplexArray() {
        return new Float64Array(this._csize);
    }

    /**
     * Converts a complex number representation stored in a Float64Array to an array of real numbers.
     * 
     * @param {Float64Array} complex - The complex number representation to be converted.
     * @param {number[]} [storage] - An optional array to store the result in.
     * @returns {number[]} An array of real numbers representing the input complex number representation.
     */
    fromComplexArray(complex, storage) {
        const res = storage || new Array(complex.length >>> 1);
        for (let i = 0; i < complex.length; i += 2)
            res[i >>> 1] = complex[i];
        return res;
    }

    /**
     * Convert a real-valued input array to a complex-valued output array.
     * @param {Float64Array} input - The real-valued input array.
     * @param {Float64Array} [storage] - Optional buffer to store the output array.
     * @returns {Float64Array} The complex-valued output array.
     */
    toComplexArray(input, storage) {
        const res = storage || this.createComplexArray();
        for (let i = 0; i < res.length; i += 2) {
            res[i] = input[i >>> 1];
            res[i + 1] = 0;
        }
        return res;
    }

    /**
     * Completes the spectrum by adding its mirrored negative frequency components.
     * @param {Float64Array} spectrum - The input spectrum.
     * @returns {void}
     */
    completeSpectrum(spectrum) {
        const size = this._csize;
        const half = size >>> 1;
        for (let i = 2; i < half; i += 2) {
            spectrum[size - i] = spectrum[i];
            spectrum[size - i + 1] = -spectrum[i + 1];
        }
    }

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
    transform(out, data) {
        if (out === data)
            throw new Error('Input and output buffers must be different');

        this._transform4(out, data, 1 /* DONE */);
    }

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
    realTransform(out, data) {
        if (out === data)
            throw new Error('Input and output buffers must be different');

        this._realTransform4(out, data, 1 /* DONE */);
    }

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
    inverseTransform(out, data) {
        if (out === data)
            throw new Error('Input and output buffers must be different');

        this._transform4(out, data, -1 /* DONE */);
        for (let i = 0; i < out.length; ++i)
            out[i] /= this.size;
    }

    /**
     * Performs a radix-4 implementation of a discrete Fourier transform on a given set of data.
     *
     * @param {Float64Array} out - The output buffer for the transformed data.
     * @param {Float64Array} data - The input buffer of data to be transformed.
     * @param {number} inv - A scaling factor to apply to the transform.
     * @returns {void}
     */
    _transform4(out, data, inv) {
        // radix-4 implementation

        const size = this._csize;

        // Initial step (permute and transform)
        const width = this._width;
        let step = 1 << width;
        let len = (size / step) << 1;

        let outOff;
        let t;
        let bitrev = this._bitrev;
        if (len === 4) {
            for (outOff = 0, t = 0; outOff < size; outOff += len, ++t) {
                const off = bitrev[t];
                this._singleTransform2(data, out, outOff, off, step);
            }
        } else {
            // len === 8
            for (outOff = 0, t = 0; outOff < size; outOff += len, ++t) {
                const off = bitrev[t];
                this._singleTransform4(data, out, outOff, off, step, inv);
            }
        }

        // Loop through steps in decreasing order
        for (step >>= 2; step >= 2; step >>= 2) {
            len = (size / step) << 1;
            let quarterLen = len >>> 2;

            // Loop through offsets in the data
            for (outOff = 0; outOff < size; outOff += len) {
                // Full case
                let limit = outOff + quarterLen;
                for (let i = outOff, k = 0; i < limit; i += 2, k += step) {
                    const A = i;
                    const B = A + quarterLen;
                    const C = B + quarterLen;
                    const D = C + quarterLen;

                    // Original values
                    const Ar = out[A];
                    const Ai = out[A + 1];
                    const Br = out[B];
                    const Bi = out[B + 1];
                    const Cr = out[C];
                    const Ci = out[C + 1];
                    const Dr = out[D];
                    const Di = out[D + 1];

                    const tableBr = this.table[k];
                    const tableBi = inv * this.table[k + 1];
                    const MBr = Br * tableBr - Bi * tableBi;
                    const MBi = Br * tableBi + Bi * tableBr;

                    const tableCr = this.table[2 * k];
                    const tableCi = inv * this.table[2 * k + 1];
                    const MCr = Cr * tableCr - Ci * tableCi;
                    const MCi = Cr * tableCi + Ci * tableCr;

                    const tableDr = this.table[3 * k];
                    const tableDi = inv * this.table[3 * k + 1];
                    const MDr = Dr * tableDr - Di * tableDi;
                    const MDi = Dr * tableDi + Di * tableDr;

                    // Pre-Final values
                    const T0r = Ar + MCr;
                    const T0i = Ai + MCi;
                    const T1r = Ar - MCr;
                    const T1i = Ai - MCi;
                    const T2r = MBr + MDr;
                    const T2i = MBi + MDi;
                    const T3r = inv * (MBr - MDr);
                    const T3i = inv * (MBi - MDi);

                    // Final values
                    out[A] = T0r + T2r;
                    out[A + 1] = T0i + T2i;
                    out[B] = T1r + T3i;
                    out[B + 1] = T1i - T3r;
                    out[C] = T0r - T2r;
                    out[C + 1] = T0i - T2i;
                    out[D] = T1r - T3i;
                    out[D + 1] = T1i + T3r;
                }
            }
        }
    }

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
    _singleTransform2(data, out, outOff, off, step) {
        // radix-2 implementation
        // NOTE: Only called for len=4

        const evenR = data[off];
        const evenI = data[off + 1];
        const oddR = data[off + step];
        const oddI = data[off + step + 1];

        out[outOff] = evenR + oddR;
        out[outOff + 1] = evenI + oddI;
        out[outOff + 2] = evenR - oddR;
        out[outOff + 3] = evenI - oddI;
    }

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
    _singleTransform4(data, out, outOff, off, step, inv) {
        // radix-4
        // NOTE: Only called for len=8
        const step2 = step * 2;
        const step3 = step * 3;

        // Original values
        const Ar = data[off];
        const Ai = data[off + 1];
        const Br = data[off + step];
        const Bi = data[off + step + 1];
        const Cr = data[off + step2];
        const Ci = data[off + step2 + 1];
        const Dr = data[off + step3];
        const Di = data[off + step3 + 1];

        // Pre-Final values
        const T0r = Ar + Cr;
        const T0i = Ai + Ci;
        const T1r = Ar - Cr;
        const T1i = Ai - Ci;
        const T2r = Br + Dr;
        const T2i = Bi + Di;
        const T3r = inv * (Br - Dr);
        const T3i = inv * (Bi - Di);

        // Final values
        out[outOff] = T0r + T2r;
        out[outOff + 1] = T0i + T2i;
        out[outOff + 2] = T1r + T3i;
        out[outOff + 3] = T1i - T3r;
        out[outOff + 4] = T0r - T2r;
        out[outOff + 5] = T0i - T2i;
        out[outOff + 6] = T1r - T3i;
        out[outOff + 7] = T1i + T3r;
    }

    /**
     * Real input radix-4 implementation
     * @param {Float64Array} out - Output array for the transformed data
     * @param {Float64Array} data - Input array of real data to be transformed
     * @param {number} inv - The scale factor used to normalize the inverse transform
     */
    _realTransform4(out, data, inv) {
        // Real input radix-4 implementation
        const size = this._csize;

        // Initial step (permute and transform)
        const width = this._width;
        let step = 1 << width;
        let len = (size / step) << 1;

        var outOff;
        var t;
        var bitrev = this._bitrev;
        if (len === 4) {
            for (outOff = 0, t = 0; outOff < size; outOff += len, ++t) {
                const off = bitrev[t];
                this._singleRealTransform2(data, out, outOff, off >>> 1, step >>> 1);
            }
        } else {
            // len === 8
            for (outOff = 0, t = 0; outOff < size; outOff += len, ++t) {
                const off = bitrev[t];
                this._singleRealTransform4(data, out, outOff, off >>> 1, step >>> 1, inv);
            }
        }

        // Loop through steps in decreasing order
        for (step >>= 2; step >= 2; step >>= 2) {
            len = (size / step) << 1;
            const halfLen = len >>> 1;
            const quarterLen = halfLen >>> 1;
            const hquarterLen = quarterLen >>> 1;

            // Loop through offsets in the data
            for (outOff = 0; outOff < size; outOff += len) {
                for (let i = 0, k = 0; i <= hquarterLen; i += 2, k += step) {
                    const A = outOff + i;
                    const B = A + quarterLen;
                    const C = B + quarterLen;
                    const D = C + quarterLen;

                    // Original values
                    const Ar = out[A];
                    const Ai = out[A + 1];
                    const Br = out[B];
                    const Bi = out[B + 1];
                    const Cr = out[C];
                    const Ci = out[C + 1];
                    const Dr = out[D];
                    const Di = out[D + 1];

                    const tableBr = this.table[k];
                    const tableBi = inv * this.table[k + 1];
                    const MBr = Br * tableBr - Bi * tableBi;
                    const MBi = Br * tableBi + Bi * tableBr;

                    const tableCr = this.table[2 * k];
                    const tableCi = inv * this.table[2 * k + 1];
                    const MCr = Cr * tableCr - Ci * tableCi;
                    const MCi = Cr * tableCi + Ci * tableCr;

                    const tableDr = this.table[3 * k];
                    const tableDi = inv * this.table[3 * k + 1];
                    const MDr = Dr * tableDr - Di * tableDi;
                    const MDi = Dr * tableDi + Di * tableDr;

                    // Pre-Final values
                    const T0r = Ar + MCr;
                    const T0i = Ai + MCi;
                    const T1r = Ar - MCr;
                    const T1i = Ai - MCi;
                    const T2r = MBr + MDr;
                    const T2i = MBi + MDi;
                    const T3r = inv * (MBr - MDr);
                    const T3i = inv * (MBi - MDi);

                    // Final values
                    out[A] = T0r + T2r;
                    out[A + 1] = T0i + T2i;
                    out[B] = T1r + T3i;
                    out[B + 1] = T1i - T3r;

                    // Output final middle point
                    if (i === 0) {
                        out[C] = T0r - T2r;
                        out[C + 1] = T0i - T2i;
                        continue;
                    }

                    // Do not overwrite ourselves
                    if (i === hquarterLen)
                        continue;

                    const SA = outOff + quarterLen - i;
                    const SB = outOff + halfLen - i;

                    out[SA] = T1r + -inv * T3i;
                    out[SA + 1] = -T1i - inv * T3r;
                    out[SB] = T0r + -inv * T2r;
                    out[SB + 1] = -T0i + inv * T2i;
                }
            }
        }
    }

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
    _singleRealTransform2(data, out, outOff, off, step) {
        // radix-2 implementation
        // NOTE: Only called for len=4

        const evenR = data[off];
        const oddR = data[off + step];

        out[outOff] = evenR + oddR;
        out[outOff + 1] = 0;
        out[outOff + 2] = evenR - oddR;
        out[outOff + 3] = 0;
    }

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
    _singleRealTransform4(data, out, outOff, off, step, inv) {
        // radix-4
        // NOTE: Only called for len=8
        const step2 = step * 2;
        const step3 = step * 3;

        // Original values
        const Ar = data[off];
        const Br = data[off + step];
        const Cr = data[off + step2];
        const Dr = data[off + step3];

        // Pre-Final values
        const T0r = Ar + Cr;
        const T1r = Ar - Cr;
        const T2r = Br + Dr;
        const T3r = inv * (Br - Dr);

        // Final values
        out[outOff] = T0r + T2r;
        out[outOff + 1] = 0;
        out[outOff + 2] = T1r;
        out[outOff + 3] = -T3r;
        out[outOff + 4] = T0r - T2r;
        out[outOff + 5] = 0;
        out[outOff + 6] = T1r;
        out[outOff + 7] = T3r;
    }
}

module.exports = FFT
