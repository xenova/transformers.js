// This script handles interaction with the user interface, as well as handling
// the communication between the main thread (UI) and the background thread (processing).

const inputElement = document.getElementById('text');
const outputElement = document.getElementById('output');

// 1. Send input data to the worker thread when it changes.
inputElement.addEventListener('input', (event) => {
    chrome.runtime.sendMessage(event.target.value, (response) => {
        // 2. Handle results returned by the service worker (`background.js`) and update the UI.
        outputElement.innerText = JSON.stringify(response, null, 2);
    });
});
