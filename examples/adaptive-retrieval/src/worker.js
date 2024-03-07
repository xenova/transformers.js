import { env, pipeline } from '@xenova/transformers';

// Skip local model check since we are downloading the model from the Hugging Face Hub.
env.allowLocalModels = false;

class MyFeatureExtractionPipeline {
    static task = 'feature-extraction';
    static model = 'nomic-ai/nomic-embed-text-v1.5';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, {
                quantized: true,
                progress_callback,
            });
        }

        return this.instance;
    }
}

// https://huggingface.co/nomic-ai/nomic-embed-text-v1.5#usage
const SEARCH_PREFIX = 'search_query: ';
const DOCUMENT_PREFIX = 'search_document: ';

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    // Retrieve the pipeline. When called for the first time,
    // this will load the pipeline and save it for future use.
    const extractor = await MyFeatureExtractionPipeline.getInstance(x => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        self.postMessage(x);
    });

    const { source, text } = event.data;

    const split = [
        SEARCH_PREFIX + source,
        ...text.trim().split('\n').map(x => DOCUMENT_PREFIX + x),
    ];
    const embeddings = await extractor(split, { pooling: 'mean', normalize: true });

    // Send the output back to the main thread
    self.postMessage({ status: 'complete', embeddings: embeddings.tolist() });
});
