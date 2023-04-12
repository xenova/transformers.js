
const fs = require('fs');

const { env } = require('./env.js');

if (global.ReadableStream === undefined && typeof process !== 'undefined') {
    try {
        // @ts-ignore
        global.ReadableStream = require('node:stream/web').ReadableStream; // ReadableStream is not a global with Node 16
    } catch (err) {
        console.warn("ReadableStream not defined and unable to import from node:stream/web");
    }
}

class FileResponse {
    /**
     * Creates a new `FileResponse` object.
     * @param {string|URL} filePath
     */
    constructor(filePath) {
        this.filePath = filePath;
        this.headers = {};
        this.headers.get = (x) => this.headers[x]

        this.exists = fs.existsSync(filePath);
        if (this.exists) {
            this.status = 200;
            this.statusText = 'OK';

            let stats = fs.statSync(filePath);
            this.headers['content-length'] = stats.size;

            this.updateContentType();

            let self = this;
            this.body = new ReadableStream({
                start(controller) {
                    self.arrayBuffer().then(buffer => {
                        controller.enqueue(new Uint8Array(buffer));
                        controller.close();
                    })
                }
            });
        } else {
            this.status = 404;
            this.statusText = 'Not Found';
            this.body = null;
        }
    }

    /**
     * Updates the 'content-type' header property of the response based on the extension of
     * the file specified by the filePath property of the current object.
     * @function
     * @returns {void}
     */
    updateContentType() {
        // Set content-type header based on file extension
        const extension = this.filePath.toString().split('.').pop().toLowerCase();
        switch (extension) {
            case 'txt':
                this.headers['content-type'] = 'text/plain';
                break;
            case 'html':
                this.headers['content-type'] = 'text/html';
                break;
            case 'css':
                this.headers['content-type'] = 'text/css';
                break;
            case 'js':
                this.headers['content-type'] = 'text/javascript';
                break;
            case 'json':
                this.headers['content-type'] = 'application/json';
                break;
            case 'png':
                this.headers['content-type'] = 'image/png';
                break;
            case 'jpg':
            case 'jpeg':
                this.headers['content-type'] = 'image/jpeg';
                break;
            case 'gif':
                this.headers['content-type'] = 'image/gif';
                break;
            default:
                this.headers['content-type'] = 'application/octet-stream';
                break;
        }
    }

    /**
     * @function
     * @returns {FileResponse}
     */
    clone() {
        let response = new FileResponse(this.filePath);
        response.exists = this.exists;
        response.status = this.status;
        response.statusText = this.statusText;
        response.headers = this.headers;
        return response;
    }

    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with an ArrayBuffer containing the file's contents.
     * @async
     * @function
     * @returns {Promise<ArrayBuffer>} - A Promise that resolves with an ArrayBuffer containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    async arrayBuffer() {
        const data = await fs.promises.readFile(this.filePath);
        return data.buffer;
    }

    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a Blob containing the file's contents.
     * @async
     * @function
     * @returns {Promise<Blob>} - A Promise that resolves with a Blob containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    async blob() {
        const data = await fs.promises.readFile(this.filePath);
        return new Blob([data], { type: this.headers['content-type'] });
    }

    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a string containing the file's contents.
     * @async
     * @function
     * @returns {Promise<string>} - A Promise that resolves with a string containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    async text() {
        const data = await fs.promises.readFile(this.filePath, 'utf8');
        return data;
    }

    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a parsed JavaScript object containing the file's contents.
     * @async
     * @function
     * @returns {Promise<object>} - A Promise that resolves with a parsed JavaScript object containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    async json() {
        return JSON.parse(await this.text());
    }
}

/**
 * Determines whether the given string is a valid HTTP or HTTPS URL.
 * @function
 * @param {string|URL} string - The string to test for validity as an HTTP or HTTPS URL.
 * @returns {boolean} - True if the string is a valid HTTP or HTTPS URL, false otherwise.
 */
function isValidHttpUrl(string) {
    // https://stackoverflow.com/a/43467144
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * Helper function to get a file, using either the Fetch API or FileSystem API.
 *
 * @async
 * @function getFile
 * @param {string|URL} url - The URL of the file to get.
 * @returns {Promise<FileResponse|Response>} A promise that resolves to a FileResponse object (if the file is retrieved using the FileSystem API), or a Response object (if the file is retrieved using the Fetch API).
 */
async function getFile(url) {
    // Helper function to get a file, using either the Fetch API or FileSystem API

    if (env.useFS && !isValidHttpUrl(url)) {
        return new FileResponse(url)

    } else {
        return fetch(url)
    }
}

/**
 * Helper function to dispatch progress callbacks.
 *
 * @function dispatchCallback
 * @param {function} progressCallback - The progress callback function to dispatch.
 * @param {any} data - The data to pass to the progress callback function.
 * @returns {void}
 */
function dispatchCallback(progressCallback, data) {
    if (progressCallback !== null) progressCallback(data);
}

/**
 * Retrieves a file from either a remote URL using the Fetch API or from the local file system using the FileSystem API.
 *
 * @async
 * @function getModelFile
 * @param {string} modelPath - The path of the model file.
 * @param {string} fileName - The name of the model file.
 * @param {function} [progressCallback=null] - A function to call when the download progress is updated.
 * @returns {Promise} A Promise that resolves with the file content as a buffer.
 * @throws Will throw an error if the file is not found.
 */
async function getModelFile(modelPath, fileName, progressCallback = null, fatal = true) {

    // Initiate session
    dispatchCallback(progressCallback, {
        status: 'initiate',
        name: modelPath,
        file: fileName
    })

    let cache;
    if (env.useCache) {
        cache = await caches.open('transformers-cache');
    }

    const request = pathJoin(modelPath, fileName);

    /** @type {Response | FileResponse} */
    let response;

    /** @type {Response | FileResponse} */
    let responseToCache;

    if (!env.useCache || (response = await cache.match(request)) === undefined) {
        // Caching not available, or model is not cached, so we perform the request
        response = await getFile(request);

        if (response.status === 404) {
            if (fatal) {
                throw Error(`File not found. Could not locate "${request}".`)
            } else {
                // File not found, but this file is optional.
                // TODO in future, cache the response
                return null;
            }
        }

        if (env.useCache) {
            // only clone if cache available
            responseToCache = response.clone();
        }
    }

    // Start downloading
    dispatchCallback(progressCallback, {
        status: 'download',
        name: modelPath,
        file: fileName
    })

    const buffer = await readResponse(response, data => {
        dispatchCallback(progressCallback, {
            status: 'progress',
            ...data,
            name: modelPath,
            file: fileName
        })
    })

    // Check again whether request is in cache. If not, we add the response to the cache
    if (responseToCache !== undefined && await cache.match(request) === undefined) {
        cache.put(request, /** @type {Response} */(/** @type {unknown} */ (responseToCache)));
    }

    dispatchCallback(progressCallback, {
        status: 'done',
        name: modelPath,
        file: fileName
    });

    return buffer;
}

/**
 * Fetches a JSON file from a given path and file name.
 *
 * @param {string} modelPath - The path to the directory containing the file.
 * @param {string} fileName - The name of the file to fetch.
 * @param {function} progressCallback - A callback function to receive progress updates. Optional.
 * @returns {Promise<object>} - The JSON data parsed into a JavaScript object.
 */
async function fetchJSON(modelPath, fileName, progressCallback = null, fatal = true) {
    let buffer = await getModelFile(modelPath, fileName, progressCallback, fatal);
    if (buffer === null) {
        // Return empty object
        return {}
    }

    let decoder = new TextDecoder('utf-8');
    let jsonData = decoder.decode(buffer);

    return JSON.parse(jsonData);
}

/**
 * Read and track progress when reading a Response object
 *
 * @param {any} response - The Response object to read
 * @param {function} progressCallback - The function to call with progress updates
 * @returns {Promise<Uint8Array>} A Promise that resolves with the Uint8Array buffer
 */
async function readResponse(response, progressCallback) {
    // Read and track progress when reading a Response object

    const contentLength = response.headers.get('Content-Length');
    if (contentLength === null) {
        console.warn('Unable to determine content-length from response headers. Will expand buffer when needed.')
    }
    let total = parseInt(contentLength ?? '0');
    let buffer = new Uint8Array(total);
    let loaded = 0;

    const reader = response.body.getReader();
    async function read() {
        const { done, value } = await reader.read();
        if (done) return;

        let newLoaded = loaded + value.length;
        if (newLoaded > total) {
            total = newLoaded;

            // Adding the new data will overflow buffer.
            // In this case, we extend the buffer
            let newBuffer = new Uint8Array(total);

            // copy contents
            newBuffer.set(buffer);

            buffer = newBuffer;
        }
        buffer.set(value, loaded)
        loaded = newLoaded;

        const progress = (loaded / total) * 100;

        // Call your function here
        progressCallback({
            progress: progress,
            loaded: loaded,
            total: total,
        })

        return read();
    }

    // Actually read
    await read();

    return buffer;
}

/**
 * Joins multiple parts of a path into a single path, while handling leading and trailing slashes.
 *
 * @param {...string} parts - Multiple parts of a path.
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

/**
 * Reverses the keys and values of an object.
 *
 * @param {object} data - The object to reverse.
 * @returns {object} The reversed object.
 * @see https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
 */
function reverseDictionary(data) {
    // https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [value, key]));
}

/**
 * Returns the index of the maximum value in an array.
 * @param {Array} arr - The input array.
 * @see https://stackoverflow.com/a/11301464
 * @returns {number} - The index of the maximum value in the array.
 */
function indexOfMax(arr) {
    // https://stackoverflow.com/a/11301464

    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; ++i) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

/**
 * Compute the softmax of an array of numbers.
 *
 * @param {number[]} arr - The array of numbers to compute the softmax of.
 * @returns {number[]} The softmax array.
 */
function softmax(arr) {
    // Compute the maximum value in the array
    const maxVal = max(arr);

    // Compute the exponentials of the array values
    const exps = arr.map(x => Math.exp(x - maxVal));

    // Compute the sum of the exponentials
    const sumExps = exps.reduce((acc, val) => acc + val, 0);

    // Compute the softmax values
    const softmaxArr = exps.map(x => x / sumExps);

    return softmaxArr;
}

/**
 * Calculates the logarithm of the softmax function for the input array.
 * @param {number[]} arr - The input array to calculate the log_softmax function for.
 * @returns {any} - The resulting log_softmax array.
 */
function log_softmax(arr) {
    // Compute the softmax values
    const softmaxArr = softmax(arr);

    // Apply log formula to each element
    const logSoftmaxArr = softmaxArr.map(x => Math.log(x));

    return logSoftmaxArr;
}

/**
 * Escapes regular expression special characters from a string by replacing them with their escaped counterparts.
 *
 * @param {string} string - The string to escape.
 * @returns {string} - The escaped string.
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Get the top k items from an iterable, sorted by descending order
 *
 * @param {Array} items - The items to be sorted
 * @param {number} [top_k=0] - The number of top items to return (default: 0 = return all)
 * @returns {Array} - The top k items, sorted by descending order
 */
function getTopItems(items, top_k = 0) {
    // if top == 0, return all

    items = Array.from(items)
        .map((x, i) => [i, x])            // Get indices ([index, score])
        .sort((a, b) => b[1] - a[1])      // Sort by log probabilities

    if (top_k > 0) {
        items = items.slice(0, top_k);    // Get top k items
    }

    return items
}

/**
 * Calculates the dot product of two arrays.
 * @param {number[]} arr1 - The first array.
 * @param {number[]} arr2 - The second array.
 * @returns {number} - The dot product of arr1 and arr2.
 */
function dot(arr1, arr2) {
    return arr1.reduce((acc, val, i) => acc + val * arr2[i], 0);
}

/**
 * Computes the cosine similarity between two arrays.
 *
 * @param {number[]} arr1 - The first array.
 * @param {number[]} arr2 - The second array.
 * @returns {number} The cosine similarity between the two arrays.
 */
function cos_sim(arr1, arr2) {
    // Calculate dot product of the two arrays
    const dotProduct = dot(arr1, arr2);

    // Calculate the magnitude of the first array
    const magnitudeA = magnitude(arr1);

    // Calculate the magnitude of the second array
    const magnitudeB = magnitude(arr2);

    // Calculate the cosine similarity
    const cosineSimilarity = dotProduct / (magnitudeA * magnitudeB);

    return cosineSimilarity;
}

/**
 * Calculates the magnitude of a given array.
 * @param {number[]} arr - The array to calculate the magnitude of.
 * @returns {number} The magnitude of the array.
 */
function magnitude(arr) {
    return Math.sqrt(arr.reduce((acc, val) => acc + val * val, 0));
}

/**
 * A base class for creating callable objects.
 *
 * @extends Function
 */
class Callable extends Function {
    /**
    * Creates a new instance of the Callable class.
    */
    constructor() {
        super();
        /**
         * Creates a closure that delegates to a private method '_call' with the given arguments.
         *
         * @param {...any} args - Zero or more arguments to pass to the '_call' method.
         * @returns {*} - The result of calling the '_call' method.
         */
        let closure = function (...args) {
            // @ts-ignore
            return closure._call(...args)
        }
        return Object.setPrototypeOf(closure, new.target.prototype)
    }

    /**
     * This method should be implemented in subclasses to provide the
     * functionality of the callable object.
     *
     * @throws {Error} Must implement _call method in subclass
     * @param {...*} args
     */
    _call(...args) {
        throw Error('Must implement _call method in subclass')
    }
}

/**
 * Returns the minimum item.
 * @param {number[]} arr - array of numbers.
 * @returns {number} - the minimum number.
 * @throws {Error} If array is empty.
 */
function min(arr) {
    if (arr.length === 0) throw Error('Array must not be empty');
    let min = arr[0];
    for (let i = 1; i < arr.length; ++i) {
        if (arr[i] < min) {
            min = arr[i];
        }
    }
    return min;
}


/**
 * Returns the maximum item.
 * @param {number[]} arr - array of numbers.
 * @returns {number} - the maximum number.
 * @throws {Error} If array is empty.
 */
function max(arr) {
    if (arr.length === 0) throw Error('Array must not be empty');
    let max = arr[0];
    for (let i = 1; i < arr.length; ++i) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    return max;
}

/**
 * Check if a value is a string.
 * @param {*} text - The value to check.
 * @returns {boolean} - True if the value is a string, false otherwise.
 */
function isString(text) {
    return typeof text === 'string' || text instanceof String
}

/**
 * Check if a value is an integer.
 * @param {*} x - The value to check.
 * @returns {boolean} - True if the value is a string, false otherwise.
 */
function isIntegralNumber(x) {
    return Number.isInteger(x) || typeof x === 'bigint'
}

/**
 * Check if a value is exists.
 * @param {*} x - The value to check.
 * @returns {boolean} - True if the value exists, false otherwise.
 */
function exists(x) {
    return x !== undefined && x !== null;
}

module.exports = {
    Callable,
    getModelFile,
    dispatchCallback,
    fetchJSON,
    pathJoin,
    reverseDictionary,
    indexOfMax,
    softmax,
    log_softmax,
    escapeRegExp,
    getTopItems,
    dot,
    cos_sim,
    magnitude,
    getFile,
    isIntegralNumber,
    isString,
    exists,
    min,
    max,
};
