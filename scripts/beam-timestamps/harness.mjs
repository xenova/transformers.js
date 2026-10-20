// Shared native/browser runner. The caller supplies the branch-local library.
export const fixture = {
  model: "onnx-community/whisper-tiny.en_timestamped",
  revision: "aeaa13760958b03fac5062f457d317d3319c3168",
  audio: "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/542437c29cc5273cfd29e25c77696f2b349badd7/jfk.wav",
};
export async function run(
  lib,
  {
    device = "cpu",
    dtype = "fp32",
    repeats = 3,
    long = false,
    batch = false,
    beams = 2,
    returns = 1,
    groups = 1,
    publicAttentions = false,
    audioBytes = null,
  } = {},
) {
  const { AutoProcessor, WhisperForConditionalGeneration, Tensor, cat } = lib;
  const bytes = audioBytes ?? (await (await fetch(fixture.audio)).arrayBuffer());
  // Decode the pinned stereo PCM16 WAV and deterministically resample to mono 16 kHz.
  const view = new DataView(bytes);
  let offset = 12,
    samples,
    channels,
    rate;
  while (offset + 8 <= view.byteLength) {
    const tag = String.fromCharCode(...new Uint8Array(bytes, offset, 4));
    const size = view.getUint32(offset + 4, true);
    if (tag === "fmt ") {
      if (view.getUint16(offset + 8, true) !== 1 || view.getUint16(offset + 22, true) !== 16) throw Error("Expected PCM16");
      channels = view.getUint16(offset + 10, true);
      rate = view.getUint32(offset + 12, true);
    }
    if (tag === "data") {
      const mono = Float32Array.from({ length: size / (2 * channels) }, (_, i) => {
        let value = 0;
        for (let c = 0; c < channels; ++c) value += view.getInt16(offset + 8 + 2 * (i * channels + c), true) / (32768 * channels);
        return value;
      });
      samples = Float32Array.from({ length: Math.floor((mono.length * 16000) / rate) }, (_, i) => {
        const position = (i * rate) / 16000,
          left = Math.floor(position),
          fraction = position - left;
        return mono[left] * (1 - fraction) + mono[Math.min(left + 1, mono.length - 1)] * fraction;
      });
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!samples) throw Error("Missing PCM data");
  if (long) {
    const repeated = new Float32Array(16000 * 35);
    for (let i = 0; i < repeated.length; ++i) repeated[i] = samples[i % samples.length];
    samples = repeated;
  }
  const processor = await AutoProcessor.from_pretrained(fixture.model, { revision: fixture.revision });
  const model = await WhisperForConditionalGeneration.from_pretrained(fixture.model, {
    revision: fixture.revision,
    device,
    dtype,
    session_options: { intraOpNumThreads: 1, interOpNumThreads: 1 },
  });
  const processed = await processor(samples, { truncation: !long });
  const input = batch ? cat([processed.input_features, processed.input_features], 0) : processed.input_features;
  const options = {
    input_features: input,
    num_beams: beams,
    num_beam_groups: groups,
    diversity_penalty: groups > 1 ? 1 : 0,
    num_return_sequences: returns,
    return_token_timestamps: true,
    return_timestamps: long,
    output_attentions: publicAttentions,
    num_frames: Math.floor(samples.length / 160),
    ...(long ? {} : { max_new_tokens: 64 }),
  };
  // Instrument actual internal attention lifetime, including timestamp-only calls.
  // This measures attention allocations, not total ORT/GPU allocator residency.
  const liveAttentions = new Map();
  let liveAttentionBytes = 0,
    peakAttentionBytes = 0;
  const originalDispose = Tensor.prototype.dispose;
  Tensor.prototype.dispose = function (...args) {
    const bytes = liveAttentions.get(this);
    if (bytes !== undefined) {
      liveAttentionBytes -= bytes;
      liveAttentions.delete(this);
    }
    return originalDispose.apply(this, args);
  };
  const originalForward = model.forward;
  model.forward = async function (...args) {
    const result = await originalForward.apply(this, args);
    for (const [name, tensor] of Object.entries(result)) {
      if (!/^(cross|decoder|encoder)_attentions/.test(name) || liveAttentions.has(tensor)) continue;
      const bytes = tensor.dims.reduce((a, b) => a * b, 1) * ({ float16: 2, float32: 4, float64: 8 }[tensor.type] ?? 4);
      liveAttentions.set(tensor, bytes);
      liveAttentionBytes += bytes;
      peakAttentionBytes = Math.max(peakAttentionBytes, liveAttentionBytes);
    }
    return result;
  };
  const timings = [],
    outputs = [];
  try {
    for (let iteration = -1; iteration < repeats; ++iteration) {
      peakAttentionBytes = liveAttentionBytes;
      const start = performance.now();
      const result = await model.generate(options);
      const elapsed = performance.now() - start;
      console.error(JSON.stringify({ iteration, elapsed_ms: elapsed, memory: typeof process !== "undefined" ? process.memoryUsage() : null }));
      const record = {
        tokens: result.sequences.tolist().map((row) => row.map(Number)),
        timestamps: result.token_timestamps.tolist(),
        beam_indices: result.beam_indices?.tolist().map((row) => row.map(Number)),
        lengths: result.sequence_lengths?.tolist().map(Number),
        retainedAttentionBytes: 0,
        peakInternalAttentionBytes: peakAttentionBytes,
      };
      for (const key of ["cross_attentions", "decoder_attentions", "encoder_attentions"])
        for (const step of result[key] ?? [])
          for (const tensor of step) {
            const data = await tensor.ort_tensor.getData(false);
            record.retainedAttentionBytes += data.byteLength;
            tensor.dispose();
          }
      if (!record.timestamps.flat().every(Number.isFinite)) throw Error("Nonfinite timestamps");
      for (const value of Object.values(result)) if (value instanceof Tensor) value.dispose();
      await result.past_key_values?.dispose();
      record.liveAttentionBytesAfterCleanup = liveAttentionBytes;
      if (liveAttentionBytes !== 0) throw Error(`Attention allocation leak: ${liveAttentionBytes} bytes`);
      if (iteration >= 0) {
        timings.push(elapsed);
        outputs.push(record);
      }
    }
    return {
      fixture,
      requested: { device, dtype, beams, groups, returns, batch, long, repeats },
      timings_ms: timings,
      outputs,
      providerExecutionVerified: false,
      note: "Attach runtime EP profiling / browser GPU trace and driver identity; requested device alone is not execution proof.",
    };
  } finally {
    model.forward = originalForward;
    Tensor.prototype.dispose = originalDispose;
    await model.dispose();
    input.dispose();
    if (input !== processed.input_features) processed.input_features.dispose();
  }
}
