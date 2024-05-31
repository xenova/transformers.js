
/**
 * @module generation/streamers
 */

import { mergeArrays } from '../utils/core.js';
import { is_chinese_char } from '../tokenizers.js';
import { apis } from '../env.js';

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

const stdout_write = apis.IS_PROCESS_AVAILABLE
    ? x => process.stdout.write(x)
    : x => console.log(x);

/**
 * Simple text streamer that prints the token(s) to stdout as soon as entire words are formed.
 */
export class TextStreamer extends BaseStreamer {
    /**
     * 
     * @param {import('../tokenizers.js').PreTrainedTokenizer} tokenizer 
     */
    constructor(tokenizer, {
        skip_prompt = false,
        ...decode_kwargs
    } = {}) {
        super();
        this.tokenizer = tokenizer;
        this.skip_prompt = skip_prompt;
        this.decode_kwargs = decode_kwargs;

        // variables used in the streaming process
        this.token_cache = [];
        this.print_len = 0;
        this.next_tokens_are_prompt = true;
    }

    /**
     * Receives tokens, decodes them, and prints them to stdout as soon as they form entire words.
     * @param {bigint[][]} value 
     */
    put(value) {
        if (value.length > 1) {
            throw Error('TextStreamer only supports batch size of 1');
        }

        const tokens = value[0];

        if (this.skip_prompt && this.next_tokens_are_prompt) {
            this.next_tokens_are_prompt = false;
            return;
        }

        // Add the new token to the cache and decodes the entire thing.
        this.token_cache = mergeArrays(this.token_cache, tokens);
        const text = this.tokenizer.decode(this.token_cache, this.decode_kwargs);

        let printable_text;
        if (text.endsWith('\n')) {
            // After the symbol for a new line, we flush the cache.
            printable_text = text.slice(this.print_len);
            this.token_cache = [];
            this.print_len = 0;
        } else if (text.length > 0 && is_chinese_char(text.charCodeAt(text.length - 1))) {
            // If the last token is a CJK character, we print the characters.
            printable_text = text.slice(this.print_len);
            this.print_len += printable_text.length;
        } else {
            // Otherwise, prints until the last space char (simple heuristic to avoid printing incomplete words,
            // which may change with the subsequent token -- there are probably smarter ways to do this!)
            printable_text = text.slice(this.print_len, text.lastIndexOf(' ') + 1);
            this.print_len += printable_text.length;
        }

        this.on_finalized_text(printable_text, false);
    }

    /**
     * Flushes any remaining cache and prints a newline to stdout.
     */
    end() {
        let printable_text;
        if (this.token_cache.length > 0) {
            const text = this.tokenizer.decode(this.token_cache, this.decode_kwargs);
            printable_text = text.slice(this.print_len);
            this.token_cache = [];
            this.print_len = 0;
        } else {
            printable_text = '';
        }
        this.next_tokens_are_prompt = true;
        this.on_finalized_text(printable_text, true);
    }

    /**
     * Prints the new text to stdout. If the stream is ending, also prints a newline.
     * @param {string} text 
     * @param {boolean} stream_end 
     */
    on_finalized_text(text, stream_end) {
        if (text.length > 0) {
            stdout_write(text);
        }
        if (stream_end) {
            stdout_write('\n');
        }
    }
}
