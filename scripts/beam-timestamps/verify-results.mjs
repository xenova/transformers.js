import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const requestedRevision = process.argv[2];
assert(requestedRevision, "Pass the exact expected source commit as the first argument");
const expectedRevision = execFileSync("git", ["rev-parse", `${requestedRevision}^{commit}`], { encoding: "utf8" }).trim();
assert.equal(requestedRevision, expectedRevision, "Use a full immutable commit SHA");
const sourcePaths = ["generation/beam_search.js", "models/modeling_utils.js", "models/whisper/modeling_whisper.js"];
const expectedSources = Object.fromEntries(
  sourcePaths.map((path) => [
    path,
    createHash("sha256")
      .update(execFileSync("git", ["show", `${expectedRevision}:packages/transformers/src/${path}`]))
      .digest("hex"),
  ]),
);
const read = (name) => JSON.parse(fs.readFileSync(new URL(`results/${name}.json`, import.meta.url)));
const batch = read("native-cpu"),
  single = read("native-single"),
  diverse = read("native-diverse"),
  long = read("native-long");
for (const result of [batch, single, diverse, long]) {
  assert.equal(result.sha, expectedRevision, "Stale result revision");
  assert.equal(result.status, "", "Results must come from a clean checkout");
  assert.deepEqual(result.sources, expectedSources, "Source bytes do not match the requested revision");
  assert(result.outputs.length >= 3, "Require three measured repeats");
  assert.equal(result.fixture.revision, "aeaa13760958b03fac5062f457d317d3319c3168");
  for (const output of result.outputs) {
    assert(output.peakInternalAttentionBytes > 0);
    assert.equal(output.liveAttentionBytesAfterCleanup, 0);
    assert.equal(output.tokens.length, output.timestamps.length);
    output.tokens.forEach((tokens, row) => {
      const times = output.timestamps[row],
        length = output.lengths?.[row] ?? tokens.length;
      assert.equal(tokens.length, times.length);
      assert(times.every(Number.isFinite));
      for (let i = 1; i < length; ++i) assert(times[i] >= times[i - 1], `non-monotonic row ${row} at ${i}`);
      assert(times.slice(length).every((t) => t === 0));
      if (output.beam_indices) {
        const history = output.beam_indices[row].filter((x) => x !== -1);
        // Short-form English prefix has two tokens.
        assert.equal(history.length, length - 2);
        const input = Math.floor(row / result.requested.returns);
        assert(history.every((x) => Math.floor(x / result.requested.beams) === input));
      }
    });
    assert.deepEqual(output, result.outputs[0], "repeated call output drift");
  }
}
for (let row = 0; row < batch.outputs[0].tokens.length; ++row) {
  const rank = row % 2;
  assert.deepEqual(batch.outputs[0].tokens[row], single.outputs[0].tokens[rank]);
  assert.deepEqual(batch.outputs[0].timestamps[row], single.outputs[0].timestamps[rank]);
}
assert.equal(diverse.outputs.length, 25);
assert(diverse.outputs.every((x) => x.retainedAttentionBytes > 0));
console.log(
  JSON.stringify(
    {
      passed: true,
      checks: [
        "batch vs independent exact tokens and timestamps",
        "25 diverse public-attention calls stable",
        "global ancestry and valid lengths",
        "35-second seek monotonicity",
        "EOS and zero padding",
      ],
    },
    null,
    2,
  ),
);
