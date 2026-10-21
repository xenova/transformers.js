/**
 * @module pipelines
 */

import { Pipeline } from './_base.js';

import { Tensor } from '../utils/tensor.js';
import { RawAudio } from '../utils/audio.js';
import { logger } from '../utils/logger.js';

import { AutoModel } from '../models/auto/modeling_auto.js';
import { parse_phonon_voice, prepare_phonon_text } from '../models/gradium_phonon_tts/utils_gradium_phonon_tts.js';
import { env } from '../env.js';
import { getFile } from '../utils/hub.js';

/**
 * @typedef {import('./_base.js').TextAudioPipelineConstructorArgs} TextAudioPipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 */

/**
 * @typedef {Object} VocoderOptions
 * @property {import('../models/modeling_utils.js').PreTrainedModel} [vocoder] The vocoder used by the pipeline (if the model uses one). If not provided, use the default HifiGan vocoder.
 * @typedef {TextAudioPipelineConstructorArgs & VocoderOptions} TextToAudioPipelineConstructorArgs
 */

/**
 * @typedef {RawAudio[]} TextToAudioOutput
 *
 * @typedef {Object} TextToAudioPipelineOptions Parameters specific to text-to-audio pipelines.
 * @property {Tensor|Float32Array|string|URL} [speaker_embeddings=null] The speaker embeddings (if the model requires it).
 * Phonon accepts a voice `Tensor` or a URL/path to a `.safetensors` voice file; omit it to use the bundled default voice.
 * Voice files are cached per URL/path until the pipeline is disposed. See `generate_speech` for prefix caching.
 * @property {number} [num_inference_steps] The number of denoising steps (if the model supports it).
 * More denoising steps usually lead to higher quality audio but slower inference.
 * @property {number} [speed] The speed of the generated audio (if the model supports it).
 * @property {number} [temperature] Phonon flow noise variance (as in Python transformers); 0 = deterministic.
 * @property {number} [num_speakers] Phonon speaker conditioning index (`0 | 1 | 2`), not a count. Defaults to the model config.
 * @property {number} [duration_delta] Phonon duration conditioning. Defaults to the model config.
 * @property {(chunk: RawAudio) => void | Promise<void>} [callback_function] Phonon-only: called with each streamed audio frame.
 * Async callbacks are awaited. Other text-to-audio models do not stream.
 *
 * @typedef {TextToAudioPipelineConstructorArgs & TextToAudioPipelineCallback & Disposable} TextToAudioPipelineType
 */

/**
 * @template T
 * @typedef {T extends string[] ? TextToAudioOutput : RawAudio} TextToAudioPipelineResult
 */

/**
 * @typedef {<T extends string | string[]>(text: T, options?: TextToAudioPipelineOptions) => Promise<TextToAudioPipelineResult<T>>} TextToAudioPipelineCallback
 */

/**
 * Text-to-audio generation pipeline using any `AutoModelForTextToWaveform` or `AutoModelForTextToSpectrogram`.
 * This pipeline generates an audio file from an input text and optional other conditional inputs.
 *
 * **Example:** Generate audio from text with `onnx-community/Supertonic-TTS-ONNX`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const synthesizer = await pipeline('text-to-speech', 'onnx-community/Supertonic-TTS-ONNX');
 * const speaker_embeddings = 'https://huggingface.co/onnx-community/Supertonic-TTS-ONNX/resolve/main/voices/F1.bin';
 * const output = await synthesizer('Hello there, how are you doing?', { speaker_embeddings });
 * // RawAudio {
 * //   audio: Float32Array(95232) [-0.000482565927086398, -0.0004853440332226455, ...],
 * //   sampling_rate: 44100
 * // }
 *
 * // Optional: Save the audio to a .wav file or Blob
 * await output.save('output.wav'); // You can also use `output.toBlob()` to access the audio as a Blob
 * ```
 *
 * **Example:** Multilingual speech generation with `Xenova/mms-tts-fra`. See the [MMS-TTS model list](https://huggingface.co/models?pipeline_tag=text-to-speech&other=vits&sort=trending) for available languages.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const synthesizer = await pipeline('text-to-speech', 'Xenova/mms-tts-fra');
 * const output = await synthesizer('Bonjour');
 * // RawAudio {
 * //   audio: Float32Array(23808) [-0.00037693005288019776, 0.0003325853613205254, ...],
 * //   sampling_rate: 16000
 * // }
 * ```
 *
 * **Example:** Stream Phonon speech with a custom voice. Omit `speaker_embeddings` to use the bundled default voice.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const tts = await pipeline('text-to-speech', 'onnx-community/phonon-31m-en-ONNX', { dtype: 'q4' });
 * const speaker_embeddings = 'https://huggingface.co/gradium/phonon-voices/resolve/main/voices/LMDIYE0Oa377Qh6Z.safetensors';
 * const audio = await tts('Hello from Phonon!', {
 *   speaker_embeddings, // In Node.js, this can also be a local .safetensors path.
 *   callback_function: (chunk) => console.log(chunk.audio.length), // 1920 samples at 24 kHz
 * });
 * await audio.save('phonon.wav');
 * await tts.dispose();
 * ```
 */
export class TextToAudioPipeline
    extends /** @type {new (options: TextToAudioPipelineConstructorArgs) => TextToAudioPipelineType} */ (Pipeline)
{
    DEFAULT_VOCODER_ID = 'Xenova/speecht5_hifigan';

    /**
     * Create a new TextToAudioPipeline.
     * @param {TextToAudioPipelineConstructorArgs} options An object used to instantiate the pipeline.
     */
    constructor(options) {
        super(options);

        // TODO: Find a better way for `pipeline` to set the default vocoder
        this.vocoder = options.vocoder ?? null;

        /** @type {Map<string, Promise<Tensor>>} Phonon voice files, keyed by URL/path. */
        this._phonon_voices = new Map();
    }

    async _prepare_speaker_embeddings(speaker_embeddings, batch_size) {
        // Load speaker embeddings as Float32Array from path/URL
        if (typeof speaker_embeddings === 'string' || speaker_embeddings instanceof URL) {
            // Load from URL with fetch
            speaker_embeddings = new Float32Array(await (await env.fetch(speaker_embeddings)).arrayBuffer());
        }

        if (speaker_embeddings instanceof Float32Array) {
            speaker_embeddings = new Tensor('float32', speaker_embeddings, [speaker_embeddings.length]);
        } else if (!(speaker_embeddings instanceof Tensor)) {
            throw new Error('Speaker embeddings must be a `Tensor`, `Float32Array`, `string`, or `URL`.');
        }

        if (batch_size > 1) {
            if (speaker_embeddings.dims[0] === 1) {
                // Repeat speaker embeddings for batch size
                speaker_embeddings = speaker_embeddings.repeat(batch_size, 1);
            } else if (speaker_embeddings.dims[0] !== batch_size) {
                throw new Error(
                    `Expected speaker embeddings batch size to be 1 or ${batch_size}, but got ${speaker_embeddings.dims[0]}.`,
                );
            }
        }

        return speaker_embeddings;
    }

    /**
     * Helper to convert batched waveform tensor to RawAudio output(s).
     * @param {string|string[]} text_inputs Original text input(s) to determine return type.
     * @param {Tensor} waveform The waveform tensor of shape [batch_size, waveform_length].
     * @param {number} sampling_rate The audio sampling rate.
     * @param {Tensor} [durations] Optional durations tensor for trimming (used by Supertonic).
     * @returns {RawAudio|RawAudio[]} Single RawAudio or array based on input type.
     * @private
     */
    _postprocess_waveform(text_inputs, waveform, sampling_rate, durations = null) {
        const waveformData = /** @type {Float32Array} */ (waveform.data);
        const [batch_size, waveformLength] = waveform.dims;
        const durationsData = durations ? /** @type {Float32Array} */ (durations.data) : null;

        const results = [];
        for (let i = 0; i < batch_size; ++i) {
            const length = durationsData ? Math.min(Math.ceil(durationsData[i]), waveformLength) : waveformLength;
            const start = i * waveformLength;
            results.push(new RawAudio(waveformData.slice(start, start + length), sampling_rate));
        }
        return Array.isArray(text_inputs) ? results : results[0];
    }

    async _call(text_inputs, options) {
        // If this.processor is not set, we are using an `AutoModelForTextToWaveform` model
        if (this.processor) {
            return this._call_text_to_spectrogram(text_inputs, options);
        } else if (this.model.config.model_type === 'supertonic') {
            return this._call_supertonic(text_inputs, options);
        } else if (this.model.config.model_type === 'gradium_phonon_tts') {
            return this._call_phonon(text_inputs, options);
        } else {
            return this._call_text_to_waveform(text_inputs);
        }
    }

    async _call_supertonic(text_inputs, { speaker_embeddings, num_inference_steps, speed }) {
        if (!speaker_embeddings) {
            throw new Error('Speaker embeddings must be provided for Supertonic models.');
        }

        // @ts-expect-error TS2339
        const { sampling_rate, style_dim } = this.model.config;

        const inputs = this.tokenizer(text_inputs, {
            padding: true,
            truncation: true,
        });
        const batch_size = inputs.input_ids.dims[0];
        speaker_embeddings = await this._prepare_speaker_embeddings(speaker_embeddings, batch_size);
        speaker_embeddings = /** @type {Tensor} */ (speaker_embeddings).view(batch_size, -1, style_dim);

        // @ts-expect-error TS2339
        const { waveform, durations } = await this.model.generate_speech({
            ...inputs,
            style: speaker_embeddings,
            num_inference_steps,
            speed,
        });

        return this._postprocess_waveform(text_inputs, waveform, sampling_rate, durations);
    }

    /**
     * @param {string|string[]} text_inputs
     * @param {TextToAudioPipelineOptions} [options]
     * @private
     */
    async _call_phonon(
        text_inputs,
        { speaker_embeddings, callback_function, temperature, num_speakers, duration_delta } = {},
    ) {
        // @ts-expect-error TS2339
        const { max_tokens_per_chunk, sample_rate } = this.model.config.phonon;
        const texts = Array.isArray(text_inputs) ? text_inputs : [text_inputs];
        const inputs = texts.map((text) => prepare_phonon_text(this.tokenizer, text, max_tokens_per_chunk));
        const voice = speaker_embeddings == null ? undefined : await this._prepare_phonon_voice(speaker_embeddings);

        const results = [];
        for (const chunks of inputs) {
            const frames = [];
            // @ts-expect-error TS2339
            const stream = this.model.generate_speech({
                chunks,
                speaker_embeddings: voice,
                temperature,
                num_speakers,
                duration_delta,
            });
            for await (const frame of stream) {
                frames.push(frame);
                // A separate copy, so callbacks cannot modify the final waveform.
                if (callback_function) await callback_function(new RawAudio(frame.slice(), sample_rate));
            }
            const audio = new Float32Array(frames.reduce((length, frame) => length + frame.length, 0));
            let offset = 0;
            for (const frame of frames) {
                audio.set(frame, offset);
                offset += frame.length;
            }
            results.push(new RawAudio(audio, sample_rate));
        }
        return Array.isArray(text_inputs) ? results : results[0];
    }

    async _prepare_phonon_voice(voice) {
        if (typeof voice === 'string' || voice instanceof URL) {
            const key = voice instanceof URL ? voice.href : voice;
            let pending = this._phonon_voices.get(key);
            if (!pending) {
                pending = this._load_phonon_voice(voice);
                this._phonon_voices.set(key, pending);
                pending.catch(() => {
                    if (this._phonon_voices.get(key) === pending) this._phonon_voices.delete(key);
                });
            }
            return pending;
        }
        this._validate_phonon_voice(voice);
        return voice;
    }

    async _load_phonon_voice(url) {
        const response = await getFile(url);
        if (response.status !== 200) {
            throw new Error(`Unable to load Phonon voice: ${response.status} ${response.statusText}.`);
        }
        const voice = parse_phonon_voice(new Uint8Array(await response.arrayBuffer()));
        try {
            this._validate_phonon_voice(voice);
        } catch (error) {
            voice.dispose();
            throw error;
        }
        return voice;
    }

    _validate_phonon_voice(voice) {
        // @ts-expect-error TS2339
        const { voice_dim } = this.model.config.phonon;
        if (
            !(voice instanceof Tensor) ||
            voice.type !== 'float32' ||
            voice.dims.length !== 3 ||
            voice.dims[0] !== 1 ||
            voice.dims[1] !== voice_dim
        ) {
            throw new Error(
                `Phonon speaker_embeddings must be a float32 Tensor of shape [1, ${voice_dim}, frames], or a safetensors voice URL or path.`,
            );
        }
    }

    /** @type {import('./_base.js').DisposeType} */
    dispose = async () => {
        const voices = Array.from(this._phonon_voices.values());
        this._phonon_voices.clear();
        for (const voice of await Promise.allSettled(voices)) {
            if (voice.status === 'fulfilled') voice.value.dispose();
        }
        await super.dispose();
    };

    async _call_text_to_waveform(text_inputs) {
        // Run tokenization
        const inputs = this.tokenizer(text_inputs, {
            padding: true,
            truncation: true,
        });

        // Generate waveform
        const { waveform } = await this.model(inputs);

        // @ts-expect-error TS2339
        const sampling_rate = this.model.config.sampling_rate;
        return this._postprocess_waveform(text_inputs, waveform, sampling_rate);
    }

    async _call_text_to_spectrogram(text_inputs, { speaker_embeddings }) {
        // Load vocoder, if not provided
        if (!this.vocoder) {
            logger.info('No vocoder specified, using default HifiGan vocoder.');
            this.vocoder = await AutoModel.from_pretrained(this.DEFAULT_VOCODER_ID, { dtype: 'fp32' });
        }

        // Run tokenization
        const { input_ids } = this.tokenizer(text_inputs, {
            padding: true,
            truncation: true,
        });

        const batch_size = input_ids.dims[0];
        speaker_embeddings = await this._prepare_speaker_embeddings(speaker_embeddings, batch_size);
        speaker_embeddings = speaker_embeddings.view(batch_size, -1);

        // @ts-expect-error TS2339
        const { waveform } = await this.model.generate_speech(input_ids, speaker_embeddings, { vocoder: this.vocoder });

        const sampling_rate = this.processor.feature_extractor.config.sampling_rate;
        return this._postprocess_waveform(text_inputs, waveform, sampling_rate);
    }
}
