export class LogitsProcessor extends Callable {
    _call(input_ids: any, logits: any): void;
}
export class LogitsProcessorList extends Callable {
    processors: any[];
    push(item: any): void;
    extend(items: any): void;
    _call(input_ids: any, batchedLogits: any): void;
    [Symbol.iterator](): IterableIterator<any>;
}
export class GenerationConfig {
    constructor(kwargs?: {});
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
export class ForcedBOSTokenLogitsProcessor extends LogitsProcessor {
    constructor(bos_token_id: any);
    bos_token_id: any;
}
export class ForcedEOSTokenLogitsProcessor extends LogitsProcessor {
}
export class WhisperTimeStampLogitsProcessor extends LogitsProcessor {
    constructor(generate_config: any);
    eos_token_id: any;
    no_timestamps_token_id: any;
    timestamp_begin: any;
    begin_index: any;
    max_initial_timestamp_index: any;
    _call(input_ids: any, logits: any): any;
}
export class ForceTokensLogitsProcessor extends LogitsProcessor {
    constructor(forced_decoder_ids: any);
    force_token_map: {
        [k: string]: any;
    };
    _call(input_ids: any, logits: any): any;
}
import { Callable } from "./utils.js";
