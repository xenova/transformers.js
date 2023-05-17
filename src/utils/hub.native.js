
/**
 * @file Utility functions to interact with the Hugging Face Hub (https://huggingface.co/models)
 * 
 * @module utils/hub
 */

import RNFS from 'react-native-fs';

import { env } from '../env';
import { dispatchCallback } from './core';
import { handleError } from './hub-utils';
import { Buffer } from 'buffer';

/**
 * Parse HTTP headers.
 * 
 * @function parseHeaders
 * @param {string} rawHeaders
 * @returns {Headers}
 */
function parseHeaders(rawHeaders) {
    const headers = new Headers();
    const preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    preProcessedHeaders.split(/\r?\n/).forEach((line) => {
        const parts = line.split(':');
        const key = parts.shift().trim();
        if (key) {
            const value = parts.join(':').trim();
            headers.append(key, value);
        }
    });
    return headers;
}

/**
 * Makes an HTTP request.
 * 
 * @function fetchBinary
 * @param {string|URL} url
 * @returns {Promise<Response>}
 */
function fetchBinary(url) {
    return new Promise((resolve, reject) => {
        const request = new Request(url);
        const xhr = new XMLHttpRequest();

        xhr.onload = () => {
            const reqOptions = {
                status: xhr.status,
                statusText: xhr.statusText,
                headers: parseHeaders(xhr.getAllResponseHeaders() || ''),
                url: '',
            };
            reqOptions.url = 'responseURL' in xhr ?
                xhr.responseURL :
                reqOptions.headers.get('X-Request-URL');

            const body = 'response' in xhr ? xhr.response : xhr.responseText;

            resolve(new Response(body, reqOptions));
        };

        xhr.onerror = () => reject(new TypeError('Network request failed'));
        xhr.ontimeout = () => reject(new TypeError('Request timeout'));

        xhr.open(request.method, request.url, true);

        if (request.credentials === 'include') {
            xhr.withCredentials = true;
        } else if (request.credentials === 'omit') {
            xhr.withCredentials = false;
        }

        xhr.responseType = 'arraybuffer';

        request.headers.forEach((value, name) => {
            xhr.setRequestHeader(name, value);
        });

        xhr.send(request._bodyInit ?? null);
    });
}

const CONTENT_TYPE_MAP = {
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
}

/**
 * Makes an FS request.
 * 
 * @async
 * @function readFile
 * @param {string|URL} path
 * @param {object} options
 * @returns {Promise<Response>}
 */
async function readFile(filePath) {
    const path = filePath.toString()
    const stat = await RNFS.stat(path);
    const headers = new Headers();
    headers.append('content-length', stat.size);
    const extension = path.split('.').pop().toLowerCase();
    const type = CONTENT_TYPE_MAP[extension] ?? 'application/octet-stream';
    headers.append('content-type', type);
    const content = await RNFS.readFile(path, 'base64')
    const { buffer } = Buffer.from(content);
    const reqOptions = {
        status: 200,
        statusText: 'OK',
        headers,
        url: path,
    };
    return new Response(buffer, reqOptions);
}

/**
 * Determines whether the given string is a valid HTTP or HTTPS URL.
 * @param {string|URL} string The string to test for validity as an HTTP or HTTPS URL.
 * @returns {boolean} True if the string is a valid HTTP or HTTPS URL, false otherwise.
 */
function isValidHttpUrl(string) {
    try {
        new URL(string);
        return /^https?:/.test(string);
    } catch (_) {
        return false;
    }
}

/**
 * Helper function to get a file, using either the Fetch API or FileSystem API.
 *
 * @param {URL|string} urlOrPath The URL/path of the file to get.
 * @returns {Promise<FileResponse|Response>} A promise that resolves to a FileResponse object (if the file is retrieved using the FileSystem API), or a Response object (if the file is retrieved using the Fetch API).
 */
export async function getFile(urlOrPath) {
    // Helper function to get a file, using either the Fetch API or FileSystem API

    if (env.useFS && !isValidHttpUrl(urlOrPath)) {
        return readFile(urlOrPath);

    } else {
        return fetchBinary(urlOrPath);
    }
}

class FileCache {
    /**
     * Instantiate a `FileCache` object.
     * @param {string} path 
     */
    constructor(path) {
        this.path = path;
    }

    /**
     * Checks whether the given request is in the cache.
     * @param {string} request 
     * @returns {Promise<FileResponse | undefined>}
     */
    async match(request) {

        let filePath = pathJoin(this.path, request);

        if (await RNFS.exists(filePath)) {
            return readFile(filePath);
        } else {
            return undefined;
        }
    }

    /**
     * Adds the given response to the cache.
     * @param {string} request 
     * @param {Response|FileResponse} response 
     * @returns {Promise<void>}
     */
    async put(request, response) {
        const buffer = Buffer.from(await response.arrayBuffer());

        let outputPath = pathJoin(this.path, request);

        try {
            await RNFS.mkdir(outputPath.replace(/[^/]*$/, ''));
            await RNFS.writeFile(outputPath, buffer.toString('base64'), 'base64');

        } catch (err) {
            console.warn('An error occurred while writing the file to cache:', err)
        }
    }

    // TODO add the rest?
    // addAll(requests: RequestInfo[]): Promise<void>;
    // delete(request: RequestInfo | URL, options?: CacheQueryOptions): Promise<boolean>;
    // keys(request?: RequestInfo | URL, options?: CacheQueryOptions): Promise<ReadonlyArray<Request>>;
    // match(request: RequestInfo | URL, options?: CacheQueryOptions): Promise<Response | undefined>;
    // matchAll(request?: RequestInfo | URL, options?: CacheQueryOptions): Promise<ReadonlyArray<Response>>;
}
/**
 * 
 * Retrieves a file from either a remote URL using the Fetch API or from the local file system using the FileSystem API.
 * If the filesystem is available and `env.useCache = true`, the file will be downloaded and cached.
 * 
 * @param {string} path_or_repo_id This can be either:
 * - a string, the *model id* of a model repo on huggingface.co.
 * - a path to a *directory* potentially containing the file.
 * @param {string} filename The name of the file to locate in `path_or_repo`.
 * @param {boolean} [fatal=true] Whether to throw an error if the file is not found.
 * @param {PretrainedOptions} [options] An object containing optional parameters.
 * 
 * @throws Will throw an error if the file is not found and `fatal` is true.
 * @returns {Promise} A Promise that resolves with the file content as a buffer.
 */
export async function getModelFile(path_or_repo_id, filename, fatal = true, options = {}) {

    if (!env.allowLocalModels) {
        // User has disabled local models, so we just make sure other settings are correct.

        if (options.local_files_only) {
            throw Error("Invalid configuration detected: local models are disabled (`env.allowLocalModels=false`) but you have requested to only use local models (`local_files_only=true`).")
        } else if (!env.allowRemoteModels) {
            throw Error("Invalid configuration detected: both local and remote models are disabled. Fix by setting `env.allowLocalModels` or `env.allowRemoteModels` to `true`.")
        }
    }

    // Initiate file retrieval
    dispatchCallback(options.progress_callback, {
        status: 'initiate',
        name: path_or_repo_id,
        file: filename
    })

    // First, check if the a caching backend is available
    // If no caching mechanism available, will download the file every time
    let cache;
    if (!cache && env.useFSCache) {
        // TODO throw error if not available

        // If `cache_dir` is not specified, use the default cache directory
        cache = new FileCache(options.cache_dir ?? env.cacheDir);
    }

    const request = pathJoin(path_or_repo_id, filename);

    /** @type {Response} */
    let responseToCache;

    /** @type {Response | FileResponse} */
    let response;

    if (cache) {
        // Cache available, so we try to get the file from the cache.
        response = await cache.match(request);
    }

    if (response === undefined) {
        // Caching not available, or file is not cached, so we perform the request

        let isURL = isValidHttpUrl(request);
        let localPath = pathJoin(env.localModelPath, request);

        if (env.allowLocalModels) {
            // Accessing local models is enabled, so we try to get the file locally.
            // If request is a valid HTTP URL, we skip the local file check. Otherwise, we try to get the file locally.
            if (!isURL) {
                try {
                    response = await getFile(localPath);
                } catch (e) {
                    // Something went wrong while trying to get the file locally.
                    // NOTE: error handling is done in the next step (since `response` will be undefined)
                    console.warn(`Unable to load from local path "${localPath}": "${e}"`);
                }
            } else if (options.local_files_only) {
                throw new Error(`\`local_files_only=true\`, but attempted to load a remote file from: ${request}.`);
            } else if (!env.allowRemoteModels) {
                throw new Error(`\`env.allowRemoteModels=false\`, but attempted to load a remote file from: ${request}.`);
            }
        }

        if (response === undefined || response.status === 404) {
            // File not found locally. This means either:
            // - The user has disabled local file access (`env.allowLocalModels=false`)
            // - the path is a valid HTTP url (`response === undefined`)
            // - the path is not a valid HTTP url and the file is not present on the file system or local server (`response.status === 404`)

            if (options.local_files_only || !env.allowRemoteModels) {
                // User requested local files only, but the file is not found locally.
                if (fatal) {
                    throw Error(`\`local_files_only=true\` or \`env.allowRemoteModels=false\` and file was not found locally at "${localPath}".`);
                } else {
                    // File not found, but this file is optional.
                    // TODO in future, cache the response?
                    return null;
                }
            }

            // File not found locally, so we try to download it from the remote server
            let remoteURL = pathJoin(
                env.remoteHost,
                env.remotePathTemplate
                    .replace('{model}', path_or_repo_id)
                    .replace('{revision}', options.revision ?? 'main'),
                filename
            );
            response = await getFile(remoteURL);

            if (response.status !== 200) {
                return handleError(response.status, remoteURL, fatal);
            }
        }


        if (cache && response instanceof Response && response.status === 200) {
            // only clone if cache available, and response is valid
            responseToCache = response.clone();
        }
    }


    // Start downloading
    dispatchCallback(options.progress_callback, {
        status: 'download',
        name: path_or_repo_id,
        file: filename
    })

    const buffer = await readResponse(response, data => {
        dispatchCallback(options.progress_callback, {
            status: 'progress',
            ...data,
            name: path_or_repo_id,
            file: filename
        })
    })


    if (
        // Only cache web responses
        // i.e., do not cache FileResponses (prevents duplication)
        responseToCache
        &&
        // Check again whether request is in cache. If not, we add the response to the cache
        (await cache.match(request) === undefined)
    ) {
        await cache.put(request, responseToCache)
            .catch(err => {
                // Do not crash if unable to add to cache (e.g., QuotaExceededError).
                // Rather, log a warning and proceed with execution.
                console.warn(`Unable to add ${request} to browser cache: ${err}.`);
            });
    }

    dispatchCallback(options.progress_callback, {
        status: 'done',
        name: path_or_repo_id,
        file: filename
    });

    return buffer;
}

/**
 * Fetches a JSON file from a given path and file name.
 *
 * @param {string} modelPath The path to the directory containing the file.
 * @param {string} fileName The name of the file to fetch.
 * @param {boolean} [fatal=true] Whether to throw an error if the file is not found.
 * @param {PretrainedOptions} [options] An object containing optional parameters.
 * @returns {Promise<Object>} The JSON data parsed into a JavaScript object.
 * @throws Will throw an error if the file is not found and `fatal` is true.
 */
export async function getModelJSON(modelPath, fileName, fatal = true, options = {}) {
    let buffer = await getModelFile(modelPath, fileName, fatal, options);
    if (buffer === null) {
        // Return empty object
        return {}
    }
    return JSON.parse(Buffer.from(buffer));
}

/**
 * Read and track progress when reading a Response object
 *
 * @param {any} response The Response object to read
 * @param {function} progress_callback The function to call with progress updates
 * @returns {Promise<Uint8Array>} A Promise that resolves with the Uint8Array buffer
 */
async function readResponse(response, progress_callback) {
    return await response.arrayBuffer();
}

/**
 * Joins multiple parts of a path into a single path, while handling leading and trailing slashes.
 *
 * @param {...string} parts Multiple parts of a path.
 * @returns {string} A string representing the joined path.
 */
function pathJoin(...parts) {
    // https://stackoverflow.com/a/55142565
    parts = parts.map((part, index) => {
        if (index) {
            part = part.replace(new RegExp('^/'), '');
        }
        if (index !== parts.length - 1) {
            part = part.replace(new RegExp('/$'), '');
        }
        return part;
    })
    return parts.join('/');
}
