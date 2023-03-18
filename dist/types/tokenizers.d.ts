export class AutoTokenizer {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<PreTrainedTokenizer>;
}
export class BertTokenizer extends PreTrainedTokenizer {
}
export class DistilBertTokenizer extends PreTrainedTokenizer {
}
export class T5Tokenizer extends PreTrainedTokenizer {
}
export class GPT2Tokenizer extends PreTrainedTokenizer {
}
declare class PreTrainedTokenizer extends Callable {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<PreTrainedTokenizer>;
    constructor(tokenizerJSON: any, tokenizerConfig: any);
    tokenizerJSON: any;
    tokenizerConfig: any;
    normalizer: BertNormalizer | Precompiled | NormalizerSequence | Replace | NFC | NFKD | StripAccents | Lowercase;
    pre_tokenizer: BertPreTokenizer | PreTokenizerSequence | WhitespaceSplit | MetaspacePreTokenizer | ByteLevelPreTokenizer | SplitPreTokenizer;
    model: WordPieceTokenizer | Unigram | BPE;
    post_processor: TemplateProcessing | ByteLevelPostProcessor | RobertaProcessing;
    decoder: WordPieceDecoder | MetaspaceDecoder | ByteLevelDecoder;
    special_tokens: any[];
    all_special_ids: any[];
    special_tokens_regex: RegExp;
    mask_token: any;
    mask_token_id: any;
    pad_token: any;
    pad_token_id: any;
    sep_token: any;
    sep_token_id: any;
    model_max_length: any;
    remove_space: any;
    padding_side: string;
    getToken(...keys: any[]): any;
    prepare_model_inputs(inputs: any): any;
    _call(text: any, { text_pair, padding, truncation, max_length, return_tensor, }?: {
        text_pair?: any;
        padding?: boolean;
        truncation?: any;
        max_length?: any;
        return_tensor?: boolean;
    }): {
        input_ids: any[] | Tensor;
        attention_mask: any[];
    };
    _encode_text(text: any): any;
    encode(text: any, text_pair?: any): any;
    clean_up_tokenization(text: any): any;
    batch_decode(batch: any, decode_args?: {}): any;
    decode(token_ids: any, decode_args?: {}): any;
    decode_single(token_ids: any, { skip_special_tokens, clean_up_tokenization_spaces, }: {
        skip_special_tokens?: boolean;
        clean_up_tokenization_spaces?: boolean;
    }): any;
}
import { Callable } from "./utils.js";
declare class BertNormalizer extends Normalizer {
    stripAccents(text: any): any;
    normalize(text: any): any;
}
declare class Precompiled extends Normalizer {
    charsmap: any;
    normalize(text: any): any;
}
declare class NormalizerSequence extends Normalizer {
    normalizers: any;
    normalize(text: any): any;
}
declare class Replace extends Normalizer {
    normalize(text: any): any;
}
declare class NFC extends Normalizer {
    normalize(text: any): any;
}
declare class NFKD extends Normalizer {
    normalize(text: any): any;
}
declare class StripAccents extends Normalizer {
    normalize(text: any): any;
}
declare class Lowercase extends Normalizer {
    normalize(text: any): any;
}
declare class BertPreTokenizer extends PreTokenizer {
    constructor(config: any);
    pattern: RegExp;
    pre_tokenize_text(text: any): any;
}
declare class PreTokenizerSequence extends PreTokenizer {
    constructor(config: any);
    tokenizers: any;
    pre_tokenize_text(text: any): any;
}
declare class WhitespaceSplit extends PreTokenizer {
    constructor(config: any);
    pre_tokenize_text(text: any): any;
}
declare class MetaspacePreTokenizer extends PreTokenizer {
    constructor(config: any);
    addPrefixSpace: any;
    replacement: any;
    strRep: any;
}
declare class ByteLevelPreTokenizer extends PreTokenizer {
    constructor(config: any);
    pattern: RegExp;
    pre_tokenize_text(text: any): any;
}
declare class SplitPreTokenizer extends PreTokenizer {
    constructor(config: any);
    config: any;
    pre_tokenize_text(text: any): any;
}
declare class WordPieceTokenizer extends TokenizerModel {
    tokens_to_ids: any;
    unk_token_id: any;
    unk_token: any;
    vocab: any[];
    encode(tokens: any): any[];
}
declare class Unigram extends TokenizerModel {
    constructor(config: any, moreConfig: any);
    vocab: any;
    scores: any;
    unk_token_id: any;
    unk_token: any;
    tokens_to_ids: {
        [k: string]: any;
    };
    bosToken: string;
    bosTokenId: any;
    eosToken: any;
    eosTokenId: any;
    unkToken: any;
    minScore: number;
    unkScore: number;
    trie: CharTrie;
    populateNodes(lattice: any): void;
    tokenize(normalized: any): any[];
    encode(tokens: any): any[];
}
declare class BPE extends TokenizerModel {
    tokens_to_ids: any;
    unk_token_id: any;
    unk_token: any;
    vocab: any[];
    bpe_ranks: {
        [k: string]: any;
    };
    merges: any;
    byte_encoder: {
        [k: string]: number;
    };
    text_encoder: TextEncoder;
    cache: {};
    get_pairs(word: any): any[];
    bpe(token: any): any;
    encode(tokens: any): any[];
}
declare class TemplateProcessing extends PostProcessor {
    constructor(config: any);
    config: any;
    post_process(tokens: any, tokens_pair?: any): any[];
}
declare class ByteLevelPostProcessor extends PostProcessor {
    constructor(config: any);
    config: any;
    post_process(tokens: any): any;
}
declare class RobertaProcessing extends PostProcessor {
    constructor(config: any);
    config: any;
    post_process(tokens: any, tokens_pair?: any): any;
}
declare class WordPieceDecoder extends Decoder {
    convertRegex: RegExp;
    decode(tokens: any): any;
}
declare class MetaspaceDecoder extends Decoder {
    addPrefixSpace: any;
    replacement: any;
    decode(tokens: any): any;
}
declare class ByteLevelDecoder extends Decoder {
    byte_decoder: any;
    text_decoder: TextDecoder;
    convert_tokens_to_string(tokens: any): string;
    decode(tokens: any): string;
}
import { Tensor } from "./tensor_utils.js";
declare class Normalizer extends Callable {
    static fromConfig(config: any): BertNormalizer | Precompiled | NormalizerSequence | Replace | NFC | NFKD | StripAccents | Lowercase;
    constructor(config: any);
    config: any;
    normalize(text: any): void;
    _call(text: any): void;
}
declare class PreTokenizer extends Callable {
    static fromConfig(config: any): BertPreTokenizer | PreTokenizerSequence | WhitespaceSplit | MetaspacePreTokenizer | ByteLevelPreTokenizer | SplitPreTokenizer;
    pre_tokenize_text(text: any): void;
    pre_tokenize(text: any): any[];
    _call(text: any): any[];
}
declare class TokenizerModel extends Callable {
    static fromConfig(config: any, ...args: any[]): WordPieceTokenizer | Unigram | BPE;
    constructor(config: any);
    config: any;
    _call(tokens: any): void;
    encode(tokens: any): void;
    convert_tokens_to_ids(tokens: any): any;
    convert_ids_to_tokens(ids: any): any;
}
declare class CharTrie {
    root: CharTrieNode;
    push(...texts: any[]): void;
    commonPrefixSearch(text: any): Generator<string, void, unknown>;
}
declare class PostProcessor extends Callable {
    static fromConfig(config: any): TemplateProcessing | ByteLevelPostProcessor | RobertaProcessing;
    post_process(tokens: any, ...args: any[]): void;
    _call(tokens: any, ...args: any[]): void;
}
declare class Decoder extends Callable {
    static fromConfig(config: any): WordPieceDecoder | MetaspaceDecoder | ByteLevelDecoder;
    constructor(config: any);
    config: any;
    convert_tokens_to_string(tokens: any): any;
    _call(tokens: any): void;
    decode(tokens: any): void;
}
declare class CharTrieNode {
    static default(): CharTrieNode;
    constructor(isLeaf: any, children: any);
    isLeaf: any;
    children: any;
}
export {};
