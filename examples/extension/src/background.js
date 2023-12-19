// background.js - Handles requests from the UI, and forwards to the offscreen document, creating it if necessary

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

const hasDocument = async () => {
    const matchedClients = await clients.matchAll();
    for (const client of matchedClients) {
        if (client.url.endsWith(OFFSCREEN_DOCUMENT_PATH)) {
            return true;
        }
    }
    return false;
}

const ensureOffscreenDocument = async () => {
    if (!(await hasDocument())) {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: [chrome.offscreen.Reason.BLOBS, chrome.offscreen.Reason.WORKERS],
            justification: 'Blobs are needed to initialize ONNX WASM, Workers are needed to run ONNX multithreaded.'
        });
    }
}

const sendMessageToOffscreenDocument = async (type, data) => {
    await ensureOffscreenDocument()
    return chrome.runtime.sendMessage({
        type,
        target: 'offscreen',
        data
    });
}

////////////////////// 1. Context Menus //////////////////////
//
// Add a listener to create the initial context menu items,
// context menu items only need to be created at runtime.onInstalled
chrome.runtime.onInstalled.addListener(function () {
    // Register a context menu item that will only show up for selection text.
    chrome.contextMenus.create({
        id: 'classify-selection',
        title: 'Classify "%s"',
        contexts: ['selection'],
    });
});

// Perform inference when the user clicks a context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // Ignore context menu clicks that are not for classifications (or when there is no input)
    if (info.menuItemId !== 'classify-selection' || !info.selectionText) return;

    // Forward selected text to offscreen document for processing
    const result = await sendMessageToOffscreenDocument('classify', info.selectionText);
    console.log('result', result, Boolean(result))
    if (!result) console.log('hi')

    // Do something with the result
    chrome.scripting.executeScript({
        target: { tabId: tab.id },    // Run in the tab that the user clicked in
        args: [result],               // The arguments to pass to the function
        function: (result) => {       // The function to run
            // NOTE: This function is run in the context of the web page, meaning that `document` is available.
            console.log('result', result)
            console.log('document', document)
        },
    });
});
//////////////////////////////////////////////////////////////

////////////////////// 2. Message Events /////////////////////
// 
// Listen for messages from the UI, forward to the offscreen document for processing and send the result back.
// We can't pass messages to offscreen directly from the UI because it lacks the `client` API needed to start/ensure existence of the offscreen page.
// BUG: It appears that the popup UI won't open when the offscreen page is open...
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('sender', sender)
    if (message.action !== 'classify') return; // Ignore messages that are not meant for classification.

    // Run model prediction asynchronously
    (async function () {
        // Perform classification
        let result = await classify(message.text);

        // Send response back to UI
        sendResponse(result);
    })();

    // return true to indicate we will send a response asynchronously
    // see https://stackoverflow.com/a/46628145 for more information
    return true;
});
//////////////////////////////////////////////////////////////

