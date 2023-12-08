
// Adapted from https://github.com/xenova/transformers.js/blob/c367f9d68b809bbbf81049c808bf6d219d761d23/src/utils/hub.js#L330
export async function getCachedFile(url) {
    let cache;
    try {
        cache = await caches.open('semantic-audio-search');
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
            return await cachedResponse.arrayBuffer();
        }
    } catch (e) {
        console.warn('Unable to open cache', e);
    }

    // No cache, or cache failed to open. Fetch the file.
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    if (cache) {
        try {
            // NOTE: We use `new Response(buffer, ...)` instead of `response.clone()` to handle LFS files
            await cache.put(url, new Response(buffer, {
                headers: response.headers,
            }));
        } catch (e) {
            console.warn('Unable to cache file', e);
        }
    }

    return buffer;
}

export async function getCachedJSON(url) {
    let buffer = await getCachedFile(url);

    let decoder = new TextDecoder('utf-8');
    let jsonData = decoder.decode(buffer);

    return JSON.parse(jsonData);
}
