import { performance } from "node:perf_hooks";
import { selectBeamCandidates } from "../../packages/transformers/src/generation/beam_search_utils.js";
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const vocab of [32000, 151936]) {
  const scores = Float32Array.from({ length: vocab }, (_, i) => Math.sin(i * 17) * 10);
  for (const count of [8, 50]) {
    const baseline = () =>
      Array.from(scores, (score, token) => ({ score: -3 + score, token: BigInt(token), beam_idx: 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, count);
    const optimized = () => selectBeamCandidates(scores, -3, 0, count);
    const stringify = (x) => JSON.stringify(x, (_, value) => (typeof value === "bigint" ? String(value) : value));
    if (stringify(baseline()) !== stringify(optimized())) throw new Error("Candidate selection mismatch");
    const times = {};
    for (const [name, fn] of Object.entries({ baseline, optimized })) {
      const samples = [];
      for (let repeat = 0; repeat < 15; ++repeat) {
        const start = performance.now();
        fn();
        const ms = performance.now() - start;
        if (repeat >= 5) samples.push(ms);
      }
      times[name] = { medianMs: median(samples), samplesMs: samples };
    }
    console.log(JSON.stringify({ vocab, count, ...times, identical: true }));
  }
}
