# Beam timestamp validation

This branch changes only beam ancestry and Whisper timestamp reconstruction. It does not enable decoder-only multimodal beams. Base: `b65dfaff9ca5e7e518c6e99f1d84f7453efd27c1`.

## Output contract

With `return_dict_in_generate`, beam generation returns:

- `cross_attentions`, `decoder_attentions`, `encoder_attentions` when requested: the existing **step → layer → tensor** layout. Tensor row indices are the global forward rows (`input * num_beams + beam`), including diverse groups. Returned attention tensors remain caller-owned and readable until disposed.
- `beam_indices`: int64 `[returned_sequences, padded_sequence_length]`. Column **zero means the first generated token**, not the first prefix token. Each entry identifies the parent forward row for that step, including the step selecting EOS. Unused columns are `-1`.
- `sequence_lengths`: int64 valid lengths including prefix and EOS. Padding is not aligned.

Whisper reconstructs the selected ancestry before computing statistics. First-forward prefix queries are excluded before normalization and DTW, matching Python Transformers v4.57.1. Later forwards contribute the final query (the preceding generated token), for cached and uncached decoders. The final generated token has no query and repeats the last aligned boundary; padding timestamps are zero. fp16 storage is numerically converted to fp32. Constant variance produces zero normalized weights. Recordings with at most half the median window in frames skip median filtering, matching Python; the general median-filter implementation is unchanged.

Public `num_frames` is a mel-frame count (10 ms), scalar or per input. Alignment uses `floor(num_frames / 2)` encoder frames (20 ms). Short-form batch and multiple returns are supported with `max_new_tokens`. Seek mode supports one input and one return; other combinations fail before encoding. Seek mode currently rejects explicit public attention output because its concatenated transcript does not have a single encoder/attention time axis. Internal seek attentions are released after alignment.

## Pinned fixtures

- `onnx-community/whisper-tiny.en_timestamped` at `aeaa13760958b03fac5062f457d317d3319c3168`, with real `encoder_model.onnx` and `decoder_model_merged.onnx` exports; fp16 uses their `_fp16.onnx` counterparts. The export includes alignment heads.
- `Xenova/transformers.js-docs/jfk.wav` at dataset revision `542437c29cc5273cfd29e25c77696f2b349badd7`.
- The shared harness decodes PCM16, averages channels, and linearly resamples to 16 kHz identically in Node and browsers. Long audio is exactly 35 seconds of this waveform repeated. No microphone or variable input is used.

## Native

From this worktree, after `pnpm install --offline --frozen-lockfile` (use a frozen network install only if the store is incomplete):

```sh
pnpm --filter @huggingface/transformers build
node scripts/beam-timestamps/native.mjs '{"device":"cpu","dtype":"fp32","batch":true,"returns":2,"repeats":3}' > scripts/beam-timestamps/results/native-cpu.json
node scripts/beam-timestamps/native.mjs '{"device":"cpu","dtype":"fp32","returns":2,"repeats":3}' > scripts/beam-timestamps/results/native-single.json
node scripts/beam-timestamps/native.mjs '{"device":"cpu","dtype":"fp32","batch":true,"returns":2,"beams":4,"groups":2,"publicAttentions":true,"repeats":25}' > scripts/beam-timestamps/results/native-diverse.json
node scripts/beam-timestamps/native.mjs '{"device":"cpu","dtype":"fp32","long":true,"repeats":3}' > scripts/beam-timestamps/results/native-long.json
node scripts/beam-timestamps/verify-results.mjs "$(git rev-parse HEAD)"
```

`TIMESTAMP_AUDIO` can point to the pinned WAV. `TIMESTAMP_CACHE` sets a cache directory; default is branch-local `model-cache/`. Never copy the parent's model cache. `offline-tests.js` provides read-only shared-cache use for the test suite when `TRANSFORMERS_SHARED_CACHE` is set (remote model loading disabled).

On parent-owned NVIDIA hardware, change `device` to `cuda` and run each dtype separately. Record GPU/driver/runtime and an ONNX Runtime provider profile confirming execution; do not infer CUDA execution from a successful request. There is no ROCm/MIGraphX mapping in this repository.

## Browser (AMD/NVIDIA WebGPU and WASM)

Serve the repo root on localhost after building, then open `/scripts/beam-timestamps/browser.html`. Set `?options={"device":"webgpu","dtype":"fp16","repeats":25}` (URL-encoded), or call `window.runTimestamps(options)` from the attached automation browser and save its JSON. Repeat short batch/returns, diverse groups, and single-return long cases above. Use `device:"wasm", dtype:"fp32"` for browser WASM.

The harness records adapter identity, rejects known fallback adapters, and requires `shader-f16` for WebGPU fp16. Attach a browser GPU trace showing actual model execution, exact commit/status, model-file SHA256s, GPU driver, runtime version and raw console logs. `providerExecutionVerified:false` deliberately remains false until that independent evidence is supplied.

Same-backend/dtype batch vs independent comparison requires exact tokens, order, and <=20 ms timestamp error. For cross-backend/dtype comparisons record transcript differences; for equal tokens, initial timing gates are median <=20 ms and maximum <=40 ms. A pinned Python Whisper alignment comparison is still required separately; it does not establish JS execution-provider support.

## Overlap and remaining evidence

Read-only metadata checked for PR1755 (attention/encoder memory), PR1742 (seek/logits regression), and PR1797 (oversized median reflection). This branch necessarily intersects attention and encoder ownership in PR1755. Its beam-loop cleanup also releases unused GPU step outputs before the next forward; it does not copy the general getPastKeyValues patch. It does not import the logits fix or general reflection patch. Invalid seek advancement fails explicitly instead of hanging.

Parent owns hardware validation and both postimplementation review rounds. CPU results and synthetic GPU ownership boundaries are not AMD/NVIDIA execution proof. Full suite, Python alignment parity, browser WASM, hardware cells, and full allocation accounting must be reported individually; no final-readiness claim follows from this harness.

Internal attention instrumentation reports peak live attention bytes and verifies zero remaining tracked bytes after each call, including timestamp-only mode. This is tensor-lifetime accounting, not the driver's allocator high-water mark or total KV/model memory. Explicit public attention histories remain caller-owned. Timestamp-only calls currently retain complete histories too; large models, beam counts and long generations need separate memory admission measurements. fp16 alignment converts only the selected head/row/query frame range.

The verifier requires an immutable full source SHA, clean-checkout provenance, and matching source hashes for every result; stale evidence fails closed. CPU fixture results are not independent Python parity or hardware execution proof. The deterministic numerical regression uses Python Transformers v4.57.1's prefix cropping and short-median-window semantics.

Round-two numerical validation independently executed the unmodified alignment,
median-filter, and DTW functions extracted from Python Transformers v4.57.1 with
PyTorch 2.9.0 and NumPy 2.3.4. Sixteen synthetic comparisons cover changing beam
ancestry, heterogeneous EOS lengths/frame counts, short median windows, and
fp16-quantized inputs decoded to fp32. All boundaries match exactly after making
Whisper statistics and DTW cost accumulation explicitly fp32. The general DTW
helper retains its previous precision unless the new option is requested. This
is algorithm parity, not full Python model-inference parity. Near-tie regressions
are retained in the unit tests.

Seek generation preserves existing processor-provided log-mel silence padding
while bounding alignment to valid audio frames. The English speech fixture lasts
13 seconds: its final word now ends at 12.98 seconds (the last valid encoder frame)
instead of the previous out-of-recording 13.6-second golden.
