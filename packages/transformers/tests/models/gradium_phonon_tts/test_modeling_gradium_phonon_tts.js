import { jest } from "@jest/globals";
import { Tensor as ORTTensor } from "onnxruntime-node";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PretrainedConfig, Tensor, env, TextToAudioPipeline, GradiumPhononTTSForConditionalGeneration, load_phonon_voice } from "../../../src/transformers.js";
import { prepare_phonon_text, parse_phonon_voice } from "../../../src/models/gradium_phonon_tts/utils_gradium_phonon_tts.js";
import { get_model_files } from "../../../src/utils/model_registry/get_model_files.js";
import { getSessionDtypes } from "../../../src/models/session_config.js";
import { create_tokenizer } from "./tokenizer_fixture.js";
import integration_tests from "./test_integration_gradium_phonon_tts.js";

const dtype_config = {
  dtype: "fp32",
  dtype_map: {
    fp32: { flow_lm: "fp32", mimi_decoder: "fp32" },
    q4: { flow_lm: "q4", mimi_decoder: "fp32" },
    q4f16: { flow_lm: "q4f16", mimi_decoder: "fp16" },
  },
};
const phonon = {
  voice_dim: 2,
  latent_dim: 2,
  sample_rate: 24000,
  frame_rate: 12.5,
  temperature: 0.3,
  eos_threshold: 4,
  max_tokens_per_chunk: 50,
  flow_lm: { num_layers: 1, num_heads: 1, head_dim: 2 },
  mimi_decoder: { num_layers: 1, num_heads: 1, head_dim: 2, conv_states: { "past_conv.test": [1, 2, 1] } },
};
const config = () => new PretrainedConfig({ model_type: "gradium_phonon_tts", phonon, "transformers.js_config": dtype_config });
const tensor = (value = 0) => new Tensor("float32", [value], [1]);

function voice_file(overrides = {}, channels = 2) {
  const entry = { dtype: "F32", shape: [1, channels, 1], data_offsets: [0, channels * 4], ...overrides };
  const header = new TextEncoder().encode(JSON.stringify({ speaker_wavs: entry }));
  const bytes = new Uint8Array(8 + header.length + channels * 4);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(header.length), true);
  bytes.set(header, 8);
  const data = new Float32Array(channels);
  data.set([0.25, -0.5]);
  bytes.set(new Uint8Array(data.buffer), 8 + header.length);
  return bytes;
}

function fake_pipeline(eos = 5) {
  const offsets = [],
    noises = [];
  const decoder = {
    inputNames: ["latent", "past_offset", "past_conv.test", "past_key_values.0.key", "past_key_values.0.value"],
    run: jest.fn(async (inputs) => {
      offsets.push(inputs.past_offset.data[0]);
      return {
        audio: new ORTTensor("float32", [0.25, -0.5], [1, 2]),
        present_offset: new ORTTensor("int64", [1n], [1]),
        "present_conv.test": new ORTTensor("float32", [0], [1]),
        "present.0.key": new ORTTensor("float32", [0], [1]),
        "present.0.value": new ORTTensor("float32", [0], [1]),
      };
    }),
    release: jest.fn(),
  };
  const model = new GradiumPhononTTSForConditionalGeneration(config(), { mimi_decoder: decoder });
  model.default_voice = new Tensor("float32", [0, 0], [1, 2, 1]);
  const flow = jest.spyOn(model, "_run_flow").mockImplementation(async (past, args) => {
    if (args.noise) noises.push(Array.from(args.noise.data));
    return { "present.0.key": tensor(), "present.0.value": tensor(), latent_out: new Tensor("float32", [0, 0], [1, 1, 2]), eos_logit: tensor(eos) };
  });
  const pipe = new TextToAudioPipeline({ model, tokenizer: create_tokenizer() });
  return { pipe, model, flow, decoder, offsets, noises };
}

// Python PocketTTSProcessor.split_text -> apply_chat_template -> encode, using
// the same offline fixture's normalizer and Rust tokenizers backend. These are
// the final per-chunk model inputs, not slices of the whole-text encoding.
const OFFLINE_PARITY_CASES = [
  {
    text: "hello. goodbye.",
    budget: 8,
    ids: [
      [1, 42, 71, 78, 78, 81, 16],
      [1, 41, 81, 81, 70, 68, 91, 71, 16],
    ],
  },
  {
    text: "one, two, three, four, five, six.",
    budget: 17,
    ids: [
      [1, 49, 80, 71, 14, 1, 86, 89, 81, 14, 1, 86, 74, 84, 71, 71, 14],
      [1, 40, 81, 87, 84, 14, 1, 72, 75, 88, 71, 14, 1, 85, 75, 90, 16],
    ],
  },
  { text: "it’s “Hello” — see you 🚀…", budget: 100, ids: [[1, 43, 86, 9, 85, 1, 4, 42, 71, 78, 78, 81, 4, 1, 85, 71, 71, 1, 91, 81, 87, 16]] },
  {
    text: "price 3.5. next.",
    budget: 10,
    ids: [
      [1, 50, 84, 75, 69, 71, 1, 21, 16, 23, 16],
      [1, 48, 71, 90, 86, 16],
    ],
  },
];

export default () => {
  afterEach(() => jest.restoreAllMocks());
  describe("configuration and files", () => {
    it("preserves deferred dtype selection and custom model metadata", () => {
      expect(getSessionDtypes({ "transformers.js_config": { dtype: "fp32" } }, null)).toBeNull();
      expect(new PretrainedConfig({ model_type: "custom", phonon }).model_type).toBe("custom");
    });
    it.each([
      [undefined, "fp32", "fp32"],
      ["q4", "q4", "fp32"],
      ["q4f16", "q4f16", "fp16"],
      [{ flow_lm: "q4", mimi_decoder: "fp16" }, "q4", "fp16"],
    ])("resolves generic dtype metadata for %j", (dtype, flow_lm, mimi_decoder) => {
      expect(getSessionDtypes(config(), dtype)).toEqual({ flow_lm, mimi_decoder });
    });
    it("validates requested variants and supports new metadata without model code", () => {
      expect(() => getSessionDtypes(config(), "q8")).toThrow("Unsupported dtype");
      expect(() => getSessionDtypes(config(), { mimi_decoder: "q4" })).toThrow("Unsupported dtype");
      expect(() => getSessionDtypes(config(), { unknown_session: "fp32" })).toThrow("Unsupported dtype");
      const generic = { "transformers.js_config": { dtype: "q8", dtype_map: { q8: { encoder: "q8", decoder: "fp32" } } } };
      expect(getSessionDtypes(generic, "q8")).toEqual({ encoder: "q8", decoder: "fp32" });
    });
    it("lists mixed-precision graphs, voice and external data consistently", async () => {
      const cfg = config();
      cfg["transformers.js_config"] = { ...dtype_config, use_external_data_format: { "flow_lm_q4.onnx": 1 } };
      expect(await get_model_files("unused", { config: cfg, dtype: "q4" })).toEqual(["config.json", "default-voice.safetensors", "onnx/flow_lm_q4.onnx", "onnx/flow_lm_q4.onnx_data", "onnx/mimi_decoder.onnx"]);
    });
  });

  describe("voice files", () => {
    it("parses unaligned F32 safetensors", () => {
      const voice = parse_phonon_voice(voice_file(), 2);
      expect(voice.dims).toEqual([1, 2, 1]);
      expect(Array.from(voice.data)).toEqual([0.25, -0.5]);
      voice.dispose();
    });
    it.each([{ dtype: "F16" }, { shape: [1, 3, 1] }, { data_offsets: [-1, 7] }, { data_offsets: [0, 80] }])("rejects invalid voice tensors %j", (entry) => {
      expect(() => parse_phonon_voice(voice_file(entry), 2)).toThrow("Invalid Phonon voice");
    });
    it("rejects truncated headers", () => {
      expect(() => parse_phonon_voice(new Uint8Array(4), 2)).toThrow("Invalid Phonon voice");
      const bytes = voice_file();
      new DataView(bytes.buffer).setBigUint64(0, 99999n, true);
      expect(() => parse_phonon_voice(bytes, 2)).toThrow("header length");
    });
    it("loads caller-owned voices from an explicit local directory offline", async () => {
      const directory = await mkdtemp(join(tmpdir(), "phonon-voices-"));
      const fetch = jest.spyOn(env, "fetch");
      try {
        await writeFile(join(directory, "voice.safetensors"), voice_file({}, 512));
        const voice = await load_phonon_voice(directory, "voice.safetensors", { local_files_only: true });
        expect(voice.dims).toEqual([1, 512, 1]);
        expect(fetch).not.toHaveBeenCalled();
        voice.dispose();
      } finally {
        await rm(directory, { recursive: true });
      }
    });
  });

  describe("offline Python text parity", () => {
    it.each(OFFLINE_PARITY_CASES)("matches final per-chunk model IDs: $text", ({ text, budget, ids }) => {
      expect(prepare_phonon_text(create_tokenizer(), text, budget).map((chunk) => chunk.input_ids)).toEqual(ids);
    });
    it("uses one whole-text encode plus one encode per final chunk", () => {
      const tok = create_tokenizer();
      const encode = jest.spyOn(tok, "encode");
      const chunks = prepare_phonon_text(tok, "hello. goodbye. one, two, three, four, five, six.", 17);
      expect(encode).toHaveBeenCalledTimes(1 + chunks.length);
      expect(chunks.length).toBeGreaterThan(1);
    });
    it("groups short sentences and preserves long unsplittable clauses", () => {
      const tok = create_tokenizer();
      expect(prepare_phonon_text(tok, "Hi. Bye. Yes. No.", 10).map((c) => tok.decode(c.input_ids))).toEqual(["Hi. Bye.", "Yes. No."]);
      const chunks = prepare_phonon_text(tok, "a".repeat(80), 10);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].input_ids.length).toBeGreaterThan(10);
    });
    it("supports byte fallback and restores private tokenizer state", () => {
      const tok = create_tokenizer();
      const original = tok._tokenizer.model.encode;
      const chunks = prepare_phonon_text(tok, "hi 漢", 50);
      expect(tok.decode(chunks[0].input_ids)).toBe("Hi 漢.");
      expect(tok._tokenizer.model.encode).toBe(original);
    });
    it("fails explicitly when tokenizer internals change", () => {
      expect(() => prepare_phonon_text({}, "Hello.", 50)).toThrow("incompatible");
    });
    it.each(["", "   ", null, 42])("rejects invalid text %j", (text) => {
      expect(() => prepare_phonon_text(create_tokenizer(), text, 50)).toThrow("non-empty");
    });
    it.each([0, -1, 1.5, NaN])("rejects invalid token budgets %j", (budget) => {
      expect(() => prepare_phonon_text(create_tokenizer(), "Hello.", budget)).toThrow("positive integer");
    });
  });

  describe("generation and ownership", () => {
    it("dispatches through the synthesis capability rather than a model name", async () => {
      const { pipe, model } = fake_pipeline();
      model.config.model_type = "another_synthesis_model";
      try {
        expect((await pipe("Hello.")).sampling_rate).toBe(24000);
      } finally {
        await pipe.dispose();
      }
    });
    it("streams independent frame copies, awaits callbacks and caches only the default prefix", async () => {
      const { pipe, model, flow, decoder, noises } = fake_pipeline();
      let callbacks = 0;
      try {
        const result = await pipe("Hello.", {
          temperature: 0,
          callback_function: async (chunk) => {
            await Promise.resolve();
            callbacks++;
            chunk.audio.fill(0);
          },
        });
        expect(callbacks).toBe(4);
        expect(Array.from(result.audio)).toEqual([0.25, -0.5, 0.25, -0.5, 0.25, -0.5, 0.25, -0.5]);
        expect(noises.every((noise) => noise.every((value) => value === 0))).toBe(true);
        await pipe("Hello.");
        expect(flow.mock.calls.filter(([, args]) => args.voice)).toHaveLength(1);
        expect(model._default_voice_state).not.toBeNull();
      } finally {
        await pipe.dispose();
      }
      expect(model._default_voice_state).toBeNull();
      expect(decoder.release).toHaveBeenCalledTimes(1);
    });
    it("shares one custom prefix across chunks and batch items, then frees it", async () => {
      const { pipe, model, flow, offsets } = fake_pipeline();
      const validate = jest.spyOn(model, "_validate_voice");
      const voice = new Tensor("float32", [0.5, 0.25], [1, 2, 1]);
      try {
        await pipe(["Hello. ".repeat(10), "And another sentence."], { speaker_embeddings: voice, temperature: 0 });
        expect(flow.mock.calls.filter(([, args]) => args.voice)).toHaveLength(1);
        expect(validate).toHaveBeenCalledTimes(1);
        const prefix = await flow.mock.results[0].value;
        const prompts = flow.mock.calls.filter(([, args]) => args.text);
        expect(prompts.length).toBeGreaterThan(2);
        expect(prompts.every(([past]) => past["past_key_values.0.key"] === prefix["present.0.key"])).toBe(true);
        expect(offsets.filter((offset) => offset === 0n)).toHaveLength(prompts.length);
        expect(() => prefix["present.0.key"].data).toThrow("disposed");
        expect(model._default_voice_state).toBeNull();
        expect(Array.from(voice.data)).toEqual([0.5, 0.25]);
      } finally {
        voice.dispose();
        await pipe.dispose();
      }
    });
    it("uses the shorter EOS tail for more than four words", async () => {
      const { pipe, decoder } = fake_pipeline();
      try {
        await pipe("One two three four five.");
        expect(decoder.run).toHaveBeenCalledTimes(2);
      } finally {
        await pipe.dispose();
      }
    });
    it("releases a failed prefix initialization and allows retrying", async () => {
      const { pipe, model, flow } = fake_pipeline();
      flow.mockRejectedValueOnce(new Error("prefix failed"));
      try {
        await expect(pipe("Hello.")).rejects.toThrow("prefix failed");
        for (const input of Object.values(flow.mock.calls[0][0])) expect(() => input.data).toThrow("disposed");
        expect(model._default_voice_state).toBeNull();
        expect((await pipe("Hello.")).audio.length).toBeGreaterThan(0);
      } finally {
        await pipe.dispose();
      }
    });
    it.each(["callback", "decoder", "flow"])("releases current state on %s failure and permits the next request", async (failure) => {
      const { pipe, model, flow, decoder } = fake_pipeline();
      const voice = new Tensor("float32", [0, 0], [1, 2, 1]);
      jest.spyOn(console, "error").mockImplementation(() => {});
      const options = { speaker_embeddings: voice };
      if (failure === "callback")
        options.callback_function = () => {
          throw new Error("failure");
        };
      if (failure === "decoder") decoder.run.mockRejectedValueOnce(new Error("failure"));
      const original = flow.getMockImplementation();
      if (failure === "flow")
        flow.mockImplementation(async (past, args) => {
          if (args.noise) throw new Error("failure");
          return original(past, args);
        });
      try {
        await expect(pipe("Hello.", options)).rejects.toThrow("failure");
        const prefix = await flow.mock.results[0].value;
        expect(() => prefix["present.0.key"].data).toThrow("disposed");
        for (const result of await Promise.allSettled(flow.mock.results.map((call) => call.value))) {
          if (result.status === "fulfilled") {
            for (const output of Object.values(result.value)) expect(() => output.data).toThrow("disposed");
          }
        }
        expect(model._default_voice_state).toBeNull();
        flow.mockImplementation(original);
        expect((await pipe("Hello.", { speaker_embeddings: voice })).audio.length).toBeGreaterThan(0);
        expect(Array.from(voice.data)).toEqual([0, 0]);
      } finally {
        voice.dispose();
        await pipe.dispose();
      }
    });
    it("releases a directly-owned prefix on early iterator return", async () => {
      const { pipe, model, flow } = fake_pipeline();
      const voice = new Tensor("float32", [0, 0], [1, 2, 1]);
      try {
        const iterator = model.generate_speech({ input_ids: [1], word_count: 1, speaker_embeddings: voice });
        await iterator.next();
        await iterator.return();
        const prefix = await flow.mock.results[0].value;
        expect(() => prefix["present.0.key"].data).toThrow("disposed");
        expect(Array.from(voice.data)).toEqual([0, 0]);
      } finally {
        voice.dispose();
        await pipe.dispose();
      }
    });
    it("validates batches before inference", async () => {
      const { pipe, flow } = fake_pipeline();
      try {
        await expect(pipe(["Hello.", " "])).rejects.toThrow("non-empty");
        expect(flow).not.toHaveBeenCalled();
      } finally {
        await pipe.dispose();
      }
    });
    it.each(["https://huggingface.co/gradium/phonon-voices/resolve/main/voices/LMDIYE0Oa377Qh6Z.safetensors", new URL("https://huggingface.co/gradium/phonon-voices/resolve/main/voices/LMDIYE0Oa377Qh6Z.safetensors"), new Float32Array(2)])("directs non-Tensor voices to the loader instead of reporting a shape error (%s)", async (voice) => {
      const { pipe, model, flow } = fake_pipeline();
      const message = "Phonon speaker_embeddings must be a Tensor. Load a voice with load_phonon_voice(repo_or_path, filename).";
      try {
        await expect(pipe("Hello.", { speaker_embeddings: voice })).rejects.toThrow(message);
        const iterator = model.generate_speech({ input_ids: [1], word_count: 1, speaker_embeddings: voice });
        await expect(iterator.next()).rejects.toThrow(message);
        expect(flow).not.toHaveBeenCalled();
      } finally {
        await pipe.dispose();
      }
    });
    it.each([() => new Tensor("float32", [0, 0], [1, 2]), () => new Tensor("int64", [0n, 0n], [1, 2, 1])])("keeps shape/dtype diagnostics for invalid Tensor voices", async (create_voice) => {
      const { pipe, flow } = fake_pipeline();
      const voice = create_voice();
      try {
        await expect(pipe("Hello.", { speaker_embeddings: voice })).rejects.toThrow("must have shape [1, 2, frames] and dtype float32");
        expect(flow).not.toHaveBeenCalled();
      } finally {
        voice.dispose();
        await pipe.dispose();
      }
    });
    it("warns when EOS never arrives", async () => {
      const { pipe, decoder } = fake_pipeline(-5);
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const ids = pipe.tokenizer.encode("Hi.", { add_special_tokens: false });
        await pipe("Hi.", { temperature: 0 });
        expect(decoder.run).toHaveBeenCalledTimes(Math.ceil((ids.length / 3 + 2) * 12.5));
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("truncated"));
      } finally {
        await pipe.dispose();
      }
    });
    it.each([{ temperature: -1 }, { temperature: NaN }, { num_speakers: 3 }, { duration_delta: Infinity }])("rejects invalid options %j", async (options) => {
      const { pipe } = fake_pipeline();
      try {
        await expect(pipe("Hello.", options)).rejects.toThrow("Phonon");
      } finally {
        await pipe.dispose();
      }
    });
  });
  integration_tests();
};
