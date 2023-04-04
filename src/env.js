const fs = require('fs');
const path = require('path');

const { env: onnx_env } = require('./backends/onnx.js').ONNX;

// check if various APIs are available (depends on environment)
const CACHE_AVAILABLE = typeof self !== 'undefined' && 'caches' in self;
const FS_AVAILABLE = !isEmpty(fs); // check if file system is available
const PATH_AVAILABLE = !isEmpty(path); // check if path is available

const RUNNING_LOCALLY = FS_AVAILABLE && PATH_AVAILABLE;

// set local model path, based on available APIs
const DEFAULT_LOCAL_PATH = '/models/onnx/quantized/';
const localURL = RUNNING_LOCALLY
    ? path.join(path.dirname(__dirname), DEFAULT_LOCAL_PATH)
    : DEFAULT_LOCAL_PATH;

// First, set path to wasm files. This is needed when running in a web worker.
// https://onnxruntime.ai/docs/api/js/interfaces/Env.WebAssemblyFlags.html#wasmPaths
// We use remote wasm files by default to make it easier for newer users.
// In practice, users should probably self-host the necessary .wasm files.
onnx_env.wasm.wasmPaths = RUNNING_LOCALLY
    ? path.join(path.dirname(__dirname), '/dist/')
    : 'https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/';


// Global variable used to control exection, with suitable defaults
const env = {
    // access onnxruntime-web's environment variables
    onnx: onnx_env,

    // whether to support loading models from the HuggingFace hub
    remoteModels: true,

    // URL to load models from
    remoteURL: 'https://huggingface.co/Xenova/transformers.js/resolve/main/quantized/',

    // Local URL to load models from.
    localURL: localURL,

    // Whether to use Cache API to cache models. By default, it is true if available.
    useCache: CACHE_AVAILABLE,

    // Whether to use the file system to load files. By default, it is true available.
    useFS: FS_AVAILABLE,
}


/**
 * @param {object} obj
 */
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

module.exports = {
    env
}
