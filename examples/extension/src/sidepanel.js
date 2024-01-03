// sidepanel.js - handles interaction with the extension's popup, sends requests to the
// service worker (background.js), and updates the popup's UI (popup.html) on completion.

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


// Listen for input incoming from the other pages (like a background service worker managing context menus)
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     console.log('sender', sender)

//     // if (message.action !== 'classify') return; // Ignore messages that are not meant for classification.

//     switch (message.action) {
//         case 'classify':
//         // inputElement.value = message.text // Update sidepanel UI with incoming text
//         // classify(message.text)
//         //     .then(result => {
//         //         outputElement.innerText = JSON.stringify(result, null, 2); // Update sidepanel UI with output
//         //         sendResponse(result)
//         //     })
//         // return true


//     }

//     // Run model prediction asynchronously
//     // (async function () {
//     //     // Perform classification
//     //     let result = await classify(message.text);


//     //     // Send response back to UI
//     //     sendResponse(result);
//     //     return true
//     // })();

//     // return true to indicate we will send a response asynchronously
//     // see https://stackoverflow.com/a/46628145 for more information
//     // return true;
// });