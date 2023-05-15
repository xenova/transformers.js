
/**
 * @file Core utility functions/classes for Transformers.js.
 * 
 * These are only used internally, meaning an end-user shouldn't
 * need to access anything here.
 * 
 * @module utils/core
 */

/**
 * Helper function to dispatch progress callbacks.
 *
 * @param {function} progress_callback The progress callback function to dispatch.
 * @param {any} data The data to pass to the progress callback function.
 * @returns {void}
 * @private
 */
export function dispatchCallback(progress_callback, data) {
    if (progress_callback !== null) progress_callback(data);
}

/**
 * Reverses the keys and values of an object.
 *
 * @param {Object} data The object to reverse.
 * @returns {Object} The reversed object.
 * @see https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
 */
export function reverseDictionary(data) {
    // https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [value, key]));
}

/**
 * Escapes regular expression special characters from a string by replacing them with their escaped counterparts.
 *
 * @param {string} string The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * A base class for creating callable objects.
 * 
 * @type {new () => {(...args: any[]): any, _call(...args: any[]): any}}
 */
export const Callable = /** @type {any} */ (class {
    /**
    * Creates a new instance of the Callable class.
    */
    constructor() {
        /**
         * Creates a closure that delegates to a private method '_call' with the given arguments.
         * @type {any}
         * @param {...any} args Zero or more arguments to pass to the '_call' method.
         * @returns {*} The result of calling the '_call' method.
         */
        let closure = function (...args) {
            return closure._call(...args)
        }
        return Object.setPrototypeOf(closure, new.target.prototype)
    }

    /**
     * This method should be implemented in subclasses to provide the
     * functionality of the callable object.
     *
     * @param {any[]} args
     * @throws {Error} If the subclass does not implement the `_call` method.
     */
    _call(...args) {
        throw Error('Must implement _call method in subclass')
    }
});


/**
 * Check if a value is a string.
 * @param {*} text The value to check.
 * @returns {boolean} True if the value is a string, false otherwise.
 */
export function isString(text) {
    return typeof text === 'string' || text instanceof String
}


/**
 * Check if a value is a typed array.
 * @param {*} val The value to check.
 * @returns {boolean} True if the value is a `TypedArray`, false otherwise.
 * 
 * Adapted from https://stackoverflow.com/a/71091338/13989043
 */
export function isTypedArray(val) {
    return val?.prototype?.__proto__?.constructor?.name === 'TypedArray';
}


/**
 * Check if a value is an integer.
 * @param {*} x The value to check.
 * @returns {boolean} True if the value is a string, false otherwise.
 */
export function isIntegralNumber(x) {
    return Number.isInteger(x) || typeof x === 'bigint'
}

/**
 * Check if a value is exists.
 * @param {*} x The value to check.
 * @returns {boolean} True if the value exists, false otherwise.
 */
export function exists(x) {
    return x !== undefined && x !== null;
}

/**
 * Calculates the dimensions of a nested array.
 *
 * @param {Array} arr The nested array to calculate dimensions for.
 * @returns {Array} An array containing the dimensions of the input array.
 */
export function calculateDimensions(arr) {
    const dimensions = [];
    let current = arr;
    while (Array.isArray(current)) {
        dimensions.push(current.length);
        current = current[0];
    }
    return dimensions;
}
