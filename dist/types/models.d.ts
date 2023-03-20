export class AutoModel {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<PreTrainedModel | T5Model | BartModel | WhisperModel | GPT2Model | CodeGenModel>;
}
export class AutoModelForSeq2SeqLM {
    static modelClassMapping: {
        t5: typeof T5ForConditionalGeneration;
        bart: typeof BartForConditionalGeneration;
        whisper: typeof WhisperForConditionalGeneration;
    };
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<any>;
}
export class AutoModelForSequenceClassification {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<BertForSequenceClassification | DistilBertForSequenceClassification | AlbertForSequenceClassification | RobertaForSequenceClassification>;
}
export class AutoModelForCausalLM {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<GPT2LMHeadModel | CodeGenForCausalLM>;
}
export class AutoModelForMaskedLM {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<PreTrainedModel>;
}
export class AutoModelForQuestionAnswering {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<BertForQuestionAnswering | DistilBertForQuestionAnswering | AlbertForQuestionAnswering | RobertaForQuestionAnswering>;
}
export class AutoModelForVision2Seq {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<VisionEncoderDecoderModel>;
}
export class AutoModelForImageClassification {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<ViTForImageClassification>;
}
export class T5ForConditionalGeneration extends T5PreTrainedModel {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<T5ForConditionalGeneration>;
    constructor(config: any, session: any, decoder_merged_session: any, generation_config: any);
    decoder_merged_session: any;
    generation_config: any;
    num_decoder_layers: any;
    num_decoder_heads: any;
    decoder_dim_kv: any;
    num_encoder_layers: any;
    num_encoder_heads: any;
    encoder_dim_kv: any;
    getStartBeams(inputs: any, numOutputTokens: any, ...args: any[]): {
        inputs: any;
        encoder_outputs: any;
        past_key_values: any;
        output_token_ids: any[];
        done: boolean;
        score: number;
        id: number;
    }[];
    runBeam(beam: any): Promise<any>;
    updateBeam(beam: any, newTokenId: any): void;
    forward(model_inputs: any): Promise<Seq2SeqLMOutput>;
}
declare class PreTrainedModel extends Callable {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<PreTrainedModel>;
    constructor(config: any, session: any);
    config: any;
    session: any;
    dispose(): Promise<any[]>;
    toI64Tensor(items: any): Tensor;
    _call(model_inputs: any): Promise<any>;
    forward(model_inputs: any): Promise<void>;
    /**
     * @param {GenerationConfig} generation_config
     * @param {number} input_ids_seq_length
     * @returns {LogitsProcessorList}
     */
    _get_logits_processor(generation_config: GenerationConfig, input_ids_seq_length: number, logits_processor?: any): LogitsProcessorList;
    _get_generation_config(generation_config: any): GenerationConfig;
    generate(inputs: any, generation_config?: any, logits_processor?: any, { inputs_attention_mask }?: {
        inputs_attention_mask?: any;
    }): Promise<any[]>;
    groupBeams(beams: any): any[];
    getPastKeyValues(decoderResults: any): {};
    addPastKeyValues(decoderFeeds: any, pastKeyValues: any, hasDecoder?: boolean): void;
}
declare class T5Model extends T5PreTrainedModel {
    generate(...args: any[]): Promise<void>;
}
declare class BartModel extends BartPretrainedModel {
    generate(...args: any[]): Promise<void>;
}
declare class WhisperModel extends WhisperPreTrainedModel {
    generate(...args: any[]): Promise<void>;
}
declare class GPT2Model extends GPT2PreTrainedModel {
    generate(...args: any[]): Promise<void>;
}
declare class CodeGenModel extends CodeGenPreTrainedModel {
    generate(...args: any[]): Promise<void>;
}
declare class BartForConditionalGeneration extends BartPretrainedModel {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<BartForConditionalGeneration>;
    constructor(config: any, session: any, decoder_merged_session: any, generation_config: any);
    decoder_merged_session: any;
    generation_config: any;
    num_decoder_layers: any;
    num_decoder_heads: any;
    decoder_dim_kv: number;
    num_encoder_layers: any;
    num_encoder_heads: any;
    encoder_dim_kv: number;
    getStartBeams(inputs: any, numOutputTokens: any, ...args: any[]): {
        inputs: any;
        encoder_outputs: any;
        past_key_values: any;
        output_token_ids: any[];
        done: boolean;
        score: number;
        id: number;
    }[];
    runBeam(beam: any): Promise<any>;
    updateBeam(beam: any, newTokenId: any): void;
    forward(model_inputs: any): Promise<Seq2SeqLMOutput>;
}
declare class WhisperForConditionalGeneration extends WhisperPreTrainedModel {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<WhisperForConditionalGeneration>;
    constructor(config: any, session: any, decoder_merged_session: any, generation_config: any);
    decoder_merged_session: any;
    generation_config: any;
    num_decoder_layers: any;
    num_decoder_heads: any;
    decoder_dim_kv: number;
    num_encoder_layers: any;
    num_encoder_heads: any;
    encoder_dim_kv: number;
    generate(inputs: any, generation_config?: any, logits_processor?: any): Promise<any[]>;
    getStartBeams(inputTokenIds: any, numOutputTokens: any, ...args: any[]): {
        inputs: any;
        encoder_outputs: any;
        past_key_values: any;
        output_token_ids: any[];
        done: boolean;
        score: number;
        id: number;
    }[];
    runBeam(beam: any): Promise<any>;
    updateBeam(beam: any, newTokenId: any): void;
    forward(model_inputs: any): Promise<Seq2SeqLMOutput>;
}
declare class BertForSequenceClassification extends BertPreTrainedModel {
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
declare class DistilBertForSequenceClassification extends DistilBertPreTrainedModel {
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
declare class AlbertForSequenceClassification extends AlbertPreTrainedModel {
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
declare class RobertaForSequenceClassification extends RobertaPreTrainedModel {
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
declare class GPT2LMHeadModel extends GPT2PreTrainedModel {
    num_heads: any;
    num_layers: any;
    dim_kv: number;
    getStartBeams(inputTokenIds: any, numOutputTokens: any, inputs_attention_mask: any): {
        input: any;
        model_input_ids: any;
        attention_mask: any;
        past_key_values: any;
        output_token_ids: any[];
        num_output_tokens: any;
        done: boolean;
        score: number;
        id: number;
    }[];
    runBeam(beam: any): Promise<any>;
    updateBeam(beam: any, newTokenId: any): void;
    forward(model_inputs: any): Promise<{
        logits: any;
        past_key_values: any;
    }>;
}
declare class CodeGenForCausalLM extends CodeGenPreTrainedModel {
    num_heads: any;
    num_layers: any;
    dim_kv: number;
    getStartBeams(inputTokenIds: any, numOutputTokens: any, inputs_attention_mask: any): {
        input: any;
        model_input_ids: any;
        attention_mask: any;
        past_key_values: any;
        output_token_ids: any[];
        num_output_tokens: any;
        done: boolean;
        score: number;
        id: number;
    }[];
    runBeam(beam: any): Promise<any>;
    updateBeam(beam: any, newTokenId: any): void;
    forward(model_inputs: any): Promise<{
        logits: any;
        past_key_values: any;
    }>;
}
declare class BertForQuestionAnswering extends BertPreTrainedModel {
    _call(model_inputs: any): Promise<QuestionAnsweringModelOutput>;
}
declare class DistilBertForQuestionAnswering extends DistilBertPreTrainedModel {
    _call(model_inputs: any): Promise<QuestionAnsweringModelOutput>;
}
declare class AlbertForQuestionAnswering extends AlbertPreTrainedModel {
    _call(model_inputs: any): Promise<QuestionAnsweringModelOutput>;
}
declare class RobertaForQuestionAnswering extends RobertaPreTrainedModel {
    _call(model_inputs: any): Promise<QuestionAnsweringModelOutput>;
}
declare class VisionEncoderDecoderModel extends PreTrainedModel {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<VisionEncoderDecoderModel>;
    constructor(config: any, session: any, decoder_merged_session: any);
    decoder_merged_session: any;
    num_layers: any;
    num_heads: any;
    dim_kv: number;
    getStartBeams(inputs: any, numOutputTokens: any, ...args: any[]): {
        inputs: any;
        encoder_outputs: any;
        past_key_values: any;
        output_token_ids: any[];
        done: boolean;
        score: number;
        id: number;
    }[];
    runBeam(beam: any): Promise<any>;
    updateBeam(beam: any, newTokenId: any): void;
    forward(model_inputs: any): Promise<Seq2SeqLMOutput>;
}
declare class ViTForImageClassification extends PreTrainedModel {
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
declare class T5PreTrainedModel extends PreTrainedModel {
}
declare class Seq2SeqLMOutput {
    constructor(logits: any, past_key_values: any, encoder_outputs: any);
    logits: any;
    past_key_values: any;
    encoder_outputs: any;
}
import { Callable } from "./utils.js";
import { Tensor } from "./tensor_utils.js";
import { GenerationConfig } from "./generation.js";
import { LogitsProcessorList } from "./generation.js";
declare class BartPretrainedModel extends PreTrainedModel {
}
declare class WhisperPreTrainedModel extends PreTrainedModel {
}
declare class GPT2PreTrainedModel extends PreTrainedModel {
}
declare class CodeGenPreTrainedModel extends PreTrainedModel {
}
declare class BertPreTrainedModel extends PreTrainedModel {
}
declare class SequenceClassifierOutput {
    constructor(logits: any);
    logits: any;
}
declare class DistilBertPreTrainedModel extends PreTrainedModel {
}
declare class AlbertPreTrainedModel extends PreTrainedModel {
}
declare class RobertaPreTrainedModel extends PreTrainedModel {
}
declare class QuestionAnsweringModelOutput {
    constructor(start_logits: any, end_logits: any);
    start_logits: any;
    end_logits: any;
}
export {};
