/**
 * Helper class to determine model type from config
 */
export class AutoModel {
    static MODEL_CLASS_MAPPING: {
        bert: typeof BertModel;
        albert: typeof AlbertModel;
        distilbert: typeof DistilBertModel;
        t5: typeof T5Model;
        mt5: typeof MT5Model;
        gpt2: typeof GPT2Model;
        gpt_neo: typeof GPTNeoModel;
        codegen: typeof CodeGenModel;
        bart: typeof BartModel;
        roberta: typeof RobertaModel;
        whisper: typeof WhisperModel;
        clip: typeof CLIPModel;
        mobilebert: typeof MobileBertModel;
        squeezebert: typeof SqueezeBertModel;
        marian: typeof MarianModel;
    };
    /**
     * Instantiates a pre-trained model based on the given model path and config.
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} progressCallback - Optional. A callback function that can be used to track loading progress.
     * @returns {Promise<PreTrainedModel>} - A promise that resolves to an instance of a pre-trained model.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<PreTrainedModel>;
}
/**
 * Class representing an automatic sequence-to-sequence language model.
 */
export class AutoModelForSeq2SeqLM {
    static MODEL_CLASS_MAPPING: {
        t5: typeof T5ForConditionalGeneration;
        mt5: typeof MT5ForConditionalGeneration;
        bart: typeof BartForConditionalGeneration;
        whisper: typeof WhisperForConditionalGeneration;
        marian: typeof MarianMTModel;
    };
    /**
     * Loads a pretrained sequence-to-sequence language model from a file path.
     * @param {string} modelPath - The path to the model files.
     * @param {function} [progressCallback=null] - A callback function to track loading progress.
     * @returns {Promise<Object>} A Promise that resolves to an instance of the appropriate model class.
     * @throws {Error} If the model type is unsupported.
     * @static
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<any>;
}
/**
 * Helper class for loading sequence classification models from pretrained checkpoints
 */
export class AutoModelForSequenceClassification {
    static MODEL_CLASS_MAPPING: {
        bert: typeof BertForSequenceClassification;
        albert: typeof AlbertForSequenceClassification;
        distilbert: typeof DistilBertForSequenceClassification;
        roberta: typeof RobertaForSequenceClassification;
        bart: typeof BartForSequenceClassification;
        mobilebert: typeof MobileBertForSequenceClassification;
        squeezebert: typeof SqueezeBertForSequenceClassification;
    };
    /**
     * Load a sequence classification model from a pretrained checkpoint
     * @param {string} modelPath - The path to the model checkpoint directory
     * @param {function} [progressCallback=null] - An optional callback function to receive progress updates
     * @returns {Promise<PreTrainedModel>} A promise that resolves to a pre-trained sequence classification model
     * @throws {Error} if an unsupported model type is encountered
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<PreTrainedModel>;
}
/**
 * Helper class for loading token classification models from pretrained checkpoints
 */
export class AutoModelForTokenClassification {
    static MODEL_CLASS_MAPPING: {
        bert: typeof BertForTokenClassification;
        distilbert: typeof DistilBertForTokenClassification;
    };
    /**
     * Load a token classification model from a pretrained checkpoint
     * @param {string} modelPath - The path to the model checkpoint directory
     * @param {function} [progressCallback=null] - An optional callback function to receive progress updates
     * @returns {Promise<PreTrainedModel>} A promise that resolves to a pre-trained token classification model
     * @throws {Error} if an unsupported model type is encountered
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<PreTrainedModel>;
}
/**
 * A class for loading pre-trained models for causal language modeling tasks.
 */
export class AutoModelForCausalLM {
    static MODEL_CLASS_MAPPING: {
        gpt2: typeof GPT2LMHeadModel;
        gpt_neo: typeof GPTNeoForCausalLM;
        codegen: typeof CodeGenForCausalLM;
    };
    /**
     * Loads a pre-trained model from the given path and returns an instance of the appropriate class.
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} [progressCallback=null] - An optional callback function to track the progress of the loading process.
     * @returns {Promise<GPT2LMHeadModel|CodeGenForCausalLM|CodeGenForCausalLM>} An instance of the appropriate class for the loaded model.
     * @throws {Error} If the loaded model type is not supported.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<GPT2LMHeadModel | CodeGenForCausalLM | CodeGenForCausalLM>;
}
/**
 * A class to automatically select the appropriate model for Masked Language Modeling (MLM) tasks.
 */
export class AutoModelForMaskedLM {
    static MODEL_CLASS_MAPPING: {
        bert: typeof BertForMaskedLM;
        albert: typeof AlbertForMaskedLM;
        distilbert: typeof DistilBertForMaskedLM;
        roberta: typeof RobertaForMaskedLM;
        mobilebert: typeof MobileBertForMaskedLM;
        squeezebert: typeof SqueezeBertForMaskedLM;
    };
    /**
     * Loads a pre-trained model from a given directory and returns an instance of the appropriate model class.
     *
     * @async
     * @param {string} modelPath - The path to the pre-trained model directory.
     * @param {function} [progressCallback=null] - An optional callback function to track the loading progress.
     * @returns {Promise<PreTrainedModel>} An instance of the appropriate model class for MLM tasks.
     * @throws {Error} If an unsupported model type is encountered.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<PreTrainedModel>;
}
/**
 * Automatic model class for question answering tasks.
 */
export class AutoModelForQuestionAnswering {
    static MODEL_CLASS_MAPPING: {
        bert: typeof BertForQuestionAnswering;
        albert: typeof AlbertForQuestionAnswering;
        distilbert: typeof DistilBertForQuestionAnswering;
        roberta: typeof RobertaForQuestionAnswering;
        mobilebert: typeof MobileBertForQuestionAnswering;
        squeezebert: typeof SqueezeBertForQuestionAnswering;
    };
    /**
     * Loads and returns a question answering model from a pretrained model path.
     * @param {string} modelPath - The path to the pretrained model.
     * @param {function} [progressCallback=null] - Optional callback function to track loading progress.
     * @returns {Promise<PreTrainedModel>} - The loaded question answering model.
     * @throws Will throw an error if an unsupported model type is encountered.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<PreTrainedModel>;
}
/**
 * Class representing an autoencoder-decoder model for vision-to-sequence tasks.
 */
export class AutoModelForVision2Seq {
    static MODEL_CLASS_MAPPING: {
        'vision-encoder-decoder': typeof VisionEncoderDecoderModel;
    };
    /**
     * Loads a pretrained model from a given path.
     * @param {string} modelPath - The path to the pretrained model.
     * @param {function} progressCallback - Optional callback function to track progress of the model loading.
     * @returns {Promise<PreTrainedModel>} - A Promise that resolves to a new instance of VisionEncoderDecoderModel.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<PreTrainedModel>;
}
/**
 * AutoModelForImageClassification is a class for loading pre-trained image classification models from ONNX format.
 */
export class AutoModelForImageClassification {
    static MODEL_CLASS_MAPPING: {
        vit: typeof ViTForImageClassification;
    };
    /**
     * Loads a pre-trained image classification model from a given directory path.
     * @param {string} modelPath - The path to the directory containing the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function to monitor the loading progress.
     * @returns {Promise<PreTrainedModel>} A Promise that resolves with the model.
     * @throws {Error} If the specified model type is not supported.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<PreTrainedModel>;
}
export class AutoModelForObjectDetection {
    static MODEL_CLASS_MAPPING: {
        detr: typeof DetrForObjectDetection;
    };
    /**
     * Loads a pre-trained image classification model from a given directory path.
     * @param {string} modelPath - The path to the directory containing the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function to monitor the loading progress.
     * @returns {Promise<PreTrainedModel>} A Promise that resolves with the model.
     * @throws {Error} If the specified model type is not supported.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<PreTrainedModel>;
}
/**
 * AutoModelForImageSegmentation is a class for loading pre-trained image classification models from ONNX format.
 */
export class AutoModelForImageSegmentation {
    static MODEL_CLASS_MAPPING: {
        detr: typeof DetrForSegmentation;
    };
    /**
     * Loads a pre-trained image classification model from a given directory path.
     * @param {string} modelPath - The path to the directory containing the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function to monitor the loading progress.
     * @returns {Promise<PreTrainedModel>} A Promise that resolves with the model.
     * @throws {Error} If the specified model type is not supported.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<PreTrainedModel>;
}
declare class BertModel extends BertPreTrainedModel {
}
declare class AlbertModel extends AlbertPreTrainedModel {
}
declare class DistilBertModel extends DistilBertPreTrainedModel {
}
declare class T5Model extends T5PreTrainedModel {
    /**
     * Generates text based on the provided arguments.
     * @throws {Error} - Throws an error as the current model class (T5Model) is not compatible with `.generate()`.
     * @returns {Promise<any>}
     * @param {any[]} args
     */
    generate(...args: any[]): Promise<any>;
}
declare class MT5Model extends MT5PreTrainedModel {
    /**
     *
     * @param  {...any} args
     * @returns {Promise<any>}
     * @throws {Error}
     */
    generate(...args: any[]): Promise<any>;
}
/**
 * GPT2Model is not compatible with `.generate()`, as it doesn't have a language model head.
 * @extends GPT2PreTrainedModel
 */
declare class GPT2Model extends GPT2PreTrainedModel {
    /**
     *
     * @param  {...any} args
     * @throws {Error}
     * @returns {Promise<any>}
     */
    generate(...args: any[]): Promise<any>;
}
declare class GPTNeoModel extends GPTNeoPreTrainedModel {
    /**
     *
     * @param  {...any} args
     * @throws {Error}
     * @returns {Promise<any>}
     */
    generate(...args: any[]): Promise<any>;
}
/**
 * CodeGenModel is a class representing a code generation model without a language model head.
 *
 * @extends CodeGenPreTrainedModel
 */
declare class CodeGenModel extends CodeGenPreTrainedModel {
    /**
     * Throws an error indicating that the current model class is not compatible with `.generate()`,
     * as it doesn't have a language model head.
     *
     * @throws {Error} The current model class is not compatible with `.generate()`
     *
     * @param  {...any} args - Arguments passed to the generate function
     * @returns {Promise<any>}
     */
    generate(...args: any[]): Promise<any>;
}
/**
 * BART encoder and decoder model.
 *
 * @hideconstructor
 * @extends BartPretrainedModel
 */
declare class BartModel extends BartPretrainedModel {
    /**
     * Throws an error because the current model class (BartModel) is not compatible with `.generate()`.
     *
     * @async
     * @throws {Error} The current model class (BartModel) is not compatible with `.generate()`.
     * @returns {Promise<any>}
     */
    generate(...args: any[]): Promise<any>;
}
declare class RobertaModel extends RobertaPreTrainedModel {
}
/**
 * WhisperModel class for training Whisper models without a language model head.
 * @extends WhisperPreTrainedModel
 */
declare class WhisperModel extends WhisperPreTrainedModel {
    /**
     * Throws an error when attempting to generate output since this model doesn't have a language model head.
     * @throws Error
     * @returns {Promise<any>}
     * @param {any[]} args
     */
    generate(...args: any[]): Promise<any>;
}
declare class CLIPModel extends CLIPPreTrainedModel {
}
declare class MobileBertModel extends MobileBertPreTrainedModel {
}
declare class SqueezeBertModel extends SqueezeBertPreTrainedModel {
}
declare class MarianModel extends MarianPreTrainedModel {
    /**
     *
     * @param  {...any} args
     * @throws {Error}
     * @returns {Promise<any>}
     */
    generate(...args: any[]): Promise<any>;
}
/**
 * A base class for pre-trained models that provides the model configuration and an ONNX session.
 * @extends Callable
 */
declare class PreTrainedModel extends Callable {
    /**
     * Loads a pre-trained model from the given modelPath.
     * @static
     * @async
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} progressCallback - A function to be called with progress updates.
     * @returns {Promise<PreTrainedModel>} A new instance of the PreTrainedModel class.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<PreTrainedModel>;
    /**
     * Creates a new instance of the `PreTrainedModel` class.
     * @param {object} config - The model configuration.
     * @param {any} session - session for the model.
     */
    constructor(config: object, session: any);
    config: any;
    session: any;
    /**
    * Disposes of all the ONNX sessions that were created during inference.
    * @returns {Promise<unknown[]>} - An array of promises, one for each ONNX session that is being disposed.
    */
    dispose(): Promise<unknown[]>;
    /**
     * Converts an array or Tensor of integers to an int64 Tensor.
     * @param {Array|Tensor} items - The input integers to be converted.
     * @returns {Tensor} The int64 Tensor with the converted values.
     * @throws {Error} If the input array is empty or the input is a batched Tensor and not all sequences have the same length.
     */
    toI64Tensor(items: any[] | Tensor): Tensor;
    /**
     * Runs the model with the provided inputs
     * @param {Object} model_inputs - Object containing input tensors
     * @returns {Promise<Object>} - Object containing output tensors
     */
    _call(model_inputs: any): Promise<any>;
    /**
     * Forward method should be implemented in subclasses.
     * @abstract
     * @param {object} model_inputs - The input data to the model in the format specified in the ONNX model.
     * @returns {Promise<object>} - The output data from the model in the format specified in the ONNX model.
     * @throws {Error} - This method must be implemented in subclasses.
     */
    forward(model_inputs: object): Promise<object>;
    /**
     * @param {GenerationConfig} generation_config
     * @param {number} input_ids_seq_length
     * @returns {LogitsProcessorList}
     */
    _get_logits_processor(generation_config: GenerationConfig, input_ids_seq_length: number, logits_processor?: any): LogitsProcessorList;
    /**
   * This function merges multiple generation configs together to form a final generation config to be used by the model for text generation.
   * It first creates an empty `GenerationConfig` object, then it applies the model's own `generation_config` property to it. Finally, if a `generation_config` object was passed in the arguments, it overwrites the corresponding properties in the final config with those of the passed config object.
   *
   * @param {GenerationConfig} generation_config - A `GenerationConfig` object containing generation parameters.
   * @returns {GenerationConfig} The final generation config object to be used by the model for text generation.
   */
    _get_generation_config(generation_config: GenerationConfig): GenerationConfig;
    /**
   * Generates text based on the given inputs and generation configuration using the model.
   * @param {Array} inputs - An array of input token IDs.
   * @param {Object|null} generation_config - The generation configuration to use. If null, default configuration will be used.
   * @param {Object|null} logits_processor - An optional logits processor to use. If null, a new LogitsProcessorList instance will be created.
   * @param {Object} options - options
   * @param {Object} [options.inputs_attention_mask=null] - An optional attention mask for the inputs.
   * @returns {Promise<Array>} An array of generated output sequences, where each sequence is an array of token IDs.
   * @throws {Error} Throws an error if the inputs array is empty.
   */
    generate(inputs: any[], generation_config?: any | null, logits_processor?: any | null, { inputs_attention_mask }?: {
        inputs_attention_mask?: any;
    }): Promise<any[]>;
    /**
     * Groups an array of beam objects by their ids.
     *
     * @param {Array} beams - The array of beam objects to group.
     * @returns {Array} - An array of arrays, where each inner array contains beam objects with the same id.
     */
    groupBeams(beams: any[]): any[];
    /**
     * Returns an object containing past key values from the given decoder results object.
     *
     * @param {Object} decoderResults - The decoder results object.
     * @param {Object} pastKeyValues - The previous past key values.
     * @returns {Object} - An object containing past key values.
     */
    getPastKeyValues(decoderResults: any, pastKeyValues: any): any;
    /**
     * Adds past key values to the decoder feeds object. If pastKeyValues is null, creates new tensors for past key values.
     *
     * @param {Object} decoderFeeds - The decoder feeds object to add past key values to.
     * @param {Object} pastKeyValues - An object containing past key values.
     * @param {boolean} [hasDecoder=false] - Whether the model has a decoder.
     */
    addPastKeyValues(decoderFeeds: any, pastKeyValues: any, hasDecoder?: boolean): void;
}
/**
 * T5Model is a class representing a T5 model for conditional generation.
 * @extends T5PreTrainedModel
 */
declare class T5ForConditionalGeneration extends T5PreTrainedModel {
    /**
     * Loads the pre-trained model from a given path.
     * @async
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} progressCallback - A function to call with progress updates (optional).
     * @returns {Promise<T5ForConditionalGeneration>} The loaded model instance.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<T5ForConditionalGeneration>;
    /**
     * Creates a new instance of the `T5ForConditionalGeneration` class.
     * @param {object} config - The model configuration.
     * @param {any} session - session for the model.
     * @param {any} decoder_merged_session - session for the decoder.
     * @param {GenerationConfig} generation_config - The generation configuration.
     */
    constructor(config: object, session: any, decoder_merged_session: any, generation_config: GenerationConfig);
    decoder_merged_session: any;
    generation_config: GenerationConfig;
    num_decoder_layers: any;
    num_decoder_heads: any;
    decoder_dim_kv: any;
    num_encoder_layers: any;
    num_encoder_heads: any;
    encoder_dim_kv: any;
    /**
     * Generates the start beams for a given set of inputs and output length.
     * @param {number[][]} inputs - The input token IDs.
     * @param {number} numOutputTokens - The desired output length.
     * @returns {Array} The start beams.
     */
    getStartBeams(inputs: number[][], numOutputTokens: number, ...args: any[]): any[];
    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    runBeam(beam: any): Promise<any>;
    /**
     * Updates the given beam with a new token ID.
     * @param {any} beam - The current beam.
     * @param {number} newTokenId - The new token ID to add to the output sequence.
     */
    updateBeam(beam: any, newTokenId: number): void;
}
/**
 * A class representing a conditional sequence-to-sequence model based on the MT5 architecture.
 *
 * @extends MT5PreTrainedModel
 */
declare class MT5ForConditionalGeneration extends MT5PreTrainedModel {
    /**
     * Loads a pre-trained model from the given path.
     *
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function that is called with the download progress percentage (0-100).
     * @returns {Promise<any>} - A Promise that resolves to a new `MT5ForConditionalGeneration` instance.
     * @static
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<any>;
    /**
     * Creates a new instance of the `MT5ForConditionalGeneration` class.
     * @param {any} config - The model configuration.
     * @param {any} session - The ONNX session containing the encoder weights.
     * @param {any} decoder_merged_session - The ONNX session containing the merged decoder weights.
     * @param {GenerationConfig} generation_config - The generation configuration.
     */
    constructor(config: any, session: any, decoder_merged_session: any, generation_config: GenerationConfig);
    decoder_merged_session: any;
    generation_config: GenerationConfig;
    num_decoder_layers: any;
    num_decoder_heads: any;
    decoder_dim_kv: any;
    num_encoder_layers: any;
    num_encoder_heads: any;
    encoder_dim_kv: any;
    /**
   * Generates the start beams for the given input tokens and output sequence length.
   *
   * @param {any[]} inputs - The input sequence.
   * @param {number} numOutputTokens - The desired length of the output sequence.
   * @param {...*} args - Additional arguments to pass to the `seq2seqStartBeams` function.
   * @returns {any[]} - An array of `Beam` objects representing the start beams.
   */
    getStartBeams(inputs: any[], numOutputTokens: number, ...args: any[]): any[];
    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    runBeam(beam: any): Promise<any>;
    /**
     * Updates the given beam with the new predicted token.
     * @param {any} beam - The beam to update.
     * @param {number} newTokenId - The index of the predicted token.
    */
    updateBeam(beam: any, newTokenId: number): void;
}
/**
 * BART model with a language model head for conditional generation.
 * @extends BartPretrainedModel
 */
declare class BartForConditionalGeneration extends BartPretrainedModel {
    /**
     * Loads a BartForConditionalGeneration instance from a pretrained model stored on disk.
     * @param {string} modelPath - The path to the directory containing the pretrained model.
     * @param {function} [progressCallback=null] - An optional callback function to track the download progress.
     * @returns {Promise<BartForConditionalGeneration>} - The pretrained BartForConditionalGeneration instance.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<BartForConditionalGeneration>;
    /**
     * Creates a new instance of the `BartForConditionalGeneration` class.
     * @param {object} config - The configuration object for the Bart model.
     * @param {object} session - The ONNX session used to execute the model.
     * @param {object} decoder_merged_session - The ONNX session used to execute the decoder.
     * @param {object} generation_config - The generation configuration object.
     */
    constructor(config: object, session: object, decoder_merged_session: object, generation_config: object);
    decoder_merged_session: any;
    generation_config: any;
    num_decoder_layers: any;
    num_decoder_heads: any;
    decoder_dim_kv: number;
    num_encoder_layers: any;
    num_encoder_heads: any;
    encoder_dim_kv: number;
    /**
     * Returns the initial beam for generating output text.
     * @param {object} inputs - The input object containing the encoded input text.
     * @param {number} numOutputTokens - The maximum number of output tokens to generate.
     * @param  {...any} args - Additional arguments to pass to the sequence-to-sequence generation function.
     * @returns {any} - The initial beam for generating output text.
     */
    getStartBeams(inputs: object, numOutputTokens: number, ...args: any[]): any;
    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    runBeam(beam: any): Promise<any>;
    /**
     * Updates the beam by appending the newly generated token ID to the list of output token IDs.
     * @param {any} beam - The current beam being generated.
     * @param {number} newTokenId - The ID of the newly generated token to append to the list of output token IDs.
     */
    updateBeam(beam: any, newTokenId: number): void;
}
/**
 * WhisperForConditionalGeneration class for generating conditional outputs from Whisper models.
 * @extends WhisperPreTrainedModel
 */
declare class WhisperForConditionalGeneration extends WhisperPreTrainedModel {
    /**
     * Loads a pre-trained model from a saved model directory.
     * @param {string} modelPath - Path to the saved model directory.
     * @param {function} progressCallback - Optional function for tracking loading progress.
     * @returns {Promise<WhisperForConditionalGeneration>} Promise object represents the loaded model.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<WhisperForConditionalGeneration>;
    /**
     * Creates a new instance of the `WhisperForConditionalGeneration` class.
     * @param {Object} config - Configuration object for the model.
     * @param {Object} session - ONNX Session object for the model.
     * @param {Object} decoder_merged_session - ONNX Session object for the decoder.
     * @param {Object} generation_config - Configuration object for the generation process.
     */
    constructor(config: any, session: any, decoder_merged_session: any, generation_config: any);
    decoder_merged_session: any;
    generation_config: any;
    num_decoder_layers: any;
    num_decoder_heads: any;
    decoder_dim_kv: number;
    num_encoder_layers: any;
    num_encoder_heads: any;
    encoder_dim_kv: number;
    /**
     * Generates outputs based on input and generation configuration.
     * @param {Object} inputs - Input data for the model.
     * @param {Object} generation_config - Configuration object for the generation process.
     * @param {Object} logits_processor - Optional logits processor object.
     * @returns {Promise<Object>} Promise object represents the generated outputs.
     */
    generate(inputs: any, generation_config?: any, logits_processor?: any): Promise<any>;
    /**
     * Gets the start beams for generating outputs.
     * @param {Array} inputTokenIds - Array of input token IDs.
     * @param {number} numOutputTokens - Number of output tokens to generate.
     * @returns {Array} Array of start beams.
     */
    getStartBeams(inputTokenIds: any[], numOutputTokens: number, ...args: any[]): any[];
    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    runBeam(beam: any): Promise<any>;
    /**
     * Updates the beam by appending the newly generated token ID to the list of output token IDs.
     * @param {any} beam - The current beam being generated.
     * @param {number} newTokenId - The ID of the newly generated token to append to the list of output token IDs.
     */
    updateBeam(beam: any, newTokenId: number): void;
}
declare class MarianMTModel extends MarianPreTrainedModel {
    /**
     * @param {string} modelPath
     */
    static from_pretrained(modelPath: string, progressCallback?: any): Promise<MarianMTModel>;
    /**
     * Creates a new instance of the `MarianMTModel` class.
    * @param {object} config The model configuration object.
    * @param {object} session The ONNX session object.
    * @param {any} decoder_merged_session
    * @param {any} generation_config
    */
    constructor(config: object, session: object, decoder_merged_session: any, generation_config: any);
    decoder_merged_session: any;
    generation_config: any;
    num_decoder_layers: any;
    num_decoder_heads: any;
    decoder_dim_kv: number;
    num_encoder_layers: any;
    num_encoder_heads: any;
    encoder_dim_kv: number;
    /**
     * Initializes and returns the beam for text generation task
     * @param {any[]} inputs - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @returns {any} A Beam object representing the initialized beam.
     * @param {any[]} args
     */
    getStartBeams(inputs: any[], numOutputTokens: number, ...args: any[]): any;
    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    runBeam(beam: any): Promise<any>;
    /**
     * @param {any} beam
     * @param {any} newTokenId
     */
    updateBeam(beam: any, newTokenId: any): void;
    /**
     * @param {any} model_inputs
     * @returns {Promise<Seq2SeqLMOutput>}
     */
    forward(model_inputs: any): Promise<Seq2SeqLMOutput>;
}
/**
 * BertForSequenceClassification is a class representing a BERT model for sequence classification.
 * @extends BertPreTrainedModel
 */
declare class BertForSequenceClassification extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - An object containing the model's output logits for sequence classification.
     */
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
declare class AlbertForSequenceClassification extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
     */
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
/**
 * DistilBertForSequenceClassification is a class representing a DistilBERT model for sequence classification.
 * @extends DistilBertPreTrainedModel
 */
declare class DistilBertForSequenceClassification extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - An object containing the model's output logits for sequence classification.
     */
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
/**
 * RobertaForSequenceClassification class for performing sequence classification on Roberta models.
 * @extends RobertaPreTrainedModel
 */
declare class RobertaForSequenceClassification extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
     */
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
declare class BartForSequenceClassification extends BartPretrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - An object containing the model's output logits for sequence classification.
     */
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
/**
 * @extends MobileBertPreTrainedModel
 */
declare class MobileBertForSequenceClassification extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
     */
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
declare class SqueezeBertForSequenceClassification extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
     */
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
/**
 * BertForTokenClassification is a class representing a BERT model for token classification.
 * @extends BertPreTrainedModel
 */
declare class BertForTokenClassification extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} - An object containing the model's output logits for token classification.
     */
    _call(model_inputs: any): Promise<TokenClassifierOutput>;
}
/**
 * DistilBertForTokenClassification is a class representing a DistilBERT model for token classification.
 * @extends DistilBertPreTrainedModel
 */
declare class DistilBertForTokenClassification extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} - An object containing the model's output logits for token classification.
     */
    _call(model_inputs: any): Promise<TokenClassifierOutput>;
}
/**
 * GPT-2 language model head on top of the GPT-2 base model. This model is suitable for text generation tasks.
 * @extends GPT2PreTrainedModel
 */
declare class GPT2LMHeadModel extends GPT2PreTrainedModel {
    num_heads: any;
    num_layers: any;
    dim_kv: number;
    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask - Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds: Tensor, numOutputTokens: number, inputs_attention_mask: Tensor): any;
    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    runBeam(beam: any): Promise<any>;
    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam - The Beam object representing the beam.
     * @param {number} newTokenId - The new generated token id to be added to the beam.
     */
    updateBeam(beam: any, newTokenId: number): void;
}
declare class GPTNeoForCausalLM extends GPTNeoPreTrainedModel {
    num_heads: any;
    num_layers: any;
    dim_kv: number;
    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask - Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds: Tensor, numOutputTokens: number, inputs_attention_mask: Tensor): any;
    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    runBeam(beam: any): Promise<any>;
    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam - The Beam object representing the beam.
     * @param {number} newTokenId - The new generated token id to be added to the beam.
     */
    updateBeam(beam: any, newTokenId: number): void;
}
/**
 * CodeGenForCausalLM is a class that represents a code generation model based on the GPT-2 architecture. It extends the `CodeGenPreTrainedModel` class.
 * @extends CodeGenPreTrainedModel
 */
declare class CodeGenForCausalLM extends CodeGenPreTrainedModel {
    num_heads: any;
    num_layers: any;
    dim_kv: number;
    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask - Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds: Tensor, numOutputTokens: number, inputs_attention_mask: Tensor): any;
    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    runBeam(beam: any): Promise<any>;
    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam - The Beam object representing the beam.
     * @param {number} newTokenId - The new generated token id to be added to the beam.
     */
    updateBeam(beam: any, newTokenId: number): void;
}
/**
 * BertForMaskedLM is a class representing a BERT model for masked language modeling.
 * @extends BertPreTrainedModel
 */
declare class BertForMaskedLM extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - An object containing the model's output logits for masked language modeling.
     */
    _call(model_inputs: any): Promise<MaskedLMOutput>;
}
declare class AlbertForMaskedLM extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    _call(model_inputs: any): Promise<MaskedLMOutput>;
}
/**
 * DistilBertForMaskedLM is a class representing a DistilBERT model for masking task.
 * @extends DistilBertPreTrainedModel
 */
declare class DistilBertForMaskedLM extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    _call(model_inputs: any): Promise<MaskedLMOutput>;
}
/**
 * RobertaForMaskedLM class for performing masked language modeling on Roberta models.
 * @extends RobertaPreTrainedModel
 */
declare class RobertaForMaskedLM extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    _call(model_inputs: any): Promise<MaskedLMOutput>;
}
/**
 * MobileBertForMaskedLM is a class representing a MobileBERT model for masking task.
 * @extends MobileBertPreTrainedModel
 */
declare class MobileBertForMaskedLM extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    _call(model_inputs: any): Promise<MaskedLMOutput>;
}
declare class SqueezeBertForMaskedLM extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    _call(model_inputs: any): Promise<MaskedLMOutput>;
}
/**
 * BertForQuestionAnswering is a class representing a BERT model for question answering.
 * @extends BertPreTrainedModel
 */
declare class BertForQuestionAnswering extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - An object containing the model's output logits for question answering.
     */
    _call(model_inputs: any): Promise<QuestionAnsweringModelOutput>;
}
declare class AlbertForQuestionAnswering extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    _call(model_inputs: any): Promise<QuestionAnsweringModelOutput>;
}
/**
 * DistilBertForQuestionAnswering is a class representing a DistilBERT model for question answering.
 * @extends DistilBertPreTrainedModel
 */
declare class DistilBertForQuestionAnswering extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - An object containing the model's output logits for question answering.
     */
    _call(model_inputs: any): Promise<QuestionAnsweringModelOutput>;
}
/**
 * RobertaForQuestionAnswering class for performing question answering on Roberta models.
 * @extends RobertaPreTrainedModel
 */
declare class RobertaForQuestionAnswering extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    _call(model_inputs: any): Promise<QuestionAnsweringModelOutput>;
}
/**
 * @extends MobileBertPreTrainedModel
 */
declare class MobileBertForQuestionAnswering extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    _call(model_inputs: any): Promise<QuestionAnsweringModelOutput>;
}
declare class SqueezeBertForQuestionAnswering extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    _call(model_inputs: any): Promise<QuestionAnsweringModelOutput>;
}
/**
 * Vision Encoder-Decoder model based on OpenAI's GPT architecture for image captioning and other vision tasks
 * @extends PreTrainedModel
 */
declare class VisionEncoderDecoderModel extends PreTrainedModel {
    /**
     * Loads a VisionEncoderDecoderModel from the given path.
     *
     * @param {string} modelPath - The path to the folder containing the saved model files.
     * @param {function} [progressCallback=null] - Optional callback function to track the progress of model loading.
     * @returns {Promise<VisionEncoderDecoderModel>} A Promise that resolves with the loaded VisionEncoderDecoderModel instance.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<VisionEncoderDecoderModel>;
    /**
     * Creates a new instance of the `VisionEncoderDecoderModel` class.
     * @param {object} config - The configuration object specifying the hyperparameters and other model settings.
     * @param {object} session - The ONNX session containing the encoder model.
     * @param {any} decoder_merged_session - The ONNX session containing the merged decoder model.
     */
    constructor(config: object, session: object, decoder_merged_session: any);
    decoder_merged_session: any;
    num_layers: any;
    num_heads: any;
    dim_kv: number;
    /**
     * Generate beam search outputs for the given input pixels and number of output tokens.
     *
     * @param {array} inputs - The input pixels as a Tensor.
     * @param {number} numOutputTokens - The number of output tokens to generate.
     * @param {...*} args - Optional additional arguments to pass to seq2seqStartBeams.
     * @returns {any} An array of Beam objects representing the top-K output sequences.
     */
    getStartBeams(inputs: any[], numOutputTokens: number, ...args: any[]): any;
    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    runBeam(beam: any): Promise<any>;
    /**
     * Update the given beam with the additional predicted token ID.
     *
     * @param {any} beam - The current beam.
     * @param {number} newTokenId - The new predicted token ID to add to the beam's output sequence.
     */
    updateBeam(beam: any, newTokenId: number): void;
}
declare class ViTForImageClassification extends ViTPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
declare class DetrForObjectDetection extends DetrPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    _call(model_inputs: any): Promise<DetrObjectDetectionOutput>;
}
declare class DetrForSegmentation extends DetrPreTrainedModel {
    /**
     * Runs the model with the provided inputs
     * @param {Object} model_inputs - Model inputs
     * @returns {Promise<DetrSegmentationOutput>} - Object containing segmentation outputs
     */
    _call(model_inputs: any): Promise<DetrSegmentationOutput>;
}
declare class BertPreTrainedModel extends PreTrainedModel {
}
declare class AlbertPreTrainedModel extends PreTrainedModel {
}
declare class DistilBertPreTrainedModel extends PreTrainedModel {
}
declare class T5PreTrainedModel extends PreTrainedModel {
}
declare class MT5PreTrainedModel extends PreTrainedModel {
}
declare class GPT2PreTrainedModel extends PreTrainedModel {
}
declare class GPTNeoPreTrainedModel extends PreTrainedModel {
}
declare class CodeGenPreTrainedModel extends PreTrainedModel {
}
declare class BartPretrainedModel extends PreTrainedModel {
}
declare class RobertaPreTrainedModel extends PreTrainedModel {
}
declare class WhisperPreTrainedModel extends PreTrainedModel {
}
declare class CLIPPreTrainedModel extends PreTrainedModel {
}
declare class MobileBertPreTrainedModel extends PreTrainedModel {
}
declare class SqueezeBertPreTrainedModel extends PreTrainedModel {
}
declare class MarianPreTrainedModel extends PreTrainedModel {
}
import { Callable } from "./utils.js";
import { Tensor } from "./tensor_utils";
import { GenerationConfig } from "./generation.js";
import { LogitsProcessorList } from "./generation.js";
declare class Seq2SeqLMOutput extends ModelOutput {
    /**
     * @param {Tensor} logits - The output logits of the model.
     * @param {Array} past_key_values - An array of key/value pairs that represent the previous state of the model.
     * @param {Tensor} encoder_outputs - The output of the encoder in a sequence-to-sequence model.
     */
    constructor(logits: Tensor, past_key_values: any[], encoder_outputs: Tensor);
    logits: Tensor;
    past_key_values: any[];
    encoder_outputs: Tensor;
}
declare class SequenceClassifierOutput extends ModelOutput {
    /**
     * @param {Tensor} logits
     */
    constructor(logits: Tensor);
    logits: Tensor;
}
declare class TokenClassifierOutput extends ModelOutput {
    /**
     * @param {Tensor} logits
     */
    constructor(logits: Tensor);
    logits: Tensor;
}
declare class MaskedLMOutput extends ModelOutput {
    /**
     * @param {Tensor} logits
     */
    constructor(logits: Tensor);
    logits: Tensor;
}
declare class QuestionAnsweringModelOutput extends ModelOutput {
    /**
     * @param {Float32Array} start_logits - The logits for start positions of the answer.
     * @param {Float32Array} end_logits - The logits for end positions of the answer.
     */
    constructor(start_logits: Float32Array, end_logits: Float32Array);
    start_logits: Float32Array;
    end_logits: Float32Array;
}
declare class ViTPreTrainedModel extends PreTrainedModel {
}
declare class DetrPreTrainedModel extends PreTrainedModel {
}
declare class DetrObjectDetectionOutput extends ModelOutput {
    /**
     * @param {any} logits
     * @param {any} pred_boxes
     */
    constructor(logits: any, pred_boxes: any);
    logits: any;
    pred_boxes: any;
}
declare class DetrSegmentationOutput extends ModelOutput {
    /**
     * @param {Tensor} logits - The output logits of the model.
     * @param {Tensor} pred_boxes - Predicted boxes.
     * @param {Tensor} pred_masks - Predicted masks.
     */
    constructor(logits: Tensor, pred_boxes: Tensor, pred_masks: Tensor);
    logits: Tensor;
    pred_boxes: Tensor;
    pred_masks: Tensor;
}
declare class ModelOutput {
}
export {};
