# Beam search GPU validation

These scripts validate and benchmark browser WebGPU on a disposable Linux NVIDIA
host. Infrastructure provisioning, SSH credentials, budgets, and teardown belong
to the caller; the scripts contain no provider credentials and create no hosts.

`bootstrap.sh` installs Node 24.14.1, pnpm, the base PR revision, and Playwright
1.56.1/Chromium 141. A newer Chromium 156 build returned a null WebGPU adapter on
the tested NVIDIA driver; Chromium 141 worked. EGL dispatch libraries are required
in addition to the container's NVIDIA Vulkan libraries.

Run `bootstrap.sh` on a throwaway Ubuntu GPU host, then transfer the desired source
revision into `/workspace/beam-gpu/transformers.js`. The default task root is
`/workspace/beam-gpu`; override `TASK_ROOT` for bootstrap or `BEAM_RUNNER_ROOT` and
`BEAM_PROJECT_ROOT` for the runner. `BEAM_PLAYWRIGHT_ROOT` can select another
runner's Playwright installation. The benchmark server binds to loopback only.

```bash
export PATH=/workspace/beam-gpu/node-v24.14.1-linux-x64/bin:$PATH
cd /workspace/beam-gpu/transformers.js
node scripts/beam-gpu/build.mjs
BEAM_OPTIONS='{"mode":"validate"}' BEAM_RESULT=/workspace/beam-gpu/validate.json node scripts/beam-gpu/runner.mjs
BEAM_OPTIONS='{"mode":"micro"}' BEAM_RESULT=/workspace/beam-gpu/micro.json node scripts/beam-gpu/runner.mjs
BEAM_OPTIONS='{"mode":"generation","repeats":4,"tokens":16}' BEAM_RESULT=/workspace/beam-gpu/generation.json node scripts/beam-gpu/runner.mjs
```

- `probe`: requires a hardware WebGPU adapter and records browser/adapter identity.
- `validate`: verifies float32, float16, int64, uint8 and bool row selection,
  duplicate rows, chained selections, preservation of caller-owned source data,
  and the CPU fallback for unaligned float16 rows.
- `micro`: validates every copied element, then measures GPU-completed row
  selection for 1, 8, and 64 MiB tensors. Two warmups precede ten timed samples.
- `generation`: runs T5 and Llama standard/diverse/sampling/batched beam decoding;
  checks seeded repeatability, batch independence, and null returned beam caches.
  One warmup precedes timed samples. JSON retains tokens and cache locations.

For other models, pass `models`, `dtype`, and optionally `modes` (`standard`,
`diverse`, `sampling`, `batched`) in `BEAM_OPTIONS`. Set `cpuRowSelection: true`
to use the original cache-download algorithm for a matched reference. This is a
harness option, not a library configuration flag. Compare token arrays between
reference and optimized output files before interpreting timings.

`node scripts/beam-gpu/candidates.mjs` separately compares the full-sort reference
with bounded top-k selection for 32K and 152K vocabularies and verifies identical
rankings. Its numbers are CPU microbenchmarks, not inference throughput.

Raw results belong in the gitignored `results/` directory. Keep model caches,
provider keys, SSH keys, browser installations, and build output out of Git.
The Chromium process runs without its sandbox because this harness runs as root
inside an isolated, disposable test container; use a sandboxed browser on shared
or persistent hosts.
