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

import RNFS from 'react-native-fs';

import { ONNX } from './backends/onnx';
const { env: onnx_env } = ONNX;

// Check if various APIs are available (depends on environment)
const FS_AVAILABLE = true
const PATH_AVAILABLE = true

const RUNNING_LOCALLY = FS_AVAILABLE && PATH_AVAILABLE;

const __dirname = RNFS.DocumentDirectoryPath;

// Only used for environments with access to file system
const DEFAULT_CACHE_DIR = `${__dirname}/.cache/`;

// Set local model path, based on available APIs
const localModelPath = `${__dirname}/.models/`;

/**
 * Global variable used to control exection. This provides users a simple way to configure Transformers.js.
 * @property {Object} backends Expose environment variables of different backends,
 * allowing users to set these variables if they want to.
 * @property {boolean} allowRemoteModels Whether to allow loading of remote files, defaults to `true`.
 * If set to `false`, it will have the same effect as setting `local_files_only=true` when loading pipelines, models, tokenizers, processors, etc.
 * @property {string} remoteHost Host URL to load models from. Defaults to the Hugging Face Hub.
 * @property {string} remotePathTemplate Path template to fill in and append to `remoteHost` when loading models.
 * @property {boolean} allowLocalModels Whether to allow loading of local files, defaults to `true`.
 * If set to `false`, it will skip the local file check and try to load the model from the remote host.
 * @property {string} localModelPath Path to load local models from. Defaults to `/models/`.
 * @property {boolean} useFS Whether to use the file system to load files. By default, it is `true` if available.
 * @property {string} __dirname Directory name of module. Useful for resolving local paths.
 * @property {boolean} useBrowserCache Whether to use Cache API to cache models. By default, it is `true` if available.
 * @property {boolean} useFSCache Whether to use the file system to cache files. By default, it is `true` if available.
 * @property {string} cacheDir The directory to use for caching files with the file system. By default, it is `./.cache`.
*/
export const env = {
    /////////////////// Backends settings ///////////////////
    backends: {
        // onnxruntime-web/onnxruntime-node
        onnx: onnx_env,

        // TensorFlow.js
        tfjs: {},
    },

    __dirname,

    /////////////////// Model settings ///////////////////
    allowRemoteModels: true,
    remoteHost: 'https://huggingface.co/',
    remotePathTemplate: '{model}/resolve/{revision}/',

    allowLocalModels: true,
    localModelPath: localModelPath,
    useFS: FS_AVAILABLE,
    allowFallback: false,

    /////////////////// Cache settings ///////////////////
    useBrowserCache: false,
    useFSCache: FS_AVAILABLE,
    cacheDir: DEFAULT_CACHE_DIR,

    //////////////////////////////////////////////////////
}


/**
 * @param {Object} obj
 * @private
 */
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

