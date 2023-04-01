const {
    Callable,
    fetchJSON,
    reverseDictionary,
    escapeRegExp,
    isIntegralNumber,
    min,
} = require('./utils.js');

const { Tensor } = require('./tensor_utils.js')


class TokenizerModel extends Callable {

    constructor(config) {
        super();
        this.config = config;
    }
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
        return tokens.map(t => this.tokens_to_ids[t] ?? this.unk_token_id);
    }

    convert_ids_to_tokens(ids) {
        return ids.map(i => this.vocab[i] ?? this.unk_token);
    }
}

class WordPieceTokenizer extends TokenizerModel {
    constructor(config) {
        super(config);

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
        super(config);

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

        this.minScore = min(this.scores);

        this.unkScore = this.minScore - 10.0;
        this.scores[this.unk_token_id] = this.unkScore;

        this.trie = new CharTrie();
        this.trie.extend(this.vocab)
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
    constructor(config) {
        super(config);

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
            case 'NFC':
                return new NFC(config);
            case 'NFKD':
                return new NFKD(config);
            case 'StripAccents':
                return new StripAccents(config);
            case 'Lowercase':
                return new Lowercase(config);
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
        if (this.config.pattern.Regex) {
            text = text.replace(new RegExp(this.config.pattern.Regex, 'g'), this.config.content)

        } else if (this.config.pattern.String) {
            text = text.replace(this.config.pattern.String, this.config.content)

        } else {
            console.warn('Unknown pattern type:', this.config.pattern)
        }

        return text;
    }
}

class NFC extends Normalizer {
    normalize(text) {
        text = text.normalize('NFC')
        return text;
    }
}
class NFKD extends Normalizer {
    normalize(text) {
        text = text.normalize('NFKD')
        return text;
    }
}
class StripAccents extends Normalizer {
    normalize(text) {
        text = text.replace(/[\u0300-\u036f]/g, '');
        return text;
    }
}
class Lowercase extends Normalizer {
    normalize(text) {
        text = text.toLowerCase();
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

    _tokenize_chinese_chars(text) {
        /* Adds whitespace around any CJK character. */
        let output = [];
        for (let i = 0; i < text.length; ++i) {
            let char = text[i];
            let cp = char.charCodeAt(0);
            if (this._is_chinese_char(cp)) {
                output.push(" ");
                output.push(char);
                output.push(" ");
            } else {
                output.push(char);
            }
        }
        return output.join("");
    }

    _is_chinese_char(cp) {
        // Checks whether CP is the codepoint of a CJK character.
        //
        // This defines a "chinese character" as anything in the CJK Unicode block:
        //   https://en.wikipedia.org/wiki/CJK_Unified_Ideographs_(Unicode_block)
        //
        // Note that the CJK Unicode block is NOT all Japanese and Korean characters,
        // despite its name. The modern Korean Hangul alphabet is a different block,
        // as is Japanese Hiragana and Katakana. Those alphabets are used to write
        // space-separated words, so they are not treated specially and handled
        // like the all of the other languages.
        return (
            (cp >= 0x4E00 && cp <= 0x9FFF)
            || (cp >= 0x3400 && cp <= 0x4DBF)
            || (cp >= 0x20000 && cp <= 0x2A6DF)
            || (cp >= 0x2A700 && cp <= 0x2B73F)
            || (cp >= 0x2B740 && cp <= 0x2B81F)
            || (cp >= 0x2B820 && cp <= 0x2CEAF)
            || (cp >= 0xF900 && cp <= 0xFAFF)
            || (cp >= 0x2F800 && cp <= 0x2FA1F)
        )
    }
    stripAccents(text) {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    normalize(text) {
        // TODO use rest of config
        // config.clean_text,
        // config.handle_chinese_chars,
        // config.strip_accents,
        // config.lowercase,

        if (this.config.handle_chinese_chars) {
            text = this._tokenize_chinese_chars(text);
        }

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
            case 'Split':
                return new SplitPreTokenizer(config);

            default:
                throw new Error(`Unknown PreTokenizer type: ${config.type}`);
        }
    }

    pre_tokenize_text(text) {
        throw Error("pre_tokenize_text should be implemented in subclass.")
    }

    pre_tokenize(text) {
        let result = [];
        if (Array.isArray(text)) {
            result = text.map(x => this.pre_tokenize_text(x))
        } else {
            result = this.pre_tokenize_text(text);
        }
        return result.flat();
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
    pre_tokenize_text(text) {
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

    pre_tokenize_text(text) {
        // Split on whitespace and punctuation
        return text.match(this.pattern) || [];
    }
}

class SplitPreTokenizer extends PreTokenizer {
    constructor(config) {
        super();
        this.config = config;
    }

    pre_tokenize_text(text) {
        if (this.config.pattern.Regex) {
            return text.match(new RegExp(this.config.pattern.Regex, 'gu')) || [];

        } else if (this.config.pattern.String) {
            return text.match(this.config.pattern.String) || [];

        } else {
            console.warn('Unknown pattern type:', this.config.pattern)
        }

        return [];
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

    convert_tokens_to_string(tokens) {
        let text = tokens.join('');

        if (this.config.trim_offsets) {
            text = text.trim();
        } else if (this.config.add_prefix_space) {
            text = ' ' + text;
        }

        let byteArray = new Uint8Array([...text].map(c => this.byte_decoder[c]));
        let decoded_text = this.text_decoder.decode(byteArray);
        return decoded_text;
    }

    decode(tokens) {
        // TODO move to base class (like HF)
        // tokens === filtered_tokens

        // To avoid mixing byte-level and unicode for byte-level BPT
        // we need to build string separately for added tokens and byte-level tokens
        // cf. https://github.com/huggingface/transformers/issues/1133
        let sub_texts = [];
        let current_sub_text = [];
        for (let token of tokens) {
            // tokens sent here are already filtered, so we don't need to do this
            // if (skip_special_tokens && this.all_special_ids.includes(token)) {
            //     continue;
            // }

            if (this.added_tokens.includes(token)) {
                if (current_sub_text.length > 0) {
                    sub_texts.push(this.convert_tokens_to_string(current_sub_text));
                    current_sub_text = [];
                }
                sub_texts.push(token);
            } else {
                current_sub_text.push(token);
            }
        }
        if (current_sub_text.length > 0) {
            sub_texts.push(this.convert_tokens_to_string(current_sub_text));
        }

        // TODO add spaces_between_special_tokens and clean_up_tokenization_spaces options
        let text = sub_texts.join('');

        return text;
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
    pre_tokenize_text(text) {
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
    pre_tokenize_text(text) {
        return text.split(/\s+/);
    }
}

class PreTrainedTokenizer extends Callable {
    constructor(tokenizerJSON, tokenizerConfig) {
        super();

        this.tokenizerJSON = tokenizerJSON;
        this.tokenizerConfig = tokenizerConfig;

        this.normalizer = Normalizer.fromConfig(tokenizerJSON.normalizer);
        this.pre_tokenizer = PreTokenizer.fromConfig(tokenizerJSON.pre_tokenizer);
        this.model = TokenizerModel.fromConfig(tokenizerJSON.model, tokenizerConfig);
        this.post_processor = PostProcessor.fromConfig(tokenizerJSON.post_processor);

        // TODO - maybe, allow this to be null; in which case, we use model as decoder too?
        this.decoder = Decoder.fromConfig(tokenizerJSON.decoder);

        // Slight hack, but it prevents code duplication:
        // Add added_tokens to this.decoder
        this.decoder.added_tokens = [];

        // Add added_tokens to model
        this.special_tokens = [];
        this.all_special_ids = [];
        for (let addedToken of tokenizerJSON.added_tokens) {
            let id = addedToken.id;
            let content = addedToken.content;
            this.decoder.added_tokens.push(content);

            this.model.tokens_to_ids[content] = id;
            this.model.vocab[id] = content;

            if (addedToken.special) {
                this.special_tokens.push(content);
                this.all_special_ids.push(id);
            }
        }
        this.special_tokens_regex = new RegExp(
            '(' + this.special_tokens.map(escapeRegExp).join('|') + ')'
        );


        // Set mask token if present (otherwise will be undefined, which is fine)
        this.mask_token = this.getToken('mask_token');
        this.mask_token_id = this.model.tokens_to_ids[this.mask_token];

        this.pad_token = this.getToken('pad_token', 'eos_token');
        this.pad_token_id = this.model.tokens_to_ids[this.pad_token];

        this.sep_token = this.getToken('sep_token');
        this.sep_token_id = this.model.tokens_to_ids[this.sep_token];

        this.model_max_length = this.tokenizerConfig.model_max_length;

        this.remove_space = this.tokenizerConfig.remove_space;

        // TODO allow user to change this
        this.padding_side = 'right';
    }

    getToken(...keys) {
        for (let key of keys) {
            let item = this.tokenizerConfig[key];

            if (!item) continue;

            if (typeof item === 'object') {
                if (item.__type === 'AddedToken') {
                    return item.content;
                } else {
                    throw Error(`Unknown token: ${item}`);
                }
            } else {
                return item;
            }
        }
        return null;
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
            return_tensor = true, // Different to HF
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

        // TODO convert to tensor here?
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

                        if (this.padding_side === 'right') {
                            attention_mask.push(
                                (new Array(tokens[i].length).fill(1)).concat(new Array(diff).fill(0))
                            )
                            tokens[i].push(...new Array(diff).fill(this.pad_token_id))
                        } else { // left
                            attention_mask.push(
                                (new Array(diff).fill(0)).concat(new Array(tokens[i].length).fill(1))
                            )
                            tokens[i].unshift(...new Array(diff).fill(this.pad_token_id))
                        }

                    } else {
                        attention_mask.push(new Array(tokens[i].length).fill(1))
                    }
                }
            }
        } else {
            attention_mask = tokens.map(x => new Array(x.length).fill(1))
        }

        if (return_tensor) {
            if (!(padding && truncation)) {
                // Not, guaranteed that all items have same length, so
                // we perform additional check

                if (tokens.some(x => x.length !== tokens[0].length)) {
                    throw Error(
                        "Unable to create tensor, you should probably activate truncation and/or padding " +
                        "with 'padding=true' and 'truncation=true' to have batched tensors with the same length."
                    )
                }
            }

            // Now we actually convert to tensor
            let dims = [tokens.length, tokens[0].length];

            tokens = new Tensor('int64',
                BigInt64Array.from(tokens.flat().map(BigInt)),
                dims
            );

            attention_mask = new Tensor(
                'int64',
                BigInt64Array.from(attention_mask.flat().map(BigInt)),
                dims
            )
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
                if (this.remove_space === true) {
                    // remove_space
                    x = x.trim().split(/\s+/).join(' ')
                }
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

    batch_decode(batch, decode_args = {}) {
        return batch.map(x => this.decode(x, decode_args));
    }
    decode(
        token_ids,
        decode_args = {},
    ) {
        if (!Array.isArray(token_ids) || token_ids.length === 0 || !isIntegralNumber(token_ids[0])) {
            throw Error("token_ids must be a non-empty array of integers.");
        }

        return this.decode_single(
            token_ids, decode_args
        )
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

        let decoded = this.decoder(tokens); // tokens === filtered_tokens

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

function bert_prepare_model_inputs(inputs) {
    // Helper method for preparing token_type_ids for bert models
    inputs.token_type_ids = new Tensor(
        'int64',
        new BigInt64Array(inputs.input_ids.data.length),
        inputs.input_ids.dims
    )
    return inputs;
}
class BertTokenizer extends PreTrainedTokenizer {
    prepare_model_inputs(inputs) {
        return bert_prepare_model_inputs(inputs);
    }
}
class AlbertTokenizer extends PreTrainedTokenizer {
    prepare_model_inputs(inputs) {
        return bert_prepare_model_inputs(inputs);
    }
}
class MobileBertTokenizer extends PreTrainedTokenizer {
    prepare_model_inputs(inputs) {
        return bert_prepare_model_inputs(inputs);
    }
}
class SqueezeBertTokenizer extends PreTrainedTokenizer {
    prepare_model_inputs(inputs) {
        return bert_prepare_model_inputs(inputs);
    }
}
class DistilBertTokenizer extends PreTrainedTokenizer { }
class T5Tokenizer extends PreTrainedTokenizer { }
class GPT2Tokenizer extends PreTrainedTokenizer { }
class BartTokenizer extends PreTrainedTokenizer { }
class RobertaTokenizer extends PreTrainedTokenizer { }



class WhisperTokenizer extends PreTrainedTokenizer {
    static LANGUAGES = {
        "en": "english",
        "zh": "chinese",
        "de": "german",
        "es": "spanish",
        "ru": "russian",
        "ko": "korean",
        "fr": "french",
        "ja": "japanese",
        "pt": "portuguese",
        "tr": "turkish",
        "pl": "polish",
        "ca": "catalan",
        "nl": "dutch",
        "ar": "arabic",
        "sv": "swedish",
        "it": "italian",
        "id": "indonesian",
        "hi": "hindi",
        "fi": "finnish",
        "vi": "vietnamese",
        "he": "hebrew",
        "uk": "ukrainian",
        "el": "greek",
        "ms": "malay",
        "cs": "czech",
        "ro": "romanian",
        "da": "danish",
        "hu": "hungarian",
        "ta": "tamil",
        "no": "norwegian",
        "th": "thai",
        "ur": "urdu",
        "hr": "croatian",
        "bg": "bulgarian",
        "lt": "lithuanian",
        "la": "latin",
        "mi": "maori",
        "ml": "malayalam",
        "cy": "welsh",
        "sk": "slovak",
        "te": "telugu",
        "fa": "persian",
        "lv": "latvian",
        "bn": "bengali",
        "sr": "serbian",
        "az": "azerbaijani",
        "sl": "slovenian",
        "kn": "kannada",
        "et": "estonian",
        "mk": "macedonian",
        "br": "breton",
        "eu": "basque",
        "is": "icelandic",
        "hy": "armenian",
        "ne": "nepali",
        "mn": "mongolian",
        "bs": "bosnian",
        "kk": "kazakh",
        "sq": "albanian",
        "sw": "swahili",
        "gl": "galician",
        "mr": "marathi",
        "pa": "punjabi",
        "si": "sinhala",
        "km": "khmer",
        "sn": "shona",
        "yo": "yoruba",
        "so": "somali",
        "af": "afrikaans",
        "oc": "occitan",
        "ka": "georgian",
        "be": "belarusian",
        "tg": "tajik",
        "sd": "sindhi",
        "gu": "gujarati",
        "am": "amharic",
        "yi": "yiddish",
        "lo": "lao",
        "uz": "uzbek",
        "fo": "faroese",
        "ht": "haitian creole",
        "ps": "pashto",
        "tk": "turkmen",
        "nn": "nynorsk",
        "mt": "maltese",
        "sa": "sanskrit",
        "lb": "luxembourgish",
        "my": "myanmar",
        "bo": "tibetan",
        "tl": "tagalog",
        "mg": "malagasy",
        "as": "assamese",
        "tt": "tatar",
        "haw": "hawaiian",
        "ln": "lingala",
        "ha": "hausa",
        "ba": "bashkir",
        "jw": "javanese",
        "su": "sundanese",
    }
    _decode_asr(sequences, {
        return_timestamps = false,
        return_language = false,
        time_precision = null,
        force_full_sequences = true
    } = {}) {
        // Set force_full_sequences=false if you want streaming
        // TODO add support for `return_language`

        // Internal method meant to only be used by asr pipeline.
        // Handles all the little quirks specific to whisper to handle
        // the various options not allowed in other seq2seq models

        // =========== Overview ============
        // - iterate over all outputs
        // - all tokens within output
        // - Each token can be
        //   - language token
        //   - special token
        //   - timestamp token
        //   - text token
        // - We accumulate the text tokens.
        // - We split on end timestamps
        // - Lots of complexity comes from stride and timestamps

        if (time_precision === null) {
            throw Error("Must specify time_precision")
        }
        let last_language = null;

        function new_chunk() {
            return { "language": last_language, "timestamp": [null, null], "text": "" };
        }

        // Welcome to the state machine!
        const chunks = [];
        let chunk = new_chunk();
        let time_offset = 0.0;
        const timestamp_begin = this.model.convert_tokens_to_ids(["<|notimestamps|>"])[0] + 1;

        let previous_tokens = [];
        let skip = false;
        let right_stride_start = null;


        const all_special_ids = new Set(this.all_special_ids);

        for (let output of sequences) {
            // NOTE: python version has batches, so it uses [0]
            const token_ids = output.tokens;

            // These keep track of timestamps within strides, which need
            // to be skipped and resolve all tokens in a single chunk.
            let last_timestamp = null;
            let first_timestamp = timestamp_begin;

            if ("stride" in output) {
                const [chunk_len, stride_left, stride_right] = output.stride;

                // Offset the timings to account for the other `model_outputs`.
                time_offset -= stride_left;
                right_stride_start = chunk_len - stride_right;

                // Keeping track of timestamps within strides
                // We're going to NOT split on those, and delay until we're
                // out of BOTH stride. Otherwise lots of issues occur and
                // corner cases
                if (stride_left) {
                    first_timestamp = stride_left / time_precision + timestamp_begin;
                }

                if (stride_right) {
                    for (let i = token_ids.length - 1; i >= 0; --i) {
                        const token = token_ids[i];
                        if (token >= timestamp_begin) {
                            // There can be several token in the right stride
                            // But the last one is ALWAYS going to be skipped
                            if (last_timestamp !== null && (token - timestamp_begin) * time_precision < right_stride_start) {
                                break;
                            }
                            last_timestamp = token;
                        }
                    }
                }
            }

            let current_tokens = [];

            // - all tokens within output
            for (const token of token_ids) {
                // 4 possible states for each token
                // - 1/ Language code
                // - 2/ all other special tokens (which we ignore)
                // - 3/ Timestamp
                // - 4/ Regular text

                if (all_special_ids.has(token)) {
                    const text = this.decode([token]);
                    if (text[0] === "[" && text[text.length - 1] === "]") {
                        const language = this.LANGUAGES[text.slice(1, -1)];

                        if (language !== undefined) {
                            // 1/ Indeed some language
                            // TODO Handle when language is different from the previous
                            // one, and we cannot use timestamped tokens to create chunks
                            if (last_language !== null && language !== last_language && !return_timestamps) {
                                previous_tokens.push(current_tokens);
                                const resolved_tokens = this.findLongestCommonSequence(previous_tokens);
                                const resolved_text = this.decode(resolved_tokens);
                                chunk.text = resolved_text;
                                chunks.push(chunk);

                                // Flush all our temporary context
                                previous_tokens = [];
                                current_tokens = [];
                                chunk = new_chunk();
                            }

                            last_language = chunk.language = language;
                        } else {
                            // 2/ This is a regular special token, ignoring it
                        }
                    }
                } else if (token >= timestamp_begin) {
                    // 3/ Timestamp token
                    const time = (token - timestamp_begin) * time_precision + time_offset;
                    const rounded_time = Math.round(time * 100) / 100;

                    if (last_timestamp !== null && token >= last_timestamp) {
                        // Whisper outputted a timestamp token, but it falls within
                        // our stride, so we're going to skip it for the time being
                        // and resolve this later
                        // Skip is necessary because timestamp tokens always come
                        // by pair, so we need to skip the next one too (which would mark the start of another chunk).
                        skip = true;
                    } else if (skip || (previous_tokens.length > 0 && token < first_timestamp)) {
                        skip = false;
                    } else if (chunk.timestamp[0] === null) {
                        chunk.timestamp[0] = rounded_time;
                    } else {
                        // This is the end of the timestamp chunk
                        if (rounded_time === chunk.timestamp[0]) {
                            // This is a bug in timestamp token output
                            // where we're taking the duplicate token
                            // as a stop where it should be a start.
                            // This is an issue in the underlying model output
                            // Let's just skip it so it becomes
                        } else {
                            chunk.timestamp[1] = time;

                            // Handling merges
                            previous_tokens.push(current_tokens)
                            const resolved_tokens = this.findLongestCommonSequence(previous_tokens)
                            const resolved_text = this.decode(resolved_tokens)
                            chunk.text = resolved_text
                            chunks.push(chunk)

                            // Flush all our temporary context
                            previous_tokens = []
                            current_tokens = []
                            chunk = new_chunk()
                        }
                    }

                } else {
                    // 4/ Regular token
                    // We just append to the list of all tokens so we can handle
                    // merges later and decode into text.
                    current_tokens.push(token)

                }
            }

            if ('stride' in output) {
                const [chunk_len, stride_left, stride_right] = output.stride;
                time_offset += chunk_len - stride_right
            }

            // Leftover tokens
            if (current_tokens.length > 0) {
                previous_tokens.push(current_tokens)
            } else if (previous_tokens.every(p => p.length === 0)) {
                // Flushing previous tokens (END)"
                chunk = new_chunk()
                previous_tokens = []
                current_tokens = []
            }

        }

        if (previous_tokens.length > 0) {
            if (force_full_sequences && return_timestamps) {
                // Last token should always be timestamps, so there shouldn't be
                // leftover
                throw new Error("There was an error while processing timestamps, we haven't found a timestamp as last token.");
            }

            // Happens when we don't use timestamps
            const resolved_tokens = this.findLongestCommonSequence(previous_tokens);

            // Flushing previous tokens (FINAL)
            const resolved_text = this.decode(resolved_tokens);
            chunk.text = resolved_text;
            chunks.push(chunk);
        }

        let optional = {};

        // Preparing and cleaning up the pipeline output
        const full_text = chunks.map(chunk => chunk.text).join('');
        if (return_timestamps || return_language) {
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (!return_timestamps) {
                    delete chunk["timestamp"];
                }

                if (!return_language) {
                    delete chunk["language"];
                }
            }
            optional = { "chunks": chunks };
        }
        return [full_text, optional];

    }

    findLongestCommonSequence(sequences) {
        // It would be much harder to do O(n) because of fault tolerance.
        // We actually have a really good property which is that the total sequence
        // MUST be those subsequences in order.
        let leftSequence = sequences[0];
        let leftLength = leftSequence.length;
        let totalSequence = [];
        for (let i = 1; i < sequences.length; i++) {
            const rightSequence = sequences[i];
            let max = 0.0;
            let maxIndices = [leftLength, leftLength, 0, 0];
            // Here we're sliding matches
            // [a, b, c, d]
            //          [c, d, f]
            // =        [c] == [d]

            // [a, b, c, d]
            //       [c, d, f]
            // =     [c, d] == [c, d]


            // [a, b, c, d]
            //    [c, d, f]

            // =  [b, c, d] == [c, d, f]

            // [a, b, c, d]
            // [c, d, f]

            // [a, b, c] == [c, d, f]

            // [a, b, c, d]
            // [d, f]

            // [a, b] == [d, f]

            // [a, b, c, d]
            // [f]

            // [a] == [f]

            const rightLength = rightSequence.length;
            for (let j = 1; j < leftLength + rightLength; j++) {
                const eps = j / 10000.0;
                const leftStart = Math.max(0, leftLength - j);
                const leftStop = Math.min(leftLength, leftLength + rightLength - j);
                const left = leftSequence.slice(leftStart, leftStop);
                const rightStart = Math.max(0, j - leftLength);
                const rightStop = Math.min(rightLength, j);
                const right = rightSequence.slice(rightStart, rightStop);
                if (left.length !== right.length) {
                    throw new Error("There is a bug within whisper `decode_asr` function, please report it. Dropping to prevent bad inference.");
                }
                const matches = left.filter((elem, idx) => elem === right[idx]).length;
                const matching = matches / j + eps;
                if (matches > 1 && matching > max) {
                    max = matching;
                    maxIndices = [leftStart, leftStop, rightStart, rightStop];
                }
            }
            const [leftStart, leftStop, rightStart, rightStop] = maxIndices;
            const leftMid = Math.floor((leftStop + leftStart) / 2);
            const rightMid = Math.floor((rightStop + rightStart) / 2);
            totalSequence.push(...leftSequence.slice(0, leftMid));
            leftSequence = rightSequence.slice(rightMid);
            leftLength = leftSequence.length;
        }
        totalSequence.push(...leftSequence);
        return totalSequence;
    }
}
class CodeGenTokenizer extends PreTrainedTokenizer { }
class CLIPTokenizer extends PreTrainedTokenizer { }
class MarianTokenizer extends PreTrainedTokenizer { }


class CharTrie {
    constructor() {
        this.root = CharTrieNode.default();
    }
    extend(texts) {
        for (let text of texts) {
            this.push(text);
        }
    }
    push(text) {
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


class AutoTokenizer {
    // Helper class to determine tokenizer type from tokenizer.json
    static TOKENIZER_CLASS_MAPPING = {
        'T5Tokenizer': T5Tokenizer,
        'DistilBertTokenizer': DistilBertTokenizer,
        'BertTokenizer': BertTokenizer,
        'MobileBertTokenizer': MobileBertTokenizer,
        'SqueezeBertTokenizer': SqueezeBertTokenizer,
        'AlbertTokenizer': AlbertTokenizer,
        'GPT2Tokenizer': GPT2Tokenizer,
        'BartTokenizer': BartTokenizer,
        'RobertaTokenizer': RobertaTokenizer,
        'WhisperTokenizer': WhisperTokenizer,
        'CodeGenTokenizer': CodeGenTokenizer,
        'CLIPTokenizer': CLIPTokenizer,
        'MarianTokenizer': MarianTokenizer,
    }

    static async from_pretrained(modelPath, progressCallback = null) {

        let [tokenizerJSON, tokenizerConfig] = await Promise.all([
            fetchJSON(modelPath, 'tokenizer.json', progressCallback),
            fetchJSON(modelPath, 'tokenizer_config.json', progressCallback),
        ])

        let cls = this.TOKENIZER_CLASS_MAPPING[tokenizerConfig.tokenizer_class];
        if (!cls) {
            console.warn(`Unknown tokenizer class "${tokenizerConfig.tokenizer_class}", attempting to construct from base class.`);
            cls = PreTrainedTokenizer;
        }
        return new cls(tokenizerJSON, tokenizerConfig);
    }
}

module.exports = {
    AutoTokenizer,
    BertTokenizer,
    DistilBertTokenizer,
    T5Tokenizer,
    GPT2Tokenizer
};