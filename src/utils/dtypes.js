import { DEVICE_TYPES } from "./devices.js";

// TODO: Use the adapter from `env.backends.onnx.webgpu.adapter` to check for `shader-f16` support,
// when available in https://github.com/microsoft/onnxruntime/pull/19940.
// For more information, see https://github.com/microsoft/onnxruntime/pull/19857#issuecomment-1999984753
async function isFp16Supported() {
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return adapter.features.has('shader-f16');
    } catch (e) {
        return false
    }
}
export const FP16_SUPPORTED = await isFp16Supported();

export const DATA_TYPES = Object.freeze({
    fp32: 'fp32',
    fp16: 'fp16',
    q8: 'q8',
    int8: 'int8',
    uint8: 'uint8',
});

/** @typedef {keyof typeof DATA_TYPES} DataType */

const defaultGpuDtype = FP16_SUPPORTED ? DATA_TYPES.fp16 : DATA_TYPES.fp32;
export const DEFAULT_DEVICE_DTYPE_MAPPING = Object.freeze({
    [DEVICE_TYPES.cpu]: DATA_TYPES.q8,
    [DEVICE_TYPES.gpu]: defaultGpuDtype,
    [DEVICE_TYPES.wasm]: DATA_TYPES.q8,
    [DEVICE_TYPES.webgpu]: defaultGpuDtype,
});

/** @type {Record<DataType, string>} */
export const DEFAULT_DTYPE_SUFFIX_MAPPING = Object.freeze({
    [DATA_TYPES.fp32]: '',
    [DATA_TYPES.fp16]: '_fp16',
    [DATA_TYPES.int8]: '_int8',
    [DATA_TYPES.uint8]: '_uint8',
    [DATA_TYPES.q8]: '_quantized',
});
