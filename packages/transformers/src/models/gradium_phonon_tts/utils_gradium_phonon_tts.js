import { Tensor } from '../../utils/tensor.js';

// Until tokenizers.js implements Unigram byte fallback, expand unknown pieces
// before they are converted to IDs. Limit the workaround to Phonon encoding.
// TODO: remove this adapter once https://github.com/huggingface/tokenizers.js/issues/26 is fixed.
function encode(tokenizer, text) {
    const model = tokenizer._tokenizer.model;
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
    // Mirrors PocketTTSProcessor.split_text: split the whole text after sentence ends (not decimal
    // points), split long sentences after clause ends, then group greedily up to `max_tokens`
    // (a soft limit). Each chunk is re-encoded, as Python's apply_chat_template re-normalizes it.
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

// A Phonon voice file holds one F32 `speaker_wavs` tensor of shape [1, 512, frames].
export function parse_phonon_voice(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const header_length = Number(view.getBigUint64(0, true));
    const header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + header_length)));
    const { dtype, shape, data_offsets } = header.speaker_wavs ?? {};
    if (dtype !== 'F32') throw new Error('Invalid Phonon voice: expected an F32 `speaker_wavs` tensor.');
    const offset = 8 + header_length;
    const data = new Float32Array(bytes.slice(offset + data_offsets[0], offset + data_offsets[1]).buffer);
    return new Tensor('float32', data, shape);
}
