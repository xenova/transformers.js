import {
  AutoModelForSeq2SeqLM,
  AutoModelForCausalLM,
  AutoTokenizer,
  PreTrainedModel,
  Tensor,
  DynamicCache,
  env,
  random,
} from "../../packages/transformers/src/transformers.js";
import { getTensorConstructor } from "../../packages/transformers/src/backends/onnx.js";
import { index_select_async, index_select } from "../../packages/transformers/src/utils/tensor.js";

env.backends.onnx.wasm.wasmPaths = "/ort/";
env.backends.onnx.wasm.numThreads = 1;
env.allowLocalModels = false;
env.remoteHost = location.origin + "/hf/";
const emit = (value) => console.log("RESULT " + JSON.stringify(value, (_, x) => (typeof x === "bigint" ? x.toString() : x)));
const equal = (a, b) =>
  JSON.stringify(a, (_, x) => (typeof x === "bigint" ? x.toString() : x)) === JSON.stringify(b, (_, x) => (typeof x === "bigint" ? x.toString() : x));
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

window.runBeamGPU = async (options) => {
  const adapter = await navigator.gpu?.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("No WebGPU adapter");
  const info = adapter.info;
  const hardware = {
    vendor: info.vendor,
    architecture: info.architecture,
    device: info.device,
    description: info.description,
    isFallbackAdapter: info.isFallbackAdapter,
  };
  emit({ type: "adapter", ...hardware, userAgent: navigator.userAgent });
  if (info.isFallbackAdapter || /swiftshader|llvmpipe|software/i.test(hardware.description)) throw new Error("Software GPU rejected");
  env.backends.onnx.webgpu.adapter = adapter;
  if (options.mode === "probe") return { hardware };
  const device = await adapter.requestDevice({
    requiredFeatures: adapter.features.has("shader-f16") ? ["shader-f16"] : [],
    requiredLimits: { maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize, maxBufferSize: adapter.limits.maxBufferSize },
  });
  env.backends.onnx.webgpu.device = device;
  const liveBuffers = new Set();
  let peakOwnedBuffers = 0;
  const createBuffer = device.createBuffer.bind(device);
  device.createBuffer = (descriptor) => {
    const buffer = createBuffer(descriptor);
    if (descriptor.label?.startsWith("transformers-beam-")) {
      liveBuffers.add(buffer);
      peakOwnedBuffers = Math.max(peakOwnedBuffers, liveBuffers.size);
      const destroy = buffer.destroy.bind(buffer);
      buffer.destroy = () => {
        liveBuffers.delete(buffer);
        destroy();
      };
    }
    return buffer;
  };
  const errors = [];
  device.addEventListener("uncapturederror", (event) => {
    errors.push(event.error.message);
    console.error(event.error.message);
  });
  device.lost.then((value) => {
    console.error("DEVICE_LOST", value.reason, value.message);
  });

  if (options.mode === "validate") {
    const cases = [
      ["float32", Float32Array, [3, 4]],
      ["float16", Uint16Array, [3, 4]],
      ["float16", Uint16Array, [3, 3]],
      ["int64", BigInt64Array, [3, 2]],
      ["uint8", Uint8Array, [3, 4]],
      ["bool", Uint8Array, [3, 4]],
    ];
    const results = [];
    for (const [type, ArrayType, dims] of cases) {
      const count = dims.reduce((a, b) => a * b, 1);
      const data = ArrayType.from({ length: count }, (_, i) => (type === "int64" ? BigInt(i + 1) : type === "bool" ? i % 2 : i + 1));
      const size = Math.ceil(data.byteLength / 4) * 4;
      const input = device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
      const padded = new Uint8Array(size);
      padded.set(new Uint8Array(data.buffer));
      device.queue.writeBuffer(input, 0, padded);
      let downloads = 0;
      const original = new Tensor(
        getTensorConstructor().fromGpuBuffer(input, {
          dataType: type,
          dims,
          download: async () => {
            ++downloads;
            const staging = device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
            const encoder = device.createCommandEncoder();
            encoder.copyBufferToBuffer(input, 0, staging, 0, size);
            device.queue.submit([encoder.finish()]);
            await staging.mapAsync(GPUMapMode.READ);
            const result = new ArrayType(staging.getMappedRange().slice(0, data.byteLength));
            staging.destroy();
            return result;
          },
        }),
      );
      const selected = await index_select_async(original, [2, 0, 2]);
      const selectedLocation = selected.location;
      const aligned = (dims[1] * ArrayType.BYTES_PER_ELEMENT) % 4 === 0;
      if (selectedLocation !== (aligned ? "gpu-buffer" : "cpu")) throw new Error("Unexpected row selection location");
      if (aligned && (downloads !== 0 || original.location !== "gpu-buffer")) throw new Error("GPU selection downloaded the source");
      const chained = await index_select_async(selected, [1, 0]);
      const actual = await chained.ort_tensor.getData();
      const expected = [...data.slice(0, dims[1]), ...data.slice(2 * dims[1], 3 * dims[1])];
      const actualValues = type === "float16" ? new Uint16Array(actual.buffer, actual.byteOffset, actual.byteLength / 2) : actual;
      if (!equal([...actualValues], expected)) throw new Error("Typed/chained GPU selection mismatch: " + type);
      chained.dispose();
      selected.dispose();
      // Source buffers must still be usable after disposing selected tensors.
      const remaining = await original.ort_tensor.getData();
      if (!equal([...remaining], [...data])) throw new Error("Source ownership violated");
      original.dispose();
      input.destroy();
      if (liveBuffers.size) throw new Error("GPU row buffers were not released");
      const result = { type: "validation", dtype: type, dims, selectedLocation, chainedAndSourceOwnership: true };
      results.push(result);
      emit(result);
    }
    await device.queue.onSubmittedWorkDone();
    if (errors.length) throw new Error(errors.join("\n"));
    return { hardware, results, errors };
  }

  if (options.mode === "micro") {
    const results = [];
    for (const dims of [
      [4, 8, 128, 64],
      [4, 8, 1024, 64],
      [8, 16, 2048, 64],
    ]) {
      const elements = dims.reduce((a, b) => a * b, 1);
      const data = Float32Array.from({ length: elements }, (_, i) => i % 997);
      const input = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
      device.queue.writeBuffer(input, 0, data);
      const indices = Array.from({ length: dims[0] }, (_, i) => (i * 3 + 1) % dims[0]);
      const source = () =>
        new Tensor(
          getTensorConstructor().fromGpuBuffer(input, {
            dataType: "float32",
            dims,
            download: async () => {
              const staging = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
              const encoder = device.createCommandEncoder();
              encoder.copyBufferToBuffer(input, 0, staging, 0, data.byteLength);
              device.queue.submit([encoder.finish()]);
              await staging.mapAsync(GPUMapMode.READ);
              const copy = new Float32Array(staging.getMappedRange().slice(0));
              staging.unmap();
              staging.destroy();
              return copy;
            },
          }),
        );
      const durations = [];
      let outputLocation;
      for (let repeat = 0; repeat < 12; ++repeat) {
        const tensor = source();
        await device.queue.onSubmittedWorkDone();
        const start = performance.now();
        const output = await index_select_async(tensor, indices);
        await device.queue.onSubmittedWorkDone();
        const elapsed = performance.now() - start;
        outputLocation = output.location;
        if (repeat >= 2) durations.push(elapsed);
        if (repeat === 0) {
          const actual = await output.ort_tensor.getData();
          const rowSize = elements / dims[0];
          for (let row = 0; row < dims[0]; ++row) {
            for (let i = 0; i < rowSize; ++i) {
              if (actual[row * rowSize + i] !== data[indices[row] * rowSize + i]) throw new Error("Row selection mismatch");
            }
          }
        }
        output.dispose();
        tensor.dispose();
      }
      input.destroy();
      const result = { type: "micro", dims, bytes: data.byteLength, medianMs: median(durations), samplesMs: durations, outputLocation };
      results.push(result);
      emit(result);
    }
    if (errors.length) throw new Error(errors.join("\n"));
    return { hardware, results, errors };
  }

  const models = options.models ?? ["hf-internal-testing/tiny-random-T5ForConditionalGeneration", "hf-internal-testing/tiny-random-LlamaForCausalLM"];
  const results = [];
  for (const modelId of models) {
    const Model = /T5/.test(modelId) ? AutoModelForSeq2SeqLM : AutoModelForCausalLM;
    const model = await Model.from_pretrained(modelId, { device: options.device ?? "webgpu", dtype: options.dtype ?? "fp32" });
    const tokenizer = await AutoTokenizer.from_pretrained(modelId);
    tokenizer.padding_side = "left";
    let cacheStats = [];
    const reorder = options.cpuRowSelection
      ? async (cache, indices) => {
          const entries = {};
          for (const [key, tensor] of Object.entries(cache)) {
            if (key.includes("encoder")) {
              entries[key] = tensor;
              continue;
            }
            const location = tensor.location;
            await tensor.ort_tensor.getData(false);
            entries[key] = index_select(tensor, model._get_cache_indices(key, indices));
            if (location === "gpu-buffer") tensor.dispose();
          }
          return new DynamicCache(entries);
        }
      : model._reorder_cache.bind(model);
    model._reorder_cache = async (cache, indices) => {
      const before = Object.values(cache).map((t) => ({ location: t.location, size: t.size }));
      const start = performance.now();
      const result = await reorder(cache, indices);
      cacheStats.push({ ms: performance.now() - start, before, after: Object.values(result).map((t) => t.location) });
      return result;
    };
    const configs = [
      { name: "standard", num_beams: 4, num_return_sequences: 2 },
      { name: "diverse", num_beams: 4, num_beam_groups: 2, diversity_penalty: 0.5, num_return_sequences: 2 },
      { name: "sampling", num_beams: 4, num_return_sequences: 2, do_sample: true, top_k: 10 },
      { name: "batched", num_beams: 4, num_return_sequences: 2 },
    ];
    for (const { name, ...config } of configs.filter((config) => !options.modes || options.modes.includes(config.name))) {
      const texts = name === "batched" ? ["hello", "a longer input"] : ["hello"];
      const inputs = tokenizer(texts, { padding: true });
      const durations = [];
      let expected;
      for (let repeat = 0; repeat < (options.repeats ?? 4); ++repeat) {
        random.seed(42);
        cacheStats = [];
        const start = performance.now();
        const output = await model.generate({ ...inputs, ...config, max_new_tokens: options.tokens ?? 16, eos_token_id: null, return_dict_in_generate: true });
        const elapsed = performance.now() - start;
        if (liveBuffers.size) throw new Error("GPU row buffers leaked after generation");
        const tokens = output.sequences.tolist();
        if (output.past_key_values !== null) throw new Error("Unexpected beam cache output");
        if (expected && !equal(tokens, expected)) throw new Error("Repeated generation changed output: " + name);
        expected = tokens;
        if (repeat > 0) durations.push(elapsed);
      }
      if (name === "batched") {
        for (let i = 0; i < texts.length; ++i) {
          const single = await model.generate({ ...tokenizer(texts[i]), ...config, max_new_tokens: options.tokens ?? 16, eos_token_id: null });
          const tail = (rows) => rows.map((row) => row.slice(-(options.tokens ?? 16)));
          if (!equal(tail(expected.slice(i * 2, i * 2 + 2)), tail(single.tolist()))) throw new Error("Batch independence failed");
        }
      }
      const result = {
        type: "generation",
        modelId,
        name,
        device: options.device ?? "webgpu",
        medianMs: median(durations),
        samplesMs: durations,
        tokens: expected,
        cacheStats,
      };
      results.push(result);
      emit({ ...result, tokens: undefined, cacheStats: undefined });
    }
    await model.dispose();
  }
  await device.queue.onSubmittedWorkDone();
  if (errors.length) throw new Error(errors.join("\n"));
  return { hardware, results, errors, peakOwnedBuffers, remainingOwnedBuffers: liveBuffers.size };
};
