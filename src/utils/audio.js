/**
 * @file Helper module for audio processing. 
 * 
 * These functions and classes are only used internally, 
 * meaning an end-user shouldn't need to access anything here.
 * 
 * @module utils/audio
 */

import {
    getFile,
} from './hub.js';
import { rfftfreq } from './maths.js';

/**
 * Helper function to read audio from a path/URL.
 * @param {string|URL} url The path/URL to load the audio from.
 * @param {number} sampling_rate The sampling rate to use when decoding the audio.
 * @returns {Promise<Float32Array>} The decoded audio as a `Float32Array`.
 */
export async function read_audio(url, sampling_rate) {
    if (typeof AudioContext === 'undefined') {
        // Running in node or an environment without AudioContext
        throw Error(
            "Unable to load audio from path/URL since `AudioContext` is not available in your environment. " +
            "Instead, audio data should be passed directly to the pipeline/processor. " +
            "For more information and some example code, see https://huggingface.co/docs/transformers.js/guides/node-audio-processing."
        )
    }

    const response = await (await getFile(url)).arrayBuffer();
    const audioCTX = new AudioContext({ sampleRate: sampling_rate });
    if (typeof sampling_rate === 'undefined') {
        console.warn(`No sampling rate provided, using default of ${audioCTX.sampleRate}Hz.`)
    }
    const decoded = await audioCTX.decodeAudioData(response);

    /** @type {Float32Array} */
    let audio;

    // We now replicate HuggingFace's `ffmpeg_read` method:
    if (decoded.numberOfChannels === 2) {
        // When downmixing a stereo audio file to mono using the -ac 1 option in FFmpeg,
        // the audio signal is summed across both channels to create a single mono channel.
        // However, if the audio is at full scale (i.e. the highest possible volume level),
        // the summing of the two channels can cause the audio signal to clip or distort.

        // To prevent this clipping, FFmpeg applies a scaling factor of 1/sqrt(2) (~ 0.707)
        // to the audio signal before summing the two channels. This scaling factor ensures
        // that the combined audio signal will not exceed the maximum possible level, even
        // if both channels are at full scale.

        // After applying this scaling factor, the audio signal from both channels is summed
        // to create a single mono channel. It's worth noting that this scaling factor is
        // only applied when downmixing stereo audio to mono using the -ac 1 option in FFmpeg.
        // If you're using a different downmixing method, or if you're not downmixing the
        // audio at all, this scaling factor may not be needed.
        const SCALING_FACTOR = Math.sqrt(2);

        let left = decoded.getChannelData(0);
        let right = decoded.getChannelData(1);

        audio = new Float32Array(left.length);
        for (let i = 0; i < decoded.length; ++i) {
            audio[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
        }

    } else {
        // If the audio is not stereo, we can just use the first channel:
        audio = decoded.getChannelData(0);
    }

    return audio;
}

/**
 * Creates a frequency bin conversion matrix used to obtain a mel spectrogram.
 * @param {number} sr Sample rate of the audio waveform.
 * @param {number} n_fft Number of frequencies used to compute the spectrogram (should be the same as in `stft`).
 * @param {number} n_mels Number of mel filters to generate.
 * @returns {number[][]} Projection matrix to go from a spectrogram to a mel spectrogram.
 */
export function getMelFilters(sr, n_fft, n_mels = 128) {
    n_mels = Math.floor(n_mels);

    // Initialize the weights
    const mel_size = Math.floor(1 + n_fft / 2);
    const weights = new Array(n_mels);

    // Center freqs of each FFT bin
    const fftfreqs = rfftfreq(n_fft, 1 / sr);

    // 'Center freqs' of mel bands - uniformly spaced between limits
    const min_mel = 0.0;
    const max_mel = 45.245640471924965;
    const mel_range = max_mel - min_mel;
    const mel_scale = mel_range / (n_mels + 1);

    // Fill in the linear scale
    const f_min = 0.0;
    const f_sp = 200.0 / 3;
    const freqs = new Array(n_mels + 2);

    // And now the nonlinear scale
    const min_log_hz = 1000.0; // beginning of log region (Hz)
    const min_log_mel = (min_log_hz - f_min) / f_sp; // same (Mels)
    const logstep = Math.log(6.4) / 27.0; // step size for log region

    const ramps = new Array(freqs.length);
    for (let i = 0; i < freqs.length; ++i) {
        const mel = i * mel_scale + min_mel;
        if (mel >= min_log_mel) {
            freqs[i] = min_log_hz * Math.exp(logstep * (mel - min_log_mel));
        } else {
            freqs[i] = f_min + f_sp * mel;
        }
        ramps[i] = fftfreqs.map(k => freqs[i] - k);
    }

    const fdiffinv = freqs.slice(1).map((v, i) => 1 / (v - freqs[i]));

    for (let i = 0; i < weights.length; ++i) {
        weights[i] = new Array(mel_size);

        const a = fdiffinv[i];
        const b = fdiffinv[i + 1];
        const c = ramps[i];
        const d = ramps[i + 2];

        // Slaney-style mel is scaled to be approx constant energy per channel
        const enorm = 2.0 / (freqs[i + 2] - freqs[i]);

        for (let j = 0; j < weights[i].length; ++j) {
            // lower and upper slopes for all bins
            const lower = -c[j] * a;
            const upper = d[j] * b;
            weights[i][j] = Math.max(0, Math.min(lower, upper)) * enorm;
        }
    }

    return weights;
}
