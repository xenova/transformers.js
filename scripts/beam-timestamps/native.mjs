import * as lib from "../../packages/transformers/src/transformers.js";
import { run } from "./harness.mjs";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
lib.env.cacheDir = process.env.TIMESTAMP_CACHE ?? new URL("./model-cache", import.meta.url).pathname;
const options = JSON.parse(process.argv[2] ?? "{}");
if (process.env.TIMESTAMP_AUDIO) {
  const b = fs.readFileSync(process.env.TIMESTAMP_AUDIO);
  options.audioBytes = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
const result = await run(lib, options);
console.log(
  JSON.stringify(
    { sha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), runtime: process.version, platform: process.platform, ...result },
    null,
    2,
  ),
);
