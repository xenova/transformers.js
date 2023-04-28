// This file (model.js) contains all the logic for loading the model and running predictions.

// NOTE: Replace this with your own task and model
const task = 'text-classification';
const model = 'distilbert-base-uncased-finetuned-sst-2-english';

// We can't use `require` syntax since @xenova/transformers is an ES module. So, we use
// dynamic imports to load the Transformers.js package asynchronously. Then, we create a
// pipeline with the specified task and model, and return a promise that resolves to the
// pipeline. Later on, we will await this pipeline and use it to run predictions.
const modelPromise = new Promise(async (resolve, reject) => {
    try {
        let { pipeline, env } = await import('@xenova/transformers');

        // Only use local models
        env.allowRemoteModels = false;

        resolve(await pipeline(task, model));
    } catch (err) {
        reject(err);
    }
});

// The run function is used by the `transformers:run` event handler.
async function run(event, text) {
    let model = await modelPromise;
    return await model(text);
}

module.exports = {
    run
}
