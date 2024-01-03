// background.js - Handles requests from the UI, runs the model, then sends back a response

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

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
        console.log('found open connection')
        connection.postMessage({ text: info.selectionText })
    } else { // sidepanel not yet open; open sidepanel and persist text in session storage until panel can pick it up.
        console.log('no connection found')
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => { })
        chrome.storage.session.set({ 'inference_input': info.selectionText })
    }
});