// sidepanel.js - handles the sidepanel UI and starts Worker(s) to run inference

import { classify } from "./inference.mjs";

const inputElement = document.getElementById('text');
const outputElement = document.getElementById('output');

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
