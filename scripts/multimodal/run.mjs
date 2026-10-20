import { runMultimodal } from "./cases.js";
import { execFileSync } from "node:child_process";
const options = { progress: true, ...JSON.parse(process.argv[2] ?? "{}") };
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
try {
  const result = await runMultimodal(options);
  result.commit = commit;
  result.dirty_files = dirty;
  result.runtime = { node: process.version, platform: process.platform, arch: process.arch };
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exitCode = 1;
} catch (error) {
  console.log(JSON.stringify({ pass: false, options, error: error.stack }, null, 2));
  process.exitCode = 1;
}
