export namespace env {
    export { onnx_env as onnx };
    export const remoteModels: boolean;
    export const remoteURL: string;
    export { localURL };
    export { CACHE_AVAILABLE as useCache };
    export { FS_AVAILABLE as useFS };
}
declare const localURL: string;
declare const CACHE_AVAILABLE: boolean;
declare const FS_AVAILABLE: boolean;
export {};
