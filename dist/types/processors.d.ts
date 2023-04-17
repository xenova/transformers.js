/**
 * Helper class to determine model type from config
 */
export class AutoProcessor {
    /**
     * Returns a new instance of a Processor with a feature extractor
     * based on the configuration file located at `modelPath`.
     *
     * @param {string} modelPath - The path to the model directory.
     * @param {function} progressCallback - A callback function to track the loading progress (optional).
     * @returns {Promise<Processor>} A Promise that resolves with a new instance of a Processor.
     * @throws {Error} If the feature extractor type specified in the configuration file is unknown.
     */
    static from_pretrained(modelPath: string, progressCallback?: Function): Promise<Processor>;
}
/**
 * Represents a Processor that extracts features from an input.
 * @extends Callable
 */
export class Processor extends Callable {
    /**
     * Creates a new Processor with the given feature extractor.
     * @param {function} feature_extractor - The function used to extract features from the input.
     */
    constructor(feature_extractor: Function);
    feature_extractor: Function;
    /**
     * Calls the feature_extractor function with the given input.
     * @param {any} input - The input to extract features from.
     * @returns {Promise<any>} A Promise that resolves with the extracted features.
     * @async
     */
    _call(input: any): Promise<any>;
}
import { Callable } from "./utils.js";
