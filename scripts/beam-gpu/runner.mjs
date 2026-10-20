import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = process.env.BEAM_PROJECT_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runner = process.env.BEAM_RUNNER_ROOT ?? "/workspace/beam-gpu/runner";
const { chromium } = await import(pathToFileURL(path.join(process.env.BEAM_PLAYWRIGHT_ROOT ?? runner, "node_modules/playwright/index.mjs")));
const ort = path.join(root, "packages/transformers/node_modules/onnxruntime-web/dist");
const cache = path.join(runner, "model-cache");
fs.mkdirSync(cache, { recursive: true });
const options = JSON.parse(process.env.BEAM_OPTIONS ?? '{"mode":"probe"}');
const server = http.createServer(async (req, res) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname.startsWith("/hf/")) {
      const relative = pathname.slice(4);
      const local = path.join(cache, relative);
      if (!fs.existsSync(local)) {
        const upstream = await fetch("https://huggingface.co/" + relative);
        if (!upstream.ok) {
          res.writeHead(upstream.status);
          res.end(await upstream.text());
          return;
        }
        fs.mkdirSync(path.dirname(local), { recursive: true });
        fs.writeFileSync(local, Buffer.from(await upstream.arrayBuffer()));
      }
      res.end(fs.readFileSync(local));
      return;
    }
    if (pathname === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end('<!doctype html><script type="module" src="/app.js"></script>');
      return;
    }
    const file = pathname.startsWith("/ort/") ? path.join(ort, path.basename(pathname)) : path.join(runner, path.basename(pathname));
    res.setHeader("Content-Type", file.endsWith(".wasm") ? "application/wasm" : "text/javascript");
    res.end(fs.readFileSync(file));
  } catch (error) {
    res.statusCode = 500;
    res.end(String(error));
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  headless: true,
  dumpio: process.env.BEAM_DEBUG === "1",
  channel: "chromium",
  args: [
    "--no-sandbox",
    "--enable-gpu",
    "--disable-gpu-sandbox",
    "--enable-unsafe-webgpu",
    "--ignore-gpu-blocklist",
    "--use-angle=vulkan",
    "--enable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan",
    "--disable-vulkan-surface",
    "--disable-dev-shm-usage",
  ],
});
try {
  const page = await browser.newPage();
  page.on("console", (message) => console.log(message.type(), message.text()));
  page.on("pageerror", (error) => console.error("PAGE_ERROR", error.message));
  await page.goto("http://127.0.0.1:" + server.address().port);
  await page.waitForFunction(() => typeof window.runBeamGPU === "function");
  const result = await page.evaluate((options) => window.runBeamGPU(options), options);
  const output = process.env.BEAM_RESULT ?? path.join(runner, "result.json");
  fs.writeFileSync(
    output,
    JSON.stringify(
      { timestamp: new Date().toISOString(), browser: browser.version(), options, ...result },
      (_, x) => (typeof x === "bigint" ? x.toString() : x),
      2,
    ),
  );
  console.log("SAVED", output);
} catch (error) {
  const cdp = await browser.newBrowserCDPSession();
  console.error("GPU_DIAGNOSTICS", JSON.stringify(await cdp.send("SystemInfo.getInfo")));
  throw error;
} finally {
  await browser.close();
  server.close();
}
