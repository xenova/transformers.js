
const fs = require('fs');

const { env } = require('./env.js');

class FileResponse {
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

    updateContentType() {
        // Set content-type header based on file extension
        const extension = this.filePath.split('.').pop().toLowerCase();
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

    clone() {
        return new FileResponse(this.filePath, {
            status: this.status,
            statusText: this.statusText,
            headers: this.headers,
        });
    }

    async arrayBuffer() {
        const data = await fs.promises.readFile(this.filePath);
        return data.buffer;
    }

    async blob() {
        const data = await fs.promises.readFile(this.filePath);
        return new Blob([data], { type: this.headers['content-type'] });
    }

    async text() {
        const data = await fs.promises.readFile(this.filePath, 'utf8');
        return data;
    }

    async json() {
        return JSON.parse(await this.text());
    }
}

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

async function getFile(url) {
    // Helper function to get a file, using either the Fetch API or FileSystem API

    if (env.useFS && !isValidHttpUrl(url)) {
        return new FileResponse(url)

    } else {
        return fetch(url)
    }
}

function dispatchCallback(progressCallback, data) {
    if (progressCallback !== null) progressCallback(data);
}

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

    let response;
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
        cache.put(request, responseToCache);
    }

    dispatchCallback(progressCallback, {
        status: 'done',
        name: modelPath,
        file: fileName
    });

    return buffer;
}

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

function reverseDictionary(data) {
    // https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [value, key]));
}

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


function softmax(arr) {
    // Compute the maximum value in the array
    const max = Math.max(...arr);

    // Compute the exponentials of the array values
    const exps = arr.map(x => Math.exp(x - max));

    // Compute the sum of the exponentials
    const sumExps = exps.reduce((acc, val) => acc + val, 0);

    // Compute the softmax values
    const softmaxArr = exps.map(x => x / sumExps);

    return softmaxArr;
}

function log_softmax(arr) {
    // Compute the softmax values
    const softmaxArr = softmax(arr);

    // Apply log formula to each element
    const logSoftmaxArr = softmaxArr.map(x => Math.log(x));

    return logSoftmaxArr;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

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

function dot(arr1, arr2) {
    return arr1.reduce((acc, val, i) => acc + val * arr2[i], 0);
}

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

function magnitude(arr) {
    return Math.sqrt(arr.reduce((acc, val) => acc + val * val, 0));
}


class Callable extends Function {
    constructor() {
        let closure = function (...args) { return closure._call(...args) }
        return Object.setPrototypeOf(closure, new.target.prototype)
    }

    _call(...args) {
        throw Error('Must implement _call method in subclass')
    }
}


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

function isString(text) {
    return typeof text === 'string' || text instanceof String
}


function isIntegralNumber(x) {
    return Number.isInteger(x) || typeof x === 'bigint'
}

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
    min
};
