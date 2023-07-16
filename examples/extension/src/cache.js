// Design a caching API to be used by the extension which implements the same interface as
// the browser's native Cache API (https://developer.mozilla.org/en-US/docs/Web/API/Cache)
// but uses the browser's local storage API (https://developer.chrome.com/docs/extensions/reference/storage/).
// 
// For serialization (arraybuffer -> string) and unserialization (string -> arraybuffer),
// use the `FileReader` and `Blob` APIs. One small problem is that we store and retrieve
// the response as a base64-encoded string. This means that the response body is ~33% larger
// than it needs to be. Looking for ways to improve this!
// 
// Other references:
//  - https://developer.chrome.com/docs/extensions/reference/storage/#property-local
//  - https://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers

export class CustomCache {
    /**
     * Instantiate a `CustomCache` object.
     * @param {string} path 
     */
    constructor(cacheName) {
        this.cacheName = cacheName;
    }

    /**
     * Checks whether the given request is in the cache.
     * @param {Request|string} request 
     * @returns {Promise<Response | undefined>}
     */
    async match(request) {
        const url = request instanceof Request ? request.url : request;
        const cached = await chrome.storage.local.get([url]);

        if (cached[url]) {
            return await fetch(cached[url]._body);
        } else {
            return undefined;
        }
    }

    /**
     * Adds the given response to the cache.
     * @param {Request|string} request 
     * @param {Response} response 
     * @returns {Promise<void>}
     */
    async put(request, response) {
        const url = request instanceof Request ? request.url : request;
        const buffer = await response.arrayBuffer();

        const body = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e.target.error);
            reader.readAsDataURL(new Blob([buffer], { type: 'application/octet-stream' }));
        });

        try {
            await chrome.storage.local.set({
                [url]: {
                    _body: body,

                    // Save original response in case
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    url: response.url,
                    redirected: response.redirected,
                    type: response.type,
                    ok: response.ok,
                }
            });

        } catch (err) {
            console.warn('An error occurred while writing the file to cache:', err)
        }
    }
}
