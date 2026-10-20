# WebGPU beam decoding experiment — 2026-10-20

Branch: `dan/beam-webgpu-performance`, based on PR #1539 at `7c43a27`.
Product and hardware-validation revision: `58699fa153ece4803a2e3bd4206f59197fa4ec26`.

## Changes

- Keep aligned WebGPU cache rows on GPU with buffer-to-buffer copies. Other
  device tensors and unaligned rows retain CPU fallback. Outputs have ONNX
  Runtime's required 16-byte allocation padding and explicit disposal/download
  callbacks. The active runtime's Tensor factory avoids package-version identity
  mismatches when wrapping GPU buffers.
- Replace full-vocabulary object allocation/sorting with bounded top-k selection.
  Ranking, diversity penalties, token tie order, and seeded outputs are preserved.
- Add an isolated, reproducible browser harness, dtype and ownership checks,
  candidate-selection reference tests, benchmarks, and a GPU usage guide.

## Hardware and method

Runpod Secure Cloud RTX 4090, 24,564 MiB VRAM, NVIDIA driver 595.91.07,
Ubuntu 24.04 container/Linux 6.8, Node 24.14.1, Chromium 141.0.7390.37.
The adapter reported `nvidia` / `lovelace` and `isFallbackAdapter: false`.
The host allocation had 12 vCPUs and 100 GB system RAM.

Model inference used fp32 and four beams, returning two sequences. Tiny models
used 16 new tokens; SmolLM2 used 32. Batched cases used two inputs. Each timing
is the median of three measured runs after one warmup. Model downloads and
initial session creation are excluded. Source code, backend, model bytes and
inputs were matched; raw model hashes are retained locally.

The reference uses the original CPU cache-download/reorder algorithm and full
vocabulary sorting. The tuned path includes both GPU copies and bounded top-k.
These are workload-specific measurements, not general speedup guarantees.

## End-to-end results

| Model | Mode | Reference (ms) | Tuned (ms) | Speedup |
|---|---|---:|---:|---:|
| tiny-random-T5ForConditionalGeneration | standard | 2564.5 | 475.7 | 5.39x |
| tiny-random-T5ForConditionalGeneration | diverse | 2409.3 | 610.4 | 3.95x |
| tiny-random-T5ForConditionalGeneration | sampling | 2524.8 | 650.3 | 3.88x |
| tiny-random-T5ForConditionalGeneration | batched | 3201.3 | 805.6 | 3.97x |
| tiny-random-LlamaForCausalLM | standard | 2475.1 | 914.2 | 2.71x |
| tiny-random-LlamaForCausalLM | diverse | 2598.7 | 989.1 | 2.63x |
| tiny-random-LlamaForCausalLM | sampling | 2697.2 | 1079.4 | 2.50x |
| tiny-random-LlamaForCausalLM | batched | 4601.0 | 1738.8 | 2.65x |
| SmolLM2-135M-Instruct-ONNX | standard | 15571.3 | 1676.0 | 9.29x |
| SmolLM2-135M-Instruct-ONNX | batched | 19463.8 | 2014.7 | 9.66x |

All ten reference-versus-tuned token arrays match exactly. A separate CPU/WASM
reference also matches all eight tiny-model WebGPU cases, including seeded
sampling and batched/diverse decoding.

## Cache row-copy microbenchmarks

Each result validates every copied element and measures completion on the GPU
queue. Two warmups precede ten samples. These numbers measure one synthetic
cache tensor, not full generation.

| Tensor size | CPU-transfer reference (ms) | GPU copy (ms) | Speedup |
|---|---:|---:|---:|
| 1 MiB | 6.165 | 0.275 | 22.42x |
| 8 MiB | 25.690 | 1.640 | 15.66x |
| 64 MiB | 140.395 | 7.075 | 19.84x |

## Verification

- Full workspace CPU suite: **2,278 passed, 47 skipped, 30 suites passed**.
- Eight real-GPU boundary fixtures cover float32, float16, int64, uint8, bool,
  duplicated/chained rows, unaligned fallback, small output padding, and
  caller-owned source preservation.
- A 25-generation stress run leaves zero owned row-copy buffers live after every
  generation. The active inference-device instrumentation observes a peak of
  60 owned buffers on SmolLM2 and zero remaining at completion. This checks
  buffers owned by this implementation, not all runtime/driver allocations.
- Ten candidate-selection tests match a full-sort reference, including ties,
  suppressed tokens, diversity penalties, large k, and empty input.
- Both packages build with declarations on macOS and the Linux worker; docs
  generation and changed-file Prettier checks pass.
- Repository-wide formatting retains the two previously verified failures in
  untouched `tensor.test.js` and `tensor_ops.test.js`.

## Scope and setup findings

Validation covers Linux/NVIDIA browser WebGPU with fp32 model inference.
The container required EGL dispatch libraries before Vulkan could initialize.
Chromium 156 returned a null WebGPU adapter on this host; pinned Chromium 141
worked. The Qwen 0.5B fp16 attempt was rejected by the browser capability check;
its fp32 export hit a browser runtime allocation limit. Those attempts are
setup/coverage limits, not successful model validation.

## Cost and cleanup

Pod `tlouzqbaj8jchl` ran from 19:44:51 UTC to verified deletion at 20:38:26 UTC:
**53.6 minutes**, below the two-hour authorization. Compute was $0.89/hour;
40 GB disposable storage brought the estimate to about $0.90/hour. Estimated
total: **$0.80**. The account balance decreased by $0.7993, and final reported
compute spend was $0/hour; the per-pod billing ledger had not posted records.

A fresh provider read returned 404 after deletion. No volume was created.
The scheduled cleanup backup was removed after deletion, and the local
watchdog/result archiver were signaled to exit. Automatic approval review
rejected copying the account API key onto the worker; no API key was copied
there. Credentials stayed local, with local sleep prevention and a scheduled
cleanup backup guarding the deadline.

## Retained evidence

Raw JSON/logs, source identity/status, model hashes, manifests and intermediate
archives are retained in the gitignored `scripts/beam-gpu/results/` directory.
The bootstrap and test harness are tracked in this directory. Run `run.sh` to
repeat the complete hardware-validation/benchmark sequence on an already
provisioned host. Provider credentials and SSH keys are not part of the repo.
