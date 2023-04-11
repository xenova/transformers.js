export type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
export type BigTypedArray = BigInt64Array | BigUint64Array;
export type AnyTypedArray = TypedArray | BigTypedArray;
/**
 * @typedef {Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array} TypedArray
 * @typedef {BigInt64Array | BigUint64Array} BigTypedArray
 * @typedef {TypedArray | BigTypedArray} AnyTypedArray
 */
/**
 * @param {TypedArray} input
 */
export function interpolate(input: TypedArray, [in_channels, in_height, in_width]: [any, any, any], [out_height, out_width]: [any, any], mode?: string, align_corners?: boolean): any;
/**
 * Helper method to transpose a AnyTypedArray directly
 * @param {T} array
 * @template {AnyTypedArray} T
 * @param {number[]} dims
 * @param {number[]} axes
 * @returns {[T, number[]]} The transposed array and the new shape.
 */
declare function transpose_data<T extends AnyTypedArray>(array: T, dims: number[], axes: number[]): [T, number[]];
export { transpose_data as transpose };
