const {
    Callable,
    getModelFile,
    fetchJSON,
    dispatchCallback,
    isIntegralNumber,
} = require("./utils.js");

const {
    Sampler,
} = require("./samplers.js");


const {
    LogitsProcessorList,
    GenerationConfig,
    ForceTokensLogitsProcessor,
    ForcedBOSTokenLogitsProcessor,
    ForcedEOSTokenLogitsProcessor,
    WhisperTimeStampLogitsProcessor,
    NoRepeatNGramLogitsProcessor,
    RepetitionPenaltyLogitsProcessor
} = require("./generation.js");

const { executionProviders, ONNX } = require('./backends/onnx.js');
const {
    Tensor,
    cat
} = require('./tensor_utils');
const { InferenceSession, Tensor: ONNXTensor } = ONNX;

//////////////////////////////////////////////////
// Helper functions
/**
 * Constructs an InferenceSession using a model file located at the specified path.
 * @param {string} modelPath - The path to the directory containing the model file.
 * @param {string} fileName - The name of the model file.
 * @param {function} [progressCallback=null] - An optional function to track progress during the creation of the session.
 * @returns {Promise<InferenceSession>} - A Promise that resolves to an InferenceSession object.
 */
async function constructSession(modelPath, fileName, progressCallback = null) {
    let buffer = await getModelFile(modelPath, fileName, progressCallback);

    // TODO add option for user to force specify their desired execution provider
    try {
        return await InferenceSession.create(buffer, {
            executionProviders,
        });
    } catch (err) {
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
 * @param {InferenceSession} session - The InferenceSession object to run.
 * @param {Object} inputs - An object that maps input names to input tensors.
 * @returns {Promise<Object>} - A Promise that resolves to an object that maps output names to output tensors.
 */
async function sessionRun(session, inputs) {
    try {
        let output = await session.run(inputs);
        output = replaceTensors(output);
        return output;
    } catch (e) {
        console.error(`An error occurred during model execution: "${e}".`);
        console.error('Inputs given to model:', inputs);
        throw e;
    }
}

/**
 * Replaces ONNX Tensor objects with custom Tensor objects to support additional functions.
 * @param {Object} obj - The object to replace tensor objects in.
 * @returns {Object} - The object with tensor objects replaced by custom Tensor objects.
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
 * Prepares an attention mask for a sequence of tokens based on configuration options.
 * @param {Object} self - The calling object instance.
 * @param {Tensor} tokens - The input tokens.
 * @returns {Tensor} - The attention mask tensor.
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
 * @param {boolean} value - The value of the tensor.
 * @returns {Tensor} - The boolean tensor.
 */
function boolTensor(value) {
    // Create boolean tensor
    return new Tensor('bool', [value], [1]);
}

// JS doesn't support mixins, so we define some reused functions here, and allow "this" to be passed in
/**
 * Loads a sequence-to-sequence model from the specified path.
 * @param {string} modelPath - The path to the model directory.
 * @param {function} progressCallback - The optional progress callback function.
 * @returns {Promise<[any, any, any, any]>} - A promise that resolves with information about the loaded model.
 */
async function seq2seqLoadModel(modelPath, progressCallback) {
    let info = await Promise.all([
        fetchJSON(modelPath, 'config.json', progressCallback),
        constructSession(modelPath, 'encoder_model.onnx', progressCallback),
        constructSession(modelPath, 'decoder_model_merged.onnx', progressCallback),
        fetchJSON(modelPath, 'generation_config.json', progressCallback, false),
    ])

    // Called when all parts are loaded
    dispatchCallback(progressCallback, {
        status: 'loaded',
        name: modelPath
    });

    return info;
}

/**
 * Perform forward pass on the seq2seq model.
 * @async
 * @function
 * @param {Object} self - The seq2seq model object.
 * @param {Object} model_inputs - The input object for the model containing encoder and decoder inputs.
 * @param {Object} options - The options
 * @param {string} [options.encoder_input_name='input_ids'] - The name of the input tensor for the encoder.
 * @param {boolean} [options.add_decoder_pkv=true] - Flag to add the decoder past key values.
 * @returns {Promise<Seq2SeqLMOutput>} - Promise that resolves with the output of the seq2seq model.
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
 * @function
 * @param {Object} self - The seq2seq model object.
 * @param {Object[]} inputTokenIds - Array of input token ids for each input sequence.
 * @param {number} numOutputTokens - The maximum number of output tokens for the model.
 * @param {boolean} [requires_attention_mask=true] - Flag to indicate if the model requires an attention mask.
 * @returns {Object[]} - Array of beam search objects.
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
 * @async
 * @function
 * @param {Object} self - The seq2seq model object.
 * @param {Object} beam - The beam search object for which to run the model.
 * @param {Object} options - options
 * @param {string} [options.input_name='input_ids'] - The name of the input tensor for the encoder.
 * @returns {Promise<Object>} - Promise that resolves with the output of the seq2seq model for the given beam.
 */
async function seq2seqRunBeam(self, beam, {
    input_name = 'input_ids',
} = {}
) {
    // 1. Prepare
    let model_inputs = {
        [input_name]: beam.inputs,
        decoder_input_ids: self.toI64Tensor(beam.output_token_ids.slice(-1)),
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
 * @async
 * @function
 * @param {Object} self - The text generation model object.
 * @param {Object} model_inputs - The input data to be used for the forward pass.
 * @returns {Promise<Object>} - Promise that resolves with an object containing the logits and past key values.
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
 * @param {Object} self - The text generation model object.
 * @param {any} inputTokenIds - An array of input token IDs to generate text from.
 * @param {number} numOutputTokens - The maximum number of tokens to generate for each beam.
 * @param {Tensor} [inputs_attention_mask] - The attention mask tensor for the input token IDs.
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
            attn_mask = inputs_attention_mask.get(beamId)
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
 * @async
 * @function textgenRunBeam
 * @param {Object} self - The textgen object.
 * @param {Object} beam - The beam to run.
 * @param {Tensor} beam.input - The input tensor.
 * @param {Tensor} beam.model_input_ids - The input ids to the model.
 * @param {Tensor} beam.attention_mask - The attention mask.
 * @param {Object} beam.past_key_values - The past key values.
 * @param {number[]} beam.output_token_ids - The output token ids.
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
 * @param {object} beam - The beam to update.
 * @param {number} newTokenId - The new token ID to add to the beam's output.
 */
function textgenUpdatebeam(beam, newTokenId) {
    beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    beam.model_input_ids = new Tensor('int64', [BigInt(newTokenId)], [1, 1]);
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Base class
/**
 * A base class for pre-trained models that provides the model configuration and an ONNX session.
 * @extends Callable
 */
class PreTrainedModel extends Callable {
    /**
     * Creates a new instance of the `PreTrainedModel` class.
     * @param {object} config - The model configuration.
     * @param {any} session - session for the model.
     */
    constructor(config, session) {
        super();

        this.config = config;
        this.session = session;
    }

    /**
    * Disposes of all the ONNX sessions that were created during inference.
    * @returns {Promise<unknown[]>} - An array of promises, one for each ONNX session that is being disposed.
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
     * Loads a pre-trained model from the given modelPath.
     * @static
     * @async
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} progressCallback - A function to be called with progress updates.
     * @returns {Promise<PreTrainedModel>} A new instance of the PreTrainedModel class.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let config = await fetchJSON(modelPath, 'config.json', progressCallback);
        let modelName = config.is_encoder_decoder ? 'encoder_model.onnx' : 'model.onnx';

        // Load model
        let session = await constructSession(modelPath, modelName, progressCallback);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        return new this(config, session);
    }

    /**
     * Converts an array or Tensor of integers to an int64 Tensor.
     * @param {Array|Tensor} items - The input integers to be converted.
     * @returns {Tensor} The int64 Tensor with the converted values.
     * @throws {Error} If the input array is empty or the input is a batched Tensor and not all sequences have the same length.
     */
    toI64Tensor(items) {
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
     * Runs the model with the provided inputs
     * @param {Object} model_inputs - Object containing input tensors
     * @returns {Promise<Object>} - Object containing output tensors
     */
    async _call(model_inputs) {
        return await sessionRun(this.session, model_inputs);
    }

    /**
     * Forward method should be implemented in subclasses.
     * @abstract
     * @param {object} model_inputs - The input data to the model in the format specified in the ONNX model.
     * @returns {Promise<object>} - The output data from the model in the format specified in the ONNX model.
     * @throws {Error} - This method must be implemented in subclasses.
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
   * @param {GenerationConfig} generation_config - A `GenerationConfig` object containing generation parameters.
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
   * Generates text based on the given inputs and generation configuration using the model.
   * @param {Array} inputs - An array of input token IDs.
   * @param {Object|null} generation_config - The generation configuration to use. If null, default configuration will be used.
   * @param {Object|null} logits_processor - An optional logits processor to use. If null, a new LogitsProcessorList instance will be created.
   * @param {Object} options - options
   * @param {Object} [options.inputs_attention_mask=null] - An optional attention mask for the inputs.
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

                let output = await this.runBeam(beam);

                // Logits are of the form [batch_size, out_seq_length, vocab_size]
                // In most cases, this will be [batch_size, 1, vocab_size]
                // So, we select the last token's logits:
                // (equivalent to `logits = outputs.logits[:, -1, :]`)
                let extractedLogits = [];
                for (const batch of output.logits) {
                    // Extract logits corresponding to the last token
                    let lastLogits = batch.get(batch.dims[0] - 1);

                    // Add back batch dimension (needed for `cat`)
                    lastLogits.dims = [1, ...lastLogits.dims];
                    extractedLogits.push(lastLogits)
                }
                let logits = cat(extractedLogits);
                logits_processor(beam.output_token_ids, logits)

                let sampledTokens = sampler(logits);
                for (let [newTokenId, logProb] of sampledTokens) {
                    // use previous beam as a starting point
                    let newBeam = { ...beam };

                    // update new beam
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
                    .sort((a, b) => b.score - a.score)  // sort based on score
                    .slice(0, generation_config.num_beams)        // remove outside beam width
            );

            // Flatten beams
            beams = newest_beams.flat();

            // Run callback
            if (generation_config.callback_function) {
                generation_config.callback_function(beams);
            }
        }

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
     * @param {Array} beams - The array of beam objects to group.
     * @returns {Array} - An array of arrays, where each inner array contains beam objects with the same id.
     */
    groupBeams(beams) {
        // Group beams by their ids
        const groups = {};
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
     * @param {Object} decoderResults - The decoder results object.
     * @param {Object} pastKeyValues - The previous past key values.
     * @returns {Object} - An object containing past key values.
     */
    getPastKeyValues(decoderResults, pastKeyValues) {

        const pkvs = {};

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
     * @param {Object} decoderFeeds - The decoder feeds object to add past key values to.
     * @param {Object} pastKeyValues - An object containing past key values.
     * @param {boolean} [hasDecoder=false] - Whether the model has a decoder.
     */
    addPastKeyValues(decoderFeeds, pastKeyValues, hasDecoder = false) {
        if (pastKeyValues === null) {
            // TODO support batches (i.e., batch_size > 1)
            if (hasDecoder) {
                let encoder_dims = [1, this.num_encoder_heads, 0, this.encoder_dim_kv];
                for (let i = 0; i < this.num_encoder_layers; ++i) {
                    decoderFeeds[`past_key_values.${i}.encoder.key`] = new Tensor('float32', [], encoder_dims)
                    decoderFeeds[`past_key_values.${i}.encoder.value`] = new Tensor('float32', [], encoder_dims)
                }

                let decoder_dims = [1, this.num_decoder_heads, 0, this.decoder_dim_kv];
                for (let i = 0; i < this.num_decoder_layers; ++i) {
                    decoderFeeds[`past_key_values.${i}.decoder.key`] = new Tensor('float32', [], decoder_dims)
                    decoderFeeds[`past_key_values.${i}.decoder.value`] = new Tensor('float32', [], decoder_dims)
                }

            } else {
                let dims = [1, this.num_heads, 0, this.dim_kv]
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
class ModelOutput { }


//////////////////////////////////////////////////
// Bert models
class BertPreTrainedModel extends PreTrainedModel { }
class BertModel extends BertPreTrainedModel { }

/**
 * BertForMaskedLM is a class representing a BERT model for masked language modeling.
 * @extends BertPreTrainedModel
 */
class BertForMaskedLM extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - An object containing the model's output logits for masked language modeling.
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
class BertForSequenceClassification extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - An object containing the model's output logits for sequence classification.
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
class BertForTokenClassification extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} - An object containing the model's output logits for token classification.
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
class BertForQuestionAnswering extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - An object containing the model's output logits for question answering.
     */
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// DistilBert models
class DistilBertPreTrainedModel extends PreTrainedModel { }
class DistilBertModel extends DistilBertPreTrainedModel { }

/**
 * DistilBertForSequenceClassification is a class representing a DistilBERT model for sequence classification.
 * @extends DistilBertPreTrainedModel
 */
class DistilBertForSequenceClassification extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - An object containing the model's output logits for sequence classification.
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
class DistilBertForTokenClassification extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} - An object containing the model's output logits for token classification.
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
class DistilBertForQuestionAnswering extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - An object containing the model's output logits for question answering.
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
class DistilBertForMaskedLM extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// MobileBert models
class MobileBertPreTrainedModel extends PreTrainedModel { }
class MobileBertModel extends MobileBertPreTrainedModel { }

/**
 * MobileBertForMaskedLM is a class representing a MobileBERT model for masking task.
 * @extends MobileBertPreTrainedModel
 */
class MobileBertForMaskedLM extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}

/**
 * @extends MobileBertPreTrainedModel
 */
class MobileBertForSequenceClassification extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}

/**
 * @extends MobileBertPreTrainedModel
 */
class MobileBertForQuestionAnswering extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// SqueezeBert models
class SqueezeBertPreTrainedModel extends PreTrainedModel { }
class SqueezeBertModel extends SqueezeBertPreTrainedModel { }
class SqueezeBertForMaskedLM extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}
class SqueezeBertForSequenceClassification extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}
class SqueezeBertForQuestionAnswering extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// Albert models
class AlbertPreTrainedModel extends PreTrainedModel { }
class AlbertModel extends AlbertPreTrainedModel { }
class AlbertForSequenceClassification extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}
class AlbertForQuestionAnswering extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
class AlbertForMaskedLM extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// T5 models
class T5PreTrainedModel extends PreTrainedModel { };

class T5Model extends T5PreTrainedModel {
    /**
     * Generates text based on the provided arguments.
     * @throws {Error} - Throws an error as the current model class (T5Model) is not compatible with `.generate()`.
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
class T5ForConditionalGeneration extends T5PreTrainedModel {
    /**
     * Creates a new instance of the `T5ForConditionalGeneration` class.
     * @param {object} config - The model configuration.
     * @param {any} session - session for the model.
     * @param {any} decoder_merged_session - session for the decoder.
     * @param {GenerationConfig} generation_config - The generation configuration.
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
     * Loads the pre-trained model from a given path.
     * @async
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} progressCallback - A function to call with progress updates (optional).
     * @returns {Promise<T5ForConditionalGeneration>} The loaded model instance.
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    /**
     * Generates the start beams for a given set of inputs and output length.
     * @param {number[][]} inputs - The input token IDs.
     * @param {number} numOutputTokens - The desired output length.
     * @returns {Array} The start beams.
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * Updates the given beam with a new token ID.
     * @param {any} beam - The current beam.
     * @param {number} newTokenId - The new token ID to add to the output sequence.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Runs the forward pass of the model for a given set of inputs.
     * @async
     * @param {Object} model_inputs - The model inputs.
     * @returns {Promise<Object>} The model output.
     */
    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// MT5 models
class MT5PreTrainedModel extends PreTrainedModel { };

class MT5Model extends MT5PreTrainedModel {
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
class MT5ForConditionalGeneration extends MT5PreTrainedModel {
    /**
     * Creates a new instance of the `MT5ForConditionalGeneration` class.
     * @param {any} config - The model configuration.
     * @param {any} session - The ONNX session containing the encoder weights.
     * @param {any} decoder_merged_session - The ONNX session containing the merged decoder weights.
     * @param {GenerationConfig} generation_config - The generation configuration.
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
     * Loads a pre-trained model from the given path.
     *
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function that is called with the download progress percentage (0-100).
     * @returns {Promise<any>} - A Promise that resolves to a new `MT5ForConditionalGeneration` instance.
     * @static
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    /**
   * Generates the start beams for the given input tokens and output sequence length.
   *
   * @param {any[]} inputs - The input sequence.
   * @param {number} numOutputTokens - The desired length of the output sequence.
   * @param {...*} args - Additional arguments to pass to the `seq2seqStartBeams` function.
   * @returns {any[]} - An array of `Beam` objects representing the start beams.
   */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new predicted token.
     * @param {any} beam - The beam to update.
     * @param {number} newTokenId - The index of the predicted token.
    */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
    * Runs the forward pass of the model on the given inputs.
    * @param {any} model_inputs - The model inputs.
    * @returns {Promise<any>} - A Promise that resolves to the model outputs.
    */
    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Bart models
class BartPretrainedModel extends PreTrainedModel { };

/**
 * BART encoder and decoder model.
 * 
 * @hideconstructor
 * @extends BartPretrainedModel
 */
class BartModel extends BartPretrainedModel {
    /**
     * Throws an error because the current model class (BartModel) is not compatible with `.generate()`.
     * 
     * @async
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
class BartForConditionalGeneration extends BartPretrainedModel {
    /**
     * Creates a new instance of the `BartForConditionalGeneration` class.
     * @param {object} config - The configuration object for the Bart model.
     * @param {object} session - The ONNX session used to execute the model.
     * @param {object} decoder_merged_session - The ONNX session used to execute the decoder.
     * @param {object} generation_config - The generation configuration object.
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
     * Loads a BartForConditionalGeneration instance from a pretrained model stored on disk.
     * @param {string} modelPath - The path to the directory containing the pretrained model.
     * @param {function} [progressCallback=null] - An optional callback function to track the download progress.
     * @returns {Promise<BartForConditionalGeneration>} - The pretrained BartForConditionalGeneration instance.
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    /**
     * Returns the initial beam for generating output text.
     * @param {object} inputs - The input object containing the encoded input text.
     * @param {number} numOutputTokens - The maximum number of output tokens to generate.
     * @param  {...any} args - Additional arguments to pass to the sequence-to-sequence generation function.
     * @returns {any} - The initial beam for generating output text.
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * Updates the beam by appending the newly generated token ID to the list of output token IDs.
     * @param {any} beam - The current beam being generated.
     * @param {number} newTokenId - The ID of the newly generated token to append to the list of output token IDs.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Runs the forward pass of the model for a given set of inputs.
     * @async
     * @param {Object} model_inputs - The model inputs.
     * @returns {Promise<Object>} The model output.
     */
    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs);
    }
}

class BartForSequenceClassification extends BartPretrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - An object containing the model's output logits for sequence classification.
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}

//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Roberta models
class RobertaPreTrainedModel extends PreTrainedModel { }
class RobertaModel extends RobertaPreTrainedModel { }

/**
 * RobertaForMaskedLM class for performing masked language modeling on Roberta models.
 * @extends RobertaPreTrainedModel
 */
class RobertaForMaskedLM extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
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
class RobertaForSequenceClassification extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
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
class RobertaForQuestionAnswering extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// T5 models
class WhisperPreTrainedModel extends PreTrainedModel { };

/**
 * WhisperModel class for training Whisper models without a language model head.
 * @extends WhisperPreTrainedModel
 */
class WhisperModel extends WhisperPreTrainedModel {
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
class WhisperForConditionalGeneration extends WhisperPreTrainedModel {
    /**
     * Creates a new instance of the `WhisperForConditionalGeneration` class.
     * @param {Object} config - Configuration object for the model.
     * @param {Object} session - ONNX Session object for the model.
     * @param {Object} decoder_merged_session - ONNX Session object for the decoder.
     * @param {Object} generation_config - Configuration object for the generation process.
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
     * @param {Object} inputs - Input data for the model.
     * @param {Object} generation_config - Configuration object for the generation process.
     * @param {Object} logits_processor - Optional logits processor object.
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
     * Loads a pre-trained model from a saved model directory.
     * @param {string} modelPath - Path to the saved model directory.
     * @param {function} progressCallback - Optional function for tracking loading progress.
     * @returns {Promise<WhisperForConditionalGeneration>} Promise object represents the loaded model.
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    /**
     * Gets the start beams for generating outputs.
     * @param {Array} inputTokenIds - Array of input token IDs.
     * @param {number} numOutputTokens - Number of output tokens to generate.
     * @returns {Array} Array of start beams.
     */
    getStartBeams(inputTokenIds, numOutputTokens, ...args) {
        // arguments ignored in this case
        return seq2seqStartBeams(this, inputTokenIds, numOutputTokens, false);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam, {
            input_name: 'input_features',
        });
    }

    /**
     * Updates the beam by appending the newly generated token ID to the list of output token IDs.
     * @param {any} beam - The current beam being generated.
     * @param {number} newTokenId - The ID of the newly generated token to append to the list of output token IDs.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Runs the forward pass of the model for a given set of inputs.
     * @async
     * @param {Object} model_inputs - The model inputs.
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
class VisionEncoderDecoderModel extends PreTrainedModel {
    /**
     * Creates a new instance of the `VisionEncoderDecoderModel` class.
     * @param {object} config - The configuration object specifying the hyperparameters and other model settings.
     * @param {object} session - The ONNX session containing the encoder model.
     * @param {any} decoder_merged_session - The ONNX session containing the merged decoder model.
     */
    constructor(config, session, decoder_merged_session) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;

        this.num_layers = this.config.decoder.n_layer;
        this.num_heads = this.config.decoder.n_head;
        this.dim_kv = this.config.decoder.n_embd / this.num_heads;
    }

    /**
     * Loads a VisionEncoderDecoderModel from the given path.
     *
     * @param {string} modelPath - The path to the folder containing the saved model files.
     * @param {function} [progressCallback=null] - Optional callback function to track the progress of model loading.
     * @returns {Promise<VisionEncoderDecoderModel>} A Promise that resolves with the loaded VisionEncoderDecoderModel instance.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session, decoder_merged_session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'encoder_model.onnx', progressCallback),
            constructSession(modelPath, 'decoder_merged_session.onnx', progressCallback),
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        return new this(config, session, decoder_merged_session);
    }

    /**
     * Generate beam search outputs for the given input pixels and number of output tokens.
     *
     * @param {array} inputs - The input pixels as a Tensor.
     * @param {number} numOutputTokens - The number of output tokens to generate.
     * @param {...*} args - Optional additional arguments to pass to seq2seqStartBeams.
     * @returns {any} An array of Beam objects representing the top-K output sequences.
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return seq2seqRunBeam(this, beam, {
            input_name: 'pixel_values',
        });
    }

    /**
     * Update the given beam with the additional predicted token ID.
     *
     * @param {any} beam - The current beam.
     * @param {number} newTokenId - The new predicted token ID to add to the beam's output sequence.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Compute the forward pass of the model on the given input tensors.
     *
     * @param {object} model_inputs - The input tensors as an object with keys 'pixel_values' and 'decoder_input_ids'.
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
class CLIPPreTrainedModel extends PreTrainedModel { }
class CLIPModel extends CLIPPreTrainedModel {

}

//////////////////////////////////////////////////

//////////////////////////////////////////////////
// GPT2 models
class GPT2PreTrainedModel extends PreTrainedModel { }
/**
 * GPT2Model is not compatible with `.generate()`, as it doesn't have a language model head.
 * @extends GPT2PreTrainedModel
 */
class GPT2Model extends GPT2PreTrainedModel {
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
class GPT2LMHeadModel extends GPT2PreTrainedModel {
    /**
     * Creates a new instance of the `GPT2LMHeadModel` class.
     * @param {object} config - The configuration of the model.
     * @param {any} session - The ONNX session containing the model weights.
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
     * @param {Tensor} inputTokenIds - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask - Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam - The Beam object representing the beam.
     * @param {number} newTokenId - The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {object} model_inputs - The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await textgen_forward(this, model_inputs)
    }

}
// class GPT2ForSequenceClassification extends GPT2PreTrainedModel {
// TODO
// }
//////////////////////////////////////////////////
class GPTNeoPreTrainedModel extends PreTrainedModel { }
class GPTNeoModel extends GPTNeoPreTrainedModel {
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

class GPTNeoForCausalLM extends GPTNeoPreTrainedModel {
    /**
     * Creates a new instance of the `GPTNeoForCausalLM` class.
     * @param {object} config - The configuration of the model.
     * @param {any} session - The ONNX session containing the model weights.
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
     * @param {Tensor} inputTokenIds - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask - Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam - The Beam object representing the beam.
     * @param {number} newTokenId - The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {object} model_inputs - The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await textgen_forward(this, model_inputs)
    }
}

//////////////////////////////////////////////////
// CodeGen models
class CodeGenPreTrainedModel extends PreTrainedModel { }
/**
 * CodeGenModel is a class representing a code generation model without a language model head.
 * 
 * @extends CodeGenPreTrainedModel
 */
class CodeGenModel extends CodeGenPreTrainedModel {
    /**
     * Throws an error indicating that the current model class is not compatible with `.generate()`,
     * as it doesn't have a language model head.
     * 
     * @throws {Error} The current model class is not compatible with `.generate()`
     * 
     * @param  {...any} args - Arguments passed to the generate function
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
class CodeGenForCausalLM extends CodeGenPreTrainedModel {
    /**
     * Creates a new instance of the `CodeGenForCausalLM` class.
    * @param {object} config The model configuration object.
    * @param {object} session The ONNX session object.
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
     * @param {Tensor} inputTokenIds - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask - Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam - The Beam object representing the beam.
     * @param {number} newTokenId - The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {object} model_inputs - The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await textgen_forward(this, model_inputs)
    }

}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
class ViTPreTrainedModel extends PreTrainedModel { }
class ViTForImageClassification extends ViTPreTrainedModel {
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
class DetrPreTrainedModel extends PreTrainedModel { }
class DetrForObjectDetection extends DetrPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    async _call(model_inputs) {
        let output = (await super._call(model_inputs));
        return new DetrObjectDetectionOutput(output.logits, output.pred_boxes)
    }
}

class DetrForSegmentation extends DetrPreTrainedModel {
    /**
     * Runs the model with the provided inputs
     * @param {Object} model_inputs - Model inputs
     * @returns {Promise<DetrSegmentationOutput>} - Object containing segmentation outputs
     */
    async _call(model_inputs) {
        let output = (await super._call(model_inputs));
        return new DetrSegmentationOutput(output.logits, output.pred_boxes, output.pred_masks);
    }
}

class DetrObjectDetectionOutput extends ModelOutput {
    /**
     * @param {any} logits
     * @param {any} pred_boxes
     */
    constructor(logits, pred_boxes) {
        super();
        this.logits = logits;
        this.pred_boxes = pred_boxes;
    }
}

class DetrSegmentationOutput extends ModelOutput {

    /**
     * @param {Tensor} logits - The output logits of the model.
     * @param {Tensor} pred_boxes - Predicted boxes.
     * @param {Tensor} pred_masks - Predicted masks.
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
// MarianMT models
class MarianPreTrainedModel extends PreTrainedModel { };

class MarianModel extends MarianPreTrainedModel {
    /**
     * 
     * @param  {...any} args 
     * @throws {Error}
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (T5Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'T5ForConditionalGeneration'}"
        )
    }
}

class MarianMTModel extends MarianPreTrainedModel {
    /**
     * Creates a new instance of the `MarianMTModel` class.
    * @param {object} config The model configuration object.
    * @param {object} session The ONNX session object.
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
     * @param {string} modelPath
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    /**
     * Initializes and returns the beam for text generation task
     * @param {any[]} inputs - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @returns {any} A Beam object representing the initialized beam.
     * @param {any[]} args
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
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
 * Helper class to determine model type from config
 */
class AutoModel {
    // Helper class to determine model type from config
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
    }

    /**
     * Instantiates a pre-trained model based on the given model path and config.
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} progressCallback - Optional. A callback function that can be used to track loading progress.
     * @returns {Promise<PreTrainedModel>} - A promise that resolves to an instance of a pre-trained model.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let config = await fetchJSON(modelPath, 'config.json', progressCallback);
        let modelName = config.is_encoder_decoder ? 'encoder_model.onnx' : 'model.onnx';

        let session = await constructSession(modelPath, modelName, progressCallback);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            console.warn(`Unknown model class "${config.model_type}", attempting to construct from base class.`);
            cls = PreTrainedModel;
        }
        return new cls(config, session)
    }
}

/**
 * Helper class for loading sequence classification models from pretrained checkpoints
 */
class AutoModelForSequenceClassification {

    static MODEL_CLASS_MAPPING = {
        'bert': BertForSequenceClassification,
        'albert': AlbertForSequenceClassification,
        'distilbert': DistilBertForSequenceClassification,
        'roberta': RobertaForSequenceClassification,
        'bart': BartForSequenceClassification,
        'mobilebert': MobileBertForSequenceClassification,
        'squeezebert': SqueezeBertForSequenceClassification,
    }

    /**
     * Load a sequence classification model from a pretrained checkpoint
     * @param {string} modelPath - The path to the model checkpoint directory
     * @param {function} [progressCallback=null] - An optional callback function to receive progress updates
     * @returns {Promise<PreTrainedModel>} A promise that resolves to a pre-trained sequence classification model
     * @throws {Error} if an unsupported model type is encountered
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback)
        ]);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}


/**
 * Helper class for loading token classification models from pretrained checkpoints
 */
class AutoModelForTokenClassification {

    static MODEL_CLASS_MAPPING = {
        'bert': BertForTokenClassification,
        'distilbert': DistilBertForTokenClassification,
    }

    /**
     * Load a token classification model from a pretrained checkpoint
     * @param {string} modelPath - The path to the model checkpoint directory
     * @param {function} [progressCallback=null] - An optional callback function to receive progress updates
     * @returns {Promise<PreTrainedModel>} A promise that resolves to a pre-trained token classification model
     * @throws {Error} if an unsupported model type is encountered
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback)
        ]);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}


/**
 * Class representing an automatic sequence-to-sequence language model.
 */
class AutoModelForSeq2SeqLM {
    static MODEL_CLASS_MAPPING = {
        't5': T5ForConditionalGeneration,
        'mt5': MT5ForConditionalGeneration,
        'bart': BartForConditionalGeneration,
        'whisper': WhisperForConditionalGeneration,
        'marian': MarianMTModel,
    }

    /**
     * Loads a pretrained sequence-to-sequence language model from a file path.
     * @param {string} modelPath - The path to the model files.
     * @param {function} [progressCallback=null] - A callback function to track loading progress.
     * @returns {Promise<Object>} A Promise that resolves to an instance of the appropriate model class.
     * @throws {Error} If the model type is unsupported.
     * @static
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        let config = info[0];
        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(...info)
    }
}

/**
 * A class for loading pre-trained models for causal language modeling tasks.
 */
class AutoModelForCausalLM {
    static MODEL_CLASS_MAPPING = {
        'gpt2': GPT2LMHeadModel,
        'gpt_neo': GPTNeoForCausalLM,
        'codegen': CodeGenForCausalLM,
    }

    /**
     * Loads a pre-trained model from the given path and returns an instance of the appropriate class.
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} [progressCallback=null] - An optional callback function to track the progress of the loading process.
     * @returns {Promise<GPT2LMHeadModel|CodeGenForCausalLM|CodeGenForCausalLM>} An instance of the appropriate class for the loaded model.
     * @throws {Error} If the loaded model type is not supported.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'decoder_model_merged.onnx', progressCallback)
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);

    }
}

/**
 * A class to automatically select the appropriate model for Masked Language Modeling (MLM) tasks.
 */
class AutoModelForMaskedLM {
    static MODEL_CLASS_MAPPING = {
        'bert': BertForMaskedLM,
        'albert': AlbertForMaskedLM,
        'distilbert': DistilBertForMaskedLM,
        'roberta': RobertaForMaskedLM,
        'mobilebert': MobileBertForMaskedLM,
        'squeezebert': SqueezeBertForMaskedLM,
    }

    /**
     * Loads a pre-trained model from a given directory and returns an instance of the appropriate model class.
     *
     * @async
     * @param {string} modelPath - The path to the pre-trained model directory.
     * @param {function} [progressCallback=null] - An optional callback function to track the loading progress.
     * @returns {Promise<PreTrainedModel>} An instance of the appropriate model class for MLM tasks.
     * @throws {Error} If an unsupported model type is encountered.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let config = await fetchJSON(modelPath, 'config.json', progressCallback);
        let modelName = config.is_encoder_decoder ? 'encoder_model.onnx' : 'model.onnx';

        let session = await constructSession(modelPath, modelName, progressCallback);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}

/**
 * Automatic model class for question answering tasks.
 */
class AutoModelForQuestionAnswering {
    static MODEL_CLASS_MAPPING = {
        'bert': BertForQuestionAnswering,
        'albert': AlbertForQuestionAnswering,
        'distilbert': DistilBertForQuestionAnswering,
        'roberta': RobertaForQuestionAnswering,
        'mobilebert': MobileBertForQuestionAnswering,
        'squeezebert': SqueezeBertForQuestionAnswering,
    }

    /**
     * Loads and returns a question answering model from a pretrained model path.
     * @param {string} modelPath - The path to the pretrained model.
     * @param {function} [progressCallback=null] - Optional callback function to track loading progress.
     * @returns {Promise<PreTrainedModel>} - The loaded question answering model.
     * @throws Will throw an error if an unsupported model type is encountered.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback)
        ]);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}

/**
 * Class representing an autoencoder-decoder model for vision-to-sequence tasks.
 */
class AutoModelForVision2Seq {
    static MODEL_CLASS_MAPPING = {
        'vision-encoder-decoder': VisionEncoderDecoderModel
    }

    /**
     * Loads a pretrained model from a given path.
     * @param {string} modelPath - The path to the pretrained model.
     * @param {function} progressCallback - Optional callback function to track progress of the model loading.
     * @returns {Promise<PreTrainedModel>} - A Promise that resolves to a new instance of VisionEncoderDecoderModel.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session, decoder_merged_session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'encoder_model.onnx', progressCallback),
            constructSession(modelPath, 'decoder_model_merged.onnx', progressCallback)
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session, decoder_merged_session);

    }
}

//////////////////////////////////////////////////
/**
 * AutoModelForImageClassification is a class for loading pre-trained image classification models from ONNX format.
 */
class AutoModelForImageClassification {
    static MODEL_CLASS_MAPPING = {
        'vit': ViTForImageClassification,
    }

    /**
     * Loads a pre-trained image classification model from a given directory path.
     * @param {string} modelPath - The path to the directory containing the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function to monitor the loading progress.
     * @returns {Promise<PreTrainedModel>} A Promise that resolves with the model.
     * @throws {Error} If the specified model type is not supported.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback),
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
/**
 * AutoModelForImageSegmentation is a class for loading pre-trained image classification models from ONNX format.
 */
class AutoModelForImageSegmentation {
    static MODEL_CLASS_MAPPING = {
        'detr': DetrForSegmentation,
    }

    /**
     * Loads a pre-trained image classification model from a given directory path.
     * @param {string} modelPath - The path to the directory containing the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function to monitor the loading progress.
     * @returns {Promise<PreTrainedModel>} A Promise that resolves with the model.
     * @throws {Error} If the specified model type is not supported.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback),
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
class AutoModelForObjectDetection {
    static MODEL_CLASS_MAPPING = {
        'detr': DetrForObjectDetection,
    }

    /**
     * Loads a pre-trained image classification model from a given directory path.
     * @param {string} modelPath - The path to the directory containing the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function to monitor the loading progress.
     * @returns {Promise<PreTrainedModel>} A Promise that resolves with the model.
     * @throws {Error} If the specified model type is not supported.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback),
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
class Seq2SeqLMOutput extends ModelOutput {
    /**
     * @param {Tensor} logits - The output logits of the model.
     * @param {Array} past_key_values - An array of key/value pairs that represent the previous state of the model.
     * @param {Tensor} encoder_outputs - The output of the encoder in a sequence-to-sequence model.
     */
    constructor(logits, past_key_values, encoder_outputs) {
        super();
        this.logits = logits;
        this.past_key_values = past_key_values;
        this.encoder_outputs = encoder_outputs;
    }
}

class SequenceClassifierOutput extends ModelOutput {
    /**
     * @param {Tensor} logits 
     */
    constructor(logits) {
        super();
        this.logits = logits;
    }
}

class TokenClassifierOutput extends ModelOutput {
    /**
     * @param {Tensor} logits 
     */
    constructor(logits) {
        super();
        this.logits = logits;
    }
}


class MaskedLMOutput extends ModelOutput {
    /**
     * @param {Tensor} logits 
     */
    constructor(logits) {
        super();
        this.logits = logits;
    }
}

class QuestionAnsweringModelOutput extends ModelOutput {
    /**
     * @param {Float32Array} start_logits - The logits for start positions of the answer.
     * @param {Float32Array} end_logits - The logits for end positions of the answer.
     */
    constructor(start_logits, end_logits) {
        super();
        this.start_logits = start_logits;
        this.end_logits = end_logits;
    }
}

module.exports = {
    AutoModel,
    AutoModelForSeq2SeqLM,
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    AutoModelForCausalLM,
    AutoModelForMaskedLM,
    AutoModelForQuestionAnswering,
    AutoModelForVision2Seq,
    AutoModelForImageClassification,
    AutoModelForObjectDetection,
    AutoModelForImageSegmentation,
};
