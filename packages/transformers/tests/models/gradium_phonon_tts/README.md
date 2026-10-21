# Phonon validation

## Offline tests

The normal model suite runs dtype resolution, file discovery, text parity and
bounded-decoding-work regression tests without downloading Phonon weights:

```sh
pnpm --filter @huggingface/transformers test --runInBand --coverage=false tests/models.test.js -t GradiumPhonon
```

`tests/utils/model_registry.test.js` also covers discovering complete mixed-dtype
variants when the decoder is shared, including a missing fp16 decoder.

## Real ONNX integration tests (opt-in)

```sh
RUN_PHONON_INTEGRATION=1 pnpm --filter @huggingface/transformers test --runInBand --coverage=false tests/models.test.js -t 'Phonon ONNX integration'
```

The default is `q4` (approximately 68 MB). Set `PHONON_TEST_DTYPE=auto`, `fp32`,
or `q4f16` to exercise another graph combination. `auto` deliberately uses the
configured `fp32` variant, rather than a device heuristic that could select
nonexistent graph files. With the flag unset, these tests are skipped.

The tests use real sessions, without mocking either graph. They check input and
output names, `present*`/`past*` compatibility, convolution-state inputs, finite
24 kHz frames, EOS termination before the safety budget, deterministic replay,
custom voices, interrupted iteration, callback failures and subsequent requests.

Validated locally on Node v22.23.1 / macOS arm64 with the native CPU backend:
`q4`, `auto` (fp32), and `q4f16`. This is **not** browser, WASM, WebGPU or WebNN
validation; in particular WebGPU fp16 support and transfer costs are unmeasured.

## Export provenance

Tests pin [`onnx-community/phonon-31m-en-ONNX@147b180afe11ddb7d1ee32553f2e1578ff31f970`](https://huggingface.co/onnx-community/phonon-31m-en-ONNX/tree/147b180afe11ddb7d1ee32553f2e1578ff31f970).
Its config records the upstream weights as
`gradium/phonon-31m-en@52433c46975bfa13144c56204c9f4ee1c5b148aa`.

The graph files' ModelProto metadata reports producer `pytorch` version `2.13.0`,
IR version 8, and ONNX opset 18. The quantized flow graphs additionally import
`com.microsoft` opset 1. These values were read from the published artifacts,
not inferred from an installed Python environment.

| Graph | External data file |
| --- | --- |
| `flow_lm.onnx` | none |
| `flow_lm_q4.onnx` | `flow_lm_q4.onnx_data` |
| `flow_lm_q4f16.onnx` | `flow_lm_q4f16.onnx_data` |
| `mimi_decoder.onnx` | none |
| `mimi_decoder_fp16.onnx` | `mimi_decoder_fp16.onnx_data` |

The exporter's code revision is not recorded in the artifact metadata. The
integration tests establish that the export runs correctly through this API;
they do **not** establish numerical latent/audio equivalence to Python or the
Rust runtime. Existing Python golden tests cover text preparation only. Output
remains raw PCM, without Python processor-level trailing-silence postprocessing.

## Long-text performance

Decimal checks decode at most five tokens on each side of a boundary (enough
for a four-byte Unicode digit plus punctuation/space). Grouping accumulates
decoded segments and joins each final chunk once, avoiding repeated growing-array
copies. The offline suite bounds total decoded tokens linearly, including when
the entire paragraph fits in a single chunk; it does not use flaky timing limits.

For `"Hello. ".repeat(n)`, a 50-token budget, and the fixture tokenizer, local
median times over seven warmed-up runs were 1.09 ms (100 sentences), 3.83 ms
(400), and 13.67 ms (1600). These are measurements, not CI performance guarantees.
