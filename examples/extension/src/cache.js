// Design a caching API to be used by the extension which implements the same interface as
// the browser's native Cache API (https://developer.mozilla.org/en-US/docs/Web/API/Cache)
// but uses the browser's local storage API (https://developer.chrome.com/docs/extensions/reference/storage/).
// 
// Other references:
//  - https://developer.chrome.com/docs/extensions/reference/storage/#property-local
//  - https://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers

// 
export class CustomCache {
    /**
     * Instantiate a `CustomCache` object.
     * @param {string} path 
     */
    constructor(cacheName) {
        this.cacheName = cacheName;

        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
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
            const body = this.encoder.encode(cached[url]._body);
            return new Response(body, cached[url]);
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
        const body = this.decoder.decode(buffer);
        try {
            await chrome.storage.local.set({
                [url]: {
                    _body: body,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
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
