export namespace env {
    export { onnx_env as onnx };
    export const remoteModels: boolean;
    export const remoteURL: string;
    export { localURL };
    export { CACHE_AVAILABLE as useCache };
    export { FS_AVAILABLE as useFS };
}
import onnx_env_1 = require("onnxruntime-common/dist/lib/env");
import onnx_env = onnx_env_1.env;
declare const localURL: string;
declare const CACHE_AVAILABLE: boolean;
declare const FS_AVAILABLE: boolean;
export {};
