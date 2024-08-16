
/**
 * The list of devices supported by Transformers.js
 */
export const DEVICE_TYPES = Object.freeze({
    auto: 'auto', // Auto-detect based on device and environment
    gpu: 'gpu', // Auto-detect GPU
    cpu: 'cpu', // CPU
    wasm: 'wasm', // WebAssembly
    webgpu: 'webgpu', // WebGPU
    cuda: 'cuda', // CUDA
    dml: 'dml', // DirectML
});

/**
 * @typedef {keyof typeof DEVICE_TYPES} DeviceType
 */
