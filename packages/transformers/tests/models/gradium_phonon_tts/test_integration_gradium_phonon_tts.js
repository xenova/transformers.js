import { pipeline, AutoModelForTextToWaveform, GradiumPhononTTSForConditionalGeneration, RawAudio, ModelRegistry, load_phonon_voice } from "../../../src/transformers.js";
import { prepare_phonon_text } from "../../../src/models/gradium_phonon_tts/utils_gradium_phonon_tts.js";

// Golden outputs from Python's actual PocketTTSProcessor.split_text method and
// apply_chat_template(chunk) and the Rust tokenizers backend. These nested ID
// arrays are the final model inputs after re-normalizing each decoded chunk.
const PYTHON_TEXT_CASES = [
  { text: "it’s “Hello” — see you 🚀…", max_tokens: 50, input_ids: [[735, 664, 662, 660, 3915, 1966, 916, 987, 3915, 775, 669, 663]], chunks: ['It\'s "Hello" see you.'] },
  { text: "hello (world); see you 🚀", max_tokens: 50, input_ids: [[3248, 661, 956, 661, 775, 669, 663]], chunks: ["Hello, world, see you."] },
  { text: "“Hello” — it’s here…", max_tokens: 50, input_ids: [[660, 3915, 1966, 916, 987, 3915, 675, 664, 662, 808, 663]], chunks: ['"Hello" it\'s here.'] },
  {
    text: "Hello. Goodbye. Nice.",
    max_tokens: 8,
    input_ids: [
      [3248, 663, 2199, 1846, 738, 663],
      [1136, 1314, 663],
    ],
    chunks: ["Hello. Goodbye.", "Nice."],
  },
  {
    text: "price 3.5. Next sentence.",
    max_tokens: 8,
    input_ids: [
      [2369, 1314, 660, 873, 663, 856, 663],
      [3796, 1896, 986, 663],
    ],
    chunks: ["Price 3.5.", "Next sentence."],
  },
  {
    text: "One, two, three, four, five, six.",
    max_tokens: 6,
    input_ids: [
      [1510, 661, 845, 661, 948, 661],
      [2458, 939, 661, 1094, 661, 1294, 663],
    ],
    chunks: ["One, two, three,", "Four, five, six."],
  },
  { text: "supercalifragilisticexpialidocious", max_tokens: 5, input_ids: [[3144, 1206, 878, 3070, 1325, 932, 2215, 2438, 1642, 734, 1021, 805, 2698, 663]], chunks: ["Supercalifragilisticexpialidocious."] },
  {
    text: "Hi!!! Bye?? Next...",
    max_tokens: 5,
    input_ids: [
      [2048, 1367, 1367, 1367],
      [2561, 738, 691, 691],
      [3796, 663],
    ],
    chunks: ["Hi!!!", "Bye??", "Next."],
  },
  {
    text: "hello. goodbye.",
    max_tokens: 4,
    input_ids: [
      [3248, 663],
      [2199, 1846, 738, 663],
    ],
    chunks: ["Hello.", "Goodbye."],
  },
];

// Opt-in only: RUN_PHONON_INTEGRATION=1 pnpm test --runInBand tests/models.test.js -t gradium_phonon_tts
export default () => {
  (process.env.RUN_PHONON_INTEGRATION === "1" ? describe : describe.skip)("Phonon ONNX integration", () => {
    let tts;
    beforeAll(async () => {
      tts = await pipeline("text-to-speech", "onnx-community/phonon-31m-en-ONNX", { dtype: "q4" });
    }, 120_000);
    afterAll(async () => {
      await tts?.dispose();
    });

    it("loads native metadata through the text-to-waveform auto class", () => {
      expect(AutoModelForTextToWaveform.supports("gradium_phonon_tts")).toBe(true);
      expect(tts.model).toBeInstanceOf(GradiumPhononTTSForConditionalGeneration);
      expect(tts.model.config.model_type).toBe("gradium_phonon_tts");
      expect(tts.model.sessions.flow_lm).toBeDefined();
      expect(tts.model.sessions.mimi_decoder).toBeDefined();
    });

    it("discovers mixed-precision model variants", async () => {
      expect(await ModelRegistry.get_available_dtypes("onnx-community/phonon-31m-en-ONNX")).toEqual(["fp32", "q4", "q4f16"]);
    }, 60_000);

    it.each(PYTHON_TEXT_CASES)("matches Python normalization and chunking: $text", ({ text, max_tokens, input_ids, chunks }) => {
      const prepared = prepare_phonon_text(tts.tokenizer, text, max_tokens);
      expect(prepared.map((chunk) => chunk.input_ids)).toEqual(input_ids);
      expect(prepared.map((chunk) => tts.tokenizer.decode(chunk.input_ids).trim())).toEqual(chunks);
    });

    it("uses an explicitly loaded, caller-owned voice tensor", async () => {
      const voice = await load_phonon_voice("onnx-community/phonon-31m-en-ONNX");
      try {
        const output = await tts("Hello.", { speaker_embeddings: voice, temperature: 0 });
        expect(output.audio.length).toBeGreaterThan(0);
        expect(output.audio.every(Number.isFinite)).toBe(true);
        expect(voice.dims[1]).toBe(512);
      } finally {
        voice.dispose();
      }
    }, 60_000);

    it("streams 24 kHz audio matching the final waveform and repeats deterministically", async () => {
      const frames = [];
      const output = await tts("Hello from Phonon.", {
        temperature: 0,
        callback_function: async (chunk) => {
          frames.push(chunk.audio);
        },
      });
      expect(output).toBeInstanceOf(RawAudio);
      expect(output.sampling_rate).toBe(24000);
      expect(frames.length).toBeGreaterThan(1);
      expect(frames.every((frame) => frame.length === 1920)).toBe(true);
      expect(output.audio.length).toBe(frames.length * 1920);
      expect(output.audio.every(Number.isFinite)).toBe(true);
      expect(output.audio.some((value) => Math.abs(value) > 0.01)).toBe(true);
      let offset = 0;
      for (const frame of frames) {
        expect(output.audio.slice(offset, offset + frame.length)).toEqual(frame);
        offset += frame.length;
      }
      const repeated = await tts("Hello from Phonon.", { temperature: 0 });
      expect(repeated.audio).toEqual(output.audio);
    }, 60_000);

    it("accepts text batches and recovers after interrupted streaming", async () => {
      await expect(
        tts("Hello.", {
          callback_function: () => {
            throw new Error("stop playback");
          },
        }),
      ).rejects.toThrow("stop playback");
      const output = await tts(["Hello.", "Goodbye."], { temperature: 0 });
      expect(output).toHaveLength(2);
      expect(output.every((audio) => audio.audio.length > 0 && audio.audio.every(Number.isFinite))).toBe(true);
    }, 60_000);
  });
};
