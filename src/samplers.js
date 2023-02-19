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

    getTopTokens(logits, top = null) {

        logits = Array.from(logits)
            .map((x, i) => [i, x])            // Get indices ([index, score])
            .sort((a, b) => b[1] - a[1])      // Sort by log probabilities

        if (top !== null) {
            logits = logits.slice(0, top);    // Get top items
        }

        return logits
    }


    randomSelect(tokens) {

        // convert to probabilities
        let probabilities = tokens.map(x => [x[0], Math.exp(x[1])])

        let sumProbabilities = probabilities.reduce((acc, curr) => acc + curr[1], 0);

        let r = Math.random() * sumProbabilities;
        for (let i = 0; i < probabilities.length; ++i) {
            r -= probabilities[i][1];
            if (r <= 0) {
                return tokens[i];
            }
        }
        return tokens[0];
    }
}

class GreedySampler extends Sampler {
    sample(logits) {
        // NOTE: no need to do log_softmax here since we only take the maximum
        let logs = this.getLastLogits(logits);
        let argmax = indexOfMax(logs);
        let score = logs[argmax];
        return [[argmax, score]];
    }
}

class TopKSampler extends Sampler {
    constructor(k) {
        super();

        this.k = k;
    }

    sample(logits) {
        let [batchSize, seqLength, vocabSize] = logits.dims;

        let k = Math.min(this.k, vocabSize);
        let logs = this.getLastLogits(logits);
        // Turn into probabilities
        logs = log_softmax(logs);

        let topTokens = this.getTopTokens(logs, k);

        return [this.randomSelect(topTokens)];
    }
}

class BeamSearchSampler extends Sampler {
    constructor(num_beams) {
        super();
        this.num_beams = num_beams; // maximum number of beams
    }

    sample(logits) {
        let logs = this.getLastLogits(logits);
        logs = log_softmax(logs);
        let topTokens = this.getTopTokens(logs, this.num_beams);

        return topTokens;
    }
}

export {
    GreedySampler,
    TopKSampler,
    BeamSearchSampler
}
