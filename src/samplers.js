import {
    Callable,
    indexOfMax,
    softmax,
    log_softmax
} from "./utils.js"

class Sampler extends Callable {
    constructor(temperature) {
        super();
        this.temperature = temperature;
    }

    _call(logits) {
        return this.sample(logits);
    }
    sample(logits) {
        throw Error("sample should be implemented in subclasses.")
    }
    getLastLogits(logits) {
        let [_, seqLength, vocabSize] = logits.dims;

        let logs = logits.data;
        if (seqLength > 1) {
            logs = logs.slice(-vocabSize);
        }

        // add temperature
        if (this.temperature < 1) {
            logs = logs.map(x => x * this.temperature)
        }
        return logs;
    }


    getTopLogits(logits, top_k = 0) {
        // if top == 0, return all

        logits = Array.from(logits)
            .map((x, i) => [i, x])            // Get indices ([index, score])
            .sort((a, b) => b[1] - a[1])      // Sort by log probabilities

        if (top_k > 0) {
            logits = logits.slice(0, top_k);    // Get top k items
        }

        return logits
    }


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

    static getSampler(options) {
        // TODO add beam
        if (options.num_beams > 1) {
            return new BeamSearchSampler(
                options.temperature,
                options.num_beams,
                options.do_sample,
                options.top_k,
            )

        } else if (options.top_k > 0 || options.do_sample) {
            return new TopKSampler(
                options.temperature,
                options.top_k,
            )
        } else {
            return new GreedySampler(options.temperature)
        }
    }
}

class GreedySampler extends Sampler {
    sample(logits) {
        // NOTE: no need to do log_softmax here since we only take the maximum
        let logs = this.getLastLogits(logits);
        let argmax = indexOfMax(logs);

        // Note: score is meaningless in this context, since we are performing
        // greedy search (p = 1 => log(p) = 0)
        return [
            [argmax, 0]
        ];
    }
}

class TopKSampler extends Sampler {
    constructor(temperature, k) {
        super(temperature);
        this.k = k;
    }

    sample(logits) {
        let [batchSize, seqLength, vocabSize] = logits.dims;
        let k = vocabSize;
        if (this.k > 0) {
            k = Math.min(this.k, k);
        }

        let logs = this.getLastLogits(logits);

        // Get top k tokens
        let topLogits = this.getTopLogits(logs, k);

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

class BeamSearchSampler extends Sampler {
    constructor(temperature, num_beams, do_sample, top_k) {
        super(temperature);
        this.num_beams = num_beams; // maximum number of beams
        this.do_sample = do_sample; // if true, perform multinomial sampling

        this.top_k = top_k; // if do_sample, sample from top k items
    }

    sample(logits) {

        let logs = this.getLastLogits(logits);

        if (this.do_sample || this.top_k > 0) {
            const [batchSize, seqLength, vocabSize] = logits.dims;

            let k = vocabSize;
            if (this.top_k > 0) {
                k = Math.min(this.top_k, k);
            }
            const topLogits = this.getTopLogits(logs, k);

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
            const topLogits = this.getTopLogits(logProbabilities, this.num_beams);
            return topLogits;
        }
    }
}

export {
    Sampler,
    GreedySampler,
    TopKSampler,
    BeamSearchSampler
}
