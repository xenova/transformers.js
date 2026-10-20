import * as lib from "../../packages/transformers/src/transformers.js";
import { run } from "./harness.mjs";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
lib.env.cacheDir = process.env.TIMESTAMP_CACHE ?? new URL("./model-cache", import.meta.url).pathname;
const options = JSON.parse(process.argv[2] ?? "{}");
if (process.env.TIMESTAMP_AUDIO) {
  const b = fs.readFileSync(process.env.TIMESTAMP_AUDIO);
  options.audioBytes = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
const sourcePaths = ["generation/beam_search.js", "models/modeling_utils.js", "models/whisper/modeling_whisper.js"];
const provenance = {
  sha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  status: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  sources: Object.fromEntries(
    sourcePaths.map((path) => [
      path,
      createHash("sha256")
        .update(fs.readFileSync(new URL(`../../packages/transformers/src/${path}`, import.meta.url)))
        .digest("hex"),
    ]),
  ),
};
const result = await run(lib, options);
console.log(JSON.stringify({ ...provenance, runtime: process.version, platform: process.platform, ...result }, null, 2));
