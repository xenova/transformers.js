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

import path from 'path';
import { env, RUNNING_LOCALLY } from '../env.js';

// NOTE: Import order matters here. We need to import `onnxruntime-node` before `onnxruntime-web`.
// In either case, we select the default export if it exists, otherwise we use the named export.
import * as ONNX_NODE from 'onnxruntime-node';
import * as ONNX_WEB from 'onnxruntime-web';

/** @type {import('onnxruntime-web')|import('onnxruntime-node')} The ONNX runtime module. */
export let ONNX;

const WEBGPU_AVAILABLE = typeof navigator !== 'undefined' && 'gpu' in navigator;
const USE_ONNXRUNTIME_NODE = typeof process !== 'undefined' && process?.release?.name === 'node'

const ONNX_MODULES = new Map();

if (USE_ONNXRUNTIME_NODE) {
    ONNX = ONNX_NODE.default ?? ONNX_NODE;
    ONNX_MODULES.set('node', ONNX);
} else {
    // @ts-ignore
    ONNX = ONNX_WEB.default ?? ONNX_WEB;
    ONNX_MODULES.set('web', ONNX);

    // Running in a browser-environment
    // TODO: Check if 1.16.1 fixes this issue.
    // SIMD for WebAssembly does not operate correctly in some recent versions of iOS (16.4.x).
    // As a temporary fix, we disable it for now.
    // For more information, see: https://github.com/microsoft/onnxruntime/issues/15644
    const isIOS = typeof navigator !== 'undefined' && /iP(hone|od|ad).+16_4.+AppleWebKit/.test(navigator.userAgent);
    if (isIOS) {
        ONNX.env.wasm.simd = false;
    }
}

/**
 * Create an ONNX inference session, with fallback support if an operation is not supported.
 * @param {Uint8Array} buffer 
 * @returns {Promise<Object>} The ONNX inference session.
 */
export async function createInferenceSession(buffer) {
    let executionProviders;
    let InferenceSession;
    if (USE_ONNXRUNTIME_NODE) {
        const ONNX_NODE = ONNX_MODULES.get('node');
        InferenceSession = ONNX_NODE.InferenceSession;
        executionProviders = ['cpu'];

    } else if (WEBGPU_AVAILABLE && env.experimental.useWebGPU) {
        // Only import the WebGPU version if the user enables the experimental flag.
        let ONNX_WEBGPU = ONNX_MODULES.get('webgpu');
        if (ONNX_WEBGPU === undefined) {
            ONNX_WEBGPU = await import('onnxruntime-web/webgpu');
            ONNX_MODULES.set('webgpu', ONNX_WEBGPU)
        }

        InferenceSession = ONNX_WEBGPU.InferenceSession;

        // If WebGPU is available and the user enables the experimental flag, try to use the WebGPU execution provider.
        executionProviders = ['webgpu', 'wasm'];

        Object.assign(ONNX_WEBGPU.env, env.backends.onnx);

    } else {
        const ONNX_WEB = ONNX_MODULES.get('web');
        InferenceSession = ONNX_WEB.InferenceSession;
        executionProviders = ['wasm'];
        env.backends.onnx = ONNX_MODULES.get('web').env
    }

    try {
        return await InferenceSession.create(buffer, {
            executionProviders,
        });
    } catch (err) {
        // If the execution provided was only wasm, throw the error
        if (executionProviders.length === 1 && executionProviders[0] === 'wasm') {
            throw err;
        }

        console.warn(err);
        console.warn(
            'Something went wrong during model construction (most likely a missing operation). ' +
            'Using `wasm` as a fallback. '
        )
        return await InferenceSession.create(buffer, {
            executionProviders: ['wasm']
        });
    }
}

/**
 * Check if an object is an ONNX tensor.
 * @param {any} x The object to check
 * @returns {boolean} Whether the object is an ONNX tensor.
 */
export function isONNXTensor(x) {
    for (const module of ONNX_MODULES.values()) {
        if (x instanceof module.Tensor) {
            return true;
        }
    }
    return false;
}

/**
 * Check if ONNX's WASM backend is being proxied.
 * @returns {boolean} Whether ONNX's WASM backend is being proxied.
 */
export function isONNXProxy() {
    // TODO: Update this when allowing non-WASM backends.
    return ONNX.env.wasm.proxy;
}

// Set path to wasm files. This is needed when running in a web worker.
// https://onnxruntime.ai/docs/api/js/interfaces/Env.WebAssemblyFlags.html#wasmPaths
// We use remote wasm files by default to make it easier for newer users.
// In practice, users should probably self-host the necessary .wasm files.
ONNX.env.wasm.wasmPaths = RUNNING_LOCALLY
    ? path.join(env.__dirname, '/dist/')
    : `https://cdn.jsdelivr.net/npm/@xenova/transformers@${env.version}/dist/`;

// Expose ONNX environment variables to `env.backends.onnx`
env.backends.onnx = ONNX.env;
