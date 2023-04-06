export class AutoTokenizer {
    static TOKENIZER_CLASS_MAPPING: {
        T5Tokenizer: typeof T5Tokenizer;
        DistilBertTokenizer: typeof DistilBertTokenizer;
        BertTokenizer: typeof BertTokenizer;
        MobileBertTokenizer: typeof MobileBertTokenizer;
        SqueezeBertTokenizer: typeof SqueezeBertTokenizer;
        AlbertTokenizer: typeof AlbertTokenizer;
        GPT2Tokenizer: typeof GPT2Tokenizer;
        BartTokenizer: typeof BartTokenizer;
        RobertaTokenizer: typeof RobertaTokenizer;
        WhisperTokenizer: typeof WhisperTokenizer;
        CodeGenTokenizer: typeof CodeGenTokenizer;
        CLIPTokenizer: typeof CLIPTokenizer;
        MarianTokenizer: typeof MarianTokenizer;
    };
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<any>;
}
/**
 * BertTokenizer is a class used to tokenize text for BERT models.
 * @extends PreTrainedTokenizer
 */
export class BertTokenizer extends PreTrainedTokenizer {
    /**
     * @see {@link bert_prepare_model_inputs}
     */
    prepare_model_inputs(inputs: any): any;
}
export class DistilBertTokenizer extends PreTrainedTokenizer {
}
export class T5Tokenizer extends PreTrainedTokenizer {
}
export class GPT2Tokenizer extends PreTrainedTokenizer {
}
declare class MobileBertTokenizer extends PreTrainedTokenizer {
    /**
     * @see {@link bert_prepare_model_inputs}
     */
    prepare_model_inputs(inputs: any): any;
}
declare class SqueezeBertTokenizer extends PreTrainedTokenizer {
    /**
     * @see {@link bert_prepare_model_inputs}
     */
    prepare_model_inputs(inputs: any): any;
}
/**
 * Albert tokenizer
 * @extends PreTrainedTokenizer
 */
declare class AlbertTokenizer extends PreTrainedTokenizer {
    /**
     * @see {@link bert_prepare_model_inputs}
     */
    prepare_model_inputs(inputs: any): any;
}
declare class BartTokenizer extends PreTrainedTokenizer {
}
declare class RobertaTokenizer extends PreTrainedTokenizer {
}
/**
 * WhisperTokenizer tokenizer
 * @extends PreTrainedTokenizer
 */
declare class WhisperTokenizer extends PreTrainedTokenizer {
    static LANGUAGES: {
        en: string;
        zh: string;
        de: string;
        es: string;
        ru: string;
        ko: string;
        fr: string;
        ja: string;
        pt: string;
        tr: string;
        pl: string;
        ca: string;
        nl: string;
        ar: string;
        sv: string;
        it: string;
        id: string;
        hi: string;
        fi: string;
        vi: string;
        he: string;
        uk: string;
        el: string;
        ms: string;
        cs: string;
        ro: string;
        da: string;
        hu: string;
        ta: string;
        no: string;
        th: string;
        ur: string;
        hr: string;
        bg: string;
        lt: string;
        la: string;
        mi: string;
        ml: string;
        cy: string;
        sk: string;
        te: string;
        fa: string;
        lv: string;
        bn: string;
        sr: string;
        az: string;
        sl: string;
        kn: string;
        et: string;
        mk: string;
        br: string;
        eu: string;
        is: string;
        hy: string;
        ne: string;
        mn: string;
        bs: string;
        kk: string;
        sq: string;
        sw: string;
        gl: string;
        mr: string;
        pa: string;
        si: string;
        km: string;
        sn: string;
        yo: string;
        so: string;
        af: string;
        oc: string;
        ka: string;
        be: string;
        tg: string;
        sd: string;
        gu: string;
        am: string;
        yi: string;
        lo: string;
        uz: string;
        fo: string;
        ht: string;
        ps: string;
        tk: string;
        nn: string;
        mt: string;
        sa: string;
        lb: string;
        my: string;
        bo: string;
        tl: string;
        mg: string;
        as: string;
        tt: string;
        haw: string;
        ln: string;
        ha: string;
        ba: string;
        jw: string;
        su: string;
    };
    /**
     * Decodes automatic speech recognition (ASR) sequences.
     * @param {Array.<{tokens: Array.<number>, stride: [number, number, number]}>} sequences The sequences to decode.
     * @param {Object} options - The options to use for decoding.
     * @returns {[string, {chunks?:Array.<{language: string|null, timestamp: [number|null, number|null], text: string}>}]} The decoded sequences.
     */
    _decode_asr(sequences: Array<{
        tokens: Array<number>;
        stride: [number, number, number];
    }>, { return_timestamps, return_language, time_precision, force_full_sequences }?: any): [string, {
        chunks?: Array<{
            language: string | null;
            timestamp: [number | null, number | null];
            text: string;
        }>;
    }];
    /**
     * Finds the longest common sequence among the provided sequences.
     * @param {number[][]} sequences - An array of sequences of token ids to compare.
     * @returns {number[]} - The longest common sequence found.
     * @throws {Error} - If there is a bug within the function.
     */
    findLongestCommonSequence(sequences: number[][]): number[];
}
declare class CodeGenTokenizer extends PreTrainedTokenizer {
}
declare class CLIPTokenizer extends PreTrainedTokenizer {
}
declare class MarianTokenizer extends PreTrainedTokenizer {
    languageRegex: RegExp;
    supported_language_codes: any;
}
declare class PreTrainedTokenizer extends Callable {
    /**
     * Creates a new Tokenizer instance with the tokenizer configuration and files
     * downloaded from a pretrained model located at the given model path.
     *
     * @param {string} modelPath - The path to the pretrained model.
     * @param {function} [progressCallback=null] - Optional callback function that will be called with the current
     * progress percentage (0 to 100) each time a file is downloaded.
     * @throws {Error} Throws an error if the tokenizer.json or tokenizer_config.json files are not found in the modelPath.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<PreTrainedTokenizer>;
    /**
     * Create a new PreTrainedTokenizer instance.
     * @param {Object} tokenizerJSON - The JSON of the tokenizer.
     * @param {Object} tokenizerConfig - The config of the tokenizer.
     */
    constructor(tokenizerJSON: any, tokenizerConfig: any);
    tokenizerJSON: any;
    tokenizerConfig: any;
    normalizer: Normalizer;
    pre_tokenizer: PreTokenizer;
    model: TokenizerModel;
    post_processor: PostProcessor;
    decoder: Decoder;
    special_tokens: any[];
    all_special_ids: any[];
    special_tokens_regex: RegExp;
    mask_token: string;
    mask_token_id: any;
    pad_token: string;
    pad_token_id: any;
    sep_token: string;
    sep_token_id: any;
    model_max_length: any;
    remove_space: any;
    padding_side: string;
    /**
     * Returns the value of the first matching key in the tokenizer config object.
     * @param {...string} keys - One or more keys to search for in the tokenizer config object.
     * @returns {string|null} - The value associated with the first matching key, or null if no match is found.
     * @throws {Error} - If an object is found for a matching key and its __type property is not "AddedToken".
     */
    getToken(...keys: string[]): string | null;
    /**
     * This function can be overridden by a subclass to apply additional preprocessing
     * to a model's input data.
     * @param {Object} inputs - An object containing input data as properties.
     * @returns {Object} The modified inputs object.
     */
    prepare_model_inputs(inputs: any): any;
    /**
     * Encode/tokenize the given text(s).
     * @param {string|string[]} text - The text to tokenize.
     * @param {object} options - An optional object containing the following properties:
     * @param {string|string[]} [options.text_pair=null] - Optional second sequence to be encoded. If set, must be the same type as text.
     * @param {boolean} [options.padding=false] - Whether to pad the input sequences.
     * @param {boolean} [options.truncation=null] - Whether to truncate the input sequences.
     * @param {number} [options.max_length=null] - Maximum length of the returned list and optionally padding length.
     * @param {boolean} [options.return_tensor=true] - Whether to return the results as Tensors or arrays.
     * @returns {{ input_ids: number[]|number[][]|Tensor; attention_mask: any[]|Tensor; }} Object to be passed to the model.
     */
    _call(text: string | string[], { text_pair, padding, truncation, max_length, return_tensor, }?: {
        text_pair?: string | string[];
        padding?: boolean;
        truncation?: boolean;
        max_length?: number;
        return_tensor?: boolean;
    }): {
        input_ids: number[] | number[][] | Tensor;
        attention_mask: any[] | Tensor;
    };
    /**
     * Encodes a single text using the preprocessor pipeline of the tokenizer.
     *
     * @param {string|null} text - The text to encode.
     * @returns {Array} The encoded tokens.
     */
    _encode_text(text: string | null): any[];
    /**
     * Encodes a single text or a pair of texts using the model's tokenizer.
     *
     * @param {string} text - The text to encode.
     * @param {string|null} text_pair - The optional second text to encode.
     * @returns {number[]} An array of token IDs representing the encoded text(s).
     */
    encode(text: string, text_pair?: string | null): number[];
    /**
     * Clean up a list of simple English tokenization artifacts like spaces before punctuations and abbreviated forms
     * @param {string} text - The text to clean up.
     * @returns {string} - The cleaned up text.
     */
    clean_up_tokenization(text: string): string;
    /**
     * Decode a batch of tokenized sequences.
     * @param {number[][]} batch - List of tokenized input sequences.
     * @param {Object} decode_args - (Optional) Object with decoding arguments.
     * @returns {string[]} List of decoded sequences.
     */
    batch_decode(batch: number[][], decode_args?: any): string[];
    /**
     * Decodes a sequence of token IDs back to a string.
     *
     * @param {number[]} token_ids - List of token IDs to decode.
     * @param {Object} [decode_args={}]
     * @param {boolean} [decode_args.skip_special_tokens=false] - If true, special tokens are removed from the output string.
     * @param {boolean} [decode_args.clean_up_tokenization_spaces=true] - If true, spaces before punctuations and abbreviated forms are removed.
     *
     * @returns {string} The decoded string.
     * @throws {Error} If `token_ids` is not a non-empty array of integers.
     */
    decode(token_ids: number[], decode_args?: {
        skip_special_tokens?: boolean;
        clean_up_tokenization_spaces?: boolean;
    }): string;
    /**
     * Decode a single list of token ids to a string.
     * @param {number[]} token_ids - List of token ids to decode
     * @param {object} decode_args - Optional arguments for decoding
     * @param {boolean} [decode_args.skip_special_tokens=false] - Whether to skip special tokens during decoding
     * @param {boolean} [decode_args.clean_up_tokenization_spaces=true] - Whether to clean up tokenization spaces during decoding
     * @returns {string} - The decoded string
     */
    decode_single(token_ids: number[], { skip_special_tokens, clean_up_tokenization_spaces, }: {
        skip_special_tokens?: boolean;
        clean_up_tokenization_spaces?: boolean;
    }): string;
}
import { Callable } from "./utils.js";
/**
 * A base class for text normalization.
 * @abstract
 */
declare class Normalizer extends Callable {
    /**
     * Factory method for creating normalizers from config objects.
     * @static
     * @param {object} config - The configuration object for the normalizer.
     * @returns {Normalizer} - A Normalizer object.
     * @throws {Error} - If an unknown Normalizer type is specified in the config.
     */
    static fromConfig(config: object): Normalizer;
    /**
     * @param {object} config - The configuration object for the normalizer.
     */
    constructor(config: object);
    config: any;
    /**
     * Normalize the input text.
     * @abstract
     * @param {string} text - The text to normalize.
     * @returns {string} - The normalized text.
     * @throws {Error} - If this method is not implemented in a subclass.
     */
    normalize(text: string): string;
    /**
     * Alias for {@link Normalizer#normalize}.
     * @param {string} text - The text to normalize.
     * @returns {string} - The normalized text.
     */
    _call(text: string): string;
}
/**
 * A callable class representing a pre-tokenizer used in tokenization. Subclasses
 * should implement the `pre_tokenize_text` method to define the specific pre-tokenization logic.
 * @extends Callable
 */
declare class PreTokenizer extends Callable {
    /**
   * Factory method that returns an instance of a subclass of `PreTokenizer` based on the provided configuration.
   *
   * @static
   * @param {Object} config - A configuration object for the pre-tokenizer.
   * @returns {PreTokenizer} An instance of a subclass of `PreTokenizer`.
   * @throws {Error} If the provided configuration object does not correspond to any known pre-tokenizer.
   */
    static fromConfig(config: any): PreTokenizer;
    /**
   * Method that should be implemented by subclasses to define the specific pre-tokenization logic.
   *
   * @abstract
   * @param {string} text - The text to pre-tokenize.
   * @returns {string[]} The pre-tokenized text.
   * @throws {Error} If the method is not implemented in the subclass.
   */
    pre_tokenize_text(text: string): string[];
    /**
     * Tokenizes the given text into pre-tokens.
     * @param {string|string[]} text - The text or array of texts to pre-tokenize.
     * @returns {string[]} An array of pre-tokens.
     */
    pre_tokenize(text: string | string[]): string[];
    /**
     * Alias for {@link PreTokenizer#pre_tokenize}.
     * @param {string|string[]} text - The text or array of texts to pre-tokenize.
     * @returns {string[]} An array of pre-tokens.
     */
    _call(text: string | string[]): string[];
}
/**
 * Abstract base class for tokenizer models.
 *
 * @extends Callable
 */
declare class TokenizerModel extends Callable {
    /**
     * Instantiates a new TokenizerModel instance based on the configuration object provided.
     * @param {object} config - The configuration object for the TokenizerModel.
     * @param {...*} args - Optional arguments to pass to the specific TokenizerModel constructor.
     * @returns {TokenizerModel} A new instance of a TokenizerModel.
     * @throws Will throw an error if the TokenizerModel type in the config is not recognized.
     */
    static fromConfig(config: object, ...args: any[]): TokenizerModel;
    /**
     * Creates a new instance of TokenizerModel.
     * @param {object} config - The configuration object for the TokenizerModel.
     */
    constructor(config: object);
    config: any;
    /**
     * Internal function to call the TokenizerModel instance.
     * @param {string[]} tokens - The tokens to encode.
     * @returns {number[]} The encoded token IDs.
     */
    _call(tokens: string[]): number[];
    /**
     * Encodes a list of tokens into a list of token IDs.
     * @param {string[]} tokens - The tokens to encode.
     * @returns {number[]} The encoded token IDs.
     * @throws Will throw an error if not implemented in a subclass.
     */
    encode(tokens: string[]): number[];
    /**
     * Converts a list of tokens into a list of token IDs.
     * @param {string[]} tokens - The tokens to convert.
     * @returns {number[]} The converted token IDs.
     */
    convert_tokens_to_ids(tokens: string[]): number[];
    /**
     * Converts a list of token IDs into a list of tokens.
     * @param {number[]} ids - The token IDs to convert.
     * @returns {string[]} The converted tokens.
     */
    convert_ids_to_tokens(ids: number[]): string[];
}
/**
 * @extends Callable
 */
declare class PostProcessor extends Callable {
    /**
     * Factory method to create a PostProcessor object from a configuration object.
     *
     * @param {Object} config - Configuration object representing a PostProcessor.
     * @returns {PostProcessor} A PostProcessor object created from the given configuration.
     * @throws {Error} If an unknown PostProcessor type is encountered.
     */
    static fromConfig(config: any): PostProcessor;
    /**
     * Method to be implemented in subclass to apply post-processing on the given tokens.
     *
     * @param {Array} tokens - The input tokens to be post-processed.
     * @param {...*} args - Additional arguments required by the post-processing logic.
     * @returns {Array} The post-processed tokens.
     * @throws {Error} If the method is not implemented in subclass.
     */
    post_process(tokens: any[], ...args: any[]): any[];
    /**
     * Alias for {@link PostProcessor#post_process}.
     * @param {Array} tokens - The text or array of texts to post-process.
     * @param {...*} args - Additional arguments required by the post-processing logic.
     * @returns {Array} An array of post-processed tokens.
     */
    _call(tokens: any[], ...args: any[]): any[];
}
/**
 * The base class for token decoders.
 * @extends Callable
 */
declare class Decoder extends Callable {
    /**
   * Creates a decoder instance based on the provided configuration.
   *
   * @param {Object} config - The configuration object.
   * @returns {Decoder} A decoder instance.
   * @throws {Error} If an unknown decoder type is provided.
   */
    static fromConfig(config: any): Decoder;
    /**
    * Creates an instance of `Decoder`.
    *
    * @param {Object} config - The configuration object.
    */
    constructor(config: any);
    config: any;
    /**
    * Converts a list of tokens to a string.
    *
    * @param {string[]} tokens - The list of tokens.
    * @returns {string} The decoded string.
    */
    convert_tokens_to_string(tokens: string[]): string;
    /**
    * Calls the `decode` method.
    *
    * @param {string[]} tokens - The list of tokens.
    * @returns {string} The decoded string.
    */
    _call(tokens: string[]): string;
    /**
    * Decodes a list of tokens.
    * @param {string[]} tokens - The list of tokens.
    * @returns {string} The decoded string.
    * @throws {Error} If the `decode` method is not implemented in the subclass.
    */
    decode(tokens: string[]): string;
}
import { Tensor } from "./tensor_utils.js";
export {};
