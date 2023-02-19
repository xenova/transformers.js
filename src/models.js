import {
    Callable,
    fetchJSON,
    pathJoin,
    indexOfMax,
    softmax,
} from "./utils.js";

import {
    GreedySampler,
    TopKSampler,
    BeamSearchSampler
} from "./samplers.js"

//////////////////////////////////////////////////
// Helper functions
async function constructSession(path) {
    let response = await fetch(path, {
        cache: 'force-cache'
    });
    let modelBuffer = await response.arrayBuffer();
    return await ort.InferenceSession.create(modelBuffer, {
        // executionProviders: ["webgl"]
        executionProviders: ["wasm"]
    });
}

//////////////////////////////////////////////////

//////////////////////////////////////////////////
// AutoModels, used to simplify construction of PreTrainedModels
// (uses config to instantiate correct class)
class AutoModel {
    // Helper class to determine model type from config

    static async from_pretrained(modelPath) {

        let config = await fetchJSON(pathJoin(modelPath, 'config.json'));
        let modelName = config.is_encoder_decoder ? 'encoder_model.onnx' : 'model.onnx';

        let session = await constructSession(pathJoin(modelPath, modelName));

        switch (config.model_type) {
            case 'bert':
                return new BertModel(config, session);
            case 'distilbert':
                return new DistilBertModel(config, session);
            case 't5':
                return new T5Model(config, session);

            default:
                console.warn(`Unknown model class "${config.model_type}", attempting to construct from base class.`);
                return new PreTrainedModel(config, session);
        }
    }
}

class AutoModelForSequenceClassification {

    static async from_pretrained(modelPath) {

        let [config, session] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
            constructSession(pathJoin(modelPath, 'model.onnx'))
        ]);

        switch (config.model_type) {
            case 'distilbert':
                return new DistilBertForSequenceClassification(config, session);

            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }
}

class AutoModelForSeq2SeqLM {
    static async from_pretrained(modelPath) {

        let [config, session, decoder_session, decoder_with_past_model] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
            constructSession(pathJoin(modelPath, 'encoder_model.onnx')),
            constructSession(pathJoin(modelPath, 'decoder_model.onnx')),
            constructSession(pathJoin(modelPath, 'decoder_with_past_model.onnx'))
        ])

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
    static async from_pretrained(modelPath) {
        // , decoder_with_past_model

        // let name = use_past ?  : 'decoder_model.onnx'
        let [config, session] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
            constructSession(pathJoin(modelPath, 'decoder_with_past_model.onnx'))
        ])

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
            num_return_sequences: 1,
            early_stopping: false,
        }
    }

    static async from_pretrained(modelPath) {

        let config = await fetchJSON(pathJoin(modelPath, 'config.json'));
        let modelName = config.is_encoder_decoder ? 'encoder_model.onnx' : 'model.onnx';

        // Load model
        let session = await constructSession(pathJoin(modelPath, modelName));

        return new this(config, session);
    }

    prepare_inputs(model_inputs) {
        // TODO improve
        for (let [key, value] of Object.entries(model_inputs)) {
            if (Array.isArray(value) && value && Number.isInteger(value[0])) {
                // convert integer arrays to tensor
                model_inputs[key] = new ort.Tensor('int64',
                    BigInt64Array.from(value.map(x => BigInt(x))),
                    [1, value.length]
                );
            }
        }
        return model_inputs;
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
    async generate(...args) {
        throw Error("generate should be implemented in subclasses.")
    }
    prepareGenerationOptions(options) {
        return Object.assign({}, this.default_generation_options, options)
    }

    chooseSampler(options) {
        let sampler;

        // TODO add beam
        if (options.num_beams > 1) {
            sampler = new BeamSearchSampler(options.num_beams)

        } else if (options.top_k > 0) {
            sampler = new TopKSampler(options.top_k)
        } else {
            sampler = new GreedySampler()
        }

        return sampler;
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
class BertModel extends PreTrainedModel { }
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

    static async from_pretrained(modelPath) {
        // TODO optimize? Lots of overlap between decoder and init_decoder

        let [config, session, decoder_session, decoder_with_past_model] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
            constructSession(pathJoin(modelPath, 'encoder_model.onnx')),
            constructSession(pathJoin(modelPath, 'decoder_model.onnx')),
            constructSession(pathJoin(modelPath, 'decoder_with_past_model.onnx'))
        ])

        return new this(config, session, decoder_session, decoder_with_past_model);
    }

    async generate(inputTokenIds, options = {}) {
        options = this.prepareGenerationOptions(options);


        let beam = {
            encoder_outputs: null,
            past_key_values: null,
            decoder_input_ids: [this.config.decoder_start_token_id],
        }

        let numOutputTokens = 1;
        const maxOutputTokens = numOutputTokens + options.max_length;

        let sampler = this.chooseSampler(options);
        let attentionMask = new Array(inputTokenIds.length).fill(1);
        while (numOutputTokens < maxOutputTokens) {
            let output = await this.forward({
                input_ids: inputTokenIds,
                attention_mask: attentionMask,
                decoder_input_ids: beam.decoder_input_ids.slice(-1),
                encoder_outputs: beam.encoder_outputs,
                past_key_values: beam.past_key_values,
            });
            beam.past_key_values = output.past_key_values;
            beam.encoder_outputs = output.encoder_outputs;

            let newTokenId = sampler(output.logits)[0][0];
            beam.decoder_input_ids.push(newTokenId);
            ++numOutputTokens;
            if (newTokenId === this.config.eos_token_id) {
                break;
            }
        }
        return beam.decoder_input_ids;
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

    async generate(inputTokenIds, options = {}) {
        options = this.prepareGenerationOptions(options);
        // TODO implement early_stopping
        // https://huggingface.co/blog/how-to-generate

        let model_input_ids = [...inputTokenIds]

        let numOutputTokens = 1;
        const maxOutputTokens = numOutputTokens + options.max_length;

        let sampler = this.chooseSampler(options);

        let initBeam = {
            attention_mask: new Array(inputTokenIds.length).fill(1),
            model_input_ids: model_input_ids,
            past_key_values: null,
            output_token_ids: [],
            num_output_tokens: numOutputTokens,
            done: false,
            score: 0,
        }

        let beams = [initBeam];

        while (beams.some(x => !x.done) && numOutputTokens < maxOutputTokens) {

            let newest_beams = [];
            for (let beam of beams) {
                if (beam.done) continue;

                let attention_mask = new Array(inputTokenIds.length + beam.output_token_ids.length).fill(1);

                let output = await this.forward({
                    input_ids: beam.model_input_ids,
                    attention_mask: attention_mask,
                    past_key_values: beam.past_key_values,
                });
                beam.past_key_values = output.past_key_values;

                let sampledTokens = sampler(output.logits);

                for (let [newTokenId, logProb] of sampledTokens) {
                    // use previous beam as a starting point
                    let newBeam = { ...beam };

                    // update new beam
                    newBeam.output_token_ids = [...beam.output_token_ids, newTokenId]
                    newBeam.model_input_ids = [newTokenId];
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
        }

        if (options.num_return_sequences > 1) {
            return beams.slice(0, options.num_return_sequences).map(x => x.output_token_ids);
        } else {
            return beams[0].output_token_ids;
        }
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
        this.score = softmax(logits)[this.prediction];
        this.label = modelConfig.id2label[this.prediction];
    }
}

export {
    AutoModel,
    AutoModelForSeq2SeqLM,
    AutoModelForSequenceClassification,
    AutoModelForCausalLM,
    T5ForConditionalGeneration
};
