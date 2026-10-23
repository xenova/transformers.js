import * as onnxProviderModule from '@huggingface/transformers-onnxruntime';

import { env, apis } from '../env.js';
import { logger } from '../utils/logger.js';
import { getModelFile, MAX_EXTERNAL_DATA_CHUNKS } from '../utils/hub.js';
import { getCacheNames } from '../configs.js';
import { Tensor } from '../utils/tensor.js';
import { TensorOpRegistry } from '../ops/registry.js';
import { getCache } from '../utils/cache.js';

const ONNX_HOST_SYMBOL = Symbol.for('transformers.js.onnxProviderHost');
const host = {
    env,
    apis,
    logger,
    getModelFile,
    getCacheNames,
    createBackendTensor: (storage) => Tensor.fromBackendStorage(storage),
    getBackendTensorStorage: (tensor) => tensor?.getBackendStorage?.() ?? null,
    getCache,
    maxExternalDataChunks: MAX_EXTERNAL_DATA_CHUNKS,
};

globalThis[ONNX_HOST_SYMBOL] = host;
onnxProviderModule.configureOnnxProviderHost(host);
TensorOpRegistry.register(onnxProviderModule.OnnxTensorOpRegistry);

const modulePromise = Promise.resolve(onnxProviderModule);

export function getOnnxProviderModule() {
    return modulePromise;
}

export async function getDefaultInferenceProvider(modelId) {
    const { OnnxInferenceProvider } = await getOnnxProviderModule();
    return OnnxInferenceProvider.from_modelId(modelId);
}

/**
 * Built-in session roles and base file names for a model architecture. Session providers that do
 * not define `getSessionConfig()` receive these from `constructSessions()`.
 *
 * @param {string} modelType
 * @param {Object} config
 * @param {Object} [options]
 */
export function getDefaultSessionConfig(modelType, config, options = {}) {
    return onnxProviderModule.getSessionsConfig(modelType, config, options);
}
