
export const DEVICE_TYPES = Object.freeze({
    cpu: 'cpu',
    gpu: 'gpu',
    wasm: 'wasm',
    webgpu: 'webgpu',
    webnn: 'webnn',
});

/**
 * @typedef {keyof typeof DEVICE_TYPES} DeviceType
 */
