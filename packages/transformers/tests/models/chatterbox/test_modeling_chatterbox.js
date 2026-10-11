import { ChatterboxModel, PretrainedConfig, Tensor } from "../../../src/transformers.js";
import { GenerationConfig } from "../../../src/generation/configuration_utils.js";

const START_SPEECH_TOKEN = 6561n;
const HIDDEN_SIZE = 4;
const NUM_AUDIO_FEATURES = 2;
const VOCAB_SIZE = 4;

/**
 * Creates a mocked ONNX Runtime session which records its (converted) inputs and computes its outputs with `fn`.
 * @param {string[]} inputNames
 * @param {(inputs: Record<string, Tensor>) => Record<string, Tensor>} fn
 * @param {Object[]} [inputMetadata]
 */
function mock_session(inputNames, fn, inputMetadata = []) {
  const calls = [];
  return {
    inputNames,
    outputNames: [],
    inputMetadata,
    calls,
    async run(feed) {
      const inputs = Object.fromEntries(Object.entries(feed).map(([k, v]) => [k, new Tensor(v.type, v.data, v.dims)]));
      calls.push(inputs);
      return fn(inputs);
    },
  };
}

/**
 * Builds a `ChatterboxModel` whose sessions are deterministic mocks:
 * - `embed_tokens` embeds token `t` at position `i` as `[t, i, exaggeration, 1]`.
 * - `speech_encoder` returns constant speaker conditioning.
 * - `model` returns per-row logits (row 0: conditional, row 1: unconditional) and a cache whose
 *   sequence length grows with the attention mask, so that its batch size can be checked.
 */
function create_model() {
  const config = new PretrainedConfig({
    model_type: "chatterbox",
    text_config: {
      model_type: "llama",
      num_hidden_layers: 1,
      num_attention_heads: 1,
      num_key_value_heads: 1,
      hidden_size: HIDDEN_SIZE,
    },
  });

  const embed_tokens = mock_session(["input_ids", "exaggeration"], ({ input_ids, exaggeration }) => {
    const [batch_size, seq_length] = input_ids.dims;
    const data = new Float32Array(batch_size * seq_length * HIDDEN_SIZE);
    for (let b = 0; b < batch_size; ++b) {
      for (let i = 0; i < seq_length; ++i) {
        const offset = (b * seq_length + i) * HIDDEN_SIZE;
        data.set([Number(input_ids.data[b * seq_length + i]), i, exaggeration.data[b], 1], offset);
      }
    }
    return { inputs_embeds: new Tensor("float32", data, [batch_size, seq_length, HIDDEN_SIZE]) };
  });

  const speech_encoder = mock_session(["audio_values"], () => ({
    audio_features: new Tensor(
      "float32",
      Float32Array.from({ length: NUM_AUDIO_FEATURES * HIDDEN_SIZE }, (_, i) => 100 + i),
      [1, NUM_AUDIO_FEATURES, HIDDEN_SIZE],
    ),
    audio_tokens: new Tensor("int64", new BigInt64Array([7n, 8n]), [1, 2]),
    speaker_embeddings: new Tensor("float32", new Float32Array(3), [1, 3]),
    speaker_features: new Tensor("float32", new Float32Array(2 * 5), [1, 2, 5]),
  }));

  const cache_metadata = ["key", "value"].map((x) => ({
    name: `past_key_values.0.${x}`,
    isTensor: true,
    type: "float32",
    shape: ["batch_size", 1, "past_sequence_length", 1],
  }));
  const model = mock_session(
    ["inputs_embeds", "attention_mask", "past_key_values.0.key", "past_key_values.0.value"],
    ({ inputs_embeds, attention_mask }) => {
      const [batch_size, seq_length] = inputs_embeds.dims;
      // Greedy decoding picks token 2 from either row alone, but token 1 after CFG with `guidance_scale=1.5`:
      // uncond + 1.5 * (cond - uncond) = [0, 1.5, 1, 0]
      const row_logits = [
        [0, 1, 2, 0], // conditional
        [0, 0, 4, 0], // unconditional
      ];
      const logits = new Float32Array(batch_size * seq_length * VOCAB_SIZE);
      for (let b = 0; b < batch_size; ++b) {
        for (let i = 0; i < seq_length; ++i) {
          logits.set(row_logits[b], (b * seq_length + i) * VOCAB_SIZE);
        }
      }
      const total_length = attention_mask.dims[1];
      const present = () => new Tensor("float32", new Float32Array(batch_size * total_length), [batch_size, 1, total_length, 1]);
      return {
        logits: new Tensor("float32", logits, [batch_size, seq_length, VOCAB_SIZE]),
        "present.0.key": present(),
        "present.0.value": present(),
      };
    },
    cache_metadata,
  );

  const conditional_decoder = mock_session(["speech_tokens", "speaker_features", "speaker_embeddings"], ({ speech_tokens }) => ({
    waveform: new Tensor("float32", new Float32Array(speech_tokens.dims[1]), [1, speech_tokens.dims[1]]),
  }));

  const sessions = { embed_tokens, speech_encoder, model, conditional_decoder };
  const generation_config = new GenerationConfig({ eos_token_id: 3, pad_token_id: 0 });
  return { model: new ChatterboxModel(config, sessions, { generation_config }), sessions };
}

/**
 * Returns the hidden state of a (batch, position) pair of a `[batch_size, seq_length, hidden_size]` tensor.
 * @param {Tensor} tensor
 * @param {number} b
 * @param {number} i
 */
function hidden_state(tensor, b, i) {
  const [, seq_length, hidden_size] = tensor.dims;
  const offset = (b * seq_length + i) * hidden_size;
  return Array.from(tensor.data.subarray(offset, offset + hidden_size));
}

export default () => {
  describe("ChatterboxModel (classifier-free guidance)", () => {
    // Three text tokens followed by the start of speech token
    const input_ids = new Tensor("int64", new BigInt64Array([255n, 11n, 22n, START_SPEECH_TOKEN]), [1, 4]);
    const prompt_length = input_ids.dims[1];
    const prefill_length = NUM_AUDIO_FEATURES + prompt_length;
    const audio_values = new Tensor("float32", new Float32Array(16), [1, 16]);
    const exaggeration = 0.25;
    const max_new_tokens = 3;

    let sessions;
    let waveform;
    beforeAll(async () => {
      let model;
      ({ model, sessions } = create_model());
      waveform = await model.generate({
        input_ids,
        audio_values,
        exaggeration,
        guidance_scale: 1.5,
        max_new_tokens,
        do_sample: false,
      });
    });

    it("embeds a single (user-visible) row", () => {
      const { calls } = sessions.embed_tokens;
      expect(calls).toHaveLength(max_new_tokens);
      expect(calls[0].input_ids.dims).toEqual([1, prompt_length]);
      for (const call of calls.slice(1)) {
        expect(call.input_ids.dims).toEqual([1, 1]);
      }
    });

    it("runs a two-row prefill", () => {
      const { inputs_embeds, attention_mask } = sessions.model.calls[0];
      expect(inputs_embeds.dims).toEqual([2, prefill_length, HIDDEN_SIZE]);
      expect(attention_mask.dims).toEqual([2, prefill_length]);
      expect(Array.from(attention_mask.data)).toEqual(new Array(2 * prefill_length).fill(1n));
    });

    it("keeps the conditional row unchanged", () => {
      const { inputs_embeds } = sessions.model.calls[0];
      for (let i = 0; i < prompt_length; ++i) {
        expect(hidden_state(inputs_embeds, 0, NUM_AUDIO_FEATURES + i)).toEqual([Number(input_ids.data[i]), i, exaggeration, 1]);
      }
    });

    it("zeroes only the text token embeddings of the unconditional row", () => {
      const { inputs_embeds } = sessions.model.calls[0];
      for (let i = 0; i < prompt_length; ++i) {
        const position = NUM_AUDIO_FEATURES + i;
        if (input_ids.data[i] < START_SPEECH_TOKEN) {
          expect(hidden_state(inputs_embeds, 1, position)).toEqual(new Array(HIDDEN_SIZE).fill(0));
        } else {
          // Speech tokens (and the exaggeration they carry) are shared by both rows
          expect(hidden_state(inputs_embeds, 1, position)).toEqual(hidden_state(inputs_embeds, 0, position));
        }
      }
    });

    it("retains the speaker conditioning in both rows", () => {
      const { inputs_embeds } = sessions.model.calls[0];
      expect(sessions.speech_encoder.calls).toHaveLength(1);
      for (let i = 0; i < NUM_AUDIO_FEATURES; ++i) {
        const expected = Array.from({ length: HIDDEN_SIZE }, (_, j) => 100 + i * HIDDEN_SIZE + j);
        expect(hidden_state(inputs_embeds, 0, i)).toEqual(expected);
        expect(hidden_state(inputs_embeds, 1, i)).toEqual(expected);
      }
    });

    it("feeds the sampled token to both rows during generation", () => {
      const steps = sessions.model.calls.slice(1);
      expect(steps).toHaveLength(max_new_tokens - 1);
      for (let s = 0; s < steps.length; ++s) {
        const { inputs_embeds } = steps[s];
        expect(inputs_embeds.dims).toEqual([2, 1, HIDDEN_SIZE]);
        expect(hidden_state(inputs_embeds, 1, 0)).toEqual(hidden_state(inputs_embeds, 0, 0));
        // The token selected by the guided logits (1) is the one fed back
        expect(hidden_state(inputs_embeds, 0, 0)[0]).toEqual(1);
      }
    });

    it("keeps a two-row cache and attention mask", () => {
      const calls = sessions.model.calls;
      // Empty cache created for the prefill
      expect(calls[0]["past_key_values.0.key"].dims).toEqual([2, 1, 0, 1]);
      for (let s = 1; s < calls.length; ++s) {
        const past_length = prefill_length + s - 1;
        expect(calls[s]["past_key_values.0.key"].dims).toEqual([2, 1, past_length, 1]);
        expect(calls[s]["past_key_values.0.value"].dims).toEqual([2, 1, past_length, 1]);
        expect(calls[s].attention_mask.dims).toEqual([2, past_length + 1]);
      }
    });

    it("reduces the output back to the user-visible batch size", () => {
      const [{ speech_tokens }] = sessions.conditional_decoder.calls;
      // audio tokens + new tokens (minus the last one) + 3 silence tokens
      expect(speech_tokens.dims).toEqual([1, 2 + max_new_tokens - 1 + 3]);
      expect(Array.from(speech_tokens.data)).toEqual([7n, 8n, 1n, 1n, 4299n, 4299n, 4299n]);
      expect(waveform.dims).toEqual([1, speech_tokens.dims[1]]);
    });
  });
};
