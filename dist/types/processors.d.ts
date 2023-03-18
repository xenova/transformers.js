export class AutoProcessor {
    static from_pretrained(modelPath: any, progressCallback?: any): Promise<WhisperProcessor>;
}
declare class WhisperProcessor extends Processor {
}
declare class Processor extends Callable {
    constructor(feature_extractor: any);
    feature_extractor: any;
    _call(input: any): Promise<any>;
}
import { Callable } from "./utils.js";
export {};
