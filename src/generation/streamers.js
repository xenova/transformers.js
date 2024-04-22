
/**
 * @module generation/streamers
 */

export class BaseStreamer {
    /**
     * Function that is called by `.generate()` to push new tokens
     * @param {bigint[][]} value 
     */
    put(value) {
        throw Error('Not implemented');
    }

    /**
     * Function that is called by `.generate()` to signal the end of generation
     */
    end() {
        throw Error('Not implemented');
    }
}
