/**
 * @module models
 */

import { PreTrainedModel } from '../modeling_utils.js';
import { Tensor, randn } from '../../utils/tensor.js';
import { getModelFile } from '../../utils/hub.js';
import { sessionRun } from '../session.js';
import { parse_phonon_voice } from './utils_gradium_phonon_tts.js';
import { logger } from '../../utils/logger.js';

export { prepare_phonon_text } from './utils_gradium_phonon_tts.js';

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

    // Python keeps these as config values; the checkpoint stores them under `phonon.conditions`.
    get default_conditions() {
        const { num_speakers, duration_delta } = this.phonon_config.conditions;
        return { num_speakers: Number(num_speakers.default), duration_delta: Number(duration_delta.default) };
    }

    /** @type {Tensor} */
    default_voice;

    /** @type {Promise<Record<string, Tensor>>|null} */
    _default_prefix = null;

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

    async _run_flow(past, { text = [], voice = null, latent = null, noise = null, num_speakers, duration_delta }) {
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

    // The only place that decides who owns a voice prefix: the bundled default voice's prefix is
    // cached until disposal, any other voice's prefix is released by the caller after one call.
    async _prepare_voice(voice) {
        const create = async () => {
            const cache = empty_cache(this.phonon_config.flow_lm);
            try {
                const outputs = await this._run_flow(cache, { voice, ...this.default_conditions });
                outputs.latent_out.dispose();
                outputs.eos_logit.dispose();
                return next_state(outputs);
            } finally {
                dispose_state(cache);
            }
        };
        if (voice !== this.default_voice) {
            const state = await create();
            return { state, release: () => dispose_state(state) };
        }
        if (!this._default_prefix) {
            const pending = (this._default_prefix = create());
            pending.catch(() => {
                if (this._default_prefix === pending) this._default_prefix = null;
            });
        }
        return { state: await this._default_prefix, release: () => {} };
    }

    /**
     * Generate speech for prepared text chunks as streaming 24 kHz PCM frames.
     *
     * The voice prefix is conditioned once per call and shared across all chunks. Only the prefix of
     * the bundled default voice is cached (until `dispose()`); any other voice is reconditioned on every
     * call, and its prefix is freed when the generator finishes, throws, or is exited early.
     * `speaker_embeddings` itself always remains owned by the caller.
     *
     * @param {Object} options Generation inputs and conditioning controls.
     * @param {{ input_ids: number[], word_count: number }[]} options.chunks Text chunks to speak, in order.
     * `word_count` chooses the end-of-speech tail length.
     * @param {Tensor} [options.speaker_embeddings] Voice latents of shape `[1, voice_dim, frames]`. Defaults to the bundled voice.
     * @param {number} [options.temperature] Flow noise variance (as in Python transformers); 0 = deterministic.
     * @param {number} [options.num_speakers] Speaker conditioning index (`0 | 1 | 2`), not a count.
     * @param {number} [options.duration_delta] Duration conditioning value.
     * @returns {AsyncGenerator<Float32Array>} PCM frames, each containing 1920 samples.
     *
     * **Example:** Consume PCM directly without retaining the complete waveform.
     * ```javascript
     * import { AutoTokenizer, GradiumPhononTTSForConditionalGeneration, prepare_phonon_text } from '@huggingface/transformers';
     * const id = 'onnx-community/phonon-31m-en-ONNX';
     * const tokenizer = await AutoTokenizer.from_pretrained(id);
     * const model = await GradiumPhononTTSForConditionalGeneration.from_pretrained(id, { dtype: 'q4' });
     * const chunks = prepare_phonon_text(tokenizer, 'Hello from Phonon.', model.config.phonon.max_tokens_per_chunk);
     * for await (const pcm of model.generate_speech({ chunks })) {
     *   console.log(pcm.length); // 1920 mono samples at 24 kHz
     * }
     * ```
     */
    async *generate_speech({
        chunks,
        speaker_embeddings = this.default_voice,
        temperature = this.phonon_config.temperature,
        num_speakers = this.default_conditions.num_speakers,
        duration_delta = this.default_conditions.duration_delta,
    }) {
        const conditions = { num_speakers, duration_delta };
        const voice = await this._prepare_voice(speaker_embeddings);
        try {
            for (const { input_ids, word_count } of chunks) {
                yield* this._generate_frames(input_ids, word_count, voice.state, temperature, conditions);
            }
        } finally {
            voice.release();
        }
    }

    async *_generate_frames(input_ids, word_count, prefix, temperature, conditions) {
        const cfg = this.phonon_config;
        let state = null,
            codec = null,
            latent = null;
        try {
            const prompt = await this._run_flow(prefix, { text: input_ids, ...conditions });
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
                const step = await this._run_flow(state, { latent, noise, ...conditions });
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
        }
    }

    async dispose() {
        const pending = this._default_prefix;
        this._default_prefix = null;
        dispose_state(await pending?.catch(() => null));
        this.default_voice?.dispose();
        return super.dispose();
    }
}
