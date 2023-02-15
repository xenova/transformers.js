import { Callable, fetchJSON, pathJoin } from "./utils.js";


async function constructSession(path) {
    let response = await fetch(path, {
        cache: 'force-cache'
    });
    let modelBuffer = await response.arrayBuffer();
    return await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ["wasm"]
    });
}

class AutoModel {
    // Helper class to determine model type from config

    static async from_pretrained(modelPath) {

        let [config, session] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
            constructSession(pathJoin(modelPath, 'model.onnx'))
        ]);

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

class AutoModelForSeq2SeqLM {
    static async from_pretrained(modelPath) {

        let [config, encoder_session, decoder_session, init_decoder_session] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
            constructSession(pathJoin(modelPath, 'encoder_model.onnx')),
            constructSession(pathJoin(modelPath, 'decoder_model.onnx')),
            constructSession(pathJoin(modelPath, 'decoder_with_past_model.onnx'))
        ])

        switch (config.model_type) {
            case 't5':
                return new T5ForConditionalGeneration(
                    config,
                    encoder_session,
                    decoder_session,
                    init_decoder_session
                );
            default:
                throw Error(`Unsupported model type: ${config.model_type}`)
        }
    }
}

class PreTrainedModel extends Callable {
    constructor(config, encoder_session) {
        super();

        this.config = config;
        this.encoder_session = encoder_session;
    }

    static async from_pretrained(modelPath) {

        // Load model
        let [config, session] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
            constructSession(pathJoin(modelPath, 'model.onnx'))
        ]);

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

        model_inputs = this.prepare_inputs(model_inputs)
        return await this.encoder_session.run(model_inputs);
    }
    async forward(model_inputs) {
        throw Error("forward should be implemented in subclasses.")
    }

}

class BertModel extends PreTrainedModel { }
class DistilBertModel extends PreTrainedModel { }

class T5PreTrainedModel extends PreTrainedModel {

};

class T5Model extends T5PreTrainedModel {
    async generate(...args) {
        throw Error(
            "The current model class (T5Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'T5ForConditionalGeneration'}"
        )
    }
}

class T5ForConditionalGeneration extends T5PreTrainedModel {
    constructor(config, encoder_session, decoder_session, init_decoder_session) {
        super(config, encoder_session);
        this.decoder_session = decoder_session;
        this.init_decoder_session = init_decoder_session;
    }

    static async from_pretrained(modelPath) {
        // TODO optimize? Lots of overlap between decoder and init_decoder

        let [config, encoder_session, decoder_session, init_decoder_session] = await Promise.all([
            fetchJSON(pathJoin(modelPath, 'config.json')),
            constructSession(pathJoin(modelPath, 'encoder_model.onnx')),
            constructSession(pathJoin(modelPath, 'decoder_model.onnx')),
            constructSession(pathJoin(modelPath, 'decoder_with_past_model.onnx'))
        ])

        return new this(config, encoder_session, decoder_session, init_decoder_session);
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
            const encoderResults = await this.encoder_session.run(encoderFeeds);
            const encoderHiddenStates = encoderResults.hidden_states;
            encoderOutputs = encoderHiddenStates;
        }

        // const decoderAttentionMaskTensor = new ort.Tensor("int64", new BigInt64Array(decoderInputIds.length).fill(1n), [1, decoderInputIds.length]);
        const decoderFeeds = {
            "input_ids": decoderInputIdsTensor,
            "encoder_attention_mask": encoderAttentionMaskTensor,
            "encoder_hidden_states": encoderOutputs,
        };
        let logits = null;

        if (pastKeyValues === null) {
            const initDecoderResults = await this.init_decoder_session.run(decoderFeeds);
            logits = initDecoderResults.logits;
            pastKeyValues = this.getPastKeyValues(this.init_decoder_session.outputNames.slice(1), initDecoderResults);

        } else {
            for (const [k, v] of pastKeyValues) {
                decoderFeeds[k] = v;
            }
            const decoderResults = await this.decoder_session.run(decoderFeeds);
            logits = decoderResults.logits;
            pastKeyValues = this.getPastKeyValues(this.decoder_session.outputNames.slice(1), decoderResults);
        }
        return new Seq2SeqLMOutput(logits, pastKeyValues, encoderOutputs);
    }

    getPastKeyValues(pkvNames, decoderResults) {
        const pkvs = [];
        for (const i in pkvNames) {
            const k = pkvNames[i];
            const v = decoderResults[k];
            pkvs.push([`pkv_${i}`, v]);
        }
        return pkvs;
    }


    async generate(inputTokenIds, maxLength = 100, topK = 0, topP = 0, numBeams = 0) {

        let attentionMask = new Array(inputTokenIds.length).fill(1);

        let encoderOutputs = null;
        let pastKeyValues = null;
        let outputTokenIds = [this.config.decoder_start_token_id];
        let numOutputTokens = 1;
        const maxOutputTokens = numOutputTokens + maxLength;

        let sampler = x => this.sampleLogitsGreedily(x);
        if (topK > 0) {
            sampler = x => this.sampleLogitsTopK(x, topK);
        }

        while (numOutputTokens < maxOutputTokens) {

            let output = await this.forward({
                input_ids: inputTokenIds,
                attention_mask: attentionMask,
                decoder_input_ids: outputTokenIds,
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
}

class Seq2SeqLMOutput {
    constructor(logits, pastKeyValues, encoderOutputs) {
        this.logits = logits;
        this.pastKeyValues = pastKeyValues;
        this.encoderOutputs = encoderOutputs;
    }
}

export {
    AutoModel,
    AutoModelForSeq2SeqLM,
    T5ForConditionalGeneration
};
