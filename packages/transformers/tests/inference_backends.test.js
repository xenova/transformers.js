import { jest } from "@jest/globals";

import { getModelId, getModelPipelineStep, isInferenceBackend, isOnnxSessionProvider, isSessionInferenceProvider, loadInferenceModel, normalizeInferenceModel, validateInferenceBackendTask, validateInferenceModelTask } from "../src/backends/inference.js";
import { BertModel } from "../src/transformers.js";
import { OnnxInferenceProvider } from "@huggingface/transformers-onnxruntime";
import { AutoModel } from "../src/models/auto/modeling_auto.js";
import { PreTrainedModel } from "../src/models/modeling_utils.js";
import { buildResourcePaths } from "../src/utils/hub.js";
import { loadInferenceBackendChatTemplate } from "../src/pipelines.js";
import { DefaultProgressCallback } from "../src/utils/core.js";
import { env } from "../src/env.js";

describe("inference backends", () => {
  it("recognizes object and class backends", () => {
    const objectBackend = { modelId: "test/object", load() {} };
    class ClassBackend {
      static modelId = "test/class";
      static load() {}
    }

    expect(isInferenceBackend(objectBackend)).toBe(true);
    expect(isInferenceBackend(ClassBackend)).toBe(true);
    expect(getModelId(objectBackend)).toBe("test/object");
    expect(getModelId(ClassBackend)).toBe("test/class");
    expect(getModelId("test/string")).toBe("test/string");
  });

  it("uses a versioned marker for runtime-neutral session providers", () => {
    const constructSessions = () => {};
    expect(isOnnxSessionProvider({ modelId: "test/custom", load() {}, constructSessions })).toBe(false);
    expect(isSessionInferenceProvider({ modelId: "test/custom", load() {}, constructSessions })).toBe(false);
    expect(isSessionInferenceProvider({ modelId: "test/custom", constructSessions, sessionProvider: { version: 1 } })).toBe(true);
    expect(isOnnxSessionProvider({ modelId: "test/onnx", load() {}, constructSessions, sessionProvider: { version: 1 }, providerType: "onnx" })).toBe(true);
  });

  it("normalizes a model with forward into a callable model", async () => {
    const implementation = {
      value: 42,
      async forward(inputs) {
        return { inputs, value: this.value };
      },
      async dispose() {},
    };
    const model = normalizeInferenceModel(implementation);

    await expect(model({ input_ids: "input" })).resolves.toEqual({
      inputs: { input_ids: "input" },
      value: 42,
    });
    expect(model.value).toBe(42);
  });

  it("passes shared loading options to a custom backend", async () => {
    const load = jest.fn(async () => ({
      async forward(inputs) {
        return inputs;
      },
      async dispose() {},
    }));
    const backend = { modelId: "test/model", load };
    const config = { model_type: "custom" };

    const model = await loadInferenceModel(backend, { config, dtype: "q4f16" });

    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        config,
        dtype: "q4f16",
        modelId: "test/model",
        fetch: env.fetch,
        getModelFile: expect.any(Function),
        getModelFileMetadata: expect.any(Function),
        deleteModelFile: expect.any(Function),
      }),
    );
    expect(model.config).toBe(config);
  });

  it("rejects malformed artifact providers before backend loading", async () => {
    const backend = { modelId: "test/model", load: jest.fn() };

    await expect(loadInferenceModel(backend, { artifactProvider: { readJson() {} } })).rejects.toThrow("must implement `readJson()` and `openByteSource()`");
    expect(backend.load).not.toHaveBeenCalled();
  });

  it("uses declared task and loaded execution capabilities for setup validation", async () => {
    const backend = {
      modelId: "test/model",
      capabilities: { devices: ["webgpu"], dtypes: ["auto"], tasks: ["text-generation"] },
      load() {},
    };
    expect(() => validateInferenceBackendTask(backend, "feature-extraction")).toThrow('does not support the "feature-extraction" task');
    expect(() => validateInferenceBackendTask(backend, "text-generation")).not.toThrow();
    expect(() =>
      validateInferenceModelTask(
        {
          capabilities: { forward: { version: 1 } },
          async forward() {},
          async dispose() {},
        },
        "text-generation",
      ),
    ).toThrow("does not support causal text generation");
  });

  it("normalizes absent custom device and dtype options", async () => {
    const backend = {
      modelId: "test/model",
      load: jest.fn(async () => ({
        async forward(inputs) {
          return inputs;
        },
        async dispose() {},
      })),
    };

    await loadInferenceModel(backend, { device: null, dtype: null });

    expect(backend.load).toHaveBeenCalledWith(expect.objectContaining({ modelId: "test/model", device: undefined, dtype: undefined }));
  });

  it("allows custom backends through AutoModel.from_pretrained", async () => {
    const loaded = {
      async forward(inputs) {
        return inputs;
      },
      async dispose() {},
    };
    const backend = {
      modelId: "test/model",
      sharedAssets: { revision: "backend-revision", subfolder: "shared" },
      load: jest.fn(async () => loaded),
      listModelArtifacts: jest.fn(() => ["model.bin"]),
      getModelArtifactMetadata: jest.fn(async () => ({ size: 10, fromCache: true })),
    };
    const signal = new AbortController().signal;
    const artifactProvider = { readJson() {}, openByteSource() {} };
    const progress_callback = jest.fn();

    const model = await AutoModel.from_pretrained(backend, {
      config: { model_type: "custom" },
      device: "webgpu",
      signal,
      artifactProvider,
      progress_callback,
      revision: "load-revision",
    });

    expect(backend.getModelArtifactMetadata).toHaveBeenCalledWith("model.bin", expect.objectContaining({ signal }));
    expect(backend.listModelArtifacts).toHaveBeenCalledWith(expect.objectContaining({ fetch: env.fetch, revision: "backend-revision", subfolder: "shared" }));
    expect(backend.getModelArtifactMetadata).toHaveBeenCalledWith("model.bin", expect.objectContaining({ fetch: env.fetch }));
    expect(backend.load).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: "test/model",
        device: "webgpu",
        signal,
        artifactProvider,
        artifactMetadata: { "model.bin": { size: 10, fromCache: true } },
        progress_callback: expect.any(DefaultProgressCallback),
        fetch: env.fetch,
        revision: "backend-revision",
        subfolder: "shared",
      }),
    );
    await expect(model({ value: 1 })).resolves.toEqual({ value: 1 });
  });

  it("does not treat constructSessions as a custom-backend discriminator", async () => {
    const loaded = {
      async forward(inputs) {
        return inputs;
      },
      async dispose() {},
    };
    const backend = {
      modelId: "test/model",
      constructSessions: jest.fn(),
      load: jest.fn(async () => loaded),
    };

    const model = await AutoModel.from_pretrained(backend, { config: { model_type: "custom" } });

    expect(backend.load).toHaveBeenCalledWith(expect.objectContaining({ modelId: "test/model" }));
    expect(backend.constructSessions).not.toHaveBeenCalled();
    await expect(model({ value: 1 })).resolves.toEqual({ value: 1 });
  });

  it("passes model classes to runtime-neutral session providers", async () => {
    class TestModel extends PreTrainedModel {}
    const provider = {
      modelId: "test/session-provider",
      sessionProvider: { version: 1 },
      constructSessions: jest.fn(),
    };
    TestModel._from_pretrained = jest.fn(async () => "loaded");

    await expect(TestModel.from_pretrained(provider)).resolves.toBe("loaded");

    expect(TestModel._from_pretrained).toHaveBeenCalledWith("test/session-provider", expect.objectContaining({ inferenceProvider: provider, getModelFile: expect.any(Function) }));
  });

  it("uses built-in session roles when a session provider omits getSessionConfig", async () => {
    const session = { inputNames: ["input_ids"], outputNames: ["last_hidden_state"], run: jest.fn(), release: jest.fn() };
    const provider = {
      modelId: "test/session-provider",
      sessionProvider: { version: 1 },
      constructSessions: jest.fn(async () => ({ model: session })),
    };

    const model = await BertModel.from_pretrained(provider, { config: { model_type: "bert" } });

    expect(provider.constructSessions).toHaveBeenCalledWith({ model: "model" }, expect.objectContaining({ inferenceProvider: provider }), undefined);
    expect(model.sessions.model).toBe(session);
  });

  it("lets session providers override or reject session roles", async () => {
    const constructSessions = jest.fn(async () => ({ model: { inputNames: [], outputNames: [], run: jest.fn(), release: jest.fn() } }));
    const provider = {
      modelId: "test/session-provider",
      sessionProvider: { version: 1 },
      constructSessions,
      getSessionConfig: jest.fn(() => ({ sessions: { model: "custom_model" } })),
    };

    await BertModel.from_pretrained(provider, { config: { model_type: "bert" } });
    expect(provider.getSessionConfig).toHaveBeenCalledWith("EncoderOnly", expect.anything(), expect.objectContaining({ textOnly: false }));
    expect(constructSessions).toHaveBeenCalledWith({ model: "custom_model" }, expect.anything(), undefined);

    provider.getSessionConfig = () => null;
    await expect(BertModel.from_pretrained(provider, { config: { model_type: "bert" } })).rejects.toThrow("does not define session artifacts");
  });

  it("accepts models that only implement generate()", () => {
    const generate = jest.fn();
    const model = normalizeInferenceModel({ generate, dispose() {} });
    expect(model.generate).toBe(generate);
    expect(() => model({})).toThrow("does not implement `forward(inputs)`");
    expect(() => normalizeInferenceModel({ dispose() {} })).toThrow("implement `generate(options)`");
  });

  it("validates model-owned pipeline step declarations", () => {
    const forward = async () => ({});
    const dispose = () => {};
    expect(() => normalizeInferenceModel({ forward, dispose, capabilities: { pipelineSteps: { version: 2 } } })).toThrow("version: 1");
    expect(() => normalizeInferenceModel({ forward, dispose, capabilities: { pipelineSteps: { version: 1, preprocess: ["image-classification"] } } })).toThrow("must implement `preprocess(task, ...)`");
    expect(() => normalizeInferenceModel({ forward, dispose, preprocess() {}, capabilities: { pipelineSteps: { version: 1, preprocess: ["audio-classification"] } } })).toThrow("unsupported task(s): audio-classification");
    expect(() => normalizeInferenceModel({ forward, dispose, postprocess() {}, capabilities: { pipelineSteps: { version: 1, postprocess: ["image-classification"] } } })).toThrow("unsupported task(s)");
    expect(() => normalizeInferenceModel({ forward, dispose, preprocess() {}, capabilities: { pipelineSteps: { version: 1, preprocess: ["image-classification"] } } })).not.toThrow();
  });

  it("resolves model-owned pipeline steps per task", async () => {
    const preprocess = jest.fn(async (task, images) => ({ task, images }));
    const model = { preprocess, capabilities: { pipelineSteps: { version: 1, preprocess: ["image-classification"] } } };

    await expect(getModelPipelineStep(model, "preprocess", "image-classification")(["image"])).resolves.toEqual({ task: "image-classification", images: ["image"] });
    expect(getModelPipelineStep(model, "preprocess", "object-detection")).toBeNull();
    expect(getModelPipelineStep(model, "postprocess", "image-classification")).toBeNull();
    expect(getModelPipelineStep({}, "preprocess", "image-classification")).toBeNull();
  });

  it("represents string IDs with the ONNX fallback backend", async () => {
    const modelClass = { _from_pretrained: jest.fn(async () => "model") };
    const backend = OnnxInferenceProvider.from_modelId("test/model");
    expect(backend.modelId).toBe("test/model");
    expect(isInferenceBackend(backend)).toBe(true);
    await expect(backend.load({ dtype: "q4", modelClass })).resolves.toBe("model");
    expect(modelClass._from_pretrained).toHaveBeenCalledWith("test/model", expect.objectContaining({ dtype: "q4", inferenceProvider: backend }));
  });

  it("resolves string model IDs through OnnxInferenceProvider.from_modelId", async () => {
    class TestModel extends PreTrainedModel {}
    TestModel._from_pretrained = jest.fn(async () => "loaded-model");
    const factory = jest.spyOn(OnnxInferenceProvider, "from_modelId");

    await expect(TestModel.from_pretrained("test/string-model")).resolves.toBe("loaded-model");

    expect(factory).toHaveBeenCalledWith("test/string-model");
    expect(TestModel._from_pretrained).toHaveBeenCalledWith("test/string-model", expect.objectContaining({ inferenceProvider: expect.any(OnnxInferenceProvider) }));
    factory.mockRestore();
  });

  it("uses backend model IDs for shared asset paths", () => {
    const backend = { modelId: "test/model", load() {} };
    const paths = buildResourcePaths(backend, "tokenizer.json");

    expect(paths.requestURL).toBe("test/model/tokenizer.json");
    expect(paths.remoteURL).toContain("/test/model/resolve/main/tokenizer.json");

    const nested = buildResourcePaths(backend, "onnx/model.onnx", {
      revision: "v2",
      subfolder: "export",
    });
    expect(nested.requestURL).toBe("test/model/export/onnx/model.onnx");
    expect(nested.remoteURL).toContain("/test/model/resolve/v2/export/onnx/model.onnx");
  });

  it("resolves and validates inline backend chat templates", async () => {
    await expect(loadInferenceBackendChatTemplate({ modelId: "test/model", load() {}, chatTemplate: { content: "{{ messages }}" } }, {})).resolves.toBe("{{ messages }}");
    expect(loadInferenceBackendChatTemplate({ modelId: "test/model", load() {} }, {})).toBeNull();
    expect(() => loadInferenceBackendChatTemplate({ modelId: "test/model", load() {}, chatTemplate: { content: "inline", file: "chat.jinja" } }, {})).toThrow("cannot be combined");
  });
});
