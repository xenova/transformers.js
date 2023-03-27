const {
    Callable,
    getModelFile,
    fetchJSON,
    dispatchCallback,
    isIntegralNumber,
    exists,
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
    WhisperTimeStampLogitsProcessor
} = require("./generation.js");

const { executionProviders, ONNX } = require('./backends/onnx.js');
const { Tensor } = require('./tensor_utils');
const { InferenceSession, Tensor: ONNXTensor } = ONNX;

//////////////////////////////////////////////////
// Helper functions

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

async function sessionRun(session, inputs) {
    let output = await session.run(inputs);
    output = replaceTensors(output);
    return output;
}

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

function boolTensor(value) {
    // Create boolean tensor
    return new Tensor('bool', [value], [1]);
}

// JS doesn't support mixings, so we define some reused functions here, and allow "this" to be passed in

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
    pastKeyValues = self.getPastKeyValues(decoderResults);

    return new Seq2SeqLMOutput(logits, pastKeyValues, encoderOutputs);
}

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

    past_key_values = self.getPastKeyValues(decoderResults);
    return { logits, past_key_values };
}

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

function textgenUpdatebeam(beam, newTokenId) {
    beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    beam.model_input_ids = new Tensor('int64', [BigInt(newTokenId)], [1, 1]);
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Base class
class PreTrainedModel extends Callable {
    constructor(config, session) {
        super();

        this.config = config;
        this.session = session;

    }

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

    async _call(model_inputs) {
        return await sessionRun(this.session, model_inputs);
    }

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

        // if (generation_config.repetition_penalty !== null && generation_config.repetition_penalty !== 1.0) {
        //     processors.push(new RepetitionPenaltyLogitsProcessor(generation_config.repetition_penalty));
        // }

        // if (generation_config.no_repeat_ngram_size !== null && generation_config.no_repeat_ngram_size > 0) {
        //     processors.push(new NoRepeatNGramLogitsProcessor(generation_config.no_repeat_ngram_size));
        // }

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

    _get_generation_config(generation_config) {
        // Create empty generation config (contains defaults)
        let gen_config = new GenerationConfig();

        // Apply model's generation config
        Object.assign(gen_config, this.generation_config);

        // Finally, use any generation config specified by the user
        // when calling `generate`
        if (generation_config !== null) {
            Object.assign(gen_config, generation_config);
        }
        return gen_config;
    }
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
                logits_processor(beam.output_token_ids, output.logits)

                let sampledTokens = sampler(output.logits);

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
    getPastKeyValues(decoderResults) {
        const pkvs = {};

        for (const name in decoderResults) {
            if (name.startsWith('present')) {
                pkvs[name.replace('present', 'past_key_values')] = decoderResults[name]
            }
        }
        return pkvs;
    }
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
class BertForMaskedLM extends BertPreTrainedModel {
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}
class BertForSequenceClassification extends BertPreTrainedModel {
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}
class BertForQuestionAnswering extends BertPreTrainedModel {
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
class DistilBertForSequenceClassification extends DistilBertPreTrainedModel {
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}
class DistilBertForQuestionAnswering extends DistilBertPreTrainedModel {
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
class DistilBertForMaskedLM extends DistilBertPreTrainedModel {
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Albert models
class AlbertPreTrainedModel extends PreTrainedModel { }
class AlbertModel extends AlbertPreTrainedModel { }
class AlbertForSequenceClassification extends AlbertPreTrainedModel {
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}
class AlbertForQuestionAnswering extends AlbertPreTrainedModel {
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
class AlbertForMaskedLM extends AlbertPreTrainedModel {
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
    async generate(...args) {
        throw Error(
            "The current model class (T5Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'T5ForConditionalGeneration'}"
        )
    }
}

class T5ForConditionalGeneration extends T5PreTrainedModel {
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

    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// MT5 models
class MT5PreTrainedModel extends PreTrainedModel { };

class MT5Model extends MT5PreTrainedModel {
    async generate(...args) {
        throw Error(
            "The current model class (MT5Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'MT5ForConditionalGeneration'}"
        )
    }
}

class MT5ForConditionalGeneration extends MT5PreTrainedModel {
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

    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Bart models
class BartPretrainedModel extends PreTrainedModel { };

class BartModel extends BartPretrainedModel {
    async generate(...args) {
        throw Error(
            "The current model class (BartModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'BartForConditionalGeneration'}"
        )
    }
}

class BartForConditionalGeneration extends BartPretrainedModel {
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

    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs);
    }
}

class BartForSequenceClassification extends BartPretrainedModel {
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
class RobertaForMaskedLM extends RobertaPreTrainedModel {
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}
class RobertaForSequenceClassification extends RobertaPreTrainedModel {
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}
class RobertaForQuestionAnswering extends RobertaPreTrainedModel {
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// T5 models
class WhisperPreTrainedModel extends PreTrainedModel { };

class WhisperModel extends WhisperPreTrainedModel {
    async generate(...args) {
        throw Error(
            "The current model class (WhisperModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'WhisperForConditionalGeneration'}"
        )
    }
}

class WhisperForConditionalGeneration extends WhisperPreTrainedModel {
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



        // Modify forced_decoder_ids_mapping. This is the way HF also does it,
        // but it would probably be best to not modify the class' mapping, and
        // rather create a copy?


        return super.generate(inputs, generation_config, logits_processor)
    }

    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    getStartBeams(inputTokenIds, numOutputTokens, ...args) {
        // arguments ignored in this case
        return seq2seqStartBeams(this, inputTokenIds, numOutputTokens, false);
    }

    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam, {
            input_name: 'input_features',
        });
    }
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs, {
            encoder_input_name: 'input_features',
        });
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
class VisionEncoderDecoderModel extends PreTrainedModel {
    constructor(config, session, decoder_merged_session) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;

        this.num_layers = this.config.decoder.n_layer;
        this.num_heads = this.config.decoder.n_head;
        this.dim_kv = this.config.decoder.n_embd / this.num_heads;
    }

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

    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }
    async runBeam(beam) {
        return seq2seqRunBeam(this, beam, {
            input_name: 'pixel_values',
        });
    }

    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

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
class GPT2Model extends GPT2PreTrainedModel {
    async generate(...args) {
        throw Error(
            "The current model class (GPT2Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'GPT2LMHeadModel'}"
        )
    }
}

class GPT2LMHeadModel extends GPT2PreTrainedModel {
    constructor(config, session) {
        super(config, session);

        // config doesn't contain pad_token_id, so we assume it is the eos_token_id
        this.config.pad_token_id = this.config.eos_token_id

        this.num_heads = this.config.n_head
        this.num_layers = this.config.n_layer
        this.dim_kv = this.config.n_embd / this.num_heads;
    }

    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }


    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

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
    async generate(...args) {
        throw Error(
            "The current model class (GPTNeoModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'GPTNeoForCausalLM'}"
        )
    }
}

class GPTNeoForCausalLM extends GPTNeoPreTrainedModel {
    constructor(config, session) {
        super(config, session);

        // config doesn't contain pad_token_id, so we assume it is the eos_token_id
        this.config.pad_token_id = this.config.eos_token_id

        this.num_heads = this.config.num_heads;
        this.num_layers = this.config.num_layers;
        this.dim_kv = this.config.hidden_size / this.num_heads;
    }

    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

    async forward(model_inputs) {
        return await textgen_forward(this, model_inputs)
    }
}

//////////////////////////////////////////////////
// CodeGen models
class CodeGenPreTrainedModel extends PreTrainedModel { }
class CodeGenModel extends CodeGenPreTrainedModel {
    async generate(...args) {
        throw Error(
            "The current model class (CodeGenModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'CodeGenForCausalLM'}"
        )
    }
}

class CodeGenForCausalLM extends CodeGenPreTrainedModel {
    constructor(config, session) {
        super(config, session);

        // config doesn't contain pad_token_id, so we assume it is the eos_token_id
        this.config.pad_token_id = this.config.eos_token_id

        this.num_heads = this.config.n_head
        this.num_layers = this.config.n_layer
        this.dim_kv = this.config.n_embd / this.num_heads;
    }

    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

    async forward(model_inputs) {
        return await textgen_forward(this, model_inputs)
    }

}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
class ViTPreTrainedModel extends PreTrainedModel { }
class ViTForImageClassification extends ViTPreTrainedModel {
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
class DetrPreTrainedModel extends PreTrainedModel { }
class DetrForObjectDetection extends DetrPreTrainedModel {
    async _call(model_inputs) {
        let output = (await super._call(model_inputs));
        return new DetrObjectDetectionOutput(output.logits, output.pred_boxes)
    }
}

class DetrObjectDetectionOutput extends ModelOutput {
    constructor(logits, pred_boxes) {
        super();
        this.logits = logits;
        this.pred_boxes = pred_boxes;
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// AutoModels, used to simplify construction of PreTrainedModels
// (uses config to instantiate correct class)
class AutoModel {
    // Helper class to determine model type from config

    static async from_pretrained(modelPath, progressCallback = null) {

        let config = await fetchJSON(modelPath, 'config.json', progressCallback);
        let modelName = config.is_encoder_decoder ? 'encoder_model.onnx' : 'model.onnx';

        let session = await constructSession(modelPath, modelName, progressCallback);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        switch (config.model_type) {
            case 'bert':
                return new BertModel(config, session);
            case 'albert':
                return new AlbertModel(config, session);
            case 'distilbert':
                return new DistilBertModel(config, session);
            case 't5':
                return new T5Model(config, session);
            case 'gpt_neo':
                return new GPTNeoModel(config, session);
            case 'gpt2':
                return new GPT2Model(config, session);
            case 'codegen':
                return new CodeGenModel(config, session);
            case 'bart':
                return new BartModel(config, session);
            case 'roberta':
                return new RobertaModel(config, session);
            case 'whisper':
                return new WhisperModel(config, session);
            case 'clip':
                return new CLIPModel(config, session);

            default:
                console.warn(`Unknown model class "${config.model_type}", attempting to construct from base class.`);
                return new PreTrainedModel(config, session);
        }
    }
}

class AutoModelForSequenceClassification {

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

        switch (config.model_type) {
            case 'bert':
                return new BertForSequenceClassification(config, session);
            case 'albert':
                return new AlbertForSequenceClassification(config, session);
            case 'distilbert':
                return new DistilBertForSequenceClassification(config, session);
            case 'roberta':
                return new RobertaForSequenceClassification(config, session);
            case 'bart':
                return new BartForSequenceClassification(config, session);

            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }
}

class AutoModelForSeq2SeqLM {
    static modelClassMapping = {
        't5': T5ForConditionalGeneration,
        'mt5': MT5ForConditionalGeneration,
        'bart': BartForConditionalGeneration,
        'whisper': WhisperForConditionalGeneration,
    }
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        let config = info[0];
        let cls = this.modelClassMapping[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(...info)
    }
}

class AutoModelForCausalLM {
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

        switch (config.model_type) {
            case 'gpt2':
                return new GPT2LMHeadModel(
                    config,
                    session
                );

            case 'gpt_neo':
                return new GPTNeoForCausalLM(
                    config,
                    session
                );

            case 'codegen':
                return new CodeGenForCausalLM(
                    config,
                    session
                )

            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }
}

class AutoModelForMaskedLM {

    static async from_pretrained(modelPath, progressCallback = null) {

        let config = await fetchJSON(modelPath, 'config.json', progressCallback);
        let modelName = config.is_encoder_decoder ? 'encoder_model.onnx' : 'model.onnx';

        let session = await constructSession(modelPath, modelName, progressCallback);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        switch (config.model_type) {
            case 'bert':
                return new BertForMaskedLM(config, session);
            case 'albert':
                return new AlbertForMaskedLM(config, session);
            case 'distilbert':
                return new DistilBertForMaskedLM(config, session);
            case 'roberta':
                return new RobertaForMaskedLM(config, session);

            default:
                console.warn(`Unknown model class "${config.model_type}", attempting to construct from base class.`);
                return new PreTrainedModel(config, session);
        }
    }
}

class AutoModelForQuestionAnswering {

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

        switch (config.model_type) {
            case 'bert':
                return new BertForQuestionAnswering(config, session);
            case 'albert':
                return new AlbertForQuestionAnswering(config, session);
            case 'distilbert':
                return new DistilBertForQuestionAnswering(config, session);
            case 'roberta':
                return new RobertaForQuestionAnswering(config, session);

            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }
}

class AutoModelForVision2Seq {
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

        switch (config.model_type) {
            case 'vision-encoder-decoder':
                return new VisionEncoderDecoderModel(
                    config,
                    session,
                    decoder_merged_session
                );
            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }
}

class AutoModelForImageClassification {
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

        switch (config.model_type) {
            case 'vit':
                return new ViTForImageClassification(
                    config,
                    session,
                );
            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }

}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
class AutoModelForObjectDetection {
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

        switch (config.model_type) {
            case 'detr':
                return new DetrForObjectDetection(
                    config,
                    session,
                );
            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }

}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
class Seq2SeqLMOutput extends ModelOutput {
    constructor(logits, past_key_values, encoder_outputs) {
        super();
        this.logits = logits;
        this.past_key_values = past_key_values;
        this.encoder_outputs = encoder_outputs;
    }
}

class SequenceClassifierOutput extends ModelOutput {
    constructor(logits) {
        super();
        this.logits = logits;
    }
}

class MaskedLMOutput extends ModelOutput {
    constructor(logits) {
        super();
        this.logits = logits;
    }
}

class QuestionAnsweringModelOutput extends ModelOutput {
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
    AutoModelForCausalLM,
    AutoModelForMaskedLM,
    AutoModelForQuestionAnswering,
    AutoModelForVision2Seq,
    AutoModelForImageClassification,
    AutoModelForObjectDetection,
};
