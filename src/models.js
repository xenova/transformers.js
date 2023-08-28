
/**
 * @file Definitions of all models available in Transformers.js.
 * 
 * **Example:** Load and run an `AutoModel`.
 * 
 * ```javascript
 * import { AutoModel, AutoTokenizer } from '@xenova/transformers';
 *
 * let tokenizer = await AutoTokenizer.from_pretrained('Xenova/bert-base-uncased');
 * let model = await AutoModel.from_pretrained('Xenova/bert-base-uncased');
 *
 * let inputs = await tokenizer('I love transformers!');
 * let { logits } = await model(inputs);
 * // Tensor {
 * //     data: Float32Array(183132) [-7.117443084716797, -7.107812881469727, -7.092104911804199, ...]
 * //     dims: (3) [1, 6, 30522],
 * //     type: "float32",
 * //     size: 183132,
 * // }
 * ```
 * 
 * We also provide other `AutoModel`s (listed below), which you can use in the same way as the Python library. For example:
 * 
 * **Example:** Load and run a `AutoModelForSeq2SeqLM`.
 * ```javascript
 * import { AutoModelForSeq2SeqLM, AutoTokenizer } from '@xenova/transformers';
 * 
 * let tokenizer = await AutoTokenizer.from_pretrained('Xenova/t5-small');
 * let model = await AutoModelForSeq2SeqLM.from_pretrained('Xenova/t5-small');
 *
 * let { input_ids } = await tokenizer('translate English to German: I love transformers!');
 * let outputs = await model.generate(input_ids);
 * let decoded = tokenizer.decode(outputs[0], { skip_special_tokens: true });
 * // 'Ich liebe Transformatoren!'
 * ```
 * 
 * @module models
 */

import {
    AutoConfig,
} from './configs.js';

import {
    Callable,
    isIntegralNumber,
    isTypedArray,
    mergeArrays,
} from './utils/core.js';

import {
    getModelFile,
    getModelJSON,
} from './utils/hub.js';

import {
    LogitsProcessorList,
    GenerationConfig,
    ForceTokensLogitsProcessor,
    ForcedBOSTokenLogitsProcessor,
    ForcedEOSTokenLogitsProcessor,
    SuppressTokensAtBeginLogitsProcessor,
    WhisperTimeStampLogitsProcessor,
    NoRepeatNGramLogitsProcessor,
    RepetitionPenaltyLogitsProcessor,

    Sampler,
} from './utils/generation.js';

import {
    cat,
    dynamicTimeWarping,
    mean,
    stack,
    std_mean,
    Tensor,
} from './utils/tensor.js';

import { executionProviders, ONNX } from './backends/onnx.js';
import { medianFilter, round } from './transformers.js';
const { InferenceSession, Tensor: ONNXTensor } = ONNX;

/**
 * @typedef {import('./utils/hub.js').PretrainedOptions} PretrainedOptions
 */


//////////////////////////////////////////////////
// Model types: used internally
class ModelType { };

// Either encoder-only or encoder-decoder (and will be decided by `model.config.is_encoder_decoder`)
class EncoderOnlyModelType extends ModelType { };
class EncoderDecoderModelType extends ModelType { };
class Seq2SeqModelType extends EncoderDecoderModelType { };
class DecoderOnlyModelType extends ModelType { };
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// Helper functions

// Will be populated fully later
const MODEL_TYPE_MAPPING = new Map([
    ['CLIPTextModelWithProjection', EncoderOnlyModelType],
    ['CLIPVisionModelWithProjection', EncoderOnlyModelType],
]);

/**
 * Helper function to determine which `forward` method to run for a specific model.
 * @param {Object} self The calling object
 * @param {Object} model_inputs The inputs to be sent to the model
 * @returns {Promise<Object>} The model output
 */
async function forward(self, model_inputs) {
    if (MODEL_TYPE_MAPPING.get(self.constructor.name) === DecoderOnlyModelType) {
        return await decoderForward(self, model_inputs);
    } else {
        return await encoderForward(self, model_inputs);
    }
}

/**
 * Constructs an InferenceSession using a model file located at the specified path.
 * @param {string} pretrained_model_name_or_path The path to the directory containing the model file.
 * @param {string} fileName The name of the model file.
 * @param {PretrainedOptions} options Additional options for loading the model.
 * @returns {Promise<InferenceSession>} A Promise that resolves to an InferenceSession object.
 * @private
 */
async function constructSession(pretrained_model_name_or_path, fileName, options) {
    // TODO add option for user to force specify their desired execution provider
    let modelFileName = `onnx/${fileName}${options.quantized ? '_quantized' : ''}.onnx`;
    let buffer = await getModelFile(pretrained_model_name_or_path, modelFileName, true, options);

    try {
        return await InferenceSession.create(buffer, {
            executionProviders,
        });
    } catch (err) {
        // If the execution provided was only wasm, throw the error
        if (executionProviders.length === 1 && executionProviders[0] === 'wasm') {
            throw err;
        }

        console.warn(err);
        console.warn(
            'Something went wrong during model construction (most likely a missing operation). ' +
            'Using `wasm` as a fallback. '
        )
        return await InferenceSession.create(buffer, {
            executionProviders: ['wasm']
        });
    }
}

/**
 * Validate model inputs
 * @param {InferenceSession} session The InferenceSession object that will be run.
 * @param {Object} inputs The inputs to check.
 * @returns {Promise<Object>} A Promise that resolves to the checked inputs.
 * @throws {Error} If any inputs are missing.
 * @private
 */
async function validateInputs(session, inputs) {
    // NOTE: Only create a shallow copy
    const checkedInputs = {};
    const missingInputs = [];
    for (let inputName of session.inputNames) {
        if (inputs[inputName] === undefined) {
            missingInputs.push(inputName);
        } else {
            checkedInputs[inputName] = inputs[inputName];
        }
    }
    if (missingInputs.length > 0) {
        throw new Error(
            `An error occurred during model execution: "Missing the following inputs: ${missingInputs.join(', ')}.`);
    }

    const numInputsProvided = Object.keys(inputs).length;
    const numInputsNeeded = session.inputNames.length;
    if (numInputsProvided > numInputsNeeded) {
        // No missing inputs, but too many inputs were provided.
        // Warn the user and ignore the extra inputs.
        let ignored = Object.keys(inputs).filter(inputName => !session.inputNames.includes(inputName));
        console.warn(`WARNING: Too many inputs were provided (${numInputsProvided} > ${numInputsNeeded}). The following inputs will be ignored: "${ignored.join(', ')}".`);
    }

    return checkedInputs;
}

/**
 * Executes an InferenceSession using the specified inputs.
 * NOTE: `inputs` must contain at least the input names of the model.
 *  - If additional inputs are passed, they will be ignored.
 *  - If inputs are missing, an error will be thrown.
 * 
 * @param {InferenceSession} session The InferenceSession object to run.
 * @param {Object} inputs An object that maps input names to input tensors.
 * @returns {Promise<Object>} A Promise that resolves to an object that maps output names to output tensors.
 * @private
 */
async function sessionRun(session, inputs) {
    const checkedInputs = await validateInputs(session, inputs);
    try {
        let output = await session.run(checkedInputs);
        output = replaceTensors(output);
        return output;
    } catch (e) {
        // This usually occurs when the inputs are of the wrong type.
        console.error(`An error occurred during model execution: "${e}".`);
        console.error('Inputs given to model:', checkedInputs);
        throw e;
    }
}

/**
 * Replaces ONNX Tensor objects with custom Tensor objects to support additional functions.
 * @param {Object} obj The object to replace tensor objects in.
 * @returns {Object} The object with tensor objects replaced by custom Tensor objects.
 * @private
 */
function replaceTensors(obj) {
    for (let prop in obj) {
        if (obj[prop] instanceof ONNXTensor) {
            obj[prop] = new Tensor(obj[prop]);
        } else if (typeof obj[prop] === 'object') {
            replaceTensors(obj[prop]);
        }
    }
    return obj;
}


/**
 * Converts an array or Tensor of integers to an int64 Tensor.
 * @param {Array|Tensor} items The input integers to be converted.
 * @returns {Tensor} The int64 Tensor with the converted values.
 * @throws {Error} If the input array is empty or the input is a batched Tensor and not all sequences have the same length.
 * @private
 */
function toI64Tensor(items) {
    if (items instanceof Tensor) {
        return items;
    }
    // items is an array
    if (items.length === 0) {
        throw Error("items must be non-empty");
    }

    if (Array.isArray(items[0])) {
        // batched
        if (items.some(x => x.length !== items[0].length)) {
            throw Error("Unable to create tensor, you should probably activate truncation and/or padding with 'padding=True' and/or 'truncation=True' to have batched tensors with the same length.")
        }

        return new Tensor('int64',
            BigInt64Array.from(items.flat().map(x => BigInt(x))),
            [items.length, items[0].length]
        );
    } else {
        //flat
        return new Tensor('int64',
            BigInt64Array.from(items.map(x => BigInt(x))),
            [1, items.length]
        );
    }
}

/**
 * Prepares an attention mask for a sequence of tokens based on configuration options.
 * @param {Object} self The calling object instance.
 * @param {Tensor} tokens The input tokens.
 * @returns {Tensor} The attention mask tensor.
 * @private
 */
function prepareAttentionMask(self, tokens) {

    // Prepare attention mask
    let pad_token_id = self.config.pad_token_id ?? null;
    let eos_token_id = self.config.eos_token_id ?? null;
    if (isIntegralNumber(eos_token_id)) {
        eos_token_id = [eos_token_id];
    }

    let is_pad_token_in_inputs = tokens.indexOf(pad_token_id) !== -1;
    let is_pad_token_not_equal_to_eos_token_id = (eos_token_id === null) || !eos_token_id.includes(pad_token_id)

    if (is_pad_token_in_inputs && is_pad_token_not_equal_to_eos_token_id) {
        let data = BigInt64Array.from(
            // Note: != so that int matches bigint
            tokens.data.map(x => x != pad_token_id)
        )
        return new Tensor('int64', data, tokens.dims)
    } else {
        return new Tensor(
            'int64',
            new BigInt64Array(tokens.data.length).fill(1n),
            tokens.dims
        )
    }
}

/**
 * Creates a boolean tensor with a single value.
 * @param {boolean} value The value of the tensor.
 * @returns {Tensor} The boolean tensor.
 * @private
 */
function boolTensor(value) {
    return new Tensor('bool', [value], [1]);
}

// JS doesn't support mixins, so we define some reused functions here, and allow "this" to be passed in
/**
 * Perform forward pass on the seq2seq model (both encoder and decoder).
 * @param {Object} self The seq2seq model object.
 * @param {Object} model_inputs The input object for the model containing encoder and decoder inputs.
 * @param {Object} options The options
 * @param {boolean} [options.add_decoder_pkv=true] Flag to add the decoder past key values.
 * @returns {Promise<Seq2SeqLMOutput>} Promise that resolves with the output of the seq2seq model.
 * @private
 */
async function seq2seqForward(self, model_inputs, {
    add_decoder_pkv = true
} = {}) {
    let { encoder_outputs, past_key_values } = model_inputs;

    if (!encoder_outputs) {
        // Encoder outputs are not given, so we must compute them.
        encoder_outputs = (await encoderForward(self, model_inputs)).last_hidden_state;
    }
    let decoderFeeds = {
        input_ids: model_inputs.decoder_input_ids,
        encoder_hidden_states: encoder_outputs,
        use_cache_branch: boolTensor(!!past_key_values)
    };

    if (self.decoder_merged_session.inputNames.includes('encoder_attention_mask')) {
        decoderFeeds.encoder_attention_mask = model_inputs.attention_mask
    }
    self.addPastKeyValues(decoderFeeds, past_key_values, add_decoder_pkv);

    const decoderResults = await sessionRun(self.decoder_merged_session, decoderFeeds);
    let logits = decoderResults.logits;
    past_key_values = self.getPastKeyValues(decoderResults, past_key_values);

    // Get cross attention and/or decoder attentions if they are present
    const attns = self.getAttentions(decoderResults);

    return new Seq2SeqLMOutput({ logits, past_key_values, encoder_outputs, ...attns });
}

/**
 * Start the beam search process for the seq2seq model.
 * @param {Object} self The seq2seq model object.
 * @param {Object[]} inputTokenIds Array of input token ids for each input sequence.
 * @param {number} numOutputTokens The maximum number of output tokens for the model.
 * @param {boolean} [requires_attention_mask=true] Flag to indicate if the model requires an attention mask.
 * @returns {Object[]} Array of beam search objects.
 * @private
 */
function seq2seqStartBeams(self, inputTokenIds, numOutputTokens, requires_attention_mask = true) {
    let beams = [];
    let beamId = 0;

    // decoder_input_ids == output_token_ids
    let decoder_input_ids = self.config.decoder_start_token_id;
    if (!Array.isArray(decoder_input_ids)) {
        decoder_input_ids = [decoder_input_ids];
    }

    for (let tokens of inputTokenIds) {
        // TODO: Improve
        // Currently, just add back batch dimension.
        // In future, allow for true parallel execution
        tokens.dims = [1, ...tokens.dims]

        // Create beam
        let start = {
            inputs: tokens,
            encoder_outputs: null,
            prev_model_outputs: null,

            output_token_ids: decoder_input_ids,
            done: false,
            score: 0,
            id: beamId++ // assign unique id to beams
        }

        if (requires_attention_mask) {
            start.attention_mask = prepareAttentionMask(self, tokens);
        }

        beams.push(start);
    }

    return beams;
}

/**
 * Run beam search on the seq2seq model for a single beam.
 * @param {Object} self The seq2seq model object.
 * @param {Object} beam The beam search object for which to run the model.
 * @param {Object} options options
 * @param {string} [options.input_name='input_ids'] The name of the input tensor for the encoder.
 * @returns {Promise<Object>} Promise that resolves with the output of the seq2seq model for the given beam.
 * @private
 */
async function seq2seqRunBeam(self, beam, {
    input_name = 'input_ids',
} = {}
) {
    // 1. Prepare
    let model_inputs = {
        [input_name]: beam.inputs,
        decoder_input_ids: toI64Tensor(beam.output_token_ids.slice(-1)),
        encoder_outputs: beam.encoder_outputs,
        past_key_values: beam.prev_model_outputs?.past_key_values,
    }
    if (beam.attention_mask) {
        model_inputs.attention_mask = beam.attention_mask
    }

    // 2. Run
    let output = await self.forward(model_inputs);

    // 3. Update
    beam.prev_model_outputs = output;
    beam.encoder_outputs = output.encoder_outputs;

    return output;
}

/**
 * Forward pass of an encoder model.
 * @param {Object} self The encoder model.
 * @param {Object} model_inputs The input data to be used for the forward pass.
 * @returns {Promise<Object>} Promise that resolves with an object containing the model's outputs.
 * @private
 */
async function encoderForward(self, model_inputs) {
    let encoderFeeds = {};
    for (let key of self.session.inputNames) {
        encoderFeeds[key] = model_inputs[key];
    }
    return await sessionRun(self.session, encoderFeeds);
}


/**
 * Forward pass of a decoder model.
 * @param {Object} self The decoder model.
 * @param {Object} model_inputs The input data to be used for the forward pass.
 * @returns {Promise<Object>} Promise that resolves with an object containing the logits and past key values.
 * @private
 */
async function decoderForward(self, model_inputs) {
    let { input_ids, past_key_values, attention_mask } = model_inputs;
    let decoderFeeds = {
        input_ids: input_ids,
        attention_mask: attention_mask ?? prepareAttentionMask(self, input_ids),
        use_cache_branch: boolTensor(past_key_values !== null)
    }

    self.addPastKeyValues(decoderFeeds, past_key_values);

    let decoderResults = await sessionRun(self.session, decoderFeeds);

    let logits = decoderResults.logits;

    past_key_values = self.getPastKeyValues(decoderResults, past_key_values);
    return { logits, past_key_values };
}

/**
 * Starts the generation of text by initializing the beams for the given input token IDs.
 * @param {Object} self The text generation model object.
 * @param {any} inputTokenIds An array of input token IDs to generate text from.
 * @param {number} numOutputTokens The maximum number of tokens to generate for each beam.
 * @param {Tensor} [inputs_attention_mask] The attention mask tensor for the input token IDs.
 * @returns {Object[]} An array of beams initialized with the given inputs and parameters.
 * @private
 */
function decoderStartBeams(self, inputTokenIds, numOutputTokens, inputs_attention_mask) {
    let beams = [];

    let beamId = 0;
    for (let tokens of inputTokenIds) {
        let output_token_ids = tokens.tolist().map(Number);

        // TODO: Improve
        // Currently, just add back batch dimension.
        // In future, allow for true parallel execution
        tokens.dims = [1, ...tokens.dims]

        let attn_mask;
        if (inputs_attention_mask) {
            attn_mask = inputs_attention_mask[beamId];
            attn_mask.dims = [1, ...attn_mask.dims]

        } else {
            attn_mask = prepareAttentionMask(self, tokens)
        }

        let start = {
            input: tokens,
            model_input_ids: tokens,
            attention_mask: attn_mask,
            prev_model_outputs: null,

            output_token_ids: output_token_ids,
            num_output_tokens: numOutputTokens,

            done: false,
            score: 0,
            id: beamId++ // assign unique id to beams
        }

        beams.push(start);
    }
    return beams;
}

/**
 * Runs a single step of the text generation process for a given beam.
 *
 * @param {Object} self The decoder object.
 * @param {Object} beam The beam to run.
 * @param {Tensor} beam.input The input tensor.
 * @param {Tensor} beam.model_input_ids The input ids to the model.
 * @param {Tensor} beam.attention_mask The attention mask.
 * @param {Object} beam.prev_model_outputs The past key values.
 * @param {number[]} beam.output_token_ids The output token ids.
 * @returns {Promise<Object>} The output of the generation step.
 * @private
 */
async function decoderRunBeam(self, beam) {
    let attnMaskData = new BigInt64Array(beam.output_token_ids.length).fill(1n)

    // 1. Prepare
    let model_inputs = {
        input_ids: beam.model_input_ids,
        attention_mask: new Tensor(
            'int64',
            attnMaskData,
            [1, attnMaskData.length]
        ),
        past_key_values: beam.prev_model_outputs?.past_key_values,
    }

    // 2. Run
    let output = await self.forward(model_inputs);

    // 3. Update
    beam.prev_model_outputs = output;

    return output;
}

/**
 * Update a beam with a new token ID.
 * @param {Object} beam The beam to update.
 * @param {number} newTokenId The new token ID to add to the beam's output.
 * @private
 */
function decoderUpdatebeam(beam, newTokenId) {
    beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    beam.model_input_ids = new Tensor('int64', [BigInt(newTokenId)], [1, 1]);
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
/**
 * A base class for pre-trained models that provides the model configuration and an ONNX session.
 * @extends Callable
 */
export class PreTrainedModel extends Callable {

    /**
     * Creates a new instance of the `PreTrainedModel` class.
     * @param {Object} config The model configuration.
     * @param {any} session session for the model.
     */
    constructor(config, session) {
        super();

        this.config = config;
        this.session = session;
    }

    /**
    * Disposes of all the ONNX sessions that were created during inference.
    * @returns {Promise<unknown[]>} An array of promises, one for each ONNX session that is being disposed.
    * @todo Use https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
    */
    async dispose() {
        let promises = [];
        for (let key of Object.keys(this)) {
            let item = this[key];
            if (item instanceof InferenceSession) {
                promises.push(item.handler.dispose())
            }
        }
        return await Promise.all(promises);
    }

    /**
     * Instantiate one of the model classes of the library from a pretrained model.
     * 
     * The model class to instantiate is selected based on the `model_type` property of the config object
     * (either passed as an argument or loaded from `pretrained_model_name_or_path` if possible)
     * 
     * @param {string} pretrained_model_name_or_path The name or path of the pretrained model. Can be either:
     * - A string, the *model id* of a pretrained model hosted inside a model repo on huggingface.co.
     *   Valid model ids can be located at the root-level, like `bert-base-uncased`, or namespaced under a
     *   user or organization name, like `dbmdz/bert-base-german-cased`.
     * - A path to a *directory* containing model weights, e.g., `./my_model_directory/`.
     * @param {PretrainedOptions} options Additional options for loading the model.
     * 
     * @returns {Promise<PreTrainedModel>} A new instance of the `PreTrainedModel` class.
     */
    static async from_pretrained(pretrained_model_name_or_path, {
        quantized = true,
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
        model_file_name = null,
    } = {}) {

        let options = {
            quantized,
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
            model_file_name,
        }

        let modelType = MODEL_TYPE_MAPPING.get(this.name);

        let info;
        if (modelType === DecoderOnlyModelType) {
            info = await Promise.all([
                AutoConfig.from_pretrained(pretrained_model_name_or_path, options),
                constructSession(pretrained_model_name_or_path, options.model_file_name ?? 'decoder_model_merged', options),
            ]);

        } else if (modelType === Seq2SeqModelType) {
            info = await Promise.all([
                AutoConfig.from_pretrained(pretrained_model_name_or_path, options),
                constructSession(pretrained_model_name_or_path, 'encoder_model', options),
                constructSession(pretrained_model_name_or_path, 'decoder_model_merged', options),
                getModelJSON(pretrained_model_name_or_path, 'generation_config.json', false, options),
            ]);

        } else if (modelType === EncoderDecoderModelType) {
            info = await Promise.all([
                AutoConfig.from_pretrained(pretrained_model_name_or_path, options),
                constructSession(pretrained_model_name_or_path, 'encoder_model', options),
                constructSession(pretrained_model_name_or_path, 'decoder_model_merged', options),
            ]);

        } else { // should be EncoderOnlyModelType
            if (modelType !== EncoderOnlyModelType) {
                console.warn(`Model type for ${this.name} not found, assuming encoder-only architecture. Please report this at https://github.com/xenova/transformers.js/issues/new/choose.`)
            }
            info = await Promise.all([
                AutoConfig.from_pretrained(pretrained_model_name_or_path, options),
                constructSession(pretrained_model_name_or_path, options.model_file_name ?? 'model', options)
            ]);
        }

        // @ts-ignore
        return new this(...info);
    }

    /**
     * Runs the model with the provided inputs
     * @param {Object} model_inputs Object containing input tensors
     * @returns {Promise<Object>} Object containing output tensors
     */
    async _call(model_inputs) {
        return await this.forward(model_inputs);
    }

    /**
     * Forward method for a pretrained model. If not overridden by a subclass, the correct forward method
     * will be chosen based on the model type.
     * @param {Object} model_inputs The input data to the model in the format specified in the ONNX model.
     * @returns {Promise<Object>} The output data from the model in the format specified in the ONNX model.
     * @throws {Error} This method must be implemented in subclasses.
     */
    async forward(model_inputs) {
        return await forward(this, model_inputs);
    }

    /**
     * @param {GenerationConfig} generation_config 
     * @param {number} input_ids_seq_length The starting sequence length for the input ids.
     * @returns {LogitsProcessorList}
     */
    _get_logits_processor(
        generation_config,
        input_ids_seq_length,
        // encoder_input_ids, TODO
        // prefix_allowed_tokens_fn, TODO
        logits_processor = null
    ) {
        const processors = new LogitsProcessorList();

        // if (generation_config.diversity_penalty !== null && generation_config.diversity_penalty > 0.0) {
        //     processors.push(new HammingDiversityLogitsProcessor(
        //         generation_config.diversity_penalty,
        //         generation_config.num_beams,
        //         generation_config.num_beam_groups
        //     ));
        // }

        // if (generation_config.encoder_repetition_penalty !== null && generation_config.encoder_repetition_penalty !== 1.0) {
        //     processors.push(new EncoderRepetitionPenaltyLogitsProcessor(
        //         generation_config.encoder_repetition_penalty,
        //         encoder_input_ids
        //     ));
        // }

        if (generation_config.repetition_penalty !== null && generation_config.repetition_penalty !== 1.0) {
            processors.push(new RepetitionPenaltyLogitsProcessor(generation_config.repetition_penalty));
        }

        if (generation_config.no_repeat_ngram_size !== null && generation_config.no_repeat_ngram_size > 0) {
            processors.push(new NoRepeatNGramLogitsProcessor(generation_config.no_repeat_ngram_size));
        }

        // if (generation_config.encoder_no_repeat_ngram_size !== null && generation_config.encoder_no_repeat_ngram_size > 0) {
        //     if (this.config.is_encoder_decoder) {
        //         processors.push(new EncoderNoRepeatNGramLogitsProcessor(
        //             generation_config.encoder_no_repeat_ngram_size,
        //             encoder_input_ids
        //         ));
        //     } else {
        //         throw new Error("It's impossible to use `encoder_no_repeat_ngram_size` with decoder-only architecture");
        //     }
        // }

        // if (generation_config.bad_words_ids !== null) {
        //     processors.push(new NoBadWordsLogitsProcessor(generation_config.bad_words_ids, generation_config.eos_token_id));
        // }

        // if (generation_config.min_length !== null && generation_config.eos_token_id !== null && generation_config.min_length > 0) {
        //     processors.push(new MinLengthLogitsProcessor(generation_config.min_length, generation_config.eos_token_id));
        // }

        // if (generation_config.min_new_tokens !== null && generation_config.eos_token_id !== null && generation_config.min_new_tokens > 0) {
        //     processors.push(new MinNewTokensLengthLogitsProcessor(
        //         input_ids_seq_length,
        //         generation_config.min_new_tokens,
        //         generation_config.eos_token_id
        //     ));
        // }

        // if (prefix_allowed_tokens_fn !== null) {
        //     processors.push(new PrefixConstrainedLogitsProcessor(
        //         prefix_allowed_tokens_fn,
        //         generation_config.num_beams / generation_config.num_beam_groups
        //     ));
        // }


        if (generation_config.forced_bos_token_id !== null) {
            processors.push(new ForcedBOSTokenLogitsProcessor(generation_config.forced_bos_token_id));
        }

        if (generation_config.forced_eos_token_id !== null) {
            processors.push(new ForcedEOSTokenLogitsProcessor(
                generation_config.max_length,
                generation_config.forced_eos_token_id
            ));
        }

        // if (generation_config.remove_invalid_values === true) {
        //     processors.push(new InfNanRemoveLogitsProcessor());
        // }

        // if (generation_config.exponential_decay_length_penalty !== null) {
        //     processors.push(new ExponentialDecayLengthPenalty(
        //         generation_config.exponential_decay_length_penalty,
        //         generation_config.eos_token_id,
        //         input_ids_seq_length
        //     ));
        // }

        // if (generation_config.suppress_tokens !== null) {
        //     processors.push(new SuppressTokensLogitsProcessor(generation_config.suppress_tokens));
        // }

        if (generation_config.begin_suppress_tokens !== null) {
            let begin_index = (input_ids_seq_length > 1 || generation_config.forced_bos_token_id === null)
                ? input_ids_seq_length
                : input_ids_seq_length + 1;

            if (generation_config.forced_decoder_ids !== null) {
                // generation starts after the last token that is forced
                begin_index += generation_config.forced_decoder_ids[generation_config.forced_decoder_ids.length - 1][0];
            }
            processors.push(new SuppressTokensAtBeginLogitsProcessor(generation_config.begin_suppress_tokens, begin_index));
        }

        if (generation_config.forced_decoder_ids !== null) {
            processors.push(new ForceTokensLogitsProcessor(generation_config.forced_decoder_ids));
        }

        if (logits_processor !== null) {
            processors.extend(logits_processor)
        }

        // `LogitNormalization` should always be the last logit processor, when present
        // if (generation_config.renormalize_logits === true) {
        //     processors.push(new LogitNormalization());
        // }

        return processors;
    }

    /**
     * This function merges multiple generation configs together to form a final generation config to be used by the model for text generation.
     * It first creates an empty `GenerationConfig` object, then it applies the model's own `generation_config` property to it. Finally, if a `generation_config` object was passed in the arguments, it overwrites the corresponding properties in the final config with those of the passed config object.
     *
     * @param {GenerationConfig} generation_config A `GenerationConfig` object containing generation parameters.
     * @returns {GenerationConfig} The final generation config object to be used by the model for text generation.
     */
    _get_generation_config(generation_config) {
        // Create empty generation config (contains defaults)
        let gen_config = new GenerationConfig();

        // Apply model's generation config, if it exists
        if ('generation_config' in this) {
            Object.assign(gen_config, this.generation_config);
        }

        // Finally, use any generation config specified by the user
        // when calling `generate`
        if (generation_config !== null) {
            Object.assign(gen_config, generation_config);
        }
        return gen_config;
    }

    /**
     * @typedef {import('./utils/maths.js').TypedArray} TypedArray
     */

    /**
     * @typedef {{ sequences: Tensor, decoder_attentions: Tensor, cross_attentions: Tensor }} EncoderDecoderOutput
     * @typedef {Object} DecoderOutput
     * 
     * Generates text based on the given inputs and generation configuration using the model.
     * @param {Tensor|Array|TypedArray} inputs An array of input token IDs.
     * @param {Object|GenerationConfig|null} generation_config The generation configuration to use. If null, default configuration will be used.
     * @param {Object|null} logits_processor An optional logits processor to use. If null, a new LogitsProcessorList instance will be created.
     * @param {Object} options options
     * @param {Object} [options.inputs_attention_mask=null] An optional attention mask for the inputs.
     * @returns {Promise<number[][]|EncoderDecoderOutput|DecoderOutput>} An array of generated output sequences, where each sequence is an array of token IDs.
     * @throws {Error} Throws an error if the inputs array is empty.
     */
    async generate(
        inputs,
        generation_config = null,
        logits_processor = null,
        {
            inputs_attention_mask = null
        } = {},
    ) {

        if (!(inputs instanceof Tensor) && !isTypedArray(inputs) && !Array.isArray(inputs)) {
            throw Error(`\`inputs\` must be a Tensor, TypedArray, or Array, but is "${inputs.constructor.name}".`);
        }

        let input_ids_seq_length;

        // Prepare `input_ids` which will be used for auto-regressive generation
        // TODO: Update to align with HF transformers' implementation
        if (this.config.is_encoder_decoder) {
            // Generating from the encoder outputs
            input_ids_seq_length = 0;

        } else {
            input_ids_seq_length = inputs instanceof Tensor ? inputs.dims[0] : inputs.length;

            // decoder-only
            if (input_ids_seq_length === 0) {
                throw Error("Must supply a non-empty array of input token ids.")
            }
        }

        // Update generation config with defaults
        generation_config = this._get_generation_config(generation_config);

        logits_processor = logits_processor ?? new LogitsProcessorList()

        // Update logits processor
        logits_processor = this._get_logits_processor(
            generation_config,
            input_ids_seq_length,
            logits_processor
        )

        // TODO implement early_stopping
        // https://huggingface.co/blog/how-to-generate

        let numOutputTokens = 1;
        const maxOutputTokens = numOutputTokens + (generation_config.max_new_tokens ?? Infinity);

        // Only use max length if max_new_tokens is not provided
        const useMaxLength = Number.isInteger(generation_config.max_length) && (generation_config.max_new_tokens ?? null) === null;
        let sampler = Sampler.getSampler(generation_config);

        // @ts-ignore
        let beams = this.getStartBeams(inputs, numOutputTokens, inputs_attention_mask);

        while (beams.some(x => !x.done) && numOutputTokens < maxOutputTokens) {
            let newest_beams = [];
            for (let beam of beams) {
                if (beam.done) {
                    // Add this beam back into the pool
                    newest_beams.push(beam);
                    continue
                }
                if (useMaxLength && beam.output_token_ids.length >= generation_config.max_length) {
                    // Set this beam to done and add it back into the pool
                    beam.done = true;
                    newest_beams.push(beam);
                    continue
                }

                // @ts-ignore
                let output = await this.runBeam(beam);

                // add attentions/scores to beam only if user requested
                if (generation_config.output_attentions) {
                    this.addAttentionsToBeam(beam, output);
                }
                if (generation_config.output_scores) {
                    // TODO add
                }

                // Logits are of the form [batch_size, out_seq_length, vocab_size]
                // In most cases, this will be [batch_size, 1, vocab_size]
                // So, we select the last token's logits:
                // (equivalent to `logits = outputs.logits[:, -1, :]`)
                let logits = output.logits.slice(null, -1, null);

                // Apply logits processor
                logits_processor(beam.output_token_ids, logits);

                let sampledTokens = sampler(logits);
                for (let [newTokenId, logProb] of sampledTokens) {
                    // use previous beam as a starting point
                    let newBeam = { ...beam };

                    // update new beam
                    // @ts-ignore
                    this.updateBeam(newBeam, newTokenId);

                    newBeam.score += logProb;

                    if (newTokenId === this.config.eos_token_id) {
                        newBeam.done = true;
                    }

                    newest_beams.push(newBeam);
                }
            }
            ++numOutputTokens;

            // Next, we get the best beams, per ID
            newest_beams = this.groupBeams(newest_beams).map(
                group => group
                    .sort((a, b) => b.score - a.score)      // sort by score
                    .slice(0, generation_config.num_beams)  // remove outside beam width
            );

            // Flatten beams
            beams = newest_beams.flat();

            // Run callback
            if (generation_config.callback_function) {
                generation_config.callback_function(beams);
            }
        }

        // TODO: Ensure that we can return non-batched outputs

        const groupedBeams = this.groupBeams(beams);

        const getFlattened = (key) => groupedBeams.map(
            batch => {
                if (generation_config.num_return_sequences > 1) {
                    return batch.slice(0, generation_config.num_return_sequences).map(x => x[key]);
                } else {
                    return [batch[0][key]];
                }
            }
        ).flat(); // Flatten across batches (depth=1)

        const sequences = getFlattened('output_token_ids'); // [1, seqLength]

        if (generation_config.return_dict_in_generate) {
            // NOTE: `decoder_attentions` and `cross_attentions` should be:
            //    list (one element for each generated token)
            //    of list (one element for each layer of the decoder)
            //    of torch.FloatTensor of shape (batch_size, num_heads, generated_length, sequence_length)
            // However, since we are only generating one batch at a time, they are of the form:
            //   list (batches)
            //   of list (one element for each generated token)
            //   of list (one element for each layer of the decoder)
            //   of torch.FloatTensor of shape (1, num_heads, generated_length, sequence_length)
            // 
            // TODO: In future (when true parallelism, we should be able to return the correct shape)

            const decoder_attentions = getFlattened('decoder_attentions');
            const cross_attentions = getFlattened('cross_attentions');

            return {
                sequences,

                decoder_attentions,
                cross_attentions,
            }
        } else {
            return sequences;
        }
    }

    /**
     * Helper function to add attentions to beam
     * @param {Object} beam 
     * @param {Object} output
     * @private 
     */
    addAttentionsToBeam(beam, output) {
        if (this.config.is_encoder_decoder) {
            if (!output.cross_attentions || output.cross_attentions.length === 0) {
                throw Error(
                    "`output_attentions` is true, but the model did not produce cross-attentions. " +
                    "This is most likely because the model was not exported with `output_attentions=True`."
                )
            }
            if (!beam.cross_attentions) {
                beam.cross_attentions = [];
            }
            beam.cross_attentions.push(output.cross_attentions);
        }

        if (!output.decoder_attentions || output.decoder_attentions.length === 0) {
            throw Error(
                "`output_attentions` is true, but the model did not produce decoder-attentions. " +
                "This is most likely because the model was not exported with `output_attentions=True`."
            )
        }
        if (!beam.decoder_attentions) {
            beam.decoder_attentions = [];
        }
        beam.decoder_attentions.push(output.decoder_attentions);
    }

    /**
     * Groups an array of beam objects by their ids.
     *
     * @param {Array} beams The array of beam objects to group.
     * @returns {Array} An array of arrays, where each inner array contains beam objects with the same id.
     */
    groupBeams(beams) {
        // Group beams by their ids
        const groups = Object.create(null);
        for (const obj of beams) {
            if (groups[obj.id] === undefined) {
                groups[obj.id] = [obj];
            } else {
                groups[obj.id].push(obj);
            }
        }

        return Object.values(groups);
    }

    /**
     * Returns an object containing past key values from the given decoder results object.
     *
     * @param {Object} decoderResults The decoder results object.
     * @param {Object} pastKeyValues The previous past key values.
     * @returns {Object} An object containing past key values.
     * @private
     */
    getPastKeyValues(decoderResults, pastKeyValues) {

        const pkvs = Object.create(null);

        for (const name in decoderResults) {
            if (name.startsWith('present')) {
                let newName = name.replace('present', 'past_key_values');

                if (pastKeyValues && name.includes('encoder')) {
                    // Optimization introduced by optimum to reuse past key values. So, we just replace the constant
                    // outputs with the previous past key values.
                    // https://github.com/huggingface/optimum/blob/0bf2c05fb7e1182b52d21b703cfc95fd9e4ea3dc/optimum/onnxruntime/base.py#L677-L704
                    pkvs[newName] = pastKeyValues[newName];
                } else {
                    pkvs[newName] = decoderResults[name];
                }
            }
        }
        return pkvs;
    }

    /**
     * Returns an object containing attentions from the given decoder results object.
     *
     * @param {Object} decoderResults The decoder results object.
     * @returns {Object} An object containing attentions.
     * @private
     */
    getAttentions(decoderResults) {
        const attns = Object.create(null);

        for (const attnName of ['cross_attentions', 'decoder_attentions']) {
            const result = [];
            for (const name in decoderResults) {
                if (name.startsWith(attnName)) {
                    const index = name.split('.').pop()
                    result[index] = decoderResults[name];
                }
            }
            attns[attnName] = result;
        }
        return attns;
    }

    /**
     * Adds past key values to the decoder feeds object. If pastKeyValues is null, creates new tensors for past key values.
     *
     * @param {Object} decoderFeeds The decoder feeds object to add past key values to.
     * @param {Object} pastKeyValues An object containing past key values.
     * @param {boolean} [hasDecoder=false] Whether the model has a decoder.
     */
    addPastKeyValues(decoderFeeds, pastKeyValues, hasDecoder = false) {
        if (pastKeyValues) {
            Object.assign(decoderFeeds, pastKeyValues)
        } else {
            // TODO support batches (i.e., batch_size > 1)
            if (hasDecoder) {
                // @ts-ignore
                let encoder_dims = [1, this.num_encoder_heads, 0, this.encoder_dim_kv];
                // @ts-ignore
                for (let i = 0; i < this.num_encoder_layers; ++i) {
                    decoderFeeds[`past_key_values.${i}.encoder.key`] = new Tensor('float32', [], encoder_dims)
                    decoderFeeds[`past_key_values.${i}.encoder.value`] = new Tensor('float32', [], encoder_dims)
                }

                // @ts-ignore
                let decoder_dims = [1, this.num_decoder_heads, 0, this.decoder_dim_kv];
                // @ts-ignore
                for (let i = 0; i < this.num_decoder_layers; ++i) {
                    decoderFeeds[`past_key_values.${i}.decoder.key`] = new Tensor('float32', [], decoder_dims)
                    decoderFeeds[`past_key_values.${i}.decoder.value`] = new Tensor('float32', [], decoder_dims)
                }

            } else {
                if (this.config.multi_query) {
                    // @ts-ignore
                    let dims = [1, 0, 2 * this.dim_kv]
                    // @ts-ignore
                    for (let i = 0; i < this.num_layers; ++i) {
                        decoderFeeds[`past_key_values.${i}.key_value`] = new Tensor('float32', [], dims)
                    }
                } else {
                    // @ts-ignore
                    let dims = [1, this.num_heads, 0, this.dim_kv]
                    // @ts-ignore
                    for (let i = 0; i < this.num_layers; ++i) {
                        decoderFeeds[`past_key_values.${i}.key`] = new Tensor('float32', [], dims)
                        decoderFeeds[`past_key_values.${i}.value`] = new Tensor('float32', [], dims)
                    }
                }
            }
        }
    }
}
//////////////////////////////////////////////////
// Base model output class
export class ModelOutput { }

/**
 * Base class for model's outputs, with potential hidden states and attentions.
 */
export class BaseModelOutput extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.last_hidden_state Sequence of hidden-states at the output of the last layer of the model.
     * @param {Tensor} [output.hidden_states] Hidden-states of the model at the output of each layer plus the optional initial embedding outputs.
     * @param {Tensor} [output.attentions] Attentions weights after the attention softmax, used to compute the weighted average in the self-attention heads.
     */
    constructor({ last_hidden_state, hidden_states = null, attentions = null }) {
        super();
        this.last_hidden_state = last_hidden_state;
        this.hidden_states = hidden_states;
        this.attentions = attentions;
    }
}
//////////////////////////////////////////////////
// Bert models
export class BertPreTrainedModel extends PreTrainedModel { }
export class BertModel extends BertPreTrainedModel { }

/**
 * BertForMaskedLM is a class representing a BERT model for masked language modeling.
 * @extends BertPreTrainedModel
 */
export class BertForMaskedLM extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} An object containing the model's output logits for masked language modeling.
     */
    async _call(model_inputs) {
        return new MaskedLMOutput(await super._call(model_inputs));
    }
}

/**
 * BertForSequenceClassification is a class representing a BERT model for sequence classification.
 * @extends BertPreTrainedModel
 */
export class BertForSequenceClassification extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} An object containing the model's output logits for sequence classification.
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * BertForTokenClassification is a class representing a BERT model for token classification.
 * @extends BertPreTrainedModel
 */
export class BertForTokenClassification extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} An object containing the model's output logits for token classification.
     */
    async _call(model_inputs) {
        return new TokenClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * BertForQuestionAnswering is a class representing a BERT model for question answering.
 * @extends BertPreTrainedModel
 */
export class BertForQuestionAnswering extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} An object containing the model's output logits for question answering.
     */
    async _call(model_inputs) {
        return new QuestionAnsweringModelOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// DeBERTa models
export class DebertaPreTrainedModel extends PreTrainedModel { }

/**
 * The bare DeBERTa Model transformer outputting raw hidden-states without any specific head on top.
 */
export class DebertaModel extends DebertaPreTrainedModel { }

/**
 * DeBERTa Model with a `language modeling` head on top.
 */
export class DebertaForMaskedLM extends DebertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} An object containing the model's output logits for masked language modeling.
     */
    async _call(model_inputs) {
        return new MaskedLMOutput(await super._call(model_inputs));
    }
}

/**
 * DeBERTa Model transformer with a sequence classification/regression head on top (a linear layer on top of the pooled output)
 */
export class DebertaForSequenceClassification extends DebertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} An object containing the model's output logits for sequence classification.
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * DeBERTa Model with a token classification head on top (a linear layer on top of the hidden-states output) e.g. for Named-Entity-Recognition (NER) tasks.
 */
export class DebertaForTokenClassification extends DebertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} An object containing the model's output logits for token classification.
     */
    async _call(model_inputs) {
        return new TokenClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * DeBERTa Model with a span classification head on top for extractive question-answering tasks like SQuAD (a linear
 * layers on top of the hidden-states output to compute `span start logits` and `span end logits`).
 */
export class DebertaForQuestionAnswering extends DebertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} An object containing the model's output logits for question answering.
     */
    async _call(model_inputs) {
        return new QuestionAnsweringModelOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// DeBERTa-v2 models
export class DebertaV2PreTrainedModel extends PreTrainedModel { }

/**
 * The bare DeBERTa-V2 Model transformer outputting raw hidden-states without any specific head on top.
 */
export class DebertaV2Model extends DebertaV2PreTrainedModel { }

/**
 * DeBERTa-V2 Model with a `language modeling` head on top.
 */
export class DebertaV2ForMaskedLM extends DebertaV2PreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} An object containing the model's output logits for masked language modeling.
     */
    async _call(model_inputs) {
        return new MaskedLMOutput(await super._call(model_inputs));
    }
}

/**
 * DeBERTa-V2 Model transformer with a sequence classification/regression head on top (a linear layer on top of the pooled output)
 */
export class DebertaV2ForSequenceClassification extends DebertaV2PreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} An object containing the model's output logits for sequence classification.
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * DeBERTa-V2 Model with a token classification head on top (a linear layer on top of the hidden-states output) e.g. for Named-Entity-Recognition (NER) tasks.
 */
export class DebertaV2ForTokenClassification extends DebertaV2PreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} An object containing the model's output logits for token classification.
     */
    async _call(model_inputs) {
        return new TokenClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * DeBERTa-V2 Model with a span classification head on top for extractive question-answering tasks like SQuAD (a linear
 * layers on top of the hidden-states output to compute `span start logits` and `span end logits`).
 */
export class DebertaV2ForQuestionAnswering extends DebertaV2PreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} An object containing the model's output logits for question answering.
     */
    async _call(model_inputs) {
        return new QuestionAnsweringModelOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// DistilBert models
export class DistilBertPreTrainedModel extends PreTrainedModel { }
export class DistilBertModel extends DistilBertPreTrainedModel { }

/**
 * DistilBertForSequenceClassification is a class representing a DistilBERT model for sequence classification.
 * @extends DistilBertPreTrainedModel
 */
export class DistilBertForSequenceClassification extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} An object containing the model's output logits for sequence classification.
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * DistilBertForTokenClassification is a class representing a DistilBERT model for token classification.
 * @extends DistilBertPreTrainedModel
 */
export class DistilBertForTokenClassification extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} An object containing the model's output logits for token classification.
     */
    async _call(model_inputs) {
        return new TokenClassifierOutput(await super._call(model_inputs));
    }
}


/**
 * DistilBertForQuestionAnswering is a class representing a DistilBERT model for question answering.
 * @extends DistilBertPreTrainedModel
 */
export class DistilBertForQuestionAnswering extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} An object containing the model's output logits for question answering.
     */
    async _call(model_inputs) {
        return new QuestionAnsweringModelOutput(await super._call(model_inputs));
    }
}

/**
 * DistilBertForMaskedLM is a class representing a DistilBERT model for masking task.
 * @extends DistilBertPreTrainedModel
 */
export class DistilBertForMaskedLM extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} returned object
     */
    async _call(model_inputs) {
        return new MaskedLMOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// MobileBert models
export class MobileBertPreTrainedModel extends PreTrainedModel { }
export class MobileBertModel extends MobileBertPreTrainedModel { }

/**
 * MobileBertForMaskedLM is a class representing a MobileBERT model for masking task.
 * @extends MobileBertPreTrainedModel
 */
export class MobileBertForMaskedLM extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} returned object
     */
    async _call(model_inputs) {
        return new MaskedLMOutput(await super._call(model_inputs));
    }
}

/**
 * @extends MobileBertPreTrainedModel
 */
export class MobileBertForSequenceClassification extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} returned object
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * @extends MobileBertPreTrainedModel
 */
export class MobileBertForQuestionAnswering extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} returned object
     */
    async _call(model_inputs) {
        return new QuestionAnsweringModelOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// MPNet models
export class MPNetPreTrainedModel extends PreTrainedModel { }

/**
 * The bare MPNet Model transformer outputting raw hidden-states without any specific head on top.
 * @extends MPNetPreTrainedModel
 */
export class MPNetModel extends MPNetPreTrainedModel { }

/**
 * MPNetForMaskedLM is a class representing a MPNet model for masked language modeling.
 * @extends MPNetPreTrainedModel
 */
export class MPNetForMaskedLM extends MPNetPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} An object containing the model's output logits for masked language modeling.
     */
    async _call(model_inputs) {
        return new MaskedLMOutput(await super._call(model_inputs));
    }
}

/**
 * MPNetForSequenceClassification is a class representing a MPNet model for sequence classification.
 * @extends MPNetPreTrainedModel
 */
export class MPNetForSequenceClassification extends MPNetPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} An object containing the model's output logits for sequence classification.
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * MPNetForTokenClassification is a class representing a MPNet model for token classification.
 * @extends MPNetPreTrainedModel
 */
export class MPNetForTokenClassification extends MPNetPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} An object containing the model's output logits for token classification.
     */
    async _call(model_inputs) {
        return new TokenClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * MPNetForQuestionAnswering is a class representing a MPNet model for question answering.
 * @extends MPNetPreTrainedModel
 */
export class MPNetForQuestionAnswering extends MPNetPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} An object containing the model's output logits for question answering.
     */
    async _call(model_inputs) {
        return new QuestionAnsweringModelOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// SqueezeBert models
export class SqueezeBertPreTrainedModel extends PreTrainedModel { }
export class SqueezeBertModel extends SqueezeBertPreTrainedModel { }
export class SqueezeBertForMaskedLM extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} returned object
     */
    async _call(model_inputs) {
        return new MaskedLMOutput(await super._call(model_inputs));
    }
}
export class SqueezeBertForSequenceClassification extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} returned object
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}
export class SqueezeBertForQuestionAnswering extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} returned object
     */
    async _call(model_inputs) {
        return new QuestionAnsweringModelOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// Albert models
export class AlbertPreTrainedModel extends PreTrainedModel { }
export class AlbertModel extends AlbertPreTrainedModel { }
export class AlbertForSequenceClassification extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} returned object
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}
export class AlbertForQuestionAnswering extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} returned object
     */
    async _call(model_inputs) {
        return new QuestionAnsweringModelOutput(await super._call(model_inputs));
    }
}
export class AlbertForMaskedLM extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} returned object
     */
    async _call(model_inputs) {
        return new MaskedLMOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// T5 models
export class T5PreTrainedModel extends PreTrainedModel { };

export class T5Model extends T5PreTrainedModel {
    /**
     * Generates text based on the provided arguments.
     * @throws {Error} Throws an error as the current model class (T5Model) is not compatible with `.generate()`.
     * @returns {Promise<any>}
     * @param {any[]} args
     */
    async generate(...args) {
        throw Error(
            "The current model class (T5Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'T5ForConditionalGeneration'}"
        )
    }
}

/**
 * T5Model is a class representing a T5 model for conditional generation.
 * @extends T5PreTrainedModel
 */
export class T5ForConditionalGeneration extends T5PreTrainedModel {

    /**
     * Creates a new instance of the `T5ForConditionalGeneration` class.
     * @param {Object} config The model configuration.
     * @param {any} session session for the model.
     * @param {any} decoder_merged_session session for the decoder.
     * @param {GenerationConfig} generation_config The generation configuration.
     */
    constructor(config, session, decoder_merged_session, generation_config) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;
        this.generation_config = generation_config;

        this.num_decoder_layers = this.config.num_decoder_layers;
        this.num_decoder_heads = this.config.num_heads;
        this.decoder_dim_kv = this.config.d_kv;

        this.num_encoder_layers = this.config.num_layers;
        this.num_encoder_heads = this.config.num_heads;
        this.encoder_dim_kv = this.config.d_kv;
    }

    /**
     * Generates the start beams for a given set of inputs and output length.
     * @param {number[][]} inputs The input token IDs.
     * @param {number} numOutputTokens The desired output length.
     * @returns {Array} The start beams.
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * Updates the given beam with a new token ID.
     * @param {any} beam The current beam.
     * @param {number} newTokenId The new token ID to add to the output sequence.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Runs the forward pass of the model for a given set of inputs.
     * @param {Object} model_inputs The model inputs.
     * @returns {Promise<Object>} The model output.
     */
    async forward(model_inputs) {
        return await seq2seqForward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// MT5 models
export class MT5PreTrainedModel extends PreTrainedModel { };

export class MT5Model extends MT5PreTrainedModel {
    /**
     * 
     * @param  {...any} args
     * @returns {Promise<any>}
     * @throws {Error}
     */
    async generate(...args) {
        throw Error(
            "The current model class (MT5Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'MT5ForConditionalGeneration'}"
        )
    }
}

/**
 * A class representing a conditional sequence-to-sequence model based on the MT5 architecture.
 *
 * @extends MT5PreTrainedModel
 */
export class MT5ForConditionalGeneration extends MT5PreTrainedModel {

    /**
     * Creates a new instance of the `MT5ForConditionalGeneration` class.
     * @param {any} config The model configuration.
     * @param {any} session The ONNX session containing the encoder weights.
     * @param {any} decoder_merged_session The ONNX session containing the merged decoder weights.
     * @param {GenerationConfig} generation_config The generation configuration.
     */
    constructor(config, session, decoder_merged_session, generation_config) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;
        this.generation_config = generation_config;

        this.num_decoder_layers = this.config.num_decoder_layers;
        this.num_decoder_heads = this.config.num_heads;
        this.decoder_dim_kv = this.config.d_kv;

        this.num_encoder_layers = this.config.num_layers;
        this.num_encoder_heads = this.config.num_heads;
        this.encoder_dim_kv = this.config.d_kv;
    }

    /**
     * Generates the start beams for the given input tokens and output sequence length.
     *
     * @param {any[]} inputs The input sequence.
     * @param {number} numOutputTokens The desired length of the output sequence.
     * @param {...*} args Additional arguments to pass to the `seq2seqStartBeams` function.
     * @returns {any[]} An array of `Beam` objects representing the start beams.
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new predicted token.
     * @param {any} beam The beam to update.
     * @param {number} newTokenId The index of the predicted token.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Runs the forward pass of the model on the given inputs.
     * @param {any} model_inputs The model inputs.
     * @returns {Promise<any>} A Promise that resolves to the model outputs.
     */
    async forward(model_inputs) {
        return await seq2seqForward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Bart models
export class BartPretrainedModel extends PreTrainedModel { };

/**
 * BART encoder and decoder model.
 * 
 * @hideconstructor
 * @extends BartPretrainedModel
 */
export class BartModel extends BartPretrainedModel {
    /**
     * Throws an error because the current model class (BartModel) is not compatible with `.generate()`.
     * 
     * @throws {Error} The current model class (BartModel) is not compatible with `.generate()`.
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (BartModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'BartForConditionalGeneration'}"
        )
    }
}

/**
 * BART model with a language model head for conditional generation.
 * @extends BartPretrainedModel
 */
export class BartForConditionalGeneration extends BartPretrainedModel {

    /**
     * Creates a new instance of the `BartForConditionalGeneration` class.
     * @param {Object} config The configuration object for the Bart model.
     * @param {Object} session The ONNX session used to execute the model.
     * @param {Object} decoder_merged_session The ONNX session used to execute the decoder.
     * @param {Object} generation_config The generation configuration object.
     */
    constructor(config, session, decoder_merged_session, generation_config) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;
        this.generation_config = generation_config;

        this.num_decoder_layers = this.config.decoder_layers;
        this.num_decoder_heads = this.config.decoder_attention_heads;
        this.decoder_dim_kv = this.config.d_model / this.num_decoder_heads;

        this.num_encoder_layers = this.config.encoder_layers;
        this.num_encoder_heads = this.config.encoder_attention_heads;
        this.encoder_dim_kv = this.config.d_model / this.num_encoder_heads;
    }

    /**
     * Returns the initial beam for generating output text.
     * @param {Object} inputs The input object containing the encoded input text.
     * @param {number} numOutputTokens The maximum number of output tokens to generate.
     * @param  {...any} args Additional arguments to pass to the sequence-to-sequence generation function.
     * @returns {any} The initial beam for generating output text.
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * Updates the beam by appending the newly generated token ID to the list of output token IDs.
     * @param {any} beam The current beam being generated.
     * @param {number} newTokenId The ID of the newly generated token to append to the list of output token IDs.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Runs the forward pass of the model for a given set of inputs.
     * @param {Object} model_inputs The model inputs.
     * @returns {Promise<Object>} The model output.
     */
    async forward(model_inputs) {
        return await seq2seqForward(this, model_inputs);
    }
}

export class BartForSequenceClassification extends BartPretrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} An object containing the model's output logits for sequence classification.
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}

//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Roberta models
export class RobertaPreTrainedModel extends PreTrainedModel { }
export class RobertaModel extends RobertaPreTrainedModel { }

/**
 * RobertaForMaskedLM class for performing masked language modeling on Roberta models.
 * @extends RobertaPreTrainedModel
 */
export class RobertaForMaskedLM extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} returned object
     */
    async _call(model_inputs) {
        return new MaskedLMOutput(await super._call(model_inputs));
    }
}

/**
 * RobertaForSequenceClassification class for performing sequence classification on Roberta models.
 * @extends RobertaPreTrainedModel
 */
export class RobertaForSequenceClassification extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} returned object
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * RobertaForTokenClassification class for performing token classification on Roberta models.
 * @extends RobertaPreTrainedModel
 */
export class RobertaForTokenClassification extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} An object containing the model's output logits for token classification.
     */
    async _call(model_inputs) {
        return new TokenClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * RobertaForQuestionAnswering class for performing question answering on Roberta models.
 * @extends RobertaPreTrainedModel
 */
export class RobertaForQuestionAnswering extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} returned object
     */
    async _call(model_inputs) {
        return new QuestionAnsweringModelOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// XLMRoberta models
export class XLMRobertaPreTrainedModel extends PreTrainedModel { }
export class XLMRobertaModel extends XLMRobertaPreTrainedModel { }

/**
 * XLMRobertaForMaskedLM class for performing masked language modeling on XLMRoberta models.
 * @extends XLMRobertaPreTrainedModel
 */
export class XLMRobertaForMaskedLM extends XLMRobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} returned object
     */
    async _call(model_inputs) {
        return new MaskedLMOutput(await super._call(model_inputs));
    }
}

/**
 * XLMRobertaForSequenceClassification class for performing sequence classification on XLMRoberta models.
 * @extends XLMRobertaPreTrainedModel
 */
export class XLMRobertaForSequenceClassification extends XLMRobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} returned object
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * XLMRobertaForTokenClassification class for performing token classification on XLMRoberta models.
 * @extends XLMRobertaPreTrainedModel
 */
export class XLMRobertaForTokenClassification extends XLMRobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} An object containing the model's output logits for token classification.
     */
    async _call(model_inputs) {
        return new TokenClassifierOutput(await super._call(model_inputs));
    }
}

/**
 * XLMRobertaForQuestionAnswering class for performing question answering on XLMRoberta models.
 * @extends XLMRobertaPreTrainedModel
 */
export class XLMRobertaForQuestionAnswering extends XLMRobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} returned object
     */
    async _call(model_inputs) {
        return new QuestionAnsweringModelOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// T5 models
export class WhisperPreTrainedModel extends PreTrainedModel { };

/**
 * WhisperModel class for training Whisper models without a language model head.
 * @extends WhisperPreTrainedModel
 */
export class WhisperModel extends WhisperPreTrainedModel {
    /**
     * Throws an error when attempting to generate output since this model doesn't have a language model head.
     * @throws Error
     * @returns {Promise<any>}
     * @param {any[]} args
     */
    async generate(...args) {
        throw Error(
            "The current model class (WhisperModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'WhisperForConditionalGeneration'}"
        )
    }
}

/**
 * WhisperForConditionalGeneration class for generating conditional outputs from Whisper models.
 * @extends WhisperPreTrainedModel
 */
export class WhisperForConditionalGeneration extends WhisperPreTrainedModel {

    /**
     * Creates a new instance of the `WhisperForConditionalGeneration` class.
     * @param {Object} config Configuration object for the model.
     * @param {Object} session ONNX Session object for the model.
     * @param {Object} decoder_merged_session ONNX Session object for the decoder.
     * @param {Object} generation_config Configuration object for the generation process.
     */
    constructor(config, session, decoder_merged_session, generation_config) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;
        this.generation_config = generation_config;

        this.num_decoder_layers = this.config.decoder_layers;
        this.num_decoder_heads = this.config.decoder_attention_heads;
        this.decoder_dim_kv = this.config.d_model / this.num_decoder_heads;

        this.num_encoder_layers = this.config.encoder_layers;
        this.num_encoder_heads = this.config.encoder_attention_heads;
        this.encoder_dim_kv = this.config.d_model / this.num_encoder_heads;


    }

    /**
     * @typedef {Object} WhisperGenerationConfig
     * @extends GenerationConfig
     * @property {boolean} [return_timestamps=null] Whether to return the timestamps with the text. This enables the `WhisperTimestampsLogitsProcessor`.
     * @property {boolean} [return_token_timestamps=null] Whether to return token-level timestamps
     * with the text. This can be used with or without the `return_timestamps` option. To get word-level
     * timestamps, use the tokenizer to group the tokens into words.
     * @property {number} [num_frames=null]  The number of audio frames available in this chunk. This is only used generating word-level timestamps.
     */

    /**
     * Generates outputs based on input and generation configuration.
     * @param {Object} inputs Input data for the model.
     * @param {WhisperGenerationConfig} generation_config Configuration object for the generation process.
     * @param {Object} logits_processor Optional logits processor object.
     * @returns {Promise<Object>} Promise object represents the generated outputs.
     */
    // @ts-ignore
    async generate(
        inputs,
        generation_config = null,
        logits_processor = null,
        // {
        //     return_timestamps = null,
        //     return_token_timestamps = null,
        //     language = null,
        //     task = null,
        // } = {},
    ) {
        // Create generation config object
        generation_config = this._get_generation_config(generation_config);


        // Whisper has additional options for returning timestamps
        generation_config.return_timestamps ??= false;

        // TODO add language and task

        if (generation_config.return_timestamps) {
            logits_processor = [new WhisperTimeStampLogitsProcessor(generation_config)]
        }

        if (generation_config.return_token_timestamps) {
            generation_config.output_attentions = true;
            generation_config.return_dict_in_generate = true;

            if (generation_config.task === 'translate') {
                console.warn("Token-level timestamps may not be reliable for task 'translate'.")
            }

            if (!generation_config.alignment_heads) {
                throw new Error(
                    "Model generation config has no `alignment_heads`, token-level timestamps not available. " +
                    "See https://gist.github.com/hollance/42e32852f24243b748ae6bc1f985b13a on how to add this property to the generation config."
                )
            }
        }

        const outputs = await super.generate(inputs, generation_config, logits_processor);

        if (generation_config.return_token_timestamps && generation_config.alignment_heads) {
            outputs["token_timestamps"] = this._extract_token_timestamps(
                outputs,
                generation_config.alignment_heads,
                generation_config.num_frames,
            )
        }

        return outputs
    }

    /**
     * Gets the start beams for generating outputs.
     * @param {Array} inputTokenIds Array of input token IDs.
     * @param {number} numOutputTokens Number of output tokens to generate.
     * @returns {Array} Array of start beams.
     */
    getStartBeams(inputTokenIds, numOutputTokens, ...args) {
        // arguments ignored in this case
        return seq2seqStartBeams(this, inputTokenIds, numOutputTokens, false);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam, {
            input_name: 'input_features',
        });
    }

    /**
     * Updates the beam by appending the newly generated token ID to the list of output token IDs.
     * @param {any} beam The current beam being generated.
     * @param {number} newTokenId The ID of the newly generated token to append to the list of output token IDs.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Runs the forward pass of the model for a given set of inputs.
     * @param {Object} model_inputs The model inputs.
     * @returns {Promise<Object>} The model output.
     */
    async forward(model_inputs) {
        return await seq2seqForward(this, model_inputs);
    }

    /**
     * Calculates token-level timestamps using the encoder-decoder cross-attentions and
     * dynamic time-warping (DTW) to map each output token to a position in the input audio.
     * @param {Object} generate_outputs Outputs generated by the model
     * @param {Tensor[][][]} generate_outputs.cross_attentions The cross attentions output by the model
     * @param {Tensor[][][]} generate_outputs.decoder_attentions The decoder attentions output by the model
     * @param {number[][]} generate_outputs.sequences The sequences output by the model
     * @param {number[][]} alignment_heads Alignment heads of the model
     * @param {number} [num_frames=null] Number of frames in the input audio.
     * @param {number} [time_precision=0.02] Precision of the timestamps in seconds
     * @returns {Tensor} tensor containing the timestamps in seconds for each predicted token
     */
    _extract_token_timestamps(generate_outputs, alignment_heads, num_frames = null, time_precision = 0.02) {
        if (!generate_outputs.cross_attentions) {
            throw new Error(
                "Model outputs must contain cross attentions to extract timestamps. " +
                "This is most likely because the model was not exported with `output_attentions=True`."
            )
        }

        let median_filter_width = this.config.median_filter_width;
        if (median_filter_width === undefined) {
            console.warn("Model config has no `median_filter_width`, using default value of 7.")
            median_filter_width = 7;
        }

        const batchedMatrices = generate_outputs.cross_attentions.map(batch => {
            // Create a list with `decoder_layers` elements, each a tensor of shape
            // (batch size, attention_heads, output length, input length).
            let cross_attentions = Array.from({ length: this.config.decoder_layers },
                (_, i) => cat(batch.map(x => x[i]), 2)
            );

            let weights = stack(alignment_heads.map(([l, h]) => {
                return num_frames
                    ? cross_attentions[l].slice(null, h, null, [0, num_frames])
                    : cross_attentions[l].slice(null, h);
            }));
            weights = weights.transpose(1, 0, 2, 3)

            let [std, calculatedMean] = std_mean(weights, -2, 0, true);

            // Normalize and smoothen the weights.
            let smoothedWeights = weights.clone(); // [1, 8, seqLength, 1500]

            for (let a = 0; a < smoothedWeights.dims[0]; ++a) {
                let aTensor = smoothedWeights[a]; // [8, seqLength, 1500]

                for (let b = 0; b < aTensor.dims[0]; ++b) {
                    let bTensor = aTensor[b]; // [seqLength, 1500]

                    const stdTensor = std[a][b][0]; // [1500]
                    const meanTensor = calculatedMean[a][b][0]; // [1500]

                    for (let c = 0; c < bTensor.dims[0]; ++c) {

                        let cTensor = bTensor[c]; // [1500]
                        for (let d = 0; d < cTensor.data.length; ++d) {
                            cTensor.data[d] = (cTensor.data[d] - meanTensor.data[d]) / stdTensor.data[d]
                        }

                        // Apply median filter.
                        cTensor.data.set(medianFilter(cTensor.data, median_filter_width))
                    }
                }
            }

            // Average the different cross-attention heads.
            const matrix = mean(smoothedWeights, 1);
            return matrix;
        });

        const timestampsShape = [generate_outputs.sequences.length, generate_outputs.sequences[0].length];

        const timestamps = new Tensor(
            'float32',
            new Float32Array(timestampsShape[0] * timestampsShape[1]),
            timestampsShape
        );

        // Perform dynamic time warping on each element of the batch.
        for (let batch_idx = 0; batch_idx < timestampsShape[0]; ++batch_idx) {
            // NOTE: Since we run only one batch at a time, we can squeeze to get the same dimensions
            // as the python implementation
            const matrix = batchedMatrices[batch_idx].neg().squeeze_(0);
            let [text_indices, time_indices] = dynamicTimeWarping(matrix);

            let diffs = Array.from({ length: text_indices.length - 1 }, (v, i) => text_indices[i + 1] - text_indices[i]);
            let jumps = mergeArrays([1], diffs).map(x => !!x); // convert to boolean

            let jump_times = [];
            for (let i = 0; i < jumps.length; ++i) {
                if (jumps[i]) {
                    jump_times.push(time_indices[i] * time_precision);
                    // NOTE: No point in rounding here, since we set to Float32Array later
                }
            }
            timestamps[batch_idx].data.set(jump_times, 1)
        }

        return timestamps;
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
/**
 * Vision Encoder-Decoder model based on OpenAI's GPT architecture for image captioning and other vision tasks
 * @extends PreTrainedModel
 */
export class VisionEncoderDecoderModel extends PreTrainedModel {
    /**
     * Creates a new instance of the `VisionEncoderDecoderModel` class.
     * @param {Object} config The configuration object specifying the hyperparameters and other model settings.
     * @param {Object} session The ONNX session containing the encoder model.
     * @param {any} decoder_merged_session The ONNX session containing the merged decoder model.
     */
    constructor(config, session, decoder_merged_session) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;

        this.num_layers = this.config.decoder.n_layer;
        this.num_heads = this.config.decoder.n_head;
        this.dim_kv = this.config.decoder.n_embd / this.num_heads;
    }

    /**
     * Generate beam search outputs for the given input pixels and number of output tokens.
     *
     * @param {array} inputs The input pixels as a Tensor.
     * @param {number} numOutputTokens The number of output tokens to generate.
     * @param {...*} args Optional additional arguments to pass to seq2seqStartBeams.
     * @returns {any} An array of Beam objects representing the top-K output sequences.
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return seq2seqRunBeam(this, beam, {
            input_name: 'pixel_values',
        });
    }

    /**
     * Update the given beam with the additional predicted token ID.
     *
     * @param {any} beam The current beam.
     * @param {number} newTokenId The new predicted token ID to add to the beam's output sequence.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Compute the forward pass of the model on the given input tensors.
     *
     * @param {Object} model_inputs The input tensors as an object with keys 'pixel_values' and 'decoder_input_ids'.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await seq2seqForward(this, model_inputs, {
            add_decoder_pkv: false
        })
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// CLIP models
export class CLIPPreTrainedModel extends PreTrainedModel { }

/**
 * CLIP Text and Vision Model with a projection layers on top
 * 
 * **Example:** Perform zero-shot image classification with a `CLIPModel`.
 * 
 * ```javascript
 * import { AutoTokenizer, AutoProcessor, CLIPModel, RawImage } from '@xenova/transformers';
 * 
 * // Load tokenizer, processor, and model
 * let tokenizer = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch16');
 * let processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch16');
 * let model = await CLIPModel.from_pretrained('Xenova/clip-vit-base-patch16');
 * 
 * // Run tokenization
 * let texts = ['a photo of a car', 'a photo of a football match']
 * let text_inputs = tokenizer(texts, { padding: true, truncation: true });
 * 
 * // Read image and run processor
 * let image = await RawImage.read('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/football-match.jpg');
 * let image_inputs = await processor(image);
 * 
 * // Run model with both text and pixel inputs
 * let output = await model({ ...text_inputs, ...image_inputs });
 * // {
 * //   logits_per_image: Tensor {
 * //     dims: [ 1, 2 ],
 * //     data: Float32Array(2) [ 18.579734802246094, 24.31830596923828 ],
 * //   },
 * //   logits_per_text: Tensor {
 * //     dims: [ 2, 1 ],
 * //     data: Float32Array(2) [ 18.579734802246094, 24.31830596923828 ],
 * //   },
 * //   text_embeds: Tensor {
 * //     dims: [ 2, 512 ],
 * //     data: Float32Array(1024) [ ... ],
 * //   },
 * //   image_embeds: Tensor {
 * //     dims: [ 1, 512 ],
 * //     data: Float32Array(512) [ ... ],
 * //   }
 * // }
 * ```
 */
export class CLIPModel extends CLIPPreTrainedModel { }

/**
 * CLIP Text Model with a projection layer on top (a linear layer on top of the pooled output)
 * 
 * **Example:** Compute text embeddings with `CLIPTextModelWithProjection`.
 * 
 * ```javascript
 * import { AutoTokenizer, CLIPTextModelWithProjection } from '@xenova/transformers';
 * 
 * // Load tokenizer and text model
 * const tokenizer = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch16');
 * const text_model = await CLIPTextModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch16');
 * 
 * // Run tokenization
 * let texts = ['a photo of a car', 'a photo of a football match'];
 * let text_inputs = tokenizer(texts, { padding: true, truncation: true });
 * 
 * // Compute embeddings
 * const { text_embeds } = await text_model(text_inputs);
 * // Tensor {
 * //   dims: [ 2, 512 ],
 * //   type: 'float32',
 * //   data: Float32Array(1024) [ ... ],
 * //   size: 1024
 * // }
 * ```
 */
export class CLIPTextModelWithProjection extends CLIPPreTrainedModel {

    /** @type {PreTrainedModel.from_pretrained} */
    static async from_pretrained(pretrained_model_name_or_path, options = {}) {
        // Update default model file name if not provided
        options.model_file_name ??= 'text_model';
        return super.from_pretrained(pretrained_model_name_or_path, options);
    }
}

/**
 * CLIP Vision Model with a projection layer on top (a linear layer on top of the pooled output)
 * 
 * **Example:** Compute vision embeddings with `CLIPVisionModelWithProjection`.
 * 
 * ```javascript
 * import { AutoProcessor, CLIPVisionModelWithProjection, RawImage} from '@xenova/transformers';
 * 
 * // Load processor and vision model
 * const processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch16');
 * const vision_model = await CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch16');
 * 
 * // Read image and run processor
 * let image = await RawImage.read('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/football-match.jpg');
 * let image_inputs = await processor(image);
 * 
 * // Compute embeddings
 * const { image_embeds } = await vision_model(image_inputs);
 * // Tensor {
 * //   dims: [ 1, 512 ],
 * //   type: 'float32',
 * //   data: Float32Array(512) [ ... ],
 * //   size: 512
 * // }
 * ```
 */
export class CLIPVisionModelWithProjection extends CLIPPreTrainedModel {
    /** @type {PreTrainedModel.from_pretrained} */
    static async from_pretrained(pretrained_model_name_or_path, options = {}) {
        // Update default model file name if not provided
        options.model_file_name ??= 'vision_model';
        return super.from_pretrained(pretrained_model_name_or_path, options);
    }
}

//////////////////////////////////////////////////

//////////////////////////////////////////////////
// GPT2 models
export class GPT2PreTrainedModel extends PreTrainedModel {
    /**
     * Creates a new instance of the `GPT2PreTrainedModel` class.
     * @param {Object} config The configuration of the model.
     * @param {any} session The ONNX session containing the model weights.
     */
    constructor(config, session) {
        super(config, session);

        // config doesn't contain pad_token_id, so we assume it is the eos_token_id
        this.config.pad_token_id = this.config.eos_token_id

        this.num_heads = this.config.n_head
        this.num_layers = this.config.n_layer
        this.dim_kv = this.config.n_embd / this.num_heads;
    }
}

export class GPT2Model extends GPT2PreTrainedModel {

    /**
     * GPT2Model is not compatible with `.generate()`, as it doesn't have a language model head.
     * @param  {...any} args 
     * @throws {Error}
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (GPT2Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'GPT2LMHeadModel'}"
        )
    }
}

/**
 * GPT-2 language model head on top of the GPT-2 base model. This model is suitable for text generation tasks.
 * @extends GPT2PreTrainedModel
 */
export class GPT2LMHeadModel extends GPT2PreTrainedModel {

    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds The input token ids.
     * @param {number} numOutputTokens The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return decoderStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await decoderRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam The Beam object representing the beam.
     * @param {number} newTokenId The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return decoderUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {Object} model_inputs The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await decoderForward(this, model_inputs);
    }

}
// export class GPT2ForSequenceClassification extends GPT2PreTrainedModel {
// TODO
// }
//////////////////////////////////////////////////
export class GPTNeoPreTrainedModel extends PreTrainedModel {
    /**
     * Creates a new instance of the `GPTNeoPreTrainedModel` class.
     * @param {Object} config The configuration of the model.
     * @param {any} session The ONNX session containing the model weights.
     */
    constructor(config, session) {
        super(config, session);

        // config doesn't contain pad_token_id, so we assume it is the eos_token_id
        this.config.pad_token_id = this.config.eos_token_id

        this.num_heads = this.config.num_heads;
        this.num_layers = this.config.num_layers;
        this.dim_kv = this.config.hidden_size / this.num_heads;
    }
}
export class GPTNeoModel extends GPTNeoPreTrainedModel {
    /**
     * 
     * @param  {...any} args 
     * @throws {Error}
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (GPTNeoModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'GPTNeoForCausalLM'}"
        )
    }
}

export class GPTNeoForCausalLM extends GPTNeoPreTrainedModel {

    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds The input token ids.
     * @param {number} numOutputTokens The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return decoderStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await decoderRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam The Beam object representing the beam.
     * @param {number} newTokenId The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return decoderUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {Object} model_inputs The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await decoderForward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// GPTBigCode models
export class GPTBigCodePreTrainedModel extends PreTrainedModel {
    /**
     * Creates a new instance of the `GPTBigCodePreTrainedModel` class.
     * @param {Object} config The configuration of the model.
     * @param {any} session The ONNX session containing the model weights.
     */
    constructor(config, session) {
        super(config, session);

        // config doesn't contain pad_token_id, so we assume it is the eos_token_id
        this.config.pad_token_id = this.config.eos_token_id

        this.num_heads = this.config.n_head
        this.num_layers = this.config.n_layer
        this.dim_kv = this.config.n_embd / this.num_heads;
    }
}

export class GPTBigCodeModel extends GPTBigCodePreTrainedModel {
    /**
     * 
     * @param  {...any} args 
     * @throws {Error}
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (GPTBigCodeModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'GPTBigCodeForCausalLM'}"
        )
    }
}

export class GPTBigCodeForCausalLM extends GPTBigCodePreTrainedModel {

    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds The input token ids.
     * @param {number} numOutputTokens The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return decoderStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await decoderRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam The Beam object representing the beam.
     * @param {number} newTokenId The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return decoderUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {Object} model_inputs The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await decoderForward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// CodeGen models
export class CodeGenPreTrainedModel extends PreTrainedModel {
    /**
     * Creates a new instance of the `CodeGenPreTrainedModel` class.
    * @param {Object} config The model configuration object.
    * @param {Object} session The ONNX session object.
    */
    constructor(config, session) {
        super(config, session);

        // config doesn't contain pad_token_id, so we assume it is the eos_token_id
        this.config.pad_token_id = this.config.eos_token_id

        this.num_heads = this.config.n_head
        this.num_layers = this.config.n_layer
        this.dim_kv = this.config.n_embd / this.num_heads;
    }
}
/**
 * CodeGenModel is a class representing a code generation model without a language model head.
 * 
 * @extends CodeGenPreTrainedModel
 */
export class CodeGenModel extends CodeGenPreTrainedModel {
    /**
     * Throws an error indicating that the current model class is not compatible with `.generate()`,
     * as it doesn't have a language model head.
     * 
     * @throws {Error} The current model class is not compatible with `.generate()`
     * 
     * @param  {...any} args Arguments passed to the generate function
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (CodeGenModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'CodeGenForCausalLM'}"
        )
    }
}

/**
 * CodeGenForCausalLM is a class that represents a code generation model based on the GPT-2 architecture. It extends the `CodeGenPreTrainedModel` class.
 * @extends CodeGenPreTrainedModel
 */
export class CodeGenForCausalLM extends CodeGenPreTrainedModel {

    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds The input token ids.
     * @param {number} numOutputTokens The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return decoderStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await decoderRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam The Beam object representing the beam.
     * @param {number} newTokenId The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return decoderUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {Object} model_inputs The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await decoderForward(this, model_inputs);
    }

}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// LLama models

/**
 * The bare LLama Model outputting raw hidden-states without any specific head on top.
 */
export class LlamaPreTrainedModel extends PreTrainedModel {
    /**
     * Creates a new instance of the `LlamaPreTrainedModel` class.
    * @param {Object} config The model configuration object.
    * @param {Object} session The ONNX session object.
    */
    constructor(config, session) {
        super(config, session);

        // config doesn't contain pad_token_id, so we assume it is the eos_token_id
        this.config.pad_token_id = this.config.eos_token_id

        this.num_heads = this.config.num_attention_heads
        this.num_layers = this.config.num_hidden_layers
        this.dim_kv = this.config.hidden_size / this.num_heads;
    }
}
/**
 * The bare LLaMA Model outputting raw hidden-states without any specific head on top.
 */
export class LlamaModel extends LlamaPreTrainedModel {
    /**
     * Throws an error indicating that the current model class is not compatible with `.generate()`,
     * as it doesn't have a language model head.
     * 
     * @throws {Error} The current model class is not compatible with `.generate()`
     * 
     * @param  {...any} args Arguments passed to the generate function
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (LlamaModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'LlamaForCausalLM'}"
        )
    }
}

export class LlamaForCausalLM extends LlamaPreTrainedModel {

    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds The input token ids.
     * @param {number} numOutputTokens The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return decoderStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await decoderRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam The Beam object representing the beam.
     * @param {number} newTokenId The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return decoderUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {Object} model_inputs The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await decoderForward(this, model_inputs);
    }

}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
export class ViTPreTrainedModel extends PreTrainedModel { }
export class ViTModel extends ViTPreTrainedModel { }
export class ViTForImageClassification extends ViTPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
export class MobileViTPreTrainedModel extends PreTrainedModel { }
export class MobileViTModel extends MobileViTPreTrainedModel { }
export class MobileViTForImageClassification extends MobileViTPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}
// TODO: MobileViTForSemanticSegmentation

//////////////////////////////////////////////////



//////////////////////////////////////////////////
export class DetrPreTrainedModel extends PreTrainedModel { }
export class DetrModel extends DetrPreTrainedModel { }
export class DetrForObjectDetection extends DetrPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    async _call(model_inputs) {
        return new DetrObjectDetectionOutput(await super._call(model_inputs));
    }
}

export class DetrForSegmentation extends DetrPreTrainedModel {
    /**
     * Runs the model with the provided inputs
     * @param {Object} model_inputs Model inputs
     * @returns {Promise<DetrSegmentationOutput>} Object containing segmentation outputs
     */
    async _call(model_inputs) {
        return new DetrSegmentationOutput(await super._call(model_inputs));
    }
}

export class DetrObjectDetectionOutput extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.logits Classification logits (including no-object) for all queries.
     * @param {Tensor} output.pred_boxes Normalized boxes coordinates for all queries, represented as (center_x, center_y, width, height).
     * These values are normalized in [0, 1], relative to the size of each individual image in the batch (disregarding possible padding).
     */
    constructor({ logits, pred_boxes }) {
        super();
        this.logits = logits;
        this.pred_boxes = pred_boxes;
    }
}

export class DetrSegmentationOutput extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.logits The output logits of the model.
     * @param {Tensor} output.pred_boxes Predicted boxes.
     * @param {Tensor} output.pred_masks Predicted masks.
     */
    constructor({ logits, pred_boxes, pred_masks }) {
        super();
        this.logits = logits;
        this.pred_boxes = pred_boxes;
        this.pred_masks = pred_masks;
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
export class DeiTPreTrainedModel extends PreTrainedModel { }
export class DeiTModel extends DeiTPreTrainedModel { }
export class DeiTForImageClassification extends DeiTPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
export class SwinPreTrainedModel extends PreTrainedModel { }
export class SwinModel extends SwinPreTrainedModel { }
export class SwinForImageClassification extends SwinPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
export class YolosPreTrainedModel extends PreTrainedModel { }
export class YolosModel extends YolosPreTrainedModel { }
export class YolosForObjectDetection extends YolosPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    async _call(model_inputs) {
        return new YolosObjectDetectionOutput(await super._call(model_inputs));
    }
}

export class YolosObjectDetectionOutput extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.logits Classification logits (including no-object) for all queries.
     * @param {Tensor} output.pred_boxes Normalized boxes coordinates for all queries, represented as (center_x, center_y, width, height).
     * These values are normalized in [0, 1], relative to the size of each individual image in the batch (disregarding possible padding).
     */
    constructor({ logits, pred_boxes }) {
        super();
        this.logits = logits;
        this.pred_boxes = pred_boxes;
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
export class SamPreTrainedModel extends PreTrainedModel { }
export class SamModel extends SamPreTrainedModel {
    /**
     * @param {Object} model_inputs
     * @param {Tensor} model_inputs.pixel_values Pixel values as a Tensor with shape `(batch_size, num_channels, height, width)`.
     * @param {Tensor} model_inputs.input_points Input 2D spatial points with shape `(batch_size, num_points, 2)`. This is used by the prompt encoder to encode the prompt.
     * @todo Add support for `input_labels`, `input_boxes`, `input_masks`, and `image_embeddings`.
     */
    async _call(model_inputs) {
        return new SamImageSegmentationOutput(await super._call(model_inputs));
    }
}


/**
 * Base class for Segment-Anything model's output.
 */
export class SamImageSegmentationOutput extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.iou_scores The output logits of the model.
     * @param {Tensor} output.pred_masks Predicted boxes.
     */
    constructor({ iou_scores, pred_masks }) {
        super();
        this.iou_scores = iou_scores;
        this.pred_masks = pred_masks;
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// MarianMT models
export class MarianPreTrainedModel extends PreTrainedModel { };

export class MarianModel extends MarianPreTrainedModel {
    /**
     * 
     * @param  {...any} args 
     * @throws {Error}
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (MarianModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'MarianMTModel'}"
        )
    }
}

export class MarianMTModel extends MarianPreTrainedModel {

    /**
     * Creates a new instance of the `MarianMTModel` class.
    * @param {Object} config The model configuration object.
    * @param {Object} session The ONNX session object.
    * @param {any} decoder_merged_session 
    * @param {any} generation_config 
    */
    constructor(config, session, decoder_merged_session, generation_config) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;
        this.generation_config = generation_config;

        this.num_decoder_layers = this.config.decoder_layers;
        this.num_decoder_heads = this.config.decoder_attention_heads;
        this.decoder_dim_kv = this.config.d_model / this.num_decoder_heads;

        this.num_encoder_layers = this.config.encoder_layers;
        this.num_encoder_heads = this.config.encoder_attention_heads;
        this.encoder_dim_kv = this.config.d_model / this.num_encoder_heads;
    }

    /**
     * Initializes and returns the beam for text generation task
     * @param {any[]} inputs The input token ids.
     * @param {number} numOutputTokens The number of tokens to be generated.
     * @returns {any} A Beam object representing the initialized beam.
     * @param {any[]} args
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * @param {any} beam
     * @param {any} newTokenId
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * @param {any} model_inputs
     * @returns {Promise<Seq2SeqLMOutput>}
     */
    async forward(model_inputs) {
        return await seq2seqForward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// M2M100 models
export class M2M100PreTrainedModel extends PreTrainedModel { };

export class M2M100Model extends M2M100PreTrainedModel {
    /**
     * 
     * @param  {...any} args 
     * @throws {Error}
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (M2M100Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'M2M100ForConditionalGeneration'}"
        )
    }
}

export class M2M100ForConditionalGeneration extends M2M100PreTrainedModel {

    /**
     * Creates a new instance of the `M2M100ForConditionalGeneration` class.
    * @param {Object} config The model configuration object.
    * @param {Object} session The ONNX session object.
    * @param {any} decoder_merged_session 
    * @param {any} generation_config 
    */
    constructor(config, session, decoder_merged_session, generation_config) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;
        this.generation_config = generation_config;

        this.num_decoder_layers = this.config.decoder_layers;
        this.num_decoder_heads = this.config.decoder_attention_heads;
        this.decoder_dim_kv = this.config.d_model / this.num_decoder_heads;

        this.num_encoder_layers = this.config.encoder_layers;
        this.num_encoder_heads = this.config.encoder_attention_heads;
        this.encoder_dim_kv = this.config.d_model / this.num_encoder_heads;
    }


    /**
     * Initializes and returns the beam for text generation task
     * @param {any[]} inputs The input token ids.
     * @param {number} numOutputTokens The number of tokens to be generated.
     * @returns {any} A Beam object representing the initialized beam.
     * @param {any[]} args
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * @param {any} beam
     * @param {any} newTokenId
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * @param {any} model_inputs
     * @returns {Promise<Seq2SeqLMOutput>}
     */
    async forward(model_inputs) {
        return await seq2seqForward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Wav2Vec2 models
export class Wav2Vec2PreTrainedModel extends PreTrainedModel { };

/**
 * The bare Wav2Vec2 Model transformer outputting raw hidden-states without any specific head on top.
 * 
 * **Example:** Load and run an `Wav2Vec2Model` for feature extraction.
 * 
 * ```javascript
 * import { AutoProcessor, read_audio } from '@xenova/transformers';
 * 
 * // Read and preprocess audio
 * const processor = await AutoProcessor.from_pretrained('Xenova/mms-300m');
 * const audio = await read_audio('https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/mlk.flac', 16000);
 * const inputs = await processor(audio);
 * 
 * // Run model with inputs
 * const model = await AutoModel.from_pretrained('Xenova/mms-300m');
 * const output = await model(inputs);
 * // {
 * //   last_hidden_state: Tensor {
 * //     dims: [ 1, 1144, 1024 ],
 * //     type: 'float32',
 * //     data: Float32Array(1171456) [ ... ],
 * //     size: 1171456
 * //   }
 * // }
 * ```
 */
export class Wav2Vec2Model extends Wav2Vec2PreTrainedModel { }

export class Wav2Vec2ForCTC extends Wav2Vec2PreTrainedModel {
    /**
     * @param {Object} model_inputs
     * @param {Tensor} model_inputs.input_values Float values of input raw speech waveform.
     * @param {Tensor} model_inputs.attention_mask Mask to avoid performing convolution and attention on padding token indices. Mask values selected in [0, 1]
     */
    async _call(model_inputs) {
        return new CausalLMOutput(await super._call(model_inputs));
    }
}

export class Wav2Vec2ForSequenceClassification extends Wav2Vec2PreTrainedModel {
    /**
     * Calls the model on new inputs.
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} An object containing the model's output logits for sequence classification.
     */
    async _call(model_inputs) {
        return new SequenceClassifierOutput(await super._call(model_inputs));
    }
}


//////////////////////////////////////////////////

//////////////////////////////////////////////////
// AutoModels, used to simplify construction of PreTrainedModels
// (uses config to instantiate correct class)

/**
 * Base class of all AutoModels. Contains the `from_pretrained` function
 * which is used to instantiate pretrained models.
 */
export class PretrainedMixin {
    /**
     * Mapping from model type to model class.
     * @type {Map<string, Object>[]}
     */
    static MODEL_CLASS_MAPPINGS = null;

    /**
     * Whether to attempt to instantiate the base class (`PretrainedModel`) if 
     * the model type is not found in the mapping.
     */
    static BASE_IF_FAIL = false;


    /** @type {PreTrainedModel.from_pretrained} */
    static async from_pretrained(pretrained_model_name_or_path, {
        quantized = true,
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
        model_file_name = null,
    } = {}) {

        let options = {
            quantized,
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
            model_file_name,
        }
        config = await AutoConfig.from_pretrained(pretrained_model_name_or_path, options);
        if (!options.config) {
            // If no config was passed, reuse this config for future processing
            options.config = config;
        }

        if (!this.MODEL_CLASS_MAPPINGS) {
            throw new Error("`MODEL_CLASS_MAPPINGS` not implemented for this type of `AutoClass`: " + this.name);
        }

        let modelClass;
        for (let MODEL_CLASS_MAPPING of this.MODEL_CLASS_MAPPINGS) {
            modelClass = MODEL_CLASS_MAPPING.get(config.model_type);
            if (!modelClass) {
                continue; // Item not found in this mapping
            }

            return await modelClass.from_pretrained(pretrained_model_name_or_path, options);
        }

        if (this.BASE_IF_FAIL) {
            console.warn(`Unknown model class "${config.model_type}", attempting to construct from base class.`);
            return await PreTrainedModel.from_pretrained(pretrained_model_name_or_path, options);
        } else {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }
}

const MODEL_MAPPING_NAMES_ENCODER_ONLY = new Map([
    ['bert', BertModel],
    ['deberta', DebertaModel],
    ['deberta-v2', DebertaV2Model],
    ['mpnet', MPNetModel],
    ['albert', AlbertModel],
    ['distilbert', DistilBertModel],
    ['roberta', RobertaModel],
    ['xlm-roberta', XLMRobertaModel],
    ['clip', CLIPModel],
    ['mobilebert', MobileBertModel],
    ['squeezebert', SqueezeBertModel],
    ['wav2vec2', Wav2Vec2Model],

    ['detr', DetrModel],
    ['vit', ViTModel],
    ['mobilevit', MobileViTModel],
    ['deit', DeiTModel],
    ['swin', SwinModel],
    ['yolos', YolosModel],

    ['sam', SamModel], // TODO change to encoder-decoder when model is split correctly
]);

const MODEL_MAPPING_NAMES_ENCODER_DECODER = new Map([
    ['t5', T5Model],
    ['mt5', MT5Model],
    ['bart', BartModel],
    ['marian', MarianModel],
    ['whisper', WhisperModel],
    ['m2m_100', M2M100Model],
]);


const MODEL_MAPPING_NAMES_DECODER_ONLY = new Map([
    ['gpt2', GPT2Model],
    ['gpt_bigcode', GPTBigCodeModel],
    ['gpt_neo', GPTNeoModel],
    ['codegen', CodeGenModel],
    ['llama', LlamaModel],
]);

const MODEL_FOR_SEQUENCE_CLASSIFICATION_MAPPING_NAMES = new Map([
    ['bert', BertForSequenceClassification],
    ['deberta', DebertaForSequenceClassification],
    ['deberta-v2', DebertaV2ForSequenceClassification],
    ['mpnet', MPNetForSequenceClassification],
    ['albert', AlbertForSequenceClassification],
    ['distilbert', DistilBertForSequenceClassification],
    ['roberta', RobertaForSequenceClassification],
    ['xlm-roberta', XLMRobertaForSequenceClassification],
    ['bart', BartForSequenceClassification],
    ['mobilebert', MobileBertForSequenceClassification],
    ['squeezebert', SqueezeBertForSequenceClassification],
]);

const MODEL_FOR_TOKEN_CLASSIFICATION_MAPPING_NAMES = new Map([
    ['bert', BertForTokenClassification],
    ['deberta', DebertaForTokenClassification],
    ['deberta-v2', DebertaV2ForTokenClassification],
    ['mpnet', MPNetForTokenClassification],
    ['distilbert', DistilBertForTokenClassification],
    ['roberta', RobertaForTokenClassification],
    ['xlm-roberta', XLMRobertaForTokenClassification],
]);

const MODEL_FOR_SEQ_2_SEQ_MAPPING_NAMES = new Map([
    ['t5', T5ForConditionalGeneration],
    ['mt5', MT5ForConditionalGeneration],
    ['bart', BartForConditionalGeneration],
    ['whisper', WhisperForConditionalGeneration],
    ['marian', MarianMTModel],
    ['m2m_100', M2M100ForConditionalGeneration],
]);

const MODEL_WITH_LM_HEAD_MAPPING_NAMES = new Map([
    ['gpt2', GPT2LMHeadModel],
    ['gpt_bigcode', GPTBigCodeForCausalLM],
    ['gpt_neo', GPTNeoForCausalLM],
    ['codegen', CodeGenForCausalLM],
    ['llama', LlamaForCausalLM],
]);

const MODEL_FOR_MASKED_LM_MAPPING_NAMES = new Map([
    ['bert', BertForMaskedLM],
    ['deberta', DebertaForMaskedLM],
    ['deberta-v2', DebertaV2ForMaskedLM],
    ['mpnet', MPNetForMaskedLM],
    ['albert', AlbertForMaskedLM],
    ['distilbert', DistilBertForMaskedLM],
    ['roberta', RobertaForMaskedLM],
    ['xlm-roberta', XLMRobertaForMaskedLM],
    ['mobilebert', MobileBertForMaskedLM],
    ['squeezebert', SqueezeBertForMaskedLM],
]);

const MODEL_FOR_QUESTION_ANSWERING_MAPPING_NAMES = new Map([
    ['bert', BertForQuestionAnswering],
    ['deberta', DebertaForQuestionAnswering],
    ['deberta-v2', DebertaV2ForQuestionAnswering],
    ['mpnet', MPNetForQuestionAnswering],
    ['albert', AlbertForQuestionAnswering],
    ['distilbert', DistilBertForQuestionAnswering],
    ['roberta', RobertaForQuestionAnswering],
    ['xlm-roberta', XLMRobertaForQuestionAnswering],
    ['mobilebert', MobileBertForQuestionAnswering],
    ['squeezebert', SqueezeBertForQuestionAnswering],
]);

const MODEL_FOR_VISION_2_SEQ_MAPPING_NAMES = new Map([
    ['vision-encoder-decoder', VisionEncoderDecoderModel],
]);

const MODEL_FOR_IMAGE_CLASSIFICATION_MAPPING_NAMES = new Map([
    ['vit', ViTForImageClassification],
    ['mobilevit', MobileViTForImageClassification],
    ['deit', DeiTForImageClassification],
    ['swin', SwinForImageClassification],
]);

const MODEL_FOR_OBJECT_DETECTION_MAPPING_NAMES = new Map([
    ['detr', DetrForObjectDetection],
    ['yolos', YolosForObjectDetection],
]);

const MODEL_FOR_IMAGE_SEGMENTATION_MAPPING_NAMES = new Map([
    ['detr', DetrForSegmentation],
]);

const MODEL_FOR_MASK_GENERATION_MAPPING_NAMES = new Map([
    ['sam', SamModel],
]);

const MODEL_FOR_CTC_MAPPING_NAMES = new Map([
    ['wav2vec2', Wav2Vec2ForCTC],
]);

const MODEL_FOR_AUDIO_CLASSIFICATION_MAPPING_NAMES = new Map([
    ['wav2vec2', Wav2Vec2ForSequenceClassification],
]);


const MODEL_CLASS_TYPE_MAPPING = [
    [MODEL_MAPPING_NAMES_ENCODER_ONLY, EncoderOnlyModelType],
    [MODEL_MAPPING_NAMES_ENCODER_DECODER, EncoderDecoderModelType],
    [MODEL_MAPPING_NAMES_DECODER_ONLY, DecoderOnlyModelType],
    [MODEL_FOR_SEQUENCE_CLASSIFICATION_MAPPING_NAMES, EncoderOnlyModelType],
    [MODEL_FOR_TOKEN_CLASSIFICATION_MAPPING_NAMES, EncoderOnlyModelType],
    [MODEL_FOR_SEQ_2_SEQ_MAPPING_NAMES, Seq2SeqModelType],
    [MODEL_WITH_LM_HEAD_MAPPING_NAMES, DecoderOnlyModelType],
    [MODEL_FOR_MASKED_LM_MAPPING_NAMES, EncoderOnlyModelType],
    [MODEL_FOR_QUESTION_ANSWERING_MAPPING_NAMES, EncoderOnlyModelType],
    [MODEL_FOR_VISION_2_SEQ_MAPPING_NAMES, EncoderDecoderModelType],
    [MODEL_FOR_IMAGE_CLASSIFICATION_MAPPING_NAMES, EncoderOnlyModelType],
    [MODEL_FOR_IMAGE_SEGMENTATION_MAPPING_NAMES, EncoderOnlyModelType],
    [MODEL_FOR_OBJECT_DETECTION_MAPPING_NAMES, EncoderOnlyModelType],
    [MODEL_FOR_MASK_GENERATION_MAPPING_NAMES, EncoderOnlyModelType],
    [MODEL_FOR_CTC_MAPPING_NAMES, EncoderOnlyModelType],
    [MODEL_FOR_AUDIO_CLASSIFICATION_MAPPING_NAMES, EncoderOnlyModelType],
];

for (const [mappings, type] of MODEL_CLASS_TYPE_MAPPING) {
    // @ts-ignore
    for (const model of mappings.values()) {
        // @ts-ignore
        MODEL_TYPE_MAPPING.set(model.name, type);
    }
}


/**
 * Helper class which is used to instantiate pretrained models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModel.from_pretrained('bert-base-uncased');
 */
export class AutoModel extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_MAPPING_NAMES_ENCODER_ONLY, MODEL_MAPPING_NAMES_ENCODER_DECODER, MODEL_MAPPING_NAMES_DECODER_ONLY];
    static BASE_IF_FAIL = true;
}

/**
 * Helper class which is used to instantiate pretrained sequence classification models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForSequenceClassification.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english');
 */
export class AutoModelForSequenceClassification extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_SEQUENCE_CLASSIFICATION_MAPPING_NAMES];
}

/**
 * Helper class which is used to instantiate pretrained token classification models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForTokenClassification.from_pretrained('Davlan/distilbert-base-multilingual-cased-ner-hrl');
 */
export class AutoModelForTokenClassification extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_TOKEN_CLASSIFICATION_MAPPING_NAMES];
}

/**
 * Helper class which is used to instantiate pretrained sequence-to-sequence models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForSeq2SeqLM.from_pretrained('t5-small');
 */
export class AutoModelForSeq2SeqLM extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_SEQ_2_SEQ_MAPPING_NAMES];
}

/**
 * Helper class which is used to instantiate pretrained causal language models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForCausalLM.from_pretrained('gpt2');
 */
export class AutoModelForCausalLM extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_WITH_LM_HEAD_MAPPING_NAMES];
}

/**
 * Helper class which is used to instantiate pretrained masked language models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForMaskedLM.from_pretrained('bert-base-uncased');
 */
export class AutoModelForMaskedLM extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_MASKED_LM_MAPPING_NAMES];
}

/**
 * Helper class which is used to instantiate pretrained question answering models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForQuestionAnswering.from_pretrained('distilbert-base-cased-distilled-squad');
 */
export class AutoModelForQuestionAnswering extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_QUESTION_ANSWERING_MAPPING_NAMES];
}

/**
 * Helper class which is used to instantiate pretrained vision-to-sequence models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForVision2Seq.from_pretrained('nlpconnect/vit-gpt2-image-captioning');
 */
export class AutoModelForVision2Seq extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_VISION_2_SEQ_MAPPING_NAMES];
}

/**
 * Helper class which is used to instantiate pretrained image classification models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForImageClassification.from_pretrained('google/vit-base-patch16-224');
 */
export class AutoModelForImageClassification extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_IMAGE_CLASSIFICATION_MAPPING_NAMES];
}

/**
 * Helper class which is used to instantiate pretrained image segmentation models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForImageSegmentation.from_pretrained('facebook/detr-resnet-50-panoptic');
 */
export class AutoModelForImageSegmentation extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_IMAGE_SEGMENTATION_MAPPING_NAMES];
}

/**
 * Helper class which is used to instantiate pretrained object detection models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForObjectDetection.from_pretrained('facebook/detr-resnet-50');
 */
export class AutoModelForObjectDetection extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_OBJECT_DETECTION_MAPPING_NAMES];
}

/**
 * Helper class which is used to instantiate pretrained object detection models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForMaskGeneration.from_pretrained('Xenova/sam-vit-base');
 */
export class AutoModelForMaskGeneration extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_MASK_GENERATION_MAPPING_NAMES];
}

export class AutoModelForCTC extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_CTC_MAPPING_NAMES];
}

export class AutoModelForAudioClassification extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS = [MODEL_FOR_AUDIO_CLASSIFICATION_MAPPING_NAMES];
}


//////////////////////////////////////////////////

//////////////////////////////////////////////////
export class Seq2SeqLMOutput extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.logits The output logits of the model.
     * @param {Tensor} output.past_key_values An tensor of key/value pairs that represent the previous state of the model.
     * @param {Tensor} output.encoder_outputs The output of the encoder in a sequence-to-sequence model.
     * @param {Tensor} [output.decoder_attentions] Attentions weights of the decoder, after the attention softmax, used to compute the weighted average in the self-attention heads.
     * @param {Tensor} [output.cross_attentions] Attentions weights of the decoder's cross-attention layer, after the attention softmax, used to compute the weighted average in the cross-attention heads.
     */
    constructor({ logits, past_key_values, encoder_outputs, decoder_attentions = null, cross_attentions = null }) {
        super();
        this.logits = logits;
        this.past_key_values = past_key_values;
        this.encoder_outputs = encoder_outputs;
        this.decoder_attentions = decoder_attentions;
        this.cross_attentions = cross_attentions;
    }
}

/**
 * Base class for outputs of sentence classification models.
 */
export class SequenceClassifierOutput extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.logits classification (or regression if config.num_labels==1) scores (before SoftMax).
     */
    constructor({ logits }) {
        super();
        this.logits = logits;
    }
}

/**
 * Base class for outputs of token classification models.
 */
export class TokenClassifierOutput extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.logits Classification scores (before SoftMax).
     */
    constructor({ logits }) {
        super();
        this.logits = logits;
    }
}

/**
 * Base class for masked language models outputs.
 */
export class MaskedLMOutput extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.logits Prediction scores of the language modeling head (scores for each vocabulary token before SoftMax).
     */
    constructor({ logits }) {
        super();
        this.logits = logits;
    }
}

/**
 * Base class for outputs of question answering models.
 */
export class QuestionAnsweringModelOutput extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.start_logits Span-start scores (before SoftMax).
     * @param {Tensor} output.end_logits Span-end scores (before SoftMax).
     */
    constructor({ start_logits, end_logits }) {
        super();
        this.start_logits = start_logits;
        this.end_logits = end_logits;
    }
}


/**
 * Base class for causal language model (or autoregressive) outputs.
 */
export class CausalLMOutput extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.logits Prediction scores of the language modeling head (scores for each vocabulary token before softmax).
     */
    constructor({ logits }) {
        super();
        this.logits = logits;
    }
}

/**
 * Base class for causal language model (or autoregressive) outputs.
 */
export class CausalLMOutputWithPast extends ModelOutput {
    /**
     * @param {Object} output The output of the model.
     * @param {Tensor} output.logits Prediction scores of the language modeling head (scores for each vocabulary token before softmax).
     * @param {Tensor} output.past_key_values Contains pre-computed hidden-states (key and values in the self-attention blocks)
     * that can be used (see `past_key_values` input) to speed up sequential decoding.
     */
    constructor({ logits, past_key_values }) {
        super();
        this.logits = logits;
        this.past_key_values = past_key_values;
    }
}
