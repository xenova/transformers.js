
export const DEVICE_TYPES = Object.freeze({
    cpu: 'cpu', // CPU
    gpu: 'gpu', // Auto-detect GPU
    wasm: 'wasm', // WebAssembly
    webgpu: 'webgpu', // WebGPU
    cuda: 'cuda', // CUDA
    dml: 'dml', // DirectML
});

/**
 * @typedef {keyof typeof DEVICE_TYPES} DeviceType
 */
