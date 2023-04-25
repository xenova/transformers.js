
# Transformers.js - Sample browser extension

An example project to show how to run 🤗 Transformers in a browser extension. Although we only provide instructions for running in Chrome, it should be similar for other browsers.

## Getting Started
1. Clone the repo and enter the project directory:
    ```bash
    git clone https://github.com/xenova/transformers.js.git
    cd transformers.js/examples/extension/
    ```
1. Install the necessary dependencies:
    ```bash
    npm install 
    ```

1. Add your model files to `./public/models/`. For this demo, we use [distilbert-base-uncased-finetuned-sst-2-english](https://huggingface.co/distilbert-base-uncased-finetuned-sst-2-english/tree/main) from the Hugging Face Hub. It should look something like this:
    ```
    distilbert-base-uncased-finetuned-sst-2-english/
    ├── config.json
    ├── tokenizer.json
    ├── tokenizer_config.json
    └── onnx/
        ├── model.onnx
        └── model_quantized.onnx
    ```

1. Add the WASM files to `./public/wasm/`. You can download them from the jsDelivr CDN [here](https://www.jsdelivr.com/package/npm/@xenova/transformers?tab=files&path=dist):
    ```
    ort-wasm.wasm
    ort-wasm-simd.wasm
    ort-wasm-simd-threaded.wasm
    ort-wasm-threaded.wasm
    ```
1. Build the project:
    ```bash
    npm run build 
    ```
1. Add the extension to your browser. To do this, go to `chrome://extensions/`, enable developer mode (top right), and click "Load unpacked". Select the `build` directory from the dialog which appears and click "Select Folder".

1. That's it! You should now be able to open the extenion's popup and use the model in your browser!

## Editing the template

We recommend running `npm run dev` while editing the template as it will rebuild the project when changes are made. 

All source code can be found in the `./src/` directory:
- `background.js` - contains the service worker code which runs in the background. It handles all the requests from the UI, does processing on a separate thread, then returns the result. You will need to reload the extension (by visiting `chrome://extensions/` and clicking the refresh button) after editing this file for changes to be visible in the extension.
- `popup.html`, `popup.css`, `popup.js` - contains the code for the popup which is visible to the user when they click the extension's icon from the extensions bar. For development, we recommend opening the `popup.html` file in its own tab by visiting `chrome-extension://<ext_id>/popup.html` (remember to replace `<ext_id>` with the extension's ID). You will need to refresh the page while you develop to see the changes you make.
