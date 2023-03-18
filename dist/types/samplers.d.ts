export class Sampler extends Callable {
    static getSampler(options: any): BeamSearchSampler | TopKSampler | GreedySampler;
    constructor(temperature: any);
    temperature: any;
    _call(logits: any, index?: number): void;
    sample(logits: any, index: any): void;
    getLogits(logits: any, index: any): any;
    randomSelect(probabilities: any): number;
}
export class GreedySampler extends Sampler {
    sample(logits: any, index?: number): number[][];
}
export class TopKSampler extends Sampler {
    constructor(temperature: any, k: any);
    k: any;
    sample(logits: any, index?: number): any[][];
}
export class BeamSearchSampler extends Sampler {
    constructor(temperature: any, num_beams: any, do_sample: any, top_k: any);
    num_beams: any;
    do_sample: any;
    top_k: any;
    sample(logits: any, index?: number): any;
}
import { Callable } from "./utils.js";
