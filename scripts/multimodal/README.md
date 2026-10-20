# Multimodal generation validation

This branch adds prepared image/audio prefill to generation. It does not implement
beam timestamp ancestry. Hardware execution and two post-implementation reviews
are still required. `fixtures.json` records cached tiny-model files and SHA-256s;
the ONNX hashes were checked against the pinned Hub revisions in `cases.js`.

## Native

From the repository root, using this checkout's dependencies/build:

```sh
node scripts/multimodal/run.mjs '{"family":"llava","device":"cpu","dtype":"fp32","session_options":{"intraOpNumThreads":1}}' > result.json
```

`family`: `llava`, `idefics3`, `qwen2_vl`, `smolvlm`, or `ultravox`.
Defaults use immutable revisions. To use an already verified cache without
copying it, pass `model_path` pointing at the directory containing config.json
and onnx/. Local paths bypass revision lookup; check their hashes first.
`model_id`, `revision`, `dtype` (string or per-component object), `device`,
`cache_dir`, `local_files_only`, `session_options`, `beams`, `max_new_tokens`,
`ragged`, and `repeats` are configurable. `ragged:true` exercises one versus two
images per input. Default `repeats:25`; initial comparisons warm up inference.
JSON includes token/rank comparisons, encoder invocation counts, timings,
output tensor locations, runtime, and commit. A failed comparison exits nonzero.
The default sample is synthetic black/white/gray images or 440/880 Hz audio.

Quantized exported audio fixture (~1.52 GB):

```sh
node scripts/multimodal/run.mjs '{"family":"ultravox","dtype":{"embed_tokens":"int8","audio_encoder":"q4","decoder_model_merged":"q4"},"session_options":{"intraOpNumThreads":1}}' > audio.json
```

SmolVLM2 image-only fixture (~180 MB):

```sh
node scripts/multimodal/run.mjs '{"family":"smolvlm","dtype":{"embed_tokens":"int8","vision_encoder":"q4","decoder_model_merged":"q4"},"ragged":true,"session_options":{"intraOpNumThreads":1}}' > smolvlm.json
```

The exported Ultravox processor does not batch raw audio. The harness processes
examples independently and collates equal-length tensors. Variable-duration
padded audio requires encoder-specific frame lengths; it is not established by
these equal-duration tests. Gemma3n and other custom audio families remain guarded.

## Browser matrix

Use the existing `scripts/beam-gpu` build/runner (including its Playwright and
browser setup). Build this branch's browser bundle; do not reuse another branch's
app.js. For example, with a configured runner directory:

```sh
BEAM_APP_OUT="$BEAM_RUNNER_ROOT/app.js" node scripts/beam-gpu/build.mjs
BEAM_OPTIONS='{"mode":"multimodal","family":"qwen2_vl","device":"webgpu","dtype":"fp32","ragged":true}' node scripts/beam-gpu/runner.mjs
```

The same cases run through `window.runBeamGPU`. Use `device:"wasm"` for WASM,
`device:"webgpu"` for WebGPU, and `dtype:"fp16"` or a component dtype map for
half precision. The existing runner supplies ORT WASM assets and a revision-aware
Hub proxy. Keep driver/adapter/ORT execution profiles with JSON. Adapter identity,
shader-f16, selected device, and tensor locations alone are not proof that every
model component executed on the intended hardware. No browser/GPU claim is made
by native CPU results.

## Regression tests

```sh
pnpm --filter @huggingface/transformers test --runInBand --coverage=false tests/utils/multimodal_generation.test.js tests/utils/beam_ownership.test.js tests/multimodal_integration.test.js
pnpm test --runInBand --coverage=false --setupFiles ../../scripts/multimodal/offline-tests.js
pnpm --filter @huggingface/transformers build
pnpm --filter @huggingface/transformers docs-generate
```

The optional full-suite setup disables downloads and caps native session threads;
it does not mock model computation. Missing cached fixtures remain failures.
Tiny-model batch comparisons use the same left-padded sequence shape for the
independent baseline. Unpadded Idefics3 tiny-random execution showed lower-rank
beam differences under native default threading; do not represent that check as
an exact-token pass. Real integrations also test ragged image groups, cached
continuation, supplied embeddings, diverse search, and seeded beam sampling.
