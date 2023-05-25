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

// NOTE: Import order matters here. We need to import `onnxruntime-node` before `onnxruntime-web`.
import * as ONNX_COMMON from 'onnxruntime-common';

export const ONNX = ONNX_COMMON?.default ?? ONNX_COMMON;

export const executionProviders = [
    // 'webgpu',
    'wasm'
];

if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    // Running in a react native environment.
    import('onnxruntime-react-native');
    executionProviders.unshift('cpu');

} else if (typeof process !== 'undefined' && process?.release?.name === 'node') {
    // Running in a node-like environment.
    import('onnxruntime-node');
    import('onnxruntime-web');

    // Add `cpu` execution provider, with higher precedence that `wasm`.
    executionProviders.unshift('cpu');
} else {
    // Running in a browser-environment
    import('onnxruntime-web');

    // SIMD for WebAssembly does not operate correctly in recent versions of iOS (>= 16.4).
    // As a temporary fix, we disable it for now.
    // For more information, see: https://github.com/microsoft/onnxruntime/issues/15644
    const isIOS = typeof navigator !== 'undefined' && /iP(hone|od|ad)/.test(navigator.userAgent);
    if (isIOS) {
        ONNX_COMMON.env.wasm.simd = false;
    }
}
