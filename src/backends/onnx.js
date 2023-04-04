let ONNX;

// TODO support more execution providers (e.g., webgpu)
const executionProviders = ['wasm'];

if (typeof process !== 'undefined') {
    // Running in a node-like environment.
    // Try to import onnxruntime-node, using onnxruntime-web as a fallback
    try {
        ONNX = require('onnxruntime-node');
    } catch (err) {
        console.warn(
            "Node.js environment detected, but `onnxruntime-node` was not found. " +
            "Using `onnxruntime-web` as a fallback. We recommend installing `onnxruntime-node` " +
            "as it generally improves performance (up to 5X)."
        )

        // Fix "ReferenceError: self is not defined" bug when running directly with node
        // https://github.com/microsoft/onnxruntime/issues/13072
        // @ts-ignore
        global.self = global;

        ONNX = require('onnxruntime-web');

        // Disable spawning worker threads for testing.
        // This is done by setting numThreads to 1
        // https://github.com/microsoft/onnxruntime/issues/10311
        ONNX.env.wasm.numThreads = 1;
    }

    // Add `cpu` execution provider, with higher precedence that `wasm`.
    executionProviders.unshift('cpu');

} else {
    // Running in a browser-environment, so we just import `onnxruntime-web`
    ONNX = require('onnxruntime-web');
}

module.exports = {
    ONNX,
    executionProviders,
}
