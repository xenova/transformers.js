import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "packages/transformers/package.json"));
const { build } = require("esbuild");
const { ignoreModulesPlugin } = await import("../../packages/transformers/scripts/build/plugins/ignoreModulesPlugin.mjs");
await build({
  entryPoints: [path.join(root, "scripts/beam-gpu/browser.js")],
  bundle: true,
  platform: "browser",
  format: "esm",
  sourcemap: true,
  outfile: process.env.BEAM_APP_OUT ?? "/workspace/beam-gpu/runner/app.js",
  plugins: [ignoreModulesPlugin(["./onnx-node.js", "sharp", "fs", "path", "url", "stream", "stream/promises"])],
});
