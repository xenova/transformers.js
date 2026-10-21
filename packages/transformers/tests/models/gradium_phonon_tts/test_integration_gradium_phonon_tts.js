import { pipeline, GradiumPhononTTSForConditionalGeneration, ModelRegistry, load_phonon_voice } from "../../../src/transformers.js";

const MODEL_ID = "onnx-community/phonon-31m-en-ONNX";
const REVISION = "147b180afe11ddb7d1ee32553f2e1578ff31f970";

// Downloads real ONNX weights only when explicitly enabled. See README.md in
// this directory for the command and the optional dtype matrix.
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
      const [prompt] = tts.model.prepare_text(text, tts.tokenizer);
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
      const voice = await load_phonon_voice(MODEL_ID, "default-voice.safetensors", { revision: REVISION });
      try {
        const [prompt] = tts.model.prepare_text("Hello.", tts.tokenizer);
        for await (const pcm of tts.model.generate_speech({ ...prompt, speaker_embeddings: voice, temperature: 0 })) {
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
  });
};
