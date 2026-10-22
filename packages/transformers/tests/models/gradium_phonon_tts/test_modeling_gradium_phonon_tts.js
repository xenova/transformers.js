import { jest } from "@jest/globals";
import { Tensor as ORTTensor } from "onnxruntime-node";
import { env, pipeline, ModelRegistry, PretrainedConfig, Tensor, TextToAudioPipeline, GradiumPhononTTSForConditionalGeneration } from "../../../src/transformers.js";
import { prepare_phonon_text } from "../../../src/models/gradium_phonon_tts/utils_gradium_phonon_tts.js";
import { get_model_files } from "../../../src/utils/model_registry/get_model_files.js";
import { selectDtype } from "../../../src/utils/dtypes.js";
import { create_tokenizer } from "./tokenizer_fixture.js";
import { MAX_MODEL_LOAD_TIME, MAX_TEST_EXECUTION_TIME, MAX_MODEL_DISPOSE_TIME } from "../../init.js";

const MODEL_ID = "onnx-community/phonon-31m-en-ONNX";

const dtype_config = { dtype: "fp32" };
const phonon = {
  voice_dim: 2,
  latent_dim: 2,
  sample_rate: 24000,
  frame_rate: 12.5,
  temperature: 0.3,
  eos_threshold: 4,
  max_tokens_per_chunk: 50,
  default_voice: "https://example.com/default.bin",
  conditions: { num_speakers: { default: "2" }, duration_delta: { default: 0.5 } },
  flow_lm: { num_layers: 1, num_heads: 1, head_dim: 2 },
  mimi_decoder: { num_layers: 1, num_heads: 1, head_dim: 2, conv_states: { "past_conv.test": [1, 2, 1] } },
};
const config = () => new PretrainedConfig({ model_type: "gradium_phonon_tts", phonon, "transformers.js_config": dtype_config });
const url = "https://example.com/voice.bin";
// Phonon voice files are raw float32 data in [1, voice_dim, frames] order.
const voice_file = (values = [0.25, -0.5]) => new Response(new Float32Array(values).buffer);

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
  const fetch = jest.spyOn(env, "fetch").mockImplementation(async () => voice_file());
  const pipe = new TextToAudioPipeline({ model, tokenizer: create_tokenizer() });
  // Voice-conditioning runs are the only flow runs with voice frames.
  const voice_runs = () => flow.run.mock.calls.map(([inputs], i) => ({ inputs, i })).filter(({ inputs }) => inputs.voice_latents.dims[2] > 0);
  const prefix = async (n = 0) => (await flow.run.mock.results[voice_runs()[n].i].value)["present.0.key"];
  return { pipe, model, flow, decoder, fetch, steps, voice_runs, prefix };
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
    ])("lists both graphs for %j", async (options, suffix) => {
      expect(await get_model_files("unused", { config: config(), ...options })).toEqual(["config.json", `onnx/flow_lm${suffix}.onnx`, `onnx/mimi_decoder${suffix}.onnx`]);
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

    describe("generation", () => {
      it("streams frames with the checkpoint's default voice and frees each call's prefix", async () => {
        const { pipe, fetch, steps, voice_runs, prefix } = fake_pipeline();
        let callbacks = 0;
        try {
          const result = await pipe("Hello.", { temperature: 0, callback_function: () => callbacks++ });
          // EOS on the first frame, then a 3-frame tail for short texts.
          expect(callbacks).toBe(4);
          expect(Array.from(result.audio)).toEqual([0.25, -0.5, 0.25, -0.5, 0.25, -0.5, 0.25, -0.5]);
          expect(steps.every(({ noise }) => noise.every((value) => value === 0))).toBe(true);
          expect(fetch).toHaveBeenCalledWith(phonon.default_voice);
          await pipe("Hello.");
          // Nothing is cached: every call loads and conditions its voice.
          expect(fetch).toHaveBeenCalledTimes(2);
          expect(voice_runs()).toHaveLength(2);
          for (const n of [0, 1]) await expect(prefix(n).then((p) => p.data)).rejects.toThrow("disposed");
        } finally {
          await pipe.dispose();
        }
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
      it("reshapes flat voice data from URLs and arrays", async () => {
        const { pipe, fetch, voice_runs } = fake_pipeline();
        fetch.mockImplementation(async () => voice_file([1, 2, 3, 4]));
        try {
          for (const speaker_embeddings of [url, new URL(url), new Float32Array([1, 2, 3, 4])]) {
            expect((await pipe("Hello.", { speaker_embeddings })).audio.length).toBeGreaterThan(0);
          }
          expect(fetch).toHaveBeenCalledTimes(2);
          for (const { inputs } of voice_runs()) {
            expect(inputs.voice_latents.dims).toEqual([1, 2, 2]);
            expect(Array.from(inputs.voice_latents.data)).toEqual([1, 2, 3, 4]);
          }
        } finally { await pipe.dispose(); }
      });
      it("reports failed voice downloads before running the model", async () => {
        const { pipe, flow, fetch } = fake_pipeline();
        fetch.mockResolvedValueOnce(new Response("not found", { status: 404, statusText: "Not Found" }));
        try {
          await expect(pipe("Hello.", { speaker_embeddings: url })).rejects.toThrow("Unable to load speaker embeddings: 404 Not Found");
          expect(flow.run).not.toHaveBeenCalled();
          await pipe("Try again.", { speaker_embeddings: url });
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
      it("rejects voice data that does not fit [1, voice_dim, frames]", async () => {
        const { pipe } = fake_pipeline();
        try {
          for (const speaker_embeddings of [new Float32Array(3), new Float32Array(0), new Tensor("int64", [1n, 2n], [2])]) {
            await expect(pipe("Hello.", { speaker_embeddings })).rejects.toThrow("[1, 2, frames]");
          }
          await expect(pipe("Hello.", { speaker_embeddings: {} })).rejects.toThrow("must be a `Tensor`");
        } finally {
          await pipe.dispose();
        }
      });
    });
    describe(`${MODEL_ID} (q4)`, () => {
      let tts;
      beforeAll(async () => {
        tts = await pipeline("text-to-speech", MODEL_ID, { dtype: "q4" });
      }, MAX_MODEL_LOAD_TIME);
      afterAll(async () => { await tts?.dispose(); }, MAX_MODEL_DISPOSE_TIME);

      it("loads the native architecture and the published graph/state interfaces", () => {
        expect(tts.model).toBeInstanceOf(GradiumPhononTTSForConditionalGeneration);
        expect(tts.model.config.model_type).toBe("gradium_phonon_tts");
        const { flow_lm, mimi_decoder } = tts.model.sessions;
        expect(flow_lm.inputNames).toEqual(expect.arrayContaining(["text_ids", "voice_latents", "latent", "noise", "num_speakers", "duration_delta"]));
        expect(flow_lm.outputNames).toEqual(expect.arrayContaining(["latent_out", "eos_logit"]));
        expect(mimi_decoder.inputNames).toEqual(expect.arrayContaining(["latent", "past_offset", ...Object.keys(tts.model.config.phonon.mimi_decoder.conv_states)]));
        expect(mimi_decoder.outputNames).toEqual(expect.arrayContaining(["audio", "present_offset"]));
        for (const session of [flow_lm, mimi_decoder]) {
          const state_names = session.outputNames.filter((name) => name.startsWith("present"));
          expect(state_names.length).toBeGreaterThan(0);
          for (const name of state_names) {
            expect(session.inputNames).toContain(name.replace("present.", "past_key_values.").replace("present_", "past_"));
          }
        }
      });

      it("discovers all complete mixed-precision variants", async () => {
        expect(await ModelRegistry.get_available_dtypes(MODEL_ID)).toEqual(["fp32", "q4", "q4f16"]);
      }, MAX_TEST_EXECUTION_TIME);

      it("streams finite 24 kHz frames, stops on EOS and repeats deterministically", async () => {
        const text = "Hello from Phonon.";
        const frames = [];
        const output = await tts(text, { temperature: 0, callback_function: (chunk) => { frames.push(chunk); } });
        const [prompt] = prepare_phonon_text(tts.tokenizer, text, tts.model.config.phonon.max_tokens_per_chunk);
        const max_frames = Math.ceil((prompt.input_ids.length / 3 + 2) * tts.model.config.phonon.frame_rate);
        expect(frames.length).toBeGreaterThan(1);
        expect(frames.length).toBeLessThan(max_frames);
        expect(output.sampling_rate).toBe(24000);
        expect(output.audio.length).toBe(frames.length * 1920);
        expect(output.audio.every(Number.isFinite)).toBe(true);
        expect(output.audio.some((sample) => Math.abs(sample) > 0.01)).toBe(true);
        for (const [index, chunk] of frames.entries()) {
          expect(chunk.sampling_rate).toBe(24000);
          expect(chunk.audio.length).toBe(1920);
          expect(output.audio.slice(index * 1920, (index + 1) * 1920)).toEqual(chunk.audio);
        }
        expect((await tts(text, { temperature: 0 })).audio).toEqual(output.audio);
      }, MAX_TEST_EXECUTION_TIME);

      it("uses real custom-voice prefixes and recovers from early return and callback failure", async () => {
        const { voice_dim, default_voice } = tts.model.config.phonon;
        const data = new Float32Array(await (await fetch(default_voice)).arrayBuffer());
        const voice = new Tensor("float32", data, [1, voice_dim, data.length / voice_dim]);
        try {
          const chunks = prepare_phonon_text(tts.tokenizer, "Hello.", tts.model.config.phonon.max_tokens_per_chunk);
          for await (const pcm of tts.model.generate_speech({ chunks, speaker_embeddings: voice, temperature: 0 })) {
            expect(pcm.length).toBe(1920);
            break;
          }
          await expect(tts("Hello.", { speaker_embeddings: voice, callback_function: () => { throw new Error("stop playback"); } })).rejects.toThrow("stop playback");
          const output = await tts(["Hello.", "Goodbye."], { speaker_embeddings: voice, temperature: 0 });
          expect(output).toHaveLength(2);
          expect(output.every((audio) => audio.audio.length > 0 && audio.audio.every(Number.isFinite))).toBe(true);
          expect(voice.data.length).toBeGreaterThan(0);
        } finally { voice.dispose(); }
      }, MAX_TEST_EXECUTION_TIME);

      it("loads a flat voice URL through the pipeline", async () => {
        const speaker_embeddings = `https://huggingface.co/${MODEL_ID}/resolve/main/voices/LMDIYE0Oa377Qh6Z.bin`;
        for (const voice of [speaker_embeddings, new URL(speaker_embeddings)]) {
          const output = await tts("Hello.", { speaker_embeddings: voice, temperature: 0 });
          expect(output.audio.length).toBeGreaterThan(0);
          expect(output.audio.every(Number.isFinite)).toBe(true);
        }
      }, MAX_TEST_EXECUTION_TIME);
    });
  });
};
