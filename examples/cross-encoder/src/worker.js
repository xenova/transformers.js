import { env, AutoTokenizer, AutoModelForSequenceClassification } from '@xenova/transformers';

// Skip local model check since we are downloading the model from the Hugging Face Hub.
env.allowLocalModels = false;

class CrossEncoderSingleton {
    static model_id = 'mixedbread-ai/mxbai-rerank-xsmall-v1';
    static model = null;
    static tokenizer = null;

    static async getInstance(progress_callback) {
        if (!this.tokenizer) {
            this.tokenizer = AutoTokenizer.from_pretrained(this.model_id);
        }

        if (!this.model) {
            this.model = AutoModelForSequenceClassification.from_pretrained(this.model_id, {
                quantized: true,
                progress_callback,
            });
        }

        return Promise.all([this.tokenizer, this.model]);
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    // Retrieve the pipeline. When called for the first time,
    // this will load the pipeline and save it for future use.
    const [tokenizer, model] = await CrossEncoderSingleton.getInstance(x => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        self.postMessage(x);
    });

    const { query, documents } = event.data;

    const docs = documents.trim().split('\n');

    const inputs = tokenizer(
        new Array(docs.length).fill(query),
        {
            text_pair: docs,
            padding: true,
            truncation: true,
        }
    )
    const { logits } = await model(inputs);
    const output = logits
        .sigmoid()
        .tolist()
        .map(([score], i) => ({
            corpus_id: i,
            score,
            text: docs[i],
        }))
        .sort((a, b) => b.score - a.score);

    // Send the output back to the main thread
    self.postMessage({ status: 'complete', output });
});
