# Implementation handoff (post-implementation reviews pending)

Source implementation: `fe16763d69bc2db73a48c6149319d9cc15d22202` plus cache/streaming
fix `a2510f577542a987f4412aee6beebe99c6aa1900`, independently
based on `b65dfaff9ca5e7e518c6e99f1d84f7453efd27c1`.
Branch: `t3/multimodal-generation`.
Worktree: `/Users/dan/.t3/worktrees/transformers.js/t3-a2e63ace`.
No parent source edits, PRs, external comments, paid hosts, or secret access.

## Completed checks

- On the first implementation commit: **64/64 focused tests**, including 18 real
  tiny-model public `generate` integration cases, multimodal ownership/numeric
  regressions, and existing beam selection/ownership tests. See
  raw focused results (local ignored evidence: `results/final-focused.log`).
- **21/21 multimodal tests with Float16Array disabled**, exercising Uint16-backed
  fp16 conversion as well as mixed native/Uint16 storage. See
  fallback results (local ignored evidence: `results/fp16-fallback.log`).
- Package build and typegen passed; docs generation and toctree/link validation
  passed. Generated API docs for the new generation parameters were inspected.
  Build (local ignored evidence: `results/build.log`), docs (local ignored evidence: `results/docs.log`).
- Real exported Ultravox (quantized encoder/decoder, int8 embeddings): exact
  batch/independent token and rank comparisons with beams 1/2/4, seeded beam
  sampling, and three repeated generation calls passed.
  Raw audio result (local ignored evidence: `results/audio-batch.json`).
- Real SmolVLM2-256M image-only export (quantized encoder/decoder, int8 embeddings):
  unequal image groups, beams 1/2/4, seeded beam sampling, and three repeated calls
  passed. Raw SmolVLM result (local ignored evidence: `results/smolvlm.json`).
- The native exported-model runs began before the implementation commit. Their
  raw JSON intentionally retains the base SHA / dirty status rather than claiming
  those runs were on a clean final commit. They are fixture-admission evidence;
  rerun reviewed SHAs on the parent hardware matrix.
- All locally used ONNX files were SHA-256 checked against their immutable Hub
  revisions. [Manifest](fixtures.json) also records available, untested exports.
- Native harness diverse-beam mode and injected second-decoder-call failure
  passed on tiny Llava, using source commit `a2510f5` with the added harness
  controls. CPU logits were checked for finite values. Raw harness result (local ignored evidence: `results/diverse-failure-harness.json`).
- Browser bundle builds; no browser or GPU inference was performed in this worktree.

## Full-suite status

On source commit `a2510f5`, **all 32 Transformers suites passed: 2,310 tests,
47 existing skips, 2,357 total** in 513.7 seconds. This includes the 21 real
multimodal integration cases, all 21 synthetic multimodal regressions, existing
beam tests, and both Voxtral streaming tests. The run uses actual inference,
public fixture access, one native thread, and one recyclable Jest worker.
Complete main-package log (local ignored evidence: `results/full-suite-online.log`).

The root recursive command then stopped at the structured-output package's
pretest because that package's local dependency links had not yet been copied.
After restoring its existing locked dependency links into this worktree,
**all 20 structured-output tests passed**, including its build/typegen pretest.
Structured-output retry (local ignored evidence: `results/structured-suite.log`).
Thus **33 suites / 2,330 tests passed across both packages**, with 47 existing
skips. The initial root command itself exited nonzero; the second package was
completed separately. The shared config now preserves each package's roots,
and root test discovery verifies both packages without rerunning passed tests.
Discovery log (local ignored evidence: `results/test-discovery.log`).

Earlier attempts are retained separately: default-heap exhaustion, a stopped
per-test-GC run, and the completed offline run with unavailable public fixtures.
The offline run also exposed two Voxtral streaming regressions caused by clearing
embeddings for non-opted-in families. Commit `a2510f5` restricts that behavior to
explicit multimodal hooks; both streaming tests pass in the online run.
Aborted run (local ignored evidence: `results/full-suite-offline.log`),
completed offline run (local ignored evidence: `results/full-suite-recycled-offline.log`),
early utility network retry (local ignored evidence: `results/network-retry.log`).

## Remaining gates and precise limits

- Two parent post-implementation review rounds, combined timestamp-branch
  integration, and final reviewed-SHA hardware reruns remain outstanding.
- Browser WASM, NVIDIA CUDA/WebGPU fp32/fp16, AMD WebGPU fp32/fp16, and Apple
  WebGPU are unverified. No software adapter or Python/ROCm result substitutes
  for those cells. The browser harness rejects software adapters and checks
  shader-f16, GPU cache placement, and beam-buffer release; retain EP profiles too.
- Native exported-model repetition counts above are three, not 25. Synthetic
  ownership tests exercise 25 calls; the hardware harness defaults to 25.
- Tiny Idefics3 and tiny Qwen2VL publish no fp16 weights. Pinned fp16-capable
  alternatives and callable recipes are in [README](README.md).
- The tiny Idefics3 CPU export rejects multi-token prefill into an existing cache
  with batch size greater than 1 (ORT GroupQueryAttention restriction). The added
  new-image-after-text-cache case uses greedy generation for Idefics3 and two
  beams for Llava/Qwen2VL. Idefics3 ordinary cached single-token continuation
  remains tested with two beams.
- Unpadded versus padded tiny Idefics3 execution showed lower-ranked beam drift
  under native default threading. Exact comparison tests keep the independent
  baseline's left-padded sequence shape identical to the batch. The unpadded
  comparison is not claimed as a pass.
- Supported raw modalities: Llava/Idefics3/SmolVLM images, Qwen2VL images, and
  Ultravox equal-duration/equal-feature-count audio. Ultravox raw processor calls
  are individual; processed equal-length inputs can be collated.
- Variable-length padded Ultravox audio is explicitly guarded because the export
  has no per-example frame-length input. Gemma3n/Voxtral/custom decoder-only
  audio, other decoder-only image families (including Qwen2.5/3-VL), and video
  remain guarded for beams. Timestamp ancestry is not implemented here.

## Local resources

Worktree size is approximately **2.2 GiB**, including isolated dependencies and
new immutable model fixtures. Existing parent model weights are referenced through
an ignored cache symlink, never copied. Dependency setup first attempted frozen
pnpm offline installation; a missing tarball required copying the existing locked
dependency tree into this worktree. No parent installation or lockfile change.

## Round-one corrections

The new-image cached Qwen2VL test previously passed token comparisons while
never calling the image encoder. An encoder-count assertion reproduced this
failure. Preserve image inputs until shared preparation inspects the sliced,
unprocessed query. Real-model regressions now verify one encode for each new
image chunk, changed image pixels change decoder prefill embeddings, and ordinary
cached continuation never re-encodes an old image. All **51 focused tests** pass
across integration, multimodal numerics/ownership, and beam ownership. Build,
typegen, and full docs generation/validation passed after this correction.
Raw reproduction and passing logs remain under ignored `results/review1-*`.
The full suite must be rerun on the final reviewed source; the older full-suite
result above does not validate these corrections.

`photo-fixtures.json` pins two photographic inputs by immutable dataset revision,
SHA-256 and size. Both hashes were verified against downloaded bytes. The shared
native/browser harness accepts `image_urls` so hardware runs can use meaningful
photos rather than only synthetic patches. Photo inference remains a parent
hardware validation gate; metadata/download verification is not inference proof.
