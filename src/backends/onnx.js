/**
 * @file Handler file for choosing the correct version of ONNX Runtime, based on the environment.
 * Ideally, we could import the `onnxruntime-web` and `onnxruntime-node` packages only when needed,
 * but dynamic imports don't seem to work with the current webpack version and/or configuration.
 * This is possibly due to the experimental nature of top-level await statements.
 * So, we just import both packages, and use the appropriate one based on the environment:
 *   - When running in node, we use `onnxruntime-node`.
 *   - When running in the browser, we use `onnxruntime-web` (`onnxruntime-node` is not bundled).
 * 
 * This module is not directly exported, but can be accessed through the environment variables:
 * ```javascript
 * import { env } from '@xenova/transformers';
 * console.log(env.backends.onnx);
 * ```
 * 
 * @module backends/onnx
 */

import { env, apis } from '../env.js';

// NOTE: Import order matters here. We need to import `onnxruntime-node` before `onnxruntime-web`.
// In either case, we select the default export if it exists, otherwise we use the named export.
import * as ONNX_NODE from 'onnxruntime-node';
import * as ONNX_WEB from 'onnxruntime-web/webgpu';

export { Tensor } from 'onnxruntime-common';

/** @type {import('../utils/devices.js').DeviceType[]} */
const supportedExecutionProviders = [];

/** @type {import('../utils/devices.js').DeviceType[]} */
let defaultExecutionProviders;
let ONNX;
if (apis.IS_NODE_ENV) {
    ONNX = ONNX_NODE.default ?? ONNX_NODE;
    supportedExecutionProviders.push('cpu');
    defaultExecutionProviders = ['cpu'];
} else {
    ONNX = ONNX_WEB;
    if (apis.IS_WEBGPU_AVAILABLE) {
        supportedExecutionProviders.push('webgpu');
    }
    supportedExecutionProviders.push('wasm');
    defaultExecutionProviders = ['wasm'];
}

// @ts-ignore
const InferenceSession = ONNX.InferenceSession;

/**
 * Map a device to the execution providers to use for the given device.
 * @param {import("../utils/devices.js").DeviceType} [device=null] (Optional) The device to run the inference on.
 * @returns {import("../utils/devices.js").DeviceType[]} The execution providers to use for the given device.
 */
export function deviceToExecutionProviders(device) {
    // TODO: Use mapping from device to execution providers for overloaded devices (e.g., 'gpu' or 'cpu').
    let executionProviders = defaultExecutionProviders;
    if (device) { // User has specified a device
        if (!supportedExecutionProviders.includes(device)) {
            throw new Error(`Unsupported device: "${device}". Should be one of: ${supportedExecutionProviders.join(', ')}.`)
        }
        executionProviders = [device];
    }
    return executionProviders;
}


/**
 * To prevent multiple calls to `initWasm()`, we store the first call in a Promise
 * that is resolved when the first InferenceSession is created. Subsequent calls
 * will wait for this Promise to resolve before creating their own InferenceSession.
 * @type {Promise<any>|null}
 */
let wasmInitPromise = null;

/**
 * Create an ONNX inference session.
 * @param {Uint8Array} buffer The ONNX model buffer.
 * @param {Object} session_options ONNX inference session options.
 * @returns {Promise<import('onnxruntime-common').InferenceSession>} The ONNX inference session.
 */
export async function createInferenceSession(buffer, session_options) {
    if (wasmInitPromise) {
        // A previous session has already initialized the WASM runtime
        // so we wait for it to resolve before creating this new session.
        await wasmInitPromise;
    }

    const sessionPromise = InferenceSession.create(buffer, session_options);
    wasmInitPromise ??= sessionPromise;
    return await sessionPromise;
}

/**
 * Check if an object is an ONNX tensor.
 * @param {any} x The object to check
 * @returns {boolean} Whether the object is an ONNX tensor.
 */
export function isONNXTensor(x) {
    return x instanceof ONNX.Tensor;
}

// @ts-ignore
const ONNX_ENV = ONNX?.env;
if (ONNX_ENV?.wasm) {
    // Initialize wasm backend with suitable default settings.

    // Set path to wasm files. This is needed when running in a web worker.
    // https://onnxruntime.ai/docs/api/js/interfaces/Env.WebAssemblyFlags.html#wasmPaths
    // We use remote wasm files by default to make it easier for newer users.
    // In practice, users should probably self-host the necessary .wasm files.
    // TODO: update this before release
    ONNX_ENV.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';

    // Proxy the WASM backend to prevent the UI from freezing
    // NOTE: This is only needed when running in a non-worker browser environment.
    ONNX_ENV.wasm.proxy = !apis.IS_WEBWORKER_ENV;

    // https://developer.mozilla.org/en-US/docs/Web/API/crossOriginIsolated
    if (typeof crossOriginIsolated === 'undefined' || !crossOriginIsolated) {
        ONNX_ENV.wasm.numThreads = 1;
    }

    // Running in a browser-environment
    // TODO: Check if 1.17.1 fixes this issue.
    // SIMD for WebAssembly does not operate correctly in some recent versions of iOS (16.4.x).
    // As a temporary fix, we disable it for now.
    // For more information, see: https://github.com/microsoft/onnxruntime/issues/15644
    const isIOS = typeof navigator !== 'undefined' && /iP(hone|od|ad).+16_4.+AppleWebKit/.test(navigator.userAgent);
    if (isIOS) {
        ONNX_ENV.wasm.simd = false;
    }
}

/**
 * Check if ONNX's WASM backend is being proxied.
 * @returns {boolean} Whether ONNX's WASM backend is being proxied.
 */
export function isONNXProxy() {
    // TODO: Update this when allowing non-WASM backends.
    return ONNX_ENV?.wasm?.proxy;
}

// Expose ONNX environment variables to `env.backends.onnx`
env.backends.onnx = ONNX_ENV;
