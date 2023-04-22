/**
 * A base class for creating callable objects.
 *
 * @extends Function
 */
export class Callable extends Function {
    /**
    * Creates a new instance of the Callable class.
    */
    constructor();
    /**
     * This method should be implemented in subclasses to provide the
     * functionality of the callable object.
     *
     * @throws {Error} Must implement _call method in subclass
     * @param {...*} args
     */
    _call(...args: any[]): void;
}
/**
 * Retrieves a file from either a remote URL using the Fetch API or from the local file system using the FileSystem API.
 *
 * @async
 * @function getModelFile
 * @param {string} modelPath - The path of the model file.
 * @param {string} fileName - The name of the model file.
 * @param {function} [progressCallback=null] - A function to call when the download progress is updated.
 * @returns {Promise} A Promise that resolves with the file content as a buffer.
 * @throws Will throw an error if the file is not found.
 */
export function getModelFile(modelPath: string, fileName: string, progressCallback?: Function, fatal?: boolean): Promise<any>;
/**
 * Helper function to dispatch progress callbacks.
 *
 * @function dispatchCallback
 * @param {function} progressCallback - The progress callback function to dispatch.
 * @param {any} data - The data to pass to the progress callback function.
 * @returns {void}
 */
export function dispatchCallback(progressCallback: Function, data: any): void;
/**
 * Fetches a JSON file from a given path and file name.
 *
 * @param {string} modelPath - The path to the directory containing the file.
 * @param {string} fileName - The name of the file to fetch.
 * @param {function} progressCallback - A callback function to receive progress updates. Optional.
 * @returns {Promise<object>} - The JSON data parsed into a JavaScript object.
 */
export function fetchJSON(modelPath: string, fileName: string, progressCallback?: Function, fatal?: boolean): Promise<object>;
/**
 * Joins multiple parts of a path into a single path, while handling leading and trailing slashes.
 *
 * @param {...string} parts - Multiple parts of a path.
 * @returns {string} A string representing the joined path.
 */
export function pathJoin(...parts: string[]): string;
/**
 * Reverses the keys and values of an object.
 *
 * @param {object} data - The object to reverse.
 * @returns {object} The reversed object.
 * @see https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
 */
export function reverseDictionary(data: object): object;
/**
 * Returns the index of the maximum value in an array.
 * @param {Array} arr - The input array.
 * @see https://stackoverflow.com/a/11301464
 * @returns {number} - The index of the maximum value in the array.
 */
export function indexOfMax(arr: any[]): number;
/**
 * Compute the softmax of an array of numbers.
 *
 * @param {number[]} arr - The array of numbers to compute the softmax of.
 * @returns {number[]} The softmax array.
 */
export function softmax(arr: number[]): number[];
/**
 * Calculates the logarithm of the softmax function for the input array.
 * @param {number[]} arr - The input array to calculate the log_softmax function for.
 * @returns {any} - The resulting log_softmax array.
 */
export function log_softmax(arr: number[]): any;
/**
 * Escapes regular expression special characters from a string by replacing them with their escaped counterparts.
 *
 * @param {string} string - The string to escape.
 * @returns {string} - The escaped string.
 */
export function escapeRegExp(string: string): string;
/**
 * Get the top k items from an iterable, sorted by descending order
 *
 * @param {Array} items - The items to be sorted
 * @param {number} [top_k=0] - The number of top items to return (default: 0 = return all)
 * @returns {Array} - The top k items, sorted by descending order
 */
export function getTopItems(items: any[], top_k?: number): any[];
/**
 * Calculates the dot product of two arrays.
 * @param {number[]} arr1 - The first array.
 * @param {number[]} arr2 - The second array.
 * @returns {number} - The dot product of arr1 and arr2.
 */
export function dot(arr1: number[], arr2: number[]): number;
/**
 * Computes the cosine similarity between two arrays.
 *
 * @param {number[]} arr1 - The first array.
 * @param {number[]} arr2 - The second array.
 * @returns {number} The cosine similarity between the two arrays.
 */
export function cos_sim(arr1: number[], arr2: number[]): number;
/**
 * Calculates the magnitude of a given array.
 * @param {number[]} arr - The array to calculate the magnitude of.
 * @returns {number} The magnitude of the array.
 */
export function magnitude(arr: number[]): number;
/**
 * Helper function to get a file, using either the Fetch API or FileSystem API.
 *
 * @async
 * @function getFile
 * @param {string|URL} url - The URL of the file to get.
 * @returns {Promise<FileResponse|Response>} A promise that resolves to a FileResponse object (if the file is retrieved using the FileSystem API), or a Response object (if the file is retrieved using the Fetch API).
 */
export function getFile(url: string | URL): Promise<FileResponse | Response>;
/**
 * Check if a value is an integer.
 * @param {*} x - The value to check.
 * @returns {boolean} - True if the value is a string, false otherwise.
 */
export function isIntegralNumber(x: any): boolean;
/**
 * Check if a value is a string.
 * @param {*} text - The value to check.
 * @returns {boolean} - True if the value is a string, false otherwise.
 */
export function isString(text: any): boolean;
/**
 * Check if a value is exists.
 * @param {*} x - The value to check.
 * @returns {boolean} - True if the value exists, false otherwise.
 */
export function exists(x: any): boolean;
/**
 * Returns the minimum item.
 * @param {number[]} arr - array of numbers.
 * @returns {number} - the minimum number.
 * @throws {Error} If array is empty.
 */
export function min(arr: number[]): number;
/**
 * Returns the maximum item.
 * @param {number[]} arr - array of numbers.
 * @returns {number} - the maximum number.
 * @throws {Error} If array is empty.
 */
export function max(arr: number[]): number;
declare class FileResponse {
    /**
     * Creates a new `FileResponse` object.
     * @param {string|URL} filePath
     */
    constructor(filePath: string | URL);
    filePath: string | URL;
    headers: {};
    exists: boolean;
    status: number;
    statusText: string;
    body: ReadableStream<any>;
    /**
     * Updates the 'content-type' header property of the response based on the extension of
     * the file specified by the filePath property of the current object.
     * @function
     * @returns {void}
     */
    updateContentType(): void;
    /**
     * @function
     * @returns {FileResponse}
     */
    clone(): FileResponse;
    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with an ArrayBuffer containing the file's contents.
     * @async
     * @function
     * @returns {Promise<ArrayBuffer>} - A Promise that resolves with an ArrayBuffer containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    arrayBuffer(): Promise<ArrayBuffer>;
    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a Blob containing the file's contents.
     * @async
     * @function
     * @returns {Promise<Blob>} - A Promise that resolves with a Blob containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    blob(): Promise<Blob>;
    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a string containing the file's contents.
     * @async
     * @function
     * @returns {Promise<string>} - A Promise that resolves with a string containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    text(): Promise<string>;
    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a parsed JavaScript object containing the file's contents.
     * @async
     * @function
     * @returns {Promise<object>} - A Promise that resolves with a parsed JavaScript object containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    json(): Promise<object>;
}
export {};
