import {
    Callable,
    indexOfMax,
    softmax,
    log_softmax
} from "./utils.js"

class Sampler extends Callable {
    constructor() {
        super();
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

        return logs;
    }

    addTemperature(logits, temperature){
        if (temperature >= 1) {
            return logits;
        }
        return logits.map(x => x * temperature);
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
    constructor(k, temperature) {
        super();

        this.k = k;
        this.temperature = temperature;
    }

    sample(logits) {
        let [batchSize, seqLength, vocabSize] = logits.dims;
        let k = Math.min(this.k, vocabSize);

        let logs = this.getLastLogits(logits);
        logs = this.addTemperature(logs, this.temperature);

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
    constructor(num_beams, do_sample, top_k, temperature) {
        super();
        this.num_beams = num_beams; // maximum number of beams
        this.do_sample = do_sample; // if true, perform multinomial sampling

        this.top_k = top_k; // if do_sample, sample from top k items
        this.temperature = temperature;
    }

    sample(logits) {

        let logs = this.getLastLogits(logits);
        logs = this.addTemperature(logs, this.temperature);

        if (this.do_sample || this.top_k > 0) {
            const [batchSize, seqLength, vocabSize] = logits.dims;
            const k = Math.min(this.top_k, vocabSize);
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
    GreedySampler,
    TopKSampler,
    BeamSearchSampler
}
