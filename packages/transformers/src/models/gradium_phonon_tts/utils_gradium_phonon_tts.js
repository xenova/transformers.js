import { Tensor } from '../../utils/tensor.js';

// Until tokenizers.js implements Unigram byte fallback, expand unknown pieces
// before they are converted to IDs. Limit the workaround to Phonon encoding.
// TODO: remove this adapter once https://github.com/huggingface/tokenizers.js/issues/26 is fixed.
function encode(tokenizer, text) {
    return tokenizer.tokenize(text).flatMap((piece) => {
        const id = tokenizer.convert_tokens_to_ids(piece);
        if (id != null) return [id];
        const bytes = tokenizer.convert_tokens_to_ids(
            Array.from(new TextEncoder().encode(piece), (b) => `<0x${b.toString(16).toUpperCase().padStart(2, '0')}>`),
        );
        return bytes.every((id) => id != null) ? bytes : [tokenizer.unk_token_id];
    });
}

/**
 * Split text into the chunks accepted by Phonon's `generate_speech()`, as Python's `PocketTTSProcessor.split_text` does.
 * @param {import('../../tokenization_utils.js').PreTrainedTokenizer} tokenizer The model's tokenizer.
 * @param {string} text Text to prepare.
 * @param {number} max_tokens Soft token budget per chunk (`config.phonon.max_tokens_per_chunk`).
 * @returns {{ input_ids: number[], word_count: number }[]} The text chunks, in order.
 */
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
            /** @type {number[]} */ (tokenizer.convert_tokens_to_ids(pieces)).filter(
                (id) => Number.isInteger(id) && id !== tokenizer.unk_token_id,
            ),
        );
    const sentence_ends = boundary_ids(['.', '!', '...', '?']);
    const clause_ends = boundary_ids([',', ';', ':']);
    // Five tokens cover a four-byte Unicode digit plus punctuation/space.
    const is_decimal_point = (ids, i) =>
        /\p{Nd}\.$/u.test(tokenizer.decode(ids.slice(Math.max(0, i - 5), i))) &&
        /^\p{Nd}/u.test(tokenizer.decode(ids.slice(i, i + 5)));
    const split_after = (ids, boundaries) => {
        const segments = [];
        let start = 0;
        for (let i = 1; i < ids.length; ++i) {
            if (!boundaries.has(ids[i - 1]) || boundaries.has(ids[i])) continue;
            if (boundaries === sentence_ends && is_decimal_point(ids, i)) continue;
            segments.push(ids.slice(start, i));
            start = i;
        }
        segments.push(ids.slice(start));
        return segments;
    };
    const segments = split_after(tokens, sentence_ends).flatMap((sentence) =>
        sentence.length > max_tokens ? split_after(sentence, clause_ends) : [sentence],
    );
    const chunks = [];
    let chunk = [];
    let chunk_length = 0;
    const push = () => {
        const decoded = chunk.join(' ').trim();
        if (decoded) chunks.push({ input_ids: encode(tokenizer, decoded), word_count: decoded.split(/\s+/u).length });
    };
    for (const segment of segments) {
        if (chunk_length && chunk_length + segment.length > max_tokens) {
            push();
            chunk = [];
            chunk_length = 0;
        }
        // Python joins decoded pieces with spaces before re-encoding a chunk,
        // even when the original text had no space after punctuation.
        chunk.push(tokenizer.decode(segment));
        chunk_length += segment.length;
    }
    if (chunk_length) push();
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
