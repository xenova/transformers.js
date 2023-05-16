
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
 * let decoded = await tokenizer.decode(outputs[0][0], { skip_special_tokens: true });
 * // 'Ich liebe Transformatoren!'
 * ```
 * 
 * @module models
 */

import {
    Callable,
    isIntegralNumber,
    isTypedArray,
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
    WhisperTimeStampLogitsProcessor,
    NoRepeatNGramLogitsProcessor,
    RepetitionPenaltyLogitsProcessor,

    Sampler,
} from './utils/generation.js';

import {
    Tensor,
} from './utils/tensor.js';

import { executionProviders, ONNX } from './backends/onnx.js';
const { InferenceSession, Tensor: ONNXTensor } = ONNX;

/**
 * @typedef {import('./utils/hub.js').PretrainedOptions} PretrainedOptions
 */

//////////////////////////////////////////////////
// Helper functions
/**
 * Constructs an InferenceSession using a model file located at the specified path.
 * @param {string} pretrained_model_name_or_path The path to the directory containing the model file.
 * @param {string} fileName The name of the model file.
 * @param {PretrainedOptions} options Additional options for loading the model.
 * @returns {Promise<InferenceSession>} A Promise that resolves to an InferenceSession object.
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
 * Executes an InferenceSession using the specified inputs.
 * NOTE: `inputs` must contain at least the input names of the model.
 *  - If additional inputs are passed, they will be ignored.
 *  - If inputs are missing, an error will be thrown.
 * 
 * @param {InferenceSession} session The InferenceSession object to run.
 * @param {Object} inputs An object that maps input names to input tensors.
 * @returns {Promise<Object>} A Promise that resolves to an object that maps output names to output tensors.
 */
async function sessionRun(session, inputs) {

    // First, check that all inputs are provided
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
 */
function replaceTensors(obj) {
    // Convert ONNX Tensors with our custom Tensor class
    // to support additional functions
    for (let prop in obj) {
        if (obj[prop] instanceof ONNXTensor) {
            obj[prop] = new Tensor(obj[prop]);
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
 */
function _prepare_attention_mask(self, tokens) {

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
 */
function boolTensor(value) {
    // Create boolean tensor
    return new Tensor('bool', [value], [1]);
}


/**
 * Loads a model from the specified path.
 * @param {string} pretrained_model_name_or_path The path to the model directory.
 * @param {PretrainedOptions} options Additional options for loading the model.
 * @returns {Promise<Array>} A promise that resolves with information about the loaded model.
 */
async function loadAutoModel(pretrained_model_name_or_path, options) {
    // Only get config.json if not already specified
    let config = options.config ?? await getModelJSON(pretrained_model_name_or_path, 'config.json', true, options);

    let modelName = config.is_encoder_decoder ? 'encoder_model' : 'model';

    let session = await constructSession(pretrained_model_name_or_path, modelName, options);

    return [config, session];
}

/**
 * Loads a model from the specified path.
 * @param {string} pretrained_model_name_or_path The path to the model directory.
 * @param {PretrainedOptions} options Additional options for loading the model.
 * @returns {Promise<Array>} A promise that resolves with information about the loaded model.
 */
async function loadModel(pretrained_model_name_or_path, options) {
    let info = await Promise.all([
        options.config ?? getModelJSON(pretrained_model_name_or_path, 'config.json', true, options),
        constructSession(pretrained_model_name_or_path, 'model', options)
    ]);
    return info;
}

/**
 * Loads a sequence-to-sequence model from the specified path.
 * @param {string} pretrained_model_name_or_path The path to the model directory.
 * @param {PretrainedOptions} options Additional options for loading the model.
 * @returns {Promise<Array>} A promise that resolves with information about the loaded model.
 */
async function seq2seqLoadModel(pretrained_model_name_or_path, options) {
    let info = await Promise.all([
        options.config ?? getModelJSON(pretrained_model_name_or_path, 'config.json', true, options),
        constructSession(pretrained_model_name_or_path, 'encoder_model', options),
        constructSession(pretrained_model_name_or_path, 'decoder_model_merged', options),
        getModelJSON(pretrained_model_name_or_path, 'generation_config.json', false, options),
    ]);
    return info;
}

/**
 * Loads an encoder-decoder model from the specified path.
 * @param {string} pretrained_model_name_or_path The path to the model directory.
 * @param {PretrainedOptions} options Additional options for loading the model.
 * @returns {Promise<Array>} A promise that resolves with information about the loaded model.
 */
async function encoderDecoderLoadModel(pretrained_model_name_or_path, options) {
    let info = await Promise.all([
        options.config ?? getModelJSON(pretrained_model_name_or_path, 'config.json', true, options),
        constructSession(pretrained_model_name_or_path, 'encoder_model', options),
        constructSession(pretrained_model_name_or_path, 'decoder_model_merged', options),
    ])
    return info;
}


/**
 * Loads a decoder model from the specified path.
 * @param {string} pretrained_model_name_or_path The path to the model directory.
 * @param {PretrainedOptions} options Additional options for loading the model.
 * @returns {Promise<Array>} A promise that resolves with information about the loaded model.
 */
async function decoderLoadModel(pretrained_model_name_or_path, options) {
    let info = await Promise.all([
        options.config ?? getModelJSON(pretrained_model_name_or_path, 'config.json', true, options),
        constructSession(pretrained_model_name_or_path, 'decoder_model_merged', options),
    ])
    return info;
}

// JS doesn't support mixins, so we define some reused functions here, and allow "this" to be passed in
/**
 * Perform forward pass on the seq2seq model.
 * @param {Object} self The seq2seq model object.
 * @param {Object} model_inputs The input object for the model containing encoder and decoder inputs.
 * @param {Object} options The options
 * @param {string} [options.encoder_input_name='input_ids'] The name of the input tensor for the encoder.
 * @param {boolean} [options.add_decoder_pkv=true] Flag to add the decoder past key values.
 * @returns {Promise<Seq2SeqLMOutput>} Promise that resolves with the output of the seq2seq model.
 */
async function seq2seq_forward(self, model_inputs, {
    encoder_input_name = 'input_ids',
    add_decoder_pkv = true
} = {}) {
    let encoderOutputs = model_inputs.encoder_outputs;
    let pastKeyValues = model_inputs.past_key_values;

    if (encoderOutputs === null) {
        const encoderFeeds = {
            [encoder_input_name]: model_inputs[encoder_input_name],
        }

        if (self.session.inputNames.includes('attention_mask')) {
            encoderFeeds.attention_mask = model_inputs.attention_mask
        }
        const encoderResults = await sessionRun(self.session, encoderFeeds);
        encoderOutputs = encoderResults.last_hidden_state;
    }
    let decoderFeeds = {
        input_ids: model_inputs.decoder_input_ids,
        encoder_hidden_states: encoderOutputs,
        use_cache_branch: boolTensor(pastKeyValues !== null)
    };

    if (self.decoder_merged_session.inputNames.includes('encoder_attention_mask')) {
        decoderFeeds.encoder_attention_mask = model_inputs.attention_mask
    }
    self.addPastKeyValues(decoderFeeds, pastKeyValues, add_decoder_pkv);

    const decoderResults = await sessionRun(self.decoder_merged_session, decoderFeeds);
    let logits = decoderResults.logits;
    pastKeyValues = self.getPastKeyValues(decoderResults, pastKeyValues);
    return new Seq2SeqLMOutput(logits, pastKeyValues, encoderOutputs);
}

/**
 * Start the beam search process for the seq2seq model.
 * @param {Object} self The seq2seq model object.
 * @param {Object[]} inputTokenIds Array of input token ids for each input sequence.
 * @param {number} numOutputTokens The maximum number of output tokens for the model.
 * @param {boolean} [requires_attention_mask=true] Flag to indicate if the model requires an attention mask.
 * @returns {Object[]} Array of beam search objects.
 */
function seq2seqStartBeams(self, inputTokenIds, numOutputTokens, requires_attention_mask = true) {
    let beams = [];
    let beamId = 0;
    for (let tokens of inputTokenIds) {
        // TODO: Improve
        // Currently, just add back batch dimension.
        // In future, allow for true parallel execution
        tokens.dims = [1, ...tokens.dims]

        // Create beam
        let start = {
            inputs: tokens,
            encoder_outputs: null,
            past_key_values: null,

            // decoder_input_ids == output_token_ids
            output_token_ids: [self.config.decoder_start_token_id],
            done: false,
            score: 0,
            id: beamId++ // assign unique id to beams
        }

        if (requires_attention_mask) {
            start.attention_mask = _prepare_attention_mask(self, tokens);
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
        past_key_values: beam.past_key_values,
    }
    if (beam.attention_mask) {
        model_inputs.attention_mask = beam.attention_mask
    }

    // 2. Run
    let output = await self.forward(model_inputs);

    // 3. Update
    beam.past_key_values = output.past_key_values;
    beam.encoder_outputs = output.encoder_outputs;

    return output;
}

/**
 * Forward pass of the text generation model.
 * @param {Object} self The text generation model object.
 * @param {Object} model_inputs The input data to be used for the forward pass.
 * @returns {Promise<Object>} Promise that resolves with an object containing the logits and past key values.
 */
async function textgen_forward(self, model_inputs) {
    let past_key_values = model_inputs.past_key_values;
    let decoderFeeds = {
        input_ids: model_inputs.input_ids,
        attention_mask: model_inputs.attention_mask,
        use_cache_branch: boolTensor(past_key_values !== null)
    }
    self.addPastKeyValues(decoderFeeds, past_key_values)

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
 */
function textgenStartBeams(self, inputTokenIds, numOutputTokens, inputs_attention_mask) {
    let beams = [];

    let beamId = 0;
    for (let tokens of inputTokenIds) {
        // TODO: Improve
        // Currently, just add back batch dimension.
        // In future, allow for true parallel execution
        tokens.dims = [1, ...tokens.dims]

        let attn_mask;
        if (inputs_attention_mask) {
            attn_mask = inputs_attention_mask[beamId];
            attn_mask.dims = [1, ...attn_mask.dims]

        } else {
            attn_mask = _prepare_attention_mask(self, tokens)
        }

        let start = {
            input: tokens,
            model_input_ids: tokens,
            attention_mask: attn_mask,
            past_key_values: null,

            output_token_ids: [],
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
 * @param {Object} self The textgen object.
 * @param {Object} beam The beam to run.
 * @param {Tensor} beam.input The input tensor.
 * @param {Tensor} beam.model_input_ids The input ids to the model.
 * @param {Tensor} beam.attention_mask The attention mask.
 * @param {Object} beam.past_key_values The past key values.
 * @param {number[]} beam.output_token_ids The output token ids.
 * @returns {Promise<Object>} The output of the generation step.
 */
async function textgenRunBeam(self, beam) {
    let attnMaskData = new BigInt64Array(beam.input.data.length + beam.output_token_ids.length).fill(1n)

    // 1. Prepare
    let model_inputs = {
        input_ids: beam.model_input_ids,
        attention_mask: new Tensor(
            'int64',
            attnMaskData,
            [1, attnMaskData.length]
        ),
        past_key_values: beam.past_key_values,
    }

    // 2. Run
    let output = await self.forward(model_inputs);

    // 3. Update
    beam.past_key_values = output.past_key_values;

    return output;
}

/**
 * Update a beam with a new token ID.
 * @param {Object} beam The beam to update.
 * @param {number} newTokenId The new token ID to add to the beam's output.
 */
function textgenUpdatebeam(beam, newTokenId) {
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
    */
    async dispose() {
        // Dispose of all ONNX sessions sessions
        // TODO use: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry

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
     * Loads a pre-trained model from the given `pretrained_model_name_or_path`. 
     * 
     * @param {string} pretrained_model_name_or_path The path to the pre-trained model.
     * @param {PretrainedOptions} options Additional options for loading the model. For more information, @see {@link PreTrainedModel.from_pretrained}.
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
    } = {}) {
        let info = await loadAutoModel(pretrained_model_name_or_path, {
            quantized,
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
        });

        // @ts-ignore
        return new this(...info);
    }

    /**
     * Runs the model with the provided inputs
     * @param {Object} model_inputs Object containing input tensors
     * @returns {Promise<Object>} Object containing output tensors
     */
    async _call(model_inputs) {
        return await sessionRun(this.session, model_inputs);
    }

    /**
     * Forward method should be implemented in subclasses.
     * @abstract
     * @param {Object} model_inputs The input data to the model in the format specified in the ONNX model.
     * @returns {Promise<Object>} The output data from the model in the format specified in the ONNX model.
     * @throws {Error} This method must be implemented in subclasses.
     */
    async forward(model_inputs) {
        throw Error("forward should be implemented in subclasses.")
    }

    /**
     * @param {GenerationConfig} generation_config 
     * @param {number} input_ids_seq_length 
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

        // if (generation_config.begin_suppress_tokens !== null) {
        //     let begin_index = input_ids_seq_length;
        //     begin_index = (input_ids_seq_length > 1 || generation_config.forced_bos_token_id === null) ? begin_index : begin_index + 1;
        //     if (generation_config.forced_decoder_ids !== null) {
        //         begin_index += generation_config.forced_decoder_ids[generation_config.forced_decoder_ids.length - 1][0];
        //     }
        //     processors.push(new SuppressTokensAtBeginLogitsProcessor(generation_config.begin_suppress_tokens, begin_index));
        // }

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
     * Generates text based on the given inputs and generation configuration using the model.
     * @param {Tensor|Array|TypedArray} inputs An array of input token IDs.
     * @param {Object|null} generation_config The generation configuration to use. If null, default configuration will be used.
     * @param {Object|null} logits_processor An optional logits processor to use. If null, a new LogitsProcessorList instance will be created.
     * @param {Object} options options
     * @param {Object} [options.inputs_attention_mask=null] An optional attention mask for the inputs.
     * @returns {Promise<Array>} An array of generated output sequences, where each sequence is an array of token IDs.
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

        if (inputs.length === 0) {
            throw Error("Must supply a non-empty array of input token ids.")
        }

        // Update generation config with defaults
        generation_config = this._get_generation_config(generation_config);

        logits_processor = logits_processor ?? new LogitsProcessorList()

        // TODO Update generation config
        // this.generation_config

        // Update logits processor
        logits_processor = this._get_logits_processor(
            generation_config,
            inputs.length,
            logits_processor
        )

        // TODO implement early_stopping
        // https://huggingface.co/blog/how-to-generate

        let numOutputTokens = 1;
        const maxOutputTokens = numOutputTokens + (generation_config.max_new_tokens ?? Infinity);

        let sampler = Sampler.getSampler(generation_config);

        // @ts-ignore
        let beams = this.getStartBeams(inputs, numOutputTokens, inputs_attention_mask);

        while (beams.some(x => !x.done) && numOutputTokens < maxOutputTokens) {
            let newest_beams = [];
            for (let beam of beams) {
                if (beam.done) {
                    // TODO add length penalty (for ending early)
                    // Add this beam back into the pool
                    newest_beams.push(beam);
                    continue
                }

                // @ts-ignore
                let output = await this.runBeam(beam);

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
                    .sort((a, b) => b.score - a.score)      // sort based on score
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

        return this.groupBeams(beams).map(
            batch => {
                if (generation_config.num_return_sequences > 1) {
                    return batch.slice(0, generation_config.num_return_sequences).map(x => x.output_token_ids);
                } else {
                    return [batch[0].output_token_ids];
                }
            }
        )
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
     */
    getPastKeyValues(decoderResults, pastKeyValues) {

        const pkvs = Object.create(null);

        for (const name in decoderResults) {
            if (name.startsWith('present')) {
                let newName = name.replace('present', 'past_key_values');

                if (pastKeyValues !== null && name.includes('encoder')) {
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
     * Adds past key values to the decoder feeds object. If pastKeyValues is null, creates new tensors for past key values.
     *
     * @param {Object} decoderFeeds The decoder feeds object to add past key values to.
     * @param {Object} pastKeyValues An object containing past key values.
     * @param {boolean} [hasDecoder=false] Whether the model has a decoder.
     */
    addPastKeyValues(decoderFeeds, pastKeyValues, hasDecoder = false) {
        if (pastKeyValues === null) {
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
                // @ts-ignore
                let dims = [1, this.num_heads, 0, this.dim_kv]
                // @ts-ignore
                for (let i = 0; i < this.num_layers; ++i) {
                    decoderFeeds[`past_key_values.${i}.key`] = new Tensor('float32', [], dims)
                    decoderFeeds[`past_key_values.${i}.value`] = new Tensor('float32', [], dims)
                }
            }

        } else {
            Object.assign(decoderFeeds, pastKeyValues)
        }
    }
}
//////////////////////////////////////////////////
// Base model output class
export class ModelOutput { }


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
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
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
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
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
        let logits = (await super._call(model_inputs)).logits;
        return new TokenClassifierOutput(logits)
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
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
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
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
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
        let logits = (await super._call(model_inputs)).logits;
        return new TokenClassifierOutput(logits)
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
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
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
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
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
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
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
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
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
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
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
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
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
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
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
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
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
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
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
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
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
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
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
     * Loads a pre-trained model from the given `pretrained_model_name_or_path`.
     * 
     * @param {string} pretrained_model_name_or_path The path to the pre-trained model.
     * @param {PretrainedOptions} options Additional options for loading the model. For more information, @see {@link PreTrainedModel.from_pretrained}.
     * 
     * @returns {Promise<T5ForConditionalGeneration>} A new instance of the `T5ForConditionalGeneration` class.
     */
    static async from_pretrained(pretrained_model_name_or_path, {
        quantized = true,
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
    } = {}) {
        let info = await seq2seqLoadModel(pretrained_model_name_or_path, {
            quantized,
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
        });
        // @ts-ignore
        return new this(...info);
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
        return await seq2seq_forward(this, model_inputs);
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
     * Loads a pre-trained model from the given `pretrained_model_name_or_path`.
     * 
     * @param {string} pretrained_model_name_or_path The path to the pre-trained model.
     * @param {PretrainedOptions} options Additional options for loading the model. For more information, @see {@link PreTrainedModel.from_pretrained}.
     * 
     * @returns {Promise<MT5ForConditionalGeneration>} A new instance of the `MT5ForConditionalGeneration` class.
     */
    static async from_pretrained(pretrained_model_name_or_path, {
        quantized = true,
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
    } = {}) {
        let info = await seq2seqLoadModel(pretrained_model_name_or_path, {
            quantized,
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
        });
        // @ts-ignore
        return new this(...info);
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
        return await seq2seq_forward(this, model_inputs);
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
     * Loads a pre-trained model from the given `pretrained_model_name_or_path`.
     * 
     * @param {string} pretrained_model_name_or_path The path to the pre-trained model.
     * @param {PretrainedOptions} options Additional options for loading the model. For more information, @see {@link PreTrainedModel.from_pretrained}.
     * 
     * @returns {Promise<BartForConditionalGeneration>} A new instance of the `BartForConditionalGeneration` class.
     */
    static async from_pretrained(pretrained_model_name_or_path, {
        quantized = true,
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
    } = {}) {
        let info = await seq2seqLoadModel(pretrained_model_name_or_path, {
            quantized,
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
        });
        // @ts-ignore
        return new this(...info);
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
        return await seq2seq_forward(this, model_inputs);
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
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
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
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
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
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
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
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
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
     * Generates outputs based on input and generation configuration.
     * @param {Object} inputs Input data for the model.
     * @param {Object} generation_config Configuration object for the generation process.
     * @param {Object} logits_processor Optional logits processor object.
     * @returns {Promise<Object>} Promise object represents the generated outputs.
     */
    async generate(
        inputs,
        generation_config = null,
        logits_processor = null,
    ) {
        // Create generation config object
        generation_config = this._get_generation_config(generation_config);


        // Whisper has additional options for returning timestamps
        generation_config.return_timestamps ??= false;

        // TODO add language and task

        if (generation_config.return_timestamps) {
            logits_processor = [new WhisperTimeStampLogitsProcessor(generation_config)]
        }

        return super.generate(inputs, generation_config, logits_processor)
    }

    /**
     * Loads a pre-trained model from the given `pretrained_model_name_or_path`.
     * 
     * @param {string} pretrained_model_name_or_path The path to the pre-trained model.
     * @param {PretrainedOptions} options Additional options for loading the model. For more information, @see {@link PreTrainedModel.from_pretrained}.
     * 
     * @returns {Promise<WhisperForConditionalGeneration>} A new instance of the `WhisperForConditionalGeneration` class.
     */
    static async from_pretrained(pretrained_model_name_or_path, {
        quantized = true,
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
    } = {}) {
        let info = await seq2seqLoadModel(pretrained_model_name_or_path, {
            quantized,
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
        });
        // @ts-ignore
        return new this(...info);
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
        return await seq2seq_forward(this, model_inputs, {
            encoder_input_name: 'input_features',
        });
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
     * Loads a pre-trained model from the given `pretrained_model_name_or_path`.
     * 
     * @param {string} pretrained_model_name_or_path The path to the pre-trained model.
     * @param {PretrainedOptions} options Additional options for loading the model. For more information, @see {@link PreTrainedModel.from_pretrained}.
     * 
     * @returns {Promise<VisionEncoderDecoderModel>} A new instance of the `VisionEncoderDecoderModel` class.
     */
    static async from_pretrained(pretrained_model_name_or_path, {
        quantized = true,
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
    } = {}) {
        let info = await encoderDecoderLoadModel(pretrained_model_name_or_path, {
            quantized,
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
        });
        // @ts-ignore
        return new this(...info);
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
        return await seq2seq_forward(this, model_inputs, {
            encoder_input_name: 'pixel_values',
            add_decoder_pkv: false
        })
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// CLIP models
export class CLIPPreTrainedModel extends PreTrainedModel { }
export class CLIPModel extends CLIPPreTrainedModel {

}

//////////////////////////////////////////////////

//////////////////////////////////////////////////
// GPT2 models
export class GPT2PreTrainedModel extends PreTrainedModel { }
/**
 * GPT2Model is not compatible with `.generate()`, as it doesn't have a language model head.
 * @extends GPT2PreTrainedModel
 */
export class GPT2Model extends GPT2PreTrainedModel {
    /**
     * 
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
     * Creates a new instance of the `GPT2LMHeadModel` class.
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

    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds The input token ids.
     * @param {number} numOutputTokens The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam The Beam object representing the beam.
     * @param {number} newTokenId The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {Object} model_inputs The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await textgen_forward(this, model_inputs)
    }

}
// export class GPT2ForSequenceClassification extends GPT2PreTrainedModel {
// TODO
// }
//////////////////////////////////////////////////
export class GPTNeoPreTrainedModel extends PreTrainedModel { }
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
     * Creates a new instance of the `GPTNeoForCausalLM` class.
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

    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds The input token ids.
     * @param {number} numOutputTokens The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam The Beam object representing the beam.
     * @param {number} newTokenId The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {Object} model_inputs The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await textgen_forward(this, model_inputs)
    }
}

//////////////////////////////////////////////////
// CodeGen models
export class CodeGenPreTrainedModel extends PreTrainedModel { }
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
     * Creates a new instance of the `CodeGenForCausalLM` class.
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

    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds The input token ids.
     * @param {number} numOutputTokens The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam The current beam being generated.
     * @returns {Promise<any>} The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam The Beam object representing the beam.
     * @param {number} newTokenId The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {Object} model_inputs The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await textgen_forward(this, model_inputs)
    }

}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
export class ViTPreTrainedModel extends PreTrainedModel { }
export class ViTForImageClassification extends ViTPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
export class DetrPreTrainedModel extends PreTrainedModel { }
export class DetrForObjectDetection extends DetrPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    async _call(model_inputs) {
        let output = (await super._call(model_inputs));
        return new DetrObjectDetectionOutput(output.logits, output.pred_boxes)
    }
}

export class DetrForSegmentation extends DetrPreTrainedModel {
    /**
     * Runs the model with the provided inputs
     * @param {Object} model_inputs Model inputs
     * @returns {Promise<DetrSegmentationOutput>} Object containing segmentation outputs
     */
    async _call(model_inputs) {
        let output = (await super._call(model_inputs));
        return new DetrSegmentationOutput(output.logits, output.pred_boxes, output.pred_masks);
    }
}

export class DetrObjectDetectionOutput extends ModelOutput {
    /**
     * @param {Tensor} logits
     * @param {Tensor} pred_boxes
     */
    constructor(logits, pred_boxes) {
        super();
        this.logits = logits;
        this.pred_boxes = pred_boxes;
    }
}

export class DetrSegmentationOutput extends ModelOutput {

    /**
     * @param {Tensor} logits The output logits of the model.
     * @param {Tensor} pred_boxes Predicted boxes.
     * @param {Tensor} pred_masks Predicted masks.
     */
    constructor(logits, pred_boxes, pred_masks) {
        super();
        this.logits = logits;
        this.pred_boxes = pred_boxes;
        this.pred_masks = pred_masks;
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
        // TODO split into encoder and decoder
        let output = (await super._call(model_inputs));
        return new SamImageSegmentationOutput(output.iou_scores, output.pred_masks);
    }
}


/**
 * Base class for Segment-Anything model's output.
 * 
 * @extends ModelOutput
 */
export class SamImageSegmentationOutput extends ModelOutput {
    /**
     * @param {Tensor} iou_scores The output logits of the model.
     * @param {Tensor} pred_masks Predicted boxes.
     */
    constructor(iou_scores, pred_masks) {
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
     * Loads a pre-trained model from the given `pretrained_model_name_or_path`.
     * 
     * @param {string} pretrained_model_name_or_path The path to the pre-trained model.
     * @param {PretrainedOptions} options Additional options for loading the model. For more information, @see {@link PreTrainedModel.from_pretrained}.
     * 
     * @returns {Promise<MarianMTModel>} A new instance of the `MarianMTModel` class.
     */
    static async from_pretrained(pretrained_model_name_or_path, {
        quantized = true,
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
    } = {}) {
        let info = await seq2seqLoadModel(pretrained_model_name_or_path, {
            quantized,
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
        });
        // @ts-ignore
        return new this(...info);
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
        return await seq2seq_forward(this, model_inputs);
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
     * Loads a pre-trained model from the given `pretrained_model_name_or_path`.
     * 
     * @param {string} pretrained_model_name_or_path The path to the pre-trained model.
     * @param {PretrainedOptions} options Additional options for loading the model. For more information, @see {@link PreTrainedModel.from_pretrained}.
     * 
     * @returns {Promise<M2M100ForConditionalGeneration>} A new instance of the `M2M100ForConditionalGeneration` class.
     */
    static async from_pretrained(pretrained_model_name_or_path, {
        quantized = true,
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
    } = {}) {
        let info = await seq2seqLoadModel(pretrained_model_name_or_path, {
            quantized,
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
        });
        // @ts-ignore
        return new this(...info);
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
        return await seq2seq_forward(this, model_inputs);
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
     */
    static MODEL_CLASS_MAPPING = Object.create(null);

    /**
     * Whether to attempt to instantiate the base class (`PretrainedModel`) if 
     * the model type is not found in the mapping.
     */
    static BASE_IF_FAIL = false;

    /**
     * The function to use to load the pretrained model.
     */
    static LOAD_FUNCTION = null;

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
     * @returns {Promise<PreTrainedModel>} A new instance of the PreTrainedModel class.
     */
    static async from_pretrained(pretrained_model_name_or_path, {
        quantized = true,
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
    } = {}) {
        if (this.LOAD_FUNCTION === null) {
            throw new Error("`LOAD_FUNCTION` not implemented for this model");
        }

        let info = await this.LOAD_FUNCTION(pretrained_model_name_or_path, {
            quantized,
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
        });

        let cls = this.MODEL_CLASS_MAPPING[info[0].model_type];
        if (!cls) {
            if (this.BASE_IF_FAIL) {
                console.warn(`Unknown model class "${info[0].model_type}", attempting to construct from base class.`);
                cls = PreTrainedModel;
            } else {
                throw Error(`Unsupported model type: ${info[0].model_type}`)
            }
        }
        return new cls(...info);
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
    static LOAD_FUNCTION = loadAutoModel;
    static BASE_IF_FAIL = true;
    static MODEL_CLASS_MAPPING = {
        'bert': BertModel,
        'albert': AlbertModel,
        'distilbert': DistilBertModel,
        't5': T5Model,
        'mt5': MT5Model,
        'gpt2': GPT2Model,
        'gpt_neo': GPTNeoModel,
        'codegen': CodeGenModel,
        'bart': BartModel,
        'roberta': RobertaModel,
        'whisper': WhisperModel,
        'clip': CLIPModel,
        'mobilebert': MobileBertModel,
        'squeezebert': SqueezeBertModel,
        'marian': MarianModel,
        'm2m_100': M2M100Model,
        'sam': SamModel,
    }
}

/**
 * Helper class which is used to instantiate pretrained sequence classification models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForSequenceClassification.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english');
 */
export class AutoModelForSequenceClassification extends PretrainedMixin {
    static LOAD_FUNCTION = loadModel;
    static MODEL_CLASS_MAPPING = {
        'bert': BertForSequenceClassification,
        'albert': AlbertForSequenceClassification,
        'distilbert': DistilBertForSequenceClassification,
        'roberta': RobertaForSequenceClassification,
        'bart': BartForSequenceClassification,
        'mobilebert': MobileBertForSequenceClassification,
        'squeezebert': SqueezeBertForSequenceClassification,
    }
}

/**
 * Helper class which is used to instantiate pretrained token classification models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForTokenClassification.from_pretrained('Davlan/distilbert-base-multilingual-cased-ner-hrl');
 */
export class AutoModelForTokenClassification extends PretrainedMixin {
    static LOAD_FUNCTION = loadModel;
    static MODEL_CLASS_MAPPING = {
        'bert': BertForTokenClassification,
        'distilbert': DistilBertForTokenClassification,
    }
}


/**
 * Helper class which is used to instantiate pretrained sequence-to-sequence models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForSeq2SeqLM.from_pretrained('t5-small');
 */
export class AutoModelForSeq2SeqLM extends PretrainedMixin {
    static LOAD_FUNCTION = seq2seqLoadModel;
    static MODEL_CLASS_MAPPING = {
        't5': T5ForConditionalGeneration,
        'mt5': MT5ForConditionalGeneration,
        'bart': BartForConditionalGeneration,
        'whisper': WhisperForConditionalGeneration,
        'marian': MarianMTModel,
        'm2m_100': M2M100ForConditionalGeneration,
    }
}

/**
 * Helper class which is used to instantiate pretrained causal language models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForCausalLM.from_pretrained('gpt2');
 */
export class AutoModelForCausalLM extends PretrainedMixin {
    static LOAD_FUNCTION = decoderLoadModel;
    static MODEL_CLASS_MAPPING = {
        'gpt2': GPT2LMHeadModel,
        'gpt_neo': GPTNeoForCausalLM,
        'codegen': CodeGenForCausalLM,
    }
}

/**
 * Helper class which is used to instantiate pretrained masked language models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForMaskedLM.from_pretrained('bert-base-uncased');
 */
export class AutoModelForMaskedLM extends PretrainedMixin {
    static LOAD_FUNCTION = loadAutoModel;
    static MODEL_CLASS_MAPPING = {
        'bert': BertForMaskedLM,
        'albert': AlbertForMaskedLM,
        'distilbert': DistilBertForMaskedLM,
        'roberta': RobertaForMaskedLM,
        'mobilebert': MobileBertForMaskedLM,
        'squeezebert': SqueezeBertForMaskedLM,
    }
}

/**
 * Helper class which is used to instantiate pretrained question answering models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForQuestionAnswering.from_pretrained('distilbert-base-cased-distilled-squad');
 */
export class AutoModelForQuestionAnswering extends PretrainedMixin {
    static LOAD_FUNCTION = loadModel;
    static MODEL_CLASS_MAPPING = {
        'bert': BertForQuestionAnswering,
        'albert': AlbertForQuestionAnswering,
        'distilbert': DistilBertForQuestionAnswering,
        'roberta': RobertaForQuestionAnswering,
        'mobilebert': MobileBertForQuestionAnswering,
        'squeezebert': SqueezeBertForQuestionAnswering,
    }
}

/**
 * Helper class which is used to instantiate pretrained vision-to-sequence models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForVision2Seq.from_pretrained('nlpconnect/vit-gpt2-image-captioning');
 */
export class AutoModelForVision2Seq extends PretrainedMixin {
    static LOAD_FUNCTION = encoderDecoderLoadModel;
    static MODEL_CLASS_MAPPING = {
        'vision-encoder-decoder': VisionEncoderDecoderModel
    }
}

/**
 * Helper class which is used to instantiate pretrained image classification models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForImageClassification.from_pretrained('google/vit-base-patch16-224');
 */
export class AutoModelForImageClassification extends PretrainedMixin {
    static LOAD_FUNCTION = loadModel;
    static MODEL_CLASS_MAPPING = {
        'vit': ViTForImageClassification,
    }
}

/**
 * Helper class which is used to instantiate pretrained image segmentation models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForImageSegmentation.from_pretrained('facebook/detr-resnet-50-panoptic');
 */
export class AutoModelForImageSegmentation extends PretrainedMixin {
    static LOAD_FUNCTION = loadModel;
    static MODEL_CLASS_MAPPING = {
        'detr': DetrForSegmentation,
    }
}

/**
 * Helper class which is used to instantiate pretrained object detection models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForObjectDetection.from_pretrained('facebook/detr-resnet-50');
 */
export class AutoModelForObjectDetection extends PretrainedMixin {
    static LOAD_FUNCTION = loadModel;
    static MODEL_CLASS_MAPPING = {
        'detr': DetrForObjectDetection,
    }
}

/**
 * Helper class which is used to instantiate pretrained object detection models with the `from_pretrained` function.
 * The chosen model class is determined by the type specified in the model config.
 * 
 * @example
 * let model = await AutoModelForMaskGeneration.from_pretrained('Xenova/sam-vit-base');
 */
export class AutoModelForMaskGeneration extends PretrainedMixin {
    static LOAD_FUNCTION = loadModel;
    static MODEL_CLASS_MAPPING = {
        'sam': SamModel,
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
export class Seq2SeqLMOutput extends ModelOutput {
    /**
     * @param {Tensor} logits The output logits of the model.
     * @param {Tensor} past_key_values An tensor of key/value pairs that represent the previous state of the model.
     * @param {Tensor} encoder_outputs The output of the encoder in a sequence-to-sequence model.
     */
    constructor(logits, past_key_values, encoder_outputs) {
        super();
        this.logits = logits;
        this.past_key_values = past_key_values;
        this.encoder_outputs = encoder_outputs;
    }
}

export class SequenceClassifierOutput extends ModelOutput {
    /**
     * @param {Tensor} logits 
     */
    constructor(logits) {
        super();
        this.logits = logits;
    }
}

export class TokenClassifierOutput extends ModelOutput {
    /**
     * @param {Tensor} logits 
     */
    constructor(logits) {
        super();
        this.logits = logits;
    }
}


export class MaskedLMOutput extends ModelOutput {
    /**
     * @param {Tensor} logits 
     */
    constructor(logits) {
        super();
        this.logits = logits;
    }
}

export class QuestionAnsweringModelOutput extends ModelOutput {
    /**
     * @param {Tensor} start_logits The logits for start positions of the answer.
     * @param {Tensor} end_logits The logits for end positions of the answer.
     */
    constructor(start_logits, end_logits) {
        super();
        this.start_logits = start_logits;
        this.end_logits = end_logits;
    }
}
