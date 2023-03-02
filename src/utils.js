
class Callable extends Function {
    constructor() {
        let closure = function (...args) { return closure._call(...args) }
        return Object.setPrototypeOf(closure, new.target.prototype)
    }

    _call(...args) {
        throw Error('Must implement _call method in subclass')
    }
}


// Use caching when available
const CACHE_AVAILABLE = 'caches' in self;

function dispatchCallback(progressCallback, data) {
    if (progressCallback !== null) progressCallback(data);
}

async function getModelFile(modelPath, fileName, progressCallback = null) {

    // Initiate session
    dispatchCallback(progressCallback, {
        status: 'initiate',
        name: modelPath,
        file: fileName
    })

    let cache;
    if (CACHE_AVAILABLE) {
        cache = await caches.open('transformers-cache');
    }

    const request = new Request(pathJoin(modelPath, fileName));

    let response;
    let responseToCache;

    if (!CACHE_AVAILABLE || (response = await cache.match(request)) === undefined) {
        // Caching not available, or model is not cached, so we perform the request
        response = await fetch(request);

        if (CACHE_AVAILABLE) {
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

async function fetchJSON(modelPath, fileName, progressCallback = null) {
    let buffer = await getModelFile(modelPath, fileName, progressCallback);

    let decoder = new TextDecoder('utf-8');
    let jsonData = decoder.decode(buffer);

    return JSON.parse(jsonData);
}


async function readResponse(response, progressCallback) {
    // Read and track progress when reading a Response object

    const contentLength = response.headers.get('Content-Length');
    const total = parseInt(contentLength);
    const reader = response.body.getReader();
    const buffer = new Uint8Array(total);

    let loaded = 0;
    async function read() {
        const { done, value } = await reader.read();
        if (done) return;

        buffer.set(value, loaded)
        loaded += value.length;

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

export {
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
    magnitude
};
