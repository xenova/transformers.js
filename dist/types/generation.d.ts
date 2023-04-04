/**
 * Base class for processing logits.
 * @extends Callable
 */
export class LogitsProcessor extends Callable {
    /**
     * Apply the processor to the input logits.
     *
     * @abstract
     * @param {Array} input_ids The input ids.
     * @param {Tensor} logits The logits to process.
     * @throws {Error} Throws an error if `_call` is not implemented in the subclass.
     */
    _call(input_ids: any[], logits: Tensor): void;
}
/**
 * A class representing a list of logits processors. A logits processor is a function that modifies the logits
 * output of a language model. This class provides methods for adding new processors and applying all processors to a
 * batch of logits.
 *
 * @extends Callable
 */
export class LogitsProcessorList extends Callable {
    processors: any[];
    /**
     * Adds a new logits processor to the list.
     *
     * @param {function} item - The logits processor function to add.
     */
    push(item: Function): void;
    /**
     * Adds multiple logits processors to the list.
     *
     * @param {function[]} items - The logits processor functions to add.
     */
    extend(items: Function[]): void;
    /**
     * Applies all logits processors in the list to a batch of logits, modifying them in-place.
     *
     * @param {number[]} input_ids - The input IDs for the language model.
     * @param {number[][]} batchedLogits - A 2D array of logits, where each row corresponds to a single
     *                                                input sequence in the batch.
     */
    _call(input_ids: number[], batchedLogits: number[][]): void;
    [Symbol.iterator](): IterableIterator<any>;
}
export class GenerationConfig {
    constructor(kwargs?: {});
    /**
     * Create a GenerationConfig object
     * @constructor
     * @param {Object} [kwargs={}] - The configuration parameters
     * @param {number} [kwargs.max_length=20] - The maximum length of the generated text
     * @param {number} [kwargs.max_new_tokens=null] - The maximum number of new tokens to generate
     * @param {number} [kwargs.min_length=0] - The minimum length of the generated text
     * @param {number} [kwargs.min_new_tokens=null] - The minimum number of new tokens to generate
     * @param {boolean} [kwargs.early_stopping=false] - Whether to stop generation early if a stop token is encountered
     * @param {number} [kwargs.max_time=null] - The maximum amount of time to spend generating text
     * @param {boolean} [kwargs.do_sample=false] - Whether to use sampling when generating text
     * @param {number} [kwargs.num_beams=1] - The number of beams to use when generating text
     * @param {number} [kwargs.num_beam_groups=1] - The number of beam groups to use when generating text
     * @param {number} [kwargs.penalty_alpha=null] - The value of the alpha penalty to use when generating text
     * @param {boolean} [kwargs.use_cache=true] - Whether to use cache when generating text
     * @param {number} [kwargs.temperature=1.0] - The temperature to use when generating text
     * @param {number} [kwargs.top_k=50] - The value of k to use when generating text
     * @param {number} [kwargs.top_p=1.0] - The value of p to use when generating text
     * @param {number} [kwargs.typical_p=1.0] - The typical value of p to use when generating text
     * @param {number} [kwargs.epsilon_cutoff=0.0] - The value of epsilon cutoff to use when generating text
     * @param {number} [kwargs.eta_cutoff=0.0] - The value of eta cutoff to use when generating text
     * @param {number} [kwargs.diversity_penalty=0.0] - The value of diversity penalty to use when generating text
     * @param {number} [kwargs.repetition_penalty=1.0] - The value of repetition penalty to use when generating text
     * @param {number} [kwargs.encoder_repetition_penalty=1.0] - The value of encoder repetition penalty to use when generating text
     * @param {number} [kwargs.length_penalty=1.0] - The value of length
     * @param {number} [kwargs.no_repeat_ngram_size=0] - The size of the n-grams to avoid repeating in the generated output.
     * @param {?number[]} [kwargs.bad_words_ids=null] - An array of IDs representing tokens that should not be generated.
     * @param {?number[]} [kwargs.force_words_ids=null] - An array of IDs representing tokens that must be generated.
     * @param {boolean} [kwargs.renormalize_logits=false] - Whether or not to renormalize the logits before generating new tokens.
     * @param {?Object[]} [kwargs.constraints=null] - An array of constraint objects to apply during generation.
     */
    max_length: any;
    max_new_tokens: any;
    min_length: any;
    min_new_tokens: any;
    early_stopping: any;
    max_time: any;
    do_sample: any;
    num_beams: any;
    num_beam_groups: any;
    penalty_alpha: any;
    use_cache: any;
    temperature: any;
    top_k: any;
    top_p: any;
    typical_p: any;
    epsilon_cutoff: any;
    eta_cutoff: any;
    diversity_penalty: any;
    repetition_penalty: any;
    encoder_repetition_penalty: any;
    length_penalty: any;
    no_repeat_ngram_size: any;
    bad_words_ids: any;
    force_words_ids: any;
    renormalize_logits: any;
    constraints: any;
    forced_bos_token_id: any;
    forced_eos_token_id: any;
    remove_invalid_values: any;
    exponential_decay_length_penalty: any;
    suppress_tokens: any;
    begin_suppress_tokens: any;
    forced_decoder_ids: any;
    num_return_sequences: any;
    output_attentions: any;
    output_hidden_states: any;
    output_scores: any;
    return_dict_in_generate: any;
    pad_token_id: any;
    bos_token_id: any;
    eos_token_id: any;
    encoder_no_repeat_ngram_size: any;
    decoder_start_token_id: any;
    generation_kwargs: any;
}
/**
 * A LogitsProcessor that forces a BOS token at the beginning of the generated sequence.
 * @extends LogitsProcessor
 */
export class ForcedBOSTokenLogitsProcessor extends LogitsProcessor {
    /**
     * Create a ForcedBOSTokenLogitsProcessor.
     * @param {number} bos_token_id - The ID of the beginning-of-sequence token to be forced.
     */
    constructor(bos_token_id: number);
    bos_token_id: number;
    /**
     * Apply the BOS token forcing to the logits.
     * @param {Array} input_ids - The input IDs.
     * @param {Object} logits - The logits.
     * @returns {Object} The logits with BOS token forcing.
     */
    _call(input_ids: any[], logits: any): any;
}
/**
 * A logits processor that forces end-of-sequence token probability to 1.
 *
 * @extends LogitsProcessor
 */
export class ForcedEOSTokenLogitsProcessor extends LogitsProcessor {
    /**
     * Create a ForcedEOSTokenLogitsProcessor.
     * @param {number} max_length - Max length of the sequence.
     * @param {number} forced_eos_token_id - The ID of the end-of-sequence token to be forced.
     */
    constructor(max_length: number, forced_eos_token_id: number);
    max_length: number;
    forced_eos_token_id: number;
    /**
     * Apply the processor to input_ids and logits.
     *
     * @param {number[]} input_ids - The input ids.
     * @param {any} logits - The logits tensor.
     */
    _call(input_ids: number[], logits: any): void;
}
/**
 * A LogitsProcessor that handles adding timestamps to generated text.
 * @extends LogitsProcessor
 */
export class WhisperTimeStampLogitsProcessor extends LogitsProcessor {
    /**
     * Constructs a new WhisperTimeStampLogitsProcessor.
     * @param {object} generate_config - The config object passed to the `generate()` method of a transformer model.
     * @param {number} generate_config.eos_token_id - The ID of the end-of-sequence token.
     * @param {number} generate_config.no_timestamps_token_id - The ID of the token used to indicate that a token should not have a timestamp.
     * @param {number[][]} [generate_config.forced_decoder_ids] - An array of two-element arrays representing decoder IDs that are forced to appear in the output. The second element of each array indicates whether the token is a timestamp.
     * @param {number} [generate_config.max_initial_timestamp_index] - The maximum index at which an initial timestamp can appear.
     */
    constructor(generate_config: {
        eos_token_id: number;
        no_timestamps_token_id: number;
        forced_decoder_ids?: number[][];
        max_initial_timestamp_index?: number;
    });
    eos_token_id: number;
    no_timestamps_token_id: number;
    timestamp_begin: number;
    begin_index: number;
    max_initial_timestamp_index: number;
    /**
     * Modify the logits to handle timestamp tokens.
     * @param {Array} input_ids - The input sequence of tokens.
     * @param {Tensor} logits - The logits output by the model.
     * @returns {Tensor} - The modified logits.
     */
    _call(input_ids: any[], logits: Tensor): Tensor;
}
/**
 * A logits processor that forces a specific token to be generated by the decoder.
 *
 * @extends LogitsProcessor
 */
export class ForceTokensLogitsProcessor extends LogitsProcessor {
    /**
     * Constructs a new instance of `ForceTokensLogitsProcessor`.
     *
     * @param {Array} forced_decoder_ids The ids of tokens that should be forced.
     */
    constructor(forced_decoder_ids: any[]);
    force_token_map: {
        [k: string]: any;
    };
    /**
     * Apply the processor to the input logits.
     *
     * @param {Array} input_ids The input ids.
     * @param {any} logits The logits to process.
     * @returns {Array} The processed logits.
     */
    _call(input_ids: any[], logits: any): any[];
}
/**
 * A logits processor that disallows ngrams of a certain size to be repeated.
 *
 * @extends LogitsProcessor
 */
export class NoRepeatNGramLogitsProcessor extends LogitsProcessor {
    /**
     * Create a NoRepeatNGramLogitsProcessor.
     * @param {number} no_repeat_ngram_size - The no-repeat-ngram size. All ngrams of this size can only occur once.
     */
    constructor(no_repeat_ngram_size: number);
    no_repeat_ngram_size: number;
    /**
     * Generate n-grams from a sequence of token ids.
     * @param {number[]} prevInputIds - List of previous input ids
     * @returns {Map<string, number[]>} - Map of generated n-grams
     */
    getNgrams(prevInputIds: number[]): Map<string, number[]>;
    /**
     * Generate n-grams from a sequence of token ids.
     * @param {Map<string, number[]>} bannedNgrams - Map of banned n-grams
     * @param {number[]} prevInputIds - List of previous input ids
     * @returns {number[]} - Map of generated n-grams
     */
    getGeneratedNgrams(bannedNgrams: Map<string, number[]>, prevInputIds: number[]): number[];
    /**
     * Calculate banned n-gram tokens
     * @param {number[]} prevInputIds - List of previous input ids
     * @returns {number[]} - Map of generated n-grams
     */
    calcBannedNgramTokens(prevInputIds: number[]): number[];
    /**
     * Apply the no-repeat-ngram processor to the logits.
     * @param {Array} input_ids - The input IDs.
     * @param {Object} logits - The logits.
     * @returns {Object} The logits with no-repeat-ngram processing.
     */
    _call(input_ids: any[], logits: any): any;
}
/**
 * A logits processor that penalises repeated output tokens.
 *
 * @extends LogitsProcessor
 */
export class RepetitionPenaltyLogitsProcessor extends LogitsProcessor {
    /**
     * Create a RepetitionPenaltyLogitsProcessor.
     * @param {number} penalty - The penalty to apply for repeated tokens.
     */
    constructor(penalty: number);
    penalty: number;
    /**
     * Apply the repetition penalty to the logits.
     * @param {Array} input_ids - The input IDs.
     * @param {Object} logits - The logits.
     * @returns {Object} The logits with repetition penalty processing.
     */
    _call(input_ids: any[], logits: any): any;
}
import { Callable } from "./utils.js";
import { Tensor } from "./tensor_utils.js";
