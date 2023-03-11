const {
    Callable,
    getModelFile,
    fetchJSON,
    dispatchCallback,
} = require("./utils.js");

const {
    Sampler,
} = require("./samplers.js");

const { InferenceSession, Tensor } = require('onnxruntime-web');

//////////////////////////////////////////////////
// Helper functions

async function constructSession(modelPath, fileName, progressCallback = null) {
    let buffer = await getModelFile(modelPath, fileName, progressCallback);

    let session = await InferenceSession.create(buffer, {
        // executionProviders: ["webgl"]
        executionProviders: ["wasm"]
    });

    return session
}

function boolTensor(value) {
    // Create boolean tensor
    return new Tensor('bool', [value], [1]);
}

// JS doesn't support mixings, so we define some reused functions here, and allow "this" to be passed in
async function seq2seq_forward(self, model_inputs, {
    encoder_input_name = 'input_ids',
    encoder_attention_mask = true,
    add_decoder_pkv = true
} = {}) {
    model_inputs = self.prepare_inputs(model_inputs)

    let encoderOutputs = model_inputs.encoder_outputs;
    let pastKeyValues = model_inputs.past_key_values;

    if (encoderOutputs === null) {
        const encoderFeeds = {
            [encoder_input_name]: model_inputs[encoder_input_name],
        }
        if (encoder_attention_mask) {
            encoderFeeds.attention_mask = model_inputs.attention_mask
        }
        const encoderResults = await self.session.run(encoderFeeds);
        encoderOutputs = encoderResults.last_hidden_state;
    }
    let decoderFeeds = {
        input_ids: model_inputs.decoder_input_ids,
        encoder_hidden_states: encoderOutputs,
        use_cache_branch: boolTensor(pastKeyValues !== null)
    };
    if (encoder_attention_mask) {
        decoderFeeds.encoder_attention_mask = model_inputs.attention_mask
    }
    self.addPastKeyValues(decoderFeeds, pastKeyValues, add_decoder_pkv);

    const decoderResults = await self.decoder_merged_session.run(decoderFeeds);
    let logits = decoderResults.logits;
    pastKeyValues = self.getPastKeyValues(decoderResults);

    return new Seq2SeqLMOutput(logits, pastKeyValues, encoderOutputs);
}

function seq2seqStartBeam(self, ...args) {
    // arguments ignored in this case
    return {
        encoder_outputs: null,
        past_key_values: null,

        // decoder_input_ids == output_token_ids
        output_token_ids: [self.config.decoder_start_token_id],
        done: false,
        score: 0,
    }
}


async function seq2seqRunBeam(self, beam, inputTokenIds, {
    input_name = 'input_ids',
    add_attention_mask = true,
} = {}
) {
    // 1. Prepare
    let model_inputs = {
        [input_name]: inputTokenIds,
        decoder_input_ids: beam.output_token_ids.slice(-1),
        encoder_outputs: beam.encoder_outputs,
        past_key_values: beam.past_key_values,
    }
    if (add_attention_mask) {
        model_inputs.attention_mask = new Array(inputTokenIds.length).fill(1)
    }

    // 2. Run
    let output = await self.forward(model_inputs);

    // 3. Update
    beam.past_key_values = output.past_key_values;
    beam.encoder_outputs = output.encoder_outputs;

    return output;
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
            case 'gpt2':
                return new GPT2Model(config, session);
            case 'bart':
                return new BartModel(config, session);
            case 'roberta':
                return new RobertaModel(config, session);
            case 'whisper':
                return new WhisperModel(config, session);

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

            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }
}

class AutoModelForSeq2SeqLM {
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
            case 't5':
                return new T5ForConditionalGeneration(
                    config,
                    session,
                    decoder_merged_session
                );
            case 'bart':
                return new BartForConditionalGeneration(
                    config,
                    session,
                    decoder_merged_session
                );
            case 'whisper':
                return new WhisperForConditionalGeneration(
                    config,
                    session,
                    decoder_merged_session
                )
            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
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
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Base class
class PreTrainedModel extends Callable {
    constructor(config, session) {
        super();

        this.config = config;
        this.session = session;


        this.default_generation_options = {
            max_new_tokens: 50,
            top_k: 0,
            num_beams: 1,
            temperature: 1,
            num_return_sequences: 1,
            early_stopping: false,
            do_sample: false,
            discount_factor: 1,

            callback_function: null
        }
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

    prepare_inputs(model_inputs) {
        let new_model_inputs = {};

        // TODO improve
        for (let [key, value] of Object.entries(model_inputs)) {
            if (Array.isArray(value)) {
                // convert arrays to tensors
                // TODO do not assume int64
                new_model_inputs[key] = this.toI64Tensor(value);
            } else {
                new_model_inputs[key] = value;
            }
        }
        return new_model_inputs;
    }

    async _call(model_inputs) {
        // TODO allow batched inputs
        // TODO return ModelOutput object?

        model_inputs = this.prepare_inputs(model_inputs)
        return await this.session.run(model_inputs);
    }
    async forward(model_inputs) {
        throw Error("forward should be implemented in subclasses.")
    }

    async generate(inputs, options = {}) {
        options = this.prepareGenerationOptions(options);

        if (Array.isArray(inputs) && Array.isArray(inputs[0])) { // batched
            let generations = (await Promise.all(inputs.map(x => this.generate_single(x, options))));

            // NOTE: we flatten the output arrays, since this
            // mimics how HuggingFace's generate function operates.
            if (options.num_return_sequences > 1) {
                generations = generations.map(x => x.map(y => y.flat()))
            } else {
                generations = generations.map(x => x.flat())
            }
            return generations
        } else {
            return this.generate_single(inputs, options)
        }
    }

    async generate_single(inputs, options = {}) {
        if (inputs.length === 0) {
            throw Error("Must supply a non-empty array of input token ids.")
        }
        // TODO implement early_stopping
        // https://huggingface.co/blog/how-to-generate

        let numOutputTokens = 1;
        const maxOutputTokens = numOutputTokens + options.max_new_tokens;

        let sampler = Sampler.getSampler(options);

        let beams = [this.getStartBeam(inputs, numOutputTokens)];

        while (beams.some(x => !x.done) && numOutputTokens < maxOutputTokens) {

            let newest_beams = [];
            for (let beam of beams) {
                if (beam.done) {
                    // TODO add length penalty (for ending early)
                    // Add this beam back into the pool
                    newest_beams.push(beam);
                    continue
                }

                let output = await this.runBeam(beam, inputs);

                let sampledTokens = sampler(output.logits);

                for (let [newTokenId, logProb] of sampledTokens) {
                    // use previous beam as a starting point
                    let newBeam = { ...beam };

                    // update new beam
                    this.updateBeam(newBeam, newTokenId)

                    if (options.discount_factor < 1) {
                        newBeam.score *= options.discount_factor;
                    }
                    newBeam.score += logProb;

                    if (newTokenId === this.config.eos_token_id) {
                        newBeam.done = true;
                    }
                    newest_beams.push(newBeam);
                }
            }
            ++numOutputTokens;

            // Update beams
            newest_beams = newest_beams
                .sort((a, b) => b.score - a.score)  // sort based on score
                .slice(0, options.num_beams)        // remove outside beam width

            beams = newest_beams;

            // Run callback
            if (options.callback_function) {
                options.callback_function(beams);
            }
        }

        if (options.num_return_sequences > 1) {
            return beams.slice(0, options.num_return_sequences).map(x => x.output_token_ids);
        } else {
            return [beams[0].output_token_ids];
        }
    }
    prepareGenerationOptions(options) {
        return Object.assign({}, this.default_generation_options, options)
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
// DistilBert models
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
    constructor(config, session, decoder_merged_session) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;


        this.num_decoder_layers = this.config.num_decoder_layers;
        this.num_decoder_heads = this.config.num_heads;
        this.decoder_dim_kv = this.config.d_kv;

        this.num_encoder_layers = this.config.num_layers;
        this.num_encoder_heads = this.config.num_heads;
        this.encoder_dim_kv = this.config.d_kv;
    }

    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session, decoder_merged_session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'encoder_model.onnx', progressCallback),
            constructSession(modelPath, 'decoder_model_merged.onnx', progressCallback),
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        return new this(config, session, decoder_merged_session);
    }

    getStartBeam(...args) {
        return seq2seqStartBeam(this);
    }

    async runBeam(beam, inputTokenIds) {
        return await seq2seqRunBeam(this, beam, inputTokenIds);
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

        this.num_heads = this.config.n_head
        this.num_layers = this.config.n_layer
        this.dim_kv = this.config.n_embd / this.num_heads;
    }

    getStartBeam(inputTokenIds, numOutputTokens) {
        return {
            attention_mask: new Array(inputTokenIds.length).fill(1),
            model_input_ids: [...inputTokenIds],
            past_key_values: null,
            output_token_ids: [],
            num_output_tokens: numOutputTokens,
            done: false,
            score: 0,
        }
    }


    async runBeam(beam, inputTokenIds) {
        // 1. Prepare
        let model_inputs = {
            input_ids: beam.model_input_ids,
            attention_mask: new Array(inputTokenIds.length + beam.output_token_ids.length).fill(1),
            past_key_values: beam.past_key_values,
        }

        // 2. Run
        let output = await this.forward(model_inputs);

        // 3. Update
        beam.past_key_values = output.past_key_values;

        return output;
    }

    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId]
        beam.model_input_ids = [newTokenId];
    }

    async forward(model_inputs) {
        model_inputs = this.prepare_inputs(model_inputs)

        let past_key_values = model_inputs.past_key_values;
        let decoderFeeds = {
            input_ids: model_inputs.input_ids,
            attention_mask: model_inputs.attention_mask,
            use_cache_branch: boolTensor(past_key_values !== null)
        }
        this.addPastKeyValues(decoderFeeds, past_key_values)

        let decoderResults = await this.session.run(decoderFeeds);
        let logits = decoderResults.logits;

        past_key_values = this.getPastKeyValues(decoderResults);
        return { logits, past_key_values };
    }

}
// class GPT2ForSequenceClassification extends GPT2PreTrainedModel {
// TODO
// }
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
    constructor(config, session, decoder_merged_session) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;


        this.num_decoder_layers = this.config.decoder_layers;
        this.num_decoder_heads = this.config.decoder_attention_heads;
        this.decoder_dim_kv = this.config.d_model / this.num_decoder_heads;

        this.num_encoder_layers = this.config.encoder_layers;
        this.num_encoder_heads = this.config.encoder_attention_heads;
        this.encoder_dim_kv = this.config.d_model / this.num_encoder_heads;
    }

    static async from_pretrained(modelPath, progressCallback = null) {
        // TODO remove duplication between here and t5

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

    getStartBeam(...args) {
        return seq2seqStartBeam(this);
    }

    async runBeam(beam, inputTokenIds) {
        return await seq2seqRunBeam(this, beam, inputTokenIds);
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
    constructor(config, session, decoder_merged_session) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;

        this.num_decoder_layers = this.config.decoder_layers;
        this.num_decoder_heads = this.config.decoder_attention_heads;
        this.decoder_dim_kv = this.config.d_model / this.num_decoder_heads;

        this.num_encoder_layers = this.config.encoder_layers;
        this.num_encoder_heads = this.config.encoder_attention_heads;
        this.encoder_dim_kv = this.config.d_model / this.num_encoder_heads;
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

    getStartBeam(...args) {
        // arguments ignored in this case
        return seq2seqStartBeam(this);
    }

    async runBeam(beam, inputFeatures) {
        return await seq2seqRunBeam(this, beam, inputFeatures, {
            input_name: 'input_features',
            add_attention_mask: false
        });
    }
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs, {
            encoder_input_name: 'input_features',
            encoder_attention_mask: false
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

    getStartBeam(...args) {
        return seq2seqStartBeam(this);
    }
    async runBeam(beam, pixel_values) {
        return seq2seqRunBeam(this, beam, pixel_values, {
            input_name: 'pixel_values',
            add_attention_mask: false
        });
    }

    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs, {
            encoder_input_name: 'pixel_values',
            encoder_attention_mask: false,
            add_decoder_pkv: false
        })
    }
}
//////////////////////////////////////////////////

class Seq2SeqLMOutput {
    constructor(logits, past_key_values, encoder_outputs) {
        this.logits = logits;
        this.past_key_values = past_key_values;
        this.encoder_outputs = encoder_outputs;
    }
}

class SequenceClassifierOutput {
    constructor(logits) {
        this.logits = logits;
    }
}

class MaskedLMOutput {
    constructor(logits) {
        this.logits = logits;
    }
}

class QuestionAnsweringModelOutput {
    constructor(start_logits, end_logits) {
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
    T5ForConditionalGeneration
};
