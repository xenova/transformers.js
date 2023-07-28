
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

/**
 * This class uses the Singleton pattern to ensure that only one instance of the pipeline is loaded.
 */
class CodeCompletionPipeline {
    static task = 'text-generation';
    static model = null;
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }

        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const {
        model, text, max_new_tokens,

        // Generation parameters
        temperature,
        top_k,
        do_sample,
    } = event.data;

    if (CodeCompletionPipeline.model !== model) {
        // Invalidate model if different
        CodeCompletionPipeline.model = model;

        if (CodeCompletionPipeline.instance !== null) {
            (await CodeCompletionPipeline.getInstance()).dispose();
            CodeCompletionPipeline.instance = null;
        }
    }

    // Retrieve the code-completion pipeline. When called for the first time,
    // this will load the pipeline and save it for future use.
    let generator = await CodeCompletionPipeline.getInstance(x => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        self.postMessage(x);
    });

    // Actually perform the code-completion
    let output = await generator(text, {
        max_new_tokens,
        temperature,
        top_k,
        do_sample,

        // Allows for partial output
        callback_function: x => {
            self.postMessage({
                status: 'update',
                output: generator.tokenizer.decode(x[0].output_token_ids, { skip_special_tokens: true })
            });
        }
    });

    // Send the output back to the main thread
    self.postMessage({
        status: 'complete',
        output: output,
    });
});
