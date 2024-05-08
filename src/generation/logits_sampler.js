
/**
 * @module generation/logits_sampler
 */

import { Callable } from "../utils/generic.js";
import { Tensor } from "../utils/tensor.js";

import {
    max,
    softmax,
    getTopItems,
} from '../utils/maths.js';
import { GenerationConfig } from '../generation/configuration_utils.js';

/**
 * Sampler is a base class for all sampling methods used for text generation.
 */
export class LogitsSampler extends Callable {
    /**
     * Creates a new Sampler object with the specified generation config.
     * @param {GenerationConfig} generation_config The generation config.
     */
    constructor(generation_config) {
        super();
        this.generation_config = generation_config;
    }

    /**
     * Executes the sampler, using the specified logits.
     * @param {Tensor} logits
     * @param {number} index
     * @returns {[number, number][]}
     */
    _call(logits, index = -1) {
        // Sample from logits, of dims [batch, sequence_length, vocab_size].
        // If index is specified, sample from [batch, index, vocab_size].
        return this.sample(logits, index);
    }

    /**
     * Abstract method for sampling the logits.
     * @param {Tensor} logits
     * @param {number} index
     * @throws {Error}
     * @returns {[number, number][]}
     */
    sample(logits, index) {
        throw Error("sample should be implemented in subclasses.")
    }

    /**
     * Returns the specified logits as an array, with temperature applied.
     * @param {Tensor} logits
     * @param {number} index
     * @returns {Float32Array}
     */
    getLogits(logits, index) {
        let vocabSize = logits.dims.at(-1);

        let logs = /** @type {Float32Array} */(logits.data);

        if (index === -1) {
            logs = logs.slice(-vocabSize);
        } else {
            let startIndex = index * vocabSize;
            logs = logs.slice(startIndex, startIndex + vocabSize);
        }
        return logs;
    }

    /**
     * Selects an item randomly based on the specified probabilities.
     * @param {Array} probabilities An array of probabilities to use for selection.
     * @returns {number} The index of the selected item.
     */
    randomSelect(probabilities) {
        // Return index of chosen item
        let sumProbabilities = probabilities.reduce((acc, curr) => acc + curr, 0);

        let r = Math.random() * sumProbabilities;
        for (let i = 0; i < probabilities.length; ++i) {
            r -= probabilities[i];
            if (r <= 0) {
                return i;
            }
        }
        return 0; // return first (most probable) as a fallback
    }

    /**
     * Returns a Sampler object based on the specified options.
     * @param {GenerationConfig} generation_config An object containing options for the sampler.
     * @returns {LogitsSampler} A Sampler object.
     */
    static getSampler(generation_config) {
        // - *greedy decoding*: `num_beams=1` and `do_sample=False`
        // - *contrastive search*: `penalty_alpha>0` and `top_k>1`
        // - *multinomial sampling*: `num_beams=1` and `do_sample=True`
        // - *beam-search decoding*: `num_beams>1` and `do_sample=False`
        // - *beam-search multinomial sampling*: `num_beams>1` and `do_sample=True`
        // - *diverse beam-search decoding*: `num_beams>1` and `num_beam_groups>1`
        // - *constrained beam-search decoding*: `constraints!=None` or `force_words_ids!=None`

        // NOTE: beam search is implemented directly into the generation function
        if (generation_config.do_sample) {
            return new MultinomialSampler(generation_config);

        } else if (generation_config.num_beams > 1) {
            return new BeamSearchSampler(generation_config);

        } else {
            if (generation_config.num_return_sequences > 1) {
                throw Error(`num_return_sequences has to be 1 when doing greedy search, but is ${generation_config.num_return_sequences}.`)
            }
            return new GreedySampler(generation_config);
        }
    }
}

/**
 * Class representing a Greedy Sampler.
 */
class GreedySampler extends LogitsSampler {
    /**
     * Sample the maximum probability of a given logits tensor.
     * @param {Tensor} logits
     * @param {number} [index=-1]
     * @returns {[number, number][]} An array with a single tuple, containing the index of the maximum value and a meaningless score (since this is a greedy search).
     */
    sample(logits, index = -1) {
        // NOTE: no need to do log_softmax here since we only take the maximum
        let logs = this.getLogits(logits, index);
        let argmax = max(logs)[1];

        // Note: score is meaningless in this context, since we are performing
        // greedy search (p = 1 => log(p) = 0)
        return [
            [argmax, 0]
        ];
    }
}

/**
 * Class representing a MultinomialSampler.
 */
class MultinomialSampler extends LogitsSampler {

    /**
     * Sample from the logits.
     * @param {Tensor} logits
     * @param {number} index
     * @returns {[number, number][]}
     */
    sample(logits, index = -1) {
        let k = logits.dims.at(-1); // defaults to vocab size
        if (this.generation_config.top_k > 0) {
            k = Math.min(this.generation_config.top_k, k);
        }

        // Get logits of nth token
        const logs = this.getLogits(logits, index);

        // Get top k tokens
        const topLogits = getTopItems(logs, k);

        // Compute softmax over logits
        const probabilities = softmax(topLogits.map(x => x[1]));

        return Array.from({ length: this.generation_config.num_beams }, () => {
            const sampledIndex = this.randomSelect(probabilities);
            return [
                topLogits[sampledIndex][0], // token id
                Math.log(probabilities[sampledIndex]), // score
            ];
        });
    }
}


/**
 * Class representing a BeamSearchSampler.
 */
class BeamSearchSampler extends LogitsSampler {

    /**
     * Sample from the logits.
     * @param {Tensor} logits
     * @param {number} index
     * @returns {[number, number][]}
     */
    sample(logits, index = -1) {
        let k = logits.dims.at(-1); // defaults to vocab size
        if (this.generation_config.top_k > 0) {
            k = Math.min(this.generation_config.top_k, k);
        }

        // Get logits of nth token
        const logs = this.getLogits(logits, index);

        // Get top k tokens
        const topLogits = getTopItems(logs, k);

        // Compute softmax over logits
        const probabilities = softmax(topLogits.map(x => x[1]));

        return Array.from({ length: this.generation_config.num_beams }, (_, i) => {
            return [
                topLogits[i][0], // token id
                Math.log(probabilities[i]), // score
            ];
        });
    }
}
