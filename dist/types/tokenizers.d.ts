/**
 * Helper class to determine tokenizer type from tokenizer.json
 */
export class AutoTokenizer {
    /**
     * Creates an instance of the appropriate tokenizer based on the tokenizer class specified in the tokenizer config.
     * @param {string} modelPath - The path to the tokenizer files.
     * @param {function} [progressCallback=null] - A callback function to track download progress.
     * @returns {Promise} A promise that resolves to an instance of the appropriate tokenizer.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<any>;
}
/**
 * BertTokenizer is a class used to tokenize text for BERT models.
 * @extends PreTrainedTokenizer
 */
export class BertTokenizer extends PreTrainedTokenizer {
}
export class DistilBertTokenizer extends PreTrainedTokenizer {
}
export class T5Tokenizer extends PreTrainedTokenizer {
}
export class GPT2Tokenizer extends PreTrainedTokenizer {
}
/**
 * A callable class that wraps a HuggingFace tokenizer.
 * @extends Callable
 */
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
     * @param {any} inputs
     * @return {any}
     */
    prepare_model_inputs(inputs: any): any;
    _call(text: any, { text_pair, padding, truncation, max_length, return_tensor, }?: {
        text_pair?: any;
        padding?: boolean;
        truncation?: any;
        max_length?: any;
        return_tensor?: boolean;
    }): {
        input_ids: number[][] | Tensor;
        attention_mask: any[];
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
     * @param {Array<Array<number>>} batch - List of tokenized input sequences.
     * @param {Object} decode_args - (Optional) Object with decoding arguments.
     * @returns {Array<string>} List of decoded sequences.
     */
    batch_decode(batch: Array<Array<number>>, decode_args?: any): Array<string>;
    /**
     * Decodes a sequence of token IDs back to a string.
     *
     * @param {Array<number>} token_ids - List of token IDs to decode.
     * @param {Object} [decode_args={}]
     * @param {boolean} [decode_args.skip_special_tokens=false] - If true, special tokens are removed from the output string.
     * @param {boolean} [decode_args.clean_up_tokenization_spaces=true] - If true, spaces before punctuations and abbreviated forms are removed.
     *
     * @returns {string} The decoded string.
     * @throws {Error} If `token_ids` is not a non-empty array of integers.
     */
    decode(token_ids: Array<number>, decode_args?: {
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
     * Alias for normalize method. Allows normalization to be called as a function.
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
   * @returns {Array<string>} The pre-tokenized text.
   * @throws {Error} If the method is not implemented in the subclass.
   */
    pre_tokenize_text(text: string): Array<string>;
    /**
     * Tokenizes the given text into pre-tokens.
     * @param {string|Array<string>} text - The text or array of texts to pre-tokenize.
     * @returns {Array<string>} An array of pre-tokens.
     */
    pre_tokenize(text: string | Array<string>): Array<string>;
    /**
     * Alias for {@link PreTokenizer#pre_tokenize}.
     * @param {string|Array<string>} text - The text or array of texts to pre-tokenize.
     * @returns {Array<string>} An array of pre-tokens.
     */
    _call(text: string | Array<string>): Array<string>;
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
    _call(tokens: any, ...args: any[]): any[];
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
