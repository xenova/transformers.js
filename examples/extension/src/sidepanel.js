// sidepanel.js - handles the sidepanel UI and starts Worker(s) to run inference

import { classify } from "./inference.mjs";

const inputElement = document.getElementById('text');
const outputElement = document.getElementById('output');

const port = chrome.runtime.connect()

const main = async inference_input => {
    inputElement.value = inference_input;
    const result = await classify(inference_input)
    outputElement.innerText = JSON.stringify(result, null, 2);
}

// On load, check if there's any pending input saved by the background worker because the sidepanel wasn't open yet
const pending = await chrome.storage.session.get('inference_input')
if (pending.inference_input?.length > 0) {
    main(pending.inference_input)
    chrome.storage.session.remove('inference_input')
}

// Listen for additional input from the background worker once open
port.onMessage.addListener((message, sender, sendResponse) => {
    main(message.text)
})

// Accept input added directly to the text box in the sidepanel UI
inputElement.addEventListener('input', async (event) => {
    main(event.target.value)
});
