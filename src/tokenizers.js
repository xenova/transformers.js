const {
    Callable,
    fetchJSON,
    reverseDictionary,
    escapeRegExp
} = require('./utils.js');


class TokenizerModel extends Callable {
    static fromConfig(config, ...args) {
        switch (config.type) {
            case 'WordPiece':
                return new WordPieceTokenizer(config);
            case 'Unigram':
                return new Unigram(config, ...args);

            case 'BPE':
                return new BPE(config, ...args);
            default:
                throw new Error(`Unknown TokenizerModel type: ${config.type}`);
        }
    }
    _call(tokens) {
        return this.encode(tokens);
    }
    encode(tokens) {
        throw Error("encode should be implemented in subclass.")
    }
    convert_tokens_to_ids(tokens) {
        return tokens.map(t => this.tokens_to_ids[t] ?? this.config.unk_token_id);
    }

    convert_ids_to_tokens(ids) {
        return ids.map(i => this.vocab[i] ?? this.config.unk_token);
    }
}

class WordPieceTokenizer extends TokenizerModel {
    constructor(config) {
        super();
        this.config = config;

        this.tokens_to_ids = config.vocab;

        this.unk_token_id = this.tokens_to_ids[config.unk_token];
        this.unk_token = config.unk_token;

        let e = Object.entries(this.tokens_to_ids);
        this.vocab = Array(e.length);

        for (const [key, value] of e) {
            this.vocab[value] = key;
        }
    }

    encode(tokens) {
        let outputTokens = [];
        for (let token of tokens) {
            let chars = [...token];
            // TODO add
            // if len(chars) > self.max_input_chars_per_word:
            //     output_tokens.append(self.unk_token)
            //     continue

            let isUnknown = false;
            let start = 0;
            let subTokens = [];

            while (start < chars.length) {
                let end = chars.length;
                let currentSubstring = null;
                while (start < end) {
                    let substr = chars.slice(start, end).join('');

                    if (start > 0) {
                        substr = this.config.continuing_subword_prefix + substr;
                    }
                    if (this.vocab.includes(substr)) {
                        currentSubstring = substr;
                        break;
                    }

                    --end;
                }
                if (currentSubstring == null) {
                    isUnknown = true;
                    break;
                }
                subTokens.push(currentSubstring);
                start = end;
            }
            if (isUnknown) {
                outputTokens.push(this.unknownToken);
            } else {
                outputTokens.push(...subTokens);
            }
        }

        return outputTokens;
    }

}

class Unigram extends TokenizerModel {
    constructor(config, moreConfig) {
        super();
        this.config = config;

        this.vocab = config.vocab.map(x => x[0]);
        this.scores = config.vocab.map(x => x[1]);

        this.unk_token_id = config.unk_id;
        this.unk_token = this.vocab[config.unk_id];

        this.tokens_to_ids = Object.fromEntries(this.vocab.map((x, i) => [x, i]));
        this.bosToken = ' '; // beginning of a sentence token

        this.bosTokenId = this.tokens_to_ids[this.bosToken];
        this.eosToken = moreConfig.eos_token;

        this.eosTokenId = this.tokens_to_ids[this.eosToken];
        this.unkToken = this.vocab[this.unk_token_id];

        this.minScore = Math.min(...this.scores);

        this.unkScore = this.minScore - 10.0;
        this.scores[this.unk_token_id] = this.unkScore;

        this.trie = new CharTrie();
        this.trie.push(...this.vocab)
    }


    populateNodes(lattice) {
        const sentence = lattice.sentence;
        const len = sentence.length;
        let beginPos = 0;
        while (beginPos < len) {
            const mblen = 1;
            let hasSingleNode = false;
            const tokens = [];
            for (let token of this.trie.commonPrefixSearch(sentence.slice(beginPos))) {
                tokens.push(token);
                const tokenId = this.tokens_to_ids[token];
                const tokenScore = this.scores[tokenId];
                const n = token.length;
                lattice.insert(beginPos, n, tokenScore, tokenId);
                if (!hasSingleNode && n == mblen) {
                    hasSingleNode = true;
                }
            }
            if (!hasSingleNode) {
                lattice.insert(beginPos, mblen, this.unkScore, this.unk_token_id);
            }
            beginPos += mblen;
        }
    }
    tokenize(normalized) {
        const lattice = new TokenLattice(normalized, this.bosTokenId, this.eosTokenId);
        this.populateNodes(lattice);
        return lattice.tokens();
    }
    encode(tokens) {
        let toReturn = [];
        for (let token of tokens) {
            const tokenized = this.tokenize(token);
            toReturn.push(...tokenized);
        }
        return toReturn;
    }

}

const BYTES_TO_UNICODE = (() => {
    // Returns list of utf-8 byte and a mapping to unicode strings.
    // We specifically avoids mapping to whitespace/control characters
    // the bpe code barfs on.

    const bs = [
        ...Array.from({ length: "~".charCodeAt(0) - "!".charCodeAt(0) + 1 }, (_, i) => i + "!".charCodeAt(0)),
        ...Array.from({ length: "¬".charCodeAt(0) - "¡".charCodeAt(0) + 1 }, (_, i) => i + "¡".charCodeAt(0)),
        ...Array.from({ length: "ÿ".charCodeAt(0) - "®".charCodeAt(0) + 1 }, (_, i) => i + "®".charCodeAt(0)),
    ];
    let cs = bs.slice();
    let n = 0;
    for (let b = 0; b < 256; b++) {
        if (!bs.includes(b)) {
            bs.push(b);
            cs.push(256 + n);
            n += 1;
        }
    }
    cs = cs.map(n => String.fromCharCode(n));
    return Object.fromEntries(bs.map((b, i) => [b, cs[i]]));
})();

const UNICODE_TO_BYTES = reverseDictionary(BYTES_TO_UNICODE);

class BPE extends TokenizerModel {
    constructor(config, moreConfig) {
        super();
        this.config = config;

        this.tokens_to_ids = config.vocab;

        this.unk_token_id = this.tokens_to_ids[config.unk_token];
        this.unk_token = config.unk_token;

        let e = Object.entries(this.tokens_to_ids);
        this.vocab = Array(e.length);

        for (const [key, value] of e) {
            this.vocab[value] = key;
        }

        this.bpe_ranks = Object.fromEntries(config.merges.map((x, i) => [x, i]));
        this.merges = config.merges.map(x => x.split(/\s+/))

        this.byte_encoder = BYTES_TO_UNICODE;
        this.text_encoder = new TextEncoder();

        this.cache = {}
    }

    get_pairs(word) {
        let pairs = new Set();
        let prev_char = word[0];
        for (let i = 1; i < word.length; i++) {
            let char = word[i];
            pairs.add(`${prev_char} ${char}`);
            prev_char = char;
        }
        return [...pairs];
    }

    bpe(token) {
        if (token in this.cache) {
            return this.cache[token];
        }
        let word = Array.from(token);
        let pairs = this.get_pairs(word);

        if (!pairs.length) {
            return token;
        }

        while (true) {
            let bigram = pairs.reduce((a, b) => {
                let c = this.bpe_ranks[a] ?? Infinity
                let d = this.bpe_ranks[b] ?? Infinity
                return c <= d ? a : b;
            });
            if (!(bigram in this.bpe_ranks)) {
                break;
            }
            let [first, second] = bigram.split(/\s+/g)
            let new_word = [];
            let i = 0;
            let j = -1;

            while (i < word.length) {
                try {
                    j = word.indexOf(first, i);
                    if (j === -1) throw "Error";
                } catch (e) {
                    new_word.push(...word.slice(i));
                    break;
                }
                new_word.push(...word.slice(i, j));
                i = j;

                if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
                    new_word.push(first + second);
                    i += 2;
                } else {
                    new_word.push(word[i]);
                    i += 1;
                }
            }
            word = new_word
            if (word.length === 1) {
                break;
            } else {
                pairs = this.get_pairs(word);
            }
        }
        let final_word = word.join(" ");
        this.cache[token] = final_word;
        return final_word;
    }
    encode(tokens) {
        let outputTokens = [];

        for (let token of tokens) {
            token = Array.from(this.text_encoder.encode(token), byte => this.byte_encoder[byte]).join('');
            let bpe_token_list = this.bpe(token).split(' ');
            outputTokens.push(...bpe_token_list);
        }

        return outputTokens;
    }

}

class Normalizer extends Callable {

    constructor(config) {
        super();
        this.config = config;
    }

    static fromConfig(config) {
        if (config === null) return null;
        switch (config.type) {
            case 'BertNormalizer':
                return new BertNormalizer(config);
            case 'Precompiled':
                return new Precompiled(config);
            case 'Sequence':
                return new NormalizerSequence(config);
            case 'Replace':
                return new Replace(config);
            default:
                throw new Error(`Unknown Normalizer type: ${config.type}`);
        }
    }

    normalize(text) {
        throw Error("normalize should be implemented in subclass.")
    }

    _call(text) {
        return this.normalize(text);
    }

}

class Replace extends Normalizer {
    normalize(text) {
        // TODO: this.config.pattern might not be Regex.

        text = text.replace(new RegExp(this.config.pattern.Regex, 'g'), this.config.content)
        return text;
    }
}
class NormalizerSequence extends Normalizer {
    constructor(config) {
        super(config);
        this.normalizers = config.normalizers.map(x => Normalizer.fromConfig(x));
    }
    normalize(text) {
        // TODO use reduce?
        for (let normalizer of this.normalizers) {
            text = normalizer.normalize(text);
        }
        return text;
    }
}
class BertNormalizer extends Normalizer {

    stripAccents(text) {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    normalize(text) {
        // TODO use rest of config
        // config.clean_text,
        // config.handle_chinese_chars,
        // config.strip_accents,
        // config.lowercase,

        if (this.config.lowercase) {
            text = text.toLowerCase();

            if (this.config.strip_accents !== false) {
                text = this.stripAccents(text);
            }
        } else if (this.config.strip_accents) {
            text = this.stripAccents(text);
        }

        return text;
    }
}


class PreTokenizer extends Callable {
    static fromConfig(config) {
        switch (config.type) {
            case 'BertPreTokenizer':
                return new BertPreTokenizer(config);
            case 'Sequence':
                return new PreTokenizerSequence(config);
            case 'WhitespaceSplit':
                return new WhitespaceSplit(config);
            case 'Metaspace':
                return new MetaspacePreTokenizer(config);

            case 'ByteLevel':
                return new ByteLevelPreTokenizer(config);

            default:
                throw new Error(`Unknown PreTokenizer type: ${config.type}`);
        }
    }

    pre_tokenize(text) {
        throw Error("pre_tokenize should be implemented in subclass.")
    }

    _call(text) {
        return this.pre_tokenize(text);
    }
}

class BertPreTokenizer extends PreTokenizer {
    constructor(config) {
        super();
        // TODO use config
        this.pattern = /\b\w+\b|[^\s\w]+/g
    }
    pre_tokenize(text) {
        // Split on whitespace and punctuation
        return text.trim().match(this.pattern) || [];
    }
}
class ByteLevelPreTokenizer extends PreTokenizer {
    constructor(config) {
        super();
        // TODO use config
        this.pattern = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
    }

    pre_tokenize(text) {
        // Split on whitespace and punctuation
        return text.trim().match(this.pattern) || [];
    }
}

class PostProcessor extends Callable {

    static fromConfig(config) {
        switch (config.type) {
            case 'TemplateProcessing':
                return new TemplateProcessing(config);

            case 'ByteLevel':
                return new ByteLevelPostProcessor(config);

            case 'RobertaProcessing':
                return new RobertaProcessing(config);

            default:
                throw new Error(`Unknown PostProcessor type: ${config.type}`);
        }
    }
    post_process(tokens, ...args) {
        throw Error("post_process should be implemented in subclass.")
    }

    _call(tokens, ...args) {
        return this.post_process(tokens, ...args);
    }
}

class RobertaProcessing extends PostProcessor {
    constructor(config) {
        super();
        this.config = config;

        // TODO use all of config:
        // add_prefix_space, cls, sep, trim_offsets

    }

    post_process(tokens, tokens_pair = null) {
        tokens = [this.config.cls[0], ...tokens, this.config.sep[0]]

        // NOTE: It is intended to add 2 EOS tokens after the first set of tokens
        // https://github.com/huggingface/tokenizers/issues/983
        if (tokens_pair !== null) {
            tokens = [...tokens, this.config.sep[0], ...tokens_pair, this.config.sep[0]]
        }
        return tokens;
    }
}

class TemplateProcessing extends PostProcessor {
    constructor(config) {
        super();
        this.config = config;
    }
    post_process(tokens, tokens_pair = null) {
        let type = tokens_pair === null ? this.config.single : this.config.pair

        let toReturn = [];
        for (let item of type) {
            if ('SpecialToken' in item) {
                toReturn.push(item.SpecialToken.id);

            } else if ('Sequence' in item) {
                if (item.Sequence.id === 'A') {
                    toReturn.push(...tokens);

                } else if (item.Sequence.id === 'B') {
                    toReturn.push(...tokens_pair);
                }
            }
        }
        return toReturn;
    }
}
class ByteLevelPostProcessor extends PostProcessor {
    constructor(config) {
        super();
        this.config = config;
    }
    post_process(tokens) {
        return tokens;
    }
}

class Decoder extends Callable {

    constructor(config) {
        super();
        this.config = config;
    }

    static fromConfig(config) {
        switch (config.type) {
            case 'WordPiece':
                return new WordPieceDecoder(config);
            case 'Metaspace':
                return new MetaspaceDecoder(config);
            case 'ByteLevel':
                return new ByteLevelDecoder(config);
            default:
                throw new Error(`Unknown Decoder type: ${config.type}`);
        }
    }

    convert_tokens_to_string(tokens) {
        return tokens.join('').trim();
    }

    _call(tokens) {
        return this.decode(tokens);
    }

    decode(tokens) {
        throw Error("decode should be implemented in subclass.")
    }


}

class WordPieceDecoder extends Decoder {

    constructor(config) {
        super(config);
        this.convertRegex = new RegExp(` ${config.prefix}`, 'g');
    }


    convert_tokens_to_string(tokens) {
        return tokens.join(' ').replace(this.convertRegex, '').trim();
    }

    decode(tokens) {
        return this.convert_tokens_to_string(tokens);
    }
}

class ByteLevelDecoder extends Decoder {
    constructor(config) {
        super(config);

        this.byte_decoder = UNICODE_TO_BYTES;
        this.text_decoder = new TextDecoder("utf-8", {
            fatal: false,
            ignoreBOM: true,
            ignoreEncoding: false
        });
    }

    decode(tokens) {
        let text = this.convert_tokens_to_string(tokens);
        let byteArray = new Uint8Array([...text].map(c => this.byte_decoder[c]));
        let decoded_text = this.text_decoder.decode(byteArray);
        return decoded_text;
    }
}

class MetaspacePreTokenizer extends PreTokenizer {
    constructor(config) {
        super();

        this.addPrefixSpace = config.add_prefix_space;
        this.replacement = config.replacement;
        this.strRep = config.str_rep || this.replacement;
    }
    pre_tokenize(normalizedTokens) {
        if (typeof normalizedTokens === 'string' || normalizedTokens instanceof String) {
            // Metaspace acts on a list of tokens. If passing in a string, first split on whitespace
            normalizedTokens = normalizedTokens.split(/\s+/);
        }

        const result = [];
        for (let token of normalizedTokens) {
            let normalized = token.replace(' ', this.strRep);
            if (this.addPrefixSpace && !normalized.startsWith(this.replacement)) {
                normalized = this.strRep + normalized;
            }
            result.push(normalized);
        }
        return result;
    }
}

class MetaspaceDecoder extends Decoder {
    constructor(config) {
        super(config);

        this.addPrefixSpace = config.add_prefix_space;
        this.replacement = config.replacement;
    }

    decode(tokens) {
        let result = [];
        let i = 0;
        for (let token of tokens) {
            let normalized = token.replace(this.replacement, ' ');
            if (this.addPrefixSpace && i == 0 && normalized.startsWith(' ')) {
                normalized = normalized.substring(1);
            }
            result.push(normalized);
            ++i;
        }

        return this.convert_tokens_to_string(result);
    }
}

class Precompiled extends Normalizer {
    constructor(config) {
        super(config);
        this.charsmap = config.precompiled_charsmap;
    }
    normalize(text) {
        return text;
    }
}

class PreTokenizerSequence extends PreTokenizer {
    constructor(config) {
        super();
        this.tokenizers = config.pretokenizers.map(x => PreTokenizer.fromConfig(x));
    }
    pre_tokenize(text) {
        // TODO use reduce?
        for (let tokenizer of this.tokenizers) {
            text = tokenizer.pre_tokenize(text);
        }
        return text;
    }
}
class WhitespaceSplit extends PreTokenizer {
    constructor(config) {
        super();
    }
    pre_tokenize(text) {
        return text.split(/\s+/);
    }
}

class AutoTokenizer {
    // Helper class to determine tokenizer type from tokenizer.json

    static async from_pretrained(modelPath, progressCallback = null) {

        let [tokenizerJSON, tokenizerConfig] = await Promise.all([
            fetchJSON(modelPath, 'tokenizer.json', progressCallback),
            fetchJSON(modelPath, 'tokenizer_config.json', progressCallback),
        ])

        switch (tokenizerConfig.tokenizer_class) {
            case 'T5Tokenizer':
                return new T5Tokenizer(tokenizerJSON, tokenizerConfig);

            case 'DistilBertTokenizer':
                return new DistilBertTokenizer(tokenizerJSON, tokenizerConfig);

            case 'BertTokenizer':
                return new BertTokenizer(tokenizerJSON, tokenizerConfig);

            case 'GPT2Tokenizer':
                return new GPT2Tokenizer(tokenizerJSON, tokenizerConfig);

            case 'BartTokenizer':
                return new BartTokenizer(tokenizerJSON, tokenizerConfig);

            case 'RobertaTokenizer':
                return new RobertaTokenizer(tokenizerJSON, tokenizerConfig);

            case 'WhisperTokenizer':
                return new WhisperTokenizer(tokenizerJSON, tokenizerConfig);

            default:
                console.warn(`Unknown tokenizer class "${tokenizerConfig.tokenizer_class}", attempting to construct from base class.`);
                return new PreTrainedTokenizer(tokenizerJSON, tokenizerConfig);
        }
    }
}
class PreTrainedTokenizer extends Callable {
    constructor(tokenizerJSON, tokenizerConfig) {
        super();

        this.tokenizerJSON = tokenizerJSON;
        this.tokenizerConfig = tokenizerConfig;

        this.special_tokens = tokenizerJSON.added_tokens.map(x => x.content);
        this.special_tokens_regex = new RegExp(
            '(' + this.special_tokens.map(escapeRegExp).join('|') + ')'
        );

        this.normalizer = Normalizer.fromConfig(tokenizerJSON.normalizer);
        this.pre_tokenizer = PreTokenizer.fromConfig(tokenizerJSON.pre_tokenizer);
        this.model = TokenizerModel.fromConfig(tokenizerJSON.model, tokenizerConfig);
        this.post_processor = PostProcessor.fromConfig(tokenizerJSON.post_processor);

        // TODO - maybe, allow this to be null; in which case, we use model as decoder too?
        this.decoder = Decoder.fromConfig(tokenizerJSON.decoder);

        // Set mask token if present (otherwise will be undefined, which is fine)
        this.mask_token = this.tokenizerConfig.mask_token;
        this.mask_token_id = this.model.tokens_to_ids[this.mask_token];

        this.pad_token = this.tokenizerConfig.pad_token ?? this.tokenizerConfig.eos_token;
        this.pad_token_id = this.model.tokens_to_ids[this.pad_token];

        this.sep_token = this.tokenizerConfig.sep_token;
        this.sep_token_id = this.model.tokens_to_ids[this.sep_token];

        this.model_max_length = this.tokenizerConfig.model_max_length;
    }

    static async from_pretrained(modelPath, progressCallback = null) {
        // TODO get files in parallel

        let [tokenizerJSON, tokenizerConfig] = await Promise.all([
            fetchJSON(modelPath, 'tokenizer.json', progressCallback),
            fetchJSON(modelPath, 'tokenizer_config.json', progressCallback),
        ])

        return new this(tokenizerJSON, tokenizerConfig);
    }

    prepare_model_inputs(inputs) {
        return inputs;
    }

    _call(
        // Required positional arguments
        text,

        // Optional keyword arguments
        {
            text_pair = null,
            // add_special_tokens = true, // TODO
            padding = false,
            truncation = null,
            max_length = null,
        } = {},
    ) {
        let tokens;

        if (Array.isArray(text)) {
            if (text.length === 0) {
                throw Error('text array must be non-empty')
            }

            if (text_pair !== null) {
                if (!Array.isArray(text_pair)) {
                    throw Error('text_pair must also be an array')

                } else if (text.length !== text_pair.length) {
                    throw Error('text and text_pair must have the same length')
                }

                tokens = text.map(
                    (text, i) => this.encode(text, text_pair[i])
                )

            } else {
                tokens = text.map(x => this.encode(x));
            }

        } else {
            if (text === null) {
                throw Error('text may not be null')
            }
            tokens = [this.encode(text, text_pair)];
        }
        // At this point, tokens is batched: [batch_size, tokens]
        // However, array may be jagged. So, we pad to max_length

        let maxLengthOfBatch = Math.max(...tokens.map(x => x.length));

        // If null, we calculate max length from sequences
        if (max_length === null) {
            max_length = maxLengthOfBatch;
        }

        // Ensure it is less than model max length
        max_length = Math.min(max_length, this.model_max_length)

        let attention_mask = [];
        if (padding || truncation) {
            // Perform padding and/or truncation
            for (let i = 0; i < tokens.length; ++i) {
                if (tokens[i].length === max_length) {
                    attention_mask.push(new Array(tokens[i].length).fill(1))
                    continue;

                } else if (tokens[i].length > max_length) {
                    // possibly truncate
                    if (truncation) {
                        tokens[i] = tokens[i].slice(0, max_length);
                    }
                    attention_mask.push(new Array(tokens[i].length).fill(1))

                } else { // t.length < max_length
                    if (padding) {
                        let diff = max_length - tokens[i].length;
                        attention_mask.push(
                            (new Array(tokens[i].length).fill(1)).concat(new Array(diff).fill(0))
                        )
                        tokens[i].push(...new Array(diff).fill(this.pad_token_id))
                    } else {
                        attention_mask.push(new Array(tokens[i].length).fill(1))
                    }
                }
            }
        } else {
            attention_mask = tokens.map(x => new Array(x.length).fill(1))
        }

        // Finally, add attention mask, and possibly model-specific parameters
        let modelInputs = {
            input_ids: tokens,
            attention_mask: attention_mask
        }

        // Optional post-processing
        modelInputs = this.prepare_model_inputs(modelInputs);

        return modelInputs
    }

    _encode_text(text) {
        if (text === null) return null;

        // Actual function which does encoding, for a single text
        // First, we take care of special tokens. Needed to avoid issues arising from
        // normalization and/or pretokenization (which may not preserve special tokens)
        const sections = text.split(this.special_tokens_regex).filter(x => x);

        let tokens = sections.map(x => {
            if (this.special_tokens.includes(x)) {
                // Ignore special tokens
                return x
            } else {
                // Actually perform encoding
                if (this.normalizer !== null) {
                    x = this.normalizer(x);
                }
                let sectionTokens = this.pre_tokenizer(x);
                return this.model(sectionTokens);
            }
        }).flat();

        return tokens;
    }

    encode(text, text_pair = null) {
        // Function called by users to encode possibly multiple texts
        let tokens = this._encode_text(text);
        let tokens2 = this._encode_text(text_pair);

        let combinedTokens = this.post_processor(tokens, tokens2);
        let ids = this.model.convert_tokens_to_ids(combinedTokens);

        return ids
    }

    clean_up_tokenization(text) {
        // Clean up a list of simple English tokenization artifacts
        // like spaces before punctuations and abbreviated forms
        return text.replace(/ \./g, '.')
            .replace(/ \?/g, '?')
            .replace(/ \!/g, '!')
            .replace(/ ,/g, ',')
            .replace(/ \' /g, "'")
            .replace(/ n\'t/g, "n't")
            .replace(/ \'m/g, "'m")
            .replace(/ \'s/g, "'s")
            .replace(/ \'ve/g, "'ve")
            .replace(/ \'re/g, "'re");
    }

    decode(
        token_ids,
        {
            skip_special_tokens = false,
            clean_up_tokenization_spaces = true
        } = {},
    ) {
        if (!Array.isArray(token_ids) || token_ids.length === 0 || !Number.isInteger(token_ids[0])) {
            throw Error("token_ids must be a non-empty array of integers.");
        }

        return this.decode_single(
            token_ids,
            {
                skip_special_tokens,
                clean_up_tokenization_spaces
            }

        )
    }

    batch_decode(batch, decode_args = {}) {
        return batch.map(x => this.decode(x, decode_args));
    }

    decode_single(
        token_ids,
        {
            skip_special_tokens = false,
            clean_up_tokenization_spaces = true,
        }
    ) {

        let tokens = this.model.convert_ids_to_tokens(token_ids);

        if (skip_special_tokens) {
            tokens = tokens.filter(x => !this.special_tokens.includes(x));
        }

        let decoded = this.decoder(tokens);

        if (this.decoder.cleanup !== undefined && this.decoder.cleanup !== clean_up_tokenization_spaces) {
            console.warn(`clean_up_tokenization_spaces disagrees with decoder's cleanup setting. Overriding to use decoder's cleanup setting (${this.decoder.cleanup})`)
            clean_up_tokenization_spaces = this.decoder.cleanup;
        }

        if (clean_up_tokenization_spaces) {
            decoded = this.clean_up_tokenization(decoded);
        }

        return decoded;
    }

}

class BertTokenizer extends PreTrainedTokenizer {
    prepare_model_inputs(inputs) {
        inputs.token_type_ids = inputs.input_ids.map(x => new Array(x.length).fill(0))
        return inputs;
    }
}
class DistilBertTokenizer extends PreTrainedTokenizer { }
class T5Tokenizer extends PreTrainedTokenizer { }
class GPT2Tokenizer extends PreTrainedTokenizer { }
class BartTokenizer extends PreTrainedTokenizer { }
class RobertaTokenizer extends PreTrainedTokenizer { }
class WhisperTokenizer extends PreTrainedTokenizer { }

class CharTrie {
    constructor() {
        this.root = CharTrieNode.default();
    }
    push(...texts) {
        for (let text of texts) {
            let node = this.root;
            for (let ch of text) {
                let child = node.children.get(ch);
                if (child === undefined) {
                    child = CharTrieNode.default();
                    node.children.set(ch, child);
                }
                node = child;
            }
            node.isLeaf = true;
        }

    }
    *commonPrefixSearch(text) {
        let node = this.root;
        let prefix = "";
        for (let i = 0; i < text.length && node !== undefined; i++) {
            const ch = text[i];
            prefix += ch;
            node = node.children.get(ch);
            if (node !== undefined && node.isLeaf) {
                yield prefix;
            }
        }
    }
}
class CharTrieNode {
    constructor(isLeaf, children) {
        this.isLeaf = isLeaf;
        this.children = children;
    }
    static default() {
        return new CharTrieNode(false, new Map());
    }
}


class TokenLattice {
    constructor(sentence, bosTokenId, eosTokenId) {
        this.sentence = sentence;
        this.len = sentence.length;
        this.bosTokenId = bosTokenId;
        this.eosTokenId = eosTokenId;
        this.nodes = [];
        this.beginNodes = new Array(this.len + 1);
        this.endNodes = new Array(this.len + 1);
        for (let i = 0; i < this.len + 1; i++) {
            this.beginNodes[i] = [];
            this.endNodes[i] = [];
        }
        const bos = new TokenLatticeNode(this.bosTokenId, 0, 0, 0, 0.0);
        const eos = new TokenLatticeNode(this.eosTokenId, 1, this.len, 0, 0.0);
        this.nodes.push(bos.clone());
        this.nodes.push(eos.clone());
        this.beginNodes[this.len].push(eos);
        this.endNodes[0].push(bos);
    }
    insert(pos, length, score, tokenId) {
        const nodeId = this.nodes.length;
        const node = new TokenLatticeNode(tokenId, nodeId, pos, length, score);
        this.beginNodes[pos].push(node);
        this.endNodes[pos + length].push(node);
        this.nodes.push(node);
    }
    viterbi() {
        const len = this.len;
        let pos = 0;
        while (pos <= len) {
            if (this.beginNodes[pos].length == 0) {
                return [];
            }
            for (let rnode of this.beginNodes[pos]) {
                rnode.prev = null;
                let bestScore = 0.0;
                let bestNode = null;
                for (let lnode of this.endNodes[pos]) {
                    const score = lnode.backtraceScore + rnode.score;
                    if (bestNode === null || score > bestScore) {
                        bestNode = lnode.clone();
                        bestScore = score;
                    }
                }
                if (bestNode !== null) {
                    rnode.prev = bestNode;
                    rnode.backtraceScore = bestScore;
                }
                else {
                    return [];
                }
            }
            pos++;
        }
        const results = [];
        const root = this.beginNodes[len][0];
        const prev = root.prev;
        if (prev === null) {
            return [];
        }
        let node = prev.clone();
        while (node.prev !== null) {
            results.push(node.clone());
            const n = node.clone();
            node = n.prev.clone();
        }
        results.reverse();
        return results;
    }
    piece(node) {
        return this.sentence.slice(node.pos, node.pos + node.length);
    }
    tokens() {
        const nodes = this.viterbi();
        return nodes.map(x => this.piece(x));
    }
    tokenIds() {
        const nodes = this.viterbi();
        return nodes.map(x => x.tokenId);
    }
}
class TokenLatticeNode {
    constructor(tokenId, nodeId, pos, length, score) {
        this.tokenId = tokenId;
        this.nodeId = nodeId;
        this.pos = pos;
        this.length = length;
        this.score = score;
        this.prev = null;
        this.backtraceScore = 0.0;
    }
    clone() {
        const n = new TokenLatticeNode(this.tokenId, this.nodeId, this.pos, this.length, this.score);
        n.prev = this.prev;
        n.backtraceScore = this.backtraceScore;
        return n;
    }
}


module.exports = {
    AutoTokenizer,
    BertTokenizer,
    DistilBertTokenizer,
    T5Tokenizer,
    GPT2Tokenizer
};