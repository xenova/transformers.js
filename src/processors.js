
const {
    Callable,
    fetchJSON,
} = require("./utils.js");


const FFT = require('./fft.js');
const { Tensor, transpose, cat } = require("./tensor_utils.js");

// For some reason, Jimp attaches to self, even in Node.
// https://github.com/jimp-dev/jimp/issues/466
const _Jimp = require('jimp');
const Jimp = (typeof self !== 'undefined') ? (self.Jimp || _Jimp) : _Jimp;

const B64_STRING = /^data:image\/\w+;base64,/;

class AutoProcessor {
    // Helper class to determine model type from config

    static async from_pretrained(modelPath, progressCallback = null) {

        let preprocessorConfig = await fetchJSON(modelPath, 'preprocessor_config.json', progressCallback)

        let processor_class;
        let feature_extractor;

        switch (preprocessorConfig.feature_extractor_type) {
            case 'WhisperFeatureExtractor':
                feature_extractor = new WhisperFeatureExtractor(preprocessorConfig)
                break;
            case 'ViTFeatureExtractor':
                feature_extractor = new ViTFeatureExtractor(preprocessorConfig)
                break;

            default:
                if (preprocessorConfig.size !== undefined) {
                    // Assume VitFeatureExtractor
                    feature_extractor = new ViTFeatureExtractor(preprocessorConfig)

                } else {
                    throw new Error(`Unknown Feature Extractor type: ${preprocessorConfig.feature_extractor_type}`);

                }
        }

        switch (preprocessorConfig.processor_class) {
            case 'WhisperProcessor':
                processor_class = WhisperProcessor;
                break;
            default:
                // No associated processor class, use default
                processor_class = Processor;
        }

        return new processor_class(feature_extractor);
    }
}

class FeatureExtractor extends Callable {
    constructor(config) {
        super();
        this.config = config
    }
}
class ViTFeatureExtractor extends FeatureExtractor {

    constructor(config) {
        super(config);

        this.image_mean = this.config.image_mean;
        if (!Array.isArray(this.image_mean)) {
            this.image_mean = new Array(3).fill(this.image_mean);
        }

        this.image_std = this.config.image_std;
        if (!Array.isArray(this.image_std)) {
            this.image_std = new Array(3).fill(this.image_std);
        }

        this.do_rescale = this.config.do_rescale ?? true;
        this.do_normalize = this.config.do_normalize;

        this.do_resize = this.config.do_resize;
        this.size = this.config.size;
    }


    async preprocess(url) {

        let imgToLoad = url;
        if (B64_STRING.test(url)) {
            imgToLoad = imgToLoad.replace(B64_STRING, '');
            if (typeof Buffer !== 'undefined') {
                imgToLoad = Buffer.from(imgToLoad, 'base64');

            } else {
                let bytes = atob(imgToLoad);
                // create new ArrayBuffer from binary string
                imgToLoad = new Uint8Array(new ArrayBuffer(bytes.length));
                for (let i = 0; i < bytes.length; i++) {
                    imgToLoad[i] = bytes.charCodeAt(i);
                }
            }
        }

        let image = await Jimp.read(imgToLoad);

        // resize all images
        if (this.do_resize) {
            image = image.resize(this.size, this.size);
        }

        const data = image.bitmap.data;

        // Do not include alpha channel
        let convData = new Float32Array(data.length * 3 / 4);

        let outIndex = 0;
        for (let i = 0; i < data.length; i += 4) {
            for (let j = 0; j < 3; ++j) {
                convData[outIndex++] = data[i + j];
            }
        }

        if (this.do_rescale) {
            for (let i = 0; i < convData.length; ++i) {
                convData[i] = convData[i] / 255;
            }
        }

        if (this.do_normalize) {
            for (let i = 0; i < convData.length; i += 3) {
                for (let j = 0; j < 3; ++j) {
                    convData[i + j] = (convData[i + j] - this.image_mean[j]) / this.image_std[j];
                }
            }
        }

        let img = new Tensor('float32', convData, [this.size, this.size, 3]);
        let transposed = transpose(img, [2, 0, 1]);

        return transposed;
    }

    async _call(urls) {
        if (!Array.isArray(urls)) {
            urls = [urls];
        }

        // Convert any non-images to images
        let images = await Promise.all(urls.map(x => this.preprocess(x)));

        images.forEach(x => x.dims = [1, ...x.dims]) // add batch dimension

        images = cat(images);
        // TODO concatenate on dim=0
        return {
            pixel_values: images
        }
    }

}
class WhisperFeatureExtractor extends FeatureExtractor {

    calcOffset(i, w) {
        return Math.abs((i + w) % (2 * w) - w);
    }

    padReflect(array, left, right) {
        const padded = new Float32Array(array.length + left + right);
        const w = array.length - 1;

        for (let i = 0; i < array.length; ++i) {
            padded[left + i] = array[i];
        }

        for (let i = 1; i <= left; ++i) {
            padded[left - i] = array[this.calcOffset(i, w)];
        }

        for (let i = 1; i <= right; ++i) {
            padded[w + left + i] = array[this.calcOffset(w - i, w)];
        }

        return padded;
    }

    stft(frames, window) {
        // Calculates the complex Short-Time Fourier Transform (STFT) of the given framed signal.
        // 
        // NOTE: Since the window width is not a power of 2, we must 
        // perform Fast Fourier Transform with chirp-z transform:
        // https://math.stackexchange.com/questions/77118/non-power-of-2-ffts/77156#77156

        // Helper variables
        const fft_size = this.config.n_fft;
        const a = 2 * (fft_size - 1);
        const b = 2 * (2 * fft_size - 1);
        const nextP2 = 2 ** (Math.ceil(Math.log2(b)))
        const num_fft_bins = fft_size + 2;

        // Preallocate array to store output
        // double since we store complex numbers
        const data = new Float32Array(num_fft_bins * frames.length);

        // Define buffers
        // Compute chirp for transform
        const chirp = new Float32Array(b);
        const ichirp = new Float32Array(nextP2);
        const buffer1 = new Float32Array(nextP2);
        const buffer2 = new Float32Array(nextP2);
        const outBuffer = new Float32Array(nextP2);
        const outBuffer2 = new Float32Array(nextP2);
        const outBuffer3 = new Float32Array(nextP2);

        // Compute complex exponentiation
        const theta = -2 * Math.PI / fft_size;
        const baseR = Math.cos(theta);
        const baseI = Math.sin(theta);

        // Precompute helper for chirp-z transform
        for (let i = 0; i < b >> 1; ++i) {
            // Compute complex power:
            const e = (i + 1 - fft_size) ** 2 / 2.0;

            // Compute the modulus and argument of the result
            const result_mod = Math.sqrt(baseR ** 2 + baseI ** 2) ** e;
            const result_arg = e * Math.atan2(baseI, baseR);

            // Convert the result back to rectangular form
            // and assign to chirp and ichirp
            let i2 = 2 * i;
            chirp[i2] = result_mod * Math.cos(result_arg);
            chirp[i2 + 1] = result_mod * Math.sin(result_arg);

            // conjugate
            ichirp[i2] = chirp[i2];
            ichirp[i2 + 1] = - chirp[i2 + 1];
        }
        const slicedChirp = chirp.subarray(a, b);

        // create object to perform Fast Fourier Transforms
        // with `nextP2` complex numbers
        const f = new FFT(nextP2 >> 1);
        f.transform(outBuffer, ichirp);

        for (let i in frames) {
            const frame = frames[i];

            for (let j = 0; j < slicedChirp.length; j += 2) {
                const j2 = j + 1
                const j3 = j >> 1;

                const a_real = frame[j3] * window[j3];
                buffer1[j] = a_real * slicedChirp[j];
                buffer1[j2] = a_real * slicedChirp[j2];
            }
            f.transform(outBuffer2, buffer1);

            for (let j = 0; j < outBuffer.length; j += 2) {
                const j2 = j + 1;

                buffer2[j] = outBuffer2[j] * outBuffer[j] - outBuffer2[j2] * outBuffer[j2]
                buffer2[j2] = outBuffer2[j] * outBuffer[j2] + outBuffer2[j2] * outBuffer[j]
            }
            f.inverseTransform(outBuffer3, buffer2)

            const offset = i * num_fft_bins;
            for (let j = 0; j < num_fft_bins; j += 2) {
                const a_real = outBuffer3[j + a];
                const a_imag = outBuffer3[j + a + 1];
                const b_real = slicedChirp[j];
                const b_imag = slicedChirp[j + 1];

                // TODO write as transpose
                const o1 = offset + j;
                data[o1] = a_real * b_real - a_imag * b_imag
                data[o1 + 1] = a_real * b_imag + a_imag * b_real
            }
        }

        return {
            data: data,
            dims: [frames.length, num_fft_bins] // [3001, 402]
        };
    }
    fram_wave(waveform, center = true) {
        const frames = [];
        const half_window = Math.floor((this.config.n_fft - 1) / 2) + 1;
        const waveformLength = waveform.length;

        for (let i = 0; i < waveformLength + 1; i += this.config.hop_length) {

            let frame;
            if (center) {

                let frameStart = i > half_window ? i - half_window : 0;
                let frameEnd =
                    i < waveformLength - half_window
                        ? i + half_window
                        : waveformLength;

                frame = waveform.subarray(frameStart, frameEnd)

                if (frameStart === 0) {
                    frame = this.padReflect(
                        frame,
                        -i + half_window,
                        0
                    )

                } else if (frameEnd === waveformLength) {
                    frame = this.padReflect(
                        frame,
                        0,
                        i - waveformLength + half_window
                    )
                }

            } else {
                frame = new Float32Array(this.config.n_fft);
                const frameArray = waveform.subarray(i, i + this.config.n_fft);

                if (frameWidth < this.config.n_fft) {
                    frame.set(frameArray);
                    frame.fill(0, frameWidth, this.config.n_fft)
                } else {
                    frame = frameArray;
                }

            }
            frames.push(frame);
        }

        return frames;
    }

    hanning(M) {
        if (M < 1) {
            return [];
        }
        if (M === 1) {
            return [1];
        }
        const denom = M - 1;
        const cos_vals = new Float32Array(denom);
        for (let i = 0; i < denom; ++i) {
            const n = 2 * i - M + 1;
            cos_vals[i] = 0.5 + 0.5 * Math.cos(Math.PI * n / denom);
        }
        return cos_vals;
    }
    _extract_fbank_features(waveform) {
        // Compute the log-Mel spectrogram of the provided audio

        const buffer = new Float32Array(this.config.n_samples);
        buffer.set(waveform)

        const window = this.hanning(this.config.n_fft + 1)
        const frames = this.fram_wave(buffer)

        const stft = this.stft(frames, window)

        const stftData = stft.data;
        const d1 = stft.dims[0] - 1; // Ignore last row
        const d2 = stft.dims[1] >> 1; // Only need to store real numbers now

        // compute magnitudes
        // NOTE: Unlinke the original implementation, we do not
        // transpose since we perform matrix multiplication later
        const magnitudes = new Float32Array(d1 * d2);
        for (let i = 0; i < d1; ++i) {
            for (let j = 0; j < d2; ++j) {
                // let outOffset = (j * d1 + i); // transpose
                let outOffset = i * d2 + j;
                let inOffset = outOffset << 1; // * 2 since complex
                let magnitude = stftData[inOffset] ** 2 + stftData[inOffset + 1] ** 2
                magnitudes[outOffset] = magnitude;
            }
        }

        const mel_filters = this.config.mel_filters
        const num_mel_filters = mel_filters.length;

        const mel_spec = new Float32Array(num_mel_filters * d1);
        let mIndex = 0;

        // Perform matrix muliplication:
        // mel_spec = filters @ magnitudes
        //  - filters.shape=(80, 201)
        //  - magnitudes.shape=(201, 3000)
        //  - mel_spec.shape=(80, 3000)
        for (let i = 0; i < num_mel_filters; ++i) {
            const mel_filter = mel_filters[i];

            for (let j = 0; j < d1; ++j) {
                let sum = 0;

                // perform dot product
                for (let k = 0; k < d2; ++k) {
                    sum += mel_filter[k] * magnitudes[j * d2 + k];
                }

                mel_spec[mIndex++] = sum;
            }
        }

        const a_min = 1e-10;
        const log_spec = new Float32Array(mel_spec.length);

        let maxLogSpec = 0;
        for (let i = 0; i < mel_spec.length; i++) {
            const clipped = Math.max(a_min, mel_spec[i]);
            const log10 = Math.log10(clipped);
            log_spec[i] = log10;
            maxLogSpec = Math.max(log10, maxLogSpec)
        }

        for (let i = 0; i < log_spec.length; i++) {
            log_spec[i] = Math.max(log_spec[i], maxLogSpec - 8);
            log_spec[i] = (log_spec[i] + 4) / 4;
        }

        return {
            data: log_spec,
            dims: [num_mel_filters, d1]
        };
    }

    async _call(audio) {
        // audio is a float32array

        if (audio.length > this.config.n_samples) {
            console.warn(
                "Attempting to extract features for audio longer than 30 seconds. " +
                "If using a pipeline to extract transcript from a long audio clip, " +
                "remember to specify `chunk_length_s` and/or `stride_length_s`."
            );
        }
        let waveform = audio.slice(0, this.config.n_samples)

        let features = this._extract_fbank_features(waveform);

        return {
            input_features: new Tensor('float32',
                features.data,
                [1, ...features.dims]
            )
        };
    }
}

class Processor extends Callable {
    constructor(feature_extractor) {
        super();
        this.feature_extractor = feature_extractor;
        // TODO use tokenizer here?
    }
    async _call(input) {
        return await this.feature_extractor(input);
    }
}


class WhisperProcessor extends Processor {
    async _call(audio) {
        return await this.feature_extractor(audio)
    }
}


module.exports = {
    AutoProcessor
}
