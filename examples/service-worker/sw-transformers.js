/*
https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register
*/

const filelist = [
    "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.0/dist/ort-wasm-simd.wasm",
    "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.0/dist/transformers.min.js"
]

const addResourcesToCache = async (resources) => {
    const cache = await caches.open("transformers-cache");
    await cache.addAll(resources);
};

const putInCache = async (request, response) => {
    const cache = await caches.open("transformers-cache");
    await cache.put(request, response);
};

const cacheFirst = async ({ request }) => {
    // First try to get the resource from the cache
    const responseFromCache = await caches.match(request);
    if (responseFromCache) {
        return responseFromCache;
    }

    // Next try to get the resource from the network
    try {
        const responseFromNetwork = await fetch(request);
        // response may be used only once
        // we need to save clone to put one copy in cache
        // and serve second one
        if(request.status === 200){
                putInCache(request, responseFromNetwork.clone());
        }
        return responseFromNetwork;
    } catch (error) {
        return new Response("Network error happened", {
            status: 408,
            headers: { "Content-Type": "text/plain" },
        });
    }
};

self.addEventListener("activate", (event) => {
    event.waitUntil(
        self.skipWaiting()
    );
});

self.addEventListener("install", (event) => {
    event.waitUntil(
        addResourcesToCache(filelist),
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        cacheFirst({
            request: event.request
        }),
    );
});