import { Tensor } from '../../utils/tensor.js';

// Shared ONNX text/voice helpers, not a port of Python's PocketTTSProcessor.

// Until tokenizers.js implements Unigram byte fallback, expand unknown pieces
// before they are converted to IDs. Limit the workaround to Phonon encoding.
// TODO: remove this adapter once https://github.com/huggingface/tokenizers.js/issues/26 is fixed.
function encode(tokenizer, text) {
    const model = tokenizer._tokenizer?.model;
    if (typeof model?.encode !== 'function' || typeof model.tokens_to_ids?.has !== 'function') {
        throw new Error('Phonon byte fallback is incompatible with this tokenizer implementation.');
    }
    const original = model.encode;
    if (!model.byte_fallback) {
        model.encode = (tokens) =>
            original.call(model, tokens).flatMap((piece) => {
                if (model.tokens_to_ids.has(piece)) return [piece];
                const bytes = Array.from(
                    new TextEncoder().encode(piece),
                    (b) => `<0x${b.toString(16).toUpperCase().padStart(2, '0')}>`,
                );
                return bytes.every((b) => model.tokens_to_ids.has(b)) ? bytes : [piece];
            });
    }
    try {
        return tokenizer.encode(text, { add_special_tokens: false });
    } finally {
        model.encode = original;
    }
}

export function prepare_phonon_text(tokenizer, text, max_tokens) {
    if (typeof text !== 'string' || !text.trim()) {
        throw new Error('Phonon expects a non-empty text string.');
    }
    if (!Number.isInteger(max_tokens) || max_tokens <= 0) {
        throw new Error('Phonon max_tokens must be a positive integer.');
    }
    // Tokenize the whole text for splitting, then normalize each final chunk
    // again, as Python's split_text -> apply_chat_template workflow does.
    const tokens = encode(tokenizer, text.trim());
    const boundary_ids = (pieces) =>
        new Set(
            tokenizer
                .convert_tokens_to_ids(pieces)
                .filter((id) => Number.isInteger(id) && id !== tokenizer.unk_token_id),
        );
    const sentence_ends = boundary_ids(['.', '!', '...', '?']);
    const clause_ends = boundary_ids([',', ';', ':']);
    const split_after = (ids, boundaries, skip_decimals = false) => {
        const segments = [];
        let start = 0;
        for (let i = 1; i < ids.length; ++i) {
            if (!boundaries.has(ids[i - 1]) || boundaries.has(ids[i])) continue;
            if (
                skip_decimals &&
                /\p{Nd}\.$/u.test(tokenizer.decode(ids.slice(0, i))) &&
                /^\p{Nd}/u.test(tokenizer.decode(ids.slice(i)))
            )
                continue;
            segments.push(ids.slice(start, i));
            start = i;
        }
        segments.push(ids.slice(start));
        return segments;
    };
    // Mirror PocketTTSProcessor.split_text: sentence ends (except decimals),
    // clause ends for long sentences, then greedy grouping up to the target.
    // Like Python, an unsplittable clause can exceed this soft token budget.
    const segments = split_after(tokens, sentence_ends, true).flatMap((sentence) =>
        sentence.length > max_tokens ? split_after(sentence, clause_ends) : [sentence],
    );
    const chunks = [];
    let chunk = [];
    const push = () => {
        const decoded = tokenizer.decode(chunk).trim();
        if (decoded) chunks.push({ input_ids: encode(tokenizer, decoded), word_count: decoded.split(/\s+/u).length });
    };
    for (const segment of segments) {
        if (chunk.length && chunk.length + segment.length > max_tokens) {
            push();
            chunk = [];
        }
        chunk = chunk.concat(segment);
    }
    if (chunk.length) push();
    return chunks;
}
// Phonon voices contain one F32 tensor in channels-first codec layout.
export function parse_phonon_voice(bytes, voice_dim) {
    if (bytes.byteLength < 8) throw new Error('Invalid Phonon voice: missing safetensors header.');
    const header_length = Number(new DataView(bytes.buffer, bytes.byteOffset, 8).getBigUint64(0, true));
    if (!Number.isSafeInteger(header_length) || header_length < 2 || header_length > bytes.byteLength - 8) {
        throw new Error('Invalid Phonon voice: invalid safetensors header length.');
    }
    const entry = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + header_length))).speaker_wavs;
    if (
        entry?.dtype !== 'F32' ||
        entry.shape?.length !== 3 ||
        entry.shape[0] !== 1 ||
        entry.shape[1] !== voice_dim ||
        !Number.isSafeInteger(entry.shape[2]) ||
        entry.shape[2] <= 0
    ) {
        throw new Error(`Invalid Phonon voice: expected F32 speaker_wavs with shape [1, ${voice_dim}, frames].`);
    }
    const [start, end] = entry.data_offsets ?? [];
    const offset = 8 + header_length;
    if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        end - start !== voice_dim * entry.shape[2] * 4 ||
        offset + end > bytes.byteLength
    ) {
        throw new Error('Invalid Phonon voice: invalid tensor data offsets.');
    }
    return new Tensor('float32', new Float32Array(bytes.slice(offset + start, offset + end).buffer), entry.shape);
}
