export class Tensor extends ONNX.TypedTensor<"string"> {
    constructor(...args: any[]);
    /**
     *
     * @param {number} index
     * @returns
     */
    get(index: number): string | Tensor;
    indexOf(item: any): number;
    /**
     * @param {number} index
     * @param {number} iterSize
     * @param {number} iterDims
     * @returns {this}
     */
    _subarray(index: number, iterSize: number, iterDims: number): this;
    [Symbol.iterator](): Generator<string | Tensor, void, undefined>;
}
export function transpose(tensor: any, axes: any): Tensor;
export function cat(tensors: any): any;
import ONNX = require("onnxruntime-web");
