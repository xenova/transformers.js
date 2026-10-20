#!/usr/bin/env bash
set -euo pipefail
OUTPUT_ROOT=${BEAM_OUTPUT_ROOT:-/workspace/beam-gpu}
mkdir -p "$OUTPUT_ROOT"
trap 'code=$?; printf "%s\n" "$code" > "$OUTPUT_ROOT/final-exit-status"' EXIT
git rev-parse HEAD > "$OUTPUT_ROOT/final-source-commit"
git status --porcelain > "$OUTPUT_ROOT/final-source-status"
node scripts/beam-gpu/build.mjs
run_case() {
  BEAM_OPTIONS="$2" BEAM_RESULT="$OUTPUT_ROOT/$1.json" node scripts/beam-gpu/runner.mjs
}
run_case final-validation '{"mode":"validate"}'
run_case final-micro '{"mode":"micro"}'
run_case final-generation '{"mode":"generation","tokens":16,"repeats":4}'
run_case smollm-optimized '{"mode":"generation","models":["onnx-community/SmolLM2-135M-Instruct-ONNX"],"dtype":"fp32","modes":["standard","batched"],"tokens":32,"repeats":4}'
run_case final-stress '{"mode":"generation","models":["hf-internal-testing/tiny-random-LlamaForCausalLM"],"modes":["standard"],"tokens":8,"repeats":25}'
node scripts/beam-gpu/candidates.mjs > "$OUTPUT_ROOT/candidates-remote.jsonl"
pnpm build > "$OUTPUT_ROOT/final-build.log" 2>&1
