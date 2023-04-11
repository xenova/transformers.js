/**
 * This creates a nested array of a given type and depth (see examples).
 */
export type NestArray<T, Depth extends number, Acc extends never[] = []> = Acc['length'] extends Depth ? T : NestArray<T[], Depth, [...Acc, never]>;
export type AnyTypedArray = import('./math_utils.js').AnyTypedArray;
declare const Tensor_base: any;
export class Tensor extends Tensor_base {
    [x: string]: any;
    /**
     * Create a new Tensor or copy an existing Tensor.
     * @param  {[string, Array|AnyTypedArray, number[]]|[ONNXTensor]} args
     */
    constructor(...args: [string, any[] | AnyTypedArray, number[]] | [any]);
    /**
     *
     * @param {number} index
     * @returns {Tensor}
     * @todo Set type based on dims
     */
    get(index: number): Tensor;
    /**
     * @param {any} item
     * @returns {number}
     */
    indexOf(item: any): number;
    /**
     * @param {number} index
     * @param {number} iterSize
     * @param {any} iterDims
     * @returns {Tensor}
     */
    _subarray(index: number, iterSize: number, iterDims: any): Tensor;
    tolist(): any;
    /**
     * Return a new Tensor the sigmoid function applied to each element.
     * @returns {Tensor} - The tensor with the sigmoid function applied.
     */
    sigmoid(): Tensor;
    /**
     * Applies the sigmoid function to the tensor in place.
     * @returns {Tensor} - Returns `this`.
     */
    sigmoid_(): Tensor;
    clone(): Tensor;
    /**
     * Return a transposed version of this Tensor, according to the provided dimensions.
     * @param  {...number} dims - Dimensions to transpose.
     * @returns {Tensor} - The transposed tensor.
     */
    transpose(...dims: number[]): Tensor;
    /**
     * Returns an iterator object for iterating over the tensor data in row-major order.
     * If the tensor has more than one dimension, the iterator will yield subarrays.
     * @returns {Iterator} An iterator object for iterating over the tensor data in row-major order.
     */
    [Symbol.iterator](): Iterator<any, any, undefined>;
}
/**
 * Transposes a tensor according to the provided axes.
 * @param {any} tensor - The input tensor to transpose.
 * @param {Array} axes - The axes to transpose the tensor along.
 * @returns {Tensor} The transposed tensor.
 */
export function transpose(tensor: any, axes: any[]): Tensor;
/**
 * Concatenates an array of tensors along the 0th dimension.
 *
 * @param {any} tensors - The array of tensors to concatenate.
 * @returns {Tensor} - The concatenated tensor.
 */
export function cat(tensors: any): Tensor;
/**
 * Interpolates an Tensor to the given size.
 * @param {Tensor} input - The input tensor to interpolate. Data must be channel-first (i.e., [c, h, w])
 * @param {number[]} size - The output size of the image
 * @param {string} mode - The interpolation mode
 * @param {boolean} align_corners - Whether to align corners.
 * @returns {Tensor} - The interpolated tensor.
 */
export function interpolate(input: Tensor, [out_height, out_width]: number[], mode?: string, align_corners?: boolean): Tensor;
import { transpose as transpose_data } from "./math_utils.js";
export { transpose_data };
