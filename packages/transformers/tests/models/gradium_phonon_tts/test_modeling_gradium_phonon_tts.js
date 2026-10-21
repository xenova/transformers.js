import { jest } from "@jest/globals";
import { Tensor as ORTTensor } from "onnxruntime-node";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { env, PretrainedConfig, Tensor, TextToAudioPipeline, GradiumPhononTTSForConditionalGeneration } from "../../../src/transformers.js";
import { prepare_phonon_text, parse_phonon_voice } from "../../../src/models/gradium_phonon_tts/utils_gradium_phonon_tts.js";
import { get_model_files } from "../../../src/utils/model_registry/get_model_files.js";
import { selectDtype } from "../../../src/utils/dtypes.js";
import { create_tokenizer } from "./tokenizer_fixture.js";
import integration_tests from "./test_integration_gradium_phonon_tts.js";

const dtype_config = { dtype: "fp32" };
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

function voice_file(channels = 2) {
  const entry = { dtype: "F32", shape: [1, channels, 1], data_offsets: [0, channels * 4] };
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
  const noises = [];
  const decoder = {
    inputNames: ["latent", "past_offset", "past_conv.test", "past_key_values.0.key", "past_key_values.0.value"],
    run: jest.fn(async (inputs) => {
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
  return { pipe, model, flow, decoder, noises };
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
  describe("GradiumPhononTTSForConditionalGeneration", () => {
    afterEach(() => jest.restoreAllMocks());

    describe("model files", () => {
      // The Hub aliases use variant suffixes, not decoder precision:
      // mimi_decoder_q4 is fp32 and mimi_decoder_q4f16 is fp16.
      it.each(["fp32", "q4", "q4f16"])("lists graphs and the default voice for %s", async (dtype) => {
        const suffix = dtype === "fp32" ? "" : `_${dtype}`;
        expect(await get_model_files("unused", { config: config(), dtype })).toEqual(["config.json", "default-voice.safetensors", `onnx/flow_lm${suffix}.onnx`, `onnx/mimi_decoder${suffix}.onnx`]);
      });
      it.each([undefined, "auto"])("uses configured fp32 rather than wasm's q8 default for %j", (dtype) => {
        for (const name of ["flow_lm", "mimi_decoder"]) {
          expect(selectDtype(dtype ?? dtype_config.dtype, name, "wasm", { configDtype: dtype_config.dtype })).toBe("fp32");
        }
      });
      it("enumerates fp32 files by default on wasm", async () => {
        expect(await get_model_files("unused", { config: config(), device: "wasm" })).toEqual(["config.json", "default-voice.safetensors", "onnx/flow_lm.onnx", "onnx/mimi_decoder.onnx"]);
      });
    });

    describe("text preparation", () => {
      it.each(OFFLINE_PARITY_CASES)("matches Python's per-chunk model inputs: $text", ({ text, budget, ids }) => {
        expect(prepare_phonon_text(create_tokenizer(), text, budget).map((chunk) => chunk.input_ids)).toEqual(ids);
      });
      it("groups short sentences and keeps unsplittable clauses intact", () => {
        const tok = create_tokenizer();
        expect(prepare_phonon_text(tok, "Hi. Bye. Yes. No.", 10).map((c) => tok.decode(c.input_ids))).toEqual(["Hi. Bye.", "Yes. No."]);
        expect(prepare_phonon_text(tok, "a".repeat(80), 10)).toHaveLength(1);
      });
      it("joins decoded pieces with spaces like Python when punctuation has no following whitespace", () => {
        const tok = create_tokenizer();
        expect(prepare_phonon_text(tok, "Hi.Bye.", 50).map((chunk) => tok.decode(chunk.input_ids))).toEqual(["Hi. Bye."]);
        expect(prepare_phonon_text(tok, "one,two,three,four,five,six.", 17).map((chunk) => tok.decode(chunk.input_ids))).toEqual(["One, two, three,", "Four, five, six."]);
      });
      it("keeps bounded decimal lookaround correct for byte-fallback digits", () => {
        const tok = create_tokenizer();
        expect(prepare_phonon_text(tok, "price ١.٥. next.", 10).map((chunk) => tok.decode(chunk.input_ids))).toEqual(["Price ١.٥.", "Next."]);
      });
      it.each([50, 1_000_000])("bounds decoding work linearly for long paragraphs (budget %i)", (budget) => {
        const work = (sentences) => {
          const tok = create_tokenizer();
          const text = "Hello. ".repeat(sentences);
          const tokens = tok.encode(text, { add_special_tokens: false });
          const decode = jest.spyOn(tok, "decode");
          prepare_phonon_text(tok, text, budget);
          const decoded_tokens = decode.mock.calls.reduce((total, [ids]) => total + ids.length, 0);
          expect(decoded_tokens).toBeLessThan(tokens.length * 12);
          return decoded_tokens;
        };
        expect(work(400)).toBeLessThan(work(100) * 5);
      });
      it("applies byte fallback using only public tokenizer methods", () => {
        const tok = create_tokenizer();
        const encode = jest.spyOn(tok, "encode");
        expect(tok.decode(prepare_phonon_text(tok, "hi 漢", 50)[0].input_ids)).toBe("Hi 漢.");
        expect(encode).not.toHaveBeenCalled();
      });
    });

    it("parses voice files", () => {
      const voice = parse_phonon_voice(voice_file());
      expect(voice.dims).toEqual([1, 2, 1]);
      expect(Array.from(voice.data)).toEqual([0.25, -0.5]);
    });

    describe("generation", () => {
      it("streams frames and caches only the default voice prefix", async () => {
        const { pipe, model, flow, noises } = fake_pipeline();
        let callbacks = 0;
        try {
          const result = await pipe("Hello.", { temperature: 0, callback_function: () => callbacks++ });
          // EOS on the first frame, then a 3-frame tail for short texts.
          expect(callbacks).toBe(4);
          expect(Array.from(result.audio)).toEqual([0.25, -0.5, 0.25, -0.5, 0.25, -0.5, 0.25, -0.5]);
          expect(noises.every((noise) => noise.every((value) => value === 0))).toBe(true);
          await pipe("Hello.");
          expect(flow.mock.calls.filter(([, args]) => args.voice)).toHaveLength(1);
        } finally {
          await pipe.dispose();
        }
        expect(model._default_voice_state).toBeNull();
      });
      it("shares one custom voice prefix across chunks and batch items, then frees it", async () => {
        const { pipe, flow } = fake_pipeline();
        const voice = new Tensor("float32", [0.5, 0.25], [1, 2, 1]);
        try {
          await pipe(["Hello. ".repeat(10), "And another sentence."], { speaker_embeddings: voice, temperature: 0 });
          expect(flow.mock.calls.filter(([, args]) => args.voice)).toHaveLength(1);
          const prefix = await flow.mock.results[0].value;
          expect(() => prefix["present.0.key"].data).toThrow("disposed");
          expect(Array.from(voice.data)).toEqual([0.5, 0.25]);
        } finally {
          voice.dispose();
          await pipe.dispose();
        }
      });
      it.each(["pipeline", "model"])("loads a safetensors URL through the %s and releases the loaded voice", async (kind) => {
        const { pipe, model, flow } = fake_pipeline();
        const url = "https://example.com/voice.safetensors";
        const fetch = jest.spyOn(env, "fetch").mockResolvedValue(new Response(voice_file()));
        try {
          const output = kind === "pipeline"
            ? await pipe(["Hello.", "Goodbye."], { speaker_embeddings: url })
            : await model.synthesize(["Hello.", "Goodbye."], pipe.tokenizer, { speaker_embeddings: new URL(url) });
          expect(output).toHaveLength(2);
          expect(fetch).toHaveBeenCalledTimes(1);
          const voice = flow.mock.calls.find(([, args]) => args.voice)[1].voice;
          expect(() => voice.data).toThrow("disposed");
          expect(model.default_voice.data.length).toBe(2);
          expect(flow.mock.calls.filter(([, args]) => args.voice)).toHaveLength(1);
        } finally { await pipe.dispose(); }
      });
      it("loads local safetensors paths and file URLs", async () => {
        const { pipe, model } = fake_pipeline();
        const dir = await mkdtemp(join(tmpdir(), "phonon-voice-"));
        const path = join(dir, "voice.safetensors");
        try {
          await writeFile(path, voice_file());
          for (const speaker_embeddings of [path, pathToFileURL(path)]) {
            expect((await pipe("Hello.", { speaker_embeddings })).audio.length).toBeGreaterThan(0);
            expect((await model.synthesize("Hello.", pipe.tokenizer, { speaker_embeddings })).audio.length).toBeGreaterThan(0);
          }
        } finally {
          await pipe.dispose();
          await rm(dir, { recursive: true });
        }
      });
      it.each(["callback", "conditioning", "validation"])("releases a loaded voice after %s failure", async (failure) => {
        const { pipe, model, flow } = fake_pipeline();
        jest.spyOn(env, "fetch").mockResolvedValue(new Response(voice_file(failure === "validation" ? 3 : 2)));
        const validate = jest.spyOn(model, "_validate_voice");
        if (failure === "conditioning") flow.mockRejectedValueOnce(new Error("conditioning failed"));
        try {
          await expect(pipe("Hello.", {
            speaker_embeddings: "https://example.com/voice.safetensors",
            callback_function: () => { throw new Error("callback failed"); },
          })).rejects.toThrow(failure === "validation" ? "[1, 2, frames]" : `${failure} failed`);
          const voice = validate.mock.calls[0][0];
          expect(() => voice.data).toThrow("disposed");
        } finally { await pipe.dispose(); }
      });
      it("reloads a voice URL on each synthesis call", async () => {
        const { pipe } = fake_pipeline();
        const fetch = jest.spyOn(env, "fetch").mockImplementation(async () => new Response(voice_file()));
        try {
          const options = { speaker_embeddings: "https://example.com/voice.safetensors" };
          await pipe("Hello.", options);
          await pipe("Hello again.", options);
          expect(fetch).toHaveBeenCalledTimes(2);
        } finally { await pipe.dispose(); }
      });
      it("reports failed voice downloads before running the model", async () => {
        const { pipe, flow } = fake_pipeline();
        jest.spyOn(env, "fetch").mockResolvedValue(new Response("not found", { status: 404, statusText: "Not Found" }));
        try {
          await expect(pipe("Hello.", { speaker_embeddings: "https://example.com/missing.safetensors" })).rejects.toThrow("Unable to load Phonon voice: 404 Not Found");
          expect(flow).not.toHaveBeenCalled();
        } finally { await pipe.dispose(); }
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
      it("stops at the frame budget and warns when EOS never arrives", async () => {
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
      it("rejects voices that are not tensors of the right shape", async () => {
        const { pipe, model } = fake_pipeline();
        try {
          await expect(model.synthesize("Hello.", pipe.tokenizer, { speaker_embeddings: new Float32Array(2) })).rejects.toThrow("float32 Tensor");
          await expect(pipe("Hello.", { speaker_embeddings: new Float32Array(2) })).rejects.toThrow("float32 Tensor");
          await expect(pipe("Hello.", { speaker_embeddings: new Tensor("float32", [0, 0], [1, 2]) })).rejects.toThrow("[1, 2, frames]");
        } finally {
          await pipe.dispose();
        }
      });
    });
    integration_tests();
  });
};
