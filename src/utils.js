

/**
 * Helper function to dispatch progress callbacks.
 *
 * @param {function} progress_callback - The progress callback function to dispatch.
 * @param {any} data - The data to pass to the progress callback function.
 * @returns {void}
 */
function dispatchCallback(progress_callback, data) {
    if (progress_callback !== null) progress_callback(data);
}

/**
 * Reverses the keys and values of an object.
 *
 * @param {object} data - The object to reverse.
 * @returns {object} The reversed object.
 * @see https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
 */
function reverseDictionary(data) {
    // https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [value, key]));
}

/**
 * Escapes regular expression special characters from a string by replacing them with their escaped counterparts.
 *
 * @param {string} string - The string to escape.
 * @returns {string} - The escaped string.
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * A base class for creating callable objects.
 */
class Callable {
    /**
    * Creates a new instance of the Callable class.
    */
    constructor() {
        /**
         * Creates a closure that delegates to a private method '_call' with the given arguments.
         *
         * @param {...any} args - Zero or more arguments to pass to the '_call' method.
         * @returns {*} - The result of calling the '_call' method.
         */
        let closure = function (...args) {
            // @ts-ignore
            return closure._call(...args)
        }
        return Object.setPrototypeOf(closure, new.target.prototype)
    }

    /**
     * This method should be implemented in subclasses to provide the
     * functionality of the callable object.
     *
     * @throws {Error} Must implement _call method in subclass
     * @param {...*} args
     */
    _call(...args) {
        throw Error('Must implement _call method in subclass')
    }
}

/**
 * Check if a value is a string.
 * @param {*} text - The value to check.
 * @returns {boolean} - True if the value is a string, false otherwise.
 */
function isString(text) {
    return typeof text === 'string' || text instanceof String
}

/**
 * Check if a value is an integer.
 * @param {*} x - The value to check.
 * @returns {boolean} - True if the value is a string, false otherwise.
 */
function isIntegralNumber(x) {
    return Number.isInteger(x) || typeof x === 'bigint'
}

/**
 * Check if a value is exists.
 * @param {*} x - The value to check.
 * @returns {boolean} - True if the value exists, false otherwise.
 */
function exists(x) {
    return x !== undefined && x !== null;
}

module.exports = {
    Callable,
    dispatchCallback,
    reverseDictionary,
    escapeRegExp,
    isIntegralNumber,
    isString,
    exists,
};
