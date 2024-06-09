/**
 * @file Module used to configure Transformers.js.
 * 
 * **Example:** Disable remote models.
 * ```javascript
 * import { env } from '@xenova/transformers';
 * env.allowRemoteModels = false;
 * ```
 * 
 * **Example:** Set local model path.
 * ```javascript
 * import { env } from '@xenova/transformers';
 * env.localModelPath = '/path/to/local/models/';
 * ```
 * 
 * **Example:** Set cache directory.
 * ```javascript
 * import { env } from '@xenova/transformers';
 * env.cacheDir = '/path/to/cache/directory/';
 * ```
 * 
 * @module env
 */

import fs from 'fs';
import path from 'path';
import url from 'url';

const VERSION = '3.0.0-alpha.0';

// Check if various APIs are available (depends on environment)
const IS_BROWSER_ENV = typeof self !== 'undefined';
const IS_WEBWORKER_ENV = IS_BROWSER_ENV && self.constructor.name === 'DedicatedWorkerGlobalScope';
const IS_WEB_CACHE_AVAILABLE = IS_BROWSER_ENV && 'caches' in self;
const IS_WEBGPU_AVAILABLE = typeof navigator !== 'undefined' && 'gpu' in navigator;

const IS_PROCESS_AVAILABLE = typeof process !== 'undefined';
const IS_NODE_ENV = IS_PROCESS_AVAILABLE && process?.release?.name === 'node';
const IS_FS_AVAILABLE = !isEmpty(fs);
const IS_PATH_AVAILABLE = !isEmpty(path);

/**
 * A read-only object containing information about the APIs available in the current environment.
 */
export const apis = Object.freeze({
    /** Whether we are running in a browser environment */
    IS_BROWSER_ENV,

    /** Whether we are running in a web worker environment */
    IS_WEBWORKER_ENV,

    /** Whether the Cache API is available */
    IS_WEB_CACHE_AVAILABLE,

    /** Whether the WebGPU API is available */
    IS_WEBGPU_AVAILABLE,

    /** Whether the Node.js process API is available */
    IS_PROCESS_AVAILABLE,

    /** Whether we are running in a Node.js environment */
    IS_NODE_ENV,

    /** Whether the filesystem API is available */
    IS_FS_AVAILABLE,

    /** Whether the path API is available */
    IS_PATH_AVAILABLE,
});

const RUNNING_LOCALLY = IS_FS_AVAILABLE && IS_PATH_AVAILABLE;
const __dirname = RUNNING_LOCALLY
    ? path.dirname(path.dirname(url.fileURLToPath(import.meta.url)))
    : './';

// Only used for environments with access to file system
const DEFAULT_CACHE_DIR = RUNNING_LOCALLY
    ? path.join(__dirname, '/.cache/')
    : null;

// Set local model path, based on available APIs
const DEFAULT_LOCAL_MODEL_PATH = '/models/';
const localModelPath = RUNNING_LOCALLY
    ? path.join(__dirname, DEFAULT_LOCAL_MODEL_PATH)
    : DEFAULT_LOCAL_MODEL_PATH;

/**
 * Global variable given visible to users to control execution. This provides users a simple way to configure Transformers.js.
 * @typedef {Object} TransformersEnvironment
 * @property {string} version This version of Transformers.js.
 * @property {Object} backends Expose environment variables of different backends,
 * allowing users to set these variables if they want to.
 * @property {boolean} allowRemoteModels Whether to allow loading of remote files, defaults to `true`.
 * If set to `false`, it will have the same effect as setting `local_files_only=true` when loading pipelines, models, tokenizers, processors, etc.
 * @property {string} remoteHost Host URL to load models from. Defaults to the Hugging Face Hub.
 * @property {string} remotePathTemplate Path template to fill in and append to `remoteHost` when loading models.
 * @property {boolean} allowLocalModels Whether to allow loading of local files, defaults to `false` if running in-browser, and `true` otherwise.
 * If set to `false`, it will skip the local file check and try to load the model from the remote host.
 * @property {string} localModelPath Path to load local models from. Defaults to `/models/`.
 * @property {boolean} useFS Whether to use the file system to load files. By default, it is `true` if available.
 * @property {boolean} useBrowserCache Whether to use Cache API to cache models. By default, it is `true` if available.
 * @property {boolean} useFSCache Whether to use the file system to cache files. By default, it is `true` if available.
 * @property {string} cacheDir The directory to use for caching files with the file system. By default, it is `./.cache`.
 * @property {boolean} useCustomCache Whether to use a custom cache system (defined by `customCache`), defaults to `false`.
 * @property {Object} customCache The custom cache to use. Defaults to `null`. Note: this must be an object which
 * implements the `match` and `put` functions of the Web Cache API. For more information, see https://developer.mozilla.org/en-US/docs/Web/API/Cache
 */

/** @type {TransformersEnvironment} */
export const env = {
    version: VERSION,

    /////////////////// Backends settings ///////////////////
    // NOTE: These will be populated later by the backends themselves.
    backends: {
        // onnxruntime-web/onnxruntime-node
        onnx: {},

        // TensorFlow.js
        tfjs: {},
    },


    /////////////////// Model settings ///////////////////
    allowRemoteModels: true,
    remoteHost: 'https://huggingface.co/',
    remotePathTemplate: '{model}/resolve/{revision}/',

    allowLocalModels: !IS_BROWSER_ENV,
    localModelPath: localModelPath,
    useFS: IS_FS_AVAILABLE,

    /////////////////// Cache settings ///////////////////
    useBrowserCache: IS_WEB_CACHE_AVAILABLE,

    useFSCache: IS_FS_AVAILABLE,
    cacheDir: DEFAULT_CACHE_DIR,

    useCustomCache: false,
    customCache: null,
    //////////////////////////////////////////////////////
}


/**
 * @param {Object} obj
 * @private
 */
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}
