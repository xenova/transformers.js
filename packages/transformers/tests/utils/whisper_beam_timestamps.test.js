import { jest } from "@jest/globals";
import { PreTrainedModel } from "../../src/models/modeling_utils.js";
import { Tensor } from "../../src/utils/tensor.js";
import { WhisperForConditionalGeneration } from "../../src/models/whisper/modeling_whisper.js";
import { BeamSearchScorer } from "../../src/generation/beam_search.js";

const extract = (outputs, frames = 6) => WhisperForConditionalGeneration.prototype._extract_token_timestamps.call({ config: { median_filter_width: 1 } }, outputs, [[0, 0]], frames, 0.02, 2);
const sequences = () => new Tensor("int64", [9n, 8n, 1n, 2n, 3n, 0n, 9n, 8n, 4n, 0n, 0n, 0n], [2, 6]);

it.each([false, true])("reconstructs changing rows, query offsets, EOS and padding (uncached=%s)", (uncached) => {
  const history = [
    [0n, 1n, 0n, 1n, -1n, -1n],
    [2n, 3n, -1n, -1n, -1n, -1n],
  ];
  const steps = Array.from({ length: 4 }, (_, step) => {
    const queries = step === 0 ? 2 : uncached ? 2 + step : 1;
    const data = new Float32Array(4 * queries * 8).fill(-100);
    for (let row = 0; row < 4; ++row) {
      const offset = (row * queries + queries - 1) * 8;
      // Unselected rows and padded frames are intentionally misleading.
      data.fill(500 + row * 10 + step, offset, offset + 8);
      if (step > 0 && row === Number(history[0][step])) {
        data.fill(0, offset, offset + 6);
        data[offset + (step - 1) * 2] = 10;
        data[offset + (step - 1) * 2 + 1] = 10;
      }
    }
    return [new Tensor("float32", data, [4, 1, queries, 8])];
  });
  const result = extract({ sequences: sequences(), cross_attentions: steps, beam_indices: new Tensor("int64", history.flat(), [2, 6]), sequence_lengths: new Tensor("int64", [6n, 4n], [2]), num_beams: 2 }, [6, 4]);
  expect(Array.from(result.data.slice(0, 6))).toEqual([0, 0, 0, Math.fround(0.04), Math.fround(0.08), Math.fround(0.08)]);
  expect(Array.from(result.data.slice(6))).toEqual([0, 0, 0, 0, 0, 0]);
  expect(Array.from(result.data).every(Number.isFinite)).toBe(true);
});

it("converts fp16 attention values numerically and handles constant variance", () => {
  const steps = Array.from({ length: 4 }, (_, i) => [new Tensor("float16", new Uint16Array(12).fill(i % 2 ? 0xbc00 : 0x3c00), [2, 1, 1, 6])]);
  const output = { sequences: sequences(), cross_attentions: steps, sequence_lengths: new Tensor("int64", [6n, 4n], [2]) };
  const half = extract(output);
  const float = extract({ ...output, cross_attentions: steps.map((step) => step.map((t) => t.to("float32"))) });
  expect(half.tolist()).toEqual(float.tolist());
  expect(Array.from(half.data).every(Number.isFinite)).toBe(true);
});

it("snapshots finished EOS ancestry using global diverse-group rows", () => {
  const scorer = new BeamSearchScorer(2, 2, { eos_token_id: 0, decoder_prompt_len: 1 });
  const history = [[4], [5], [12], [13]];
  scorer.process(
    [
      [9n, 1n],
      [9n, 2n],
      [9n, 3n],
      [9n, 4n],
    ],
    [0, 0, 0, 0],
    [0n, 1n, 2n, 0n, 1n, 2n],
    [1, 0, 1, 0, 0, 1],
    [-1, -2, -3, -1, -2, -3],
    history,
    [4, 5, 12, 13],
  );
  history[1][0] = 999;
  expect(scorer._beam_hyps[0].beams[0].beam_indices).toEqual([5, 5]);
  expect(scorer._beam_hyps[1].beams[0].beam_indices).toEqual([12, 12]);
  expect(scorer._beam_hyps[0].beams[0].tokens).toEqual([9n, 2n, 0n]);
});

it.each([
  { batch: 2, returns: 1 },
  { batch: 1, returns: 2 },
])("rejects unsupported seek combinations before forward: %j", async ({ batch, returns }) => {
  const model = Object.assign(Object.create(WhisperForConditionalGeneration.prototype), {
    _prepare_generation_config: () => ({ return_timestamps: true, return_token_timestamps: true, alignment_heads: [[0, 0]], num_return_sequences: returns }),
    _retrieve_init_tokens: () => [9, 8],
    forward: () => {
      throw Error("must not allocate");
    },
  });
  await expect(model.generate({ inputs: new Tensor("float32", new Float32Array(batch * 8), [batch, 1, 8]) })).rejects.toThrow("single input and a single returned sequence");
});

it("keeps tiny cropped recordings finite with the default median window", () => {
  const output = { sequences: new Tensor("int64", [9n, 8n, 1n, 0n], [1, 4]), cross_attentions: [[new Tensor("float32", [1], [1, 1, 1, 1])], [new Tensor("float32", [1], [1, 1, 1, 1])]] };
  const result = WhisperForConditionalGeneration.prototype._extract_token_timestamps.call({ config: { median_filter_width: 7 } }, output, [[0, 0]], 1, 0.02, 2);
  expect(result.tolist()).toEqual([[0, 0, 0, 0]]);
});

it("keeps active ancestry when finalizing at the token limit", () => {
  const scorer = new BeamSearchScorer(1, 2, { decoder_prompt_len: 2, num_return_sequences: 2 });
  const history = [
    [1, 0],
    [0, 1],
  ];
  const results = scorer.finalize_with_scores(
    [
      [9n, 8n, 2n, 3n],
      [9n, 8n, 4n, 5n],
    ],
    [-2, -1],
    history,
  );
  history[1][1] = 99;
  expect(results.map((x) => x.beam_indices)).toEqual([
    [0, 1],
    [1, 0],
  ]);
  expect(results.map((x) => x.tokens.at(-1))).toEqual([5n, 3n]);
});

it.each([false, true])("crops retained seek segments before alignment and releases scratch (failure=%s)", async (fail) => {
  const owned = [];
  const calls = [];
  let segment = 0;
  const forward = jest.spyOn(PreTrainedModel.prototype, "generate").mockImplementation(async () => {
    const ids = segment++ === 0 ? [9n, 100n, 1n, 102n, 102n, 2n, 0n] : [9n, 100n, 2n, 102n, 0n];
    const sequences = new Tensor("int64", ids, [1, ids.length]);
    const attention = new Tensor("float32", [1, 2, 3, 4], [1, 1, 1, 4]);
    owned.push(jest.spyOn(sequences, "dispose"), jest.spyOn(attention, "dispose"));
    return { sequences, cross_attentions: [[attention]] };
  });
  const model = Object.assign(Object.create(WhisperForConditionalGeneration.prototype), {
    config: { max_source_positions: 4 },
    _extract_token_timestamps(outputs, heads, frames) {
      calls.push({ frames, length: Number(outputs.sequence_lengths.data[0]) });
      if (fail) throw Error("alignment failed");
      return new Tensor("float32", new Float32Array(outputs.sequences.dims[1]), outputs.sequences.dims);
    },
  });
  try {
    const result = model._generate_with_seek({ inputs: new Tensor("float32", new Float32Array(8), [1, 1, 8]), generation_config: { no_timestamps_token_id: 99, eos_token_id: 0, return_token_timestamps: true, alignment_heads: [[0, 0]], num_beams: 2 }, init_tokens: [9], kwargs: {} });
    if (fail) await expect(result).rejects.toThrow("alignment failed");
    else {
      const output = await result;
      expect(calls).toEqual([
        { frames: 2, length: 5 },
        { frames: 2, length: 5 },
      ]);
      expect(output.sequences.tolist()).toEqual([[9n, 100n, 1n, 102n, 102n, 2n, 104n, 0n]]);
    }
    for (const dispose of owned) expect(dispose).toHaveBeenCalledTimes(1);
  } finally {
    forward.mockRestore();
  }
});
