// background.js - Handles requests from the UI, runs the model, then sends back a response

// open sidepanel when extension button is clicked
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

////////////////////// Send Input for Inference Via In-Page Context Menu //////////////////////

// Create the initial context menu items
chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        id: 'classify-selection',
        title: 'Classify "%s"',
        contexts: ['selection'],  // only show up when text selected
    });
});

// The sidepanel may not yet be open. 
// If not, submitting from the context menu kicks off opening the sidepanel, but because this can take a long time 
// we cannot pass the inference input while the sidepanel is initializing. Instead we store the inference input in 
// session storage and have the sidepanel look there upon initialization.
// When the sidepanel opens it also establishes a message channel to accept any subsequent inference input from the background worker.

// add connection when sidepanel opens
var connection
chrome.runtime.onConnect.addListener(x => {
    connection = x
})

// Perform inference when the user clicks a context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // Ignore context menu clicks that are not for classifications (or when there is no input)
    if (info.menuItemId !== 'classify-selection' || !info.selectionText) return;

    if (connection) {  // sidepanel is open, post text for inference
        connection.postMessage({ text: info.selectionText })
    } else { // sidepanel not yet open; open sidepanel and persist text in session storage until panel can pick it up.
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => { })
        chrome.storage.session.set({ 'inference_input': info.selectionText })
    }
});