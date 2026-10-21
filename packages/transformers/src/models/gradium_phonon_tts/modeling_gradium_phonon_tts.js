/**
 * @module models
 */

import { PreTrainedModel } from '../modeling_utils.js';
import { AutoConfig } from '../../configs.js';
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

/**
 * Load a precomputed Phonon voice through the standard Hub/local-file cache.
 * The returned tensor belongs to the caller and should be disposed after use.
 * @param {string} repo_or_path A Hub repository ID or an explicit local directory (`./voices` or an absolute path).
 * @param {string} [filename='default-voice.safetensors'] Voice file within that repository/directory.
 * @param {import('../../utils/hub.js').PretrainedOptions} [options={}] Cache, revision, offline and optional progress settings.
 * @returns {Promise<Tensor>} Float32 voice latents of shape `[1, 512, frames]`.
 *
 * **Example:** Load a reusable custom voice for an existing TTS pipeline.
 * ```javascript
 * import { load_phonon_voice } from '@huggingface/transformers';
 * const voice = await load_phonon_voice('gradium/phonon-voices', 'voices/LMDIYE0Oa377Qh6Z.safetensors');
 * try {
 *   const audio = await tts('Hello there.', { speaker_embeddings: voice });
 * } finally {
 *   voice.dispose();
 * }
 * ```
 */
export async function load_phonon_voice(repo_or_path, filename = 'default-voice.safetensors', options = {}) {
    const bytes = /** @type {Uint8Array} */ (await getModelFile(repo_or_path, filename, true, options));
    return parse_phonon_voice(bytes, 512);
}

function empty_cache({ num_layers, num_heads, head_dim }) {
    return Object.fromEntries(
        Array.from({ length: num_layers }, (_, i) =>
            ['key', 'value'].map((key) => [`past_key_values.${i}.${key}`, f32([1, num_heads, 0, head_dim])]),
        ).flat(),
    );
}

function next_state(outputs) {
    return Object.fromEntries(
        Object.entries(outputs)
            .filter(([name]) => name.startsWith('present'))
            .map(([name, value]) => [name.replace('present.', 'past_key_values.').replace('present_', 'past_'), value]),
    );
}

/**
 * The Phonon streaming flow model and audio decoder.
 * This ONNX API returns decoded PCM through `synthesize()` or `generate_speech()`,
 * rather than Python's `generate()`-then-processor-decode latent workflow.
 * Voices use the file layout `[1, 512, frames]`, not Python's `[frames, 512]`.
 * A synthesis batch uses one shared voice and is processed sequentially.
 * EOS stopping settings come from the export; temperature, speaker count and
 * duration conditioning can be supplied per call. Output is raw PCM without
 * Python's processor-level end-on-pause trimming/fade-out/silence padding.
 */
export class GradiumPhononTTSForConditionalGeneration extends PreTrainedModel {
    /** @type {Tensor} */
    default_voice;

    // Only the model-owned default voice is cached. Caller-created tensors and
    // downloaded voices have request-scoped prefixes, regardless of identity.
    /** @type {Promise<Record<string, Tensor>> | null} */
    _default_voice_state = null;

    /**
     * Load both streaming graphs and the bundled default voice.
     * Refresh config.json and tokenizer.json if cached from an older export,
     * or use revision 147b180afe11ddb7d1ee32553f2e1578ff31f970 or newer.
     * @param {string} model_id Model repository ID or local directory.
     * @param {import('../../utils/hub.js').PretrainedModelOptions} [options={}] Model loading options.
     * @returns {Promise<GradiumPhononTTSForConditionalGeneration>} The ready-to-use speech model.
     */
    static async from_pretrained(model_id, options = {}) {
        const config = await AutoConfig.from_pretrained(model_id, options);
        const model = /** @type {GradiumPhononTTSForConditionalGeneration} */ (
            await super.from_pretrained(model_id, { ...options, config })
        );
        try {
            model.default_voice = await load_phonon_voice(model_id, 'default-voice.safetensors', options);
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
        const cfg = /** @type {any} */ (this.config).phonon;
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
            for (const value of Object.values(inputs)) {
                if (value !== voice && value !== latent && value !== noise) value.dispose();
            }
        }
    }

    async _prepare_voice(voice) {
        this._validate_voice(voice);
        const create = async () => {
            const cache = empty_cache(/** @type {any} */ (this.config).phonon.flow_lm);
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
     * Tokenize the full text for sentence/clause grouping, as Python's
     * PocketTTSProcessor does. The 50-token target is soft: an unsplittable clause
     * is kept intact. Final chunks are re-encoded so capitalization and punctuation
     * match Python's apply_chat_template inputs, including Unigram byte fallback.
     * Refresh tokenizer.json if cached before Hub revision a7bd875, which added
     * Python's normalizer; alternatively select a newer revision when loading.
     * @param {string} text Text to prepare.
     * @param {import('../../tokenization_utils.js').PreTrainedTokenizer} tokenizer The model's tokenizer.
     * @returns {{ input_ids: number[], word_count: number }[]} Inputs accepted by `generate_speech()`.
     */
    prepare_text(text, tokenizer) {
        return prepare_phonon_text(tokenizer, text, /** @type {any} */ (this.config).phonon.max_tokens_per_chunk);
    }

    _validate_voice(voice) {
        if (!(voice instanceof Tensor)) {
            throw new TypeError(
                'Phonon speaker_embeddings must be a Tensor. Load a voice with load_phonon_voice(repo_or_path, filename).',
            );
        }
        const cfg = /** @type {any} */ (this.config).phonon;
        if (
            voice.type !== 'float32' ||
            voice.dims.length !== 3 ||
            voice.dims[0] !== 1 ||
            voice.dims[1] !== cfg.voice_dim ||
            voice.dims[2] <= 0
        ) {
            throw new Error(
                `Phonon speaker_embeddings must have shape [1, ${cfg.voice_dim}, frames] and dtype float32.`,
            );
        }
    }

    /**
     * Generate complete audio from text, optionally delivering PCM frames as they arrive.
     * A custom voice prefix is computed once and shared by all chunks in this call.
     * Voices are tensors of shape `[1, 512, frames]`; load files explicitly with
     * `load_phonon_voice(repo_or_path, filename, options)` before synthesis.
     * Callbacks deliver decoded PCM, not text tokens. Use `prepare_text()` and
     * `generate_speech()` for an async iterator without full-waveform accumulation.
     * @param {string|string[]} text_inputs Text or a batch of texts.
     * @param {import('../../tokenization_utils.js').PreTrainedTokenizer} tokenizer The model's tokenizer.
     * @param {Object} [options={}] Speech generation options.
     * @param {Tensor} [options.speaker_embeddings] A caller-owned voice tensor, for example from `load_phonon_voice()`. Strings and URLs are not accepted directly.
     * @param {(chunk: RawAudio) => void | Promise<void>} [options.callback_function] Receives each decoded frame.
     * @param {number} [options.temperature] Sampling noise variance.
     * @param {number} [options.num_speakers] Speaker conditioning index.
     * @param {number} [options.duration_delta] Duration conditioning value.
     * @returns {Promise<RawAudio|RawAudio[]>} Audio matching the input's scalar or batch form.
     */
    async synthesize(text_inputs, tokenizer, { speaker_embeddings = null, callback_function = null, ...options } = {}) {
        const cfg = /** @type {any} */ (this.config).phonon;
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
     * Generate one sentence as streaming 24 kHz PCM frames. Each invocation owns
     * its sentence caches; only the immutable voice prefix is shared.
     * Custom-voice prefixes are rebuilt per iterator; use `synthesize()` to share
     * one prefix across all chunks of a paragraph or batch.
     * Unlike Python's processor decoding, this low-level API returns raw PCM,
     * without trailing-silence trimming, a fade-out, or an appended silence tail.
     * @param {Object} options Generation inputs and sampling controls.
     * @param {number[]} options.input_ids A non-empty, pre-normalized text chunk without special tokens. Use `prepare_text()` for raw text.
     * @param {number} options.word_count Word count, used to choose the end-of-speech tail length.
     * @param {Tensor} [options.speaker_embeddings] Voice latents of shape `[1, 512, frames]`. Defaults to the bundled voice.
     * @param {number} [options.temperature] Sampling noise variance (default 0.3); 0 is deterministic.
     * @param {number} [options.num_speakers=1] Speaker conditioning index (0, 1, or 2).
     * @param {number} [options.duration_delta=0] Duration conditioning value.
     * @param {Record<string, Tensor>} [voice_state=null] Borrowed voice prefix for internal multi-chunk synthesis; normally omitted.
     * @returns {AsyncGenerator<Float32Array>} PCM frames, each containing 1920 samples.
     *
     * **Example:** Consume PCM directly without retaining the complete waveform.
     * ```javascript
     * import { AutoTokenizer, GradiumPhononTTSForConditionalGeneration } from '@huggingface/transformers';
     * const id = 'onnx-community/phonon-31m-en-ONNX';
     * const revision = '147b180afe11ddb7d1ee32553f2e1578ff31f970';
     * const tokenizer = await AutoTokenizer.from_pretrained(id, { revision });
     * const model = await GradiumPhononTTSForConditionalGeneration.from_pretrained(id, { dtype: 'q4', revision });
     * try {
     *   for (const sentence of model.prepare_text('Hello from Phonon.', tokenizer)) {
     *     for await (const pcm of model.generate_speech(sentence)) {
     *       console.log(pcm.length); // 1920 mono samples at 24 kHz
     *     }
     *   }
     * } finally {
     *   await model.dispose();
     * }
     * ```
     */
    async *generate_speech(
        {
            input_ids,
            word_count,
            speaker_embeddings = this.default_voice,
            temperature = /** @type {any} */ (this.config).phonon.temperature,
            num_speakers = 1,
            duration_delta = 0,
        },
        voice_state = null,
    ) {
        const cfg = /** @type {any} */ (this.config).phonon;
        if (!Number.isFinite(temperature) || temperature < 0) {
            throw new Error('Phonon temperature must be a finite, non-negative number.');
        }
        if (![0, 1, 2].includes(num_speakers) || !Number.isFinite(duration_delta)) {
            throw new Error('Phonon requires num_speakers in [0, 1, 2] and a finite duration_delta.');
        }
        if (!input_ids.length) throw new Error('Phonon expects a non-empty text token sequence.');
        const owns_prefix = !voice_state && speaker_embeddings !== this.default_voice;
        const prefix = voice_state ?? (await this._prepare_voice(speaker_embeddings));
        let state = null,
            codec = null,
            latent = null,
            noise = null,
            eos = null,
            audio = null;
        try {
            const prompt = await this._run_flow(prefix, { text: input_ids, num_speakers, duration_delta });
            state = next_state(prompt);
            prompt.latent_out.dispose();
            prompt.eos_logit.dispose();
            codec = { past_offset: i64([0], [1]), ...empty_cache(cfg.mimi_decoder) };
            for (const [name, dims] of Object.entries(cfg.mimi_decoder.conv_states)) codec[name] = f32(dims);
            latent = f32([1, 1, cfg.latent_dim], new Float32Array(cfg.latent_dim).fill(NaN));
            let countdown = null;
            let finished = false;
            // Match the ONNX reference recipe's safety budget (~3 tokens/second
            // plus 2 seconds), and its 3/1-frame short/long utterance EOS tail:
            // https://huggingface.co/onnx-community/phonon-31m-en-ONNX#usage-with-transformersjs
            const max_frames = Math.ceil((input_ids.length / 3 + 2) * cfg.frame_rate);
            for (let frame = 0; frame < max_frames; ++frame) {
                noise =
                    temperature === 0
                        ? f32([1, cfg.latent_dim])
                        : randn([1, cfg.latent_dim]).mul_(Math.sqrt(temperature));
                const step = await this._run_flow(state, { latent, noise, num_speakers, duration_delta });
                dispose_state(state);
                state = next_state(step);
                latent.dispose();
                latent = step.latent_out;
                eos = step.eos_logit;
                noise.dispose();
                noise = null;
                const decoded = await sessionRun(this.sessions.mimi_decoder, { latent, ...codec });
                dispose_state(codec);
                codec = next_state(decoded);
                audio = decoded.audio;
                const pcm = new Float32Array(audio.data);
                audio.dispose();
                audio = null;
                if (countdown === null && eos.data[0] > cfg.eos_threshold) countdown = word_count <= 4 ? 3 : 1;
                eos.dispose();
                eos = null;
                yield pcm;
                if (countdown !== null && countdown-- === 0) {
                    finished = true;
                    break;
                }
            }
            if (!finished)
                logger.warn('Phonon reached its safety frame limit before completing speech; audio may be truncated.');
        } finally {
            dispose_state(state);
            dispose_state(codec);
            latent?.dispose();
            noise?.dispose();
            eos?.dispose();
            audio?.dispose();
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
