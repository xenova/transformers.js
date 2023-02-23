import {
    Callable,
    fetchJSON,
    pathJoin,
    indexOfMax,
    softmax,
    getTopItems
} from "./utils.js";

import {
    Sampler,
    GreedySampler,
    TopKSampler
} from "./samplers.js"

import './ort.js'

//////////////////////////////////////////////////
// Helper functions

function dispatchCallback(progressCallback, data) {
    if (progressCallback !== null) progressCallback(data);
}
async function constructSession(modelPath, fileName, progressCallback = null) {
    let path = pathJoin(modelPath, fileName);

    // Initiate session
    dispatchCallback(progressCallback, {
        status: 'initiate',
        name: modelPath,
        file: fileName
    })

    // Make request
    let response = await fetch(path, {
        cache: 'force-cache'
    });
    dispatchCallback(progressCallback, {
        status: 'download',
        name: modelPath,
        file: fileName
    })

    // Track progress
    const contentLength = response.headers.get('Content-Length');
    const total = parseInt(contentLength);
    let loaded = 0;
    const reader = response.body.getReader();

    const buffer = new Uint8Array(total);

    async function read() {
        const { done, value } = await reader.read();
        if (done) return;

        buffer.set(value, loaded)
        loaded += value.length;

        const progress = (loaded / total) * 100;

        // Call your function here
        dispatchCallback(progressCallback, {
            status: 'progress',
            progress: progress,
            loaded: loaded,
            total: total,
            name: modelPath,
            file: fileName
        })

        return read();
    }

    // Actually read
    await read();

    dispatchCallback(progressCallback, {
        status: 'done',
        name: modelPath,
        file: fileName
    });

    let session = await ort.InferenceSession.create(buffer, {
        // executionProviders: ["webgl"]
        executionProviders: ["wasm"]
    });

    return session
}

//////////////////////////////////////////////////

//////////////////////////////////////////////////
// AutoModels, used to simplify construction of PreTrainedModels
// (uses config to instantiate correct class)
class AutoModel {
    // Helper class to determine model type from config

    static async from_pretrained(modelPath, progressCallback = null) {

        let config = await fetchJSON(pathJoin(modelPath, 'config.json'));
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
            case 'distilbert':
                return new DistilBertModel(config, session);
            case 't5':
                return new T5Model(config, session);
            case 'gpt2':
                return new GPT2Model(config, session);

            default:
                console.warn(`Unknown model class "${config.model_type}", attempting to construct from base class.`);
                return new PreTrainedModel(config, session);
        }
    }
}

class AutoModelForSequenceClassification {

    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
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
            case 'distilbert':
                return new DistilBertForSequenceClassification(config, session);

            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }
}

class AutoModelForSeq2SeqLM {
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session, decoder_session, decoder_with_past_model] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
            constructSession(modelPath, 'encoder_model.onnx', progressCallback),
            constructSession(modelPath, 'decoder_model.onnx', progressCallback),
            constructSession(modelPath, 'decoder_with_past_model.onnx', progressCallback)
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
                    decoder_session,
                    decoder_with_past_model
                );
            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }
}

class AutoModelForCausalLM {
    static async from_pretrained(modelPath, progressCallback = null) {
        // , decoder_with_past_model

        // let name = use_past ?  : 'decoder_model.onnx'
        let [config, session] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
            constructSession(modelPath, 'decoder_with_past_model.onnx', progressCallback)
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

        let config = await fetchJSON(pathJoin(modelPath, 'config.json'));
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

            default:
                console.warn(`Unknown model class "${config.model_type}", attempting to construct from base class.`);
                return new PreTrainedModel(config, session);
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
            max_length: 100,
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

        let config = await fetchJSON(pathJoin(modelPath, 'config.json'));
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

    prepare_inputs(model_inputs) {
        let new_model_inputs = {};

        // TODO improve
        for (let [key, value] of Object.entries(model_inputs)) {
            if (Array.isArray(value) && value && Number.isInteger(value[0])) {
                // convert integer arrays to tensor
                new_model_inputs[key] = new ort.Tensor('int64',
                    BigInt64Array.from(value.map(x => BigInt(x))),
                    [1, value.length]
                );
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

    async generate(inputTokenIds, options = {}) {
        if (inputTokenIds.length === 0) {
            throw Error("Must supply a non-empty array of input token ids.")
        }
        options = this.prepareGenerationOptions(options);
        // TODO implement early_stopping
        // https://huggingface.co/blog/how-to-generate

        let numOutputTokens = 1;
        const maxOutputTokens = numOutputTokens + options.max_length;

        let sampler = Sampler.getSampler(options);

        let beams = [this.getStartBeam(inputTokenIds, numOutputTokens)];

        while (beams.some(x => !x.done) && numOutputTokens < maxOutputTokens) {

            let newest_beams = [];
            for (let beam of beams) {
                if (beam.done) {
                    // TODO add length penalty (for ending early)
                    // Add this beam back into the pool
                    newest_beams.push(beam);
                    continue
                }

                let output = await this.runBeam(beam, inputTokenIds);

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

    getPastKeyValues(pkvNames, decoderResults) {
        const pkvs = {};

        for (const name of pkvNames) {
            pkvs[name.replace('present', 'past_key_values')] = decoderResults[name]
        }
        return pkvs;
    }
    addPastKeyValues(decoderFeeds, pastKeyValues, suffix = '') {
        if (pastKeyValues === null) {
            for (let i = 0; i < this.num_layers; ++i) {
                decoderFeeds[`past_key_values.${i}${suffix}.key`] = new ort.Tensor('float32', [], [1, this.num_heads, 0, this.dim_kv])
                decoderFeeds[`past_key_values.${i}${suffix}.value`] = new ort.Tensor('float32', [], [1, this.num_heads, 0, this.dim_kv])
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
        return new MaskedLMOutput(logits, model_inputs)
    }
}
class BertForSequenceClassification extends BertPreTrainedModel {
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits.data;
        return new ClassificationOutput(this.config, logits)
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// DistilBert models
class DistilBertPreTrainedModel extends PreTrainedModel { }
class DistilBertModel extends DistilBertPreTrainedModel { }
class DistilBertForSequenceClassification extends DistilBertPreTrainedModel {
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits.data;
        return new ClassificationOutput(this.config, logits)
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
    constructor(config, session, decoder_session, decoder_with_past_model) {
        super(config, session);
        this.decoder_session = decoder_session;
        this.decoder_with_past_model = decoder_with_past_model;

        this.num_heads = this.config.num_heads
        this.num_layers = this.config.num_layers
        this.dim_kv = this.config.d_kv
    }

    static async from_pretrained(modelPath, progressCallback = null) {
        // TODO optimize? Lots of overlap between decoder and init_decoder

        let [config, session, decoder_session, decoder_with_past_model] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
            constructSession(modelPath, 'encoder_model.onnx', progressCallback),
            constructSession(modelPath, 'decoder_model.onnx', progressCallback),
            constructSession(modelPath, 'decoder_with_past_model.onnx', progressCallback)
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        return new this(config, session, decoder_session, decoder_with_past_model);
    }

    getStartBeam(inputTokenIds, numOutputTokens) {
        // arguments ignored in this case
        return {
            encoder_outputs: null,
            past_key_values: null,

            // decoder_input_ids == output_token_ids
            output_token_ids: [this.config.decoder_start_token_id],
            done: false,
            score: 0,
        }
    }

    async runBeam(beam, inputTokenIds) {
        // 1. Prepare
        let model_inputs = {
            input_ids: inputTokenIds,
            attention_mask: new Array(inputTokenIds.length).fill(1),
            decoder_input_ids: beam.output_token_ids.slice(-1),
            encoder_outputs: beam.encoder_outputs,
            past_key_values: beam.past_key_values,
        }

        // 2. Run
        let output = await this.forward(model_inputs);

        // 3. Update
        beam.past_key_values = output.past_key_values;
        beam.encoder_outputs = output.encoder_outputs;

        return output;
    }
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    async forward(model_inputs) {
        model_inputs = this.prepare_inputs(model_inputs)

        let encoderOutputs = model_inputs.encoder_outputs;
        let pastKeyValues = model_inputs.past_key_values;

        if (encoderOutputs === null) {
            const encoderFeeds = {
                input_ids: model_inputs.input_ids,
                attention_mask: model_inputs.attention_mask,
            }
            const encoderResults = await this.session.run(encoderFeeds);
            encoderOutputs = encoderResults.last_hidden_state;
        }
        let decoderFeeds = {
            input_ids: model_inputs.decoder_input_ids,
            encoder_attention_mask: model_inputs.attention_mask,
            encoder_hidden_states: encoderOutputs,
        };

        if (pastKeyValues !== null) {
            delete pastKeyValues['encoder_last_hidden_state'];
        }

        let logits;
        if (pastKeyValues === null) {
            const initDecoderResults = await this.decoder_session.run(decoderFeeds);
            logits = initDecoderResults.logits;
            pastKeyValues = this.getPastKeyValues(this.decoder_session.outputNames.slice(1), initDecoderResults);

        } else {
            Object.assign(decoderFeeds, pastKeyValues)

            const decoderResults = await this.decoder_with_past_model.run(decoderFeeds);
            logits = decoderResults.logits;
            pastKeyValues = this.getPastKeyValues(this.decoder_with_past_model.outputNames.slice(1), decoderResults);
        }

        return new Seq2SeqLMOutput(logits, pastKeyValues, encoderOutputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// GPT2 models
class GPT2PreTrainedModel extends PreTrainedModel { }
class GPT2Model extends GPT2PreTrainedModel {
    async generate(...args) {
        throw Error(
            "The current model class (GPT2Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'T5ForConditionalGeneration'}"
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
        }
        this.addPastKeyValues(decoderFeeds, past_key_values)

        let decoderResults = await this.session.run(decoderFeeds);
        let logits = decoderResults.logits;

        past_key_values = this.getPastKeyValues(this.session.outputNames.slice(1), decoderResults);
        return { logits, past_key_values };
    }

}
// class GPT2ForSequenceClassification extends GPT2PreTrainedModel {
// TODO
// }
//////////////////////////////////////////////////

class Seq2SeqLMOutput {
    constructor(logits, past_key_values, encoder_outputs) {
        this.logits = logits;
        this.past_key_values = past_key_values;
        this.encoder_outputs = encoder_outputs;
    }
}

class ClassificationOutput {
    constructor(modelConfig, logits) {
        this.logits = logits;
        this.prediction = indexOfMax(logits);
        this.scores = softmax(logits);
        this.id2label = modelConfig.id2label;
        this.label2id = modelConfig.label2id;

        this.score = this.scores[this.prediction];
        this.label = modelConfig.id2label[this.prediction];
    }
}

class MaskedLMOutput {
    constructor(logits, model_inputs) {
        this.logits = logits;
        this.model_inputs = model_inputs;

        this.default_sample_options = {
            top_k: 0,
            temperature: 1,
            num_return_sequences: 1,
            do_sample: false,
        }
    }

    prepareGenerationOptions(options) {
        return Object.assign({}, this.default_sample_options, options)
    }

    sample(mask_token_index, options = {}) {
        options = this.prepareGenerationOptions(options)

        // Helper method to support sampling from masked outputs
        // https://huggingface.co/docs/transformers/main/tasks/masked_language_modeling
        // mask_token_indices is a boolean array which indicates which items should be sampled
        let vocabSize = this.logits.dims[2];

        // Get top n masked elements
        let startIndex = mask_token_index * vocabSize;
        let logs = this.logits.data.slice(startIndex, startIndex + vocabSize);
        let items = getTopItems(logs, options.num_return_sequences);

        let numSequences = Math.min(items.length, options.num_return_sequences);

        // Start with n masked sentences
        let returnedSequences = [];

        // Assign predictions to sequences
        for (let j = 0; j < numSequences; ++j) {
            let sequence = [...this.model_inputs.input_ids];
            sequence[mask_token_index] = items[j][0];
            returnedSequences.push(sequence);
        }

        return returnedSequences;
    }
}

export {
    AutoModel,
    AutoModelForSeq2SeqLM,
    AutoModelForSequenceClassification,
    AutoModelForCausalLM,
    AutoModelForMaskedLM,
    T5ForConditionalGeneration
};
