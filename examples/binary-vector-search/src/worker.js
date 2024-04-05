import { env, pipeline } from '@xenova/transformers';

// Skip local model check since we are downloading the model from the Hugging Face Hub.
env.allowLocalModels = false;

class MyFeatureExtractionPipeline {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, {
                quantized: false,
                progress_callback,
            });
        }

        return this.instance;
    }
}


// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    // Retrieve the pipeline. When called for the first time,
    // this will load the pipeline and save it for future use.
    const extractor = await MyFeatureExtractionPipeline.getInstance(x => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        self.postMessage(x);
    });

    const texts = event.data.texts;

    const embeddings = await extractor(texts, { pooling: 'mean', normalize: true, quantize: true, precision: 'ubinary' });

    // Send the output back to the main thread
    self.postMessage({ status: 'complete', embeddings: embeddings.tolist() });
});
