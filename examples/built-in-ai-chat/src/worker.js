
import {
    pipeline,
    InterruptableStoppingCriteria,
    RawTextStreamer,
} from '@xenova/transformers';


/**
 * This class uses the Singleton pattern to ensure that only one instance of the model is loaded.
 */
class TextGenerationPipeline {
    static model_id = 'Xenova/gemini-nano';
    static instance = null;

    static async getInstance() {
        this.instance ??= pipeline('text-generation', this.model_id);
        return this.instance;
    }
}

const stopping_criteria = new InterruptableStoppingCriteria();

async function generate(messages) {
    // Retrieve the text-generation pipeline.
    const generator = await TextGenerationPipeline.getInstance();

    let startTime;
    let numTokens = 0;
    const cb = (output) => {
        startTime ??= performance.now();

        let tps;
        if (numTokens++ > 0) {
            tps = numTokens / (performance.now() - startTime) * 1000;
        }
        self.postMessage({
            status: 'update',
            output, tps, numTokens,
        });
    }

    const streamer = new RawTextStreamer(cb);

    // Tell the main thread we are starting
    self.postMessage({ status: 'start' });

    const output = await generator(messages, {
        streamer,
        stopping_criteria,

        // Greedy search
        top_k: 1,
        temperature: 0,
    })

    if (output[0].generated_text.length === 0) {
        // No response was generated
        self.postMessage({
            status: 'update',
            output: ' ', tps: null, numTokens: 0,
        });
    }

    // Send the output back to the main thread
    self.postMessage({
        status: 'complete',
        output: output[0].generated_text,
    });
}

async function load() {
    self.postMessage({
        status: 'loading',
        data: 'Loading model...'
    });

    // Load the pipeline and save it for future use.
    const generator = await TextGenerationPipeline.getInstance(x => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        self.postMessage(x);
    });

    self.postMessage({
        status: 'loading',
        data: 'Loading the model...'
    });

    // Run model with dummy input to construct session
    await generator('1+1=');
    self.postMessage({ status: 'ready' });
}
// Listen for messages from the main thread
self.addEventListener('message', async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case 'load':
            load().catch((e) => {
                self.postMessage({
                    status: 'error',
                    data: e,
                });
            });
            break;

        case 'generate':
            stopping_criteria.reset();
            generate(data);
            break;

        case 'interrupt':
            stopping_criteria.interrupt();
            break;

        case 'reset':
            stopping_criteria.reset();
            break;
    }
});
