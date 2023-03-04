const fs = require('fs');
const path = require('path');
const onnx_env = require('onnxruntime-web').env;

// check if various APIs are available (depends on environment)
const CACHE_AVAILABLE = typeof self !== 'undefined' && 'caches' in self;
const FS_AVAILABLE = !isEmpty(fs); // check if file system is available
const PATH_AVAILABLE = !isEmpty(path); // check if path is available

// set local model path, based on available APIs
const DEFAULT_LOCAL_PATH = '/models/onnx/quantized/';
const localURL = (FS_AVAILABLE && PATH_AVAILABLE)
    ? path.join(path.dirname(__dirname), DEFAULT_LOCAL_PATH)
    : DEFAULT_LOCAL_PATH;

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


function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

module.exports = {
    env
}
