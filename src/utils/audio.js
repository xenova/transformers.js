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

export async function read_audio(url, sampling_rate) {
    // Attempting to load from path/url

    if (typeof AudioContext === 'undefined') {
        // Running in node or an environment without AudioContext
        throw Error(
            "Unable to load audio from path/URL since `AudioContext` is not available in your environment. " +
            "As a result, audio data must be passed directly to the processor. " +
            "If you are running in node.js, you can use an external library (e.g., https://github.com/audiojs/web-audio-api) to do this."
        )
    }
    const response = await (await getFile(url)).arrayBuffer();
    const audioCTX = new AudioContext({ sampleRate: sampling_rate });
    const decoded = await audioCTX.decodeAudioData(response);
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
 * @param {number} sr - The sampling rate.
 * @param {number} n_fft
 * @param {number} n_mels
 * @param {Float32ArrayConstructor | Float64ArrayConstructor} dtype The data type.
 * @returns 
 */
 export function getMelFilters(sr, n_fft, n_mels = 128, dtype = Float32Array) {
    // Initialize the weights
    n_mels = Math.floor(n_mels);
    let weights = new Array(n_mels).fill(0).map(() => new dtype(Math.floor(1 + n_fft / 2)));

    // Center freqs of each FFT bin
    let fftfreqs = rfftfreq(n_fft, 1 / sr);

    // 'Center freqs' of mel bands - uniformly spaced between limits
    let min_mel = 0.0;
    let max_mel = 45.245640471924965;

    let mels = Array.from({ length: n_mels + 2 }, (v, k) => k * ((max_mel - min_mel) / (n_mels + 1)) + min_mel);

    // Fill in the linear scale
    let f_min = 0.0;
    let f_sp = 200.0 / 3;
    let freqs = mels.map(v => f_min + f_sp * v);

    // And now the nonlinear scale
    let min_log_hz = 1000.0; // beginning of log region (Hz)
    let min_log_mel = (min_log_hz - f_min) / f_sp; // same (Mels)
    let logstep = Math.log(6.4) / 27.0; // step size for log region

    // If we have vector data, vectorize
    let log_t = mels.map(v => v >= min_log_mel);
    freqs.forEach((v, i) => {
      if (log_t[i]) {
        freqs[i] = min_log_hz * Math.exp(logstep * (mels[i] - min_log_mel));
      }
    })

    let mel_f = freqs;

    let fdiff = mel_f.slice(1).map((v, i) => v - mel_f[i]);
    let ramps = mel_f.map(v => fftfreqs.map(k => v - k));

    for (let i = 0; i < n_mels; i++) {
      // lower and upper slopes for all bins
      let lower = ramps[i].map(v => -v / fdiff[i]);
      let upper = ramps[i + 2].map(v => v / fdiff[i + 1]);

      // .. then intersect them with each other and zero
      weights[i] = lower.map((v, j) => Math.max(0, Math.min(v, upper[j])));
    }

    // Slaney-style mel is scaled to be approx constant energy per channel
    let enorm = mel_f.slice(2, n_mels + 2).map((v, i) => 2.0 / (v - mel_f[i]));
    weights = weights.map((v, i) => v.map(k => k * enorm[i]));
    return weights;
}
