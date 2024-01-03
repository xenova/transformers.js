// sidepanel.js - handles the sidepanel UI and starts Worker(s) to run inference

import { infer } from "./inference.mjs";

const inputElement = document.getElementById('text');
const outputElement = document.getElementById('output');

// Create generic inference function, which will be reused for the different types of events.
const infer = async (text) => {
    // Get the pipeline instance. This will load and build the model when run for the first time.
    let model = await PipelineSingleton.getInstance((data) => {
        // chrome.runtime.sendMessage({ type: 'model_load_progress', data: data })
        // You can track the progress of the pipeline creation here.
        // e.g., you can send `data` back to the UI to indicate a progress bar
        console.log('progress', data)
    });

    // Actually run the model on the input text
    let result = await model(text);
    return result;
};

const main = async inference_input => {
    inputElement.value = inference_input;
    const result = await infer(inference_input)
    outputElement.innerText = JSON.stringify(result, null, 2);
}

// On load, check if there's any pending input saved by the background worker because the sidepanel wasn't open yet
const pending = await chrome.storage.session.get('inference_input')
if (pending.inference_input?.length > 0) {
    main(pending.inference_input)
    chrome.storage.session.remove('inference_input')
}

// Open port and listen for additional input from the background worker once open
const port = chrome.runtime.connect()
port.onMessage.addListener((message, sender, sendResponse) => {
    main(message.text)
})

// Accept input added directly to the text box in the sidepanel UI
inputElement.addEventListener('input', async (event) => {
    main(event.target.value)
});
