
class Callable extends Function {
    constructor() {
        let closure = function (...args) { return closure._call(...args) }
        return Object.setPrototypeOf(closure, new.target.prototype)
    }

    _call(...args) {
        throw Error('Must implement _call method in subclass')
    }
}

async function fetchJSON(url) {
    return await (await fetch(url)).json();
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

function getTopItems(items, top_k=0) {
    // if top == 0, return all

    items = Array.from(items)
        .map((x, i) => [i, x])            // Get indices ([index, score])
        .sort((a, b) => b[1] - a[1])      // Sort by log probabilities

    if (top_k > 0) {
        items = items.slice(0, top_k);    // Get top k items
    }

    return items
}
export {
    Callable,
    fetchJSON,
    pathJoin,
    reverseDictionary,
    indexOfMax,
    softmax,
    log_softmax,
    escapeRegExp,
    getTopItems
};
