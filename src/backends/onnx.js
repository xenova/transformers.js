// Handler file for choosing the correct version of ONNX Runtime, based on the environment.
// 
// Ideally, we could import the `onnxruntime-web` and `onnxruntime-node` packages only when needed,
// but dynamic imports don't seem to work with the current webpack version and/or configuration.
// This is possibly due to the experimental nature of top-level await statements.
// 
// So, we just import both packages, and use the appropriate one based on the environment.
//  - When running in node, we use `onnxruntime-node`.
//  - When running in the browser, we use `onnxruntime-web` (`onnxruntime-node` is not bundled).


// NOTE: Import order matters here. We need to import `onnxruntime-node` before `onnxruntime-web`.
import ONNX_NODE from 'onnxruntime-node';
import ONNX_WEB from 'onnxruntime-web';

export let ONNX;

export const executionProviders = ['wasm'];

if (typeof process !== 'undefined') {
    // Running in a node-like environment.
    ONNX = ONNX_NODE;

    // Add `cpu` execution provider, with higher precedence that `wasm`.
    executionProviders.unshift('cpu');

} else {
    // Running in a browser-environment
    ONNX = ONNX_WEB;
}
