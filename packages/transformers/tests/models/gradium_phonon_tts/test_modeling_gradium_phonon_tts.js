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
  conditions: { num_speakers: { default: "2" }, duration_delta: { default: 0.5 } },
  flow_lm: { num_layers: 1, num_heads: 1, head_dim: 2 },
  mimi_decoder: { num_layers: 1, num_heads: 1, head_dim: 2, conv_states: { "past_conv.test": [1, 2, 1] } },
};
const config = () => new PretrainedConfig({ model_type: "gradium_phonon_tts", phonon, "transformers.js_config": dtype_config });
const url = "https://example.com/voice.safetensors";

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
  const steps = [];
  const state = () => ({ "present.0.key": new ORTTensor("float32", [0], [1]), "present.0.value": new ORTTensor("float32", [0], [1]) });
  const flow = {
    inputNames: ["text_ids", "voice_latents", "latent", "noise", "num_speakers", "duration_delta", "past_key_values.0.key", "past_key_values.0.value"],
    run: jest.fn(async (inputs) => {
      if (inputs.latent.dims[1]) {
        steps.push({ noise: Array.from(inputs.noise.data), num_speakers: inputs.num_speakers.data[0], duration_delta: inputs.duration_delta.data[0] });
      }
      return { ...state(), latent_out: new ORTTensor("float32", [0, 0], [1, 1, 2]), eos_logit: new ORTTensor("float32", [eos], [1]) };
    }),
    release: jest.fn(),
  };
  const decoder = {
    inputNames: ["latent", "past_offset", "past_conv.test", "past_key_values.0.key", "past_key_values.0.value"],
    run: jest.fn(async () => ({
      ...state(),
      audio: new ORTTensor("float32", [0.25, -0.5], [1, 2]),
      present_offset: new ORTTensor("int64", [1n], [1]),
      "present_conv.test": new ORTTensor("float32", [0], [1]),
    })),
    release: jest.fn(),
  };
  const model = new GradiumPhononTTSForConditionalGeneration(config(), { flow_lm: flow, mimi_decoder: decoder });
  model.default_voice = new Tensor("float32", [0, 0], [1, 2, 1]);
  const pipe = new TextToAudioPipeline({ model, tokenizer: create_tokenizer() });
  // Voice-conditioning runs are the only flow runs with voice frames.
  const voice_runs = () => flow.run.mock.calls.map(([inputs], i) => ({ inputs, i })).filter(({ inputs }) => inputs.voice_latents.dims[2] > 0);
  const prefix = async (n = 0) => (await flow.run.mock.results[voice_runs()[n].i].value)["present.0.key"];
  return { pipe, model, flow, decoder, steps, voice_runs, prefix };
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

    // The Hub aliases use variant suffixes, not decoder precision:
    // mimi_decoder_q4 is fp32 and mimi_decoder_q4f16 is fp16.
    // Without a dtype, the configured fp32 wins over wasm's q8 default.
    it.each([
      [{ dtype: "fp32" }, ""],
      [{ dtype: "q4" }, "_q4"],
      [{ dtype: "q4f16" }, "_q4f16"],
      [{ device: "wasm" }, ""],
    ])("lists graphs and the default voice for %j", async (options, suffix) => {
      expect(await get_model_files("unused", { config: config(), ...options })).toEqual(["config.json", "default-voice.safetensors", `onnx/flow_lm${suffix}.onnx`, `onnx/mimi_decoder${suffix}.onnx`]);
      for (const dtype of options.dtype ? [] : [undefined, "auto"]) {
        expect(selectDtype(dtype ?? dtype_config.dtype, "flow_lm", "wasm", { configDtype: dtype_config.dtype })).toBe("fp32");
      }
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
      it("streams frames and caches the default voice prefix until disposal", async () => {
        const { pipe, steps, voice_runs, prefix } = fake_pipeline();
        let callbacks = 0;
        try {
          const result = await pipe("Hello.", { temperature: 0, callback_function: () => callbacks++ });
          // EOS on the first frame, then a 3-frame tail for short texts.
          expect(callbacks).toBe(4);
          expect(Array.from(result.audio)).toEqual([0.25, -0.5, 0.25, -0.5, 0.25, -0.5, 0.25, -0.5]);
          expect(steps.every(({ noise }) => noise.every((value) => value === 0))).toBe(true);
          await pipe("Hello.");
          expect(voice_runs()).toHaveLength(1);
          expect((await prefix()).data.length).toBe(1);
        } finally {
          await pipe.dispose();
        }
        await expect(prefix().then((p) => p.data)).rejects.toThrow("disposed");
      });
      it("takes conditioning defaults from the config and forwards overrides", async () => {
        const { pipe, steps } = fake_pipeline();
        try {
          await pipe("Hello.");
          expect(steps[0]).toMatchObject({ num_speakers: 2n, duration_delta: 0.5 });
          await pipe("Hello.", { num_speakers: 0, duration_delta: -1 });
          expect(steps.at(-1)).toMatchObject({ num_speakers: 0n, duration_delta: -1 });
        } finally {
          await pipe.dispose();
        }
      });
      it("shares a tensor prefix across chunks, then reconditions in-place changes on the next call", async () => {
        const { pipe, voice_runs, prefix } = fake_pipeline();
        const voice = new Tensor("float32", [0.5, 0.25], [1, 2, 1]);
        const text = "Hello. ".repeat(10);
        try {
          expect(prepare_phonon_text(pipe.tokenizer, text, phonon.max_tokens_per_chunk).length).toBeGreaterThan(1);
          await pipe(text, { speaker_embeddings: voice, temperature: 0 });
          expect(voice_runs()).toHaveLength(1);
          expect(() => voice_runs()[0].inputs.voice_latents.data).not.toThrow();
          await expect(prefix().then((p) => p.data)).rejects.toThrow("disposed");
          voice.data[0] = 0.75;
          await pipe("Another sentence.", { speaker_embeddings: voice });
          expect(voice_runs()).toHaveLength(2);
        } finally {
          await pipe.dispose();
          expect(Array.from(voice.data)).toEqual([0.75, 0.25]);
          voice.dispose();
        }
      });
      it.each(["break", "callback"])("frees per-call tensor prefixes on %s without releasing the tensor", async (failure) => {
        const { pipe, model, prefix } = fake_pipeline();
        const voice = new Tensor("float32", [0.5, 0.25], [1, 2, 1]);
        try {
          if (failure === "break") {
            const chunks = prepare_phonon_text(pipe.tokenizer, "Hello.", phonon.max_tokens_per_chunk);
            for await (const pcm of model.generate_speech({ chunks, speaker_embeddings: voice })) break;
          } else {
            await expect(pipe("Hello.", {
              speaker_embeddings: voice,
              callback_function: () => { throw new Error("callback failed"); },
            })).rejects.toThrow("callback failed");
          }
          await expect(prefix().then((p) => p.data)).rejects.toThrow("disposed");
          expect(Array.from(voice.data)).toEqual([0.5, 0.25]);
        } finally {
          voice.dispose();
          await pipe.dispose();
        }
      });
      it("downloads each voice URL once, shares in-flight downloads and releases loaded voices on disposal", async () => {
        const { pipe, model, voice_runs } = fake_pipeline();
        const fetch = jest.spyOn(env, "fetch").mockImplementation(async () => new Response(voice_file()));
        const other = "https://example.com/other.safetensors";
        try {
          const outputs = await Promise.all([pipe(["Hello.", "Goodbye."], { speaker_embeddings: url }), pipe("Hi.", { speaker_embeddings: new URL(url) })]);
          expect(outputs[0]).toHaveLength(2);
          await pipe("Another sentence.", { speaker_embeddings: other });
          await pipe("And another.", { speaker_embeddings: other });
          expect(fetch).toHaveBeenCalledTimes(2);
          // The prefix of a non-default voice is recomputed once per input.
          expect(voice_runs()).toHaveLength(5);
        } finally {
          await pipe.dispose();
        }
        for (const { inputs } of voice_runs()) expect(() => inputs.voice_latents.data).toThrow("disposed");
        expect(() => model.default_voice.data).toThrow("disposed");
      });
      it("releases a voice whose download is still pending at disposal", async () => {
        const { pipe, voice_runs } = fake_pipeline();
        let resolve_fetch;
        jest.spyOn(env, "fetch").mockImplementation(() => new Promise((resolve) => { resolve_fetch = resolve; }));
        const call = pipe("Hello.", { speaker_embeddings: url });
        const disposing = pipe.dispose();
        await new Promise((resolve) => setTimeout(resolve, 0));
        resolve_fetch(new Response(voice_file()));
        await disposing;
        await call.catch(() => {});
        expect(voice_runs()).toHaveLength(1);
        expect(() => voice_runs()[0].inputs.voice_latents.data).toThrow("disposed");
      });
      it("loads local safetensors paths and file URLs", async () => {
        const { pipe } = fake_pipeline();
        const dir = await mkdtemp(join(tmpdir(), "phonon-voice-"));
        const path = join(dir, "voice.safetensors");
        try {
          await writeFile(path, voice_file());
          for (const speaker_embeddings of [path, pathToFileURL(path)]) {
            expect((await pipe("Hello.", { speaker_embeddings })).audio.length).toBeGreaterThan(0);
          }
        } finally {
          await pipe.dispose();
          await rm(dir, { recursive: true });
        }
      });
      it.each(["callback", "conditioning", "validation"])("recovers from a %s failure with a voice URL", async (failure) => {
        const { pipe, flow } = fake_pipeline();
        let invalid = failure === "validation";
        const fetch = jest.spyOn(env, "fetch").mockImplementation(async () => new Response(voice_file(invalid ? 3 : 2)));
        const dispose = jest.spyOn(Tensor.prototype, "dispose");
        jest.spyOn(console, "error").mockImplementation(() => {});
        if (failure === "conditioning") flow.run.mockRejectedValueOnce(new Error("conditioning failed"));
        try {
          await expect(pipe("Hello.", {
            speaker_embeddings: url,
            callback_function: () => { throw new Error("callback failed"); },
          })).rejects.toThrow(failure === "validation" ? "[1, 2, frames]" : `${failure} failed`);
          // An invalid voice is released right away and not cached; a valid one stays cached.
          expect(dispose.mock.contexts.some((t) => t.dims?.[1] === 3)).toBe(invalid);
          invalid = false;
          await pipe("Try again.", { speaker_embeddings: url });
          expect(fetch).toHaveBeenCalledTimes(failure === "validation" ? 2 : 1);
        } finally { await pipe.dispose(); }
      });
      it("reports failed voice downloads before running the model", async () => {
        const { pipe, flow } = fake_pipeline();
        const fetch = jest.spyOn(env, "fetch")
          .mockResolvedValueOnce(new Response("not found", { status: 404, statusText: "Not Found" }))
          .mockResolvedValueOnce(new Response(voice_file()));
        try {
          await expect(pipe("Hello.", { speaker_embeddings: "https://example.com/missing.safetensors" })).rejects.toThrow("Unable to load Phonon voice: 404 Not Found");
          expect(flow.run).not.toHaveBeenCalled();
          await pipe("Try again.", { speaker_embeddings: "https://example.com/missing.safetensors" });
          expect(fetch).toHaveBeenCalledTimes(2);
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
        const { pipe } = fake_pipeline();
        try {
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
