import {
  LlavaForConditionalGeneration,
  LlavaProcessor,
  Idefics3ForConditionalGeneration,
  Idefics3Processor,
  SmolVLMForConditionalGeneration,
  SmolVLMProcessor,
  Qwen2VLForConditionalGeneration,
  Qwen2VLProcessor,
  UltravoxModel,
  UltravoxProcessor,
  RawImage,
  Tensor,
  cat,
  random,
} from "../../packages/transformers/src/transformers.js";

export const fixtures = {
  llava: {
    Model: LlavaForConditionalGeneration,
    Processor: LlavaProcessor,
    id: "Xenova/tiny-random-LlavaForConditionalGeneration",
    revision: "a61a79a541cec4898722bdfb5b016984c29fb061",
  },
  idefics3: {
    Model: Idefics3ForConditionalGeneration,
    Processor: Idefics3Processor,
    id: "hf-internal-testing/tiny-random-Idefics3ForConditionalGeneration",
    revision: "5c0505e5c04d9e87b7cdb599076e6cf0cedf707d",
  },
  qwen2_vl: {
    Model: Qwen2VLForConditionalGeneration,
    Processor: Qwen2VLProcessor,
    id: "hf-internal-testing/tiny-random-Qwen2VLForConditionalGeneration",
    revision: "2e2ed20b74bd5157aafd082b00e87fe25b2231a6",
  },
  smolvlm: {
    Model: SmolVLMForConditionalGeneration,
    Processor: SmolVLMProcessor,
    id: "HuggingFaceTB/SmolVLM2-256M-Video-Instruct",
    revision: "067788b187b95ebe7b2e040b3e4299e342e5b8fd",
  },
  ultravox: {
    Model: UltravoxModel,
    Processor: UltravoxProcessor,
    id: "onnx-community/ultravox-v0_5-llama-3_2-1b-ONNX",
    revision: "1ccaedd19b01bc50b5257800ea8b90f53a5cbffa",
  },
};

export function collate(samples) {
  const length = Math.max(...samples.map((x) => x.input_ids.dims[1]));
  const result = {};
  for (const key of ["input_ids", "attention_mask"]) {
    result[key] = new Tensor(
      "int64",
      samples.flatMap((x) => [...new Array(length - x[key].dims[1]).fill(0n), ...x[key].data]),
      [samples.length, length],
    );
  }
  for (const key of ["pixel_values", "pixel_attention_mask", "image_grid_thw", "audio_values"]) {
    if (!samples[0][key]) continue;
    let tensors = samples.map((x) => x[key]);
    if (key === "pixel_attention_mask" || (key === "pixel_values" && tensors[0].dims.length === 5)) {
      const n = Math.max(...tensors.map((t) => t.dims[1]));
      tensors = tensors.map((t) => {
        if (t.dims[1] === n) return t;
        const dims = [...t.dims];
        dims[1] = n - t.dims[1];
        return cat([t, new Tensor(t.type, new t.data.constructor(dims.reduce((a, b) => a * b, 1)), dims)], 1);
      });
    }
    result[key] = cat(tensors, 0);
  }
  return result;
}

export async function makeSamples(processor, family, { ragged = false, image_urls = null } = {}) {
  if (image_urls && (family === "ultravox" || image_urls.length !== 2)) {
    throw new Error("image_urls requires two photographic image URLs and an image model");
  }
  const photographs = image_urls ? await Promise.all(image_urls.map((url) => RawImage.fromURL(url))) : null;
  const samples = [];
  for (let i = 0; i < 2; ++i) {
    if (family === "ultravox") {
      samples.push(
        await processor(
          "Listen: <|audio|> Describe the sound.",
          Float32Array.from({ length: 16000 }, (_, t) => 0.1 * Math.sin((t * 2 * Math.PI * (i ? 880 : 440)) / 16000)),
        ),
      );
      continue;
    }
    const image = (value) => new RawImage(new Uint8ClampedArray(56 * 56 * 3).fill(value), 56, 56, 3);
    const images = photographs
      ? ragged && i
        ? [photographs[1], photographs[0]]
        : [photographs[i]]
      : ragged && i
        ? [image(255), image(127)]
        : [image(i * 255)];
    const text =
      family === "llava"
        ? `${"<image>".repeat(images.length)}${i ? "Describe this image in detail." : "Hi"}`
        : processor.apply_chat_template(
            [{ role: "user", content: [...images.map(() => ({ type: "image" })), { type: "text", text: i ? "Describe this image in detail." : "Hi" }] }],
            { add_generation_prompt: true },
          );
    samples.push(family === "llava" ? await processor(images, text) : await processor(text, images, { do_image_splitting: false }));
  }
  return samples;
}

const rows = (tensor) => tensor.tolist().map((row) => row.map(String));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Native and browser callers execute the same public generate cases. Selected
// session config is recorded, but is not proof of EP execution: retain profiles.
export async function runMultimodal(options = {}) {
  const progress = (stage, detail = {}) => {
    if (options.progress) console.error(JSON.stringify({ stage, ...detail }));
  };
  const family = options.family ?? "llava";
  const fixture = fixtures[family];
  if (!fixture) throw new Error(`Unknown family ${family}`);
  const model_id = options.model_id ?? fixture.id;
  const revision = options.revision ?? fixture.revision;
  if (!model_id || !revision) throw new Error("Supply model_id and immutable revision for this family");
  const load = {
    dtype: options.dtype ?? "fp32",
    device: options.device ?? "cpu",
    revision,
    cache_dir: options.cache_dir,
    local_files_only: options.local_files_only ?? false,
    session_options: options.session_options,
  };
  const source = options.model_path ?? model_id;
  progress("loading", { family, source });
  const processor = await fixture.Processor.from_pretrained(source, load);
  const model = await fixture.Model.from_pretrained(source, load);
  progress("loaded", { family });
  const evidence = {
    family,
    model_id,
    revision,
    source,
    requested: load,
    image_urls: options.image_urls ?? null,
    cases: [],
    forward_locations: [],
    encoder_calls: 0,
  };
  evidence.sessions = Object.fromEntries(Object.entries(model.sessions).map(([name, session]) => [name, session.config]));
  evidence.finite_logits = true;
  const forward = model.forward.bind(model);
  model.forward = async (inputs) => {
    const output = await forward(inputs);
    if (output.logits.location === "cpu" || output.logits.location === "cpu-pinned") {
      const numeric = output.logits.to("float32");
      for (const value of numeric.data) {
        if (!Number.isFinite(value)) {
          evidence.finite_logits = false;
          break;
        }
      }
      if (numeric !== output.logits) numeric.dispose();
    } else {
      // Generation normally returns CPU logits. Do not claim a numeric check
      // for a custom output-placement configuration that wasn't inspected.
      evidence.finite_logits = false;
    }
    const locations = Object.fromEntries(
      Object.entries(output)
        .filter(([, v]) => v instanceof Tensor)
        .map(([k, v]) => [k, v.location]),
    );
    if (evidence.forward_locations.length < 2) evidence.forward_locations.push(locations);
    return output;
  };
  evidence.call_allocations = [];
  const generate = model.generate.bind(model);
  model.generate = async (config) => {
    const before = options.sample_allocations ? await options.sample_allocations() : null;
    try {
      return await generate(config);
    } finally {
      const after = options.sample_allocations ? await options.sample_allocations() : null;
      if (before && after)
        evidence.call_allocations.push({
          beams: config.num_beams ?? 1,
          before,
          after,
          pass: (config.num_beams ?? 1) === 1 || (after.beam_buffers === before.beam_buffers && after.beam_bytes === before.beam_bytes),
        });
    }
  };
  const encodeKey = family === "ultravox" ? "encode_audio" : "encode_image";
  const encode = model[encodeKey].bind(model);
  model[encodeKey] = async (inputs) => {
    evidence.encoder_calls++;
    return encode(inputs);
  };
  try {
    const samples = await makeSamples(processor, family, options);
    const batch = collate(samples);
    for (const beams of options.beams ?? [1, 2, 4]) {
      const config = {
        max_new_tokens: options.max_new_tokens ?? 3,
        eos_token_id: null,
        repetition_penalty: 2,
        do_sample: false,
        num_beams: beams,
        ...(options.diverse && beams > 1 ? { num_beam_groups: 2, diversity_penalty: 1 } : {}),
        num_return_sequences: beams > 1 ? 2 : 1,
      };
      const before = evidence.encoder_calls;
      const start = performance.now();
      const output = await model.generate({ ...batch, ...config });
      const ms = performance.now() - start;
      const calls = evidence.encoder_calls - before;
      const expected = [];
      for (let i = 0; i < samples.length; ++i) {
        const single = await model.generate({
          ...samples[i],
          input_ids: batch.input_ids.slice([i, i + 1]),
          attention_mask: batch.attention_mask.slice([i, i + 1]),
          ...config,
        });
        expected.push(...rows(single).map((row) => row.slice(batch.input_ids.dims[1])));
      }
      const generated = rows(output).map((row) => row.slice(batch.input_ids.dims[1]));
      evidence.cases.push({
        beams,
        generation_config: config,
        ms,
        encoder_calls: calls,
        tokens: generated,
        independent_tokens: expected,
        pass: calls === 1 && equal(generated, expected),
      });
      progress("beam_case", { family, beams, pass: evidence.cases.at(-1).pass });
    }
    const config = { ...batch, max_new_tokens: 2, num_beams: 2, do_sample: true, top_k: 10 };
    random.seed(123);
    const a = rows(await model.generate(config));
    random.seed(123);
    const b = rows(await model.generate(config));
    evidence.cases.push({ mode: "seeded_sampling", pass: equal(a, b), tokens: a });
    if (options.inject_failure) {
      const originalForward = model.forward;
      const originalIds = rows(batch.input_ids);
      let steps = 0;
      let observed = false;
      model.forward = async (inputs) => {
        if (++steps === 2) throw new Error("multimodal injected decode failure");
        return originalForward(inputs);
      };
      try {
        await model.generate({ ...batch, num_beams: 2, max_new_tokens: 3, eos_token_id: null, do_sample: false });
      } catch (error) {
        if (error.message !== "multimodal injected decode failure") throw error;
        observed = true;
      } finally {
        model.forward = originalForward;
      }
      evidence.cases.push({ mode: "injected_decode_failure", pass: observed && equal(rows(batch.input_ids), originalIds) });
    }
    if (options.inject_failure) {
      const sample = samples[0];
      const prefix = await model.generate({ ...sample, max_new_tokens: 2, eos_token_id: null, return_dict_in_generate: true });
      const cache = prefix.past_key_values;
      const entries = Object.entries(cache);
      const length = cache.get_seq_length();
      const continuation = {
        ...sample,
        input_ids: prefix.sequences,
        attention_mask: cat([sample.attention_mask, new Tensor("int64", [1n, 1n], [1, 2])], 1),
        past_key_values: cache,
        num_beams: 2,
        max_new_tokens: 2,
        eos_token_id: null,
        do_sample: false,
      };
      const originalForward = model.forward;
      let observed = false;
      let steps = 0;
      try {
        const expected = rows(await model.generate(continuation));
        model.forward = async (inputs) => {
          if (++steps === 2) throw new Error("supplied cache injected failure");
          return originalForward(inputs);
        };
        try {
          await model.generate(continuation);
        } catch (error) {
          if (error.message !== "supplied cache injected failure") throw error;
          observed = true;
        } finally {
          model.forward = originalForward;
        }
        const identitiesPreserved = cache.get_seq_length() === length && entries.every(([key, tensor]) => cache[key] === tensor);
        // Reusing the exact cache proves GPU backing storage remains usable;
        // inspecting location or JavaScript identity alone cannot establish this.
        const actual = rows(await model.generate(continuation));
        evidence.cases.push({ mode: "supplied_cache_survives_failure", pass: observed && identitiesPreserved && equal(expected, actual) });
      } finally {
        model.forward = originalForward;
        await cache.dispose();
      }
    }
    const timings = [];
    for (let i = 0; i < (options.repeats ?? 25); ++i) {
      const start = performance.now();
      await model.generate({ ...samples[0], num_beams: 2, max_new_tokens: 2, do_sample: false });
      timings.push(performance.now() - start);
    }
    evidence.repeated_call_ms = timings;
    evidence.pass = evidence.finite_logits && evidence.cases.every((x) => x.pass) && evidence.call_allocations.every((x) => x.pass);
    return evidence;
  } finally {
    await model.dispose();
  }
}
