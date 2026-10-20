import { env } from "../../packages/transformers/src/env.js";
if (process.env.TRANSFORMERS_SHARED_CACHE) {
  env.cacheDir = process.env.TRANSFORMERS_SHARED_CACHE;
  env.allowRemoteModels = false;
}
