// Full-suite setup for constrained local hosts. No model logic is mocked.
import { env } from "../../packages/transformers/src/env.js";
import { onnxruntimeBackend } from "../../packages/transformers/node_modules/onnxruntime-node/dist/backend.js";
env.allowRemoteModels = false;
const create = onnxruntimeBackend.createInferenceSessionHandler;
onnxruntimeBackend.createInferenceSessionHandler = function (path, options) {
  return create.call(this, path, { ...options, intraOpNumThreads: 1, interOpNumThreads: 1 });
};
