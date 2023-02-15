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

        let config = await fetchJSON(pathJoin(modelPath, 'config.json'));
        let session = await constructSession(pathJoin(modelPath, 'model.onnx'));

        switch (config.model_type) {
            case 'distilbert':
                return new DistilBertModel(config, session);

            default:
                console.warn(`Unknown model class "${config.model_type}", attempting to construct from base class.`);
                return new PreTrainedModel(config, session);
        }
    }
}

class PreTrainedModel extends Callable {
    constructor(config, session) {
        super();

        this.config = config;
        this.session = session;
    }

    static async from_pretrained(modelPath) {

        // Load model
        let config = await fetchJSON(pathJoin(modelPath, 'config.json'));
        let session = await constructSession(pathJoin(modelPath, 'model.onnx'));

        return new this(config, session);
    }

    async _call(model_input) {
        // TODO allow batched inputs

        for (let [key, value] of Object.entries(model_input)) {
            if (Array.isArray(value)) {
                // convert arrays to tensor

                model_input[key] = new ort.Tensor('int64',
                    BigInt64Array.from(value.map(x => BigInt(x))),
                    [1, value.length]
                );
            }
        }

        return await this.session.run(model_input);
    }

}

class DistilBertModel extends PreTrainedModel {

}

export { AutoModel };
