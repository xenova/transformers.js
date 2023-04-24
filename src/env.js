import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { ONNX } from './backends/onnx.js';
const { env: onnx_env } = ONNX;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// check if various APIs are available (depends on environment)
const WEB_CACHE_AVAILABLE = typeof self !== 'undefined' && 'caches' in self;
const FS_AVAILABLE = !isEmpty(fs); // check if file system is available
const PATH_AVAILABLE = !isEmpty(path); // check if path is available

const RUNNING_LOCALLY = FS_AVAILABLE && PATH_AVAILABLE;

// Only used for environments with access to file system
const DEFAULT_CACHE_DIR = RUNNING_LOCALLY
    ? path.join(path.dirname(__dirname), '/.cache/')
    : null;

// set local model path, based on available APIs
const DEFAULT_LOCAL_MODEL_PATH = '/models/';
const localModelPath = RUNNING_LOCALLY
    ? path.join(path.dirname(__dirname), DEFAULT_LOCAL_MODEL_PATH)
    : DEFAULT_LOCAL_MODEL_PATH;

// First, set path to wasm files. This is needed when running in a web worker.
// https://onnxruntime.ai/docs/api/js/interfaces/Env.WebAssemblyFlags.html#wasmPaths
// We use remote wasm files by default to make it easier for newer users.
// In practice, users should probably self-host the necessary .wasm files.
onnx_env.wasm.wasmPaths = RUNNING_LOCALLY
    ? path.join(__dirname, '/dist/')
    : 'https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/';


// Global variable used to control exection, with suitable defaults
export const env = {
    // Expose environment variables of different backends, allowing users to set
    // these variables if they want to.
    // TODO - will be used when we add more backends
    backends: {
        // onnxruntime-web/onnxruntime-node
        onnx: onnx_env,

        // TensorFlow.js
        tfjs: {},
    },

    // URL to load models from. Defaults to the Hugging Face Hub.
    remoteHost: 'https://huggingface.co/',
    remotePathTemplate: '{model}/resolve/{revision}/',


    // Local URL to load models from.
    localModelPath: localModelPath,

    // Whether to use the file system to load files. By default, it is true available.
    useFS: FS_AVAILABLE,
    
    // Directory name of module. Useful for resolving local paths.
    __dirname,

    /////////////////// Cache settings ///////////////////
    // Whether to use Cache API to cache models. By default, it is true if available.
    useBrowserCache: WEB_CACHE_AVAILABLE,

    // Whether to use the file system to cache files. By default, it is true available.
    useFSCache: FS_AVAILABLE,

    // The directory to use for caching files with the file system. By default, it is `./.cache`.
    cacheDir: DEFAULT_CACHE_DIR,
    //////////////////////////////////////////////////////

}


/**
 * @param {object} obj
 */
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

