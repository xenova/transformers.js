import { customTypes } from '@runtime-type-inspector/runtime';
import { ONNX } from './backends/onnx.js';
/**
 * @param {*} value 
 * @returns {boolean}
 */
customTypes.ONNXTensor = value => {
  return value instanceof ONNX.Tensor;
}
export * from './transformers.js';
