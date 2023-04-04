const {
    Callable,
    indexOfMax,
    softmax,
    log_softmax,
    getTopItems
} = require("./utils.js");

/**
 * Sampler is a base class for all sampling methods used for text generation.
 */
class Sampler extends Callable {
    /**
     * Creates a new Sampler object with the specified temperature.
     * @param {number} temperature - The temperature to use when sampling. Higher values result in more random samples.
     */
    constructor(temperature) {
        super();
        this.temperature = temperature;
    }

    /**
     * Executes the sampler, using the specified logits.
     * @param {any} logits
     * @param {number} index
     * @returns {void}
     */
    _call(logits, index = -1) {
        // Sample from logits, of dims [batch, sequence_length, vocab_size].
        // If index is specified, sample from [batch, index, vocab_size].
        return this.sample(logits, index);
    }

    /**
     * Abstract method for sampling the logits.
     * @param {any} logits
     * @param {number} index
     * @throws {Error}
     */
    sample(logits, index) {
        throw Error("sample should be implemented in subclasses.")
    }

    /**
     * Returns the specified logits as an array, with temperature applied.
     * @param {any} logits
     * @param {number} index
     * @returns {Array}
     */
    getLogits(logits, index) {
        let vocabSize = logits.dims[2];

        let logs = logits.data;

        if (index === -1) {
            logs = logs.slice(-vocabSize);
        } else {
            let startIndex = index * vocabSize;
            logs = logs.slice(startIndex, startIndex + vocabSize);
        }

        // add temperature
        if (this.temperature > 0) {
            logs = logs.map(x => x / this.temperature)
        }
        return logs;
    }

    /**
     * Selects an item randomly based on the specified probabilities.
     * @param {Array} probabilities - An array of probabilities to use for selection.
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
     * @param {object} generation_config - An object containing options for the sampler.
     * @returns {Sampler} A Sampler object.
     */
    static getSampler(generation_config) {
        if (generation_config.num_beams > 1) {
            return new BeamSearchSampler(
                generation_config.temperature,
                generation_config.num_beams,
                generation_config.do_sample,
                generation_config.top_k,
            );

        } else if (generation_config.do_sample) {
            return new TopKSampler(
                generation_config.temperature,
                generation_config.top_k,
            );

        } else {
            if (generation_config.num_return_sequences > 1) {
                throw Error(`num_return_sequences has to be 1 when doing greedy search, but is ${generation_config.num_return_sequences}.`)
            }
            return new GreedySampler(generation_config.temperature);
        }
    }
}

/**
 * Class representing a Greedy Sampler.
 * @extends Sampler
 */
class GreedySampler extends Sampler {
    /**
     * Sample the maximum probability of a given logits tensor.
     * @param {any} logits
     * @param {number} [index=-1]
     * @returns {Array} - An array with a single tuple, containing the index of the maximum value and a meaningless score (since this is a greedy search).
     */
    sample(logits, index = -1) {
        // NOTE: no need to do log_softmax here since we only take the maximum
        let logs = this.getLogits(logits, index);
        let argmax = indexOfMax(logs);

        // Note: score is meaningless in this context, since we are performing
        // greedy search (p = 1 => log(p) = 0)
        return [
            [argmax, 0]
        ];
    }
}

/**
 * Class representing a TopKSampler.
 * @extends Sampler
 */
class TopKSampler extends Sampler {
    /**
     * Create a TopKSampler.
     * @param {number} temperature
     * @param {number} k
     */
    constructor(temperature, k) {
        super(temperature);
        this.k = k;
    }

    /**
     * Sample from the logits using the top-k sampling strategy.
     * @param {any} logits
     * @param {number} index
     * @returns {Array}
     */
    sample(logits, index = -1) {
        let [batchSize, seqLength, vocabSize] = logits.dims;
        let k = vocabSize;
        if (this.k > 0) {
            k = Math.min(this.k, k);
        }

        let logs = this.getLogits(logits, index);

        // Get top k tokens
        let topLogits = getTopItems(logs, k);

        // Compute softmax over logits
        let probabilities = softmax(topLogits.map(x => x[1]));

        let sampledIndex = this.randomSelect(probabilities);

        let tokenId = topLogits[sampledIndex][0];
        let score = Math.log(probabilities[sampledIndex]);
        return [
            [tokenId, score]
        ];
    }
}

/**
 * Class representing a beam search sampler for generating sequences.
 * @extends Sampler
 */
class BeamSearchSampler extends Sampler {
    /**
   * Create a BeamSearchSampler.
   * @param {number} temperature
   * @param {number} num_beams
   * @param {boolean} do_sample
   * @param {number} top_k
   */
    constructor(temperature, num_beams, do_sample, top_k) {
        super(temperature);
        this.num_beams = num_beams; // maximum number of beams
        this.do_sample = do_sample; // if true, perform multinomial sampling

        this.top_k = top_k; // if do_sample, sample from top k items
    }

    /**
   * Samples from the logits to generate a sequence using beam search.
   * @param {any} logits - The logits to sample from.
   * @param {number} [index=-1] - The index to sample from, if applicable.
   * @returns {Array} - An array of arrays containing tokens and scores.
   */
    sample(logits, index = -1) {

        let logs = this.getLogits(logits, index);

        if (this.do_sample || this.top_k > 0) {
            const [batchSize, seqLength, vocabSize] = logits.dims;

            let k = vocabSize;
            if (this.top_k > 0) {
                k = Math.min(this.top_k, k);
            }
            const topLogits = getTopItems(logs, k);

            // Compute softmax over top k logits
            const probabilities = softmax(topLogits.map(x => x[1]));

            return Array.from({ length: this.num_beams }, () => {
                const sampledIndex = this.randomSelect(probabilities);
                const tokenId = topLogits[sampledIndex][0];
                return [tokenId, Math.log(probabilities[sampledIndex])];
            });

        } else {
            // first perform log softmax to get scores over whole distribution
            const logProbabilities = log_softmax(logs);
            const topLogits = getTopItems(logProbabilities, this.num_beams);
            return topLogits;
        }
    }
}

module.exports = {
    Sampler,
    GreedySampler,
    TopKSampler,
    BeamSearchSampler
}
