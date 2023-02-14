import { Callable } from './utils.js'


class TokenizerModel extends Callable {
    static fromConfig(config, ...args) {
        switch (config.type) {
            case 'WordPiece':
                return new WordPieceTokenizer(config);
            case 'Unigram':
                return new Unigram(config, ...args);
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

class Normalizer extends Callable {

    static fromConfig(config) {
        switch (config.type) {
            case 'BertNormalizer':
                return new BertNormalizer(config);
            case 'Precompiled':
                return new Precompiled(config);
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

class BertNormalizer extends Normalizer {
    constructor(config) {
        super();
        this.config = config;

        // TODO use rest of config
        // config.clean_text,
        // config.handle_chinese_chars,
        // config.strip_accents,
        // config.lowercase,
    }
    normalize(text) {
        if (this.config.lowercase) {
            text = text.toLowerCase();
        }

        // TODO fix
        return text;
    }
}


class PreTokenizer extends Callable {
    static fromConfig(config) {
        switch (config.type) {
            case 'BertPreTokenizer':
                return new BertPreTokenizer(config);
            case 'Sequence':
                return new Sequence(config);
            case 'WhitespaceSplit':
                return new WhitespaceSplit(config);
            case 'Metaspace':
                return new MetaspacePreTokenizer(config);
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
    }
    pre_tokenize(text) {
        // Split on whitespace and punctuation
        return text.trim().match(/\b\w+\b|[^\s\w]+/g) || [];
    }
}

class PostProcessor extends Callable {

    static fromConfig(config) {
        switch (config.type) {
            case 'TemplateProcessing':
                return new TemplateProcessing(config);
            default:
                throw new Error(`Unknown PostProcessor type: ${config.type}`);
        }
    }
    post_process(tokens) {
        throw Error("post_process should be implemented in subclass.")
    }

    _call(tokens) {
        return this.post_process(tokens);
    }
}

class TemplateProcessing extends PostProcessor {
    constructor(config) {
        super();
        this.config = config;
    }
    post_process(tokens) {
        let toReturn = [];
        for (let item of this.config.single) {
            if ('SpecialToken' in item) {
                toReturn.push(item.SpecialToken.id);
            } else if ('Sequence' in item) { // && item.Sequence === 'A'
                toReturn.push(...tokens);
            }
        }
        // TODO fix
        return toReturn;
    }
}

class Decoder extends Callable {
    static fromConfig(config) {
        switch (config.type) {
            case 'WordPiece':
                return new WordPieceDecoder(config);
            case 'Metaspace':
                return new MetaspaceDecoder(config);
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
        super();
        this.config = config;
        this.convertRegex = new RegExp(` ${config.prefix}`, 'g');
    }


    convert_tokens_to_string(tokens) {
        return tokens.join(' ').replace(this.convertRegex, '').trim();
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

    decode(tokens) {
        let text = this.convert_tokens_to_string(tokens);

        if (this.config.cleanup) {
            text = this.clean_up_tokenization(text);
        }
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
        super();

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
        super();
        this.charsmap = config.precompiled_charsmap;
    }
    normalize(text) {
        return text;
    }
}

class Sequence extends PreTokenizer {
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

class PreTrainedTokenizer extends Callable {
    constructor(tokenizerJSON, tokenizerConfig) {
        super();
        this.tokenizerJSON = tokenizerJSON;
        this.tokenizerConfig = tokenizerConfig;

        this.normalizer = Normalizer.fromConfig(tokenizerJSON.normalizer);
        this.pre_tokenizer = PreTokenizer.fromConfig(tokenizerJSON.pre_tokenizer);
        this.model = TokenizerModel.fromConfig(tokenizerJSON.model, tokenizerConfig);
        this.post_processor = PostProcessor.fromConfig(tokenizerJSON.post_processor);
        this.decoder = Decoder.fromConfig(tokenizerJSON.decoder);
    }

    _call(text) {
        return this.encode(text);
    }

    encode(text) {
        text = this.normalizer(text);
        let tokens = this.pre_tokenizer(text);

        tokens = this.model(tokens);
        tokens = this.post_processor(tokens);

        let ids = this.model.convert_tokens_to_ids(tokens);
        return {
            input_ids: ids,
            attention_mask: new Array(ids.length).fill(1)
        }
    }

    decode(token_ids) {
        let tokens = this.model.convert_ids_to_tokens(token_ids);
        return this.decoder(tokens)
    }
    static async from_pretrained(modelPath) {
        // TODO get files in parallel
        let tokenizerJSON = await fetchJSON(pathJoin(modelPath, 'tokenizer.json'));
        let tokenizerConfig = await fetchJSON(pathJoin(modelPath, 'tokenizer_config.json'));

        switch (tokenizerConfig.tokenizer_class) {
            case 'T5Tokenizer':
                return new T5Tokenizer(tokenizerJSON, tokenizerConfig);

            case 'DistilBertTokenizer':
                return new DistilBertTokenizer(tokenizerJSON, tokenizerConfig);

            case 'BertTokenizer':
                return new BertTokenizer(tokenizerJSON, tokenizerConfig);

            default:
                console.warn(`Unknown tokenizer class "${tokenizerConfig.tokenizer_class}", attempting to construct from base class.`);
                return new PreTrainedTokenizer(tokenizerJSON, tokenizerConfig);
        }
    }
}

class BertTokenizer extends PreTrainedTokenizer { }
class DistilBertTokenizer extends PreTrainedTokenizer { }
class T5Tokenizer extends PreTrainedTokenizer { }


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


export { PreTrainedTokenizer, BertTokenizer, DistilBertTokenizer, T5Tokenizer };