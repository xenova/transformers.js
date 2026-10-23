import { jest } from "@jest/globals";

import { ObjectDetectionPipeline } from "../src/pipelines/object-detection.js";
import { ImageClassificationPipeline } from "../src/pipelines/image-classification.js";
import { RawImage } from "../src/utils/image.js";
import { Tensor } from "../src/utils/tensor.js";

describe("object detection backend postprocessing (deprecated objectDetection alias)", () => {
  it("prefers model-owned postprocessing when provided", async () => {
    const image = new RawImage(new Uint8ClampedArray(2 * 3 * 3), 2, 3, 3);
    const processorFallback = jest.fn();
    const processor = Object.assign(
      jest.fn(async () => ({ pixel_values: new Tensor("float32", new Float32Array(12), [1, 3, 2, 2]) })),
      { image_processor: { post_process_object_detection: processorFallback } },
    );
    const postProcessObjectDetection = jest.fn(async (_output, threshold, imageSizes) => [{ boxes: [[0, 0, 2, 3]], scores: [0.75], classes: [1] }]);
    const model = Object.assign(
      jest.fn(async () => ({ predictions: new Tensor("float32", [0], [1]) })),
      {
        config: { id2label: { 1: "object" } },
        capabilities: { objectDetection: { version: 1, postprocess: "model" } },
        postProcessObjectDetection,
      },
    );
    const pipeline = new ObjectDetectionPipeline({ task: "object-detection", model, processor });

    await expect(pipeline._call(image, { threshold: 0.5 })).resolves.toEqual([{ score: 0.75, label: "object", box: { xmin: 0, ymin: 0, xmax: 2, ymax: 3 } }]);
    expect(processor).toHaveBeenCalledWith([image]);
    expect(postProcessObjectDetection).toHaveBeenCalledWith(expect.any(Object), 0.5, [[3, 2]]);
    expect(processorFallback).not.toHaveBeenCalled();
  });

  it("uses model-owned preprocessing when declared", async () => {
    const image = new RawImage(new Uint8ClampedArray(2 * 3 * 3), 2, 3, 3);
    const processor = jest.fn();
    const modelInputs = { pixel_values: new Tensor("float32", new Float32Array(12), [1, 3, 2, 2]) };
    const preprocessObjectDetection = jest.fn(async () => modelInputs);
    const model = Object.assign(
      jest.fn(async () => ({ predictions: new Tensor("float32", [0], [1]) })),
      {
        config: { id2label: { 0: "object" } },
        capabilities: { objectDetection: { version: 1, preprocess: "model", postprocess: "model" } },
        preprocessObjectDetection,
        postProcessObjectDetection: async () => [{ boxes: [], scores: [], classes: [] }],
      },
    );
    const pipeline = new ObjectDetectionPipeline({ task: "object-detection", model, processor });

    await pipeline._call(image);

    expect(preprocessObjectDetection).toHaveBeenCalledWith([image]);
    expect(model).toHaveBeenCalledWith(modelInputs);
    expect(processor).not.toHaveBeenCalled();
  });
});

describe("model-owned pipeline steps", () => {
  const image = () => new RawImage(new Uint8ClampedArray(2 * 3 * 3), 2, 3, 3);

  it("runs object-detection preprocessing and postprocessing on the model", async () => {
    const input = image();
    const processor = Object.assign(jest.fn(), { image_processor: { post_process_object_detection: jest.fn() } });
    const modelInputs = { pixel_values: new Tensor("float32", new Float32Array(12), [1, 3, 2, 2]) };
    const outputs = { predictions: new Tensor("float32", [0], [1]) };
    const preprocess = jest.fn(async () => modelInputs);
    const postprocess = jest.fn(async () => [{ boxes: [[0, 0, 2, 3]], scores: [0.75], classes: [1] }]);
    const model = Object.assign(
      jest.fn(async () => outputs),
      {
        config: { id2label: { 1: "object" } },
        capabilities: { pipelineSteps: { version: 1, preprocess: ["object-detection"], postprocess: ["object-detection"] } },
        preprocess,
        postprocess,
      },
    );
    const pipeline = new ObjectDetectionPipeline({ task: "object-detection", model, processor });

    await expect(pipeline._call(input, { threshold: 0.5 })).resolves.toEqual([{ score: 0.75, label: "object", box: { xmin: 0, ymin: 0, xmax: 2, ymax: 3 } }]);
    expect(preprocess).toHaveBeenCalledWith("object-detection", [input]);
    expect(model).toHaveBeenCalledWith(modelInputs);
    expect(postprocess).toHaveBeenCalledWith("object-detection", outputs, { threshold: 0.5, targetSizes: [[3, 2]] });
    expect(processor).not.toHaveBeenCalled();
    expect(processor.image_processor.post_process_object_detection).not.toHaveBeenCalled();
  });

  it("runs image-classification preprocessing on the model", async () => {
    const input = image();
    const processor = jest.fn();
    const modelInputs = { pixel_values: new Tensor("float32", new Float32Array(12), [1, 3, 2, 2]) };
    const preprocess = jest.fn(async () => modelInputs);
    const model = Object.assign(
      jest.fn(async () => ({ logits: new Tensor("float32", new Float32Array([0, 2, 1]), [1, 3]) })),
      {
        config: { id2label: { 0: "a", 1: "b", 2: "c" } },
        capabilities: { pipelineSteps: { version: 1, preprocess: ["image-classification"] } },
        preprocess,
      },
    );
    const pipeline = new ImageClassificationPipeline({ task: "image-classification", model, processor });

    const output = await pipeline._call(input, { top_k: 2 });

    expect(output.map((x) => x.label)).toEqual(["b", "c"]);
    expect(preprocess).toHaveBeenCalledWith("image-classification", [input]);
    expect(model).toHaveBeenCalledWith(modelInputs);
    expect(processor).not.toHaveBeenCalled();
  });

  it("uses the processor when the model does not own image-classification preprocessing", async () => {
    const pixel_values = new Tensor("float32", new Float32Array(12), [1, 3, 2, 2]);
    const processor = jest.fn(async () => ({ pixel_values, original_sizes: [[3, 2]] }));
    const model = Object.assign(
      jest.fn(async () => ({ logits: new Tensor("float32", new Float32Array([0, 2, 1]), [1, 3]) })),
      {
        config: { id2label: { 0: "a", 1: "b", 2: "c" } },
        capabilities: { pipelineSteps: { version: 1, preprocess: ["object-detection"] } },
        preprocess: jest.fn(),
      },
    );
    const pipeline = new ImageClassificationPipeline({ task: "image-classification", model, processor });

    await pipeline._call(image(), { top_k: 1 });

    expect(model).toHaveBeenCalledWith({ pixel_values });
    expect(model.preprocess).not.toHaveBeenCalled();
  });
});
