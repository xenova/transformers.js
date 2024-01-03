// sidepanel.js - handles the sidepanel UI and hosts inference Worker(s)

const inputElement = document.getElementById('text');
const outputElement = document.getElementById('output');


import { pipeline, env } from '@xenova/transformers';

// Skip initial check for local models, since we are not loading any local models.
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;


class PipelineSingleton {
    static task = 'text-classification';
    static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }

        return this.instance;
    }
}

// Create generic classify function, which will be reused for the different types of events.
const classify = async (text) => {
    // Get the pipeline instance. This will load and build the model when run for the first time.
    let model = await PipelineSingleton.getInstance((data) => {
        // You can track the progress of the pipeline creation here.
        // e.g., you can send `data` back to the UI to indicate a progress bar
        // console.log('progress', data)
    });

    // Actually run the model on the input text
    let result = await model(text);
    return result;
};


const main = async inference_input => {
    inputElement.value = inference_input;
    const result = await classify(inference_input)
    outputElement.innerText = JSON.stringify(result, null, 2);
}

// Listen for changes made to the textbox.
inputElement.addEventListener('input', async (event) => {
    const result = await classify(event.target.value)
    outputElement.innerText = JSON.stringify(result, null, 2);
});

const pending = await chrome.storage.session.get('inference_input')
if (pending.inference_input?.length > 0) {
    main(pending.inference_input)
    chrome.storage.session.remove('inference_input')
}
const port = chrome.runtime.connect()
port.onMessage.addListener((message, sender, sendResponse) => {
    main(message.text)
})
