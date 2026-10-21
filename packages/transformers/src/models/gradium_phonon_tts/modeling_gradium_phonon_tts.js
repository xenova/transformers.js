/**
 * @module models
 */

import { PreTrainedModel } from '../modeling_utils.js';
import { Tensor, randn } from '../../utils/tensor.js';
import { getModelFile } from '../../utils/hub.js';
import { sessionRun } from '../session.js';
import { parse_phonon_voice, prepare_phonon_text } from './utils_gradium_phonon_tts.js';
import { RawAudio } from '../../utils/audio.js';
import { logger } from '../../utils/logger.js';

const f32 = (dims, data = null) =>
    new Tensor('float32', data ?? new Float32Array(dims.reduce((a, b) => a * b, 1)), dims);
const i64 = (values, dims) => new Tensor('int64', BigInt64Array.from(values, BigInt), dims);
const dispose_state = (state) => {
    for (const tensor of Object.values(state ?? {})) tensor.dispose();
};

function empty_cache({ num_layers, num_heads, head_dim }) {
    return Object.fromEntries(
        Array.from({ length: num_layers }, (_, i) =>
            ['key', 'value'].map((key) => [`past_key_values.${i}.${key}`, f32([1, num_heads, 0, head_dim])]),
        ).flat(),
    );
}

// Feed present KV/codec outputs back under the next step's past input names.
function next_state(outputs) {
    return Object.fromEntries(
        Object.entries(outputs)
            .filter(([name]) => name.startsWith('present'))
            .map(([name, value]) => [name.replace('present.', 'past_key_values.').replace('present_', 'past_'), value]),
    );
}

/**
 * The Phonon streaming flow model and audio decoder. Unlike Python, which returns latents
 * for the processor to decode, this returns 24 kHz PCM directly (without end-of-pause trimming).
 * Hub decoder suffixes identify the variant: `mimi_decoder_q4.onnx` is fp32,
 * while `mimi_decoder_q4f16.onnx` is fp16 (only the flow model is quantized).
 */
export class GradiumPhononTTSForConditionalGeneration extends PreTrainedModel {
    get phonon_config() {
        return /** @type {any} */ (this.config).phonon;
    }

    /** @type {Tensor} */
    default_voice;

    // Only the default voice's prefix is cached; custom voice prefixes live for one call.
    /** @type {Promise<Record<string, Tensor>> | null} */
    _default_voice_state = null;

    /**
     * Load both streaming graphs and the bundled default voice.
     * @param {string} model_id Model repository ID or local directory.
     * @param {import('../../utils/hub.js').PretrainedModelOptions} [options={}] Model loading options.
     * @returns {Promise<GradiumPhononTTSForConditionalGeneration>} The ready-to-use speech model.
     */
    static async from_pretrained(model_id, options = {}) {
        const model = /** @type {GradiumPhononTTSForConditionalGeneration} */ (
            await super.from_pretrained(model_id, options)
        );
        try {
            const bytes = /** @type {Uint8Array} */ (
                await getModelFile(model_id, 'default-voice.safetensors', true, options)
            );
            model.default_voice = parse_phonon_voice(bytes);
            return model;
        } catch (error) {
            await model.dispose();
            throw error;
        }
    }

    async _run_flow(
        past,
        { text = [], voice = null, latent = null, noise = null, num_speakers = 1, duration_delta = 0 } = {},
    ) {
        const cfg = this.phonon_config;
        const inputs = {
            text_ids: i64(text, [1, text.length]),
            voice_latents: voice ?? f32([1, cfg.voice_dim, 0]),
            latent: latent ?? f32([1, 0, cfg.latent_dim]),
            noise: noise ?? f32([1, cfg.latent_dim]),
            num_speakers: i64([num_speakers], [1]),
            duration_delta: f32([1], new Float32Array([duration_delta])),
        };
        try {
            return await sessionRun(this.sessions.flow_lm, { ...inputs, ...past });
        } finally {
            // The voice and latent belong to the caller; everything else (including noise) is consumed here.
            for (const value of Object.values(inputs)) {
                if (value !== voice && value !== latent) value.dispose();
            }
        }
    }

    async _prepare_voice(voice) {
        this._validate_voice(voice);
        const create = async () => {
            const cache = empty_cache(this.phonon_config.flow_lm);
            try {
                const outputs = await this._run_flow(cache, { voice });
                const state = next_state(outputs);
                outputs.latent_out.dispose();
                outputs.eos_logit.dispose();
                return state;
            } finally {
                dispose_state(cache);
            }
        };
        if (voice !== this.default_voice) return create();
        if (!this._default_voice_state) {
            this._default_voice_state = create();
            this._default_voice_state.catch(() => {
                this._default_voice_state = null;
            });
        }
        return this._default_voice_state;
    }

    /**
     * Split text into chunks of at most ~50 tokens, as Python's `PocketTTSProcessor.split_text` does.
     * @param {string} text Text to prepare.
     * @param {import('../../tokenization_utils.js').PreTrainedTokenizer} tokenizer The model's tokenizer.
     * @returns {{ input_ids: number[], word_count: number }[]} Inputs accepted by `generate_speech()`.
     */
    prepare_text(text, tokenizer) {
        return prepare_phonon_text(tokenizer, text, this.phonon_config.max_tokens_per_chunk);
    }

    _validate_voice(voice) {
        const { voice_dim } = this.phonon_config;
        if (
            !(voice instanceof Tensor) ||
            voice.type !== 'float32' ||
            voice.dims.join() !== `1,${voice_dim},${voice.dims[2]}`
        ) {
            throw new Error(
                `Phonon speaker_embeddings must be a float32 Tensor of shape [1, ${voice_dim}, frames]. The text-to-speech pipeline also accepts a safetensors voice URL or path.`,
            );
        }
    }

    /**
     * Generate complete audio from text, optionally delivering PCM frames as they arrive.
     * @param {string|string[]} text_inputs Text or a batch of texts.
     * @param {import('../../tokenization_utils.js').PreTrainedTokenizer} tokenizer The model's tokenizer.
     * @param {Object} [options={}] Speech generation options.
     * @param {Tensor} [options.speaker_embeddings] Voice latents. Defaults to the bundled voice; the pipeline can load custom voices from safetensors URLs or paths.
     * @param {(chunk: RawAudio) => void | Promise<void>} [options.callback_function] Receives each decoded frame.
     * @param {number} [options.temperature] Sampling noise variance.
     * @param {number} [options.num_speakers] Speaker conditioning index.
     * @param {number} [options.duration_delta] Duration conditioning value.
     * @returns {Promise<RawAudio|RawAudio[]>} Audio matching the input's scalar or batch form.
     */
    async synthesize(text_inputs, tokenizer, { speaker_embeddings = null, callback_function = null, ...options } = {}) {
        const cfg = this.phonon_config;
        const texts = Array.isArray(text_inputs) ? text_inputs : [text_inputs];
        const prepared = texts.map((text) => this.prepare_text(text, tokenizer));
        const voice = speaker_embeddings ?? this.default_voice;
        let voice_state;
        try {
            if (prepared.some((sentences) => sentences.length)) voice_state = await this._prepare_voice(voice);
            const results = [];
            for (const sentences of prepared) {
                const frames = [];
                let length = 0;
                for (const sentence of sentences) {
                    for await (const pcm of this.generate_speech(
                        {
                            ...sentence,
                            ...options,
                            speaker_embeddings: voice,
                        },
                        voice_state,
                    )) {
                        frames.push(pcm);
                        length += pcm.length;
                        // The generator copies before releasing decoder tensors. The
                        // callback gets a separate copy to protect the final waveform.
                        if (callback_function) await callback_function(new RawAudio(pcm.slice(), cfg.sample_rate));
                    }
                }
                const audio = new Float32Array(length);
                let offset = 0;
                for (const frame of frames) {
                    audio.set(frame, offset);
                    offset += frame.length;
                }
                results.push(new RawAudio(audio, cfg.sample_rate));
            }
            return Array.isArray(text_inputs) ? results : results[0];
        } finally {
            if (voice !== this.default_voice && voice_state) {
                dispose_state(voice_state);
            }
        }
    }

    /**
     * Generate one text chunk as streaming 24 kHz PCM frames.
     * @param {Object} options Generation inputs and sampling controls.
     * @param {number[]} options.input_ids A text chunk from `prepare_text()`.
     * @param {number} options.word_count Word count, used to choose the end-of-speech tail length.
     * @param {Tensor} [options.speaker_embeddings] Voice latents of shape `[1, 512, frames]`. Defaults to the bundled voice.
     * @param {number} [options.temperature] Sampling noise variance (default 0.3); 0 is deterministic.
     * @param {number} [options.num_speakers=1] Speaker conditioning index (0, 1, or 2).
     * @param {number} [options.duration_delta=0] Duration conditioning value.
     * @param {Record<string, Tensor>} [voice_state=null] Precomputed voice prefix, shared across chunks by `synthesize()`.
     * @returns {AsyncGenerator<Float32Array>} PCM frames, each containing 1920 samples.
     *
     * **Example:** Consume PCM directly without retaining the complete waveform.
     * ```javascript
     * import { AutoTokenizer, GradiumPhononTTSForConditionalGeneration } from '@huggingface/transformers';
     * const id = 'onnx-community/phonon-31m-en-ONNX';
     * const tokenizer = await AutoTokenizer.from_pretrained(id);
     * const model = await GradiumPhononTTSForConditionalGeneration.from_pretrained(id, { dtype: 'q4' });
     * for (const chunk of model.prepare_text('Hello from Phonon.', tokenizer)) {
     *   for await (const pcm of model.generate_speech(chunk)) {
     *     console.log(pcm.length); // 1920 mono samples at 24 kHz
     *   }
     * }
     * ```
     */
    async *generate_speech(
        {
            input_ids,
            word_count,
            speaker_embeddings = this.default_voice,
            temperature = this.phonon_config.temperature,
            num_speakers = 1,
            duration_delta = 0,
        },
        voice_state = null,
    ) {
        const cfg = this.phonon_config;
        const owns_prefix = !voice_state && speaker_embeddings !== this.default_voice;
        const prefix = voice_state ?? (await this._prepare_voice(speaker_embeddings));
        let state = null,
            codec = null,
            latent = null;
        try {
            const prompt = await this._run_flow(prefix, { text: input_ids, num_speakers, duration_delta });
            state = next_state(prompt);
            prompt.latent_out.dispose();
            prompt.eos_logit.dispose();
            codec = { past_offset: i64([0], [1]), ...empty_cache(cfg.mimi_decoder) };
            for (const [name, dims] of Object.entries(cfg.mimi_decoder.conv_states)) codec[name] = f32(dims);
            latent = f32([1, 1, cfg.latent_dim], new Float32Array(cfg.latent_dim).fill(NaN));
            let countdown = null;
            // Frame budget and short/long EOS tail (3/1 frames) of the original runtime and Python's
            // PocketTTSGenerationMixin (`frames_after_eos` in the checkpoint's processor_config.json).
            const max_frames = Math.ceil((input_ids.length / 3 + 2) * cfg.frame_rate);
            for (let frame = 0; frame < max_frames; ++frame) {
                const noise =
                    temperature === 0
                        ? f32([1, cfg.latent_dim])
                        : randn([1, cfg.latent_dim]).mul_(Math.sqrt(temperature));
                const step = await this._run_flow(state, { latent, noise, num_speakers, duration_delta });
                dispose_state(state);
                state = next_state(step);
                latent.dispose();
                latent = step.latent_out;
                const eos = step.eos_logit.data[0];
                step.eos_logit.dispose();
                const decoded = await sessionRun(this.sessions.mimi_decoder, { latent, ...codec });
                dispose_state(codec);
                codec = next_state(decoded);
                const pcm = new Float32Array(decoded.audio.data);
                decoded.audio.dispose();
                if (countdown === null && eos > cfg.eos_threshold) countdown = word_count <= 4 ? 3 : 1;
                yield pcm;
                if (countdown !== null && countdown-- === 0) return;
            }
            logger.warn('Phonon reached its safety frame limit before completing speech; audio may be truncated.');
        } finally {
            dispose_state(state);
            dispose_state(codec);
            latent?.dispose();
            if (owns_prefix) dispose_state(prefix);
        }
    }

    async dispose() {
        if (this._default_voice_state) {
            const state = await this._default_voice_state.catch(() => null);
            dispose_state(state);
        }
        this._default_voice_state = null;
        this.default_voice?.dispose();
        return super.dispose();
    }
}
