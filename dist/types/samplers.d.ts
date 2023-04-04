/**
 * Sampler is a base class for all sampling methods used for text generation.
 */
export class Sampler extends Callable {
    /**
     * Returns a Sampler object based on the specified options.
     * @param {object} generation_config - An object containing options for the sampler.
     * @returns {Sampler} A Sampler object.
     */
    static getSampler(generation_config: object): Sampler;
    /**
     * Creates a new Sampler object with the specified temperature.
     * @param {number} temperature - The temperature to use when sampling. Higher values result in more random samples.
     */
    constructor(temperature: number);
    temperature: number;
    /**
     * Executes the sampler, using the specified logits.
     * @param {any} logits
     * @param {number} index
     * @returns {void}
     */
    _call(logits: any, index?: number): void;
    /**
     * Abstract method for sampling the logits.
     * @param {any} logits
     * @param {number} index
     * @throws {Error}
     */
    sample(logits: any, index: number): void;
    /**
     * Returns the specified logits as an array, with temperature applied.
     * @param {any} logits
     * @param {number} index
     * @returns {Array}
     */
    getLogits(logits: any, index: number): any[];
    /**
     * Selects an item randomly based on the specified probabilities.
     * @param {Array} probabilities - An array of probabilities to use for selection.
     * @returns {number} The index of the selected item.
     */
    randomSelect(probabilities: any[]): number;
}
/**
 * Class representing a Greedy Sampler.
 * @extends Sampler
 */
export class GreedySampler extends Sampler {
    /**
     * Sample the maximum probability of a given logits tensor.
     * @param {any} logits
     * @param {number} [index=-1]
     * @returns {Array} - An array with a single tuple, containing the index of the maximum value and a meaningless score (since this is a greedy search).
     */
    sample(logits: any, index?: number): any[];
}
/**
 * Class representing a TopKSampler.
 * @extends Sampler
 */
export class TopKSampler extends Sampler {
    /**
     * Create a TopKSampler.
     * @param {number} temperature
     * @param {number} k
     */
    constructor(temperature: number, k: number);
    k: number;
    /**
     * Sample from the logits using the top-k sampling strategy.
     * @param {any} logits
     * @param {number} index
     * @returns {Array}
     */
    sample(logits: any, index?: number): any[];
}
/**
 * Class representing a beam search sampler for generating sequences.
 * @extends Sampler
 */
export class BeamSearchSampler extends Sampler {
    /**
   * Create a BeamSearchSampler.
   * @param {number} temperature
   * @param {number} num_beams
   * @param {boolean} do_sample
   * @param {number} top_k
   */
    constructor(temperature: number, num_beams: number, do_sample: boolean, top_k: number);
    num_beams: number;
    do_sample: boolean;
    top_k: number;
    /**
   * Samples from the logits to generate a sequence using beam search.
   * @param {any} logits - The logits to sample from.
   * @param {number} [index=-1] - The index to sample from, if applicable.
   * @returns {Array} - An array of arrays containing tokens and scores.
   */
    sample(logits: any, index?: number): any[];
}
import { Callable } from "./utils.js";
