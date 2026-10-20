import transformers from "../../packages/transformers/jest.config.mjs";
import structuredOutput from "../../packages/transformers-structured-output/jest.config.mjs";
import { fileURLToPath } from "node:url";

// pnpm -r runs this shared config in each package's directory. Preserve each
// package's test roots rather than accidentally running Transformers twice.
const structured = process.cwd().endsWith("/transformers-structured-output");
const packageName = structured ? "transformers-structured-output" : "transformers";
export default {
  ...(structured ? structuredOutput : transformers),
  rootDir: fileURLToPath(new URL(`../../packages/${packageName}/`, import.meta.url)),
  maxWorkers: 1,
  workerIdleMemoryLimit: "512MB",
  collectCoverage: false,
  ...(structured ? {} : { setupFiles: [fileURLToPath(new URL("./offline-tests.js", import.meta.url))] }),
};
