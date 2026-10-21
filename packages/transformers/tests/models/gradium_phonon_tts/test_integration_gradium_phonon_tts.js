import { pipeline, GradiumPhononTTSForConditionalGeneration, ModelRegistry } from "../../../src/transformers.js";
import { prepare_phonon_text } from "../../../src/models/gradium_phonon_tts/utils_gradium_phonon_tts.js";

const MODEL_ID = "onnx-community/phonon-31m-en-ONNX";
const REVISION = "608cd31aaa8899e6d14d6f14b424fa084ea25c98";

// Opt-in real ONNX tests (native CPU, not browser/GPU or numerical Python audio parity):
// RUN_PHONON_INTEGRATION=1 pnpm --filter @huggingface/transformers test --runInBand --coverage=false tests/models.test.js -t 'Phonon ONNX integration'
// Defaults to q4. Set PHONON_TEST_DTYPE=auto, fp32, or q4f16 to test another variant.
export default () => {
  (process.env.RUN_PHONON_INTEGRATION === "1" ? describe : describe.skip)("Phonon ONNX integration", () => {
    let tts;
    beforeAll(async () => {
      tts = await pipeline("text-to-speech", MODEL_ID, {
        revision: REVISION, dtype: process.env.PHONON_TEST_DTYPE ?? "q4",
      });
    }, 180_000);
    afterAll(async () => { await tts?.dispose(); });

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
      expect(await ModelRegistry.get_available_dtypes(MODEL_ID, { revision: REVISION })).toEqual(["fp32", "q4", "q4f16"]);
    }, 60_000);

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
    }, 60_000);

    it("uses real custom-voice prefixes and recovers from early return and callback failure", async () => {
      const voice = tts.model.default_voice.clone();
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
    }, 60_000);

    it("loads a safetensors voice URL through the pipeline", async () => {
      const speaker_embeddings = `https://huggingface.co/${MODEL_ID}/resolve/${REVISION}/default-voice.safetensors`;
      for (const voice of [speaker_embeddings, new URL(speaker_embeddings)]) {
        const output = await tts("Hello.", { speaker_embeddings: voice, temperature: 0 });
        expect(output.audio.length).toBeGreaterThan(0);
        expect(output.audio.every(Number.isFinite)).toBe(true);
      }
    }, 60_000);
  });
};
