export class Callable extends Function {
    constructor();
    _call(...args: any[]): void;
}
export function getModelFile(modelPath: any, fileName: any, progressCallback?: any, fatal?: boolean): Promise<Uint8Array>;
export function dispatchCallback(progressCallback: any, data: any): void;
export function fetchJSON(modelPath: any, fileName: any, progressCallback?: any, fatal?: boolean): Promise<any>;
export function pathJoin(...parts: any[]): string;
export function reverseDictionary(data: any): any;
export function indexOfMax(arr: any): number;
export function softmax(arr: any): any;
export function log_softmax(arr: any): any;
export function escapeRegExp(string: any): any;
export function getTopItems(items: any, top_k?: number): any;
export function dot(arr1: any, arr2: any): any;
export function cos_sim(arr1: any, arr2: any): number;
export function magnitude(arr: any): number;
export function getFile(url: any): Promise<Response | FileResponse>;
export function isIntegralNumber(x: any): boolean;
export function isString(text: any): boolean;
export function exists(x: any): boolean;
declare class FileResponse {
    /**
     * @param {string} filePath
     */
    constructor(filePath: string);
    filePath: string;
    headers: {};
    exists: boolean;
    status: number;
    statusText: string;
    body: ReadableStream<any>;
    updateContentType(): void;
    clone(): FileResponse;
    arrayBuffer(): Promise<ArrayBufferLike>;
    blob(): Promise<Blob>;
    text(): Promise<string>;
    json(): Promise<any>;
}
export {};
