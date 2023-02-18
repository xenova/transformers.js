import {
    Callable,
    fetchJSON,
    pathJoin,
    indexOfMax,
    softmax
} from "./utils.js";


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

    chooseSampler(topK) {
        let sampler = x => this.sampleLogitsGreedily(x);
        if (topK > 0) {
            sampler = x => this.sampleLogitsTopK(x, topK);
        }
        return sampler;

    }

    sampleLogitsGreedily(logits) {
        let shape = logits.dims;
        let [batchSize, seqLength, vocabSize] = shape;
        let n = batchSize * seqLength * vocabSize;
        let startIndex = n - vocabSize;
        let argmaxi = 0;
        let argmax = logits.data[startIndex + argmaxi];
        for (let i = 1; i < vocabSize; i++) {
            let l = logits.data[startIndex + i];
            if (l > argmax) {
                argmaxi = i;
                argmax = l;
            }
        }
        return argmaxi;
    }
    sampleLogitsTopK(logits, k) {
        let shape = logits.dims;
        let [batchSize, seqLength, vocabSize] = shape;
        let n = batchSize * seqLength * vocabSize;
        let startIndex = n - vocabSize;
        let logs = logits.data.slice(startIndex);
        k = Math.min(k, vocabSize);
        let logitAndId = Array.from(logs).map((x, i) => [x, i])
            .sort((a, b) => b[0] - a[0]);
        const sMin = Math.exp(-100.0);
        let sumS = 0.0;
        for (let i = 0; i < logitAndId.length; i++) {
            const s = i < k ? Math.exp(logitAndId[i][0]) : sMin;
            sumS += s;
            logitAndId[i][0] = s;
        }
        let r = Math.random() * sumS;
        for (let i = 0; i < logitAndId.length; i++) {
            r -= logitAndId[i][0];
            if (r <= 0) {
                return logitAndId[i][1];
            }
        }
        return logitAndId[0][1];
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

    async generate(inputTokenIds, maxLength = 20, topK = 0) {

        let attentionMask = new Array(inputTokenIds.length).fill(1);

        let encoderOutputs = null;
        let pastKeyValues = null;
        let outputTokenIds = [this.config.decoder_start_token_id];
        let numOutputTokens = 1;
        const maxOutputTokens = numOutputTokens + maxLength;

        let sampler = this.chooseSampler(topK);

        while (numOutputTokens < maxOutputTokens) {
            let output = await this.forward({
                input_ids: inputTokenIds,
                attention_mask: attentionMask,
                decoder_input_ids: outputTokenIds.slice(-1),
                encoder_outputs: encoderOutputs,
                past_key_values: pastKeyValues,
            });
            pastKeyValues = output.pastKeyValues;
            encoderOutputs = output.encoderOutputs;

            let newTokenId = sampler(output.logits);
            outputTokenIds.push(newTokenId);
            ++numOutputTokens;
            if (newTokenId === this.config.eos_token_id) {
                break;
            }
        }
        return outputTokenIds;
    }
    async forward(model_inputs) {
        model_inputs = this.prepare_inputs(model_inputs)

        let inputIdsTensor = model_inputs.input_ids;
        let encoderAttentionMaskTensor = model_inputs.attention_mask;
        let decoderInputIdsTensor = model_inputs.decoder_input_ids;
        let encoderOutputs = model_inputs.encoder_outputs;
        let pastKeyValues = model_inputs.past_key_values;

        if (encoderOutputs === null) {
            const encoderFeeds = {
                "input_ids": inputIdsTensor,
                "attention_mask": encoderAttentionMaskTensor,
            }
            const encoderResults = await this.session.run(encoderFeeds);
            encoderOutputs = encoderResults.last_hidden_state;
        }
        let decoderFeeds = {
            "input_ids": decoderInputIdsTensor,
            "encoder_attention_mask": encoderAttentionMaskTensor,
            "encoder_hidden_states": encoderOutputs,
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
            delete pastKeyValues['encoder_last_hidden_state'];

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

    async generate(inputTokenIds, maxLength = 20, topK = 0) {

        let model_input_ids = [...inputTokenIds]

        let pastKeyValues = null;
        let outputTokenIds = [];
        let numOutputTokens = 1;
        const maxOutputTokens = numOutputTokens + maxLength;

        let sampler = this.chooseSampler(topK);

        while (numOutputTokens < maxOutputTokens) {
            let output = await this.forward({
                input_ids: model_input_ids,
                attention_mask: new Array(inputTokenIds.length + outputTokenIds.length).fill(1),
                past_key_values: pastKeyValues,
            });
            pastKeyValues = output.pastKeyValues;

            let newTokenId = sampler(output.logits);
            outputTokenIds.push(newTokenId);
            model_input_ids = [newTokenId];

            ++numOutputTokens;
            if (newTokenId === this.config.eos_token_id) {
                break;
            }
        }
        return outputTokenIds;
    }

    async forward(model_inputs) {
        model_inputs = this.prepare_inputs(model_inputs)

        let pastKeyValues = model_inputs.past_key_values;
        let decoderFeeds = {
            input_ids: model_inputs.input_ids,
            attention_mask: model_inputs.attention_mask,
        }
        this.addPastKeyValues(decoderFeeds, pastKeyValues)

        let decoderResults = await this.session.run(decoderFeeds);
        let logits = decoderResults.logits;

        pastKeyValues = this.getPastKeyValues(this.session.outputNames.slice(1), decoderResults);
        return { logits, pastKeyValues };
    }

}
// class GPT2ForSequenceClassification extends GPT2PreTrainedModel {
// TODO
// }
//////////////////////////////////////////////////

class Seq2SeqLMOutput {
    constructor(logits, pastKeyValues, encoderOutputs) {
        this.logits = logits;
        this.pastKeyValues = pastKeyValues;
        this.encoderOutputs = encoderOutputs;
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
