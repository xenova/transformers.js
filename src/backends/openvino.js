import { Tensor } from '../utils/tensor.js';
import { getModelFile } from '../utils/hub.js';
import * as OpenVINONode from 'openvinojs-node';

const { addon: ov } = OpenVINONode;

export default { create: getWrappedOVModelByPath };

async function getWrappedOVModelByPath(modelDir, filename, options) {
  const filenames = Array.isArray(filename) ? filename : [filename];
  const modelFiles = [];

  for (const filename of filenames) {
      const file = await getModelFile(modelDir, filename, true, options);

      modelFiles.push(file);
  }

  const core = new ov.Core();
  const model = await core.readModel(...modelFiles);
  const inputNames = model.inputs.map(i => i.toString());
  const keyValueInputNames = inputNames.filter(i => i.includes('key_values'));
  const compiledModel = await core.compileModel(model, 'CPU');

  return {
      run: async (inputData) => {
          const inputKeys = Object.keys(inputData);

          const ir = compiledModel.createInferRequest();
          const tensorsDict = {
              'input_ids': convertToOVTensor(inputData['input_ids']),
              'attention_mask': convertToOVTensor(inputData['attention_mask']),
          };

          if (inputKeys.find(i => i.includes('key_values'))) {
              keyValueInputNames.forEach(name => {
                  const { type, dims, data } = inputData[name];

                  tensorsDict[name] = data.length
                      ? convertToOVTensor(inputData[name])
                      : new ov.Tensor(precisionToOV(type), dims);
              });
          }
          else {
              // FIXME: here uses dims from transformers.js Tensor
              const shapeInputIds = inputData['input_ids'].dims;

              keyValueInputNames.forEach(name => {
                  const shape = compiledModel.input(name).getPartialShape();

                  shape[0] =
                      // FIXME: multiply on num_attention_heads number from config
                      shapeInputIds[0] * 1;

                  if (shape[1] === -1) shape[1] = 0;
                  if (shape[2] === -1) shape[2] = 0;

                  // FIXME: replace hardcoded precision (expose input layer precision from bindings)
                  tensorsDict[name] = new ov.Tensor(ov.element.f32, shape);
              });
          }

          const result = await ir.inferAsync(tensorsDict);
          const modifiedOutput = {};

          Object.keys(result).forEach(name => {
              const ovTensor = result[name];
              const type = parseOVPrecision(ovTensor.getElementType());
              const shape = ovTensor.getShape();

              modifiedOutput[name] = new Tensor(type, ovTensor.data, shape);
          });

          return modifiedOutput;
      },
      inputNames,
  };

  function convertToOVTensor(inputTensor) {
      const { dims, type, data } = inputTensor;

      return new ov.Tensor(precisionToOV(type), dims, data);
  }

  function precisionToOV(str) {
      switch(str) {
          case 'int64':
              return ov.element.i64;
          case 'float32':
              return ov.element.f32;
          default:
              throw new Error(`Undefined precision: ${str}`);
      }
  }

  function parseOVPrecision(elementType) {
      switch(elementType) {
          case ov.element.i64:
              return 'int64';
          case ov.element.f32:
              return 'float32';
          default:
              throw new Error(`Undefined precision: ${elementType}`);
      }
  }
}
