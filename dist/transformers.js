/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/onnxruntime-common/dist/lib/backend-impl.js":
/*!******************************************************************!*\
  !*** ./node_modules/onnxruntime-common/dist/lib/backend-impl.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "registerBackend": () => (/* binding */ registerBackend),
/* harmony export */   "resolveBackend": () => (/* binding */ resolveBackend)
/* harmony export */ });
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const backends = {};
const backendsSortedByPriority = [];
/**
 * Register a backend.
 *
 * @param name - the name as a key to lookup as an execution provider.
 * @param backend - the backend object.
 * @param priority - an integer indicating the priority of the backend. Higher number means higher priority. if priority
 * < 0, it will be considered as a 'beta' version and will not be used as a fallback backend by default.
 *
 * @internal
 */
const registerBackend = (name, backend, priority) => {
    if (backend && typeof backend.init === 'function' && typeof backend.createSessionHandler === 'function') {
        const currentBackend = backends[name];
        if (currentBackend === undefined) {
            backends[name] = { backend, priority };
        }
        else if (currentBackend.priority > priority) {
            // same name is already registered with a higher priority. skip registeration.
            return;
        }
        else if (currentBackend.priority === priority) {
            if (currentBackend.backend !== backend) {
                throw new Error(`cannot register backend "${name}" using priority ${priority}`);
            }
        }
        if (priority >= 0) {
            const i = backendsSortedByPriority.indexOf(name);
            if (i !== -1) {
                backendsSortedByPriority.splice(i, 1);
            }
            for (let i = 0; i < backendsSortedByPriority.length; i++) {
                if (backends[backendsSortedByPriority[i]].priority <= priority) {
                    backendsSortedByPriority.splice(i, 0, name);
                    return;
                }
            }
            backendsSortedByPriority.push(name);
        }
        return;
    }
    throw new TypeError('not a valid backend');
};
/**
 * Resolve backend by specified hints.
 *
 * @param backendHints - a list of execution provider names to lookup. If omitted use registered backends as list.
 * @returns a promise that resolves to the backend.
 *
 * @internal
 */
const resolveBackend = async (backendHints) => {
    const backendNames = backendHints.length === 0 ? backendsSortedByPriority : backendHints;
    const errors = [];
    for (const backendName of backendNames) {
        const backendInfo = backends[backendName];
        if (backendInfo) {
            if (backendInfo.initialized) {
                return backendInfo.backend;
            }
            else if (backendInfo.aborted) {
                continue; // current backend is unavailable; try next
            }
            const isInitializing = !!backendInfo.initPromise;
            try {
                if (!isInitializing) {
                    backendInfo.initPromise = backendInfo.backend.init();
                }
                await backendInfo.initPromise;
                backendInfo.initialized = true;
                return backendInfo.backend;
            }
            catch (e) {
                if (!isInitializing) {
                    errors.push({ name: backendName, err: e });
                }
                backendInfo.aborted = true;
            }
            finally {
                delete backendInfo.initPromise;
            }
        }
    }
    throw new Error(`no available backend found. ERR: ${errors.map(e => `[${e.name}] ${e.err}`).join(', ')}`);
};
//# sourceMappingURL=backend-impl.js.map

/***/ }),

/***/ "./node_modules/onnxruntime-common/dist/lib/backend.js":
/*!*************************************************************!*\
  !*** ./node_modules/onnxruntime-common/dist/lib/backend.js ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "registerBackend": () => (/* reexport safe */ _backend_impl__WEBPACK_IMPORTED_MODULE_0__.registerBackend)
/* harmony export */ });
/* harmony import */ var _backend_impl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./backend-impl */ "./node_modules/onnxruntime-common/dist/lib/backend-impl.js");
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

//# sourceMappingURL=backend.js.map

/***/ }),

/***/ "./node_modules/onnxruntime-common/dist/lib/env-impl.js":
/*!**************************************************************!*\
  !*** ./node_modules/onnxruntime-common/dist/lib/env-impl.js ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "EnvImpl": () => (/* binding */ EnvImpl)
/* harmony export */ });
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
class EnvImpl {
    constructor() {
        this.wasm = {};
        this.webgl = {};
        this.logLevelInternal = 'warning';
    }
    // TODO standadize the getter and setter convention in env for other fields.
    set logLevel(value) {
        if (value === undefined) {
            return;
        }
        if (typeof value !== 'string' || ['verbose', 'info', 'warning', 'error', 'fatal'].indexOf(value) === -1) {
            throw new Error(`Unsupported logging level: ${value}`);
        }
        this.logLevelInternal = value;
    }
    get logLevel() {
        return this.logLevelInternal;
    }
}
//# sourceMappingURL=env-impl.js.map

/***/ }),

/***/ "./node_modules/onnxruntime-common/dist/lib/env.js":
/*!*********************************************************!*\
  !*** ./node_modules/onnxruntime-common/dist/lib/env.js ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "env": () => (/* binding */ env)
/* harmony export */ });
/* harmony import */ var _env_impl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./env-impl */ "./node_modules/onnxruntime-common/dist/lib/env-impl.js");
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Represent a set of flags as a global singleton.
 */
const env = new _env_impl__WEBPACK_IMPORTED_MODULE_0__.EnvImpl();
//# sourceMappingURL=env.js.map

/***/ }),

/***/ "./node_modules/onnxruntime-common/dist/lib/index.js":
/*!***********************************************************!*\
  !*** ./node_modules/onnxruntime-common/dist/lib/index.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "InferenceSession": () => (/* reexport safe */ _inference_session__WEBPACK_IMPORTED_MODULE_2__.InferenceSession),
/* harmony export */   "Tensor": () => (/* reexport safe */ _tensor__WEBPACK_IMPORTED_MODULE_3__.Tensor),
/* harmony export */   "env": () => (/* reexport safe */ _env__WEBPACK_IMPORTED_MODULE_1__.env),
/* harmony export */   "registerBackend": () => (/* reexport safe */ _backend__WEBPACK_IMPORTED_MODULE_0__.registerBackend)
/* harmony export */ });
/* harmony import */ var _backend__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./backend */ "./node_modules/onnxruntime-common/dist/lib/backend.js");
/* harmony import */ var _env__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./env */ "./node_modules/onnxruntime-common/dist/lib/env.js");
/* harmony import */ var _inference_session__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./inference-session */ "./node_modules/onnxruntime-common/dist/lib/inference-session.js");
/* harmony import */ var _tensor__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./tensor */ "./node_modules/onnxruntime-common/dist/lib/tensor.js");
/* harmony import */ var _onnx_value__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./onnx-value */ "./node_modules/onnxruntime-common/dist/lib/onnx-value.js");
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/**
 * # ONNX Runtime JavaScript API
 *
 * ONNX Runtime JavaScript API is a unified API for all JavaScript usages, including the following NPM packages:
 *
 * - [onnxruntime-node](https://www.npmjs.com/package/onnxruntime-node)
 * - [onnxruntime-web](https://www.npmjs.com/package/onnxruntime-web)
 * - [onnxruntime-react-native](https://www.npmjs.com/package/onnxruntime-react-native)
 *
 * See also:
 * - [Get Started](https://onnxruntime.ai/docs/get-started/with-javascript.html)
 * - [Inference examples](https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js)
 *
 * @packageDocumentation
 */





//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/onnxruntime-common/dist/lib/inference-session-impl.js":
/*!****************************************************************************!*\
  !*** ./node_modules/onnxruntime-common/dist/lib/inference-session-impl.js ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "InferenceSession": () => (/* binding */ InferenceSession)
/* harmony export */ });
/* harmony import */ var _backend_impl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./backend-impl */ "./node_modules/onnxruntime-common/dist/lib/backend-impl.js");
/* harmony import */ var _tensor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./tensor */ "./node_modules/onnxruntime-common/dist/lib/tensor.js");
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.


class InferenceSession {
    constructor(handler) {
        this.handler = handler;
    }
    async run(feeds, arg1, arg2) {
        const fetches = {};
        let options = {};
        // check inputs
        if (typeof feeds !== 'object' || feeds === null || feeds instanceof _tensor__WEBPACK_IMPORTED_MODULE_1__.Tensor || Array.isArray(feeds)) {
            throw new TypeError('\'feeds\' must be an object that use input names as keys and OnnxValue as corresponding values.');
        }
        let isFetchesEmpty = true;
        // determine which override is being used
        if (typeof arg1 === 'object') {
            if (arg1 === null) {
                throw new TypeError('Unexpected argument[1]: cannot be null.');
            }
            if (arg1 instanceof _tensor__WEBPACK_IMPORTED_MODULE_1__.Tensor) {
                throw new TypeError('\'fetches\' cannot be a Tensor');
            }
            if (Array.isArray(arg1)) {
                if (arg1.length === 0) {
                    throw new TypeError('\'fetches\' cannot be an empty array.');
                }
                isFetchesEmpty = false;
                // output names
                for (const name of arg1) {
                    if (typeof name !== 'string') {
                        throw new TypeError('\'fetches\' must be a string array or an object.');
                    }
                    if (this.outputNames.indexOf(name) === -1) {
                        throw new RangeError(`'fetches' contains invalid output name: ${name}.`);
                    }
                    fetches[name] = null;
                }
                if (typeof arg2 === 'object' && arg2 !== null) {
                    options = arg2;
                }
                else if (typeof arg2 !== 'undefined') {
                    throw new TypeError('\'options\' must be an object.');
                }
            }
            else {
                // decide whether arg1 is fetches or options
                // if any output name is present and its value is valid OnnxValue, we consider it fetches
                let isFetches = false;
                const arg1Keys = Object.getOwnPropertyNames(arg1);
                for (const name of this.outputNames) {
                    if (arg1Keys.indexOf(name) !== -1) {
                        const v = arg1[name];
                        if (v === null || v instanceof _tensor__WEBPACK_IMPORTED_MODULE_1__.Tensor) {
                            isFetches = true;
                            isFetchesEmpty = false;
                            fetches[name] = v;
                        }
                    }
                }
                if (isFetches) {
                    if (typeof arg2 === 'object' && arg2 !== null) {
                        options = arg2;
                    }
                    else if (typeof arg2 !== 'undefined') {
                        throw new TypeError('\'options\' must be an object.');
                    }
                }
                else {
                    options = arg1;
                }
            }
        }
        else if (typeof arg1 !== 'undefined') {
            throw new TypeError('Unexpected argument[1]: must be \'fetches\' or \'options\'.');
        }
        // check if all inputs are in feed
        for (const name of this.inputNames) {
            if (typeof feeds[name] === 'undefined') {
                throw new Error(`input '${name}' is missing in 'feeds'.`);
            }
        }
        // if no fetches is specified, we use the full output names list
        if (isFetchesEmpty) {
            for (const name of this.outputNames) {
                fetches[name] = null;
            }
        }
        // feeds, fetches and options are prepared
        const results = await this.handler.run(feeds, fetches, options);
        const returnValue = {};
        for (const key in results) {
            if (Object.hasOwnProperty.call(results, key)) {
                returnValue[key] = new _tensor__WEBPACK_IMPORTED_MODULE_1__.Tensor(results[key].type, results[key].data, results[key].dims);
            }
        }
        return returnValue;
    }
    static async create(arg0, arg1, arg2, arg3) {
        // either load from a file or buffer
        let filePathOrUint8Array;
        let options = {};
        if (typeof arg0 === 'string') {
            filePathOrUint8Array = arg0;
            if (typeof arg1 === 'object' && arg1 !== null) {
                options = arg1;
            }
            else if (typeof arg1 !== 'undefined') {
                throw new TypeError('\'options\' must be an object.');
            }
        }
        else if (arg0 instanceof Uint8Array) {
            filePathOrUint8Array = arg0;
            if (typeof arg1 === 'object' && arg1 !== null) {
                options = arg1;
            }
            else if (typeof arg1 !== 'undefined') {
                throw new TypeError('\'options\' must be an object.');
            }
        }
        else if (arg0 instanceof ArrayBuffer ||
            (typeof SharedArrayBuffer !== 'undefined' && arg0 instanceof SharedArrayBuffer)) {
            const buffer = arg0;
            let byteOffset = 0;
            let byteLength = arg0.byteLength;
            if (typeof arg1 === 'object' && arg1 !== null) {
                options = arg1;
            }
            else if (typeof arg1 === 'number') {
                byteOffset = arg1;
                if (!Number.isSafeInteger(byteOffset)) {
                    throw new RangeError('\'byteOffset\' must be an integer.');
                }
                if (byteOffset < 0 || byteOffset >= buffer.byteLength) {
                    throw new RangeError(`'byteOffset' is out of range [0, ${buffer.byteLength}).`);
                }
                byteLength = arg0.byteLength - byteOffset;
                if (typeof arg2 === 'number') {
                    byteLength = arg2;
                    if (!Number.isSafeInteger(byteLength)) {
                        throw new RangeError('\'byteLength\' must be an integer.');
                    }
                    if (byteLength <= 0 || byteOffset + byteLength > buffer.byteLength) {
                        throw new RangeError(`'byteLength' is out of range (0, ${buffer.byteLength - byteOffset}].`);
                    }
                    if (typeof arg3 === 'object' && arg3 !== null) {
                        options = arg3;
                    }
                    else if (typeof arg3 !== 'undefined') {
                        throw new TypeError('\'options\' must be an object.');
                    }
                }
                else if (typeof arg2 !== 'undefined') {
                    throw new TypeError('\'byteLength\' must be a number.');
                }
            }
            else if (typeof arg1 !== 'undefined') {
                throw new TypeError('\'options\' must be an object.');
            }
            filePathOrUint8Array = new Uint8Array(buffer, byteOffset, byteLength);
        }
        else {
            throw new TypeError('Unexpected argument[0]: must be \'path\' or \'buffer\'.');
        }
        // get backend hints
        const eps = options.executionProviders || [];
        const backendHints = eps.map(i => typeof i === 'string' ? i : i.name);
        const backend = await (0,_backend_impl__WEBPACK_IMPORTED_MODULE_0__.resolveBackend)(backendHints);
        const handler = await backend.createSessionHandler(filePathOrUint8Array, options);
        return new InferenceSession(handler);
    }
    startProfiling() {
        this.handler.startProfiling();
    }
    endProfiling() {
        this.handler.endProfiling();
    }
    get inputNames() {
        return this.handler.inputNames;
    }
    get outputNames() {
        return this.handler.outputNames;
    }
}
//# sourceMappingURL=inference-session-impl.js.map

/***/ }),

/***/ "./node_modules/onnxruntime-common/dist/lib/inference-session.js":
/*!***********************************************************************!*\
  !*** ./node_modules/onnxruntime-common/dist/lib/inference-session.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "InferenceSession": () => (/* binding */ InferenceSession)
/* harmony export */ });
/* harmony import */ var _inference_session_impl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./inference-session-impl */ "./node_modules/onnxruntime-common/dist/lib/inference-session-impl.js");
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// eslint-disable-next-line @typescript-eslint/naming-convention
const InferenceSession = _inference_session_impl__WEBPACK_IMPORTED_MODULE_0__.InferenceSession;
//# sourceMappingURL=inference-session.js.map

/***/ }),

/***/ "./node_modules/onnxruntime-common/dist/lib/onnx-value.js":
/*!****************************************************************!*\
  !*** ./node_modules/onnxruntime-common/dist/lib/onnx-value.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

//# sourceMappingURL=onnx-value.js.map

/***/ }),

/***/ "./node_modules/onnxruntime-common/dist/lib/tensor-impl.js":
/*!*****************************************************************!*\
  !*** ./node_modules/onnxruntime-common/dist/lib/tensor-impl.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Tensor": () => (/* binding */ Tensor)
/* harmony export */ });
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const isBigInt64ArrayAvailable = typeof BigInt64Array !== 'undefined' && typeof BigInt64Array.from === 'function';
const isBigUint64ArrayAvailable = typeof BigUint64Array !== 'undefined' && typeof BigUint64Array.from === 'function';
// a runtime map that maps type string to TypedArray constructor. Should match Tensor.DataTypeMap.
const NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP = new Map([
    ['float32', Float32Array],
    ['uint8', Uint8Array],
    ['int8', Int8Array],
    ['uint16', Uint16Array],
    ['int16', Int16Array],
    ['int32', Int32Array],
    ['bool', Uint8Array],
    ['float64', Float64Array],
    ['uint32', Uint32Array],
]);
// a runtime map that maps type string to TypedArray constructor. Should match Tensor.DataTypeMap.
const NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP = new Map([
    [Float32Array, 'float32'],
    [Uint8Array, 'uint8'],
    [Int8Array, 'int8'],
    [Uint16Array, 'uint16'],
    [Int16Array, 'int16'],
    [Int32Array, 'int32'],
    [Float64Array, 'float64'],
    [Uint32Array, 'uint32'],
]);
if (isBigInt64ArrayAvailable) {
    NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.set('int64', BigInt64Array);
    NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP.set(BigInt64Array, 'int64');
}
if (isBigUint64ArrayAvailable) {
    NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.set('uint64', BigUint64Array);
    NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP.set(BigUint64Array, 'uint64');
}
/**
 * calculate size from dims.
 *
 * @param dims the dims array. May be an illegal input.
 */
const calculateSize = (dims) => {
    let size = 1;
    for (let i = 0; i < dims.length; i++) {
        const dim = dims[i];
        if (typeof dim !== 'number' || !Number.isSafeInteger(dim)) {
            throw new TypeError(`dims[${i}] must be an integer, got: ${dim}`);
        }
        if (dim < 0) {
            throw new RangeError(`dims[${i}] must be a non-negative integer, got: ${dim}`);
        }
        size *= dim;
    }
    return size;
};
class Tensor {
    constructor(arg0, arg1, arg2) {
        let type;
        let data;
        let dims;
        // check whether arg0 is type or data
        if (typeof arg0 === 'string') {
            //
            // Override: constructor(type, data, ...)
            //
            type = arg0;
            dims = arg2;
            if (arg0 === 'string') {
                // string tensor
                if (!Array.isArray(arg1)) {
                    throw new TypeError('A string tensor\'s data must be a string array.');
                }
                // we don't check whether every element in the array is string; this is too slow. we assume it's correct and
                // error will be populated at inference
                data = arg1;
            }
            else {
                // numeric tensor
                const typedArrayConstructor = NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.get(arg0);
                if (typedArrayConstructor === undefined) {
                    throw new TypeError(`Unsupported tensor type: ${arg0}.`);
                }
                if (Array.isArray(arg1)) {
                    // use 'as any' here because TypeScript's check on type of 'SupportedTypedArrayConstructors.from()' produces
                    // incorrect results.
                    // 'typedArrayConstructor' should be one of the typed array prototype objects.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data = typedArrayConstructor.from(arg1);
                }
                else if (arg1 instanceof typedArrayConstructor) {
                    data = arg1;
                }
                else {
                    throw new TypeError(`A ${type} tensor's data must be type of ${typedArrayConstructor}`);
                }
            }
        }
        else {
            //
            // Override: constructor(data, ...)
            //
            dims = arg1;
            if (Array.isArray(arg0)) {
                // only boolean[] and string[] is supported
                if (arg0.length === 0) {
                    throw new TypeError('Tensor type cannot be inferred from an empty array.');
                }
                const firstElementType = typeof arg0[0];
                if (firstElementType === 'string') {
                    type = 'string';
                    data = arg0;
                }
                else if (firstElementType === 'boolean') {
                    type = 'bool';
                    // 'arg0' is of type 'boolean[]'. Uint8Array.from(boolean[]) actually works, but typescript thinks this is
                    // wrong type. We use 'as any' to make it happy.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data = Uint8Array.from(arg0);
                }
                else {
                    throw new TypeError(`Invalid element type of data array: ${firstElementType}.`);
                }
            }
            else {
                // get tensor type from TypedArray
                const mappedType = NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP.get(arg0.constructor);
                if (mappedType === undefined) {
                    throw new TypeError(`Unsupported type for tensor data: ${arg0.constructor}.`);
                }
                type = mappedType;
                data = arg0;
            }
        }
        // type and data is processed, now processing dims
        if (dims === undefined) {
            // assume 1-D tensor if dims omitted
            dims = [data.length];
        }
        else if (!Array.isArray(dims)) {
            throw new TypeError('A tensor\'s dims must be a number array');
        }
        // perform check
        const size = calculateSize(dims);
        if (size !== data.length) {
            throw new Error(`Tensor's size(${size}) does not match data length(${data.length}).`);
        }
        this.dims = dims;
        this.type = type;
        this.data = data;
        this.size = size;
    }
    // #endregion
    /**
     * Create a new tensor object from image object
     *
     * @param buffer - Extracted image buffer data - assuming RGBA format
     * @param imageFormat - input image configuration - required configurations height, width, format
     * @param tensorFormat - output tensor configuration - Default is RGB format
     */
    static bufferToTensor(buffer, options) {
        if (buffer === undefined) {
            throw new Error('Image buffer must be defined');
        }
        if (options.height === undefined || options.width === undefined) {
            throw new Error('Image height and width must be defined');
        }
        const { height, width } = options;
        const norm = options.norm;
        let normMean;
        let normBias;
        if (norm === undefined || norm.mean === undefined) {
            normMean = 255;
        }
        else {
            normMean = norm.mean;
        }
        if (norm === undefined || norm.bias === undefined) {
            normBias = 0;
        }
        else {
            normBias = norm.bias;
        }
        const inputformat = options.bitmapFormat !== undefined ? options.bitmapFormat : 'RGBA';
        // default value is RGBA since imagedata and HTMLImageElement uses it
        const outputformat = options.tensorFormat !== undefined ?
            (options.tensorFormat !== undefined ? options.tensorFormat : 'RGB') :
            'RGB';
        const offset = height * width;
        const float32Data = outputformat === 'RGBA' ? new Float32Array(offset * 4) : new Float32Array(offset * 3);
        // Default pointer assignments
        let step = 4, rImagePointer = 0, gImagePointer = 1, bImagePointer = 2, aImagePointer = 3;
        let rTensorPointer = 0, gTensorPointer = offset, bTensorPointer = offset * 2, aTensorPointer = -1;
        // Updating the pointer assignments based on the input image format
        if (inputformat === 'RGB') {
            step = 3;
            rImagePointer = 0;
            gImagePointer = 1;
            bImagePointer = 2;
            aImagePointer = -1;
        }
        // Updating the pointer assignments based on the output tensor format
        if (outputformat === 'RGBA') {
            aTensorPointer = offset * 3;
        }
        else if (outputformat === 'RBG') {
            rTensorPointer = 0;
            bTensorPointer = offset;
            gTensorPointer = offset * 2;
        }
        else if (outputformat === 'BGR') {
            bTensorPointer = 0;
            gTensorPointer = offset;
            rTensorPointer = offset * 2;
        }
        for (let i = 0; i < offset; i++, rImagePointer += step, bImagePointer += step, gImagePointer += step, aImagePointer += step) {
            float32Data[rTensorPointer++] = (buffer[rImagePointer] + normBias) / normMean;
            float32Data[gTensorPointer++] = (buffer[gImagePointer] + normBias) / normMean;
            float32Data[bTensorPointer++] = (buffer[bImagePointer] + normBias) / normMean;
            if (aTensorPointer !== -1 && aImagePointer !== -1) {
                float32Data[aTensorPointer++] = (buffer[aImagePointer] + normBias) / normMean;
            }
        }
        // Float32Array -> ort.Tensor
        const outputTensor = outputformat === 'RGBA' ? new Tensor('float32', float32Data, [1, 4, height, width]) :
            new Tensor('float32', float32Data, [1, 3, height, width]);
        return outputTensor;
    }
    static async fromImage(image, options) {
        // checking the type of image object
        const isHTMLImageEle = typeof (HTMLImageElement) !== 'undefined' && image instanceof HTMLImageElement;
        const isImageDataEle = typeof (ImageData) !== 'undefined' && image instanceof ImageData;
        const isImageBitmap = typeof (ImageBitmap) !== 'undefined' && image instanceof ImageBitmap;
        const isURL = typeof (String) !== 'undefined' && (image instanceof String || typeof image === 'string');
        let data;
        let tensorConfig = {};
        // filling and checking image configuration options
        if (isHTMLImageEle) {
            // HTMLImageElement - image object - format is RGBA by default
            const canvas = document.createElement('canvas');
            const pixels2DContext = canvas.getContext('2d');
            if (pixels2DContext != null) {
                let height = image.naturalHeight;
                let width = image.naturalWidth;
                if (options !== undefined && options.resizedHeight !== undefined && options.resizedWidth !== undefined) {
                    height = options.resizedHeight;
                    width = options.resizedWidth;
                }
                if (options !== undefined) {
                    tensorConfig = options;
                    if (options.tensorFormat !== undefined) {
                        throw new Error('Image input config format must be RGBA for HTMLImageElement');
                    }
                    else {
                        tensorConfig.tensorFormat = 'RGBA';
                    }
                    if (options.height !== undefined && options.height !== height) {
                        throw new Error('Image input config height doesn\'t match HTMLImageElement height');
                    }
                    else {
                        tensorConfig.height = height;
                    }
                    if (options.width !== undefined && options.width !== width) {
                        throw new Error('Image input config width doesn\'t match HTMLImageElement width');
                    }
                    else {
                        tensorConfig.width = width;
                    }
                }
                else {
                    tensorConfig.tensorFormat = 'RGBA';
                    tensorConfig.height = height;
                    tensorConfig.width = width;
                }
                canvas.width = width;
                canvas.height = height;
                pixels2DContext.drawImage(image, 0, 0, width, height);
                data = pixels2DContext.getImageData(0, 0, width, height).data;
            }
            else {
                throw new Error('Can not access image data');
            }
        }
        else if (isImageDataEle) {
            // ImageData - image object - format is RGBA by default
            const format = 'RGBA';
            let height;
            let width;
            if (options !== undefined && options.resizedWidth !== undefined && options.resizedHeight !== undefined) {
                height = options.resizedHeight;
                width = options.resizedWidth;
            }
            else {
                height = image.height;
                width = image.width;
            }
            if (options !== undefined) {
                tensorConfig = options;
                if (options.bitmapFormat !== undefined && options.bitmapFormat !== format) {
                    throw new Error('Image input config format must be RGBA for ImageData');
                }
                else {
                    tensorConfig.bitmapFormat = 'RGBA';
                }
            }
            else {
                tensorConfig.bitmapFormat = 'RGBA';
            }
            tensorConfig.height = height;
            tensorConfig.width = width;
            if (options !== undefined) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const pixels2DContext = tempCanvas.getContext('2d');
                if (pixels2DContext != null) {
                    pixels2DContext.putImageData(image, 0, 0);
                    data = pixels2DContext.getImageData(0, 0, width, height).data;
                }
                else {
                    throw new Error('Can not access image data');
                }
            }
            else {
                data = image.data;
            }
        }
        else if (isImageBitmap) {
            // ImageBitmap - image object - format must be provided by user
            if (options === undefined) {
                throw new Error('Please provide image config with format for Imagebitmap');
            }
            if (options.bitmapFormat !== undefined) {
                throw new Error('Image input config format must be defined for ImageBitmap');
            }
            const pixels2DContext = document.createElement('canvas').getContext('2d');
            if (pixels2DContext != null) {
                const height = image.height;
                const width = image.width;
                pixels2DContext.drawImage(image, 0, 0, width, height);
                data = pixels2DContext.getImageData(0, 0, width, height).data;
                if (options !== undefined) {
                    // using square brackets to avoid TS error - type 'never'
                    if (options.height !== undefined && options.height !== height) {
                        throw new Error('Image input config height doesn\'t match ImageBitmap height');
                    }
                    else {
                        tensorConfig.height = height;
                    }
                    // using square brackets to avoid TS error - type 'never'
                    if (options.width !== undefined && options.width !== width) {
                        throw new Error('Image input config width doesn\'t match ImageBitmap width');
                    }
                    else {
                        tensorConfig.width = width;
                    }
                }
                else {
                    tensorConfig.height = height;
                    tensorConfig.width = width;
                }
                return Tensor.bufferToTensor(data, tensorConfig);
            }
            else {
                throw new Error('Can not access image data');
            }
        }
        else if (isURL) {
            return new Promise((resolve, reject) => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!image || !context) {
                    return reject();
                }
                const newImage = new Image();
                newImage.crossOrigin = 'Anonymous';
                newImage.src = image;
                newImage.onload = () => {
                    canvas.width = newImage.width;
                    canvas.height = newImage.height;
                    context.drawImage(newImage, 0, 0, canvas.width, canvas.height);
                    const img = context.getImageData(0, 0, canvas.width, canvas.height);
                    if (options !== undefined) {
                        // using square brackets to avoid TS error - type 'never'
                        if (options.height !== undefined && options.height !== canvas.height) {
                            throw new Error('Image input config height doesn\'t match ImageBitmap height');
                        }
                        else {
                            tensorConfig.height = canvas.height;
                        }
                        // using square brackets to avoid TS error - type 'never'
                        if (options.width !== undefined && options.width !== canvas.width) {
                            throw new Error('Image input config width doesn\'t match ImageBitmap width');
                        }
                        else {
                            tensorConfig.width = canvas.width;
                        }
                    }
                    else {
                        tensorConfig.height = canvas.height;
                        tensorConfig.width = canvas.width;
                    }
                    resolve(Tensor.bufferToTensor(img.data, tensorConfig));
                };
            });
        }
        else {
            throw new Error('Input data provided is not supported - aborted tensor creation');
        }
        if (data !== undefined) {
            return Tensor.bufferToTensor(data, tensorConfig);
        }
        else {
            throw new Error('Input data provided is not supported - aborted tensor creation');
        }
    }
    toImageData(options) {
        var _a, _b;
        const pixels2DContext = document.createElement('canvas').getContext('2d');
        let image;
        if (pixels2DContext != null) {
            // Default values for height and width & format
            const width = this.dims[3];
            const height = this.dims[2];
            const channels = this.dims[1];
            const inputformat = options !== undefined ? (options.format !== undefined ? options.format : 'RGB') : 'RGB';
            const normMean = options !== undefined ? (((_a = options.norm) === null || _a === void 0 ? void 0 : _a.mean) !== undefined ? options.norm.mean : 255) : 255;
            const normBias = options !== undefined ? (((_b = options.norm) === null || _b === void 0 ? void 0 : _b.bias) !== undefined ? options.norm.bias : 0) : 0;
            const offset = height * width;
            if (options !== undefined) {
                if (options.height !== undefined && options.height !== height) {
                    throw new Error('Image output config height doesn\'t match tensor height');
                }
                if (options.width !== undefined && options.width !== width) {
                    throw new Error('Image output config width doesn\'t match tensor width');
                }
                if (options.format !== undefined && (channels === 4 && options.format !== 'RGBA') ||
                    (channels === 3 && (options.format !== 'RGB' && options.format !== 'BGR'))) {
                    throw new Error('Tensor format doesn\'t match input tensor dims');
                }
            }
            // Default pointer assignments
            const step = 4;
            let rImagePointer = 0, gImagePointer = 1, bImagePointer = 2, aImagePointer = 3;
            let rTensorPointer = 0, gTensorPointer = offset, bTensorPointer = offset * 2, aTensorPointer = -1;
            // Updating the pointer assignments based on the input image format
            if (inputformat === 'RGBA') {
                rTensorPointer = 0;
                gTensorPointer = offset;
                bTensorPointer = offset * 2;
                aTensorPointer = offset * 3;
            }
            else if (inputformat === 'RGB') {
                rTensorPointer = 0;
                gTensorPointer = offset;
                bTensorPointer = offset * 2;
            }
            else if (inputformat === 'RBG') {
                rTensorPointer = 0;
                bTensorPointer = offset;
                gTensorPointer = offset * 2;
            }
            image = pixels2DContext.createImageData(width, height);
            for (let i = 0; i < height * width; rImagePointer += step, gImagePointer += step, bImagePointer += step, aImagePointer += step, i++) {
                image.data[rImagePointer] = (this.data[rTensorPointer++] - normBias) * normMean; // R value
                image.data[gImagePointer] = (this.data[gTensorPointer++] - normBias) * normMean; // G value
                image.data[bImagePointer] = (this.data[bTensorPointer++] - normBias) * normMean; // B value
                image.data[aImagePointer] =
                    aTensorPointer === -1 ? 255 : (this.data[aTensorPointer++] - normBias) * normMean; // A value
            }
        }
        else {
            throw new Error('Can not access image data');
        }
        return image;
    }
    // #endregion
    // #region tensor utilities
    reshape(dims) {
        return new Tensor(this.type, this.data, dims);
    }
}
//# sourceMappingURL=tensor-impl.js.map

/***/ }),

/***/ "./node_modules/onnxruntime-common/dist/lib/tensor.js":
/*!************************************************************!*\
  !*** ./node_modules/onnxruntime-common/dist/lib/tensor.js ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Tensor": () => (/* binding */ Tensor)
/* harmony export */ });
/* harmony import */ var _tensor_impl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./tensor-impl */ "./node_modules/onnxruntime-common/dist/lib/tensor-impl.js");
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// eslint-disable-next-line @typescript-eslint/naming-convention
const Tensor = _tensor_impl__WEBPACK_IMPORTED_MODULE_0__.Tensor;
//# sourceMappingURL=tensor.js.map

/***/ }),

/***/ "./node_modules/onnxruntime-web/dist/ort-web.min.js":
/*!**********************************************************!*\
  !*** ./node_modules/onnxruntime-web/dist/ort-web.min.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*!
* ONNX Runtime Web v1.14.0
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License.
*/
!function(t,e){if(true)module.exports=e(__webpack_require__(/*! onnxruntime-common */ "./node_modules/onnxruntime-common/dist/lib/index.js"));else { var r, n; }}(self,(__WEBPACK_EXTERNAL_MODULE__1670__=>(()=>{var __webpack_modules__={3474:(t,e,n)=>{var _scriptDir,r=(_scriptDir=(_scriptDir="undefined"!=typeof document&&document.currentScript?document.currentScript.src:void 0)||"/index.js",function(t){function e(){return $.buffer!=C&&H($.buffer),F}function r(){return $.buffer!=C&&H($.buffer),N}function i(){return $.buffer!=C&&H($.buffer),L}function o(){return $.buffer!=C&&H($.buffer),R}function a(){return $.buffer!=C&&H($.buffer),j}var s,u,c;t=t||{},s||(s=void 0!==t?t:{}),s.ready=new Promise((function(t,e){u=t,c=e}));var l,p,f,d,h,g,b=Object.assign({},s),m="./this.program",y=(t,e)=>{throw e},_="object"==typeof window,v="function"==typeof importScripts,w="object"==typeof process&&"object"==typeof process.versions&&"string"==typeof process.versions.node,x=s.ENVIRONMENT_IS_PTHREAD||!1,T="";function S(t){return s.locateFile?s.locateFile(t,T):T+t}if(w){let e;T=v?n(908).dirname(T)+"/":"//",g=()=>{h||(d=n(1384),h=n(908))},l=function(t,e){return g(),t=h.normalize(t),d.readFileSync(t,e?void 0:"utf8")},f=t=>((t=l(t,!0)).buffer||(t=new Uint8Array(t)),t),p=(t,e,n)=>{g(),t=h.normalize(t),d.readFile(t,(function(t,r){t?n(t):e(r.buffer)}))},1<process.argv.length&&(m=process.argv[1].replace(/\\/g,"/")),process.argv.slice(2),process.on("uncaughtException",(function(t){if(!(t instanceof ut))throw t})),process.on("unhandledRejection",(function(t){throw t})),y=(t,e)=>{if(J())throw process.exitCode=t,e;e instanceof ut||P("exiting due to exception: "+e),process.exit(t)},s.inspect=function(){return"[Emscripten Module object]"};try{e=n(9925)}catch(t){throw console.error('The "worker_threads" module is not supported in this node.js build - perhaps a newer version is needed?'),t}n.g.Worker=e.Worker}else(_||v)&&(v?T=self.location.href:"undefined"!=typeof document&&document.currentScript&&(T=document.currentScript.src),_scriptDir&&(T=_scriptDir),T=0!==T.indexOf("blob:")?T.substr(0,T.replace(/[?#].*/,"").lastIndexOf("/")+1):"",w||(l=t=>{var e=new XMLHttpRequest;return e.open("GET",t,!1),e.send(null),e.responseText},v&&(f=t=>{var e=new XMLHttpRequest;return e.open("GET",t,!1),e.responseType="arraybuffer",e.send(null),new Uint8Array(e.response)}),p=(t,e,n)=>{var r=new XMLHttpRequest;r.open("GET",t,!0),r.responseType="arraybuffer",r.onload=()=>{200==r.status||0==r.status&&r.response?e(r.response):n()},r.onerror=n,r.send(null)}));w&&"undefined"==typeof performance&&(n.g.performance=n(6953).performance);var O=console.log.bind(console),A=console.warn.bind(console);w&&(g(),O=t=>d.writeSync(1,t+"\n"),A=t=>d.writeSync(2,t+"\n"));var E,I=s.print||O,P=s.printErr||A;Object.assign(s,b),b=null,s.thisProgram&&(m=s.thisProgram),s.quit&&(y=s.quit),s.wasmBinary&&(E=s.wasmBinary);var D=s.noExitRuntime||!1;"object"!=typeof WebAssembly&&it("no native wasm support detected");var $,k,C,F,N,L,R,j,M=!1,U="undefined"!=typeof TextDecoder?new TextDecoder("utf8"):void 0;function V(t,e,n){var r=(e>>>=0)+n;for(n=e;t[n]&&!(n>=r);)++n;if(16<n-e&&t.buffer&&U)return U.decode(t.buffer instanceof SharedArrayBuffer?t.slice(e,n):t.subarray(e,n));for(r="";e<n;){var i=t[e++];if(128&i){var o=63&t[e++];if(192==(224&i))r+=String.fromCharCode((31&i)<<6|o);else{var a=63&t[e++];65536>(i=224==(240&i)?(15&i)<<12|o<<6|a:(7&i)<<18|o<<12|a<<6|63&t[e++])?r+=String.fromCharCode(i):(i-=65536,r+=String.fromCharCode(55296|i>>10,56320|1023&i))}}else r+=String.fromCharCode(i)}return r}function B(t,e){return(t>>>=0)?V(r(),t,e):""}function z(t,e,n,r){if(!(0<r))return 0;var i=n>>>=0;r=n+r-1;for(var o=0;o<t.length;++o){var a=t.charCodeAt(o);if(55296<=a&&57343>=a&&(a=65536+((1023&a)<<10)|1023&t.charCodeAt(++o)),127>=a){if(n>=r)break;e[n++>>>0]=a}else{if(2047>=a){if(n+1>=r)break;e[n++>>>0]=192|a>>6}else{if(65535>=a){if(n+2>=r)break;e[n++>>>0]=224|a>>12}else{if(n+3>=r)break;e[n++>>>0]=240|a>>18,e[n++>>>0]=128|a>>12&63}e[n++>>>0]=128|a>>6&63}e[n++>>>0]=128|63&a}}return e[n>>>0]=0,n-i}function G(t){for(var e=0,n=0;n<t.length;++n){var r=t.charCodeAt(n);127>=r?e++:2047>=r?e+=2:55296<=r&&57343>=r?(e+=4,++n):e+=3}return e}function H(t){C=t,s.HEAP8=F=new Int8Array(t),s.HEAP16=new Int16Array(t),s.HEAP32=L=new Int32Array(t),s.HEAPU8=N=new Uint8Array(t),s.HEAPU16=new Uint16Array(t),s.HEAPU32=R=new Uint32Array(t),s.HEAPF32=new Float32Array(t),s.HEAPF64=j=new Float64Array(t)}x&&(C=s.buffer);var W=s.INITIAL_MEMORY||16777216;if(x)$=s.wasmMemory,C=s.buffer;else if(s.wasmMemory)$=s.wasmMemory;else if(!(($=new WebAssembly.Memory({initial:W/65536,maximum:65536,shared:!0})).buffer instanceof SharedArrayBuffer))throw P("requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer, indicating that while the browser has SharedArrayBuffer it does not have WebAssembly threads support - you may need to set a flag"),w&&console.log("(on node you may need: --experimental-wasm-threads --experimental-wasm-bulk-memory and also use a recent version)"),Error("bad memory");$&&(C=$.buffer),W=C.byteLength,H(C);var q,X=[],Y=[],K=[],Z=[];function J(){return D||!1}function Q(){var t=s.preRun.shift();X.unshift(t)}var tt,et=0,nt=null,rt=null;function it(t){throw x?postMessage({cmd:"onAbort",arg:t}):s.onAbort&&s.onAbort(t),P(t="Aborted("+t+")"),M=!0,t=new WebAssembly.RuntimeError(t+". Build with -sASSERTIONS for more info."),c(t),t}function ot(){return tt.startsWith("data:application/octet-stream;base64,")}function at(){var t=tt;try{if(t==tt&&E)return new Uint8Array(E);if(f)return f(t);throw"both async and sync fetching of the wasm failed"}catch(t){it(t)}}tt="ort-wasm-threaded.wasm",ot()||(tt=S(tt));var st={};function ut(t){this.name="ExitStatus",this.message="Program terminated with exit("+t+")",this.status=t}function ct(t){(t=dt.Vb[t])||it(),dt.mc(t)}function lt(t){var e=dt.Cc();if(!e)return 6;dt.ac.push(e),dt.Vb[t.Ub]=e,e.Ub=t.Ub;var n={cmd:"run",start_routine:t.Ic,arg:t.zc,pthread_ptr:t.Ub};return e.$b=()=>{n.time=performance.now(),e.postMessage(n,t.Nc)},e.loaded&&(e.$b(),delete e.$b),0}function pt(t){if(x)return qt(1,1,t);J()||(dt.oc(),s.onExit&&s.onExit(t),M=!0),y(t,new ut(t))}function ft(t,e){if(!e&&x)throw bt(t),"unwind";J()||x||(me(),ht(K),be(0),re[1].length&&ie(1,10),re[2].length&&ie(2,10),dt.oc()),pt(t)}var dt={Yb:[],ac:[],qc:[],Vb:{},fc:function(){x&&dt.Ec()},Pc:function(){},Ec:function(){dt.receiveObjectTransfer=dt.Gc,dt.threadInitTLS=dt.pc,dt.setExitStatus=dt.nc,D=!1},nc:function(){},oc:function(){for(var t of Object.values(dt.Vb))dt.mc(t);for(t of dt.Yb)t.terminate();dt.Yb=[]},mc:function(t){var e=t.Ub;delete dt.Vb[e],dt.Yb.push(t),dt.ac.splice(dt.ac.indexOf(t),1),t.Ub=0,xe(e)},Gc:function(){},pc:function(){dt.qc.forEach((t=>t()))},Fc:function(t,e){t.onmessage=n=>{var r=(n=n.data).cmd;if(t.Ub&&(dt.Bc=t.Ub),n.targetThread&&n.targetThread!=de()){var i=dt.Vb[n.Qc];i?i.postMessage(n,n.transferList):P('Internal error! Worker sent a message "'+r+'" to target pthread '+n.targetThread+", but that thread no longer exists!")}else"processProxyingQueue"===r?Vt(n.queue):"spawnThread"===r?lt(n):"cleanupThread"===r?ct(n.thread):"killThread"===r?(n=n.thread,r=dt.Vb[n],delete dt.Vb[n],r.terminate(),xe(n),dt.ac.splice(dt.ac.indexOf(r),1),r.Ub=0):"cancelThread"===r?dt.Vb[n.thread].postMessage({cmd:"cancel"}):"loaded"===r?(t.loaded=!0,e&&e(t),t.$b&&(t.$b(),delete t.$b)):"print"===r?I("Thread "+n.threadId+": "+n.text):"printErr"===r?P("Thread "+n.threadId+": "+n.text):"alert"===r?alert("Thread "+n.threadId+": "+n.text):"setimmediate"===n.target?t.postMessage(n):"onAbort"===r?s.onAbort&&s.onAbort(n.arg):r&&P("worker sent an unknown command "+r);dt.Bc=void 0},t.onerror=t=>{throw P("worker sent an error! "+t.filename+":"+t.lineno+": "+t.message),t},w&&(t.on("message",(function(e){t.onmessage({data:e})})),t.on("error",(function(e){t.onerror(e)})),t.on("detachedExit",(function(){}))),t.postMessage({cmd:"load",urlOrBlob:s.mainScriptUrlOrBlob||_scriptDir,wasmMemory:$,wasmModule:k})},yc:function(){var t=S("ort-wasm-threaded.worker.js");dt.Yb.push(new Worker(t))},Cc:function(){return 0==dt.Yb.length&&(dt.yc(),dt.Fc(dt.Yb[0])),dt.Yb.pop()}};function ht(t){for(;0<t.length;)t.shift()(s)}function gt(t){var e=Ae();return t=t(),Ee(e),t}function bt(t){if(x)return qt(2,0,t);try{ft(t)}catch(t){t instanceof ut||"unwind"==t||y(1,t)}}s.PThread=dt,s.establishStackSpace=function(){var t=de(),e=i()[t+44>>2>>>0];t=i()[t+48>>2>>>0],Oe(e,e-t),Ee(e)};var mt=[];function yt(t){var e=mt[t];return e||(t>=mt.length&&(mt.length=t+1),mt[t]=e=q.get(t)),e}s.invokeEntryPoint=function(t,e){t=yt(t)(e),J()?dt.nc(t):Te(t)};var _t,vt,wt=[],xt=0,Tt=0;function St(t){this.Zb=t,this.Sb=t-24,this.xc=function(t){o()[this.Sb+4>>2>>>0]=t},this.bc=function(){return o()[this.Sb+4>>2>>>0]},this.wc=function(t){o()[this.Sb+8>>2>>>0]=t},this.Dc=function(){return o()[this.Sb+8>>2>>>0]},this.rc=function(){i()[this.Sb>>2>>>0]=0},this.hc=function(t){t=t?1:0,e()[this.Sb+12>>0>>>0]=t},this.uc=function(){return 0!=e()[this.Sb+12>>0>>>0]},this.ic=function(t){t=t?1:0,e()[this.Sb+13>>0>>>0]=t},this.kc=function(){return 0!=e()[this.Sb+13>>0>>>0]},this.fc=function(t,e){this.cc(0),this.xc(t),this.wc(e),this.rc(),this.hc(!1),this.ic(!1)},this.sc=function(){Atomics.add(i(),this.Sb>>2,1)},this.Hc=function(){return 1===Atomics.sub(i(),this.Sb>>2,1)},this.cc=function(t){o()[this.Sb+16>>2>>>0]=t},this.tc=function(){return o()[this.Sb+16>>2>>>0]},this.vc=function(){if(De(this.bc()))return o()[this.Zb>>2>>>0];var t=this.tc();return 0!==t?t:this.Zb}}function Ot(t){return ge(new St(t).Sb)}function At(t,e,n,r){return x?qt(3,1,t,e,n,r):Et(t,e,n,r)}function Et(t,e,n,r){if("undefined"==typeof SharedArrayBuffer)return P("Current environment does not support SharedArrayBuffer, pthreads are not available!"),6;var i=[];return x&&0===i.length?At(t,e,n,r):(t={Ic:n,Ub:t,zc:r,Nc:i},x?(t.Oc="spawnThread",postMessage(t,i),0):lt(t))}function It(t,e,n){return x?qt(4,1,t,e,n):0}function Pt(t,e){if(x)return qt(5,1,t,e)}function Dt(t,e){if(x)return qt(6,1,t,e)}function $t(t,e,n){if(x)return qt(7,1,t,e,n)}function kt(t,e,n){return x?qt(8,1,t,e,n):0}function Ct(t,e){if(x)return qt(9,1,t,e)}function Ft(t,e,n){if(x)return qt(10,1,t,e,n)}function Nt(t,e,n,r){if(x)return qt(11,1,t,e,n,r)}function Lt(t,e,n,r){if(x)return qt(12,1,t,e,n,r)}function Rt(t,e,n,r){if(x)return qt(13,1,t,e,n,r)}function jt(t){if(x)return qt(14,1,t)}function Mt(t,e){if(x)return qt(15,1,t,e)}function Ut(t,e,n){if(x)return qt(16,1,t,e,n)}function Vt(t){Atomics.store(i(),t>>2,1),de()&&we(t),Atomics.compareExchange(i(),t>>2,1,0)}function Bt(t){return o()[t>>>2]+4294967296*i()[t+4>>>2]}function zt(t,e,n,r,i,o){return x?qt(17,1,t,e,n,r,i,o):-52}function Gt(t,e,n,r,i,o){if(x)return qt(18,1,t,e,n,r,i,o)}function Ht(t){var n=G(t)+1,r=he(n);return r&&z(t,e(),r,n),r}function Wt(t,e,n){function r(t){return(t=t.toTimeString().match(/\(([A-Za-z ]+)\)$/))?t[1]:"GMT"}if(x)return qt(19,1,t,e,n);var a=(new Date).getFullYear(),s=new Date(a,0,1),u=new Date(a,6,1);a=s.getTimezoneOffset();var c=u.getTimezoneOffset(),l=Math.max(a,c);i()[t>>2>>>0]=60*l,i()[e>>2>>>0]=Number(a!=c),t=r(s),e=r(u),t=Ht(t),e=Ht(e),c<a?(o()[n>>2>>>0]=t,o()[n+4>>2>>>0]=e):(o()[n>>2>>>0]=e,o()[n+4>>2>>>0]=t)}function qt(t,e){var n=arguments.length-2,r=arguments;return gt((()=>{for(var i=Ie(8*n),o=i>>3,s=0;s<n;s++){var u=r[2+s];a()[o+s>>>0]=u}return ve(t,n,i,e)}))}s.executeNotifiedProxyingQueue=Vt,vt=w?()=>{var t=process.hrtime();return 1e3*t[0]+t[1]/1e6}:x?()=>performance.now()-s.__performance_now_clock_drift:()=>performance.now();var Xt,Yt=[],Kt={};function Zt(){if(!Xt){var t,e={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:("object"==typeof navigator&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:m||"./this.program"};for(t in Kt)void 0===Kt[t]?delete e[t]:e[t]=Kt[t];var n=[];for(t in e)n.push(t+"="+e[t]);Xt=n}return Xt}function Jt(t,n){if(x)return qt(20,1,t,n);var r=0;return Zt().forEach((function(i,a){var s=n+r;for(a=o()[t+4*a>>2>>>0]=s,s=0;s<i.length;++s)e()[a++>>0>>>0]=i.charCodeAt(s);e()[a>>0>>>0]=0,r+=i.length+1})),0}function Qt(t,e){if(x)return qt(21,1,t,e);var n=Zt();o()[t>>2>>>0]=n.length;var r=0;return n.forEach((function(t){r+=t.length+1})),o()[e>>2>>>0]=r,0}function te(t){return x?qt(22,1,t):52}function ee(t,e,n,r){return x?qt(23,1,t,e,n,r):52}function ne(t,e,n,r,i){return x?qt(24,1,t,e,n,r,i):70}var re=[null,[],[]];function ie(t,e){var n=re[t];0===e||10===e?((1===t?I:P)(V(n,0)),n.length=0):n.push(e)}function oe(t,e,n,i){if(x)return qt(25,1,t,e,n,i);for(var a=0,s=0;s<n;s++){var u=o()[e>>2>>>0],c=o()[e+4>>2>>>0];e+=8;for(var l=0;l<c;l++)ie(t,r()[u+l>>>0]);a+=c}return o()[i>>2>>>0]=a,0}var ae=0;function se(t){return 0==t%4&&(0!=t%100||0==t%400)}var ue=[31,29,31,30,31,30,31,31,30,31,30,31],ce=[31,28,31,30,31,30,31,31,30,31,30,31];function le(t,n,r,o){function a(t,e,n){for(t="number"==typeof t?t.toString():t||"";t.length<e;)t=n[0]+t;return t}function s(t,e){return a(t,e,"0")}function u(t,e){function n(t){return 0>t?-1:0<t?1:0}var r;return 0===(r=n(t.getFullYear()-e.getFullYear()))&&0===(r=n(t.getMonth()-e.getMonth()))&&(r=n(t.getDate()-e.getDate())),r}function c(t){switch(t.getDay()){case 0:return new Date(t.getFullYear()-1,11,29);case 1:return t;case 2:return new Date(t.getFullYear(),0,3);case 3:return new Date(t.getFullYear(),0,2);case 4:return new Date(t.getFullYear(),0,1);case 5:return new Date(t.getFullYear()-1,11,31);case 6:return new Date(t.getFullYear()-1,11,30)}}function l(t){var e=t.Wb;for(t=new Date(new Date(t.Xb+1900,0,1).getTime());0<e;){var n=t.getMonth(),r=(se(t.getFullYear())?ue:ce)[n];if(!(e>r-t.getDate())){t.setDate(t.getDate()+e);break}e-=r-t.getDate()+1,t.setDate(1),11>n?t.setMonth(n+1):(t.setMonth(0),t.setFullYear(t.getFullYear()+1))}return n=new Date(t.getFullYear()+1,0,4),e=c(new Date(t.getFullYear(),0,4)),n=c(n),0>=u(e,t)?0>=u(n,t)?t.getFullYear()+1:t.getFullYear():t.getFullYear()-1}var p=i()[o+40>>2>>>0];for(var f in o={Lc:i()[o>>2>>>0],Kc:i()[o+4>>2>>>0],dc:i()[o+8>>2>>>0],jc:i()[o+12>>2>>>0],ec:i()[o+16>>2>>>0],Xb:i()[o+20>>2>>>0],Tb:i()[o+24>>2>>>0],Wb:i()[o+28>>2>>>0],Rc:i()[o+32>>2>>>0],Jc:i()[o+36>>2>>>0],Mc:p?B(p):""},r=B(r),p={"%c":"%a %b %d %H:%M:%S %Y","%D":"%m/%d/%y","%F":"%Y-%m-%d","%h":"%b","%r":"%I:%M:%S %p","%R":"%H:%M","%T":"%H:%M:%S","%x":"%m/%d/%y","%X":"%H:%M:%S","%Ec":"%c","%EC":"%C","%Ex":"%m/%d/%y","%EX":"%H:%M:%S","%Ey":"%y","%EY":"%Y","%Od":"%d","%Oe":"%e","%OH":"%H","%OI":"%I","%Om":"%m","%OM":"%M","%OS":"%S","%Ou":"%u","%OU":"%U","%OV":"%V","%Ow":"%w","%OW":"%W","%Oy":"%y"})r=r.replace(new RegExp(f,"g"),p[f]);var d="Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),h="January February March April May June July August September October November December".split(" ");for(f in p={"%a":function(t){return d[t.Tb].substring(0,3)},"%A":function(t){return d[t.Tb]},"%b":function(t){return h[t.ec].substring(0,3)},"%B":function(t){return h[t.ec]},"%C":function(t){return s((t.Xb+1900)/100|0,2)},"%d":function(t){return s(t.jc,2)},"%e":function(t){return a(t.jc,2," ")},"%g":function(t){return l(t).toString().substring(2)},"%G":function(t){return l(t)},"%H":function(t){return s(t.dc,2)},"%I":function(t){return 0==(t=t.dc)?t=12:12<t&&(t-=12),s(t,2)},"%j":function(t){for(var e=0,n=0;n<=t.ec-1;e+=(se(t.Xb+1900)?ue:ce)[n++]);return s(t.jc+e,3)},"%m":function(t){return s(t.ec+1,2)},"%M":function(t){return s(t.Kc,2)},"%n":function(){return"\n"},"%p":function(t){return 0<=t.dc&&12>t.dc?"AM":"PM"},"%S":function(t){return s(t.Lc,2)},"%t":function(){return"\t"},"%u":function(t){return t.Tb||7},"%U":function(t){return s(Math.floor((t.Wb+7-t.Tb)/7),2)},"%V":function(t){var e=Math.floor((t.Wb+7-(t.Tb+6)%7)/7);if(2>=(t.Tb+371-t.Wb-2)%7&&e++,e)53==e&&(4==(n=(t.Tb+371-t.Wb)%7)||3==n&&se(t.Xb)||(e=1));else{e=52;var n=(t.Tb+7-t.Wb-1)%7;(4==n||5==n&&se(t.Xb%400-1))&&e++}return s(e,2)},"%w":function(t){return t.Tb},"%W":function(t){return s(Math.floor((t.Wb+7-(t.Tb+6)%7)/7),2)},"%y":function(t){return(t.Xb+1900).toString().substring(2)},"%Y":function(t){return t.Xb+1900},"%z":function(t){var e=0<=(t=t.Jc);return t=Math.abs(t)/60,(e?"+":"-")+String("0000"+(t/60*100+t%60)).slice(-4)},"%Z":function(t){return t.Mc},"%%":function(){return"%"}},r=r.replace(/%%/g,"\0\0"),p)r.includes(f)&&(r=r.replace(new RegExp(f,"g"),p[f](o)));return f=function(t){var e=Array(G(t)+1);return z(t,e,0,e.length),e}(r=r.replace(/\0\0/g,"%")),f.length>n?0:(function(t,n){e().set(t,n>>>0)}(f,t),f.length-1)}dt.fc();var pe=[null,pt,bt,At,It,Pt,Dt,$t,kt,Ct,Ft,Nt,Lt,Rt,jt,Mt,Ut,zt,Gt,Wt,Jt,Qt,te,ee,ne,oe],fe={b:function(t){return he(t+24)+24},n:function(t){return(t=new St(t)).uc()||(t.hc(!0),xt--),t.ic(!1),wt.push(t),t.sc(),t.vc()},ma:function(t){throw P("Unexpected exception thrown, this is not properly supported - aborting"),M=!0,t},x:function(){Se(0);var t=wt.pop();if(t.Hc()&&!t.kc()){var e=t.Dc();e&&yt(e)(t.Zb),Ot(t.Zb)}Tt=0},e:function(){var t=Tt;if(!t)return ae=0;var e=new St(t);e.cc(t);var n=e.bc();if(!n)return ae=0,t;for(var r=Array.prototype.slice.call(arguments),i=0;i<r.length;i++){var o=r[i];if(0===o||o===n)break;if(Pe(o,n,e.Sb+16))return ae=o,t}return ae=n,t},l:function(){var t=Tt;if(!t)return ae=0;var e=new St(t);e.cc(t);var n=e.bc();if(!n)return ae=0,t;for(var r=Array.prototype.slice.call(arguments),i=0;i<r.length;i++){var o=r[i];if(0===o||o===n)break;if(Pe(o,n,e.Sb+16))return ae=o,t}return ae=n,t},h:function(){var t=Tt;if(!t)return ae=0;var e=new St(t);e.cc(t);var n=e.bc();if(!n)return ae=0,t;for(var r=Array.prototype.slice.call(arguments),i=0;i<r.length;i++){var o=r[i];if(0===o||o===n)break;if(Pe(o,n,e.Sb+16))return ae=o,t}return ae=n,t},t:Ot,M:function(){var t=wt.pop();t||it("no exception to throw");var e=t.Zb;throw t.kc()||(wt.push(t),t.ic(!0),t.hc(!1),xt++),Tt=e,e},c:function(t,e,n){throw new St(t).fc(e,n),Tt=t,xt++,t},pa:function(){return xt},Fa:function(t){ye(t,!v,1,!_),dt.pc()},T:function(t){x?postMessage({cmd:"cleanupThread",thread:t}):ct(t)},xa:Et,j:function(t){throw Tt||(Tt=t),t},H:It,Ma:Pt,ua:Dt,wa:$t,oa:kt,Ka:Ct,Ca:Ft,Ja:Nt,V:Lt,va:Rt,sa:jt,La:Mt,ta:Ut,Ta:function(){},X:function(){it("To use dlopen, you need enable dynamic linking, see https://github.com/emscripten-core/emscripten/wiki/Linking")},Ua:function(){it("To use dlopen, you need enable dynamic linking, see https://github.com/emscripten-core/emscripten/wiki/Linking")},W:function(){return Date.now()},ya:function(){return 2097152},Oa:function(){return!0},za:function(t,e,n,r){if(t==e)setTimeout((()=>Vt(r)));else if(x)postMessage({targetThread:t,cmd:"processProxyingQueue",queue:r});else{if(!(t=dt.Vb[t]))return;t.postMessage({cmd:"processProxyingQueue",queue:r})}return 1},Ea:function(){return-1},Pa:function(t,e){t=new Date(1e3*Bt(t)),i()[e>>2>>>0]=t.getUTCSeconds(),i()[e+4>>2>>>0]=t.getUTCMinutes(),i()[e+8>>2>>>0]=t.getUTCHours(),i()[e+12>>2>>>0]=t.getUTCDate(),i()[e+16>>2>>>0]=t.getUTCMonth(),i()[e+20>>2>>>0]=t.getUTCFullYear()-1900,i()[e+24>>2>>>0]=t.getUTCDay(),t=(t.getTime()-Date.UTC(t.getUTCFullYear(),0,1,0,0,0,0))/864e5|0,i()[e+28>>2>>>0]=t},Qa:function(t,e){t=new Date(1e3*Bt(t)),i()[e>>2>>>0]=t.getSeconds(),i()[e+4>>2>>>0]=t.getMinutes(),i()[e+8>>2>>>0]=t.getHours(),i()[e+12>>2>>>0]=t.getDate(),i()[e+16>>2>>>0]=t.getMonth(),i()[e+20>>2>>>0]=t.getFullYear()-1900,i()[e+24>>2>>>0]=t.getDay();var n=new Date(t.getFullYear(),0,1),r=(t.getTime()-n.getTime())/864e5|0;i()[e+28>>2>>>0]=r,i()[e+36>>2>>>0]=-60*t.getTimezoneOffset(),r=new Date(t.getFullYear(),6,1).getTimezoneOffset(),t=0|(r!=(n=n.getTimezoneOffset())&&t.getTimezoneOffset()==Math.min(n,r)),i()[e+32>>2>>>0]=t},Ra:function(t){var e=new Date(i()[t+20>>2>>>0]+1900,i()[t+16>>2>>>0],i()[t+12>>2>>>0],i()[t+8>>2>>>0],i()[t+4>>2>>>0],i()[t>>2>>>0],0),n=i()[t+32>>2>>>0],r=e.getTimezoneOffset(),o=new Date(e.getFullYear(),0,1),a=new Date(e.getFullYear(),6,1).getTimezoneOffset(),s=o.getTimezoneOffset(),u=Math.min(s,a);return 0>n?i()[t+32>>2>>>0]=Number(a!=s&&u==r):0<n!=(u==r)&&(a=Math.max(s,a),e.setTime(e.getTime()+6e4*((0<n?u:a)-r))),i()[t+24>>2>>>0]=e.getDay(),n=(e.getTime()-o.getTime())/864e5|0,i()[t+28>>2>>>0]=n,i()[t>>2>>>0]=e.getSeconds(),i()[t+4>>2>>>0]=e.getMinutes(),i()[t+8>>2>>>0]=e.getHours(),i()[t+12>>2>>>0]=e.getDate(),i()[t+16>>2>>>0]=e.getMonth(),e.getTime()/1e3|0},Aa:zt,Ba:Gt,Sa:function t(e,n,r){t.Ac||(t.Ac=!0,Wt(e,n,r))},y:function(){it("")},U:function(){if(!w&&!v){var t="Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread";_t||(_t={}),_t[t]||(_t[t]=1,w&&(t="warning: "+t),P(t))}},ra:function(){return 4294901760},B:vt,Ia:function(t,e,n){r().copyWithin(t>>>0,e>>>0,e+n>>>0)},F:function(){return w?n(3993).cpus().length:navigator.hardwareConcurrency},Da:function(t,e,n){Yt.length=e,n>>=3;for(var r=0;r<e;r++)Yt[r]=a()[n+r>>>0];return(0>t?st[-t-1]:pe[t]).apply(null,Yt)},qa:function(t){var e=r().length;if((t>>>=0)<=e||4294901760<t)return!1;for(var n=1;4>=n;n*=2){var i=e*(1+.2/n);i=Math.min(i,t+100663296);var o=Math;i=Math.max(t,i),o=o.min.call(o,4294901760,i+(65536-i%65536)%65536);t:{try{$.grow(o-C.byteLength+65535>>>16),H($.buffer);var a=1;break t}catch(t){}a=void 0}if(a)return!0}return!1},Na:function(){throw"unwind"},Ga:Jt,Ha:Qt,J:ft,I:te,S:ee,ga:ne,R:oe,d:function(){return ae},na:function t(r,i){t.lc||(t.lc=function(){if("object"==typeof crypto&&"function"==typeof crypto.getRandomValues){var t=new Uint8Array(1);return()=>(crypto.getRandomValues(t),t[0])}if(w)try{var e=n(Object(function(){var t=new Error("Cannot find module 'crypto'");throw t.code="MODULE_NOT_FOUND",t}()));return()=>e.randomBytes(1)[0]}catch(t){}return()=>it("randomDevice")}());for(var o=0;o<i;o++)e()[r+o>>0>>>0]=t.lc();return 0},ia:function(t,e,n){var r=Ae();try{return yt(t)(e,n)}catch(t){if(Ee(r),t!==t+0)throw t;Se(1,0)}},ja:function(t,e,n){var r=Ae();try{return yt(t)(e,n)}catch(t){if(Ee(r),t!==t+0)throw t;Se(1,0)}},K:function(t){var e=Ae();try{return yt(t)()}catch(t){if(Ee(e),t!==t+0)throw t;Se(1,0)}},f:function(t,e){var n=Ae();try{return yt(t)(e)}catch(t){if(Ee(n),t!==t+0)throw t;Se(1,0)}},P:function(t,e,n){var r=Ae();try{return yt(t)(e,n)}catch(t){if(Ee(r),t!==t+0)throw t;Se(1,0)}},Q:function(t,e,n){var r=Ae();try{return yt(t)(e,n)}catch(t){if(Ee(r),t!==t+0)throw t;Se(1,0)}},k:function(t,e,n){var r=Ae();try{return yt(t)(e,n)}catch(t){if(Ee(r),t!==t+0)throw t;Se(1,0)}},p:function(t,e,n,r){var i=Ae();try{return yt(t)(e,n,r)}catch(t){if(Ee(i),t!==t+0)throw t;Se(1,0)}},q:function(t,e,n,r,i){var o=Ae();try{return yt(t)(e,n,r,i)}catch(t){if(Ee(o),t!==t+0)throw t;Se(1,0)}},N:function(t,e,n,r,i,o){var a=Ae();try{return yt(t)(e,n,r,i,o)}catch(t){if(Ee(a),t!==t+0)throw t;Se(1,0)}},s:function(t,e,n,r,i,o){var a=Ae();try{return yt(t)(e,n,r,i,o)}catch(t){if(Ee(a),t!==t+0)throw t;Se(1,0)}},w:function(t,e,n,r,i,o,a){var s=Ae();try{return yt(t)(e,n,r,i,o,a)}catch(t){if(Ee(s),t!==t+0)throw t;Se(1,0)}},L:function(t,e,n,r,i,o,a,s){var u=Ae();try{return yt(t)(e,n,r,i,o,a,s)}catch(t){if(Ee(u),t!==t+0)throw t;Se(1,0)}},E:function(t,e,n,r,i,o,a,s,u,c,l,p){var f=Ae();try{return yt(t)(e,n,r,i,o,a,s,u,c,l,p)}catch(t){if(Ee(f),t!==t+0)throw t;Se(1,0)}},aa:function(t,e,n,r,i,o,a,s){var u=Ae();try{return Me(t,e,n,r,i,o,a,s)}catch(t){if(Ee(u),t!==t+0)throw t;Se(1,0)}},_:function(t,e,n,r,i,o,a){var s=Ae();try{return ke(t,e,n,r,i,o,a)}catch(t){if(Ee(s),t!==t+0)throw t;Se(1,0)}},Z:function(t,e,n,r,i){var o=Ae();try{return Ue(t,e,n,r,i)}catch(t){if(Ee(o),t!==t+0)throw t;Se(1,0)}},ca:function(t,e,n,r){var i=Ae();try{return Re(t,e,n,r)}catch(t){if(Ee(i),t!==t+0)throw t;Se(1,0)}},$:function(t){var e=Ae();try{return $e(t)}catch(t){if(Ee(e),t!==t+0)throw t;Se(1,0)}},ba:function(t,e){var n=Ae();try{return je(t,e)}catch(t){if(Ee(n),t!==t+0)throw t;Se(1,0)}},Y:function(t,e,n){var r=Ae();try{return Ce(t,e,n)}catch(t){if(Ee(r),t!==t+0)throw t;Se(1,0)}},g:function(t){var e=Ae();try{yt(t)()}catch(t){if(Ee(e),t!==t+0)throw t;Se(1,0)}},r:function(t,e){var n=Ae();try{yt(t)(e)}catch(t){if(Ee(n),t!==t+0)throw t;Se(1,0)}},i:function(t,e,n){var r=Ae();try{yt(t)(e,n)}catch(t){if(Ee(r),t!==t+0)throw t;Se(1,0)}},ha:function(t,e,n,r){var i=Ae();try{yt(t)(e,n,r)}catch(t){if(Ee(i),t!==t+0)throw t;Se(1,0)}},m:function(t,e,n,r){var i=Ae();try{yt(t)(e,n,r)}catch(t){if(Ee(i),t!==t+0)throw t;Se(1,0)}},v:function(t,e,n,r,i){var o=Ae();try{yt(t)(e,n,r,i)}catch(t){if(Ee(o),t!==t+0)throw t;Se(1,0)}},u:function(t,e,n,r,i,o){var a=Ae();try{yt(t)(e,n,r,i,o)}catch(t){if(Ee(a),t!==t+0)throw t;Se(1,0)}},O:function(t,e,n,r,i,o,a){var s=Ae();try{yt(t)(e,n,r,i,o,a)}catch(t){if(Ee(s),t!==t+0)throw t;Se(1,0)}},A:function(t,e,n,r,i,o,a,s){var u=Ae();try{yt(t)(e,n,r,i,o,a,s)}catch(t){if(Ee(u),t!==t+0)throw t;Se(1,0)}},ka:function(t,e,n,r,i,o,a,s,u){var c=Ae();try{yt(t)(e,n,r,i,o,a,s,u)}catch(t){if(Ee(c),t!==t+0)throw t;Se(1,0)}},C:function(t,e,n,r,i,o,a,s,u,c,l){var p=Ae();try{yt(t)(e,n,r,i,o,a,s,u,c,l)}catch(t){if(Ee(p),t!==t+0)throw t;Se(1,0)}},D:function(t,e,n,r,i,o,a,s,u,c,l,p,f,d,h,g){var b=Ae();try{yt(t)(e,n,r,i,o,a,s,u,c,l,p,f,d,h,g)}catch(t){if(Ee(b),t!==t+0)throw t;Se(1,0)}},fa:function(t,e,n,r,i,o,a,s){var u=Ae();try{Fe(t,e,n,r,i,o,a,s)}catch(t){if(Ee(u),t!==t+0)throw t;Se(1,0)}},da:function(t,e,n,r,i,o,a,s,u,c,l,p){var f=Ae();try{Le(t,e,n,r,i,o,a,s,u,c,l,p)}catch(t){if(Ee(f),t!==t+0)throw t;Se(1,0)}},ea:function(t,e,n,r,i,o){var a=Ae();try{Ne(t,e,n,r,i,o)}catch(t){if(Ee(a),t!==t+0)throw t;Se(1,0)}},o:function(t){return t},a:$||s.wasmMemory,G:function(t){ae=t},la:le,z:function(t,e,n,r){return le(t,e,n,r)}};!function(){function t(t,e){s.asm=t.exports,dt.qc.push(s.asm.sb),q=s.asm.ub,Y.unshift(s.asm.Va),k=e,x||(et--,s.monitorRunDependencies&&s.monitorRunDependencies(et),0==et&&(null!==nt&&(clearInterval(nt),nt=null),rt&&(t=rt,rt=null,t())))}function e(e){t(e.instance,e.module)}function n(t){return function(){if(!E&&(_||v)){if("function"==typeof fetch&&!tt.startsWith("file://"))return fetch(tt,{credentials:"same-origin"}).then((function(t){if(!t.ok)throw"failed to load wasm binary file at '"+tt+"'";return t.arrayBuffer()})).catch((function(){return at()}));if(p)return new Promise((function(t,e){p(tt,(function(e){t(new Uint8Array(e))}),e)}))}return Promise.resolve().then((function(){return at()}))}().then((function(t){return WebAssembly.instantiate(t,r)})).then((function(t){return t})).then(t,(function(t){P("failed to asynchronously prepare wasm: "+t),it(t)}))}var r={a:fe};if(x||(et++,s.monitorRunDependencies&&s.monitorRunDependencies(et)),s.instantiateWasm)try{return s.instantiateWasm(r,t)}catch(t){return P("Module.instantiateWasm callback failed with error: "+t),!1}(E||"function"!=typeof WebAssembly.instantiateStreaming||ot()||tt.startsWith("file://")||w||"function"!=typeof fetch?n(e):fetch(tt,{credentials:"same-origin"}).then((function(t){return WebAssembly.instantiateStreaming(t,r).then(e,(function(t){return P("wasm streaming compile failed: "+t),P("falling back to ArrayBuffer instantiation"),n(e)}))}))).catch(c)}(),s.___wasm_call_ctors=function(){return(s.___wasm_call_ctors=s.asm.Va).apply(null,arguments)},s._OrtInit=function(){return(s._OrtInit=s.asm.Wa).apply(null,arguments)},s._OrtCreateSessionOptions=function(){return(s._OrtCreateSessionOptions=s.asm.Xa).apply(null,arguments)},s._OrtAppendExecutionProvider=function(){return(s._OrtAppendExecutionProvider=s.asm.Ya).apply(null,arguments)},s._OrtAddSessionConfigEntry=function(){return(s._OrtAddSessionConfigEntry=s.asm.Za).apply(null,arguments)},s._OrtReleaseSessionOptions=function(){return(s._OrtReleaseSessionOptions=s.asm._a).apply(null,arguments)},s._OrtCreateSession=function(){return(s._OrtCreateSession=s.asm.$a).apply(null,arguments)},s._OrtReleaseSession=function(){return(s._OrtReleaseSession=s.asm.ab).apply(null,arguments)},s._OrtGetInputCount=function(){return(s._OrtGetInputCount=s.asm.bb).apply(null,arguments)},s._OrtGetOutputCount=function(){return(s._OrtGetOutputCount=s.asm.cb).apply(null,arguments)},s._OrtGetInputName=function(){return(s._OrtGetInputName=s.asm.db).apply(null,arguments)},s._OrtGetOutputName=function(){return(s._OrtGetOutputName=s.asm.eb).apply(null,arguments)},s._OrtFree=function(){return(s._OrtFree=s.asm.fb).apply(null,arguments)},s._OrtCreateTensor=function(){return(s._OrtCreateTensor=s.asm.gb).apply(null,arguments)},s._OrtGetTensorData=function(){return(s._OrtGetTensorData=s.asm.hb).apply(null,arguments)},s._OrtReleaseTensor=function(){return(s._OrtReleaseTensor=s.asm.ib).apply(null,arguments)},s._OrtCreateRunOptions=function(){return(s._OrtCreateRunOptions=s.asm.jb).apply(null,arguments)},s._OrtAddRunConfigEntry=function(){return(s._OrtAddRunConfigEntry=s.asm.kb).apply(null,arguments)},s._OrtReleaseRunOptions=function(){return(s._OrtReleaseRunOptions=s.asm.lb).apply(null,arguments)},s._OrtRun=function(){return(s._OrtRun=s.asm.mb).apply(null,arguments)},s._OrtEndProfiling=function(){return(s._OrtEndProfiling=s.asm.nb).apply(null,arguments)};var de=s._pthread_self=function(){return(de=s._pthread_self=s.asm.ob).apply(null,arguments)},he=s._malloc=function(){return(he=s._malloc=s.asm.pb).apply(null,arguments)},ge=s._free=function(){return(ge=s._free=s.asm.qb).apply(null,arguments)},be=s._fflush=function(){return(be=s._fflush=s.asm.rb).apply(null,arguments)};s.__emscripten_tls_init=function(){return(s.__emscripten_tls_init=s.asm.sb).apply(null,arguments)};var me=s.___funcs_on_exit=function(){return(me=s.___funcs_on_exit=s.asm.tb).apply(null,arguments)},ye=s.__emscripten_thread_init=function(){return(ye=s.__emscripten_thread_init=s.asm.vb).apply(null,arguments)};s.__emscripten_thread_crashed=function(){return(s.__emscripten_thread_crashed=s.asm.wb).apply(null,arguments)};var _e,ve=s._emscripten_run_in_main_runtime_thread_js=function(){return(ve=s._emscripten_run_in_main_runtime_thread_js=s.asm.xb).apply(null,arguments)},we=s.__emscripten_proxy_execute_task_queue=function(){return(we=s.__emscripten_proxy_execute_task_queue=s.asm.yb).apply(null,arguments)},xe=s.__emscripten_thread_free_data=function(){return(xe=s.__emscripten_thread_free_data=s.asm.zb).apply(null,arguments)},Te=s.__emscripten_thread_exit=function(){return(Te=s.__emscripten_thread_exit=s.asm.Ab).apply(null,arguments)},Se=s._setThrew=function(){return(Se=s._setThrew=s.asm.Bb).apply(null,arguments)},Oe=s._emscripten_stack_set_limits=function(){return(Oe=s._emscripten_stack_set_limits=s.asm.Cb).apply(null,arguments)},Ae=s.stackSave=function(){return(Ae=s.stackSave=s.asm.Db).apply(null,arguments)},Ee=s.stackRestore=function(){return(Ee=s.stackRestore=s.asm.Eb).apply(null,arguments)},Ie=s.stackAlloc=function(){return(Ie=s.stackAlloc=s.asm.Fb).apply(null,arguments)},Pe=s.___cxa_can_catch=function(){return(Pe=s.___cxa_can_catch=s.asm.Gb).apply(null,arguments)},De=s.___cxa_is_pointer_type=function(){return(De=s.___cxa_is_pointer_type=s.asm.Hb).apply(null,arguments)},$e=s.dynCall_j=function(){return($e=s.dynCall_j=s.asm.Ib).apply(null,arguments)},ke=s.dynCall_iiiiij=function(){return(ke=s.dynCall_iiiiij=s.asm.Jb).apply(null,arguments)},Ce=s.dynCall_jii=function(){return(Ce=s.dynCall_jii=s.asm.Kb).apply(null,arguments)},Fe=s.dynCall_viiiiij=function(){return(Fe=s.dynCall_viiiiij=s.asm.Lb).apply(null,arguments)},Ne=s.dynCall_vjji=function(){return(Ne=s.dynCall_vjji=s.asm.Mb).apply(null,arguments)},Le=s.dynCall_viiijjjii=function(){return(Le=s.dynCall_viiijjjii=s.asm.Nb).apply(null,arguments)},Re=s.dynCall_iij=function(){return(Re=s.dynCall_iij=s.asm.Ob).apply(null,arguments)},je=s.dynCall_ji=function(){return(je=s.dynCall_ji=s.asm.Pb).apply(null,arguments)},Me=s.dynCall_iiiiiij=function(){return(Me=s.dynCall_iiiiiij=s.asm.Qb).apply(null,arguments)},Ue=s.dynCall_iiij=function(){return(Ue=s.dynCall_iiij=s.asm.Rb).apply(null,arguments)};function Ve(){function t(){if(!_e&&(_e=!0,s.calledRun=!0,!M)&&(x||ht(Y),u(s),s.onRuntimeInitialized&&s.onRuntimeInitialized(),!x)){if(s.postRun)for("function"==typeof s.postRun&&(s.postRun=[s.postRun]);s.postRun.length;){var t=s.postRun.shift();Z.unshift(t)}ht(Z)}}if(!(0<et))if(x)u(s),x||ht(Y),postMessage({cmd:"loaded"});else{if(s.preRun)for("function"==typeof s.preRun&&(s.preRun=[s.preRun]);s.preRun.length;)Q();ht(X),0<et||(s.setStatus?(s.setStatus("Running..."),setTimeout((function(){setTimeout((function(){s.setStatus("")}),1),t()}),1)):t())}}if(s.UTF8ToString=B,s.stringToUTF8=function(t,e,n){return z(t,r(),e,n)},s.lengthBytesUTF8=G,s.keepRuntimeAlive=J,s.wasmMemory=$,s.stackSave=Ae,s.stackRestore=Ee,s.stackAlloc=Ie,s.ExitStatus=ut,s.PThread=dt,rt=function t(){_e||Ve(),_e||(rt=t)},s.preInit)for("function"==typeof s.preInit&&(s.preInit=[s.preInit]);0<s.preInit.length;)s.preInit.pop()();return Ve(),t.ready});t.exports=r},932:(t,e,n)=>{var _scriptDir,r=(_scriptDir=(_scriptDir="undefined"!=typeof document&&document.currentScript?document.currentScript.src:void 0)||"/index.js",function(t){var e,r,i;t=t||{},e||(e=void 0!==t?t:{}),e.ready=new Promise((function(t,e){r=t,i=e}));var o,a,s,u,c,l,p=Object.assign({},e),f="./this.program",d=(t,e)=>{throw e},h="object"==typeof window,g="function"==typeof importScripts,b="object"==typeof process&&"object"==typeof process.versions&&"string"==typeof process.versions.node,m="";b?(m=g?n(908).dirname(m)+"/":"//",l=()=>{c||(u=n(1384),c=n(908))},o=function(t,e){return l(),t=c.normalize(t),u.readFileSync(t,e?void 0:"utf8")},s=t=>((t=o(t,!0)).buffer||(t=new Uint8Array(t)),t),a=(t,e,n)=>{l(),t=c.normalize(t),u.readFile(t,(function(t,r){t?n(t):e(r.buffer)}))},1<process.argv.length&&(f=process.argv[1].replace(/\\/g,"/")),process.argv.slice(2),process.on("uncaughtException",(function(t){if(!(t instanceof K))throw t})),process.on("unhandledRejection",(function(t){throw t})),d=(t,e)=>{if(w||0<U)throw process.exitCode=t,e;e instanceof K||v("exiting due to exception: "+e),process.exit(t)},e.inspect=function(){return"[Emscripten Module object]"}):(h||g)&&(g?m=self.location.href:"undefined"!=typeof document&&document.currentScript&&(m=document.currentScript.src),_scriptDir&&(m=_scriptDir),m=0!==m.indexOf("blob:")?m.substr(0,m.replace(/[?#].*/,"").lastIndexOf("/")+1):"",o=t=>{var e=new XMLHttpRequest;return e.open("GET",t,!1),e.send(null),e.responseText},g&&(s=t=>{var e=new XMLHttpRequest;return e.open("GET",t,!1),e.responseType="arraybuffer",e.send(null),new Uint8Array(e.response)}),a=(t,e,n)=>{var r=new XMLHttpRequest;r.open("GET",t,!0),r.responseType="arraybuffer",r.onload=()=>{200==r.status||0==r.status&&r.response?e(r.response):n()},r.onerror=n,r.send(null)});var y,_=e.print||console.log.bind(console),v=e.printErr||console.warn.bind(console);Object.assign(e,p),p=null,e.thisProgram&&(f=e.thisProgram),e.quit&&(d=e.quit),e.wasmBinary&&(y=e.wasmBinary);var w=e.noExitRuntime||!1;"object"!=typeof WebAssembly&&W("no native wasm support detected");var x,T,S,O,A,E,I=!1,P="undefined"!=typeof TextDecoder?new TextDecoder("utf8"):void 0;function D(t,e,n){var r=(e>>>=0)+n;for(n=e;t[n]&&!(n>=r);)++n;if(16<n-e&&t.buffer&&P)return P.decode(t.subarray(e,n));for(r="";e<n;){var i=t[e++];if(128&i){var o=63&t[e++];if(192==(224&i))r+=String.fromCharCode((31&i)<<6|o);else{var a=63&t[e++];65536>(i=224==(240&i)?(15&i)<<12|o<<6|a:(7&i)<<18|o<<12|a<<6|63&t[e++])?r+=String.fromCharCode(i):(i-=65536,r+=String.fromCharCode(55296|i>>10,56320|1023&i))}}else r+=String.fromCharCode(i)}return r}function $(t,e){return(t>>>=0)?D(O,t,e):""}function k(t,e,n,r){if(!(0<r))return 0;var i=n>>>=0;r=n+r-1;for(var o=0;o<t.length;++o){var a=t.charCodeAt(o);if(55296<=a&&57343>=a&&(a=65536+((1023&a)<<10)|1023&t.charCodeAt(++o)),127>=a){if(n>=r)break;e[n++>>>0]=a}else{if(2047>=a){if(n+1>=r)break;e[n++>>>0]=192|a>>6}else{if(65535>=a){if(n+2>=r)break;e[n++>>>0]=224|a>>12}else{if(n+3>=r)break;e[n++>>>0]=240|a>>18,e[n++>>>0]=128|a>>12&63}e[n++>>>0]=128|a>>6&63}e[n++>>>0]=128|63&a}}return e[n>>>0]=0,n-i}function C(t){for(var e=0,n=0;n<t.length;++n){var r=t.charCodeAt(n);127>=r?e++:2047>=r?e+=2:55296<=r&&57343>=r?(e+=4,++n):e+=3}return e}function F(){var t=x.buffer;T=t,e.HEAP8=S=new Int8Array(t),e.HEAP16=new Int16Array(t),e.HEAP32=A=new Int32Array(t),e.HEAPU8=O=new Uint8Array(t),e.HEAPU16=new Uint16Array(t),e.HEAPU32=E=new Uint32Array(t),e.HEAPF32=new Float32Array(t),e.HEAPF64=new Float64Array(t)}var N,L=[],R=[],j=[],M=[],U=0;function V(){var t=e.preRun.shift();L.unshift(t)}var B,z=0,G=null,H=null;function W(t){throw e.onAbort&&e.onAbort(t),v(t="Aborted("+t+")"),I=!0,t=new WebAssembly.RuntimeError(t+". Build with -sASSERTIONS for more info."),i(t),t}function q(){return B.startsWith("data:application/octet-stream;base64,")}if(B="ort-wasm.wasm",!q()){var X=B;B=e.locateFile?e.locateFile(X,m):m+X}function Y(){var t=B;try{if(t==B&&y)return new Uint8Array(y);if(s)return s(t);throw"both async and sync fetching of the wasm failed"}catch(t){W(t)}}function K(t){this.name="ExitStatus",this.message="Program terminated with exit("+t+")",this.status=t}function Z(t){for(;0<t.length;)t.shift()(e)}var J=[],Q=0,tt=0;function et(t){this.Db=t,this.zb=t-24,this.Ub=function(t){E[this.zb+4>>2>>>0]=t},this.Eb=function(){return E[this.zb+4>>2>>>0]},this.Sb=function(t){E[this.zb+8>>2>>>0]=t},this.Wb=function(){return E[this.zb+8>>2>>>0]},this.Tb=function(){A[this.zb>>2>>>0]=0},this.Ib=function(t){S[this.zb+12>>0>>>0]=t?1:0},this.Pb=function(){return 0!=S[this.zb+12>>0>>>0]},this.Jb=function(t){S[this.zb+13>>0>>>0]=t?1:0},this.Lb=function(){return 0!=S[this.zb+13>>0>>>0]},this.Rb=function(t,e){this.Fb(0),this.Ub(t),this.Sb(e),this.Tb(),this.Ib(!1),this.Jb(!1)},this.Nb=function(){A[this.zb>>2>>>0]+=1},this.Xb=function(){var t=A[this.zb>>2>>>0];return A[this.zb>>2>>>0]=t-1,1===t},this.Fb=function(t){E[this.zb+16>>2>>>0]=t},this.Ob=function(){return E[this.zb+16>>2>>>0]},this.Qb=function(){if(Et(this.Eb()))return E[this.Db>>2>>>0];var t=this.Ob();return 0!==t?t:this.Db}}function nt(t){return _t(new et(t).zb)}var rt=[];function it(t){var e=rt[t];return e||(t>=rt.length&&(rt.length=t+1),rt[t]=e=N.get(t)),e}function ot(t){var e=C(t)+1,n=yt(e);return n&&k(t,S,n,e),n}var at={};function st(){if(!ut){var t,e={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:("object"==typeof navigator&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:f||"./this.program"};for(t in at)void 0===at[t]?delete e[t]:e[t]=at[t];var n=[];for(t in e)n.push(t+"="+e[t]);ut=n}return ut}var ut,ct=[null,[],[]];function lt(t,e){var n=ct[t];0===e||10===e?((1===t?_:v)(D(n,0)),n.length=0):n.push(e)}var pt=0;function ft(t){return 0==t%4&&(0!=t%100||0==t%400)}var dt=[31,29,31,30,31,30,31,31,30,31,30,31],ht=[31,28,31,30,31,30,31,31,30,31,30,31];function gt(t,e,n,r){function i(t,e,n){for(t="number"==typeof t?t.toString():t||"";t.length<e;)t=n[0]+t;return t}function o(t,e){return i(t,e,"0")}function a(t,e){function n(t){return 0>t?-1:0<t?1:0}var r;return 0===(r=n(t.getFullYear()-e.getFullYear()))&&0===(r=n(t.getMonth()-e.getMonth()))&&(r=n(t.getDate()-e.getDate())),r}function s(t){switch(t.getDay()){case 0:return new Date(t.getFullYear()-1,11,29);case 1:return t;case 2:return new Date(t.getFullYear(),0,3);case 3:return new Date(t.getFullYear(),0,2);case 4:return new Date(t.getFullYear(),0,1);case 5:return new Date(t.getFullYear()-1,11,31);case 6:return new Date(t.getFullYear()-1,11,30)}}function u(t){var e=t.Bb;for(t=new Date(new Date(t.Cb+1900,0,1).getTime());0<e;){var n=t.getMonth(),r=(ft(t.getFullYear())?dt:ht)[n];if(!(e>r-t.getDate())){t.setDate(t.getDate()+e);break}e-=r-t.getDate()+1,t.setDate(1),11>n?t.setMonth(n+1):(t.setMonth(0),t.setFullYear(t.getFullYear()+1))}return n=new Date(t.getFullYear()+1,0,4),e=s(new Date(t.getFullYear(),0,4)),n=s(n),0>=a(e,t)?0>=a(n,t)?t.getFullYear()+1:t.getFullYear():t.getFullYear()-1}var c=A[r+40>>2>>>0];for(var l in r={$b:A[r>>2>>>0],Zb:A[r+4>>2>>>0],Gb:A[r+8>>2>>>0],Kb:A[r+12>>2>>>0],Hb:A[r+16>>2>>>0],Cb:A[r+20>>2>>>0],Ab:A[r+24>>2>>>0],Bb:A[r+28>>2>>>0],bc:A[r+32>>2>>>0],Yb:A[r+36>>2>>>0],ac:c?$(c):""},n=$(n),c={"%c":"%a %b %d %H:%M:%S %Y","%D":"%m/%d/%y","%F":"%Y-%m-%d","%h":"%b","%r":"%I:%M:%S %p","%R":"%H:%M","%T":"%H:%M:%S","%x":"%m/%d/%y","%X":"%H:%M:%S","%Ec":"%c","%EC":"%C","%Ex":"%m/%d/%y","%EX":"%H:%M:%S","%Ey":"%y","%EY":"%Y","%Od":"%d","%Oe":"%e","%OH":"%H","%OI":"%I","%Om":"%m","%OM":"%M","%OS":"%S","%Ou":"%u","%OU":"%U","%OV":"%V","%Ow":"%w","%OW":"%W","%Oy":"%y"})n=n.replace(new RegExp(l,"g"),c[l]);var p="Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),f="January February March April May June July August September October November December".split(" ");for(l in c={"%a":function(t){return p[t.Ab].substring(0,3)},"%A":function(t){return p[t.Ab]},"%b":function(t){return f[t.Hb].substring(0,3)},"%B":function(t){return f[t.Hb]},"%C":function(t){return o((t.Cb+1900)/100|0,2)},"%d":function(t){return o(t.Kb,2)},"%e":function(t){return i(t.Kb,2," ")},"%g":function(t){return u(t).toString().substring(2)},"%G":function(t){return u(t)},"%H":function(t){return o(t.Gb,2)},"%I":function(t){return 0==(t=t.Gb)?t=12:12<t&&(t-=12),o(t,2)},"%j":function(t){for(var e=0,n=0;n<=t.Hb-1;e+=(ft(t.Cb+1900)?dt:ht)[n++]);return o(t.Kb+e,3)},"%m":function(t){return o(t.Hb+1,2)},"%M":function(t){return o(t.Zb,2)},"%n":function(){return"\n"},"%p":function(t){return 0<=t.Gb&&12>t.Gb?"AM":"PM"},"%S":function(t){return o(t.$b,2)},"%t":function(){return"\t"},"%u":function(t){return t.Ab||7},"%U":function(t){return o(Math.floor((t.Bb+7-t.Ab)/7),2)},"%V":function(t){var e=Math.floor((t.Bb+7-(t.Ab+6)%7)/7);if(2>=(t.Ab+371-t.Bb-2)%7&&e++,e)53==e&&(4==(n=(t.Ab+371-t.Bb)%7)||3==n&&ft(t.Cb)||(e=1));else{e=52;var n=(t.Ab+7-t.Bb-1)%7;(4==n||5==n&&ft(t.Cb%400-1))&&e++}return o(e,2)},"%w":function(t){return t.Ab},"%W":function(t){return o(Math.floor((t.Bb+7-(t.Ab+6)%7)/7),2)},"%y":function(t){return(t.Cb+1900).toString().substring(2)},"%Y":function(t){return t.Cb+1900},"%z":function(t){var e=0<=(t=t.Yb);return t=Math.abs(t)/60,(e?"+":"-")+String("0000"+(t/60*100+t%60)).slice(-4)},"%Z":function(t){return t.ac},"%%":function(){return"%"}},n=n.replace(/%%/g,"\0\0"),c)n.includes(l)&&(n=n.replace(new RegExp(l,"g"),c[l](r)));return l=function(t){var e=Array(C(t)+1);return k(t,e,0,e.length),e}(n=n.replace(/\0\0/g,"%")),l.length>e?0:(S.set(l,t>>>0),l.length-1)}var bt={a:function(t){return yt(t+24)+24},m:function(t){return(t=new et(t)).Pb()||(t.Ib(!0),Q--),t.Jb(!1),J.push(t),t.Nb(),t.Qb()},ia:function(t){throw v("Unexpected exception thrown, this is not properly supported - aborting"),I=!0,t},w:function(){xt(0);var t=J.pop();if(t.Xb()&&!t.Lb()){var e=t.Wb();e&&it(e)(t.Db),nt(t.Db)}tt=0},d:function(){var t=tt;if(!t)return pt=0;var e=new et(t);e.Fb(t);var n=e.Eb();if(!n)return pt=0,t;for(var r=Array.prototype.slice.call(arguments),i=0;i<r.length;i++){var o=r[i];if(0===o||o===n)break;if(At(o,n,e.zb+16))return pt=o,t}return pt=n,t},k:function(){var t=tt;if(!t)return pt=0;var e=new et(t);e.Fb(t);var n=e.Eb();if(!n)return pt=0,t;for(var r=Array.prototype.slice.call(arguments),i=0;i<r.length;i++){var o=r[i];if(0===o||o===n)break;if(At(o,n,e.zb+16))return pt=o,t}return pt=n,t},g:function(){var t=tt;if(!t)return pt=0;var e=new et(t);e.Fb(t);var n=e.Eb();if(!n)return pt=0,t;for(var r=Array.prototype.slice.call(arguments),i=0;i<r.length;i++){var o=r[i];if(0===o||o===n)break;if(At(o,n,e.zb+16))return pt=o,t}return pt=n,t},s:nt,L:function(){var t=J.pop();t||W("no exception to throw");var e=t.Db;throw t.Lb()||(J.push(t),t.Jb(!0),t.Ib(!1),Q++),tt=e,e},b:function(t,e,n){throw new et(t).Rb(e,n),tt=t,Q++,t},la:function(){return Q},i:function(t){throw tt||(tt=t),t},H:function(){return 0},Ba:function(){},pa:function(){},ra:function(){},ka:function(){return 0},za:function(){},ua:function(){},ya:function(){},R:function(){},qa:function(){},na:function(){},Aa:function(){},oa:function(){},Ha:function(){},Ja:function(){W("To use dlopen, you need enable dynamic linking, see https://github.com/emscripten-core/emscripten/wiki/Linking")},Ia:function(){W("To use dlopen, you need enable dynamic linking, see https://github.com/emscripten-core/emscripten/wiki/Linking")},S:function(){return Date.now()},Ca:function(){return!0},Da:function(t,e){t=new Date(1e3*(E[t>>>2]+4294967296*A[t+4>>>2])),A[e>>2>>>0]=t.getUTCSeconds(),A[e+4>>2>>>0]=t.getUTCMinutes(),A[e+8>>2>>>0]=t.getUTCHours(),A[e+12>>2>>>0]=t.getUTCDate(),A[e+16>>2>>>0]=t.getUTCMonth(),A[e+20>>2>>>0]=t.getUTCFullYear()-1900,A[e+24>>2>>>0]=t.getUTCDay(),A[e+28>>2>>>0]=(t.getTime()-Date.UTC(t.getUTCFullYear(),0,1,0,0,0,0))/864e5|0},Ea:function(t,e){t=new Date(1e3*(E[t>>>2]+4294967296*A[t+4>>>2])),A[e>>2>>>0]=t.getSeconds(),A[e+4>>2>>>0]=t.getMinutes(),A[e+8>>2>>>0]=t.getHours(),A[e+12>>2>>>0]=t.getDate(),A[e+16>>2>>>0]=t.getMonth(),A[e+20>>2>>>0]=t.getFullYear()-1900,A[e+24>>2>>>0]=t.getDay();var n=new Date(t.getFullYear(),0,1);A[e+28>>2>>>0]=(t.getTime()-n.getTime())/864e5|0,A[e+36>>2>>>0]=-60*t.getTimezoneOffset();var r=new Date(t.getFullYear(),6,1).getTimezoneOffset();n=n.getTimezoneOffset(),A[e+32>>2>>>0]=0|(r!=n&&t.getTimezoneOffset()==Math.min(n,r))},Fa:function(t){var e=new Date(A[t+20>>2>>>0]+1900,A[t+16>>2>>>0],A[t+12>>2>>>0],A[t+8>>2>>>0],A[t+4>>2>>>0],A[t>>2>>>0],0),n=A[t+32>>2>>>0],r=e.getTimezoneOffset(),i=new Date(e.getFullYear(),0,1),o=new Date(e.getFullYear(),6,1).getTimezoneOffset(),a=i.getTimezoneOffset(),s=Math.min(a,o);return 0>n?A[t+32>>2>>>0]=Number(o!=a&&s==r):0<n!=(s==r)&&(o=Math.max(a,o),e.setTime(e.getTime()+6e4*((0<n?s:o)-r))),A[t+24>>2>>>0]=e.getDay(),A[t+28>>2>>>0]=(e.getTime()-i.getTime())/864e5|0,A[t>>2>>>0]=e.getSeconds(),A[t+4>>2>>>0]=e.getMinutes(),A[t+8>>2>>>0]=e.getHours(),A[t+12>>2>>>0]=e.getDate(),A[t+16>>2>>>0]=e.getMonth(),e.getTime()/1e3|0},sa:function(){return-52},ta:function(){},Ga:function t(e,n,r){t.Vb||(t.Vb=!0,function(t,e,n){function r(t){return(t=t.toTimeString().match(/\(([A-Za-z ]+)\)$/))?t[1]:"GMT"}var i=(new Date).getFullYear(),o=new Date(i,0,1),a=new Date(i,6,1);i=o.getTimezoneOffset();var s=a.getTimezoneOffset();A[t>>2>>>0]=60*Math.max(i,s),A[e>>2>>>0]=Number(i!=s),t=r(o),e=r(a),t=ot(t),e=ot(e),s<i?(E[n>>2>>>0]=t,E[n+4>>2>>>0]=e):(E[n>>2>>>0]=e,E[n+4>>2>>>0]=t)}(e,n,r))},B:function(){W("")},ma:function(){return 4294901760},I:b?()=>{var t=process.hrtime();return 1e3*t[0]+t[1]/1e6}:()=>performance.now(),xa:function(t,e,n){O.copyWithin(t>>>0,e>>>0,e+n>>>0)},G:function(t){var e=O.length;if(4294901760<(t>>>=0))return!1;for(var n=1;4>=n;n*=2){var r=e*(1+.2/n);r=Math.min(r,t+100663296);var i=Math;r=Math.max(t,r),i=i.min.call(i,4294901760,r+(65536-r%65536)%65536);t:{try{x.grow(i-T.byteLength+65535>>>16),F();var o=1;break t}catch(t){}o=void 0}if(o)return!0}return!1},va:function(t,e){var n=0;return st().forEach((function(r,i){var o=e+n;for(i=E[t+4*i>>2>>>0]=o,o=0;o<r.length;++o)S[i++>>0>>>0]=r.charCodeAt(o);S[i>>0>>>0]=0,n+=r.length+1})),0},wa:function(t,e){var n=st();E[t>>2>>>0]=n.length;var r=0;return n.forEach((function(t){r+=t.length+1})),E[e>>2>>>0]=r,0},ba:function(t){w||0<U||(wt(),Z(j),vt(0),ct[1].length&&lt(1,10),ct[2].length&&lt(2,10)),w||0<U||(e.onExit&&e.onExit(t),I=!0),d(t,new K(t))},E:function(){return 52},Q:function(){return 52},ca:function(){return 70},P:function(t,e,n,r){for(var i=0,o=0;o<n;o++){var a=E[e>>2>>>0],s=E[e+4>>2>>>0];e+=8;for(var u=0;u<s;u++)lt(t,O[a+u>>>0]);i+=s}return E[r>>2>>>0]=i,0},c:function(){return pt},ja:function t(e,r){t.Mb||(t.Mb=function(){if("object"==typeof crypto&&"function"==typeof crypto.getRandomValues){var t=new Uint8Array(1);return()=>(crypto.getRandomValues(t),t[0])}if(b)try{var e=n(Object(function(){var t=new Error("Cannot find module 'crypto'");throw t.code="MODULE_NOT_FOUND",t}()));return()=>e.randomBytes(1)[0]}catch(t){}return()=>W("randomDevice")}());for(var i=0;i<r;i++)S[e+i>>0>>>0]=t.Mb();return 0},ea:function(t,e,n){var r=Tt();try{return it(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;xt(1,0)}},fa:function(t,e,n){var r=Tt();try{return it(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;xt(1,0)}},J:function(t){var e=Tt();try{return it(t)()}catch(t){if(St(e),t!==t+0)throw t;xt(1,0)}},e:function(t,e){var n=Tt();try{return it(t)(e)}catch(t){if(St(n),t!==t+0)throw t;xt(1,0)}},N:function(t,e,n){var r=Tt();try{return it(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;xt(1,0)}},O:function(t,e,n){var r=Tt();try{return it(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;xt(1,0)}},j:function(t,e,n){var r=Tt();try{return it(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;xt(1,0)}},o:function(t,e,n,r){var i=Tt();try{return it(t)(e,n,r)}catch(t){if(St(i),t!==t+0)throw t;xt(1,0)}},p:function(t,e,n,r,i){var o=Tt();try{return it(t)(e,n,r,i)}catch(t){if(St(o),t!==t+0)throw t;xt(1,0)}},M:function(t,e,n,r,i,o){var a=Tt();try{return it(t)(e,n,r,i,o)}catch(t){if(St(a),t!==t+0)throw t;xt(1,0)}},r:function(t,e,n,r,i,o){var a=Tt();try{return it(t)(e,n,r,i,o)}catch(t){if(St(a),t!==t+0)throw t;xt(1,0)}},v:function(t,e,n,r,i,o,a){var s=Tt();try{return it(t)(e,n,r,i,o,a)}catch(t){if(St(s),t!==t+0)throw t;xt(1,0)}},K:function(t,e,n,r,i,o,a,s){var u=Tt();try{return it(t)(e,n,r,i,o,a,s)}catch(t){if(St(u),t!==t+0)throw t;xt(1,0)}},D:function(t,e,n,r,i,o,a,s,u,c,l,p){var f=Tt();try{return it(t)(e,n,r,i,o,a,s,u,c,l,p)}catch(t){if(St(f),t!==t+0)throw t;xt(1,0)}},X:function(t,e,n,r,i,o,a,s){var u=Tt();try{return Lt(t,e,n,r,i,o,a,s)}catch(t){if(St(u),t!==t+0)throw t;xt(1,0)}},V:function(t,e,n,r,i,o,a){var s=Tt();try{return Pt(t,e,n,r,i,o,a)}catch(t){if(St(s),t!==t+0)throw t;xt(1,0)}},U:function(t,e,n,r,i){var o=Tt();try{return Rt(t,e,n,r,i)}catch(t){if(St(o),t!==t+0)throw t;xt(1,0)}},Z:function(t,e,n,r){var i=Tt();try{return Ft(t,e,n,r)}catch(t){if(St(i),t!==t+0)throw t;xt(1,0)}},W:function(t){var e=Tt();try{return It(t)}catch(t){if(St(e),t!==t+0)throw t;xt(1,0)}},Y:function(t,e){var n=Tt();try{return Nt(t,e)}catch(t){if(St(n),t!==t+0)throw t;xt(1,0)}},T:function(t,e,n){var r=Tt();try{return Dt(t,e,n)}catch(t){if(St(r),t!==t+0)throw t;xt(1,0)}},f:function(t){var e=Tt();try{it(t)()}catch(t){if(St(e),t!==t+0)throw t;xt(1,0)}},q:function(t,e){var n=Tt();try{it(t)(e)}catch(t){if(St(n),t!==t+0)throw t;xt(1,0)}},h:function(t,e,n){var r=Tt();try{it(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;xt(1,0)}},da:function(t,e,n,r){var i=Tt();try{it(t)(e,n,r)}catch(t){if(St(i),t!==t+0)throw t;xt(1,0)}},l:function(t,e,n,r){var i=Tt();try{it(t)(e,n,r)}catch(t){if(St(i),t!==t+0)throw t;xt(1,0)}},t:function(t,e,n,r,i){var o=Tt();try{it(t)(e,n,r,i)}catch(t){if(St(o),t!==t+0)throw t;xt(1,0)}},u:function(t,e,n,r,i,o){var a=Tt();try{it(t)(e,n,r,i,o)}catch(t){if(St(a),t!==t+0)throw t;xt(1,0)}},x:function(t,e,n,r,i,o,a){var s=Tt();try{it(t)(e,n,r,i,o,a)}catch(t){if(St(s),t!==t+0)throw t;xt(1,0)}},z:function(t,e,n,r,i,o,a,s){var u=Tt();try{it(t)(e,n,r,i,o,a,s)}catch(t){if(St(u),t!==t+0)throw t;xt(1,0)}},ga:function(t,e,n,r,i,o,a,s,u){var c=Tt();try{it(t)(e,n,r,i,o,a,s,u)}catch(t){if(St(c),t!==t+0)throw t;xt(1,0)}},A:function(t,e,n,r,i,o,a,s,u,c,l){var p=Tt();try{it(t)(e,n,r,i,o,a,s,u,c,l)}catch(t){if(St(p),t!==t+0)throw t;xt(1,0)}},C:function(t,e,n,r,i,o,a,s,u,c,l,p,f,d,h,g){var b=Tt();try{it(t)(e,n,r,i,o,a,s,u,c,l,p,f,d,h,g)}catch(t){if(St(b),t!==t+0)throw t;xt(1,0)}},aa:function(t,e,n,r,i,o,a,s){var u=Tt();try{$t(t,e,n,r,i,o,a,s)}catch(t){if(St(u),t!==t+0)throw t;xt(1,0)}},_:function(t,e,n,r,i,o,a,s,u,c,l,p){var f=Tt();try{Ct(t,e,n,r,i,o,a,s,u,c,l,p)}catch(t){if(St(f),t!==t+0)throw t;xt(1,0)}},$:function(t,e,n,r,i,o){var a=Tt();try{kt(t,e,n,r,i,o)}catch(t){if(St(a),t!==t+0)throw t;xt(1,0)}},n:function(t){return t},F:function(t){pt=t},ha:gt,y:function(t,e,n,r){return gt(t,e,n,r)}};!function(){function t(t){e.asm=t.exports,x=e.asm.Ka,F(),N=e.asm.ib,R.unshift(e.asm.La),z--,e.monitorRunDependencies&&e.monitorRunDependencies(z),0==z&&(null!==G&&(clearInterval(G),G=null),H&&(t=H,H=null,t()))}function n(e){t(e.instance)}function r(t){return function(){if(!y&&(h||g)){if("function"==typeof fetch&&!B.startsWith("file://"))return fetch(B,{credentials:"same-origin"}).then((function(t){if(!t.ok)throw"failed to load wasm binary file at '"+B+"'";return t.arrayBuffer()})).catch((function(){return Y()}));if(a)return new Promise((function(t,e){a(B,(function(e){t(new Uint8Array(e))}),e)}))}return Promise.resolve().then((function(){return Y()}))}().then((function(t){return WebAssembly.instantiate(t,o)})).then((function(t){return t})).then(t,(function(t){v("failed to asynchronously prepare wasm: "+t),W(t)}))}var o={a:bt};if(z++,e.monitorRunDependencies&&e.monitorRunDependencies(z),e.instantiateWasm)try{return e.instantiateWasm(o,t)}catch(t){return v("Module.instantiateWasm callback failed with error: "+t),!1}(y||"function"!=typeof WebAssembly.instantiateStreaming||q()||B.startsWith("file://")||b||"function"!=typeof fetch?r(n):fetch(B,{credentials:"same-origin"}).then((function(t){return WebAssembly.instantiateStreaming(t,o).then(n,(function(t){return v("wasm streaming compile failed: "+t),v("falling back to ArrayBuffer instantiation"),r(n)}))}))).catch(i)}(),e.___wasm_call_ctors=function(){return(e.___wasm_call_ctors=e.asm.La).apply(null,arguments)},e._OrtInit=function(){return(e._OrtInit=e.asm.Ma).apply(null,arguments)},e._OrtCreateSessionOptions=function(){return(e._OrtCreateSessionOptions=e.asm.Na).apply(null,arguments)},e._OrtAppendExecutionProvider=function(){return(e._OrtAppendExecutionProvider=e.asm.Oa).apply(null,arguments)},e._OrtAddSessionConfigEntry=function(){return(e._OrtAddSessionConfigEntry=e.asm.Pa).apply(null,arguments)},e._OrtReleaseSessionOptions=function(){return(e._OrtReleaseSessionOptions=e.asm.Qa).apply(null,arguments)},e._OrtCreateSession=function(){return(e._OrtCreateSession=e.asm.Ra).apply(null,arguments)},e._OrtReleaseSession=function(){return(e._OrtReleaseSession=e.asm.Sa).apply(null,arguments)},e._OrtGetInputCount=function(){return(e._OrtGetInputCount=e.asm.Ta).apply(null,arguments)},e._OrtGetOutputCount=function(){return(e._OrtGetOutputCount=e.asm.Ua).apply(null,arguments)},e._OrtGetInputName=function(){return(e._OrtGetInputName=e.asm.Va).apply(null,arguments)},e._OrtGetOutputName=function(){return(e._OrtGetOutputName=e.asm.Wa).apply(null,arguments)},e._OrtFree=function(){return(e._OrtFree=e.asm.Xa).apply(null,arguments)},e._OrtCreateTensor=function(){return(e._OrtCreateTensor=e.asm.Ya).apply(null,arguments)},e._OrtGetTensorData=function(){return(e._OrtGetTensorData=e.asm.Za).apply(null,arguments)},e._OrtReleaseTensor=function(){return(e._OrtReleaseTensor=e.asm._a).apply(null,arguments)},e._OrtCreateRunOptions=function(){return(e._OrtCreateRunOptions=e.asm.$a).apply(null,arguments)},e._OrtAddRunConfigEntry=function(){return(e._OrtAddRunConfigEntry=e.asm.ab).apply(null,arguments)},e._OrtReleaseRunOptions=function(){return(e._OrtReleaseRunOptions=e.asm.bb).apply(null,arguments)},e._OrtRun=function(){return(e._OrtRun=e.asm.cb).apply(null,arguments)},e._OrtEndProfiling=function(){return(e._OrtEndProfiling=e.asm.db).apply(null,arguments)};var mt,yt=e._malloc=function(){return(yt=e._malloc=e.asm.eb).apply(null,arguments)},_t=e._free=function(){return(_t=e._free=e.asm.fb).apply(null,arguments)},vt=e._fflush=function(){return(vt=e._fflush=e.asm.gb).apply(null,arguments)},wt=e.___funcs_on_exit=function(){return(wt=e.___funcs_on_exit=e.asm.hb).apply(null,arguments)},xt=e._setThrew=function(){return(xt=e._setThrew=e.asm.jb).apply(null,arguments)},Tt=e.stackSave=function(){return(Tt=e.stackSave=e.asm.kb).apply(null,arguments)},St=e.stackRestore=function(){return(St=e.stackRestore=e.asm.lb).apply(null,arguments)},Ot=e.stackAlloc=function(){return(Ot=e.stackAlloc=e.asm.mb).apply(null,arguments)},At=e.___cxa_can_catch=function(){return(At=e.___cxa_can_catch=e.asm.nb).apply(null,arguments)},Et=e.___cxa_is_pointer_type=function(){return(Et=e.___cxa_is_pointer_type=e.asm.ob).apply(null,arguments)},It=e.dynCall_j=function(){return(It=e.dynCall_j=e.asm.pb).apply(null,arguments)},Pt=e.dynCall_iiiiij=function(){return(Pt=e.dynCall_iiiiij=e.asm.qb).apply(null,arguments)},Dt=e.dynCall_jii=function(){return(Dt=e.dynCall_jii=e.asm.rb).apply(null,arguments)},$t=e.dynCall_viiiiij=function(){return($t=e.dynCall_viiiiij=e.asm.sb).apply(null,arguments)},kt=e.dynCall_vjji=function(){return(kt=e.dynCall_vjji=e.asm.tb).apply(null,arguments)},Ct=e.dynCall_viiijjjii=function(){return(Ct=e.dynCall_viiijjjii=e.asm.ub).apply(null,arguments)},Ft=e.dynCall_iij=function(){return(Ft=e.dynCall_iij=e.asm.vb).apply(null,arguments)},Nt=e.dynCall_ji=function(){return(Nt=e.dynCall_ji=e.asm.wb).apply(null,arguments)},Lt=e.dynCall_iiiiiij=function(){return(Lt=e.dynCall_iiiiiij=e.asm.xb).apply(null,arguments)},Rt=e.dynCall_iiij=function(){return(Rt=e.dynCall_iiij=e.asm.yb).apply(null,arguments)};function jt(){function t(){if(!mt&&(mt=!0,e.calledRun=!0,!I)){if(Z(R),r(e),e.onRuntimeInitialized&&e.onRuntimeInitialized(),e.postRun)for("function"==typeof e.postRun&&(e.postRun=[e.postRun]);e.postRun.length;){var t=e.postRun.shift();M.unshift(t)}Z(M)}}if(!(0<z)){if(e.preRun)for("function"==typeof e.preRun&&(e.preRun=[e.preRun]);e.preRun.length;)V();Z(L),0<z||(e.setStatus?(e.setStatus("Running..."),setTimeout((function(){setTimeout((function(){e.setStatus("")}),1),t()}),1)):t())}}if(e.UTF8ToString=$,e.stringToUTF8=function(t,e,n){return k(t,O,e,n)},e.lengthBytesUTF8=C,e.stackSave=Tt,e.stackRestore=St,e.stackAlloc=Ot,H=function t(){mt||jt(),mt||(H=t)},e.preInit)for("function"==typeof e.preInit&&(e.preInit=[e.preInit]);0<e.preInit.length;)e.preInit.pop()();return jt(),t.ready});t.exports=r},4537:t=>{"use strict";t.exports=function(t,e){for(var n=new Array(arguments.length-1),r=0,i=2,o=!0;i<arguments.length;)n[r++]=arguments[i++];return new Promise((function(i,a){n[r]=function(t){if(o)if(o=!1,t)a(t);else{for(var e=new Array(arguments.length-1),n=0;n<e.length;)e[n++]=arguments[n];i.apply(null,e)}};try{t.apply(e||null,n)}catch(t){o&&(o=!1,a(t))}}))}},7419:(t,e)=>{"use strict";var n=e;n.length=function(t){var e=t.length;if(!e)return 0;for(var n=0;--e%4>1&&"="===t.charAt(e);)++n;return Math.ceil(3*t.length)/4-n};for(var r=new Array(64),i=new Array(123),o=0;o<64;)i[r[o]=o<26?o+65:o<52?o+71:o<62?o-4:o-59|43]=o++;n.encode=function(t,e,n){for(var i,o=null,a=[],s=0,u=0;e<n;){var c=t[e++];switch(u){case 0:a[s++]=r[c>>2],i=(3&c)<<4,u=1;break;case 1:a[s++]=r[i|c>>4],i=(15&c)<<2,u=2;break;case 2:a[s++]=r[i|c>>6],a[s++]=r[63&c],u=0}s>8191&&((o||(o=[])).push(String.fromCharCode.apply(String,a)),s=0)}return u&&(a[s++]=r[i],a[s++]=61,1===u&&(a[s++]=61)),o?(s&&o.push(String.fromCharCode.apply(String,a.slice(0,s))),o.join("")):String.fromCharCode.apply(String,a.slice(0,s))};var a="invalid encoding";n.decode=function(t,e,n){for(var r,o=n,s=0,u=0;u<t.length;){var c=t.charCodeAt(u++);if(61===c&&s>1)break;if(void 0===(c=i[c]))throw Error(a);switch(s){case 0:r=c,s=1;break;case 1:e[n++]=r<<2|(48&c)>>4,r=c,s=2;break;case 2:e[n++]=(15&r)<<4|(60&c)>>2,r=c,s=3;break;case 3:e[n++]=(3&r)<<6|c,s=0}}if(1===s)throw Error(a);return n-o},n.test=function(t){return/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(t)}},9211:t=>{"use strict";function e(){this._listeners={}}t.exports=e,e.prototype.on=function(t,e,n){return(this._listeners[t]||(this._listeners[t]=[])).push({fn:e,ctx:n||this}),this},e.prototype.off=function(t,e){if(void 0===t)this._listeners={};else if(void 0===e)this._listeners[t]=[];else for(var n=this._listeners[t],r=0;r<n.length;)n[r].fn===e?n.splice(r,1):++r;return this},e.prototype.emit=function(t){var e=this._listeners[t];if(e){for(var n=[],r=1;r<arguments.length;)n.push(arguments[r++]);for(r=0;r<e.length;)e[r].fn.apply(e[r++].ctx,n)}return this}},945:t=>{"use strict";function e(t){return"undefined"!=typeof Float32Array?function(){var e=new Float32Array([-0]),n=new Uint8Array(e.buffer),r=128===n[3];function i(t,r,i){e[0]=t,r[i]=n[0],r[i+1]=n[1],r[i+2]=n[2],r[i+3]=n[3]}function o(t,r,i){e[0]=t,r[i]=n[3],r[i+1]=n[2],r[i+2]=n[1],r[i+3]=n[0]}function a(t,r){return n[0]=t[r],n[1]=t[r+1],n[2]=t[r+2],n[3]=t[r+3],e[0]}function s(t,r){return n[3]=t[r],n[2]=t[r+1],n[1]=t[r+2],n[0]=t[r+3],e[0]}t.writeFloatLE=r?i:o,t.writeFloatBE=r?o:i,t.readFloatLE=r?a:s,t.readFloatBE=r?s:a}():function(){function e(t,e,n,r){var i=e<0?1:0;if(i&&(e=-e),0===e)t(1/e>0?0:2147483648,n,r);else if(isNaN(e))t(2143289344,n,r);else if(e>34028234663852886e22)t((i<<31|2139095040)>>>0,n,r);else if(e<11754943508222875e-54)t((i<<31|Math.round(e/1401298464324817e-60))>>>0,n,r);else{var o=Math.floor(Math.log(e)/Math.LN2);t((i<<31|o+127<<23|8388607&Math.round(e*Math.pow(2,-o)*8388608))>>>0,n,r)}}function a(t,e,n){var r=t(e,n),i=2*(r>>31)+1,o=r>>>23&255,a=8388607&r;return 255===o?a?NaN:i*(1/0):0===o?1401298464324817e-60*i*a:i*Math.pow(2,o-150)*(a+8388608)}t.writeFloatLE=e.bind(null,n),t.writeFloatBE=e.bind(null,r),t.readFloatLE=a.bind(null,i),t.readFloatBE=a.bind(null,o)}(),"undefined"!=typeof Float64Array?function(){var e=new Float64Array([-0]),n=new Uint8Array(e.buffer),r=128===n[7];function i(t,r,i){e[0]=t,r[i]=n[0],r[i+1]=n[1],r[i+2]=n[2],r[i+3]=n[3],r[i+4]=n[4],r[i+5]=n[5],r[i+6]=n[6],r[i+7]=n[7]}function o(t,r,i){e[0]=t,r[i]=n[7],r[i+1]=n[6],r[i+2]=n[5],r[i+3]=n[4],r[i+4]=n[3],r[i+5]=n[2],r[i+6]=n[1],r[i+7]=n[0]}function a(t,r){return n[0]=t[r],n[1]=t[r+1],n[2]=t[r+2],n[3]=t[r+3],n[4]=t[r+4],n[5]=t[r+5],n[6]=t[r+6],n[7]=t[r+7],e[0]}function s(t,r){return n[7]=t[r],n[6]=t[r+1],n[5]=t[r+2],n[4]=t[r+3],n[3]=t[r+4],n[2]=t[r+5],n[1]=t[r+6],n[0]=t[r+7],e[0]}t.writeDoubleLE=r?i:o,t.writeDoubleBE=r?o:i,t.readDoubleLE=r?a:s,t.readDoubleBE=r?s:a}():function(){function e(t,e,n,r,i,o){var a=r<0?1:0;if(a&&(r=-r),0===r)t(0,i,o+e),t(1/r>0?0:2147483648,i,o+n);else if(isNaN(r))t(0,i,o+e),t(2146959360,i,o+n);else if(r>17976931348623157e292)t(0,i,o+e),t((a<<31|2146435072)>>>0,i,o+n);else{var s;if(r<22250738585072014e-324)t((s=r/5e-324)>>>0,i,o+e),t((a<<31|s/4294967296)>>>0,i,o+n);else{var u=Math.floor(Math.log(r)/Math.LN2);1024===u&&(u=1023),t(4503599627370496*(s=r*Math.pow(2,-u))>>>0,i,o+e),t((a<<31|u+1023<<20|1048576*s&1048575)>>>0,i,o+n)}}}function a(t,e,n,r,i){var o=t(r,i+e),a=t(r,i+n),s=2*(a>>31)+1,u=a>>>20&2047,c=4294967296*(1048575&a)+o;return 2047===u?c?NaN:s*(1/0):0===u?5e-324*s*c:s*Math.pow(2,u-1075)*(c+4503599627370496)}t.writeDoubleLE=e.bind(null,n,0,4),t.writeDoubleBE=e.bind(null,r,4,0),t.readDoubleLE=a.bind(null,i,0,4),t.readDoubleBE=a.bind(null,o,4,0)}(),t}function n(t,e,n){e[n]=255&t,e[n+1]=t>>>8&255,e[n+2]=t>>>16&255,e[n+3]=t>>>24}function r(t,e,n){e[n]=t>>>24,e[n+1]=t>>>16&255,e[n+2]=t>>>8&255,e[n+3]=255&t}function i(t,e){return(t[e]|t[e+1]<<8|t[e+2]<<16|t[e+3]<<24)>>>0}function o(t,e){return(t[e]<<24|t[e+1]<<16|t[e+2]<<8|t[e+3])>>>0}t.exports=e(e)},7199:module=>{"use strict";function inquire(moduleName){try{var mod=eval("quire".replace(/^/,"re"))(moduleName);if(mod&&(mod.length||Object.keys(mod).length))return mod}catch(t){}return null}module.exports=inquire},6662:t=>{"use strict";t.exports=function(t,e,n){var r=n||8192,i=r>>>1,o=null,a=r;return function(n){if(n<1||n>i)return t(n);a+n>r&&(o=t(r),a=0);var s=e.call(o,a,a+=n);return 7&a&&(a=1+(7|a)),s}}},4997:(t,e)=>{"use strict";var n=e;n.length=function(t){for(var e=0,n=0,r=0;r<t.length;++r)(n=t.charCodeAt(r))<128?e+=1:n<2048?e+=2:55296==(64512&n)&&56320==(64512&t.charCodeAt(r+1))?(++r,e+=4):e+=3;return e},n.read=function(t,e,n){if(n-e<1)return"";for(var r,i=null,o=[],a=0;e<n;)(r=t[e++])<128?o[a++]=r:r>191&&r<224?o[a++]=(31&r)<<6|63&t[e++]:r>239&&r<365?(r=((7&r)<<18|(63&t[e++])<<12|(63&t[e++])<<6|63&t[e++])-65536,o[a++]=55296+(r>>10),o[a++]=56320+(1023&r)):o[a++]=(15&r)<<12|(63&t[e++])<<6|63&t[e++],a>8191&&((i||(i=[])).push(String.fromCharCode.apply(String,o)),a=0);return i?(a&&i.push(String.fromCharCode.apply(String,o.slice(0,a))),i.join("")):String.fromCharCode.apply(String,o.slice(0,a))},n.write=function(t,e,n){for(var r,i,o=n,a=0;a<t.length;++a)(r=t.charCodeAt(a))<128?e[n++]=r:r<2048?(e[n++]=r>>6|192,e[n++]=63&r|128):55296==(64512&r)&&56320==(64512&(i=t.charCodeAt(a+1)))?(r=65536+((1023&r)<<10)+(1023&i),++a,e[n++]=r>>18|240,e[n++]=r>>12&63|128,e[n++]=r>>6&63|128,e[n++]=63&r|128):(e[n++]=r>>12|224,e[n++]=r>>6&63|128,e[n++]=63&r|128);return n-o}},3442:(t,e)=>{"use strict";e.__esModule=!0;var n=function(){function t(e){if(!e)throw new TypeError("Invalid argument; `value` has no value.");this.value=t.EMPTY,e&&t.isGuid(e)&&(this.value=e)}return t.isGuid=function(e){var n=e.toString();return e&&(e instanceof t||t.validator.test(n))},t.create=function(){return new t([t.gen(2),t.gen(1),t.gen(1),t.gen(1),t.gen(3)].join("-"))},t.createEmpty=function(){return new t("emptyguid")},t.parse=function(e){return new t(e)},t.raw=function(){return[t.gen(2),t.gen(1),t.gen(1),t.gen(1),t.gen(3)].join("-")},t.gen=function(t){for(var e="",n=0;n<t;n++)e+=(65536*(1+Math.random())|0).toString(16).substring(1);return e},t.prototype.equals=function(e){return t.isGuid(e)&&this.value===e.toString()},t.prototype.isEmpty=function(){return this.value===t.EMPTY},t.prototype.toString=function(){return this.value},t.prototype.toJSON=function(){return{value:this.value}},t.validator=new RegExp("^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$","i"),t.EMPTY="00000000-0000-0000-0000-000000000000",t}();e.Guid=n},3720:t=>{t.exports=n;var e=null;try{e=new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0,1,13,2,96,0,1,127,96,4,127,127,127,127,1,127,3,7,6,0,1,1,1,1,1,6,6,1,127,1,65,0,11,7,50,6,3,109,117,108,0,1,5,100,105,118,95,115,0,2,5,100,105,118,95,117,0,3,5,114,101,109,95,115,0,4,5,114,101,109,95,117,0,5,8,103,101,116,95,104,105,103,104,0,0,10,191,1,6,4,0,35,0,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,126,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,127,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,128,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,129,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,130,34,4,66,32,135,167,36,0,32,4,167,11])),{}).exports}catch(t){}function n(t,e,n){this.low=0|t,this.high=0|e,this.unsigned=!!n}function r(t){return!0===(t&&t.__isLong__)}n.prototype.__isLong__,Object.defineProperty(n.prototype,"__isLong__",{value:!0}),n.isLong=r;var i={},o={};function a(t,e){var n,r,a;return e?(a=0<=(t>>>=0)&&t<256)&&(r=o[t])?r:(n=u(t,(0|t)<0?-1:0,!0),a&&(o[t]=n),n):(a=-128<=(t|=0)&&t<128)&&(r=i[t])?r:(n=u(t,t<0?-1:0,!1),a&&(i[t]=n),n)}function s(t,e){if(isNaN(t))return e?m:b;if(e){if(t<0)return m;if(t>=d)return x}else{if(t<=-h)return T;if(t+1>=h)return w}return t<0?s(-t,e).neg():u(t%f|0,t/f|0,e)}function u(t,e,r){return new n(t,e,r)}n.fromInt=a,n.fromNumber=s,n.fromBits=u;var c=Math.pow;function l(t,e,n){if(0===t.length)throw Error("empty string");if("NaN"===t||"Infinity"===t||"+Infinity"===t||"-Infinity"===t)return b;if("number"==typeof e?(n=e,e=!1):e=!!e,(n=n||10)<2||36<n)throw RangeError("radix");var r;if((r=t.indexOf("-"))>0)throw Error("interior hyphen");if(0===r)return l(t.substring(1),e,n).neg();for(var i=s(c(n,8)),o=b,a=0;a<t.length;a+=8){var u=Math.min(8,t.length-a),p=parseInt(t.substring(a,a+u),n);if(u<8){var f=s(c(n,u));o=o.mul(f).add(s(p))}else o=(o=o.mul(i)).add(s(p))}return o.unsigned=e,o}function p(t,e){return"number"==typeof t?s(t,e):"string"==typeof t?l(t,e):u(t.low,t.high,"boolean"==typeof e?e:t.unsigned)}n.fromString=l,n.fromValue=p;var f=4294967296,d=f*f,h=d/2,g=a(1<<24),b=a(0);n.ZERO=b;var m=a(0,!0);n.UZERO=m;var y=a(1);n.ONE=y;var _=a(1,!0);n.UONE=_;var v=a(-1);n.NEG_ONE=v;var w=u(-1,2147483647,!1);n.MAX_VALUE=w;var x=u(-1,-1,!0);n.MAX_UNSIGNED_VALUE=x;var T=u(0,-2147483648,!1);n.MIN_VALUE=T;var S=n.prototype;S.toInt=function(){return this.unsigned?this.low>>>0:this.low},S.toNumber=function(){return this.unsigned?(this.high>>>0)*f+(this.low>>>0):this.high*f+(this.low>>>0)},S.toString=function(t){if((t=t||10)<2||36<t)throw RangeError("radix");if(this.isZero())return"0";if(this.isNegative()){if(this.eq(T)){var e=s(t),n=this.div(e),r=n.mul(e).sub(this);return n.toString(t)+r.toInt().toString(t)}return"-"+this.neg().toString(t)}for(var i=s(c(t,6),this.unsigned),o=this,a="";;){var u=o.div(i),l=(o.sub(u.mul(i)).toInt()>>>0).toString(t);if((o=u).isZero())return l+a;for(;l.length<6;)l="0"+l;a=""+l+a}},S.getHighBits=function(){return this.high},S.getHighBitsUnsigned=function(){return this.high>>>0},S.getLowBits=function(){return this.low},S.getLowBitsUnsigned=function(){return this.low>>>0},S.getNumBitsAbs=function(){if(this.isNegative())return this.eq(T)?64:this.neg().getNumBitsAbs();for(var t=0!=this.high?this.high:this.low,e=31;e>0&&0==(t&1<<e);e--);return 0!=this.high?e+33:e+1},S.isZero=function(){return 0===this.high&&0===this.low},S.eqz=S.isZero,S.isNegative=function(){return!this.unsigned&&this.high<0},S.isPositive=function(){return this.unsigned||this.high>=0},S.isOdd=function(){return 1==(1&this.low)},S.isEven=function(){return 0==(1&this.low)},S.equals=function(t){return r(t)||(t=p(t)),(this.unsigned===t.unsigned||this.high>>>31!=1||t.high>>>31!=1)&&this.high===t.high&&this.low===t.low},S.eq=S.equals,S.notEquals=function(t){return!this.eq(t)},S.neq=S.notEquals,S.ne=S.notEquals,S.lessThan=function(t){return this.comp(t)<0},S.lt=S.lessThan,S.lessThanOrEqual=function(t){return this.comp(t)<=0},S.lte=S.lessThanOrEqual,S.le=S.lessThanOrEqual,S.greaterThan=function(t){return this.comp(t)>0},S.gt=S.greaterThan,S.greaterThanOrEqual=function(t){return this.comp(t)>=0},S.gte=S.greaterThanOrEqual,S.ge=S.greaterThanOrEqual,S.compare=function(t){if(r(t)||(t=p(t)),this.eq(t))return 0;var e=this.isNegative(),n=t.isNegative();return e&&!n?-1:!e&&n?1:this.unsigned?t.high>>>0>this.high>>>0||t.high===this.high&&t.low>>>0>this.low>>>0?-1:1:this.sub(t).isNegative()?-1:1},S.comp=S.compare,S.negate=function(){return!this.unsigned&&this.eq(T)?T:this.not().add(y)},S.neg=S.negate,S.add=function(t){r(t)||(t=p(t));var e=this.high>>>16,n=65535&this.high,i=this.low>>>16,o=65535&this.low,a=t.high>>>16,s=65535&t.high,c=t.low>>>16,l=0,f=0,d=0,h=0;return d+=(h+=o+(65535&t.low))>>>16,f+=(d+=i+c)>>>16,l+=(f+=n+s)>>>16,l+=e+a,u((d&=65535)<<16|(h&=65535),(l&=65535)<<16|(f&=65535),this.unsigned)},S.subtract=function(t){return r(t)||(t=p(t)),this.add(t.neg())},S.sub=S.subtract,S.multiply=function(t){if(this.isZero())return b;if(r(t)||(t=p(t)),e)return u(e.mul(this.low,this.high,t.low,t.high),e.get_high(),this.unsigned);if(t.isZero())return b;if(this.eq(T))return t.isOdd()?T:b;if(t.eq(T))return this.isOdd()?T:b;if(this.isNegative())return t.isNegative()?this.neg().mul(t.neg()):this.neg().mul(t).neg();if(t.isNegative())return this.mul(t.neg()).neg();if(this.lt(g)&&t.lt(g))return s(this.toNumber()*t.toNumber(),this.unsigned);var n=this.high>>>16,i=65535&this.high,o=this.low>>>16,a=65535&this.low,c=t.high>>>16,l=65535&t.high,f=t.low>>>16,d=65535&t.low,h=0,m=0,y=0,_=0;return y+=(_+=a*d)>>>16,m+=(y+=o*d)>>>16,y&=65535,m+=(y+=a*f)>>>16,h+=(m+=i*d)>>>16,m&=65535,h+=(m+=o*f)>>>16,m&=65535,h+=(m+=a*l)>>>16,h+=n*d+i*f+o*l+a*c,u((y&=65535)<<16|(_&=65535),(h&=65535)<<16|(m&=65535),this.unsigned)},S.mul=S.multiply,S.divide=function(t){if(r(t)||(t=p(t)),t.isZero())throw Error("division by zero");var n,i,o;if(e)return this.unsigned||-2147483648!==this.high||-1!==t.low||-1!==t.high?u((this.unsigned?e.div_u:e.div_s)(this.low,this.high,t.low,t.high),e.get_high(),this.unsigned):this;if(this.isZero())return this.unsigned?m:b;if(this.unsigned){if(t.unsigned||(t=t.toUnsigned()),t.gt(this))return m;if(t.gt(this.shru(1)))return _;o=m}else{if(this.eq(T))return t.eq(y)||t.eq(v)?T:t.eq(T)?y:(n=this.shr(1).div(t).shl(1)).eq(b)?t.isNegative()?y:v:(i=this.sub(t.mul(n)),o=n.add(i.div(t)));if(t.eq(T))return this.unsigned?m:b;if(this.isNegative())return t.isNegative()?this.neg().div(t.neg()):this.neg().div(t).neg();if(t.isNegative())return this.div(t.neg()).neg();o=b}for(i=this;i.gte(t);){n=Math.max(1,Math.floor(i.toNumber()/t.toNumber()));for(var a=Math.ceil(Math.log(n)/Math.LN2),l=a<=48?1:c(2,a-48),f=s(n),d=f.mul(t);d.isNegative()||d.gt(i);)d=(f=s(n-=l,this.unsigned)).mul(t);f.isZero()&&(f=y),o=o.add(f),i=i.sub(d)}return o},S.div=S.divide,S.modulo=function(t){return r(t)||(t=p(t)),e?u((this.unsigned?e.rem_u:e.rem_s)(this.low,this.high,t.low,t.high),e.get_high(),this.unsigned):this.sub(this.div(t).mul(t))},S.mod=S.modulo,S.rem=S.modulo,S.not=function(){return u(~this.low,~this.high,this.unsigned)},S.and=function(t){return r(t)||(t=p(t)),u(this.low&t.low,this.high&t.high,this.unsigned)},S.or=function(t){return r(t)||(t=p(t)),u(this.low|t.low,this.high|t.high,this.unsigned)},S.xor=function(t){return r(t)||(t=p(t)),u(this.low^t.low,this.high^t.high,this.unsigned)},S.shiftLeft=function(t){return r(t)&&(t=t.toInt()),0==(t&=63)?this:t<32?u(this.low<<t,this.high<<t|this.low>>>32-t,this.unsigned):u(0,this.low<<t-32,this.unsigned)},S.shl=S.shiftLeft,S.shiftRight=function(t){return r(t)&&(t=t.toInt()),0==(t&=63)?this:t<32?u(this.low>>>t|this.high<<32-t,this.high>>t,this.unsigned):u(this.high>>t-32,this.high>=0?0:-1,this.unsigned)},S.shr=S.shiftRight,S.shiftRightUnsigned=function(t){if(r(t)&&(t=t.toInt()),0==(t&=63))return this;var e=this.high;return t<32?u(this.low>>>t|e<<32-t,e>>>t,this.unsigned):u(32===t?e:e>>>t-32,0,this.unsigned)},S.shru=S.shiftRightUnsigned,S.shr_u=S.shiftRightUnsigned,S.toSigned=function(){return this.unsigned?u(this.low,this.high,!1):this},S.toUnsigned=function(){return this.unsigned?this:u(this.low,this.high,!0)},S.toBytes=function(t){return t?this.toBytesLE():this.toBytesBE()},S.toBytesLE=function(){var t=this.high,e=this.low;return[255&e,e>>>8&255,e>>>16&255,e>>>24,255&t,t>>>8&255,t>>>16&255,t>>>24]},S.toBytesBE=function(){var t=this.high,e=this.low;return[t>>>24,t>>>16&255,t>>>8&255,255&t,e>>>24,e>>>16&255,e>>>8&255,255&e]},n.fromBytes=function(t,e,r){return r?n.fromBytesLE(t,e):n.fromBytesBE(t,e)},n.fromBytesLE=function(t,e){return new n(t[0]|t[1]<<8|t[2]<<16|t[3]<<24,t[4]|t[5]<<8|t[6]<<16|t[7]<<24,e)},n.fromBytesBE=function(t,e){return new n(t[4]<<24|t[5]<<16|t[6]<<8|t[7],t[0]<<24|t[1]<<16|t[2]<<8|t[3],e)}},1446:(t,e,n)=>{"use strict";var r,i,o,a=n(2100),s=a.Reader,u=a.Writer,c=a.util,l=a.roots.default||(a.roots.default={});l.onnx=((o={}).Version=(r={},(i=Object.create(r))[r[0]="_START_VERSION"]=0,i[r[1]="IR_VERSION_2017_10_10"]=1,i[r[2]="IR_VERSION_2017_10_30"]=2,i[r[3]="IR_VERSION_2017_11_3"]=3,i[r[4]="IR_VERSION_2019_1_22"]=4,i[r[5]="IR_VERSION"]=5,i),o.AttributeProto=function(){function t(t){if(this.floats=[],this.ints=[],this.strings=[],this.tensors=[],this.graphs=[],t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.name="",t.prototype.refAttrName="",t.prototype.docString="",t.prototype.type=0,t.prototype.f=0,t.prototype.i=c.Long?c.Long.fromBits(0,0,!1):0,t.prototype.s=c.newBuffer([]),t.prototype.t=null,t.prototype.g=null,t.prototype.floats=c.emptyArray,t.prototype.ints=c.emptyArray,t.prototype.strings=c.emptyArray,t.prototype.tensors=c.emptyArray,t.prototype.graphs=c.emptyArray,t.create=function(e){return new t(e)},t.encode=function(t,e){if(e||(e=u.create()),null!=t.name&&t.hasOwnProperty("name")&&e.uint32(10).string(t.name),null!=t.f&&t.hasOwnProperty("f")&&e.uint32(21).float(t.f),null!=t.i&&t.hasOwnProperty("i")&&e.uint32(24).int64(t.i),null!=t.s&&t.hasOwnProperty("s")&&e.uint32(34).bytes(t.s),null!=t.t&&t.hasOwnProperty("t")&&l.onnx.TensorProto.encode(t.t,e.uint32(42).fork()).ldelim(),null!=t.g&&t.hasOwnProperty("g")&&l.onnx.GraphProto.encode(t.g,e.uint32(50).fork()).ldelim(),null!=t.floats&&t.floats.length){e.uint32(58).fork();for(var n=0;n<t.floats.length;++n)e.float(t.floats[n]);e.ldelim()}if(null!=t.ints&&t.ints.length){for(e.uint32(66).fork(),n=0;n<t.ints.length;++n)e.int64(t.ints[n]);e.ldelim()}if(null!=t.strings&&t.strings.length)for(n=0;n<t.strings.length;++n)e.uint32(74).bytes(t.strings[n]);if(null!=t.tensors&&t.tensors.length)for(n=0;n<t.tensors.length;++n)l.onnx.TensorProto.encode(t.tensors[n],e.uint32(82).fork()).ldelim();if(null!=t.graphs&&t.graphs.length)for(n=0;n<t.graphs.length;++n)l.onnx.GraphProto.encode(t.graphs[n],e.uint32(90).fork()).ldelim();return null!=t.docString&&t.hasOwnProperty("docString")&&e.uint32(106).string(t.docString),null!=t.type&&t.hasOwnProperty("type")&&e.uint32(160).int32(t.type),null!=t.refAttrName&&t.hasOwnProperty("refAttrName")&&e.uint32(170).string(t.refAttrName),e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.AttributeProto;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.name=t.string();break;case 21:r.refAttrName=t.string();break;case 13:r.docString=t.string();break;case 20:r.type=t.int32();break;case 2:r.f=t.float();break;case 3:r.i=t.int64();break;case 4:r.s=t.bytes();break;case 5:r.t=l.onnx.TensorProto.decode(t,t.uint32());break;case 6:r.g=l.onnx.GraphProto.decode(t,t.uint32());break;case 7:if(r.floats&&r.floats.length||(r.floats=[]),2==(7&i))for(var o=t.uint32()+t.pos;t.pos<o;)r.floats.push(t.float());else r.floats.push(t.float());break;case 8:if(r.ints&&r.ints.length||(r.ints=[]),2==(7&i))for(o=t.uint32()+t.pos;t.pos<o;)r.ints.push(t.int64());else r.ints.push(t.int64());break;case 9:r.strings&&r.strings.length||(r.strings=[]),r.strings.push(t.bytes());break;case 10:r.tensors&&r.tensors.length||(r.tensors=[]),r.tensors.push(l.onnx.TensorProto.decode(t,t.uint32()));break;case 11:r.graphs&&r.graphs.length||(r.graphs=[]),r.graphs.push(l.onnx.GraphProto.decode(t,t.uint32()));break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){if("object"!=typeof t||null===t)return"object expected";if(null!=t.name&&t.hasOwnProperty("name")&&!c.isString(t.name))return"name: string expected";if(null!=t.refAttrName&&t.hasOwnProperty("refAttrName")&&!c.isString(t.refAttrName))return"refAttrName: string expected";if(null!=t.docString&&t.hasOwnProperty("docString")&&!c.isString(t.docString))return"docString: string expected";if(null!=t.type&&t.hasOwnProperty("type"))switch(t.type){default:return"type: enum value expected";case 0:case 1:case 2:case 3:case 4:case 5:case 6:case 7:case 8:case 9:case 10:}if(null!=t.f&&t.hasOwnProperty("f")&&"number"!=typeof t.f)return"f: number expected";if(null!=t.i&&t.hasOwnProperty("i")&&!(c.isInteger(t.i)||t.i&&c.isInteger(t.i.low)&&c.isInteger(t.i.high)))return"i: integer|Long expected";if(null!=t.s&&t.hasOwnProperty("s")&&!(t.s&&"number"==typeof t.s.length||c.isString(t.s)))return"s: buffer expected";if(null!=t.t&&t.hasOwnProperty("t")&&(n=l.onnx.TensorProto.verify(t.t)))return"t."+n;if(null!=t.g&&t.hasOwnProperty("g")&&(n=l.onnx.GraphProto.verify(t.g)))return"g."+n;if(null!=t.floats&&t.hasOwnProperty("floats")){if(!Array.isArray(t.floats))return"floats: array expected";for(var e=0;e<t.floats.length;++e)if("number"!=typeof t.floats[e])return"floats: number[] expected"}if(null!=t.ints&&t.hasOwnProperty("ints")){if(!Array.isArray(t.ints))return"ints: array expected";for(e=0;e<t.ints.length;++e)if(!(c.isInteger(t.ints[e])||t.ints[e]&&c.isInteger(t.ints[e].low)&&c.isInteger(t.ints[e].high)))return"ints: integer|Long[] expected"}if(null!=t.strings&&t.hasOwnProperty("strings")){if(!Array.isArray(t.strings))return"strings: array expected";for(e=0;e<t.strings.length;++e)if(!(t.strings[e]&&"number"==typeof t.strings[e].length||c.isString(t.strings[e])))return"strings: buffer[] expected"}if(null!=t.tensors&&t.hasOwnProperty("tensors")){if(!Array.isArray(t.tensors))return"tensors: array expected";for(e=0;e<t.tensors.length;++e)if(n=l.onnx.TensorProto.verify(t.tensors[e]))return"tensors."+n}if(null!=t.graphs&&t.hasOwnProperty("graphs")){if(!Array.isArray(t.graphs))return"graphs: array expected";for(e=0;e<t.graphs.length;++e){var n;if(n=l.onnx.GraphProto.verify(t.graphs[e]))return"graphs."+n}}return null},t.fromObject=function(t){if(t instanceof l.onnx.AttributeProto)return t;var e=new l.onnx.AttributeProto;switch(null!=t.name&&(e.name=String(t.name)),null!=t.refAttrName&&(e.refAttrName=String(t.refAttrName)),null!=t.docString&&(e.docString=String(t.docString)),t.type){case"UNDEFINED":case 0:e.type=0;break;case"FLOAT":case 1:e.type=1;break;case"INT":case 2:e.type=2;break;case"STRING":case 3:e.type=3;break;case"TENSOR":case 4:e.type=4;break;case"GRAPH":case 5:e.type=5;break;case"FLOATS":case 6:e.type=6;break;case"INTS":case 7:e.type=7;break;case"STRINGS":case 8:e.type=8;break;case"TENSORS":case 9:e.type=9;break;case"GRAPHS":case 10:e.type=10}if(null!=t.f&&(e.f=Number(t.f)),null!=t.i&&(c.Long?(e.i=c.Long.fromValue(t.i)).unsigned=!1:"string"==typeof t.i?e.i=parseInt(t.i,10):"number"==typeof t.i?e.i=t.i:"object"==typeof t.i&&(e.i=new c.LongBits(t.i.low>>>0,t.i.high>>>0).toNumber())),null!=t.s&&("string"==typeof t.s?c.base64.decode(t.s,e.s=c.newBuffer(c.base64.length(t.s)),0):t.s.length&&(e.s=t.s)),null!=t.t){if("object"!=typeof t.t)throw TypeError(".onnx.AttributeProto.t: object expected");e.t=l.onnx.TensorProto.fromObject(t.t)}if(null!=t.g){if("object"!=typeof t.g)throw TypeError(".onnx.AttributeProto.g: object expected");e.g=l.onnx.GraphProto.fromObject(t.g)}if(t.floats){if(!Array.isArray(t.floats))throw TypeError(".onnx.AttributeProto.floats: array expected");e.floats=[];for(var n=0;n<t.floats.length;++n)e.floats[n]=Number(t.floats[n])}if(t.ints){if(!Array.isArray(t.ints))throw TypeError(".onnx.AttributeProto.ints: array expected");for(e.ints=[],n=0;n<t.ints.length;++n)c.Long?(e.ints[n]=c.Long.fromValue(t.ints[n])).unsigned=!1:"string"==typeof t.ints[n]?e.ints[n]=parseInt(t.ints[n],10):"number"==typeof t.ints[n]?e.ints[n]=t.ints[n]:"object"==typeof t.ints[n]&&(e.ints[n]=new c.LongBits(t.ints[n].low>>>0,t.ints[n].high>>>0).toNumber())}if(t.strings){if(!Array.isArray(t.strings))throw TypeError(".onnx.AttributeProto.strings: array expected");for(e.strings=[],n=0;n<t.strings.length;++n)"string"==typeof t.strings[n]?c.base64.decode(t.strings[n],e.strings[n]=c.newBuffer(c.base64.length(t.strings[n])),0):t.strings[n].length&&(e.strings[n]=t.strings[n])}if(t.tensors){if(!Array.isArray(t.tensors))throw TypeError(".onnx.AttributeProto.tensors: array expected");for(e.tensors=[],n=0;n<t.tensors.length;++n){if("object"!=typeof t.tensors[n])throw TypeError(".onnx.AttributeProto.tensors: object expected");e.tensors[n]=l.onnx.TensorProto.fromObject(t.tensors[n])}}if(t.graphs){if(!Array.isArray(t.graphs))throw TypeError(".onnx.AttributeProto.graphs: array expected");for(e.graphs=[],n=0;n<t.graphs.length;++n){if("object"!=typeof t.graphs[n])throw TypeError(".onnx.AttributeProto.graphs: object expected");e.graphs[n]=l.onnx.GraphProto.fromObject(t.graphs[n])}}return e},t.toObject=function(t,e){e||(e={});var n={};if((e.arrays||e.defaults)&&(n.floats=[],n.ints=[],n.strings=[],n.tensors=[],n.graphs=[]),e.defaults){if(n.name="",n.f=0,c.Long){var r=new c.Long(0,0,!1);n.i=e.longs===String?r.toString():e.longs===Number?r.toNumber():r}else n.i=e.longs===String?"0":0;e.bytes===String?n.s="":(n.s=[],e.bytes!==Array&&(n.s=c.newBuffer(n.s))),n.t=null,n.g=null,n.docString="",n.type=e.enums===String?"UNDEFINED":0,n.refAttrName=""}if(null!=t.name&&t.hasOwnProperty("name")&&(n.name=t.name),null!=t.f&&t.hasOwnProperty("f")&&(n.f=e.json&&!isFinite(t.f)?String(t.f):t.f),null!=t.i&&t.hasOwnProperty("i")&&("number"==typeof t.i?n.i=e.longs===String?String(t.i):t.i:n.i=e.longs===String?c.Long.prototype.toString.call(t.i):e.longs===Number?new c.LongBits(t.i.low>>>0,t.i.high>>>0).toNumber():t.i),null!=t.s&&t.hasOwnProperty("s")&&(n.s=e.bytes===String?c.base64.encode(t.s,0,t.s.length):e.bytes===Array?Array.prototype.slice.call(t.s):t.s),null!=t.t&&t.hasOwnProperty("t")&&(n.t=l.onnx.TensorProto.toObject(t.t,e)),null!=t.g&&t.hasOwnProperty("g")&&(n.g=l.onnx.GraphProto.toObject(t.g,e)),t.floats&&t.floats.length){n.floats=[];for(var i=0;i<t.floats.length;++i)n.floats[i]=e.json&&!isFinite(t.floats[i])?String(t.floats[i]):t.floats[i]}if(t.ints&&t.ints.length)for(n.ints=[],i=0;i<t.ints.length;++i)"number"==typeof t.ints[i]?n.ints[i]=e.longs===String?String(t.ints[i]):t.ints[i]:n.ints[i]=e.longs===String?c.Long.prototype.toString.call(t.ints[i]):e.longs===Number?new c.LongBits(t.ints[i].low>>>0,t.ints[i].high>>>0).toNumber():t.ints[i];if(t.strings&&t.strings.length)for(n.strings=[],i=0;i<t.strings.length;++i)n.strings[i]=e.bytes===String?c.base64.encode(t.strings[i],0,t.strings[i].length):e.bytes===Array?Array.prototype.slice.call(t.strings[i]):t.strings[i];if(t.tensors&&t.tensors.length)for(n.tensors=[],i=0;i<t.tensors.length;++i)n.tensors[i]=l.onnx.TensorProto.toObject(t.tensors[i],e);if(t.graphs&&t.graphs.length)for(n.graphs=[],i=0;i<t.graphs.length;++i)n.graphs[i]=l.onnx.GraphProto.toObject(t.graphs[i],e);return null!=t.docString&&t.hasOwnProperty("docString")&&(n.docString=t.docString),null!=t.type&&t.hasOwnProperty("type")&&(n.type=e.enums===String?l.onnx.AttributeProto.AttributeType[t.type]:t.type),null!=t.refAttrName&&t.hasOwnProperty("refAttrName")&&(n.refAttrName=t.refAttrName),n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t.AttributeType=function(){var t={},e=Object.create(t);return e[t[0]="UNDEFINED"]=0,e[t[1]="FLOAT"]=1,e[t[2]="INT"]=2,e[t[3]="STRING"]=3,e[t[4]="TENSOR"]=4,e[t[5]="GRAPH"]=5,e[t[6]="FLOATS"]=6,e[t[7]="INTS"]=7,e[t[8]="STRINGS"]=8,e[t[9]="TENSORS"]=9,e[t[10]="GRAPHS"]=10,e}(),t}(),o.ValueInfoProto=function(){function t(t){if(t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.name="",t.prototype.type=null,t.prototype.docString="",t.create=function(e){return new t(e)},t.encode=function(t,e){return e||(e=u.create()),null!=t.name&&t.hasOwnProperty("name")&&e.uint32(10).string(t.name),null!=t.type&&t.hasOwnProperty("type")&&l.onnx.TypeProto.encode(t.type,e.uint32(18).fork()).ldelim(),null!=t.docString&&t.hasOwnProperty("docString")&&e.uint32(26).string(t.docString),e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.ValueInfoProto;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.name=t.string();break;case 2:r.type=l.onnx.TypeProto.decode(t,t.uint32());break;case 3:r.docString=t.string();break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){if("object"!=typeof t||null===t)return"object expected";if(null!=t.name&&t.hasOwnProperty("name")&&!c.isString(t.name))return"name: string expected";if(null!=t.type&&t.hasOwnProperty("type")){var e=l.onnx.TypeProto.verify(t.type);if(e)return"type."+e}return null!=t.docString&&t.hasOwnProperty("docString")&&!c.isString(t.docString)?"docString: string expected":null},t.fromObject=function(t){if(t instanceof l.onnx.ValueInfoProto)return t;var e=new l.onnx.ValueInfoProto;if(null!=t.name&&(e.name=String(t.name)),null!=t.type){if("object"!=typeof t.type)throw TypeError(".onnx.ValueInfoProto.type: object expected");e.type=l.onnx.TypeProto.fromObject(t.type)}return null!=t.docString&&(e.docString=String(t.docString)),e},t.toObject=function(t,e){e||(e={});var n={};return e.defaults&&(n.name="",n.type=null,n.docString=""),null!=t.name&&t.hasOwnProperty("name")&&(n.name=t.name),null!=t.type&&t.hasOwnProperty("type")&&(n.type=l.onnx.TypeProto.toObject(t.type,e)),null!=t.docString&&t.hasOwnProperty("docString")&&(n.docString=t.docString),n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t}(),o.NodeProto=function(){function t(t){if(this.input=[],this.output=[],this.attribute=[],t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.input=c.emptyArray,t.prototype.output=c.emptyArray,t.prototype.name="",t.prototype.opType="",t.prototype.domain="",t.prototype.attribute=c.emptyArray,t.prototype.docString="",t.create=function(e){return new t(e)},t.encode=function(t,e){if(e||(e=u.create()),null!=t.input&&t.input.length)for(var n=0;n<t.input.length;++n)e.uint32(10).string(t.input[n]);if(null!=t.output&&t.output.length)for(n=0;n<t.output.length;++n)e.uint32(18).string(t.output[n]);if(null!=t.name&&t.hasOwnProperty("name")&&e.uint32(26).string(t.name),null!=t.opType&&t.hasOwnProperty("opType")&&e.uint32(34).string(t.opType),null!=t.attribute&&t.attribute.length)for(n=0;n<t.attribute.length;++n)l.onnx.AttributeProto.encode(t.attribute[n],e.uint32(42).fork()).ldelim();return null!=t.docString&&t.hasOwnProperty("docString")&&e.uint32(50).string(t.docString),null!=t.domain&&t.hasOwnProperty("domain")&&e.uint32(58).string(t.domain),e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.NodeProto;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.input&&r.input.length||(r.input=[]),r.input.push(t.string());break;case 2:r.output&&r.output.length||(r.output=[]),r.output.push(t.string());break;case 3:r.name=t.string();break;case 4:r.opType=t.string();break;case 7:r.domain=t.string();break;case 5:r.attribute&&r.attribute.length||(r.attribute=[]),r.attribute.push(l.onnx.AttributeProto.decode(t,t.uint32()));break;case 6:r.docString=t.string();break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){if("object"!=typeof t||null===t)return"object expected";if(null!=t.input&&t.hasOwnProperty("input")){if(!Array.isArray(t.input))return"input: array expected";for(var e=0;e<t.input.length;++e)if(!c.isString(t.input[e]))return"input: string[] expected"}if(null!=t.output&&t.hasOwnProperty("output")){if(!Array.isArray(t.output))return"output: array expected";for(e=0;e<t.output.length;++e)if(!c.isString(t.output[e]))return"output: string[] expected"}if(null!=t.name&&t.hasOwnProperty("name")&&!c.isString(t.name))return"name: string expected";if(null!=t.opType&&t.hasOwnProperty("opType")&&!c.isString(t.opType))return"opType: string expected";if(null!=t.domain&&t.hasOwnProperty("domain")&&!c.isString(t.domain))return"domain: string expected";if(null!=t.attribute&&t.hasOwnProperty("attribute")){if(!Array.isArray(t.attribute))return"attribute: array expected";for(e=0;e<t.attribute.length;++e){var n=l.onnx.AttributeProto.verify(t.attribute[e]);if(n)return"attribute."+n}}return null!=t.docString&&t.hasOwnProperty("docString")&&!c.isString(t.docString)?"docString: string expected":null},t.fromObject=function(t){if(t instanceof l.onnx.NodeProto)return t;var e=new l.onnx.NodeProto;if(t.input){if(!Array.isArray(t.input))throw TypeError(".onnx.NodeProto.input: array expected");e.input=[];for(var n=0;n<t.input.length;++n)e.input[n]=String(t.input[n])}if(t.output){if(!Array.isArray(t.output))throw TypeError(".onnx.NodeProto.output: array expected");for(e.output=[],n=0;n<t.output.length;++n)e.output[n]=String(t.output[n])}if(null!=t.name&&(e.name=String(t.name)),null!=t.opType&&(e.opType=String(t.opType)),null!=t.domain&&(e.domain=String(t.domain)),t.attribute){if(!Array.isArray(t.attribute))throw TypeError(".onnx.NodeProto.attribute: array expected");for(e.attribute=[],n=0;n<t.attribute.length;++n){if("object"!=typeof t.attribute[n])throw TypeError(".onnx.NodeProto.attribute: object expected");e.attribute[n]=l.onnx.AttributeProto.fromObject(t.attribute[n])}}return null!=t.docString&&(e.docString=String(t.docString)),e},t.toObject=function(t,e){e||(e={});var n={};if((e.arrays||e.defaults)&&(n.input=[],n.output=[],n.attribute=[]),e.defaults&&(n.name="",n.opType="",n.docString="",n.domain=""),t.input&&t.input.length){n.input=[];for(var r=0;r<t.input.length;++r)n.input[r]=t.input[r]}if(t.output&&t.output.length)for(n.output=[],r=0;r<t.output.length;++r)n.output[r]=t.output[r];if(null!=t.name&&t.hasOwnProperty("name")&&(n.name=t.name),null!=t.opType&&t.hasOwnProperty("opType")&&(n.opType=t.opType),t.attribute&&t.attribute.length)for(n.attribute=[],r=0;r<t.attribute.length;++r)n.attribute[r]=l.onnx.AttributeProto.toObject(t.attribute[r],e);return null!=t.docString&&t.hasOwnProperty("docString")&&(n.docString=t.docString),null!=t.domain&&t.hasOwnProperty("domain")&&(n.domain=t.domain),n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t}(),o.ModelProto=function(){function t(t){if(this.opsetImport=[],this.metadataProps=[],t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.irVersion=c.Long?c.Long.fromBits(0,0,!1):0,t.prototype.opsetImport=c.emptyArray,t.prototype.producerName="",t.prototype.producerVersion="",t.prototype.domain="",t.prototype.modelVersion=c.Long?c.Long.fromBits(0,0,!1):0,t.prototype.docString="",t.prototype.graph=null,t.prototype.metadataProps=c.emptyArray,t.create=function(e){return new t(e)},t.encode=function(t,e){if(e||(e=u.create()),null!=t.irVersion&&t.hasOwnProperty("irVersion")&&e.uint32(8).int64(t.irVersion),null!=t.producerName&&t.hasOwnProperty("producerName")&&e.uint32(18).string(t.producerName),null!=t.producerVersion&&t.hasOwnProperty("producerVersion")&&e.uint32(26).string(t.producerVersion),null!=t.domain&&t.hasOwnProperty("domain")&&e.uint32(34).string(t.domain),null!=t.modelVersion&&t.hasOwnProperty("modelVersion")&&e.uint32(40).int64(t.modelVersion),null!=t.docString&&t.hasOwnProperty("docString")&&e.uint32(50).string(t.docString),null!=t.graph&&t.hasOwnProperty("graph")&&l.onnx.GraphProto.encode(t.graph,e.uint32(58).fork()).ldelim(),null!=t.opsetImport&&t.opsetImport.length)for(var n=0;n<t.opsetImport.length;++n)l.onnx.OperatorSetIdProto.encode(t.opsetImport[n],e.uint32(66).fork()).ldelim();if(null!=t.metadataProps&&t.metadataProps.length)for(n=0;n<t.metadataProps.length;++n)l.onnx.StringStringEntryProto.encode(t.metadataProps[n],e.uint32(114).fork()).ldelim();return e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.ModelProto;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.irVersion=t.int64();break;case 8:r.opsetImport&&r.opsetImport.length||(r.opsetImport=[]),r.opsetImport.push(l.onnx.OperatorSetIdProto.decode(t,t.uint32()));break;case 2:r.producerName=t.string();break;case 3:r.producerVersion=t.string();break;case 4:r.domain=t.string();break;case 5:r.modelVersion=t.int64();break;case 6:r.docString=t.string();break;case 7:r.graph=l.onnx.GraphProto.decode(t,t.uint32());break;case 14:r.metadataProps&&r.metadataProps.length||(r.metadataProps=[]),r.metadataProps.push(l.onnx.StringStringEntryProto.decode(t,t.uint32()));break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){if("object"!=typeof t||null===t)return"object expected";if(null!=t.irVersion&&t.hasOwnProperty("irVersion")&&!(c.isInteger(t.irVersion)||t.irVersion&&c.isInteger(t.irVersion.low)&&c.isInteger(t.irVersion.high)))return"irVersion: integer|Long expected";if(null!=t.opsetImport&&t.hasOwnProperty("opsetImport")){if(!Array.isArray(t.opsetImport))return"opsetImport: array expected";for(var e=0;e<t.opsetImport.length;++e)if(n=l.onnx.OperatorSetIdProto.verify(t.opsetImport[e]))return"opsetImport."+n}if(null!=t.producerName&&t.hasOwnProperty("producerName")&&!c.isString(t.producerName))return"producerName: string expected";if(null!=t.producerVersion&&t.hasOwnProperty("producerVersion")&&!c.isString(t.producerVersion))return"producerVersion: string expected";if(null!=t.domain&&t.hasOwnProperty("domain")&&!c.isString(t.domain))return"domain: string expected";if(null!=t.modelVersion&&t.hasOwnProperty("modelVersion")&&!(c.isInteger(t.modelVersion)||t.modelVersion&&c.isInteger(t.modelVersion.low)&&c.isInteger(t.modelVersion.high)))return"modelVersion: integer|Long expected";if(null!=t.docString&&t.hasOwnProperty("docString")&&!c.isString(t.docString))return"docString: string expected";if(null!=t.graph&&t.hasOwnProperty("graph")&&(n=l.onnx.GraphProto.verify(t.graph)))return"graph."+n;if(null!=t.metadataProps&&t.hasOwnProperty("metadataProps")){if(!Array.isArray(t.metadataProps))return"metadataProps: array expected";for(e=0;e<t.metadataProps.length;++e){var n;if(n=l.onnx.StringStringEntryProto.verify(t.metadataProps[e]))return"metadataProps."+n}}return null},t.fromObject=function(t){if(t instanceof l.onnx.ModelProto)return t;var e=new l.onnx.ModelProto;if(null!=t.irVersion&&(c.Long?(e.irVersion=c.Long.fromValue(t.irVersion)).unsigned=!1:"string"==typeof t.irVersion?e.irVersion=parseInt(t.irVersion,10):"number"==typeof t.irVersion?e.irVersion=t.irVersion:"object"==typeof t.irVersion&&(e.irVersion=new c.LongBits(t.irVersion.low>>>0,t.irVersion.high>>>0).toNumber())),t.opsetImport){if(!Array.isArray(t.opsetImport))throw TypeError(".onnx.ModelProto.opsetImport: array expected");e.opsetImport=[];for(var n=0;n<t.opsetImport.length;++n){if("object"!=typeof t.opsetImport[n])throw TypeError(".onnx.ModelProto.opsetImport: object expected");e.opsetImport[n]=l.onnx.OperatorSetIdProto.fromObject(t.opsetImport[n])}}if(null!=t.producerName&&(e.producerName=String(t.producerName)),null!=t.producerVersion&&(e.producerVersion=String(t.producerVersion)),null!=t.domain&&(e.domain=String(t.domain)),null!=t.modelVersion&&(c.Long?(e.modelVersion=c.Long.fromValue(t.modelVersion)).unsigned=!1:"string"==typeof t.modelVersion?e.modelVersion=parseInt(t.modelVersion,10):"number"==typeof t.modelVersion?e.modelVersion=t.modelVersion:"object"==typeof t.modelVersion&&(e.modelVersion=new c.LongBits(t.modelVersion.low>>>0,t.modelVersion.high>>>0).toNumber())),null!=t.docString&&(e.docString=String(t.docString)),null!=t.graph){if("object"!=typeof t.graph)throw TypeError(".onnx.ModelProto.graph: object expected");e.graph=l.onnx.GraphProto.fromObject(t.graph)}if(t.metadataProps){if(!Array.isArray(t.metadataProps))throw TypeError(".onnx.ModelProto.metadataProps: array expected");for(e.metadataProps=[],n=0;n<t.metadataProps.length;++n){if("object"!=typeof t.metadataProps[n])throw TypeError(".onnx.ModelProto.metadataProps: object expected");e.metadataProps[n]=l.onnx.StringStringEntryProto.fromObject(t.metadataProps[n])}}return e},t.toObject=function(t,e){e||(e={});var n={};if((e.arrays||e.defaults)&&(n.opsetImport=[],n.metadataProps=[]),e.defaults){if(c.Long){var r=new c.Long(0,0,!1);n.irVersion=e.longs===String?r.toString():e.longs===Number?r.toNumber():r}else n.irVersion=e.longs===String?"0":0;n.producerName="",n.producerVersion="",n.domain="",c.Long?(r=new c.Long(0,0,!1),n.modelVersion=e.longs===String?r.toString():e.longs===Number?r.toNumber():r):n.modelVersion=e.longs===String?"0":0,n.docString="",n.graph=null}if(null!=t.irVersion&&t.hasOwnProperty("irVersion")&&("number"==typeof t.irVersion?n.irVersion=e.longs===String?String(t.irVersion):t.irVersion:n.irVersion=e.longs===String?c.Long.prototype.toString.call(t.irVersion):e.longs===Number?new c.LongBits(t.irVersion.low>>>0,t.irVersion.high>>>0).toNumber():t.irVersion),null!=t.producerName&&t.hasOwnProperty("producerName")&&(n.producerName=t.producerName),null!=t.producerVersion&&t.hasOwnProperty("producerVersion")&&(n.producerVersion=t.producerVersion),null!=t.domain&&t.hasOwnProperty("domain")&&(n.domain=t.domain),null!=t.modelVersion&&t.hasOwnProperty("modelVersion")&&("number"==typeof t.modelVersion?n.modelVersion=e.longs===String?String(t.modelVersion):t.modelVersion:n.modelVersion=e.longs===String?c.Long.prototype.toString.call(t.modelVersion):e.longs===Number?new c.LongBits(t.modelVersion.low>>>0,t.modelVersion.high>>>0).toNumber():t.modelVersion),null!=t.docString&&t.hasOwnProperty("docString")&&(n.docString=t.docString),null!=t.graph&&t.hasOwnProperty("graph")&&(n.graph=l.onnx.GraphProto.toObject(t.graph,e)),t.opsetImport&&t.opsetImport.length){n.opsetImport=[];for(var i=0;i<t.opsetImport.length;++i)n.opsetImport[i]=l.onnx.OperatorSetIdProto.toObject(t.opsetImport[i],e)}if(t.metadataProps&&t.metadataProps.length)for(n.metadataProps=[],i=0;i<t.metadataProps.length;++i)n.metadataProps[i]=l.onnx.StringStringEntryProto.toObject(t.metadataProps[i],e);return n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t}(),o.StringStringEntryProto=function(){function t(t){if(t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.key="",t.prototype.value="",t.create=function(e){return new t(e)},t.encode=function(t,e){return e||(e=u.create()),null!=t.key&&t.hasOwnProperty("key")&&e.uint32(10).string(t.key),null!=t.value&&t.hasOwnProperty("value")&&e.uint32(18).string(t.value),e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.StringStringEntryProto;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.key=t.string();break;case 2:r.value=t.string();break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){return"object"!=typeof t||null===t?"object expected":null!=t.key&&t.hasOwnProperty("key")&&!c.isString(t.key)?"key: string expected":null!=t.value&&t.hasOwnProperty("value")&&!c.isString(t.value)?"value: string expected":null},t.fromObject=function(t){if(t instanceof l.onnx.StringStringEntryProto)return t;var e=new l.onnx.StringStringEntryProto;return null!=t.key&&(e.key=String(t.key)),null!=t.value&&(e.value=String(t.value)),e},t.toObject=function(t,e){e||(e={});var n={};return e.defaults&&(n.key="",n.value=""),null!=t.key&&t.hasOwnProperty("key")&&(n.key=t.key),null!=t.value&&t.hasOwnProperty("value")&&(n.value=t.value),n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t}(),o.TensorAnnotation=function(){function t(t){if(this.quantParameterTensorNames=[],t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.tensorName="",t.prototype.quantParameterTensorNames=c.emptyArray,t.create=function(e){return new t(e)},t.encode=function(t,e){if(e||(e=u.create()),null!=t.tensorName&&t.hasOwnProperty("tensorName")&&e.uint32(10).string(t.tensorName),null!=t.quantParameterTensorNames&&t.quantParameterTensorNames.length)for(var n=0;n<t.quantParameterTensorNames.length;++n)l.onnx.StringStringEntryProto.encode(t.quantParameterTensorNames[n],e.uint32(18).fork()).ldelim();return e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.TensorAnnotation;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.tensorName=t.string();break;case 2:r.quantParameterTensorNames&&r.quantParameterTensorNames.length||(r.quantParameterTensorNames=[]),r.quantParameterTensorNames.push(l.onnx.StringStringEntryProto.decode(t,t.uint32()));break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){if("object"!=typeof t||null===t)return"object expected";if(null!=t.tensorName&&t.hasOwnProperty("tensorName")&&!c.isString(t.tensorName))return"tensorName: string expected";if(null!=t.quantParameterTensorNames&&t.hasOwnProperty("quantParameterTensorNames")){if(!Array.isArray(t.quantParameterTensorNames))return"quantParameterTensorNames: array expected";for(var e=0;e<t.quantParameterTensorNames.length;++e){var n=l.onnx.StringStringEntryProto.verify(t.quantParameterTensorNames[e]);if(n)return"quantParameterTensorNames."+n}}return null},t.fromObject=function(t){if(t instanceof l.onnx.TensorAnnotation)return t;var e=new l.onnx.TensorAnnotation;if(null!=t.tensorName&&(e.tensorName=String(t.tensorName)),t.quantParameterTensorNames){if(!Array.isArray(t.quantParameterTensorNames))throw TypeError(".onnx.TensorAnnotation.quantParameterTensorNames: array expected");e.quantParameterTensorNames=[];for(var n=0;n<t.quantParameterTensorNames.length;++n){if("object"!=typeof t.quantParameterTensorNames[n])throw TypeError(".onnx.TensorAnnotation.quantParameterTensorNames: object expected");e.quantParameterTensorNames[n]=l.onnx.StringStringEntryProto.fromObject(t.quantParameterTensorNames[n])}}return e},t.toObject=function(t,e){e||(e={});var n={};if((e.arrays||e.defaults)&&(n.quantParameterTensorNames=[]),e.defaults&&(n.tensorName=""),null!=t.tensorName&&t.hasOwnProperty("tensorName")&&(n.tensorName=t.tensorName),t.quantParameterTensorNames&&t.quantParameterTensorNames.length){n.quantParameterTensorNames=[];for(var r=0;r<t.quantParameterTensorNames.length;++r)n.quantParameterTensorNames[r]=l.onnx.StringStringEntryProto.toObject(t.quantParameterTensorNames[r],e)}return n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t}(),o.GraphProto=function(){function t(t){if(this.node=[],this.initializer=[],this.input=[],this.output=[],this.valueInfo=[],this.quantizationAnnotation=[],t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.node=c.emptyArray,t.prototype.name="",t.prototype.initializer=c.emptyArray,t.prototype.docString="",t.prototype.input=c.emptyArray,t.prototype.output=c.emptyArray,t.prototype.valueInfo=c.emptyArray,t.prototype.quantizationAnnotation=c.emptyArray,t.create=function(e){return new t(e)},t.encode=function(t,e){if(e||(e=u.create()),null!=t.node&&t.node.length)for(var n=0;n<t.node.length;++n)l.onnx.NodeProto.encode(t.node[n],e.uint32(10).fork()).ldelim();if(null!=t.name&&t.hasOwnProperty("name")&&e.uint32(18).string(t.name),null!=t.initializer&&t.initializer.length)for(n=0;n<t.initializer.length;++n)l.onnx.TensorProto.encode(t.initializer[n],e.uint32(42).fork()).ldelim();if(null!=t.docString&&t.hasOwnProperty("docString")&&e.uint32(82).string(t.docString),null!=t.input&&t.input.length)for(n=0;n<t.input.length;++n)l.onnx.ValueInfoProto.encode(t.input[n],e.uint32(90).fork()).ldelim();if(null!=t.output&&t.output.length)for(n=0;n<t.output.length;++n)l.onnx.ValueInfoProto.encode(t.output[n],e.uint32(98).fork()).ldelim();if(null!=t.valueInfo&&t.valueInfo.length)for(n=0;n<t.valueInfo.length;++n)l.onnx.ValueInfoProto.encode(t.valueInfo[n],e.uint32(106).fork()).ldelim();if(null!=t.quantizationAnnotation&&t.quantizationAnnotation.length)for(n=0;n<t.quantizationAnnotation.length;++n)l.onnx.TensorAnnotation.encode(t.quantizationAnnotation[n],e.uint32(114).fork()).ldelim();return e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.GraphProto;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.node&&r.node.length||(r.node=[]),r.node.push(l.onnx.NodeProto.decode(t,t.uint32()));break;case 2:r.name=t.string();break;case 5:r.initializer&&r.initializer.length||(r.initializer=[]),r.initializer.push(l.onnx.TensorProto.decode(t,t.uint32()));break;case 10:r.docString=t.string();break;case 11:r.input&&r.input.length||(r.input=[]),r.input.push(l.onnx.ValueInfoProto.decode(t,t.uint32()));break;case 12:r.output&&r.output.length||(r.output=[]),r.output.push(l.onnx.ValueInfoProto.decode(t,t.uint32()));break;case 13:r.valueInfo&&r.valueInfo.length||(r.valueInfo=[]),r.valueInfo.push(l.onnx.ValueInfoProto.decode(t,t.uint32()));break;case 14:r.quantizationAnnotation&&r.quantizationAnnotation.length||(r.quantizationAnnotation=[]),r.quantizationAnnotation.push(l.onnx.TensorAnnotation.decode(t,t.uint32()));break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){if("object"!=typeof t||null===t)return"object expected";if(null!=t.node&&t.hasOwnProperty("node")){if(!Array.isArray(t.node))return"node: array expected";for(var e=0;e<t.node.length;++e)if(n=l.onnx.NodeProto.verify(t.node[e]))return"node."+n}if(null!=t.name&&t.hasOwnProperty("name")&&!c.isString(t.name))return"name: string expected";if(null!=t.initializer&&t.hasOwnProperty("initializer")){if(!Array.isArray(t.initializer))return"initializer: array expected";for(e=0;e<t.initializer.length;++e)if(n=l.onnx.TensorProto.verify(t.initializer[e]))return"initializer."+n}if(null!=t.docString&&t.hasOwnProperty("docString")&&!c.isString(t.docString))return"docString: string expected";if(null!=t.input&&t.hasOwnProperty("input")){if(!Array.isArray(t.input))return"input: array expected";for(e=0;e<t.input.length;++e)if(n=l.onnx.ValueInfoProto.verify(t.input[e]))return"input."+n}if(null!=t.output&&t.hasOwnProperty("output")){if(!Array.isArray(t.output))return"output: array expected";for(e=0;e<t.output.length;++e)if(n=l.onnx.ValueInfoProto.verify(t.output[e]))return"output."+n}if(null!=t.valueInfo&&t.hasOwnProperty("valueInfo")){if(!Array.isArray(t.valueInfo))return"valueInfo: array expected";for(e=0;e<t.valueInfo.length;++e)if(n=l.onnx.ValueInfoProto.verify(t.valueInfo[e]))return"valueInfo."+n}if(null!=t.quantizationAnnotation&&t.hasOwnProperty("quantizationAnnotation")){if(!Array.isArray(t.quantizationAnnotation))return"quantizationAnnotation: array expected";for(e=0;e<t.quantizationAnnotation.length;++e){var n;if(n=l.onnx.TensorAnnotation.verify(t.quantizationAnnotation[e]))return"quantizationAnnotation."+n}}return null},t.fromObject=function(t){if(t instanceof l.onnx.GraphProto)return t;var e=new l.onnx.GraphProto;if(t.node){if(!Array.isArray(t.node))throw TypeError(".onnx.GraphProto.node: array expected");e.node=[];for(var n=0;n<t.node.length;++n){if("object"!=typeof t.node[n])throw TypeError(".onnx.GraphProto.node: object expected");e.node[n]=l.onnx.NodeProto.fromObject(t.node[n])}}if(null!=t.name&&(e.name=String(t.name)),t.initializer){if(!Array.isArray(t.initializer))throw TypeError(".onnx.GraphProto.initializer: array expected");for(e.initializer=[],n=0;n<t.initializer.length;++n){if("object"!=typeof t.initializer[n])throw TypeError(".onnx.GraphProto.initializer: object expected");e.initializer[n]=l.onnx.TensorProto.fromObject(t.initializer[n])}}if(null!=t.docString&&(e.docString=String(t.docString)),t.input){if(!Array.isArray(t.input))throw TypeError(".onnx.GraphProto.input: array expected");for(e.input=[],n=0;n<t.input.length;++n){if("object"!=typeof t.input[n])throw TypeError(".onnx.GraphProto.input: object expected");e.input[n]=l.onnx.ValueInfoProto.fromObject(t.input[n])}}if(t.output){if(!Array.isArray(t.output))throw TypeError(".onnx.GraphProto.output: array expected");for(e.output=[],n=0;n<t.output.length;++n){if("object"!=typeof t.output[n])throw TypeError(".onnx.GraphProto.output: object expected");e.output[n]=l.onnx.ValueInfoProto.fromObject(t.output[n])}}if(t.valueInfo){if(!Array.isArray(t.valueInfo))throw TypeError(".onnx.GraphProto.valueInfo: array expected");for(e.valueInfo=[],n=0;n<t.valueInfo.length;++n){if("object"!=typeof t.valueInfo[n])throw TypeError(".onnx.GraphProto.valueInfo: object expected");e.valueInfo[n]=l.onnx.ValueInfoProto.fromObject(t.valueInfo[n])}}if(t.quantizationAnnotation){if(!Array.isArray(t.quantizationAnnotation))throw TypeError(".onnx.GraphProto.quantizationAnnotation: array expected");for(e.quantizationAnnotation=[],n=0;n<t.quantizationAnnotation.length;++n){if("object"!=typeof t.quantizationAnnotation[n])throw TypeError(".onnx.GraphProto.quantizationAnnotation: object expected");e.quantizationAnnotation[n]=l.onnx.TensorAnnotation.fromObject(t.quantizationAnnotation[n])}}return e},t.toObject=function(t,e){e||(e={});var n={};if((e.arrays||e.defaults)&&(n.node=[],n.initializer=[],n.input=[],n.output=[],n.valueInfo=[],n.quantizationAnnotation=[]),e.defaults&&(n.name="",n.docString=""),t.node&&t.node.length){n.node=[];for(var r=0;r<t.node.length;++r)n.node[r]=l.onnx.NodeProto.toObject(t.node[r],e)}if(null!=t.name&&t.hasOwnProperty("name")&&(n.name=t.name),t.initializer&&t.initializer.length)for(n.initializer=[],r=0;r<t.initializer.length;++r)n.initializer[r]=l.onnx.TensorProto.toObject(t.initializer[r],e);if(null!=t.docString&&t.hasOwnProperty("docString")&&(n.docString=t.docString),t.input&&t.input.length)for(n.input=[],r=0;r<t.input.length;++r)n.input[r]=l.onnx.ValueInfoProto.toObject(t.input[r],e);if(t.output&&t.output.length)for(n.output=[],r=0;r<t.output.length;++r)n.output[r]=l.onnx.ValueInfoProto.toObject(t.output[r],e);if(t.valueInfo&&t.valueInfo.length)for(n.valueInfo=[],r=0;r<t.valueInfo.length;++r)n.valueInfo[r]=l.onnx.ValueInfoProto.toObject(t.valueInfo[r],e);if(t.quantizationAnnotation&&t.quantizationAnnotation.length)for(n.quantizationAnnotation=[],r=0;r<t.quantizationAnnotation.length;++r)n.quantizationAnnotation[r]=l.onnx.TensorAnnotation.toObject(t.quantizationAnnotation[r],e);return n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t}(),o.TensorProto=function(){function t(t){if(this.dims=[],this.floatData=[],this.int32Data=[],this.stringData=[],this.int64Data=[],this.externalData=[],this.doubleData=[],this.uint64Data=[],t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.dims=c.emptyArray,t.prototype.dataType=0,t.prototype.segment=null,t.prototype.floatData=c.emptyArray,t.prototype.int32Data=c.emptyArray,t.prototype.stringData=c.emptyArray,t.prototype.int64Data=c.emptyArray,t.prototype.name="",t.prototype.docString="",t.prototype.rawData=c.newBuffer([]),t.prototype.externalData=c.emptyArray,t.prototype.dataLocation=0,t.prototype.doubleData=c.emptyArray,t.prototype.uint64Data=c.emptyArray,t.create=function(e){return new t(e)},t.encode=function(t,e){if(e||(e=u.create()),null!=t.dims&&t.dims.length){e.uint32(10).fork();for(var n=0;n<t.dims.length;++n)e.int64(t.dims[n]);e.ldelim()}if(null!=t.dataType&&t.hasOwnProperty("dataType")&&e.uint32(16).int32(t.dataType),null!=t.segment&&t.hasOwnProperty("segment")&&l.onnx.TensorProto.Segment.encode(t.segment,e.uint32(26).fork()).ldelim(),null!=t.floatData&&t.floatData.length){for(e.uint32(34).fork(),n=0;n<t.floatData.length;++n)e.float(t.floatData[n]);e.ldelim()}if(null!=t.int32Data&&t.int32Data.length){for(e.uint32(42).fork(),n=0;n<t.int32Data.length;++n)e.int32(t.int32Data[n]);e.ldelim()}if(null!=t.stringData&&t.stringData.length)for(n=0;n<t.stringData.length;++n)e.uint32(50).bytes(t.stringData[n]);if(null!=t.int64Data&&t.int64Data.length){for(e.uint32(58).fork(),n=0;n<t.int64Data.length;++n)e.int64(t.int64Data[n]);e.ldelim()}if(null!=t.name&&t.hasOwnProperty("name")&&e.uint32(66).string(t.name),null!=t.rawData&&t.hasOwnProperty("rawData")&&e.uint32(74).bytes(t.rawData),null!=t.doubleData&&t.doubleData.length){for(e.uint32(82).fork(),n=0;n<t.doubleData.length;++n)e.double(t.doubleData[n]);e.ldelim()}if(null!=t.uint64Data&&t.uint64Data.length){for(e.uint32(90).fork(),n=0;n<t.uint64Data.length;++n)e.uint64(t.uint64Data[n]);e.ldelim()}if(null!=t.docString&&t.hasOwnProperty("docString")&&e.uint32(98).string(t.docString),null!=t.externalData&&t.externalData.length)for(n=0;n<t.externalData.length;++n)l.onnx.StringStringEntryProto.encode(t.externalData[n],e.uint32(106).fork()).ldelim();return null!=t.dataLocation&&t.hasOwnProperty("dataLocation")&&e.uint32(112).int32(t.dataLocation),e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.TensorProto;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:if(r.dims&&r.dims.length||(r.dims=[]),2==(7&i))for(var o=t.uint32()+t.pos;t.pos<o;)r.dims.push(t.int64());else r.dims.push(t.int64());break;case 2:r.dataType=t.int32();break;case 3:r.segment=l.onnx.TensorProto.Segment.decode(t,t.uint32());break;case 4:if(r.floatData&&r.floatData.length||(r.floatData=[]),2==(7&i))for(o=t.uint32()+t.pos;t.pos<o;)r.floatData.push(t.float());else r.floatData.push(t.float());break;case 5:if(r.int32Data&&r.int32Data.length||(r.int32Data=[]),2==(7&i))for(o=t.uint32()+t.pos;t.pos<o;)r.int32Data.push(t.int32());else r.int32Data.push(t.int32());break;case 6:r.stringData&&r.stringData.length||(r.stringData=[]),r.stringData.push(t.bytes());break;case 7:if(r.int64Data&&r.int64Data.length||(r.int64Data=[]),2==(7&i))for(o=t.uint32()+t.pos;t.pos<o;)r.int64Data.push(t.int64());else r.int64Data.push(t.int64());break;case 8:r.name=t.string();break;case 12:r.docString=t.string();break;case 9:r.rawData=t.bytes();break;case 13:r.externalData&&r.externalData.length||(r.externalData=[]),r.externalData.push(l.onnx.StringStringEntryProto.decode(t,t.uint32()));break;case 14:r.dataLocation=t.int32();break;case 10:if(r.doubleData&&r.doubleData.length||(r.doubleData=[]),2==(7&i))for(o=t.uint32()+t.pos;t.pos<o;)r.doubleData.push(t.double());else r.doubleData.push(t.double());break;case 11:if(r.uint64Data&&r.uint64Data.length||(r.uint64Data=[]),2==(7&i))for(o=t.uint32()+t.pos;t.pos<o;)r.uint64Data.push(t.uint64());else r.uint64Data.push(t.uint64());break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){if("object"!=typeof t||null===t)return"object expected";if(null!=t.dims&&t.hasOwnProperty("dims")){if(!Array.isArray(t.dims))return"dims: array expected";for(var e=0;e<t.dims.length;++e)if(!(c.isInteger(t.dims[e])||t.dims[e]&&c.isInteger(t.dims[e].low)&&c.isInteger(t.dims[e].high)))return"dims: integer|Long[] expected"}if(null!=t.dataType&&t.hasOwnProperty("dataType")&&!c.isInteger(t.dataType))return"dataType: integer expected";if(null!=t.segment&&t.hasOwnProperty("segment")&&(n=l.onnx.TensorProto.Segment.verify(t.segment)))return"segment."+n;if(null!=t.floatData&&t.hasOwnProperty("floatData")){if(!Array.isArray(t.floatData))return"floatData: array expected";for(e=0;e<t.floatData.length;++e)if("number"!=typeof t.floatData[e])return"floatData: number[] expected"}if(null!=t.int32Data&&t.hasOwnProperty("int32Data")){if(!Array.isArray(t.int32Data))return"int32Data: array expected";for(e=0;e<t.int32Data.length;++e)if(!c.isInteger(t.int32Data[e]))return"int32Data: integer[] expected"}if(null!=t.stringData&&t.hasOwnProperty("stringData")){if(!Array.isArray(t.stringData))return"stringData: array expected";for(e=0;e<t.stringData.length;++e)if(!(t.stringData[e]&&"number"==typeof t.stringData[e].length||c.isString(t.stringData[e])))return"stringData: buffer[] expected"}if(null!=t.int64Data&&t.hasOwnProperty("int64Data")){if(!Array.isArray(t.int64Data))return"int64Data: array expected";for(e=0;e<t.int64Data.length;++e)if(!(c.isInteger(t.int64Data[e])||t.int64Data[e]&&c.isInteger(t.int64Data[e].low)&&c.isInteger(t.int64Data[e].high)))return"int64Data: integer|Long[] expected"}if(null!=t.name&&t.hasOwnProperty("name")&&!c.isString(t.name))return"name: string expected";if(null!=t.docString&&t.hasOwnProperty("docString")&&!c.isString(t.docString))return"docString: string expected";if(null!=t.rawData&&t.hasOwnProperty("rawData")&&!(t.rawData&&"number"==typeof t.rawData.length||c.isString(t.rawData)))return"rawData: buffer expected";if(null!=t.externalData&&t.hasOwnProperty("externalData")){if(!Array.isArray(t.externalData))return"externalData: array expected";for(e=0;e<t.externalData.length;++e){var n;if(n=l.onnx.StringStringEntryProto.verify(t.externalData[e]))return"externalData."+n}}if(null!=t.dataLocation&&t.hasOwnProperty("dataLocation"))switch(t.dataLocation){default:return"dataLocation: enum value expected";case 0:case 1:}if(null!=t.doubleData&&t.hasOwnProperty("doubleData")){if(!Array.isArray(t.doubleData))return"doubleData: array expected";for(e=0;e<t.doubleData.length;++e)if("number"!=typeof t.doubleData[e])return"doubleData: number[] expected"}if(null!=t.uint64Data&&t.hasOwnProperty("uint64Data")){if(!Array.isArray(t.uint64Data))return"uint64Data: array expected";for(e=0;e<t.uint64Data.length;++e)if(!(c.isInteger(t.uint64Data[e])||t.uint64Data[e]&&c.isInteger(t.uint64Data[e].low)&&c.isInteger(t.uint64Data[e].high)))return"uint64Data: integer|Long[] expected"}return null},t.fromObject=function(t){if(t instanceof l.onnx.TensorProto)return t;var e=new l.onnx.TensorProto;if(t.dims){if(!Array.isArray(t.dims))throw TypeError(".onnx.TensorProto.dims: array expected");e.dims=[];for(var n=0;n<t.dims.length;++n)c.Long?(e.dims[n]=c.Long.fromValue(t.dims[n])).unsigned=!1:"string"==typeof t.dims[n]?e.dims[n]=parseInt(t.dims[n],10):"number"==typeof t.dims[n]?e.dims[n]=t.dims[n]:"object"==typeof t.dims[n]&&(e.dims[n]=new c.LongBits(t.dims[n].low>>>0,t.dims[n].high>>>0).toNumber())}if(null!=t.dataType&&(e.dataType=0|t.dataType),null!=t.segment){if("object"!=typeof t.segment)throw TypeError(".onnx.TensorProto.segment: object expected");e.segment=l.onnx.TensorProto.Segment.fromObject(t.segment)}if(t.floatData){if(!Array.isArray(t.floatData))throw TypeError(".onnx.TensorProto.floatData: array expected");for(e.floatData=[],n=0;n<t.floatData.length;++n)e.floatData[n]=Number(t.floatData[n])}if(t.int32Data){if(!Array.isArray(t.int32Data))throw TypeError(".onnx.TensorProto.int32Data: array expected");for(e.int32Data=[],n=0;n<t.int32Data.length;++n)e.int32Data[n]=0|t.int32Data[n]}if(t.stringData){if(!Array.isArray(t.stringData))throw TypeError(".onnx.TensorProto.stringData: array expected");for(e.stringData=[],n=0;n<t.stringData.length;++n)"string"==typeof t.stringData[n]?c.base64.decode(t.stringData[n],e.stringData[n]=c.newBuffer(c.base64.length(t.stringData[n])),0):t.stringData[n].length&&(e.stringData[n]=t.stringData[n])}if(t.int64Data){if(!Array.isArray(t.int64Data))throw TypeError(".onnx.TensorProto.int64Data: array expected");for(e.int64Data=[],n=0;n<t.int64Data.length;++n)c.Long?(e.int64Data[n]=c.Long.fromValue(t.int64Data[n])).unsigned=!1:"string"==typeof t.int64Data[n]?e.int64Data[n]=parseInt(t.int64Data[n],10):"number"==typeof t.int64Data[n]?e.int64Data[n]=t.int64Data[n]:"object"==typeof t.int64Data[n]&&(e.int64Data[n]=new c.LongBits(t.int64Data[n].low>>>0,t.int64Data[n].high>>>0).toNumber())}if(null!=t.name&&(e.name=String(t.name)),null!=t.docString&&(e.docString=String(t.docString)),null!=t.rawData&&("string"==typeof t.rawData?c.base64.decode(t.rawData,e.rawData=c.newBuffer(c.base64.length(t.rawData)),0):t.rawData.length&&(e.rawData=t.rawData)),t.externalData){if(!Array.isArray(t.externalData))throw TypeError(".onnx.TensorProto.externalData: array expected");for(e.externalData=[],n=0;n<t.externalData.length;++n){if("object"!=typeof t.externalData[n])throw TypeError(".onnx.TensorProto.externalData: object expected");e.externalData[n]=l.onnx.StringStringEntryProto.fromObject(t.externalData[n])}}switch(t.dataLocation){case"DEFAULT":case 0:e.dataLocation=0;break;case"EXTERNAL":case 1:e.dataLocation=1}if(t.doubleData){if(!Array.isArray(t.doubleData))throw TypeError(".onnx.TensorProto.doubleData: array expected");for(e.doubleData=[],n=0;n<t.doubleData.length;++n)e.doubleData[n]=Number(t.doubleData[n])}if(t.uint64Data){if(!Array.isArray(t.uint64Data))throw TypeError(".onnx.TensorProto.uint64Data: array expected");for(e.uint64Data=[],n=0;n<t.uint64Data.length;++n)c.Long?(e.uint64Data[n]=c.Long.fromValue(t.uint64Data[n])).unsigned=!0:"string"==typeof t.uint64Data[n]?e.uint64Data[n]=parseInt(t.uint64Data[n],10):"number"==typeof t.uint64Data[n]?e.uint64Data[n]=t.uint64Data[n]:"object"==typeof t.uint64Data[n]&&(e.uint64Data[n]=new c.LongBits(t.uint64Data[n].low>>>0,t.uint64Data[n].high>>>0).toNumber(!0))}return e},t.toObject=function(t,e){e||(e={});var n={};if((e.arrays||e.defaults)&&(n.dims=[],n.floatData=[],n.int32Data=[],n.stringData=[],n.int64Data=[],n.doubleData=[],n.uint64Data=[],n.externalData=[]),e.defaults&&(n.dataType=0,n.segment=null,n.name="",e.bytes===String?n.rawData="":(n.rawData=[],e.bytes!==Array&&(n.rawData=c.newBuffer(n.rawData))),n.docString="",n.dataLocation=e.enums===String?"DEFAULT":0),t.dims&&t.dims.length){n.dims=[];for(var r=0;r<t.dims.length;++r)"number"==typeof t.dims[r]?n.dims[r]=e.longs===String?String(t.dims[r]):t.dims[r]:n.dims[r]=e.longs===String?c.Long.prototype.toString.call(t.dims[r]):e.longs===Number?new c.LongBits(t.dims[r].low>>>0,t.dims[r].high>>>0).toNumber():t.dims[r]}if(null!=t.dataType&&t.hasOwnProperty("dataType")&&(n.dataType=t.dataType),null!=t.segment&&t.hasOwnProperty("segment")&&(n.segment=l.onnx.TensorProto.Segment.toObject(t.segment,e)),t.floatData&&t.floatData.length)for(n.floatData=[],r=0;r<t.floatData.length;++r)n.floatData[r]=e.json&&!isFinite(t.floatData[r])?String(t.floatData[r]):t.floatData[r];if(t.int32Data&&t.int32Data.length)for(n.int32Data=[],r=0;r<t.int32Data.length;++r)n.int32Data[r]=t.int32Data[r];if(t.stringData&&t.stringData.length)for(n.stringData=[],r=0;r<t.stringData.length;++r)n.stringData[r]=e.bytes===String?c.base64.encode(t.stringData[r],0,t.stringData[r].length):e.bytes===Array?Array.prototype.slice.call(t.stringData[r]):t.stringData[r];if(t.int64Data&&t.int64Data.length)for(n.int64Data=[],r=0;r<t.int64Data.length;++r)"number"==typeof t.int64Data[r]?n.int64Data[r]=e.longs===String?String(t.int64Data[r]):t.int64Data[r]:n.int64Data[r]=e.longs===String?c.Long.prototype.toString.call(t.int64Data[r]):e.longs===Number?new c.LongBits(t.int64Data[r].low>>>0,t.int64Data[r].high>>>0).toNumber():t.int64Data[r];if(null!=t.name&&t.hasOwnProperty("name")&&(n.name=t.name),null!=t.rawData&&t.hasOwnProperty("rawData")&&(n.rawData=e.bytes===String?c.base64.encode(t.rawData,0,t.rawData.length):e.bytes===Array?Array.prototype.slice.call(t.rawData):t.rawData),t.doubleData&&t.doubleData.length)for(n.doubleData=[],r=0;r<t.doubleData.length;++r)n.doubleData[r]=e.json&&!isFinite(t.doubleData[r])?String(t.doubleData[r]):t.doubleData[r];if(t.uint64Data&&t.uint64Data.length)for(n.uint64Data=[],r=0;r<t.uint64Data.length;++r)"number"==typeof t.uint64Data[r]?n.uint64Data[r]=e.longs===String?String(t.uint64Data[r]):t.uint64Data[r]:n.uint64Data[r]=e.longs===String?c.Long.prototype.toString.call(t.uint64Data[r]):e.longs===Number?new c.LongBits(t.uint64Data[r].low>>>0,t.uint64Data[r].high>>>0).toNumber(!0):t.uint64Data[r];if(null!=t.docString&&t.hasOwnProperty("docString")&&(n.docString=t.docString),t.externalData&&t.externalData.length)for(n.externalData=[],r=0;r<t.externalData.length;++r)n.externalData[r]=l.onnx.StringStringEntryProto.toObject(t.externalData[r],e);return null!=t.dataLocation&&t.hasOwnProperty("dataLocation")&&(n.dataLocation=e.enums===String?l.onnx.TensorProto.DataLocation[t.dataLocation]:t.dataLocation),n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t.DataType=function(){var t={},e=Object.create(t);return e[t[0]="UNDEFINED"]=0,e[t[1]="FLOAT"]=1,e[t[2]="UINT8"]=2,e[t[3]="INT8"]=3,e[t[4]="UINT16"]=4,e[t[5]="INT16"]=5,e[t[6]="INT32"]=6,e[t[7]="INT64"]=7,e[t[8]="STRING"]=8,e[t[9]="BOOL"]=9,e[t[10]="FLOAT16"]=10,e[t[11]="DOUBLE"]=11,e[t[12]="UINT32"]=12,e[t[13]="UINT64"]=13,e[t[14]="COMPLEX64"]=14,e[t[15]="COMPLEX128"]=15,e[t[16]="BFLOAT16"]=16,e}(),t.Segment=function(){function t(t){if(t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.begin=c.Long?c.Long.fromBits(0,0,!1):0,t.prototype.end=c.Long?c.Long.fromBits(0,0,!1):0,t.create=function(e){return new t(e)},t.encode=function(t,e){return e||(e=u.create()),null!=t.begin&&t.hasOwnProperty("begin")&&e.uint32(8).int64(t.begin),null!=t.end&&t.hasOwnProperty("end")&&e.uint32(16).int64(t.end),e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.TensorProto.Segment;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.begin=t.int64();break;case 2:r.end=t.int64();break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){return"object"!=typeof t||null===t?"object expected":null!=t.begin&&t.hasOwnProperty("begin")&&!(c.isInteger(t.begin)||t.begin&&c.isInteger(t.begin.low)&&c.isInteger(t.begin.high))?"begin: integer|Long expected":null!=t.end&&t.hasOwnProperty("end")&&!(c.isInteger(t.end)||t.end&&c.isInteger(t.end.low)&&c.isInteger(t.end.high))?"end: integer|Long expected":null},t.fromObject=function(t){if(t instanceof l.onnx.TensorProto.Segment)return t;var e=new l.onnx.TensorProto.Segment;return null!=t.begin&&(c.Long?(e.begin=c.Long.fromValue(t.begin)).unsigned=!1:"string"==typeof t.begin?e.begin=parseInt(t.begin,10):"number"==typeof t.begin?e.begin=t.begin:"object"==typeof t.begin&&(e.begin=new c.LongBits(t.begin.low>>>0,t.begin.high>>>0).toNumber())),null!=t.end&&(c.Long?(e.end=c.Long.fromValue(t.end)).unsigned=!1:"string"==typeof t.end?e.end=parseInt(t.end,10):"number"==typeof t.end?e.end=t.end:"object"==typeof t.end&&(e.end=new c.LongBits(t.end.low>>>0,t.end.high>>>0).toNumber())),e},t.toObject=function(t,e){e||(e={});var n={};if(e.defaults){if(c.Long){var r=new c.Long(0,0,!1);n.begin=e.longs===String?r.toString():e.longs===Number?r.toNumber():r}else n.begin=e.longs===String?"0":0;c.Long?(r=new c.Long(0,0,!1),n.end=e.longs===String?r.toString():e.longs===Number?r.toNumber():r):n.end=e.longs===String?"0":0}return null!=t.begin&&t.hasOwnProperty("begin")&&("number"==typeof t.begin?n.begin=e.longs===String?String(t.begin):t.begin:n.begin=e.longs===String?c.Long.prototype.toString.call(t.begin):e.longs===Number?new c.LongBits(t.begin.low>>>0,t.begin.high>>>0).toNumber():t.begin),null!=t.end&&t.hasOwnProperty("end")&&("number"==typeof t.end?n.end=e.longs===String?String(t.end):t.end:n.end=e.longs===String?c.Long.prototype.toString.call(t.end):e.longs===Number?new c.LongBits(t.end.low>>>0,t.end.high>>>0).toNumber():t.end),n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t}(),t.DataLocation=function(){var t={},e=Object.create(t);return e[t[0]="DEFAULT"]=0,e[t[1]="EXTERNAL"]=1,e}(),t}(),o.TensorShapeProto=function(){function t(t){if(this.dim=[],t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.dim=c.emptyArray,t.create=function(e){return new t(e)},t.encode=function(t,e){if(e||(e=u.create()),null!=t.dim&&t.dim.length)for(var n=0;n<t.dim.length;++n)l.onnx.TensorShapeProto.Dimension.encode(t.dim[n],e.uint32(10).fork()).ldelim();return e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.TensorShapeProto;t.pos<n;){var i=t.uint32();i>>>3==1?(r.dim&&r.dim.length||(r.dim=[]),r.dim.push(l.onnx.TensorShapeProto.Dimension.decode(t,t.uint32()))):t.skipType(7&i)}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){if("object"!=typeof t||null===t)return"object expected";if(null!=t.dim&&t.hasOwnProperty("dim")){if(!Array.isArray(t.dim))return"dim: array expected";for(var e=0;e<t.dim.length;++e){var n=l.onnx.TensorShapeProto.Dimension.verify(t.dim[e]);if(n)return"dim."+n}}return null},t.fromObject=function(t){if(t instanceof l.onnx.TensorShapeProto)return t;var e=new l.onnx.TensorShapeProto;if(t.dim){if(!Array.isArray(t.dim))throw TypeError(".onnx.TensorShapeProto.dim: array expected");e.dim=[];for(var n=0;n<t.dim.length;++n){if("object"!=typeof t.dim[n])throw TypeError(".onnx.TensorShapeProto.dim: object expected");e.dim[n]=l.onnx.TensorShapeProto.Dimension.fromObject(t.dim[n])}}return e},t.toObject=function(t,e){e||(e={});var n={};if((e.arrays||e.defaults)&&(n.dim=[]),t.dim&&t.dim.length){n.dim=[];for(var r=0;r<t.dim.length;++r)n.dim[r]=l.onnx.TensorShapeProto.Dimension.toObject(t.dim[r],e)}return n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t.Dimension=function(){function t(t){if(t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}var e;return t.prototype.dimValue=c.Long?c.Long.fromBits(0,0,!1):0,t.prototype.dimParam="",t.prototype.denotation="",Object.defineProperty(t.prototype,"value",{get:c.oneOfGetter(e=["dimValue","dimParam"]),set:c.oneOfSetter(e)}),t.create=function(e){return new t(e)},t.encode=function(t,e){return e||(e=u.create()),null!=t.dimValue&&t.hasOwnProperty("dimValue")&&e.uint32(8).int64(t.dimValue),null!=t.dimParam&&t.hasOwnProperty("dimParam")&&e.uint32(18).string(t.dimParam),null!=t.denotation&&t.hasOwnProperty("denotation")&&e.uint32(26).string(t.denotation),e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.TensorShapeProto.Dimension;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.dimValue=t.int64();break;case 2:r.dimParam=t.string();break;case 3:r.denotation=t.string();break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){if("object"!=typeof t||null===t)return"object expected";var e={};if(null!=t.dimValue&&t.hasOwnProperty("dimValue")&&(e.value=1,!(c.isInteger(t.dimValue)||t.dimValue&&c.isInteger(t.dimValue.low)&&c.isInteger(t.dimValue.high))))return"dimValue: integer|Long expected";if(null!=t.dimParam&&t.hasOwnProperty("dimParam")){if(1===e.value)return"value: multiple values";if(e.value=1,!c.isString(t.dimParam))return"dimParam: string expected"}return null!=t.denotation&&t.hasOwnProperty("denotation")&&!c.isString(t.denotation)?"denotation: string expected":null},t.fromObject=function(t){if(t instanceof l.onnx.TensorShapeProto.Dimension)return t;var e=new l.onnx.TensorShapeProto.Dimension;return null!=t.dimValue&&(c.Long?(e.dimValue=c.Long.fromValue(t.dimValue)).unsigned=!1:"string"==typeof t.dimValue?e.dimValue=parseInt(t.dimValue,10):"number"==typeof t.dimValue?e.dimValue=t.dimValue:"object"==typeof t.dimValue&&(e.dimValue=new c.LongBits(t.dimValue.low>>>0,t.dimValue.high>>>0).toNumber())),null!=t.dimParam&&(e.dimParam=String(t.dimParam)),null!=t.denotation&&(e.denotation=String(t.denotation)),e},t.toObject=function(t,e){e||(e={});var n={};return e.defaults&&(n.denotation=""),null!=t.dimValue&&t.hasOwnProperty("dimValue")&&("number"==typeof t.dimValue?n.dimValue=e.longs===String?String(t.dimValue):t.dimValue:n.dimValue=e.longs===String?c.Long.prototype.toString.call(t.dimValue):e.longs===Number?new c.LongBits(t.dimValue.low>>>0,t.dimValue.high>>>0).toNumber():t.dimValue,e.oneofs&&(n.value="dimValue")),null!=t.dimParam&&t.hasOwnProperty("dimParam")&&(n.dimParam=t.dimParam,e.oneofs&&(n.value="dimParam")),null!=t.denotation&&t.hasOwnProperty("denotation")&&(n.denotation=t.denotation),n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t}(),t}(),o.TypeProto=function(){function t(t){if(t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}var e;return t.prototype.tensorType=null,t.prototype.denotation="",Object.defineProperty(t.prototype,"value",{get:c.oneOfGetter(e=["tensorType"]),set:c.oneOfSetter(e)}),t.create=function(e){return new t(e)},t.encode=function(t,e){return e||(e=u.create()),null!=t.tensorType&&t.hasOwnProperty("tensorType")&&l.onnx.TypeProto.Tensor.encode(t.tensorType,e.uint32(10).fork()).ldelim(),null!=t.denotation&&t.hasOwnProperty("denotation")&&e.uint32(50).string(t.denotation),e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.TypeProto;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.tensorType=l.onnx.TypeProto.Tensor.decode(t,t.uint32());break;case 6:r.denotation=t.string();break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){if("object"!=typeof t||null===t)return"object expected";if(null!=t.tensorType&&t.hasOwnProperty("tensorType")){var e=l.onnx.TypeProto.Tensor.verify(t.tensorType);if(e)return"tensorType."+e}return null!=t.denotation&&t.hasOwnProperty("denotation")&&!c.isString(t.denotation)?"denotation: string expected":null},t.fromObject=function(t){if(t instanceof l.onnx.TypeProto)return t;var e=new l.onnx.TypeProto;if(null!=t.tensorType){if("object"!=typeof t.tensorType)throw TypeError(".onnx.TypeProto.tensorType: object expected");e.tensorType=l.onnx.TypeProto.Tensor.fromObject(t.tensorType)}return null!=t.denotation&&(e.denotation=String(t.denotation)),e},t.toObject=function(t,e){e||(e={});var n={};return e.defaults&&(n.denotation=""),null!=t.tensorType&&t.hasOwnProperty("tensorType")&&(n.tensorType=l.onnx.TypeProto.Tensor.toObject(t.tensorType,e),e.oneofs&&(n.value="tensorType")),null!=t.denotation&&t.hasOwnProperty("denotation")&&(n.denotation=t.denotation),n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t.Tensor=function(){function t(t){if(t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.elemType=0,t.prototype.shape=null,t.create=function(e){return new t(e)},t.encode=function(t,e){return e||(e=u.create()),null!=t.elemType&&t.hasOwnProperty("elemType")&&e.uint32(8).int32(t.elemType),null!=t.shape&&t.hasOwnProperty("shape")&&l.onnx.TensorShapeProto.encode(t.shape,e.uint32(18).fork()).ldelim(),e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.TypeProto.Tensor;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.elemType=t.int32();break;case 2:r.shape=l.onnx.TensorShapeProto.decode(t,t.uint32());break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){if("object"!=typeof t||null===t)return"object expected";if(null!=t.elemType&&t.hasOwnProperty("elemType")&&!c.isInteger(t.elemType))return"elemType: integer expected";if(null!=t.shape&&t.hasOwnProperty("shape")){var e=l.onnx.TensorShapeProto.verify(t.shape);if(e)return"shape."+e}return null},t.fromObject=function(t){if(t instanceof l.onnx.TypeProto.Tensor)return t;var e=new l.onnx.TypeProto.Tensor;if(null!=t.elemType&&(e.elemType=0|t.elemType),null!=t.shape){if("object"!=typeof t.shape)throw TypeError(".onnx.TypeProto.Tensor.shape: object expected");e.shape=l.onnx.TensorShapeProto.fromObject(t.shape)}return e},t.toObject=function(t,e){e||(e={});var n={};return e.defaults&&(n.elemType=0,n.shape=null),null!=t.elemType&&t.hasOwnProperty("elemType")&&(n.elemType=t.elemType),null!=t.shape&&t.hasOwnProperty("shape")&&(n.shape=l.onnx.TensorShapeProto.toObject(t.shape,e)),n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t}(),t}(),o.OperatorSetIdProto=function(){function t(t){if(t)for(var e=Object.keys(t),n=0;n<e.length;++n)null!=t[e[n]]&&(this[e[n]]=t[e[n]])}return t.prototype.domain="",t.prototype.version=c.Long?c.Long.fromBits(0,0,!1):0,t.create=function(e){return new t(e)},t.encode=function(t,e){return e||(e=u.create()),null!=t.domain&&t.hasOwnProperty("domain")&&e.uint32(10).string(t.domain),null!=t.version&&t.hasOwnProperty("version")&&e.uint32(16).int64(t.version),e},t.encodeDelimited=function(t,e){return this.encode(t,e).ldelim()},t.decode=function(t,e){t instanceof s||(t=s.create(t));for(var n=void 0===e?t.len:t.pos+e,r=new l.onnx.OperatorSetIdProto;t.pos<n;){var i=t.uint32();switch(i>>>3){case 1:r.domain=t.string();break;case 2:r.version=t.int64();break;default:t.skipType(7&i)}}return r},t.decodeDelimited=function(t){return t instanceof s||(t=new s(t)),this.decode(t,t.uint32())},t.verify=function(t){return"object"!=typeof t||null===t?"object expected":null!=t.domain&&t.hasOwnProperty("domain")&&!c.isString(t.domain)?"domain: string expected":null!=t.version&&t.hasOwnProperty("version")&&!(c.isInteger(t.version)||t.version&&c.isInteger(t.version.low)&&c.isInteger(t.version.high))?"version: integer|Long expected":null},t.fromObject=function(t){if(t instanceof l.onnx.OperatorSetIdProto)return t;var e=new l.onnx.OperatorSetIdProto;return null!=t.domain&&(e.domain=String(t.domain)),null!=t.version&&(c.Long?(e.version=c.Long.fromValue(t.version)).unsigned=!1:"string"==typeof t.version?e.version=parseInt(t.version,10):"number"==typeof t.version?e.version=t.version:"object"==typeof t.version&&(e.version=new c.LongBits(t.version.low>>>0,t.version.high>>>0).toNumber())),e},t.toObject=function(t,e){e||(e={});var n={};if(e.defaults)if(n.domain="",c.Long){var r=new c.Long(0,0,!1);n.version=e.longs===String?r.toString():e.longs===Number?r.toNumber():r}else n.version=e.longs===String?"0":0;return null!=t.domain&&t.hasOwnProperty("domain")&&(n.domain=t.domain),null!=t.version&&t.hasOwnProperty("version")&&("number"==typeof t.version?n.version=e.longs===String?String(t.version):t.version:n.version=e.longs===String?c.Long.prototype.toString.call(t.version):e.longs===Number?new c.LongBits(t.version.low>>>0,t.version.high>>>0).toNumber():t.version),n},t.prototype.toJSON=function(){return this.constructor.toObject(this,a.util.toJSONOptions)},t}(),o),t.exports=l},2100:(t,e,n)=>{"use strict";t.exports=n(9482)},9482:(t,e,n)=>{"use strict";var r=e;function i(){r.util._configure(),r.Writer._configure(r.BufferWriter),r.Reader._configure(r.BufferReader)}r.build="minimal",r.Writer=n(1173),r.BufferWriter=n(3155),r.Reader=n(1408),r.BufferReader=n(593),r.util=n(9693),r.rpc=n(5994),r.roots=n(5054),r.configure=i,i()},1408:(t,e,n)=>{"use strict";t.exports=u;var r,i=n(9693),o=i.LongBits,a=i.utf8;function s(t,e){return RangeError("index out of range: "+t.pos+" + "+(e||1)+" > "+t.len)}function u(t){this.buf=t,this.pos=0,this.len=t.length}var c,l="undefined"!=typeof Uint8Array?function(t){if(t instanceof Uint8Array||Array.isArray(t))return new u(t);throw Error("illegal buffer")}:function(t){if(Array.isArray(t))return new u(t);throw Error("illegal buffer")},p=function(){return i.Buffer?function(t){return(u.create=function(t){return i.Buffer.isBuffer(t)?new r(t):l(t)})(t)}:l};function f(){var t=new o(0,0),e=0;if(!(this.len-this.pos>4)){for(;e<3;++e){if(this.pos>=this.len)throw s(this);if(t.lo=(t.lo|(127&this.buf[this.pos])<<7*e)>>>0,this.buf[this.pos++]<128)return t}return t.lo=(t.lo|(127&this.buf[this.pos++])<<7*e)>>>0,t}for(;e<4;++e)if(t.lo=(t.lo|(127&this.buf[this.pos])<<7*e)>>>0,this.buf[this.pos++]<128)return t;if(t.lo=(t.lo|(127&this.buf[this.pos])<<28)>>>0,t.hi=(t.hi|(127&this.buf[this.pos])>>4)>>>0,this.buf[this.pos++]<128)return t;if(e=0,this.len-this.pos>4){for(;e<5;++e)if(t.hi=(t.hi|(127&this.buf[this.pos])<<7*e+3)>>>0,this.buf[this.pos++]<128)return t}else for(;e<5;++e){if(this.pos>=this.len)throw s(this);if(t.hi=(t.hi|(127&this.buf[this.pos])<<7*e+3)>>>0,this.buf[this.pos++]<128)return t}throw Error("invalid varint encoding")}function d(t,e){return(t[e-4]|t[e-3]<<8|t[e-2]<<16|t[e-1]<<24)>>>0}function h(){if(this.pos+8>this.len)throw s(this,8);return new o(d(this.buf,this.pos+=4),d(this.buf,this.pos+=4))}u.create=p(),u.prototype._slice=i.Array.prototype.subarray||i.Array.prototype.slice,u.prototype.uint32=(c=4294967295,function(){if(c=(127&this.buf[this.pos])>>>0,this.buf[this.pos++]<128)return c;if(c=(c|(127&this.buf[this.pos])<<7)>>>0,this.buf[this.pos++]<128)return c;if(c=(c|(127&this.buf[this.pos])<<14)>>>0,this.buf[this.pos++]<128)return c;if(c=(c|(127&this.buf[this.pos])<<21)>>>0,this.buf[this.pos++]<128)return c;if(c=(c|(15&this.buf[this.pos])<<28)>>>0,this.buf[this.pos++]<128)return c;if((this.pos+=5)>this.len)throw this.pos=this.len,s(this,10);return c}),u.prototype.int32=function(){return 0|this.uint32()},u.prototype.sint32=function(){var t=this.uint32();return t>>>1^-(1&t)|0},u.prototype.bool=function(){return 0!==this.uint32()},u.prototype.fixed32=function(){if(this.pos+4>this.len)throw s(this,4);return d(this.buf,this.pos+=4)},u.prototype.sfixed32=function(){if(this.pos+4>this.len)throw s(this,4);return 0|d(this.buf,this.pos+=4)},u.prototype.float=function(){if(this.pos+4>this.len)throw s(this,4);var t=i.float.readFloatLE(this.buf,this.pos);return this.pos+=4,t},u.prototype.double=function(){if(this.pos+8>this.len)throw s(this,4);var t=i.float.readDoubleLE(this.buf,this.pos);return this.pos+=8,t},u.prototype.bytes=function(){var t=this.uint32(),e=this.pos,n=this.pos+t;if(n>this.len)throw s(this,t);return this.pos+=t,Array.isArray(this.buf)?this.buf.slice(e,n):e===n?new this.buf.constructor(0):this._slice.call(this.buf,e,n)},u.prototype.string=function(){var t=this.bytes();return a.read(t,0,t.length)},u.prototype.skip=function(t){if("number"==typeof t){if(this.pos+t>this.len)throw s(this,t);this.pos+=t}else do{if(this.pos>=this.len)throw s(this)}while(128&this.buf[this.pos++]);return this},u.prototype.skipType=function(t){switch(t){case 0:this.skip();break;case 1:this.skip(8);break;case 2:this.skip(this.uint32());break;case 3:for(;4!=(t=7&this.uint32());)this.skipType(t);break;case 5:this.skip(4);break;default:throw Error("invalid wire type "+t+" at offset "+this.pos)}return this},u._configure=function(t){r=t,u.create=p(),r._configure();var e=i.Long?"toLong":"toNumber";i.merge(u.prototype,{int64:function(){return f.call(this)[e](!1)},uint64:function(){return f.call(this)[e](!0)},sint64:function(){return f.call(this).zzDecode()[e](!1)},fixed64:function(){return h.call(this)[e](!0)},sfixed64:function(){return h.call(this)[e](!1)}})}},593:(t,e,n)=>{"use strict";t.exports=o;var r=n(1408);(o.prototype=Object.create(r.prototype)).constructor=o;var i=n(9693);function o(t){r.call(this,t)}o._configure=function(){i.Buffer&&(o.prototype._slice=i.Buffer.prototype.slice)},o.prototype.string=function(){var t=this.uint32();return this.buf.utf8Slice?this.buf.utf8Slice(this.pos,this.pos=Math.min(this.pos+t,this.len)):this.buf.toString("utf-8",this.pos,this.pos=Math.min(this.pos+t,this.len))},o._configure()},5054:t=>{"use strict";t.exports={}},5994:(t,e,n)=>{"use strict";e.Service=n(7948)},7948:(t,e,n)=>{"use strict";t.exports=i;var r=n(9693);function i(t,e,n){if("function"!=typeof t)throw TypeError("rpcImpl must be a function");r.EventEmitter.call(this),this.rpcImpl=t,this.requestDelimited=Boolean(e),this.responseDelimited=Boolean(n)}(i.prototype=Object.create(r.EventEmitter.prototype)).constructor=i,i.prototype.rpcCall=function t(e,n,i,o,a){if(!o)throw TypeError("request must be specified");var s=this;if(!a)return r.asPromise(t,s,e,n,i,o);if(s.rpcImpl)try{return s.rpcImpl(e,n[s.requestDelimited?"encodeDelimited":"encode"](o).finish(),(function(t,n){if(t)return s.emit("error",t,e),a(t);if(null!==n){if(!(n instanceof i))try{n=i[s.responseDelimited?"decodeDelimited":"decode"](n)}catch(t){return s.emit("error",t,e),a(t)}return s.emit("data",n,e),a(null,n)}s.end(!0)}))}catch(t){return s.emit("error",t,e),void setTimeout((function(){a(t)}),0)}else setTimeout((function(){a(Error("already ended"))}),0)},i.prototype.end=function(t){return this.rpcImpl&&(t||this.rpcImpl(null,null,null),this.rpcImpl=null,this.emit("end").off()),this}},1945:(t,e,n)=>{"use strict";t.exports=i;var r=n(9693);function i(t,e){this.lo=t>>>0,this.hi=e>>>0}var o=i.zero=new i(0,0);o.toNumber=function(){return 0},o.zzEncode=o.zzDecode=function(){return this},o.length=function(){return 1};var a=i.zeroHash="\0\0\0\0\0\0\0\0";i.fromNumber=function(t){if(0===t)return o;var e=t<0;e&&(t=-t);var n=t>>>0,r=(t-n)/4294967296>>>0;return e&&(r=~r>>>0,n=~n>>>0,++n>4294967295&&(n=0,++r>4294967295&&(r=0))),new i(n,r)},i.from=function(t){if("number"==typeof t)return i.fromNumber(t);if(r.isString(t)){if(!r.Long)return i.fromNumber(parseInt(t,10));t=r.Long.fromString(t)}return t.low||t.high?new i(t.low>>>0,t.high>>>0):o},i.prototype.toNumber=function(t){if(!t&&this.hi>>>31){var e=1+~this.lo>>>0,n=~this.hi>>>0;return e||(n=n+1>>>0),-(e+4294967296*n)}return this.lo+4294967296*this.hi},i.prototype.toLong=function(t){return r.Long?new r.Long(0|this.lo,0|this.hi,Boolean(t)):{low:0|this.lo,high:0|this.hi,unsigned:Boolean(t)}};var s=String.prototype.charCodeAt;i.fromHash=function(t){return t===a?o:new i((s.call(t,0)|s.call(t,1)<<8|s.call(t,2)<<16|s.call(t,3)<<24)>>>0,(s.call(t,4)|s.call(t,5)<<8|s.call(t,6)<<16|s.call(t,7)<<24)>>>0)},i.prototype.toHash=function(){return String.fromCharCode(255&this.lo,this.lo>>>8&255,this.lo>>>16&255,this.lo>>>24,255&this.hi,this.hi>>>8&255,this.hi>>>16&255,this.hi>>>24)},i.prototype.zzEncode=function(){var t=this.hi>>31;return this.hi=((this.hi<<1|this.lo>>>31)^t)>>>0,this.lo=(this.lo<<1^t)>>>0,this},i.prototype.zzDecode=function(){var t=-(1&this.lo);return this.lo=((this.lo>>>1|this.hi<<31)^t)>>>0,this.hi=(this.hi>>>1^t)>>>0,this},i.prototype.length=function(){var t=this.lo,e=(this.lo>>>28|this.hi<<4)>>>0,n=this.hi>>>24;return 0===n?0===e?t<16384?t<128?1:2:t<2097152?3:4:e<16384?e<128?5:6:e<2097152?7:8:n<128?9:10}},9693:function(t,e,n){"use strict";var r=e;function i(t,e,n){for(var r=Object.keys(e),i=0;i<r.length;++i)void 0!==t[r[i]]&&n||(t[r[i]]=e[r[i]]);return t}function o(t){function e(t,n){if(!(this instanceof e))return new e(t,n);Object.defineProperty(this,"message",{get:function(){return t}}),Error.captureStackTrace?Error.captureStackTrace(this,e):Object.defineProperty(this,"stack",{value:(new Error).stack||""}),n&&i(this,n)}return(e.prototype=Object.create(Error.prototype)).constructor=e,Object.defineProperty(e.prototype,"name",{get:function(){return t}}),e.prototype.toString=function(){return this.name+": "+this.message},e}r.asPromise=n(4537),r.base64=n(7419),r.EventEmitter=n(9211),r.float=n(945),r.inquire=n(7199),r.utf8=n(4997),r.pool=n(6662),r.LongBits=n(1945),r.isNode=Boolean(void 0!==n.g&&n.g&&n.g.process&&n.g.process.versions&&n.g.process.versions.node),r.global=r.isNode&&n.g||"undefined"!=typeof window&&window||"undefined"!=typeof self&&self||this,r.emptyArray=Object.freeze?Object.freeze([]):[],r.emptyObject=Object.freeze?Object.freeze({}):{},r.isInteger=Number.isInteger||function(t){return"number"==typeof t&&isFinite(t)&&Math.floor(t)===t},r.isString=function(t){return"string"==typeof t||t instanceof String},r.isObject=function(t){return t&&"object"==typeof t},r.isset=r.isSet=function(t,e){var n=t[e];return!(null==n||!t.hasOwnProperty(e))&&("object"!=typeof n||(Array.isArray(n)?n.length:Object.keys(n).length)>0)},r.Buffer=function(){try{var t=r.inquire("buffer").Buffer;return t.prototype.utf8Write?t:null}catch(t){return null}}(),r._Buffer_from=null,r._Buffer_allocUnsafe=null,r.newBuffer=function(t){return"number"==typeof t?r.Buffer?r._Buffer_allocUnsafe(t):new r.Array(t):r.Buffer?r._Buffer_from(t):"undefined"==typeof Uint8Array?t:new Uint8Array(t)},r.Array="undefined"!=typeof Uint8Array?Uint8Array:Array,r.Long=r.global.dcodeIO&&r.global.dcodeIO.Long||r.global.Long||r.inquire("long"),r.key2Re=/^true|false|0|1$/,r.key32Re=/^-?(?:0|[1-9][0-9]*)$/,r.key64Re=/^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/,r.longToHash=function(t){return t?r.LongBits.from(t).toHash():r.LongBits.zeroHash},r.longFromHash=function(t,e){var n=r.LongBits.fromHash(t);return r.Long?r.Long.fromBits(n.lo,n.hi,e):n.toNumber(Boolean(e))},r.merge=i,r.lcFirst=function(t){return t.charAt(0).toLowerCase()+t.substring(1)},r.newError=o,r.ProtocolError=o("ProtocolError"),r.oneOfGetter=function(t){for(var e={},n=0;n<t.length;++n)e[t[n]]=1;return function(){for(var t=Object.keys(this),n=t.length-1;n>-1;--n)if(1===e[t[n]]&&void 0!==this[t[n]]&&null!==this[t[n]])return t[n]}},r.oneOfSetter=function(t){return function(e){for(var n=0;n<t.length;++n)t[n]!==e&&delete this[t[n]]}},r.toJSONOptions={longs:String,enums:String,bytes:String,json:!0},r._configure=function(){var t=r.Buffer;t?(r._Buffer_from=t.from!==Uint8Array.from&&t.from||function(e,n){return new t(e,n)},r._Buffer_allocUnsafe=t.allocUnsafe||function(e){return new t(e)}):r._Buffer_from=r._Buffer_allocUnsafe=null}},1173:(t,e,n)=>{"use strict";t.exports=p;var r,i=n(9693),o=i.LongBits,a=i.base64,s=i.utf8;function u(t,e,n){this.fn=t,this.len=e,this.next=void 0,this.val=n}function c(){}function l(t){this.head=t.head,this.tail=t.tail,this.len=t.len,this.next=t.states}function p(){this.len=0,this.head=new u(c,0,0),this.tail=this.head,this.states=null}var f=function(){return i.Buffer?function(){return(p.create=function(){return new r})()}:function(){return new p}};function d(t,e,n){e[n]=255&t}function h(t,e){this.len=t,this.next=void 0,this.val=e}function g(t,e,n){for(;t.hi;)e[n++]=127&t.lo|128,t.lo=(t.lo>>>7|t.hi<<25)>>>0,t.hi>>>=7;for(;t.lo>127;)e[n++]=127&t.lo|128,t.lo=t.lo>>>7;e[n++]=t.lo}function b(t,e,n){e[n]=255&t,e[n+1]=t>>>8&255,e[n+2]=t>>>16&255,e[n+3]=t>>>24}p.create=f(),p.alloc=function(t){return new i.Array(t)},i.Array!==Array&&(p.alloc=i.pool(p.alloc,i.Array.prototype.subarray)),p.prototype._push=function(t,e,n){return this.tail=this.tail.next=new u(t,e,n),this.len+=e,this},h.prototype=Object.create(u.prototype),h.prototype.fn=function(t,e,n){for(;t>127;)e[n++]=127&t|128,t>>>=7;e[n]=t},p.prototype.uint32=function(t){return this.len+=(this.tail=this.tail.next=new h((t>>>=0)<128?1:t<16384?2:t<2097152?3:t<268435456?4:5,t)).len,this},p.prototype.int32=function(t){return t<0?this._push(g,10,o.fromNumber(t)):this.uint32(t)},p.prototype.sint32=function(t){return this.uint32((t<<1^t>>31)>>>0)},p.prototype.uint64=function(t){var e=o.from(t);return this._push(g,e.length(),e)},p.prototype.int64=p.prototype.uint64,p.prototype.sint64=function(t){var e=o.from(t).zzEncode();return this._push(g,e.length(),e)},p.prototype.bool=function(t){return this._push(d,1,t?1:0)},p.prototype.fixed32=function(t){return this._push(b,4,t>>>0)},p.prototype.sfixed32=p.prototype.fixed32,p.prototype.fixed64=function(t){var e=o.from(t);return this._push(b,4,e.lo)._push(b,4,e.hi)},p.prototype.sfixed64=p.prototype.fixed64,p.prototype.float=function(t){return this._push(i.float.writeFloatLE,4,t)},p.prototype.double=function(t){return this._push(i.float.writeDoubleLE,8,t)};var m=i.Array.prototype.set?function(t,e,n){e.set(t,n)}:function(t,e,n){for(var r=0;r<t.length;++r)e[n+r]=t[r]};p.prototype.bytes=function(t){var e=t.length>>>0;if(!e)return this._push(d,1,0);if(i.isString(t)){var n=p.alloc(e=a.length(t));a.decode(t,n,0),t=n}return this.uint32(e)._push(m,e,t)},p.prototype.string=function(t){var e=s.length(t);return e?this.uint32(e)._push(s.write,e,t):this._push(d,1,0)},p.prototype.fork=function(){return this.states=new l(this),this.head=this.tail=new u(c,0,0),this.len=0,this},p.prototype.reset=function(){return this.states?(this.head=this.states.head,this.tail=this.states.tail,this.len=this.states.len,this.states=this.states.next):(this.head=this.tail=new u(c,0,0),this.len=0),this},p.prototype.ldelim=function(){var t=this.head,e=this.tail,n=this.len;return this.reset().uint32(n),n&&(this.tail.next=t.next,this.tail=e,this.len+=n),this},p.prototype.finish=function(){for(var t=this.head.next,e=this.constructor.alloc(this.len),n=0;t;)t.fn(t.val,e,n),n+=t.len,t=t.next;return e},p._configure=function(t){r=t,p.create=f(),r._configure()}},3155:(t,e,n)=>{"use strict";t.exports=o;var r=n(1173);(o.prototype=Object.create(r.prototype)).constructor=o;var i=n(9693);function o(){r.call(this)}function a(t,e,n){t.length<40?i.utf8.write(t,e,n):e.utf8Write?e.utf8Write(t,n):e.write(t,n)}o._configure=function(){o.alloc=i._Buffer_allocUnsafe,o.writeBytesBuffer=i.Buffer&&i.Buffer.prototype instanceof Uint8Array&&"set"===i.Buffer.prototype.set.name?function(t,e,n){e.set(t,n)}:function(t,e,n){if(t.copy)t.copy(e,n,0,t.length);else for(var r=0;r<t.length;)e[n++]=t[r++]}},o.prototype.bytes=function(t){i.isString(t)&&(t=i._Buffer_from(t,"base64"));var e=t.length>>>0;return this.uint32(e),e&&this._push(o.writeBytesBuffer,e,t),this},o.prototype.string=function(t){var e=i.Buffer.byteLength(t);return this.uint32(e),e&&this._push(a,e,t),this},o._configure()},7714:(t,e,n)=>{"use strict";e.R=void 0;const r=n(6919),i=n(7448);e.R=new class{async init(){}async createSessionHandler(t,e){const n=new r.Session(e);return await n.loadModel(t),new i.OnnxjsSessionHandler(n)}}},4200:(t,e,n)=>{"use strict";e.c8=e.rX=void 0;const r=n(1670),i=n(5381),o=n(2157),a=n(2306);e.rX=()=>{if(("number"!=typeof r.env.wasm.initTimeout||r.env.wasm.initTimeout<0)&&(r.env.wasm.initTimeout=0),"boolean"!=typeof r.env.wasm.simd&&(r.env.wasm.simd=!0),"boolean"!=typeof r.env.wasm.proxy&&(r.env.wasm.proxy=!1),"number"!=typeof r.env.wasm.numThreads||!Number.isInteger(r.env.wasm.numThreads)||r.env.wasm.numThreads<=0){const t="undefined"==typeof navigator?(0,i.cpus)().length:navigator.hardwareConcurrency;r.env.wasm.numThreads=Math.min(4,Math.ceil((t||1)/2))}},e.c8=new class{async init(){(0,e.rX)(),await(0,o.initWasm)()}async createSessionHandler(t,e){const n=new a.OnnxruntimeWebAssemblySessionHandler;return await n.loadModel(t,e),Promise.resolve(n)}}},6018:function(t,e,n){"use strict";var r=this&&this.__createBinding||(Object.create?function(t,e,n,r){void 0===r&&(r=n);var i=Object.getOwnPropertyDescriptor(e,n);i&&!("get"in i?!e.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(t,r,i)}:function(t,e,n,r){void 0===r&&(r=n),t[r]=e[n]}),i=this&&this.__exportStar||function(t,e){for(var n in t)"default"===n||Object.prototype.hasOwnProperty.call(e,n)||r(e,t,n)};Object.defineProperty(e,"__esModule",{value:!0}),i(n(1670),e);const o=n(1670);{const t=n(7714).R;(0,o.registerBackend)("webgl",t,-10)}{const t=n(4200).c8;(0,o.registerBackend)("cpu",t,10),(0,o.registerBackend)("wasm",t,10),(0,o.registerBackend)("xnnpack",t,9)}},246:(t,e)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.createAttributeWithCacheKey=void 0;class n{constructor(t){Object.assign(this,t)}get cacheKey(){return this._cacheKey||(this._cacheKey=Object.getOwnPropertyNames(this).sort().map((t=>`${this[t]}`)).join(";")),this._cacheKey}}e.createAttributeWithCacheKey=t=>new n(t)},7778:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.Attribute=void 0;const r=n(1446),i=n(9395),o=n(9162),a=n(2517);var s=i.onnxruntime.experimental.fbs;class u{constructor(t){if(this._attributes=new Map,null!=t){for(const e of t)e instanceof r.onnx.AttributeProto?this._attributes.set(e.name,[u.getValue(e),u.getType(e)]):e instanceof s.Attribute&&this._attributes.set(e.name(),[u.getValue(e),u.getType(e)]);if(this._attributes.size<t.length)throw new Error("duplicated attribute names")}}set(t,e,n){this._attributes.set(t,[n,e])}delete(t){this._attributes.delete(t)}getFloat(t,e){return this.get(t,"float",e)}getInt(t,e){return this.get(t,"int",e)}getString(t,e){return this.get(t,"string",e)}getTensor(t,e){return this.get(t,"tensor",e)}getFloats(t,e){return this.get(t,"floats",e)}getInts(t,e){return this.get(t,"ints",e)}getStrings(t,e){return this.get(t,"strings",e)}getTensors(t,e){return this.get(t,"tensors",e)}get(t,e,n){const r=this._attributes.get(t);if(void 0===r){if(void 0!==n)return n;throw new Error(`required attribute not found: ${t}`)}if(r[1]!==e)throw new Error(`type mismatch: expected ${e} but got ${r[1]}`);return r[0]}static getType(t){const e=t instanceof r.onnx.AttributeProto?t.type:t.type();switch(e){case r.onnx.AttributeProto.AttributeType.FLOAT:return"float";case r.onnx.AttributeProto.AttributeType.INT:return"int";case r.onnx.AttributeProto.AttributeType.STRING:return"string";case r.onnx.AttributeProto.AttributeType.TENSOR:return"tensor";case r.onnx.AttributeProto.AttributeType.FLOATS:return"floats";case r.onnx.AttributeProto.AttributeType.INTS:return"ints";case r.onnx.AttributeProto.AttributeType.STRINGS:return"strings";case r.onnx.AttributeProto.AttributeType.TENSORS:return"tensors";default:throw new Error(`attribute type is not supported yet: ${r.onnx.AttributeProto.AttributeType[e]}`)}}static getValue(t){const e=t instanceof r.onnx.AttributeProto?t.type:t.type();if(e===r.onnx.AttributeProto.AttributeType.GRAPH||e===r.onnx.AttributeProto.AttributeType.GRAPHS)throw new Error("graph attribute is not supported yet");const n=this.getValueNoCheck(t);if(e===r.onnx.AttributeProto.AttributeType.INT&&a.LongUtil.isLong(n))return a.LongUtil.longToNumber(n);if(e===r.onnx.AttributeProto.AttributeType.INTS){const t=n,e=new Array(t.length);for(let n=0;n<t.length;n++){const r=t[n];e[n]=a.LongUtil.longToNumber(r)}return e}if(e===r.onnx.AttributeProto.AttributeType.TENSOR)return t instanceof r.onnx.AttributeProto?o.Tensor.fromProto(n):o.Tensor.fromOrtTensor(n);if(e===r.onnx.AttributeProto.AttributeType.TENSORS){if(t instanceof r.onnx.AttributeProto)return n.map((t=>o.Tensor.fromProto(t)));if(t instanceof s.Attribute)return n.map((t=>o.Tensor.fromOrtTensor(t)))}if(e===r.onnx.AttributeProto.AttributeType.STRING&&t instanceof r.onnx.AttributeProto){const t=n;return(0,a.decodeUtf8String)(t)}return e===r.onnx.AttributeProto.AttributeType.STRINGS&&t instanceof r.onnx.AttributeProto?n.map(a.decodeUtf8String):n}static getValueNoCheck(t){return t instanceof r.onnx.AttributeProto?this.getValueNoCheckFromOnnxFormat(t):this.getValueNoCheckFromOrtFormat(t)}static getValueNoCheckFromOnnxFormat(t){switch(t.type){case r.onnx.AttributeProto.AttributeType.FLOAT:return t.f;case r.onnx.AttributeProto.AttributeType.INT:return t.i;case r.onnx.AttributeProto.AttributeType.STRING:return t.s;case r.onnx.AttributeProto.AttributeType.TENSOR:return t.t;case r.onnx.AttributeProto.AttributeType.GRAPH:return t.g;case r.onnx.AttributeProto.AttributeType.FLOATS:return t.floats;case r.onnx.AttributeProto.AttributeType.INTS:return t.ints;case r.onnx.AttributeProto.AttributeType.STRINGS:return t.strings;case r.onnx.AttributeProto.AttributeType.TENSORS:return t.tensors;case r.onnx.AttributeProto.AttributeType.GRAPHS:return t.graphs;default:throw new Error(`unsupported attribute type: ${r.onnx.AttributeProto.AttributeType[t.type]}`)}}static getValueNoCheckFromOrtFormat(t){switch(t.type()){case s.AttributeType.FLOAT:return t.f();case s.AttributeType.INT:return t.i();case s.AttributeType.STRING:return t.s();case s.AttributeType.TENSOR:return t.t();case s.AttributeType.GRAPH:return t.g();case s.AttributeType.FLOATS:return t.floatsArray();case s.AttributeType.INTS:{const e=[];for(let n=0;n<t.intsLength();n++)e.push(t.ints(n));return e}case s.AttributeType.STRINGS:{const e=[];for(let n=0;n<t.stringsLength();n++)e.push(t.strings(n));return e}case s.AttributeType.TENSORS:{const e=[];for(let n=0;n<t.tensorsLength();n++)e.push(t.tensors(n));return e}default:throw new Error(`unsupported attribute type: ${s.AttributeType[t.type()]}`)}}}e.Attribute=u},7091:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.resolveBackend=e.backend=void 0;const r=n(5038),i=new Map;async function o(t){const n=e.backend;if(void 0!==n[t]&&function(t){const e=t;return"initialize"in e&&"function"==typeof e.initialize&&"createSessionHandler"in e&&"function"==typeof e.createSessionHandler&&"dispose"in e&&"function"==typeof e.dispose}(n[t])){const e=n[t];let r=e.initialize();if("object"==typeof r&&"then"in r&&(r=await r),r)return i.set(t,e),e}}e.backend={webgl:new r.WebGLBackend},e.resolveBackend=async function t(e){if(!e)return t(["webgl"]);{const t="string"==typeof e?[e]:e;for(const e of t){const t=i.get(e);if(t)return t;const n=await o(e);if(n)return n}}throw new Error("no available backend to use")}},5038:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.WebGLBackend=void 0;const r=n(1670),i=n(6231),o=n(6416),a=n(7305);e.WebGLBackend=class{get contextId(){return r.env.webgl.contextId}set contextId(t){r.env.webgl.contextId=t}get matmulMaxBatchSize(){return r.env.webgl.matmulMaxBatchSize}set matmulMaxBatchSize(t){r.env.webgl.matmulMaxBatchSize=t}get textureCacheMode(){return r.env.webgl.textureCacheMode}set textureCacheMode(t){r.env.webgl.textureCacheMode=t}get pack(){return r.env.webgl.pack}set pack(t){r.env.webgl.pack=t}get async(){return r.env.webgl.async}set async(t){r.env.webgl.async=t}initialize(){try{return this.glContext=(0,a.createWebGLContext)(this.contextId),"number"!=typeof this.matmulMaxBatchSize&&(this.matmulMaxBatchSize=16),"string"!=typeof this.textureCacheMode&&(this.textureCacheMode="full"),"boolean"!=typeof this.pack&&(this.pack=!1),"boolean"!=typeof this.async&&(this.async=!1),i.Logger.setWithEnv(r.env),i.Logger.verbose("WebGLBackend",`Created WebGLContext: ${typeof this.glContext} with matmulMaxBatchSize: ${this.matmulMaxBatchSize}; textureCacheMode: ${this.textureCacheMode}; pack: ${this.pack}; async: ${this.async}.`),!0}catch(t){return i.Logger.warning("WebGLBackend",`Unable to initialize WebGLBackend. ${t}`),!1}}createSessionHandler(t){return new o.WebGLSessionHandler(this,t)}dispose(){this.glContext.dispose()}}},5107:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.CoordsGlslLib=void 0;const r=n(2517),i=n(8520),o=n(5060),a=n(7859),s=n(9390);class u extends i.GlslLib{constructor(t){super(t)}getFunctions(){return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({},this.offsetToCoords()),this.coordsToOffset()),this.toVec()),this.valueFrom()),this.getCommonUtilFuncs()),this.getInputsSamplingSnippets()),this.getOutputSamplingSnippet())}getCustomTypes(){return{}}offsetToCoords(){return{offsetToCoords:new i.GlslLibRoutine("\n      vec2 offsetToCoords(int offset, int width, int height) {\n        int t = offset / width;\n        int s = offset - t*width;\n        vec2 coords = (vec2(s,t) + vec2(0.5,0.5)) / vec2(width, height);\n        return coords;\n      }\n      ")}}coordsToOffset(){return{coordsToOffset:new i.GlslLibRoutine("\n      int coordsToOffset(vec2 coords, int width, int height) {\n        float s = coords.s * float(width);\n        float t = coords.t * float(height);\n        int offset = int(t) * width + int(s);\n        return offset;\n      }\n      ")}}getOutputSamplingSnippet(){const t=this.context.outputTextureLayout;return t.isPacked?this.getPackedOutputSamplingSnippet(t):this.getUnpackedOutputSamplingSnippet(t)}getPackedOutputSamplingSnippet(t){const e=t.unpackedShape,n=[t.width,t.height],r={},a="getOutputCoords";switch(e.length){case 0:r[a]=this.getOutputScalarCoords();break;case 1:r[a]=this.getOutputPacked1DCoords(e,n);break;case 2:r[a]=this.getOutputPacked2DCoords(e,n);break;case 3:r[a]=this.getOutputPacked3DCoords(e,n);break;default:r[a]=this.getOutputPackedNDCoords(e,n)}const s=`\n      void setOutput(vec4 val) {\n        ${(0,o.getGlsl)(this.context.glContext.version).output} = val;\n      }\n    `;return r.floatTextureSetRGBA=new i.GlslLibRoutine(s),r}getUnpackedOutputSamplingSnippet(t){const e=t.unpackedShape,n=[t.width,t.height],r={},a="getOutputCoords";switch(e.length){case 0:r[a]=this.getOutputScalarCoords();break;case 1:r[a]=this.getOutputUnpacked1DCoords(e,n);break;case 2:r[a]=this.getOutputUnpacked2DCoords(e,n);break;case 3:r[a]=this.getOutputUnpacked3DCoords(e,n);break;case 4:r[a]=this.getOutputUnpacked4DCoords(e,n);break;case 5:r[a]=this.getOutputUnpacked5DCoords(e,n);break;case 6:r[a]=this.getOutputUnpacked6DCoords(e,n);break;default:throw new Error(`Unsupported output dimensionality: ${e.length}`)}const s=`\n        void setOutput(float val) {\n          ${(0,o.getGlsl)(this.context.glContext.version).output} = vec4(val, 0, 0, 0);\n        }\n    `;return r.floatTextureSetR=new i.GlslLibRoutine(s),r}getOutputScalarCoords(){return new i.GlslLibRoutine("\n      int getOutputCoords() {\n        return 0;\n      }\n    ")}getOutputPacked1DCoords(t,e){const n=e;let r="";return 1===n[0]?(r=`\n          int getOutputCoords() {\n            return 2 * int(TexCoords.y * ${n[1]}.0);\n          }\n        `,new i.GlslLibRoutine(r)):1===n[1]?(r=`\n          int getOutputCoords() {\n            return 2 * int(TexCoords.x * ${n[0]}.0);\n          }\n        `,new i.GlslLibRoutine(r)):(r=`\n        int getOutputCoords() {\n          ivec2 resTexRC = ivec2(TexCoords.xy *\n                                 vec2(${n[0]}, ${n[1]}));\n          return 2 * (resTexRC.y * ${n[0]} + resTexRC.x);\n        }\n      `,new i.GlslLibRoutine(r))}getOutputPacked2DCoords(t,e){let n="";if(r.ArrayUtil.arraysEqual(t,e))return n=`\n        ivec2 getOutputCoords() {\n          return 2 * ivec2(TexCoords.xy * vec2(${e[0]}, ${e[1]}));\n        }\n      `,new i.GlslLibRoutine(n);const o=e,a=Math.ceil(t[1]/2);return n=`\n        ivec2 getOutputCoords() {\n          ivec2 resTexRC = ivec2(TexCoords.xy *\n                                vec2(${o[0]}, ${o[1]}));\n\n          int index = resTexRC.y * ${o[0]} + resTexRC.x;\n\n          // reverse r and c order for packed texture\n          int r = imod(index, ${a}) * 2;\n          int c = 2 * (index / ${a});\n\n          return ivec2(r, c);\n        }\n      `,new i.GlslLibRoutine(n)}getOutputPacked3DCoords(t,e){const n=[e[0],e[1]],r=Math.ceil(t[2]/2),o=r*Math.ceil(t[1]/2),a=`\n        ivec3 getOutputCoords() {\n          ivec2 resTexRC = ivec2(TexCoords.xy *\n                                vec2(${n[0]}, ${n[1]}));\n          int index = resTexRC.y * ${n[0]} + resTexRC.x;\n\n          int b = index / ${o};\n          index -= b * ${o};\n\n          // reverse r and c order for packed texture\n          int r = imod(index, ${r}) * 2;\n          int c = 2 * (index / ${r});\n\n          return ivec3(b, r, c);\n        }\n      `;return new i.GlslLibRoutine(a)}getOutputPackedNDCoords(t,e){const n=[e[0],e[1]],r=Math.ceil(t[t.length-1]/2),o=r*Math.ceil(t[t.length-2]/2);let a=o,s="",u="b, r, c";for(let e=2;e<t.length-1;e++)a*=t[t.length-e-1],s=`\n      int b${e} = index / ${a};\n      index -= b${e} * ${a};\n    `+s,u=`b${e}, `+u;const c=`\n      ivec${t.length} getOutputCoords() {\n        ivec2 resTexRC = ivec2(TexCoords.xy *\n                              vec2(${n[0]}, ${n[1]}));\n        int index = resTexRC.y * ${n[0]} + resTexRC.x;\n\n        ${s}\n\n        int b = index / ${o};\n        index -= b * ${o};\n\n        // reverse r and c order for packed texture\n        int r = imod(index, ${r}) * 2;\n        int c = 2 * (index / ${r});\n\n        return ivec${t.length}(${u});\n      }\n    `;return new i.GlslLibRoutine(c)}getOutputUnpacked1DCoords(t,e){const n=`\n        int getOutputCoords() {\n          ivec2 resTexRC = ivec2(TexCoords.xy *\n                                vec2(${e[0]}, ${e[1]}));\n          return resTexRC.y * ${e[0]} + resTexRC.x;\n        }\n      `;return new i.GlslLibRoutine(n)}getOutputUnpacked2DCoords(t,e){const n=`\n        ivec2 getOutputCoords() {\n          ivec2 resTexRC = ivec2(TexCoords.xy *\n                                vec2(${e[0]}, ${e[1]}));\n          int index = resTexRC.y * ${e[0]} + resTexRC.x;\n          int r = index / ${t[1]};\n          int c = index - r * ${t[1]};\n          return ivec2(r, c);\n        }\n      `;return new i.GlslLibRoutine(n)}getOutputUnpacked3DCoords(t,e){let n="";const r=t.length;let o=null;r<2&&(o=[]),o=new Array(r-1),o[r-2]=t[r-1];for(let e=r-3;e>=0;--e)o[e]=o[e+1]*t[e+1];const a=["r","c","d"],s=o.map(((t,e)=>`int ${a[e]} = index / ${t}; ${e===o.length-1?`int ${a[e+1]} = index - ${a[e]} * ${t}`:`index -= ${a[e]} * ${t}`};`)).join("");return n=`\n        ivec3 getOutputCoords() {\n          ivec2 resTexRC = ivec2(TexCoords.xy *\n                                vec2(${e[0]}, ${e[1]}));\n          int index = resTexRC.y * ${e[0]} + resTexRC.x;\n          ${s}\n          return ivec3(r, c, d);\n        }\n      `,new i.GlslLibRoutine(n)}getOutputUnpacked4DCoords(t,e){let n="";const r=t.length;let o=null;r<2&&(o=[]),o=new Array(r-1),o[r-2]=t[r-1];for(let e=r-3;e>=0;--e)o[e]=o[e+1]*t[e+1];const a=["r","c","d","d2"],s=o.map(((t,e)=>`int ${a[e]} = index / ${t}; ${e===o.length-1?`int ${a[e+1]} = index - ${a[e]} * ${t}`:`index -= ${a[e]} * ${t}`};`)).join("");return n=`\n      ivec4 getOutputCoords() {\n          ivec2 resTexRC = ivec2(TexCoords.xy *\n                                vec2(${e[0]}, ${e[1]}));\n          int index = resTexRC.y * ${e[0]} + resTexRC.x;\n          ${s}\n          return ivec4(r, c, d, d2);\n        }\n      `,new i.GlslLibRoutine(n)}getOutputUnpacked5DCoords(t,e){let n="";const r=t.length;let o=null;r<2&&(o=[]),o=new Array(r-1),o[r-2]=t[r-1];for(let e=r-3;e>=0;--e)o[e]=o[e+1]*t[e+1];const a=["r","c","d","d2","d3"],s=o.map(((t,e)=>`int ${a[e]} = index / ${t}; ${e===o.length-1?`int ${a[e+1]} = index - ${a[e]} * ${t}`:`index -= ${a[e]} * ${t}`};`)).join("");return n=`\n      ivec5 getOutputCoords() {\n          ivec2 resTexRC = ivec2(TexCoords.xy *\n                                vec2(${e[0]}, ${e[1]}));\n          int index = resTexRC.y * ${e[0]} + resTexRC.x;\n          ${s}\n          return ivec5(r, c, d, d2, d3);\n        }\n      `,new i.GlslLibRoutine(n)}getOutputUnpacked6DCoords(t,e){let n="";const r=t.length;let o=null;r<2&&(o=[]),o=new Array(r-1),o[r-2]=t[r-1];for(let e=r-3;e>=0;--e)o[e]=o[e+1]*t[e+1];const a=["r","c","d","d2","d3","d4"],s=o.map(((t,e)=>`int ${a[e]} = index / ${t}; ${e===o.length-1?`int ${a[e+1]} = index - ${a[e]} * ${t}`:`index -= ${a[e]} * ${t}`};`)).join("");return n=`\n     ivec6 getOutputCoords() {\n         ivec2 resTexRC = ivec2(TexCoords.xy *\n                               vec2(${e[0]}, ${e[1]}));\n         int index = resTexRC.y * ${e[0]} + resTexRC.x;\n         ${s}\n         return ivec6(r, c, d, d2, d3, d4);\n       }\n     `,new i.GlslLibRoutine(n)}getCommonUtilFuncs(){const t={};let e="uvFromFlat";t[e]=new i.GlslLibRoutine("\n    vec2 uvFromFlat(int texNumR, int texNumC, int index) {\n      int texC = index / texNumR;\n      int texR = index - texC * texNumR;\n      // TODO: swap texR, texC order in following function so row is corresponding to u and column is corresponding to\n      //       v.\n      return (vec2(texR, texC) + halfCR) / vec2(texNumR, texNumC);\n    }\n    "),e="packedUVfrom1D",t[e]=new i.GlslLibRoutine("\n      vec2 packedUVfrom1D(int texNumR, int texNumC, int index) {\n        int texelIndex = index / 2;\n        int texR = texelIndex / texNumC;\n        int texC = texelIndex - texR * texNumC;\n        return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);\n      }\n      "),e="packedUVfrom2D",t[e]=new i.GlslLibRoutine("\n      vec2 packedUVfrom2D(int texNumR, int texNumC, int texelsInLogicalRow, int row, int col) {\n        int texelIndex = (row / 2) * texelsInLogicalRow + (col / 2);\n        int texR = texelIndex / texNumC;\n        int texC = texelIndex - texR * texNumC;\n        return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);\n      }\n      "),e="packedUVfrom3D",t[e]=new i.GlslLibRoutine("\n      vec2 packedUVfrom3D(int texNumR, int texNumC,\n          int texelsInBatch, int texelsInLogicalRow, int b,\n          int row, int col) {\n        int index = b * texelsInBatch + (row / 2) * texelsInLogicalRow + (col / 2);\n        int texR = index / texNumC;\n        int texC = index - texR * texNumC;\n        return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);\n      }\n      "),e="sampleTexture";const n=(0,o.getGlsl)(this.context.glContext.version);return t[e]=new i.GlslLibRoutine(`\n        float sampleTexture(sampler2D textureSampler, vec2 uv) {\n            return ${n.texture2D}(textureSampler, uv).r;\n        }`),t}getInputsSamplingSnippets(){const t={},e=this.context.outputTextureLayout;return this.context.programInfo.inputNames.forEach(((n,r)=>{const i=this.context.inputTextureLayouts[r],o=(0,s.generateShaderFuncNameFromInputSamplerName)(n);i.isPacked?t[o]=this.getPackedSamplerFromInput(o,n,i):t[o]=this.getUnpackedSamplerFromInput(o,n,i);const a=(0,s.generateShaderFuncNameFromInputSamplerNameAtOutCoords)(n);i.unpackedShape.length<=e.unpackedShape.length&&(i.isPacked?t[a]=this.getPackedSamplerAtOutputCoords(a,i,e,n):t[a]=this.getUnpackedSamplerAtOutputCoords(a,i,e,n))})),t}getPackedSamplerAtOutputCoords(t,e,n,o){const a=e.unpackedShape,u=n.unpackedShape,c=o,l=(0,s.generateShaderFuncNameFromInputSamplerName)(c),p=a.length,f=u.length,d=r.BroadcastUtil.getBroadcastDims(a,u),h=(0,s.getCoordsDataType)(f),g=f-p;let b;const m=(0,s.getGlChannels)();b=0===p?"":f<2&&d.length>=1?"coords = 0;":d.map((t=>`coords.${m[t+g]} = 0;`)).join("\n");let y="";y=f<2&&p>0?"coords":a.map(((t,e)=>`coords.${m[e+g]}`)).join(", ");let _="return outputValue;";const v=1===r.ShapeUtil.size(a),w=1===r.ShapeUtil.size(u);if(1!==p||v||w){if(v&&!w)_=1===f?"\n          return vec4(outputValue.x, outputValue.x, 0., 0.);\n        ":"\n          return vec4(outputValue.x);\n        ";else if(d.length){const t=p-2,e=p-1;d.indexOf(t)>-1&&d.indexOf(e)>-1?_="return vec4(outputValue.x);":d.indexOf(t)>-1?_="return vec4(outputValue.x, outputValue.y, outputValue.x, outputValue.y);":d.indexOf(e)>-1&&(_="return vec4(outputValue.xx, outputValue.zz);")}}else _="\n        return vec4(outputValue.xy, outputValue.xy);\n      ";const x=`\n      vec4 ${t}() {\n        ${h} coords = getOutputCoords();\n        \n        int lastDim = coords.${m[f-1]};\n        coords.${m[f-1]} = coords.${m[f-2]};\n        coords.${m[f-2]} = lastDim;\n      \n        ${b}\n        vec4 outputValue = ${l}(${y});\n        ${_}\n      }\n    `;return new i.GlslLibRoutine(x,["coordinates.getOutputCoords"])}getUnpackedSamplerAtOutputCoords(t,e,n,o){const a=[n.width,n.height],u=[e.width,e.height],c=e.unpackedShape.length,l=n.unpackedShape.length,p=e.unpackedShape,f=n.unpackedShape,d=(0,s.generateShaderFuncNameFromInputSamplerName)(o);if(c===l&&r.ArrayUtil.arraysEqual(u,a)){const e=`\n          float ${t}() {\n            return sampleTexture(${o}, TexCoords);\n          }\n        `;return new i.GlslLibRoutine(e,["coordinates.sampleTexture"])}const h=(0,s.getCoordsDataType)(l),g=r.BroadcastUtil.getBroadcastDims(p,f),b=l-c;let m;const y=(0,s.getGlChannels)();m=0===c?"":l<2&&g.length>=1?"coords = 0;":g.map((t=>`coords.${y[t+b]} = 0;`)).join("\n");let _="";_=l<2&&c>0?"coords":e.unpackedShape.map(((t,e)=>`coords.${y[e+b]}`)).join(", ");const v=`\n        float ${t}() {\n          ${h} coords = getOutputCoords();\n          ${m}\n          return ${d}(${_});\n        }\n      `;return new i.GlslLibRoutine(v,["coordinates.getOutputCoords"])}getPackedSamplerFromInput(t,e,n){switch(n.unpackedShape.length){case 0:return this.getPackedSamplerScalar(t,e);case 1:return this.getPackedSampler1D(t,e,n);case 2:return this.getPackedSampler2D(t,e,n);case 3:return this.getPackedSampler3D(t,e,n);default:return this.getPackedSamplerND(t,e,n)}}getUnpackedSamplerFromInput(t,e,n){const r=n.unpackedShape;switch(r.length){case 0:return this.getUnpackedSamplerScalar(t,e,n);case 1:return this.getUnpackedSampler1D(t,e,n);case 2:return this.getUnpackedSampler2D(t,e,n);case 3:return this.getUnpackedSampler3D(t,e,n);case 4:return this.getUnpackedSampler4D(t,e,n);case 5:return this.getUnpackedSampler5D(t,e,n);case 6:return this.getUnpackedSampler6D(t,e,n);default:throw new Error(`Unsupported dimension ${r.length}-D`)}}getPackedSamplerScalar(t,e){const n=`\n          vec4 ${t}() {\n            return ${(0,o.getGlsl)(this.context.glContext.version).texture2D}(${e}, halfCR);\n          }\n        `;return new i.GlslLibRoutine(n)}getPackedSampler1D(t,e,n){const r=[n.width,n.height],a=[r[1],r[0]],s=(0,o.getGlsl)(this.context.glContext.version),u=`vec4 ${t}(int index) {\n      vec2 uv = packedUVfrom1D(\n      ${a[0]}, ${a[1]}, index);\n      return ${s.texture2D}(${e}, uv);\n    }`;return new i.GlslLibRoutine(u,["coordinates.packedUVfrom1D"])}getPackedSampler2D(t,e,n){const a=n.unpackedShape,s=[n.width,n.height],u=(0,o.getGlsl)(this.context.glContext.version),c=s[0],l=s[1];if(null!=s&&r.ArrayUtil.arraysEqual(a,s)){const n=`vec4 ${t}(int row, int col) {\n        vec2 uv = (vec2(col, row) + halfCR) / vec2(${l}.0, ${c}.0);\n        return ${u.texture2D}(${e}, uv);\n      }`;return new i.GlslLibRoutine(n)}const p=s,f=Math.ceil(a[1]/2),d=`vec4 ${t}(int row, int col) {\n      vec2 uv = packedUVfrom2D(${p[1]}, ${p[0]}, ${f}, row, col);\n      return ${u.texture2D}(${e}, uv);\n    }`;return new i.GlslLibRoutine(d,["coordinates.packedUVfrom2D"])}getPackedSampler3D(t,e,n){const r=n.unpackedShape,a=[n.width,n.height],u=[a[0],a[1]],c=(0,o.getGlsl)(this.context.glContext.version);if(1===r[0]){const o=r.slice(1),a=[1,2],u=(0,s.squeezeInputShape)(r,o),c=["b","row","col"],l=JSON.parse(JSON.stringify(n));l.unpackedShape=u;const p=this.getPackedSamplerFromInput(t,e,l),f=`${p.routineBody}\n      vec4 ${t}(int b, int row, int col) {\n        return ${t}(${(0,s.getSqueezedParams)(c,a)});\n      } `;return new i.GlslLibRoutine(f,p.dependencies)}const l=u[0],p=u[1],f=Math.ceil(r[2]/2),d=`vec4 ${t}(int b, int row, int col) {\n      vec2 uv = packedUVfrom3D(\n        ${p}, ${l}, ${f*Math.ceil(r[1]/2)}, ${f}, b, row, col);\n      return ${c.texture2D}(${e}, uv);}`;return new i.GlslLibRoutine(d,["coordinates.packedUVfrom3D"])}getPackedSamplerND(t,e,n){const r=n.unpackedShape,a=r.length,s=[n.width,n.height],u=(0,o.getGlsl)(this.context.glContext.version),c=[s[0],s[1]],l=c[1],p=c[0],f=Math.ceil(r[a-1]/2);let d=f*Math.ceil(r[a-2]/2),h="int b, int row, int col",g=`b * ${d} + (row / 2) * ${f} + (col / 2)`;for(let t=2;t<a-1;t++)h=`int b${t}, `+h,d*=r[a-t-1],g=`b${t} * ${d} + `+g;const b=`vec4 ${t}(${h}) {\n      int index = ${g};\n      int texR = index / ${p};\n      int texC = index - texR * ${p};\n      vec2 uv = (vec2(texC, texR) + halfCR) / vec2(${p}, ${l});\n      return ${u.texture2D}(${e}, uv);\n    }`;return new i.GlslLibRoutine(b)}getUnpackedSamplerScalar(t,e,n){const[r,o]=[n.width,n.height];if(1===r&&1===o){const n=`\n          float ${t}() {\n            return sampleTexture(${e}, halfCR);\n          }\n        `;return new i.GlslLibRoutine(n,["coordinates.sampleTexture"])}const a=`\n        float ${t}() {\n          int offset_${e} = coordsToOffset(TexCoords, ${r}, ${o});\n          vec2 uv = uvFromFlat(${r}, ${o}, offset_${e});\n          return sampleTexture(${e}, uv);\n        }\n      `;return new i.GlslLibRoutine(a,["coordinates.uvFromFlat","coordinates.sampleTexture","coordinates.coordsToOffset"])}getUnpackedSampler1D(t,e,n){const r=n.width,o=n.height;if(1===o&&1===r){const n=`\n        float ${t}(int index) {\n          return sampleTexture(${e}, halfCR);\n        }\n      `;return new i.GlslLibRoutine(n,["coordinates.sampleTexture"])}if(1===o){const n=`\n          float ${t}(int index) {\n            vec2 uv = vec2((float(index) + 0.5) / ${r}.0, 0.5);\n            return sampleTexture(${e}, uv);\n          }\n        `;return new i.GlslLibRoutine(n,["coordinates.sampleTexture"])}if(1===r){const n=`\n          float ${t}(int index) {\n            vec2 uv = vec2(0.5, (float(index) + 0.5) / ${o}.0);\n            return sampleTexture(${e}, uv);\n          }\n        `;return new i.GlslLibRoutine(n,["coordinates.sampleTexture"])}const a=`\n        float ${t}(int index) {\n          vec2 uv = uvFromFlat(${r}, ${o}, index);\n          return sampleTexture(${e}, uv);\n        }\n      `;return new i.GlslLibRoutine(a,["coordinates.uvFromFlat","coordinates.sampleTexture"])}getUnpackedSampler2D(t,e,n){const o=n.unpackedShape,u=[n.height,n.width];if(null!=u&&r.ArrayUtil.arraysEqual(o,u)){const n=`\n          float ${t}(int row, int col) {\n            vec2 uv = (vec2(row, col) + halfCR) / vec2(${u[1]}.0, ${u[0]}.0);\n            return sampleTexture(${e}, uv);\n          }\n        `;return new i.GlslLibRoutine(n,["coordinates.sampleTexture"])}const{newShape:c,keptDims:l}=(0,a.squeezeShape)(o),p=c;if(p.length<o.length){const r=(0,s.squeezeInputShape)(o,p),a=JSON.parse(JSON.stringify(n));a.unpackedShape=r;const u=["col","row"],c=`\n          ${this.getUnpackedSamplerFromInput(t,e,a).routineBody}\n          float ${t}(int row, int col) {\n            return ${t}(${(0,s.getSqueezedParams)(u,l)});\n          }\n        `;return new i.GlslLibRoutine(c,["coordinates.sampleTexture"])}const f=u[1],d=u[0];if(1===d){const n=`\n          float ${t}(int row, int col) {\n            int offset_${e} = coordsToOffset(TexCoords, ${f}, ${d});\n            float index = dot(vec3(row, col, offset_${e}), vec3(${o[1]}, 1, 1));\n            vec2 uv = vec2(0.5, (index + 0.5) / ${f}.0);\n            return sampleTexture(${e}, uv);\n          }\n        `;return new i.GlslLibRoutine(n,["coordinates.sampleTexture","coordinates.coordsToOffset"])}if(1===f){const n=`\n          float ${t}(int row, int col) {\n            int offset_${e} = coordsToOffset(TexCoords, ${f}, ${d});\n            float index = dot(vec3(row, col, offset_${e}), vec3(${o[1]}, 1, 1));\n            vec2 uv = vec2((index + 0.5) / ${d}.0, 0.5);\n            return sampleTexture(${e}, uv);\n          }\n        `;return new i.GlslLibRoutine(n,["coordinates.sampleTexture","coordinates.coordsToOffset"])}const h=`\n        float ${t}(int row, int col) {\n          int index = col * ${o[1]} + row;\n          vec2 uv = uvFromFlat(${f}, ${d}, index);\n          return sampleTexture(${e}, uv);\n        }\n      `;return new i.GlslLibRoutine(h,["coordinates.uvFromFlat","coordinates.sampleTexture","coordinates.coordsToOffset"])}getUnpackedSampler3D(t,e,n){const r=n.unpackedShape,o=r[1]*r[2],u=r[2],{newShape:c,keptDims:l}=(0,a.squeezeShape)(r),p=c;if(p.length<r.length){const o=(0,s.squeezeInputShape)(r,p),a=["batch","col","row"],u=JSON.parse(JSON.stringify(n));u.unpackedShape=o;const c=this.getUnpackedSamplerFromInput(t,e,u),f=l.reverse(),d=`\n          ${c.routineBody}\n          float ${t}(int batch, int row, int col) {\n            return ${t}(${(0,s.getSqueezedParams)(a,f)});\n          }\n        `;return new i.GlslLibRoutine(d,c.dependencies)}const f=`\n          float ${t}(int depth, int row, int col) {\n            // Explicitly use integer operations as dot() only works on floats.\n            int index = depth * ${o} + col * ${u} + row;\n            vec2 uv = uvFromFlat(${n.width}, ${n.height}, index);\n            return sampleTexture(${e}, uv);\n          }\n      `;return new i.GlslLibRoutine(f,["coordinates.uvFromFlat","coordinates.sampleTexture","coordinates.coordsToOffset"])}getUnpackedSampler4D(t,e,n){const r=n.unpackedShape,o=r[3],a=r[2]*o,s=`\n        float ${t}(int row, int col, int depth, int depth2) {\n          int index = row * ${r[1]*a} + col * ${a} +\n              depth2 * ${o} + depth;\n          vec2 uv = uvFromFlat(${n.width}, ${n.height}, index);\n          return sampleTexture(${e}, uv);\n        }\n      `;return new i.GlslLibRoutine(s,["coordinates.uvFromFlat","coordinates.sampleTexture"])}getUnpackedSampler5D(t,e,n){const r=n.unpackedShape,o=r[4],u=r[3]*o,c=r[2]*u,l=r[1]*c,{newShape:p,keptDims:f}=(0,a.squeezeShape)(r);if(p.length<r.length){const o=(0,s.squeezeInputShape)(r,p),a=["row","col","depth","depth2","depth3"],u=JSON.parse(JSON.stringify(n));u.unpackedShape=o;const c=`\n          ${this.getUnpackedSamplerFromInput(t,e,u).routineBody}\n          float ${t}(int row, int col, int depth, int depth2, int depth3) {\n            return ${t}(${(0,s.getSqueezedParams)(a,f)});\n          }\n        `;return new i.GlslLibRoutine(c,["coordinates.sampleTexture","coordinates.uvFromFlat"])}const d=`\n        float ${t}(int row, int col, int depth, int depth2, int depth3) {\n          int index = row * ${l} + col * ${c} + depth * ${u} +\n          depth3 * ${o} + depth2;\n          vec2 uv = uvFromFlat(${n.width}, ${n.height}, index);\n          return sampleTexture(${e}, uv);\n        }\n      `;return new i.GlslLibRoutine(d,["coordinates.sampleTexture","coordinates.uvFromFlat"])}getUnpackedSampler6D(t,e,n){const r=n.unpackedShape,o=r[5],u=r[4]*o,c=r[3]*u,l=r[2]*c,p=r[1]*l,{newShape:f,keptDims:d}=(0,a.squeezeShape)(r);if(f.length<r.length){const o=(0,s.squeezeInputShape)(r,f),a=["row","col","depth","depth2","depth3","depth4"],u=JSON.parse(JSON.stringify(n));u.unpackedShape=o;const c=`\n            ${this.getUnpackedSamplerFromInput(t,e,u).routineBody}\n            float ${t}(int row, int col, int depth,\n              int depth2, int depth3, int depth4) {\n              return ${t}(${(0,s.getSqueezedParams)(a,d)});\n            }\n          `;return new i.GlslLibRoutine(c,["coordinates.sampleTexture","coordinates.uvFromFlat"])}const h=`\n          float ${t}(int row, int col, int depth,\n            int depth2, int depth3, int depth4) {\n            int index = row * ${p} + col * ${l} + depth * ${c} +\n            depth2 * ${u} + depth3 * ${o} + depth4;\n            vec2 uv = uvFromFlat(${n.width}, ${n.height}, index);\n            return sampleTexture(${e}, uv);\n          }\n        `;return new i.GlslLibRoutine(h,["coordinates.uvFromFlat","coordinates.sampleTexture","coordinates.coordsToOffset"])}toVec(){const t=this.context.outputTextureLayout,e=t.shape.length,n=t.strides,r=t.width,o=t.height,a=[];for(let t=0;t<e-1;++t)a.push(`\n        c[${t}] = offset / ${n[t]};`),a.push(`\n        offset -= c[${t}] * ${n[t]};`);a.push(`\n        c[${e-1}] = offset;`);const s=`\n      void toVec(vec2 texCoords, out int c[${e}]) {\n        int offset = coordsToOffset(texCoords, ${r}, ${o});\n        ${a.join("")}\n      }\n      void toVec(int offset, out int c[${e}]) {\n        ${a.join("")}\n      }\n    `;return{toVec:new i.GlslLibRoutine(s,["coordinates.coordsToOffset"])}}valueFrom(){const t={};return this.context.programInfo.inputNames.forEach(((e,n)=>{const r=this.context.inputTextureLayouts[n],o=(r.unpackedShape.length>0?r.unpackedShape:r.shape).length;let a=`_${e}`;t[a]=new i.GlslLibRoutine(this.getValueFromSingle(e,o,r.width,r.height,!1),[`shapeUtils.indicesToOffset${a}`,"coordinates.offsetToCoords","fragcolor.getColorAsFloat"]),a+="_T",t[a]=new i.GlslLibRoutine(this.getValueFromSingle(e,o,r.width,r.height,!0),[`shapeUtils.indicesToOffset${a}`,"coordinates.offsetToCoords","fragcolor.getColorAsFloat"])})),t}getValueFromSingle(t,e,n,r,i){let a=`_${t}`;return i&&(a+="_T"),`\n        float ${a}(int m[${e}]) {\n          int offset = indicesToOffset${a}(m);\n          vec2 coords = offsetToCoords(offset, ${n}, ${r});\n          float value = getColorAsFloat(${(0,o.getGlsl)(this.context.glContext.version).texture2D}(${t}, coords));\n          return value;\n        }\n        `}getPackedValueFrom(t,e,n,r,i){let a=`_${t}_Pack`;return i&&(a+="_T"),`\n        vec4 ${a}(int m[${e}]) {\n          int offset = indicesToOffset_${t}(m);\n          vec2 coords = offsetToCoords(offset, ${n}, ${r});\n          return ${(0,o.getGlsl)(this.context.glContext.version).texture2D}(${t}, coords);\n        }\n        `}}e.CoordsGlslLib=u},8520:(t,e)=>{"use strict";var n;Object.defineProperty(e,"__esModule",{value:!0}),e.TopologicalSortGlslRoutines=e.GlslLibRoutineNode=e.GlslLibRoutine=e.GlslLib=e.GlslContext=e.FunctionType=void 0,(n=e.FunctionType||(e.FunctionType={}))[n.ValueBased=0]="ValueBased",n[n.Positional=1]="Positional",e.GlslContext=class{constructor(t,e,n,r){this.glContext=t,this.programInfo=e,this.inputTextureLayouts=n,this.outputTextureLayout=r}},e.GlslLib=class{constructor(t){this.context=t}},e.GlslLibRoutine=class{constructor(t,e){this.routineBody=t,this.dependencies=e}},e.GlslLibRoutineNode=class{constructor(t,e,n){this.name=t,this.dependencies=n||[],e&&(this.routineBody=e)}addDependency(t){t&&this.dependencies.push(t)}},e.TopologicalSortGlslRoutines=class{static returnOrderedNodes(t){if(!t||0===t.length)return[];if(1===t.length)return t;const e=new Set,n=new Set,r=new Array;return this.createOrderedNodes(t,e,n,r),r}static createOrderedNodes(t,e,n,r){for(let i=0;i<t.length;++i)this.dfsTraverse(t[i],e,n,r)}static dfsTraverse(t,e,n,r){if(!t||n.has(t.name))return;if(e.has(t.name))throw new Error("Cyclic dependency detected. Can't topologically sort routines needed for shader.");e.add(t.name);const i=t.dependencies;if(i&&i.length>0)for(let t=0;t<i.length;++t)this.dfsTraverse(i[t],e,n,r);r.push(t),n.add(t.name),e.delete(t.name)}}},7341:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.EncodingGlslLib=void 0;const r=n(8520);class i extends r.GlslLib{constructor(t){super(t)}getFunctions(){return Object.assign(Object.assign({},this.encodeFloat32()),this.decodeFloat32())}getCustomTypes(){return{}}encodeFloat32(){return{encode:new r.GlslLibRoutine("highp vec4 encode(highp float f) {\n        return vec4(f, 0.0, 0.0, 0.0);\n      }\n        ")}}decodeFloat32(){return{decode:new r.GlslLibRoutine("highp float decode(highp vec4 rgba) {\n        return rgba.r;\n      }\n        ")}}encodeUint8(){const t=i.isLittleEndian()?"rgba.rgba=rgba.abgr;":"";return{encode:new r.GlslLibRoutine(`\n      highp vec4 encode(highp float f) {\n        highp float F = abs(f);\n        highp float Sign = step(0.0,-f);\n        highp float Exponent = floor(log2(F));\n        highp float Mantissa = (exp2(- Exponent) * F);\n        Exponent = floor(log2(F) + 127.0) + floor(log2(Mantissa));\n        highp vec4 rgba;\n        rgba[0] = 128.0 * Sign  + floor(Exponent*exp2(-1.0));\n        rgba[1] = 128.0 * mod(Exponent,2.0) + mod(floor(Mantissa*128.0),128.0);\n        rgba[2] = floor(mod(floor(Mantissa*exp2(23.0 -8.0)),exp2(8.0)));\n        rgba[3] = floor(exp2(23.0)*mod(Mantissa,exp2(-15.0)));\n        ${t}\n        rgba = rgba / 255.0; // values need to be normalized to [0,1]\n        return rgba;\n    }\n        `)}}decodeUint8(){const t=i.isLittleEndian()?"rgba.rgba=rgba.abgr;":"";return{decode:new r.GlslLibRoutine(`\n        highp float decode(highp vec4 rgba) {\n          rgba = rgba * 255.0; // values need to be de-normalized from [0,1] to [0,255]\n          ${t}\n          highp float Sign = 1.0 - step(128.0,rgba[0])*2.0;\n          highp float Exponent = 2.0 * mod(rgba[0],128.0) + step(128.0,rgba[1]) - 127.0;\n          highp float Mantissa = mod(rgba[1],128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + float(0x800000);\n          highp float Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 ));\n          return Result;\n      }\n        `)}}static isLittleEndian(){const t=new ArrayBuffer(4),e=new Uint32Array(t),n=new Uint8Array(t);if(e[0]=3735928559,239===n[0])return!0;if(222===n[0])return!1;throw new Error("unknown endianness")}}e.EncodingGlslLib=i},9894:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.FragColorGlslLib=void 0;const r=n(8520),i=n(5060);class o extends r.GlslLib{constructor(t){super(t)}getFunctions(){return Object.assign(Object.assign({},this.setFragColor()),this.getColorAsFloat())}getCustomTypes(){return{}}setFragColor(){const t=(0,i.getGlsl)(this.context.glContext.version);return{setFragColor:new r.GlslLibRoutine(`\n        void setFragColor(float value) {\n            ${t.output} = encode(value);\n        }\n        `,["encoding.encode"])}}getColorAsFloat(){return{getColorAsFloat:new r.GlslLibRoutine("\n        float getColorAsFloat(vec4 color) {\n            return decode(color);\n        }\n        ",["encoding.decode"])}}}e.FragColorGlslLib=o},2848:(t,e)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.replaceInlines=void 0;const n=/@inline[\s\n\r]+(\w+)[\s\n\r]+([0-9a-zA-Z_]+)\s*\(([^)]*)\)\s*{(([^}]|[\n\r])*)}/gm;e.replaceInlines=function(t){const e={};let r;for(;null!==(r=n.exec(t));){const t=r[3].split(",").map((t=>{const e=t.trim().split(" ");return e&&2===e.length?{type:e[0],name:e[1]}:null})).filter((t=>null!==t));e[r[2]]={params:t,body:r[4]}}for(const n in e){const i="(\\w+)?\\s+([_0-9a-zA-Z]+)\\s+=\\s+__FUNC__\\((.*)\\)\\s*;".replace("__FUNC__",n),o=new RegExp(i,"gm");for(;null!==(r=o.exec(t));){const i=r[1],o=r[2],a=r[3].split(","),s=i?`${i} ${o};`:"";let u=e[n].body,c="";e[n].params.forEach(((t,e)=>{t&&(c+=`${t.type} ${t.name} = ${a[e]};\n`)})),u=`${c}\n ${u}`,u=u.replace("return",`${o} = `);const l=`\n      ${s}\n      {\n        ${u}\n      }\n      `;t=t.replace(r[0],l)}}return t.replace(n,"")}},8879:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.GlslPreprocessor=void 0;const r=n(8520),i=n(2848),o=n(5483),a=n(5060);e.GlslPreprocessor=class{constructor(t,e,n,i){this.libs={},this.glslLibRoutineDependencyGraph={},this.context=new r.GlslContext(t,e,n,i),Object.keys(o.glslRegistry).forEach((t=>{const e=new o.glslRegistry[t](this.context);this.libs[t]=e}));const a=this.glslLibRoutineDependencyGraph;for(const t in this.libs){const e=this.libs[t].getFunctions();for(const n in e){const i=t+"."+n;let o;a[i]?(o=a[i],o.routineBody=e[n].routineBody):(o=new r.GlslLibRoutineNode(i,e[n].routineBody),a[i]=o);const s=e[n].dependencies;if(s)for(let t=0;t<s.length;++t)if(a[s[t]])o.addDependency(a[s[t]]);else{const e=new r.GlslLibRoutineNode(s[t]);a[s[t]]=e,o.addDependency(e)}}}}preprocess(){const t=this.context.programInfo;let e=t.shaderSource;return this.context.programInfo.hasMain||(e=`${e}\n      ${(0,a.getDefaultFragShaderMain)(this.context.glContext.version,this.context.outputTextureLayout.shape.length)}`),e=(0,i.replaceInlines)(e),`${(0,a.getFragShaderPreamble)(this.context.glContext.version)}\n    ${this.getUniforms(t.inputNames,t.variables)}\n    ${this.getImports(e)}\n    ${e}`}getImports(t){const e=this.selectGlslLibRoutinesToBeIncluded(t);if(0===e.length)return"";let n="";for(let t=0;t<e.length;++t){if(!e[t].routineBody)throw new Error(`Missing body for the Glsl Library routine: ${e[t].name}`);n+=e[t].routineBody+"\n"}return n}selectGlslLibRoutinesToBeIncluded(t){const e=[];return Object.keys(this.glslLibRoutineDependencyGraph).forEach((n=>{const r=n.split(".")[1];-1!==t.indexOf(r)&&e.push(this.glslLibRoutineDependencyGraph[n])})),r.TopologicalSortGlslRoutines.returnOrderedNodes(e)}getUniforms(t,e){const n=[];if(t)for(const e of t)n.push(`uniform sampler2D ${e};`);if(e)for(const t of e)n.push(`uniform ${t.type} ${t.name}${t.arrayLength?`[${t.arrayLength}]`:""};`);return n.join("\n")}}},5483:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.glslRegistry=void 0;const r=n(5107),i=n(7341),o=n(9894),a=n(2655),s=n(3891);e.glslRegistry={encoding:i.EncodingGlslLib,fragcolor:o.FragColorGlslLib,vec:s.VecGlslLib,shapeUtils:a.ShapeUtilsGlslLib,coordinates:r.CoordsGlslLib}},2655:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.ShapeUtilsGlslLib=void 0;const r=n(8520);class i extends r.GlslLib{constructor(t){super(t)}getFunctions(){return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({},this.bcastIndex()),this.bcastMatmulIndex()),this.offsetToIndices()),this.indicesToOffset()),this.incrementIndices())}getCustomTypes(){return{}}bcastIndex(){const t=this.context.outputTextureLayout.shape.length,e={};return this.context.programInfo.inputNames.forEach(((n,i)=>{const o=this.context.inputTextureLayouts[i].unpackedShape;if(o.length<=t){const i=o.length,a=t-i,s=`bcastIndices_${n}`;let u="";for(let t=0;t<i;++t)u+=`\n          realIndices[${t}] = int( mod(float(bcastedIndices[${a+t}]), ${o[t]}.0) );\n          `;const c=`\n        void ${s} (int bcastedIndices[${t}], out int realIndices[${i}]) {\n          ${u}\n        }\n        `;e[s]=new r.GlslLibRoutine(c)}})),e}bcastMatmulIndex(){const t=this.context.outputTextureLayout.shape.length,e={};return this.context.programInfo.inputNames.forEach(((n,i)=>{const o=this.context.inputTextureLayouts[i].shape;if(!(o.length<2||o.length>t)){const i=o.length,a=t-i,s=`bcastMatmulIndices_${n}`;let u="";for(let t=0;t<i-2;++t)u+=`\n          realIndices[${t}] = int( mod(float(bcastedIndices[${a+t}]), ${o[t]}.0) );\n          `;const c=`\n        void ${s}(int bcastedIndices[${t}], out int realIndices[${i}]) {\n          ${u}\n          realIndices[${i-1}] = bcastedIndices[${t-1}];\n          realIndices[${i-2}] = bcastedIndices[${t-2}];\n        }\n        `;e[s]=new r.GlslLibRoutine(c)}})),e}indicesToOffset(){const t={};return this.context.programInfo.inputNames.forEach(((e,n)=>{const o=this.context.inputTextureLayouts[n].shape,a=this.context.inputTextureLayouts[n].strides,s=o.length;let u=`indicesToOffset_${e}`;t[u]=new r.GlslLibRoutine(i.indexToOffsetSingle(u,s,a)),u=`indicesToOffset_${e}_T`,t[u]=new r.GlslLibRoutine(i.indexToOffsetSingle(u,s,a.slice().reverse()))})),t}static indexToOffsetSingle(t,e,n){let r="";for(let t=e-1;t>=0;--t)r+=`\n        offset += indices[${t}] * ${n[t]};\n        `;return`\n      int ${t}(int indices[${e}]) {\n        int offset = 0;\n        ${r}\n        return offset;\n      }\n      `}offsetToIndices(){const t={};return this.context.programInfo.inputNames.forEach(((e,n)=>{const o=this.context.inputTextureLayouts[n].shape,a=this.context.inputTextureLayouts[n].strides,s=o.length;let u=`offsetToIndices_${e}`;t[u]=new r.GlslLibRoutine(i.offsetToIndicesSingle(u,s,a)),u=`offsetToIndices_${e}_T`,t[u]=new r.GlslLibRoutine(i.offsetToIndicesSingle(u,s,a.slice().reverse()))})),t}static offsetToIndicesSingle(t,e,n){const r=[];for(let t=0;t<e-1;++t)r.push(`\n      indices[${t}] = offset / ${n[t]};`),r.push(`\n        offset -= indices[${t}] * ${n[t]};`);return r.push(`\n      indices[${e-1}] = offset;`),`\n      void ${t}(int offset, out int indices[${e}]) {\n        ${r.join("")}\n      }\n      `}incrementIndices(){const t={};return this.context.programInfo.inputNames.forEach(((e,n)=>{const i=this.context.inputTextureLayouts[n].shape,o=i.length,a=`incrementIndices_${e}`;let s="";for(let t=0;t<o;++t)s+=`\n        shape[${t}] = ${i[t]};`;const u=`\n        void ${a}(int axis, out int indices[${o}]) {\n          int shape[${o}];\n          ${s};\n          for(int i = ${o} -1 ; i >= 0; --i) {\n            if(i > axis) continue;\n            indices[i] += 1;\n            if(indices[i] < shape[i]) {\n              break;\n            }\n            indices[i] = 0;\n          }\n        }\n        `;t[a]=new r.GlslLibRoutine(u)})),t}}e.ShapeUtilsGlslLib=i},5060:(t,e)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.getDefaultFragShaderMain=e.getFragShaderPreamble=e.getVertexShaderSource=e.getGlsl=void 0;const n={version:"",attribute:"attribute",varyingVertex:"varying",varyingFrag:"varying",texture2D:"texture2D",output:"gl_FragColor",outputDeclaration:""},r={version:"#version 300 es",attribute:"in",varyingVertex:"out",varyingFrag:"in",texture2D:"texture",output:"outputColor",outputDeclaration:"out vec4 outputColor;"};function i(t){return 1===t?n:r}e.getGlsl=i,e.getVertexShaderSource=function(t){const e=i(t);return`${e.version}\n      precision highp float;\n      ${e.attribute} vec3 position;\n      ${e.attribute} vec2 textureCoord;\n\n      ${e.varyingVertex} vec2 TexCoords;\n\n      void main()\n      {\n          gl_Position = vec4(position, 1.0);\n          TexCoords = textureCoord;\n      }`},e.getFragShaderPreamble=function(t){const e=i(t);return`${e.version}\n    precision highp float;\n    precision highp int;\n    precision highp sampler2D;\n    ${e.varyingFrag} vec2 TexCoords;\n    ${e.outputDeclaration}\n    const vec2 halfCR = vec2(0.5, 0.5);\n\n    // Custom vector types to handle higher dimenalities.\n    struct ivec5\n    {\n      int x;\n      int y;\n      int z;\n      int w;\n      int u;\n    };\n\n    struct ivec6\n    {\n      int x;\n      int y;\n      int z;\n      int w;\n      int u;\n      int v;\n    };\n\n    int imod(int x, int y) {\n      return x - y * (x / y);\n    }\n\n    `},e.getDefaultFragShaderMain=function(t,e){return`\n  void main() {\n    int indices[${e}];\n    toVec(TexCoords, indices);\n    vec4 result = vec4(process(indices));\n    ${i(t).output} = result;\n  }\n  `}},3891:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.VecGlslLib=void 0;const r=n(8520);class i extends r.GlslLib{constructor(t){super(t)}getCustomTypes(){return{}}getFunctions(){return Object.assign(Object.assign(Object.assign(Object.assign({},this.binaryVecFunctions()),this.copyVec()),this.setVecItem()),this.getVecItem())}binaryVecFunctions(){const t=this.context.outputTextureLayout.shape.length,e={add:"+=",sub:"-=",mul:"*=",div:"/="},n={};for(const i in e){const o=`${i}Vec`;let a="";for(let n=0;n<t;++n)a+=`\n          dest[${n}] ${e[i]} src[${n}];\n          `;const s=`\n        void ${o}(int src[${t}], out int dest[${t}]) {\n          ${a}\n        }\n        `;n[o]=new r.GlslLibRoutine(s)}return n}copyVec(){const t=this.context.outputTextureLayout.shape.length;let e="";for(let n=0;n<t;++n)e+=`\n        dest[${n}] = src[${n}];\n        `;const n=`\n      void copyVec(int src[${t}], out int dest[${t}]) {\n        ${e}\n      }\n      `;return{copyVec:new r.GlslLibRoutine(n)}}setVecItem(){const t=this.context.outputTextureLayout.shape.length;let e=`\n        if(index < 0)\n            index =${t} + index;\n        if (index == 0)\n            m[0] = value;\n        `;for(let n=1;n<t-1;++n)e+=`\n        else if (index == ${n})\n            m[${n}] = value;\n            `;e+=`\n        else\n            m[${t-1}] = value;\n        `;const n=`\n      void setVecItem(out int m[${t}], int index, int value) {\n        ${e}\n      }\n        `;return{setVecItem:new r.GlslLibRoutine(n)}}getVecItem(){const t=this.context.outputTextureLayout.shape.length;let e=`\n        if(index < 0)\n            index = ${t} + index;\n        if (index == 0)\n            return m[0];\n      `;for(let n=1;n<t-1;++n)e+=`\n        else if (index == ${n})\n            return m[${n}];\n      `;e+=`\n        else\n            return m[${t-1}];\n        `;const n=`\n      int getVecItem(int m[${t}], int index) {\n        ${e}\n      }\n    `;return{getVecItem:new r.GlslLibRoutine(n)}}}e.VecGlslLib=i},8316:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.WebGLInferenceHandler=void 0;const r=n(6231),i=n(9162),o=n(2517),a=n(2403),s=n(7019),u=n(8710),c=n(5611),l=n(4057),p=n(2039);e.WebGLInferenceHandler=class{constructor(t){this.session=t,this.packedTextureDataCache=new Map,this.unpackedTextureDataCache=new Map}calculateTextureWidthAndHeight(t,e){return(0,l.calculateTextureWidthAndHeight)(this.session.layoutStrategy,t,e)}executeProgram(t,e){if(e.length<t.inputNames.length)throw new Error(`Input size mustn't be less than ${t.inputNames.length}.`);if(t.inputNames.length!==t.inputTypes.length)throw new Error("input names size does not match input types");const n=[];for(let r=0;r<t.inputNames.length;++r)n[r]=this.getOrCreateTextureData(e[r],t.inputTypes[r]);const r=((t,e)=>{const n=e.map((t=>`${t.unpackedShape.join(",")};${t.width}x${t.height}`)).join("_");let r=t.name;return t.cacheHint&&(r+="["+t.cacheHint+"]"),r+=":"+n,r})(t,n);let i=this.session.programManager.getArtifact(r);const o=i?i.programInfo:"function"==typeof t.get?t.get():t,a=(0,l.createTextureLayoutFromTextureType)(this.session.layoutStrategy,o.output.dims,o.output.textureType),s=this.createTextureData(a,o.output.type);return i||(i=this.session.programManager.build(o,n,s),this.session.programManager.setArtifact(r,i)),this.runProgram(i,n,s),s}run(t,e){return this.executeProgram(t,e).tensor}runProgram(t,e,n){for(let n=0;n<e.length;++n)if(!!e[n].isPacked!=(t.programInfo.inputTypes[n]===p.TextureType.packed))throw new Error(`input[${n}] property packed inconsistent`);if(!!n.isPacked!=(t.programInfo.output.textureType===p.TextureType.packed))throw new Error("output property packed inconsistent");this.session.programManager.run(t,e,n)}getOrCreateTextureData(t,e){let n=this.getTextureData(t.dataId,e===p.TextureType.packed);if(!n&&(n=this.getTextureData(t.dataId,e!==p.TextureType.packed),n))return e===p.TextureType.packed?this.pack(n):this.unpack(n);if(!n){const r=(0,l.createTextureLayoutFromTextureType)(this.session.layoutStrategy,t.dims,e);if(e===p.TextureType.packedLastDimension){const n=1,r=4,i=t.dims;if(4===i.length){const o=[i[0],Math.ceil(i[1]*i[2]*i[3]/r)],a=(0,l.createTextureLayoutFromTextureType)(this.session.layoutStrategy,o,e);let s=t.numberData;if(i[1]*i[2]*i[3]%r!=0){const e=i[0],o=i[1]*i[2]*i[3],a=Math.ceil(o*n/r)*r;s=new Float32Array(e*a);for(let r=0;r<e;++r){const e=r*o,i=r*a+r%n*o;s.set(t.numberData.subarray(e,e+o),i)}}return this.createTextureData(a,t.type,s,t,1)}}if(e===p.TextureType.packed){const e=(0,l.createTextureLayoutFromShape)(this.session.layoutStrategy,t.dims,1,[],{reverseWH:!0}),r=this.createTextureData(e,t.type,t.numberData,t,1);n=this.pack(r)}else n=this.createTextureData(r,t.type,t.numberData,t,1)}return n}createTextureDataFromLayoutBindTensor(t,e,n,r){return this.createTextureData(t,e,n,r,1)}createTextureData(t,e,n,i,o){r.Logger.verbose("InferenceHandler",`Creating TextureData: layout:[${JSON.stringify(t)}]`);const a=this.session.textureManager.createTextureFromLayout(e,t,n,o);return this.createTextureDataFromTexture(t,e,a,i)}reshapeUnpacked(t,e){const n=this.getOrCreateTextureData(t,p.TextureType.unpacked),r={channels:n.channels,height:n.height,width:n.width,shape:0!==e.length?e:[1],strides:o.ShapeUtil.computeStrides(e),unpackedShape:e};return this.createTextureDataFromTexture(r,t.type,n.texture).tensor}reshapePacked(t,e){const n=this.getOrCreateTextureData(t,p.TextureType.packed);if((0,s.isReshapeCheap)(t.dims,e)){const r={channels:n.channels,height:n.height,width:n.width,shape:0!==e.length?e:[1],strides:o.ShapeUtil.computeStrides(e),unpackedShape:e,isPacked:!0};return this.createTextureDataFromTexture(r,t.type,n.texture).tensor}const r=(0,s.processDims3D)(t.dims),i=(0,s.processDims3D)(e),a=this.reshapePacked(t,r),u=this.run((0,s.createPackedReshape3DProgramInfoLoader)(this,a,i),[a]);return this.reshapePacked(u,e)}cast(t,e){const n=this.getOrCreateTextureData(t,p.TextureType.unpacked);return this.createTextureDataFromTexture(n,e,n.texture).tensor}createTextureDataFromTexture(t,e,n,r,o){const a=Object.assign(Object.assign({},t),{tensor:r||new i.Tensor(t.unpackedShape,e,(t=>this.readTexture(a)),(async t=>this.readTextureAsync(a)),void 0,o),texture:n});return this.setTextureData(a.tensor.dataId,a,t.isPacked),a}getTextureData(t,e=!1){return this.session.isInitializer(t)?this.session.getTextureData(t,e):e?this.packedTextureDataCache.get(t):this.unpackedTextureDataCache.get(t)}setTextureData(t,e,n=!1){this.session.isInitializer(t)?this.session.setTextureData(t,e,n):(n?this.packedTextureDataCache:this.unpackedTextureDataCache).set(t,e)}isTextureLayoutCached(t,e=!1){return!!this.getTextureData(t.dataId,e)}dispose(){this.session.textureManager.clearActiveTextures(),this.packedTextureDataCache.forEach((t=>this.session.textureManager.releaseTexture(t))),this.packedTextureDataCache=new Map,this.unpackedTextureDataCache.forEach((t=>this.session.textureManager.releaseTexture(t))),this.unpackedTextureDataCache=new Map}readTexture(t){return t.isPacked?this.readTexture(this.unpack(t)):this.session.backend.glContext.isFloat32DownloadSupported?this.session.textureManager.readTexture(t,t.tensor.type,t.channels):this.session.textureManager.readUint8TextureAsFloat((0,u.encodeAsUint8)(this,t))}async readTextureAsync(t){return t.isPacked?this.readTextureAsync(this.unpack(t)):this.session.backend.glContext.isFloat32DownloadSupported?this.session.textureManager.readTextureAsync(t,t.tensor.type,t.channels):this.session.textureManager.readUint8TextureAsFloat((0,u.encodeAsUint8)(this,t))}pack(t){return this.executeProgram((0,a.createPackProgramInfoLoader)(this,t.tensor),[t.tensor])}unpack(t){return this.executeProgram((0,c.createUnpackProgramInfoLoader)(this,t.tensor),[t.tensor])}}},1640:function(t,e,n){"use strict";var r=this&&this.__createBinding||(Object.create?function(t,e,n,r){void 0===r&&(r=n);var i=Object.getOwnPropertyDescriptor(e,n);i&&!("get"in i?!e.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(t,r,i)}:function(t,e,n,r){void 0===r&&(r=n),t[r]=e[n]}),i=this&&this.__setModuleDefault||(Object.create?function(t,e){Object.defineProperty(t,"default",{enumerable:!0,value:e})}:function(t,e){t.default=e}),o=this&&this.__importStar||function(t){if(t&&t.__esModule)return t;var e={};if(null!=t)for(var n in t)"default"!==n&&Object.prototype.hasOwnProperty.call(t,n)&&r(e,t,n);return i(e,t),e};Object.defineProperty(e,"__esModule",{value:!0}),e.WEBGL_OP_RESOLVE_RULES=void 0;const a=n(2898),s=o(n(7839)),u=n(4196),c=n(2069),l=n(8138),p=n(9663),f=n(5193),d=n(7992),h=n(1253),g=n(4776),b=n(6572),m=n(3346),y=n(5623),_=n(2870),v=n(2143),w=n(4939),x=n(718),T=n(2268),S=n(8117),O=n(2278),A=n(5524),E=n(5975),I=n(3933),P=n(6558),D=n(5723),$=n(3738),k=o(n(4909)),C=n(8428),F=n(9793);e.WEBGL_OP_RESOLVE_RULES=[["Abs","","6+",k.abs],["Acos","","7+",k.acos],["Add","","7+",s.add],["And","","7+",s.and],["Asin","","7+",k.asin],["Atan","","7+",k.atan],["AveragePool","","7+",v.averagePool,v.parseAveragePoolAttributes],["BatchNormalization","","7+",a.batchNormalization,a.parseBatchNormalizationAttributes],["Cast","","6+",u.cast,u.parseCastAttributes],["Ceil","","6+",k.ceil],["Clip","","6-10",k.clip,k.parseClipAttributes],["Clip","","11+",k.clipV11],["Concat","","4+",c.concat,c.parseConcatAttributes],["Conv","","1+",l.conv,l.parseConvAttributes],["ConvTranspose","","1+",p.convTranspose,p.parseConvTransposeAttributes],["Cos","","7+",k.cos],["Div","","7+",s.div],["Dropout","","7+",k.identity],["DepthToSpace","","1+",f.depthToSpace,f.parseDepthToSpaceAttributes],["Equal","","7+",s.equal],["Elu","","6+",k.elu,k.parseEluAttributes],["Exp","","6+",k.exp],["Flatten","","1+",d.flatten,d.parseFlattenAttributes],["Floor","","6+",k.floor],["FusedConv","com.microsoft","1+",l.conv,l.parseConvAttributes],["Gather","","1+",h.gather,h.parseGatherAttributes],["Gemm","","7-10",g.gemm,g.parseGemmAttributesV7],["Gemm","","11+",g.gemm,g.parseGemmAttributesV11],["GlobalAveragePool","","1+",v.globalAveragePool,v.parseGlobalAveragePoolAttributes],["GlobalMaxPool","","1+",v.globalMaxPool],["Greater","","7+",s.greater],["Identity","","1+",k.identity],["ImageScaler","","1+",b.imageScaler,b.parseImageScalerAttributes],["InstanceNormalization","","6+",m.instanceNormalization,m.parseInstanceNormalizationAttributes],["LeakyRelu","","6+",k.leakyRelu,k.parseLeakyReluAttributes],["Less","","7+",s.less],["Log","","6+",k.log],["MatMul","","1+",y.matMul,y.parseMatMulAttributes],["MaxPool","","1+",v.maxPool,v.parseMaxPoolAttributes],["Mul","","7+",s.mul],["Neg","","6+",k.neg],["Not","","1+",k.not],["Or","","7+",s.or],["Pad","","2-10",_.padV2,_.parsePadAttributesV2],["Pad","","11+",_.padV11,_.parsePadAttributesV11],["Pow","","7+",s.pow],["PRelu","","7+",s.pRelu],["ReduceLogSum","","1+",w.reduceLogSum,w.parseReduceAttributes],["ReduceMax","","1+",w.reduceMax,w.parseReduceAttributes],["ReduceMean","","1+",w.reduceMean,w.parseReduceAttributes],["ReduceMin","","1+",w.reduceMin,w.parseReduceAttributes],["ReduceProd","","1+",w.reduceProd,w.parseReduceAttributes],["ReduceSum","","1-12",w.reduceSum,w.parseReduceAttributes],["ReduceSumSquare","","1+",w.reduceLogSumSquare,w.parseReduceAttributes],["Relu","","6+",k.relu],["Reshape","","5+",x.reshape],["Resize","","10",T.resize,T.parseResizeAttributesV10],["Resize","","11+",T.resize,T.parseResizeAttributesV11],["Shape","","1+",S.shape],["Sigmoid","","6+",k.sigmoid],["Sin","","7+",k.sin],["Slice","","10+",O.sliceV10],["Slice","","1-9",O.slice,O.parseSliceAttributes],["Softmax","","1-12",A.softmax,A.parseSoftmaxAttributes],["Softmax","","13+",A.softmaxV13,A.parseSoftmaxAttributesV13],["Split","","2-12",E.split,E.parseSplitAttributes],["Sqrt","","6+",k.sqrt],["Squeeze","","1-12",I.squeeze,I.parseSqueezeAttributes],["Squeeze","","13+",I.squeezeV13],["Sub","","7+",s.sub],["Sum","","6+",P.sum],["Tan","","7+",k.tan],["Tanh","","6+",k.tanh],["Tile","","6+",D.tile],["Transpose","","1+",$.transpose,$.parseTransposeAttributes],["Upsample","","7-8",F.upsample,F.parseUpsampleAttributesV7],["Upsample","","9",F.upsample,F.parseUpsampleAttributesV9],["Unsqueeze","","1-12",C.unsqueeze,C.parseUnsqueezeAttributes],["Unsqueeze","","13+",C.unsqueezeV13],["Xor","","7+",s.xor]]},2898:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseBatchNormalizationAttributes=e.batchNormalization=void 0;const r=n(246),i=n(5060),o=n(2039),a={name:"BatchNormalization",inputNames:["A","Scale","B","Mean","Variance"],inputTypes:[o.TextureType.unpacked,o.TextureType.unpacked,o.TextureType.unpacked,o.TextureType.unpacked,o.TextureType.unpacked]};e.batchNormalization=(t,e,n)=>(u(e),[t.run(Object.assign(Object.assign({},a),{cacheHint:n.cacheKey,get:()=>s(t,e,n)}),e)]),e.parseBatchNormalizationAttributes=t=>{const e=t.attributes.getFloat("epsilon",1e-5),n=t.attributes.getFloat("momentum",.9),i=t.attributes.getInt("spatial",1);return(0,r.createAttributeWithCacheKey)({epsilon:e,momentum:n,spatial:i})};const s=(t,e,n)=>{const r=(0,i.getGlsl)(t.session.backend.glContext.version),s=e[0].dims.length,[u,c]=t.calculateTextureWidthAndHeight(e[1].dims,o.TextureType.unpacked),l=`\n  float process(int[${s}] indices) {\n    vec2 position = offsetToCoords(indices[1], ${u}, ${c});\n    float scale = getColorAsFloat(${r.texture2D}(Scale, position));\n    float mean = getColorAsFloat(${r.texture2D}(Mean, position));\n    float variance = getColorAsFloat(${r.texture2D}(Variance, position));\n    float b = getColorAsFloat(${r.texture2D}(B, position));\n\n    return scale * ( (_A(indices) - mean) / sqrt(variance + float(${n.epsilon})) ) + b;\n  }`;return Object.assign(Object.assign({},a),{output:{dims:e[0].dims,type:e[0].type,textureType:o.TextureType.unpacked},shaderSource:l})},u=t=>{if(!t||5!==t.length)throw new Error("BatchNormalization requires 5 inputs.");const e=t[0],n=t[1],r=t[2],i=t[3],o=t[4];if(e.dims.length<3||1!==n.dims.length||1!==r.dims.length||1!==i.dims.length||1!==o.dims.length)throw new Error("invalid input shape.");if(n.dims[0]!==e.dims[1]||r.dims[0]!==e.dims[1]||i.dims[0]!==e.dims[1]||o.dims[0]!==e.dims[1])throw new Error("invalid input shape.");if("float32"!==e.type&&"float64"!==e.type||"float32"!==n.type&&"float64"!==n.type||"float32"!==r.type&&"float64"!==r.type||"float32"!==i.type&&"float64"!==i.type||"float32"!==o.type&&"float64"!==o.type)throw new Error("invalid input tensor types.")}},7839:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.xor=e.sub=e.pRelu=e.pow=e.or=e.mul=e.less=e.greater=e.equal=e.div=e.and=e.add=e.glslPRelu=e.glslPow=e.glslXor=e.glslOr=e.glslAnd=e.glslLess=e.glslGreater=e.glslEqual=e.glslSub=e.glslMul=e.glslDiv=e.glslAdd=void 0;const r=n(2517),i=n(8520),o=n(5060),a=n(2039);function s(){const t="add_";return{body:`\n  float ${t}(float a, float b) {\n    return a + b;\n  }\n  vec4 ${t}(vec4 v1, vec4 v2) {\n    return v1 + v2;\n  }\n  `,name:t,type:i.FunctionType.ValueBased}}function u(){const t="div_";return{body:`\n  float ${t}(float a, float b) {\n    return a / b;\n  }\n  vec4 ${t}(vec4 v1, vec4 v2) {\n    return v1 / v2;\n  }\n  `,name:t,type:i.FunctionType.ValueBased}}function c(){const t="mul_";return{body:`\n  float ${t}(float a, float b) {\n    return a * b;\n  }\n  vec4 ${t}(vec4 v1, vec4 v2) {\n    return v1 * v2;\n  }\n  `,name:t,type:i.FunctionType.ValueBased}}function l(){const t="sub_";return{body:`\n  float ${t}(float a, float b) {\n    return a - b;\n  }\n  vec4 ${t}(vec4 v1, vec4 v2) {\n    return v1 - v2;\n  }\n  `,name:t,type:i.FunctionType.ValueBased}}function p(){const t="equal_";return{body:`\n  float ${t}(float a, float b) {\n    return float(a == b);\n  }\n  vec4 ${t}(vec4 v1, vec4 v2) {\n    return vec4(equal(v1, v2));\n  }\n  `,name:t,type:i.FunctionType.ValueBased}}function f(){const t="greater_";return{body:`\n  float ${t}(float a, float b) {\n    return float(a > b);\n  }\n  vec4 ${t}(vec4 v1, vec4 v2) {\n    return vec4( v1.r > v2.r ,\n      v1.g > v2.g,\n      v1.b > v2.b,\n      v1.a > v2.a );\n  }\n  `,name:t,type:i.FunctionType.ValueBased}}function d(){const t="less_";return{body:`\n  float ${t}(float a, float b) {\n    return float(a < b);\n  }\n  vec4 ${t}(vec4 v1, vec4 v2) {\n    return vec4( v1.r < v2.r ,\n                v1.g < v2.g,\n                v1.b < v2.b,\n                v1.a < v2.a );\n  }\n  `,name:t,type:i.FunctionType.ValueBased}}function h(){const t="and_";return{body:`\n  float ${t}(float a, float b) {\n    return float( bool(a) && bool(b) );\n  }\n  vec4 ${t}(vec4 v1, vec4 v2) {\n    bvec4 b1 = bvec4(v1);\n    bvec4 b2 = bvec4(v2);\n    return vec4( b1.r && b2.r ,\n                b1.g && b2.g,\n                b1.b && b2.b,\n                b1.a && b2.a );\n  }\n  `,name:t,type:i.FunctionType.ValueBased}}function g(){const t="or_";return{body:`\n  float ${t}(float a, float b) {\n    return float( bool(a) || bool(b) );\n  }\n  vec4 ${t}(vec4 v1, vec4 v2) {\n    bvec4 b1 = bvec4(v1);\n    bvec4 b2 = bvec4(v2);\n    return vec4( b1.r || b2.r ,\n                b1.g || b2.g,\n                b1.b || b2.b,\n                b1.a || b2.a );\n  }\n  `,name:t,type:i.FunctionType.ValueBased}}function b(){const t="xor_";return{body:`\n  float ${t}(float a, float b) {\n    return float( bool(a) ^^ bool(b) );\n  }\n  vec4 ${t}(vec4 v1, vec4 v2) {\n    bvec4 b1 = bvec4(v1);\n    bvec4 b2 = bvec4(v2);\n    return vec4( b1.r ^^ b2.r ,\n                b1.g ^^ b2.g,\n                b1.b ^^ b2.b,\n                b1.a ^^ b2.a );\n  }\n  `,name:t,type:i.FunctionType.ValueBased}}function m(){return function(t){const e=`${t}_`;return{body:`\n  float ${e}(float a, float b) {\n    return ${t}(a, b);\n  }\n  vec4 ${e}(vec4 v1, vec4 v2) {\n    return ${t}(v1, v2);\n  }\n  `,name:e,type:i.FunctionType.ValueBased}}("pow")}function y(){const t="prelu_";return{body:`\n  float ${t}(float a, float b) {\n    return a < 0.0 ? a * b: a;\n  }\n  vec4 ${t}(vec4 v1, vec4 v2) {\n    return vec4(\n      v1.r < 0.0 ? v1.r * v2.r: v1.r,\n      v1.g < 0.0 ? v1.g * v2.g: v1.g,\n      v1.b < 0.0 ? v1.b * v2.b: v1.b,\n      v1.a < 0.0 ? v1.a * v2.a: v1.a\n      );\n  }\n  `,name:t,type:i.FunctionType.ValueBased}}e.glslAdd=s,e.glslDiv=u,e.glslMul=c,e.glslSub=l,e.glslEqual=p,e.glslGreater=f,e.glslLess=d,e.glslAnd=h,e.glslOr=g,e.glslXor=b,e.glslPow=m,e.glslPRelu=y;const _=(t,e,n,r=e[0].type,i)=>{const o=t.session.pack?a.TextureType.packed:a.TextureType.unpacked;return{name:n.name,inputNames:["A","B"],inputTypes:[o,o],cacheHint:i,get:()=>v(t,e,n,r)}},v=(t,e,n,i=e[0].type)=>{const s=t.session.pack?a.TextureType.packed:a.TextureType.unpacked,u=!r.ShapeUtil.areEqual(e[0].dims,e[1].dims);let c=e[0].dims;const l=t.session.pack;if(u){const a=r.BroadcastUtil.calcShape(e[0].dims,e[1].dims,!1);if(!a)throw new Error("Can't perform binary op on the given tensors");c=a;const u=c.length,p=0!==e[0].dims.length?e[0].dims.length:1,f=0!==e[1].dims.length?e[1].dims.length:1,d=0!==e[0].dims.length?"bcastIndices_A(indices, aindices);":"aindices[0] = 0;",h=0!==e[1].dims.length?"bcastIndices_B(indices, bindices);":"bindices[0] = 0;",g=(0,o.getGlsl)(t.session.backend.glContext.version),b=l?`\n      ${n.body}\n      void main() {\n        vec4 a = getAAtOutCoords();\n        vec4 b = getBAtOutCoords();\n        vec4 result = ${n.name}(a, b);\n        ${g.output} = result;\n      }`:`\n      ${n.body}\n      float process(int indices[${u}]) {\n        int aindices[${p}];\n        int bindices[${f}];\n        ${d}\n        ${h}\n        return ${n.name}(_A(aindices), _B(bindices));\n      }`;return{name:n.name,inputNames:["A","B"],inputTypes:[s,s],output:{dims:c,type:i,textureType:s},shaderSource:b,hasMain:l}}const p=(0,o.getGlsl)(t.session.backend.glContext.version),f=`\n    ${n.body}\n    void main() {\n      vec4 v1 = ${p.texture2D}(A, TexCoords);\n      vec4 v2 = ${p.texture2D}(B, TexCoords);\n      vec4 result = ${n.name}(v1, v2);\n      ${p.output} = result;\n    }\n    `;return{name:n.name,inputNames:["A","B"],inputTypes:[s,s],output:{dims:e[0].dims,type:i,textureType:s},shaderSource:f,hasMain:!0}};e.add=(t,e)=>[t.run(_(t,e,s()),e)],e.and=(t,e)=>[t.run(_(t,e,h(),"bool"),e)],e.div=(t,e)=>[t.run(_(t,e,u()),e)],e.equal=(t,e)=>[t.run(_(t,e,p(),"bool"),e)],e.greater=(t,e)=>[t.run(_(t,e,f(),"bool"),e)],e.less=(t,e)=>[t.run(_(t,e,d(),"bool"),e)],e.mul=(t,e)=>[t.run(_(t,e,c()),e)],e.or=(t,e)=>[t.run(_(t,e,g(),"bool"),e)],e.pow=(t,e)=>[t.run(_(t,e,m()),e)],e.pRelu=(t,e)=>[t.run(_(t,e,y()),e)],e.sub=(t,e)=>[t.run(_(t,e,l()),e)],e.xor=(t,e)=>[t.run(_(t,e,b(),"bool"),e)]},4196:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseCastAttributes=e.cast=void 0;const r=n(2517);e.cast=(t,e,n)=>(i(e),[t.cast(e[0],n)]),e.parseCastAttributes=t=>r.ProtoUtil.tensorDataTypeFromProto(t.attributes.getInt("to"));const i=t=>{if(!t||1!==t.length)throw new Error("Cast requires 1 input.");if("string"===t[0].type)throw new Error("Invalid input type.")}},1163:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.createPackedConcatProgramInfoLoader=void 0;const r=n(5060),i=n(2039),o=n(9390),a=n(2827);e.createPackedConcatProgramInfoLoader=(t,e,n)=>{const u=(c=e.length,l=n.cacheKey,{name:"Concat (packed)",inputNames:Array.from({length:c},((t,e)=>`X${e}`)),inputTypes:Array(c).fill(i.TextureType.packed),cacheHint:l});var c,l;return Object.assign(Object.assign({},u),{get:()=>((t,e,n,u)=>{const c=n[0].dims.slice();if(u>=c.length||u<-1*c.length)throw new Error("axis specified for concat doesn't match input dimensionality");u<0&&(u=c.length+u);const l=c.slice(0);for(let t=1;t<n.length;t++){const e=n[t].dims.slice();for(let t=0;t<c.length;t++)if(t===u)l[u]+=e[t];else if(c[t]!==e[t])throw new Error("non concat dimensions must match")}const p=l.length,f=(0,a.getChannels)("coords",p),d=(0,o.getCoordsDataType)(p),h=(0,a.unpackFromChannel)(),g=n.map((t=>t.dims)),b=(0,o.getGlChannels)(p),m=new Array(g.length-1);m[0]=g[0][u];for(let t=1;t<m.length;t++)m[t]=m[t-1]+g[t][u];const y=b[u],_=b.slice(-2),v=b.join();let w=`if (${y} < ${m[0]}) {\n        return getChannel(\n            getX0(${v}), vec2(${_.join()}));\n        }`;for(let t=1;t<m.length;t++){const e=m[t-1];w+=`\n            if (${y} < ${m[t]}  && ${y} >= ${m[t-1]}) {\n              return getChannel(\n                getX${t}(${s(b,y,e)}),\n                vec2(${s(_,y,e)}));\n            }`}const x=m.length,T=m[m.length-1];w+=`\n            return getChannel(\n              getX${x}(${s(b,y,T)}),\n              vec2(${s(_,y,T)}));`;const S=(0,r.getGlsl)(t.session.backend.glContext.version),O=`\n          ${h}\n          float getValue(${b.map((t=>"int "+t))}) {\n            ${w}\n          }\n\n          void main() {\n            ${d} coords = getOutputCoords();\n            int lastDim = coords.${b[p-1]};\n            coords.${b[p-1]} = coords.${b[p-2]};\n            coords.${b[p-2]} = lastDim;\n\n            vec4 result = vec4(getValue(${f}), 0., 0., 0.);\n\n            ${f[p-1]} = ${f[p-1]} + 1;\n            if (${f[p-1]} < ${l[p-1]}) {\n              result.g = getValue(${f});\n            }\n\n            ${f[p-2]} = ${f[p-2]} + 1;\n            if (${f[p-2]} < ${l[p-2]}) {\n              result.a = getValue(${f});\n            }\n\n            ${f[p-1]} = ${f[p-1]} - 1;\n            if (${f[p-2]} < ${l[p-2]} &&\n                ${f[p-1]} < ${l[p-1]}) {\n              result.b = getValue(${f});\n            }\n            ${S.output} = result;\n          }\n        `;return Object.assign(Object.assign({},e),{output:{dims:l,type:n[0].type,textureType:i.TextureType.packed},shaderSource:O,hasMain:!0})})(t,u,e,n.axis)})};const s=(t,e,n)=>{const r=t.indexOf(e);return t.map(((t,e)=>e===r?`${t} - ${n}`:t)).join()}},2069:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseConcatAttributes=e.concat=void 0;const r=n(246),i=n(2039),o=n(1163);e.concat=(t,e,n)=>(p(e),t.session.pack&&e[0].dims.length>1?[t.run((0,o.createPackedConcatProgramInfoLoader)(t,e,n),e)]:[t.run(a(t,e,n),e)]);const a=(t,e,n)=>{const r=(o=e.length,a=n.cacheKey,{name:"Concat",inputNames:Array.from({length:o},((t,e)=>`X${e}`)),inputTypes:Array(o).fill(i.TextureType.unpacked),cacheHint:a});var o,a;return Object.assign(Object.assign({},r),{get:()=>((t,e,n,r)=>{const o=n[0].dims.slice();if(r>=o.length||r<-1*o.length)throw new Error("axis specified for concat doesn't match input dimensionality");r<0&&(r=o.length+r);const a=o.slice(0);for(let t=1;t<n.length;t++){const e=n[t].dims.slice();for(let t=0;t<o.length;t++)if(t===r)a[r]+=e[t];else if(o[t]!==e[t])throw new Error("non concat dimensions must match")}const p=a.length,f=new Array(n.length);let d=0;for(let t=0;t<f.length;++t)d+=n[t].dims[r],f[t]=d;let h="";h=n.length<5?s(f):u(f);const g=`\n        ${c(n.length,p)}\n        ${l(f)}\n        ${h}\n        float process(int indices[${p}]) {\n          int textureIndex = getTextureWhereDataResides (indices[${r}]);\n\n          if(textureIndex != 0) {\n            indices[${r}] = indices[${r}] - int(getSizeInConcatAxisValueFromIndex(textureIndex-int(1)));\n          }\n\n          return fetchDataFromCorrectTexture(textureIndex, indices);\n        }`;return Object.assign(Object.assign({},e),{output:{dims:a,type:n[0].type,textureType:i.TextureType.unpacked},shaderSource:g})})(0,r,e,n.axis)})},s=t=>`int getTextureWhereDataResides(int index) {\n      ${t.map(((t,e)=>`if(index<${t}) {return ${e};}\n`)).join("")}\n    }`,u=t=>s(t),c=(t,e)=>{const n=[`float fetchDataFromCorrectTexture(int textureIndex, int indices[${e}]) {`];for(let e=0;e<t;++e)0===e?n.push(`\tif (textureIndex == ${e}) { return _X${e}(indices); }`):e===t-1?n.push(`\telse { return _X${e}(indices); }`):n.push(`\telse if (textureIndex == ${e}) { return _X${e}(indices); }`);return n.push("\t}"),n.join("\n")},l=t=>{const e=["int getSizeInConcatAxisValueFromIndex(int index) {"];for(let n=0;n<t.length;++n)0===n?e.push(`\tif (index == ${n}) { return ${t[n]}; }`):n===t.length-1?e.push(`\telse { return ${t[n]}; }`):e.push(`\telse if (index == ${n}) { return ${t[n]}; }`);return e.push("\t}"),e.join("\n")};e.parseConcatAttributes=t=>(0,r.createAttributeWithCacheKey)({axis:t.attributes.getInt("axis")});const p=t=>{if(!t||t.length<1)throw new Error("too few inputs");const e=t[0].type,n=t[0].dims.length;if("string"===e)throw new Error("string tensor is not supported yet");for(const r of t){if(r.type!==e)throw new Error("input tensors should be one type");if(r.dims.length!==n)throw new Error("input tensors should have the same shape")}}},4770:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.createUnpackedGroupedConvProgramInfoLoader=void 0;const r=n(6231),i=n(5060),o=n(2039),a=n(8138),s=n(2823);e.createUnpackedGroupedConvProgramInfoLoader=(t,e,n)=>{const u=(c=e.length>2,l=n.cacheKey,{name:"GroupedConv",inputNames:c?["X","W","Bias"]:["X","W"],inputTypes:c?[o.TextureType.unpacked,o.TextureType.unpacked,o.TextureType.unpacked]:[o.TextureType.unpacked,o.TextureType.unpacked],cacheHint:l});var c,l;return Object.assign(Object.assign({},u),{get:()=>((t,e,n,u)=>{const c=e.length>2?"value += getBias(output_channel);":"",l=e[0].dims.slice(),p=e[1].dims.slice(),f=p[0]/u.group;r.Logger.verbose("GroupedConv",`autpPad:${u.autoPad}, dilations:${u.dilations}, group:${u.group}, kernelShape:${u.kernelShape}, pads:${u.pads}, strides:${u.strides}`);const d=(0,a.calculateOutputShape)(l,p,u.dilations,u.pads,u.strides),h=(0,i.getGlsl)(t.session.backend.glContext.version),{activationFunction:g,applyActivation:b}=(0,s.getActivationSnippet)(u),m=`\n  const ivec2 strides = ivec2(${u.strides[0]}, ${u.strides[1]});\n  const ivec2 pads = ivec2(${u.pads[0]}, ${u.pads[1]});\n  ${g}\n  void main() {\n    ivec4 coords = getOutputCoords();\n    int batch = coords.x;\n    int output_channel = coords.y;\n    ivec2 xRCCorner = coords.zw * strides - pads;\n    int group_id = output_channel / ${f};\n\n    float value = 0.0;\n    for (int wInChannel = 0; wInChannel < ${p[1]}; wInChannel++) {\n      int input_channel = group_id * ${p[1]} + wInChannel;\n      for (int wHeight = 0; wHeight < ${p[2]}; wHeight++) {\n        int xHeight = xRCCorner.x + wHeight * ${u.dilations[0]};\n\n        if (xHeight < 0 || xHeight >= ${l[2]}) {\n          continue;\n        }\n\n        for (int wWidth = 0; wWidth < ${p[3]}; wWidth++) {\n          int xWidth = xRCCorner.y + wWidth * ${u.dilations[1]};\n          if (xWidth < 0 || xWidth >= ${l[3]}) {\n            continue;\n          }\n\n          float xVal = getX(batch, input_channel, xWidth, xHeight);\n          float wVal = getW(output_channel, wInChannel, wWidth, wHeight);\n          value += xVal*wVal;\n        }\n      }\n    }\n    ${c}\n    ${b}\n    ${h.output} = vec4(value, .0, .0, .0);\n  }\n`;return Object.assign(Object.assign({},n),{output:{dims:d,type:e[0].type,textureType:o.TextureType.unpacked},shaderSource:m,hasMain:!0})})(t,e,u,n)})}},1386:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.conv2DPacked=e.conv2DPackedPointwise=void 0;const r=n(8138),i=n(8555),o=n(708);e.conv2DPackedPointwise=(t,e,n)=>{const i=e[0].dims,a=e[1].dims,s=(0,r.calculateOutputShape)(i,a,n.dilations,n.pads,n.strides),u=t.reshapePacked(e[0],[i[1],i[2]*i[3]]),c=t.reshapePacked(e[1],[a[0],a[1]]),l=e.length>2?[c,u,e[2]]:[c,u],p=t.run((0,o.createPackedMatmulProgramInfoLoader)(t,l,n),l);return t.reshapePacked(p,s)},e.conv2DPacked=(t,e,n)=>{const a=e[0].dims,s=e[1].dims,u=(0,r.calculateOutputShape)(a,s,n.dilations,n.pads,n.strides),c=t.run((0,i.createPackedIm2ColProgramInfoLoader)(t,e[0],e[1],u,n),[e[0]]),l=t.reshapePacked(e[1],[s[0],s[1]*s[2]*s[3]]),p=3===e.length?[l,c,e[2]]:[l,c],f=t.run((0,o.createPackedMatmulProgramInfoLoader)(t,p,n),p);return t.reshapePacked(f,u)}},9663:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseConvTransposeAttributes=e.convTranspose=void 0;const r=n(246),i=n(5060),o=n(2039),a=n(2823),s=(t,e,n,r,i,o)=>(t-1)*e+n+(r-1)*i+1-o,u=(t,e,n,r,i)=>{const o=Math.floor(t/2);"SAME_UPPER"===e?(n[r]=o,n[i]=t-o):"SAME_LOWER"===e&&(n[r]=t-o,n[i]=o)};e.convTranspose=(t,e,n)=>(f(e,n),c(t,e,n));const c=(t,e,n)=>{const r=p(n,e);return[l(t,e,r)]},l=(t,e,n)=>t.run(((t,e,n)=>{const r=(s=e.length>2,u=n.cacheKey,{name:"ConvTranspose",inputNames:s?["X","W","B"]:["X","W"],inputTypes:s?[o.TextureType.unpacked,o.TextureType.unpacked,o.TextureType.unpacked]:[o.TextureType.unpacked,o.TextureType.unpacked],cacheHint:u});var s,u;return Object.assign(Object.assign({},r),{get:()=>((t,e,n,r)=>{const s=e.length>2?"getB(output_channel)":"0.0",u=e[0].dims,c=e[1].dims,l=c[1],p=c[0]/r.group,f=[e[0].dims[0],e[1].dims[1]*r.group,...r.outputShape],d=(0,i.getGlsl)(t.session.backend.glContext.version),{activationFunction:h,applyActivation:g}=(0,a.getActivationSnippet)(r),b=`\n  const ivec2 strides = ivec2(${r.strides[0]}, ${r.strides[1]});\n  const ivec2 pads = ivec2(${r.pads[0]}, ${r.pads[1]});\n  ${h}\n  void main() {\n    ivec4 coords = getOutputCoords();\n    int batch = coords.x;\n    int output_channel = coords.y;\n\n    ivec2 loc = coords.zw + pads;\n\n    int group_id = output_channel / ${l};\n    int wOutChannel = output_channel - group_id * ${l};\n\n    float value = ${s};\n    for (int inChannelOffset = 0; inChannelOffset < ${p}; inChannelOffset++) {\n      int input_channel = group_id * ${p} + inChannelOffset;\n      for (int wWOff = 0; wWOff < ${c[2]}; wWOff++) {\n        for (int wHOff = 0; wHOff < ${c[3]}; wHOff++) {\n          ivec2 wOff = ivec2(wWOff * ${r.dilations[0]}, wHOff * ${r.dilations[1]});\n          ivec2 wLoc = loc - wOff;\n          ivec2 wLocIn = wLoc / strides;\n          if (\n            wLocIn * strides == wLoc &&\n            wLocIn.x >= 0 && wLocIn.x < ${u[2]} &&\n            wLocIn.y >= 0 && wLocIn.y < ${u[3]}\n          ) {\n            float xVal = getX(batch, input_channel, wLocIn.y, wLocIn.x);\n            float wVal = getW(input_channel, wOutChannel, wHOff, wWOff);\n            value += xVal * wVal;\n          }\n        }\n      }\n    }\n    ${g}\n    ${d.output} = vec4(value, .0, .0, .0);\n  }\n`;return Object.assign(Object.assign({},n),{output:{dims:f,type:e[0].type,textureType:o.TextureType.unpacked},shaderSource:b,hasMain:!0})})(t,e,r,n)})})(t,e,n),e),p=(t,e)=>{const n=t.kernelShape.slice();if(0===t.kernelShape.length)for(let t=2;t<e[1].dims.length;++t)n.push(e[1].dims[t]);const r=t.pads.slice(),i=t.outputShape.slice();((t,e,n,r,i,o,a,c)=>{const l=t.length-2,p=0===c.length;for(let f=0;f<l;++f){const d=p?t[f+2]*o[f]:c[f],h=s(t[f+2],o[f],i[f],e[f],n[f],d);u(h,r,i,f,f+l),p&&c.push(o[f]*(t[f+2]-1)+a[f]+(e[f]-1)*n[f]+1-i[f]-i[f+l])}})(e[0].dims,n,t.dilations,t.autoPad,r,t.strides,t.outputPadding,i);const o=Object.assign({},t);return Object.assign(o,{kernelShape:n,pads:r,outputShape:i,cacheKey:t.cacheKey}),o};e.parseConvTransposeAttributes=t=>{const e=t.attributes,n=(0,a.parseInternalActivationAttributes)(e),i=e.getString("auto_pad","NOTSET"),o=e.getInts("dilations",[1,1]),s=e.getInt("group",1),u=e.getInts("kernel_shape",[]),c=e.getInts("output_padding",[0,0]),l=e.getInts("output_shape",[]),p=e.getInts("pads",[0,0,0,0]),f=e.getInts("strides",[1,1]);return(0,r.createAttributeWithCacheKey)(Object.assign({autoPad:i,dilations:o,group:s,kernelShape:u,outputPadding:c,outputShape:l,pads:p,strides:f},n))};const f=(t,e)=>{if(!t||2!==t.length&&3!==t.length)throw new Error("Conv requires 2 or 3 inputs");if(4!==t[0].dims.length||4!==t[1].dims.length)throw new Error("currently only support 2-dimensional conv");if(t[0].dims[1]!==t[1].dims[0])throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");const n=t[1].dims[1]*e.group;if(3===t.length&&(1!==t[2].dims.length||t[2].dims[0]!==n))throw new Error("invalid bias");const r=t[0].dims.length-2;if(e.dilations.length!==r)throw new Error(`dilations should be ${r}D`);if(e.strides.length!==r)throw new Error(`strides should be ${r}D`);if(e.pads.length!==2*r)throw new Error(`pads should be ${2*r}D`);if(e.outputPadding.length!==r)throw new Error(`output_padding should be ${r}D`);if(0!==e.kernelShape.length&&e.kernelShape.length!==t[1].dims.length-2)throw new Error("invalid kernel shape");if(0!==e.outputShape.length&&e.outputShape.length!==t[0].dims.length-2)throw new Error("invalid output shape");if("float32"!==t[0].type||"float32"!==t[1].type)throw new Error("ConvTranspose input(X,W) should be float tensor");if(3===t.length&&"float32"!==t[2].type)throw new Error("ConvTranspose input(bias) should be float tensor")}},8138:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseConvAttributes=e.conv=e.calculateOutputShape=void 0;const r=n(246),i=n(2517),o=n(4770),a=n(1386),s=n(9828),u=n(2823),c=n(3248),l=n(5623);e.calculateOutputShape=(t,e,n,r,i)=>{const o=t[0],a=t.slice(2),s=a.length,u=e[0],c=e.slice(2).map(((t,e)=>t+(t-1)*(n[e]-1))),l=a.map(((t,e)=>t+r[e]+r[e+s])).map(((t,e)=>Math.floor((t-c[e]+i[e])/i[e])));return[o,u].concat(...l)},e.conv=(t,e,n)=>(g(e,n),p(t,e,n));const p=(t,e,n)=>{const r=h(n,e),i=t.session.pack,s=1===r.kernelShape[0]&&1===r.kernelShape[1];return r.group>1?[t.run((0,o.createUnpackedGroupedConvProgramInfoLoader)(t,e,r),e)]:s&&i?[f(t,e,r)]:i&&4===e[0].dims.length&&1===e[0].dims[0]&&!s?[(0,a.conv2DPacked)(t,e,r)]:[d(t,e,r)]},f=(t,n,r)=>{const i=n[0].dims,o=n[1].dims,a=(0,e.calculateOutputShape)(i,o,r.dilations,r.pads,r.strides),s=t.reshapeUnpacked(n[0],[i[1],i[2]*i[3]]),u=t.reshapeUnpacked(n[1],[o[0],o[1]]),c=n.length>2?[u,s,n[2]]:[u,s],p=t.run((0,l.createMatmulProgramInfoLoader)(c,r),c);return t.reshapeUnpacked(p,a)},d=(t,n,r)=>{const i=n[0].dims,o=n[1].dims,a=(0,e.calculateOutputShape)(i,o,r.dilations,r.pads,r.strides),u=t.run((0,c.createIm2ColProgramInfoLoader)(t,n[0],n[1],a,r),[n[0]]),l=3===n.length?[u,n[1],n[2]]:[u,n[1]];return t.run((0,s.createDotProductProgramInfoLoader)(t,n,a,r),l)},h=(t,e)=>{const n=t.kernelShape.slice();if(0===t.kernelShape.length)for(let t=2;t<e[1].dims.length;++t)n.push(e[1].dims[t]);const r=t.pads.slice();i.PoolConvUtil.adjustPadsBasedOnAutoPad(e[0].dims,t.strides,t.dilations,n,r,t.autoPad);const o=Object.assign({},t);return Object.assign(o,{kernelShape:n,pads:r,cacheKey:t.cacheKey}),o};e.parseConvAttributes=t=>{const e=t.attributes,n=(0,u.parseInternalActivationAttributes)(e),i=e.getString("auto_pad","NOTSET"),o=e.getInts("dilations",[1,1]),a=e.getInt("group",1),s=e.getInts("kernel_shape",[]),c=e.getInts("pads",[0,0,0,0]),l=e.getInts("strides",[1,1]);return(0,r.createAttributeWithCacheKey)(Object.assign({autoPad:i,dilations:o,group:a,kernelShape:s,pads:c,strides:l},n))};const g=(t,e)=>{if(!t||2!==t.length&&3!==t.length)throw new Error("Conv requires 2 or 3 inputs");if(4!==t[0].dims.length||4!==t[1].dims.length)throw new Error("currently only support 2-dimensional conv");if(t[0].dims[1]!==t[1].dims[1]*e.group)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(3===t.length&&(1!==t[2].dims.length||t[1].dims[0]!==t[2].dims[0]))throw new Error("invalid bias");const n=t[0].dims.length-2;if(e.dilations.length!==n)throw new Error(`dilations should be ${n}D`);if(e.strides.length!==n)throw new Error(`strides should be ${n}D`);if(e.pads.length!==2*n)throw new Error(`pads should be ${2*n}D`);if(0!==e.kernelShape.length&&e.kernelShape.length!==t[1].dims.length-2)throw new Error("invalid kernel shape");if("float32"!==t[0].type||"float32"!==t[1].type)throw new Error("Conv input(X,W) should be float tensor");if(3===t.length&&"float32"!==t[2].type)throw new Error("Conv input(bias) should be float tensor")}},5193:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseDepthToSpaceAttributes=e.depthToSpace=void 0;const r=n(3738);e.depthToSpace=(t,e,n)=>{i(e);const o=n.blocksize,a=o*o,s="DCR"===n.mode?[0,3,4,1,5,2]:[0,1,4,2,5,3],u="DCR"===n.mode?[e[0].dims[0],o,o,e[0].dims[1]/a,e[0].dims[2],e[0].dims[3]]:[e[0].dims[0],e[0].dims[1]/a,o,o,e[0].dims[2],e[0].dims[3]],c=t.reshapeUnpacked(e[0],u),l={perm:s,cacheKey:`${s}`},[p]=(0,r.transpose)(t,[c],l),f=[e[0].dims[0],e[0].dims[1]/a,e[0].dims[2]*o,e[0].dims[3]*o];return[t.reshapeUnpacked(p,f)]},e.parseDepthToSpaceAttributes=t=>{const e=t.attributes.getInt("blocksize");if(e<1)throw new Error(`blocksize must be >= 1, but got : ${e} for DepthToSpace`);const n=t.attributes.getString("mode","DCR");if("DCR"!==n&&"CRD"!==n)throw new Error(`unrecognized mode: ${n} for DepthToSpace`);return{mode:n,blocksize:e}};const i=t=>{if(1!==t.length)throw new Error(`DepthToSpace expect 1 inputs, but got ${t.length}`);if("string"===t[0].type||4!==t[0].dims.length)throw new TypeError("DepthToSpace input should be a 4-D numeric tensor")}},9828:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.createDotProductProgramInfoLoader=void 0;const r=n(2517),i=n(5060),o=n(2039),a=n(2823),s=n(3248);e.createDotProductProgramInfoLoader=(t,e,n,u)=>{const c=((t,e)=>({name:"ConvDotProduct",inputNames:t?["Im2Col","K","B"]:["Im2Col","K"],inputTypes:t?[o.TextureType.unpacked,o.TextureType.packedLastDimension,o.TextureType.unpacked]:[o.TextureType.unpacked,o.TextureType.packedLastDimension],cacheKey:e.activationCacheKey}))(e.length>2,u);return Object.assign(Object.assign({},c),{get:()=>((t,e,n,u,c)=>{const l=n[0].dims,p=n[1].dims,f=[p[0],Math.ceil(l[1]*p[2]*p[3]/4)],d=(0,s.calculateIm2ColDims)(l,p,u),[h,g]=t.calculateTextureWidthAndHeight(f,o.TextureType.packedLastDimension),b=r.ShapeUtil.computeStrides(d),[m,y]=t.calculateTextureWidthAndHeight(d,o.TextureType.packedLastDimension),_=u.length,v=n.length<3?"0.0":"_B(b)",w=Math.ceil(l[1]*p[2]*p[3]/4),{activationFunction:x,applyActivation:T}=(0,a.getActivationSnippet)(c),S=(0,i.getGlsl)(t.session.backend.glContext.version),O=`\n${x}\nfloat process(int indices[${_}]) {\n  int b[1];\n  b[0] = indices[1];\n  int im2col[4];\n  im2col[0] = indices[0];\n  im2col[1] = indices[2];\n  im2col[2] = indices[3];\n  int im2colOffset = im2col[0] * ${b[0]} + im2col[1] * ${b[1]} + im2col[2] * ${b[2]};\n  int kernelOffset = indices[1] * ${f[1]};\n  float value = ${v};\n  for (int i = 0; i < ${w}; ++i) {\n    vec2 im2colCoords = offsetToCoords(im2colOffset, ${m}, ${y});\n    vec2 kernelCoords = offsetToCoords(kernelOffset, ${h}, ${g});\n    value += dot(${S.texture2D}(Im2Col, im2colCoords), ${S.texture2D}(K, kernelCoords));\n    ++im2colOffset;\n    ++kernelOffset;\n  }\n  ${T}\n  return value;\n}`;return Object.assign(Object.assign({},e),{output:{dims:u,type:n[0].type,textureType:o.TextureType.unpacked},shaderSource:O})})(t,c,e,n,u)})}},7992:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseFlattenAttributes=e.flatten=void 0;const r=n(2517);e.flatten=(t,e,n)=>{i(e,n);const o=r.ShapeUtil.flattenShape(e[0].dims,n);return[t.reshapeUnpacked(e[0],o)]},e.parseFlattenAttributes=t=>t.attributes.getInt("axis",1);const i=(t,e)=>{if(!t||1!==t.length)throw new Error("Flatten requires 1 input.");const n=t[0].dims.length;if(0===n)throw new Error("scalar tensor is not supported.");if(e<-n||e>n)throw new Error("Invalid axis");if("string"===t[0].type)throw new Error("string tensor is not supported.")}},2823:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseInternalActivationAttributes=e.getActivationSnippet=void 0;const r=n(2517),i=n(4909);e.getActivationSnippet=function(t){let e;switch(t.activation){case"Relu":e=(0,i.glslRelu)();break;case"Sigmoid":e=(0,i.glslSigmoid)();break;case"Clip":e=(0,i.glslClip)(t.clipMin,t.clipMax);break;default:return{activationFunction:"",applyActivation:""}}const n=e.name;return{activationFunction:e.body,applyActivation:`value = ${n}_(value);`}},e.parseInternalActivationAttributes=t=>{const e=t.getString("activation","");if("Clip"===e){const[n,i]=t.getFloats("activation_params",[r.MIN_CLIP,r.MAX_CLIP]);return{activation:e,clipMax:i,clipMin:n,activationCacheKey:`${e}:${n},${i}`}}return{activation:e,activationCacheKey:e}}},1253:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseGatherAttributes=e.gather=void 0;const r=n(246),i=n(782),o=n(2517),a=n(2039);e.gather=(t,e,n)=>(c(e,n.axis),[t.run(u(t,e,n),e)]),e.parseGatherAttributes=t=>(0,r.createAttributeWithCacheKey)({axis:t.attributes.getInt("axis",0)});const s={name:"Gather",inputNames:["A","B"],inputTypes:[a.TextureType.unpacked,a.TextureType.unpacked]},u=(t,e,n)=>{const r=Object.assign(Object.assign({},s),{cacheHint:n.cacheKey});return Object.assign(Object.assign({},r),{get:()=>((t,e,n,r)=>{const i=n[0].dims.slice(),s=n[1].dims.slice(),u=new Array(i.length+s.length-1);r=o.ShapeUtil.normalizeAxis(r,i.length);const c=[];for(let t=0;t<u.length;t++)t<r?(u[t]=i[t],c.push(`inputIdx[${t}] = outputIdx[${t}];`)):t<r+s.length?(u[t]=s[t-r],c.push(`indexDataIdx[${t-r}] = outputIdx[${t}];`)):(u[t]=i[t-s.length+1],c.push(`inputIdx[${t-s.length+1}] = outputIdx[${t}];`));const l=`\n      float process(int outputIdx[${u.length||1}]) {\n        int inputIdx[${i.length}];\n        int indexDataIdx[${s.length||1}];\n        indexDataIdx[0] = 0;\n        ${c.join("\n        ")}\n        int idx = int(_B(indexDataIdx));\n        inputIdx[${r}] = idx < 0 ? idx + ${i[r]} : idx;\n        return _A(inputIdx);\n      }`;return Object.assign(Object.assign({},e),{output:{dims:u,type:n[0].type,textureType:a.TextureType.unpacked},shaderSource:l})})(0,r,e,n.axis)})},c=(t,e)=>{if(!t||2!==t.length)throw new Error("Gather requires 2 inputs.");const n=t[0].dims.length;if(n<1)throw new Error("Invalid input shape.");if(e<-n||e>n-1)throw new Error("Invalid axis.");if(-1===i.NUMBER_TYPES.indexOf(t[0].type))throw new Error("Invaid input type.");if("int32"!==t[1].type&&"int16"!==t[1].type)throw new Error("Invaid input type.")}},4776:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseGemmAttributesV11=e.parseGemmAttributesV7=e.gemm=void 0;const r=n(246),i=n(2517),o=n(2039);e.gemm=(t,e,n)=>(c(e,n),[t.run(s(e,n),e)]);const a=(t,e)=>{const n=0!==t.attributes.getInt("transA",0),i=0!==t.attributes.getInt("transB",0),o=t.attributes.getFloat("alpha",1),a=t.attributes.getFloat("beta",1);return(0,r.createAttributeWithCacheKey)({transA:n,transB:i,alpha:o,beta:a,isOptionalC:e})};e.parseGemmAttributesV7=t=>a(t,!1),e.parseGemmAttributesV11=t=>a(t,!0);const s=(t,e)=>{const n={name:"Gemm",inputNames:3===t.length?["A","B","C"]:["A","B"],inputTypes:3===t.length?[o.TextureType.unpacked,o.TextureType.unpacked,o.TextureType.unpacked]:[o.TextureType.unpacked,o.TextureType.unpacked],key:e.cacheKey};return Object.assign(Object.assign({},n),{get:()=>u(n,t,e)})},u=(t,e,n)=>{const r=e[0].dims.slice(),a=e[1].dims.slice(),[s,u]=i.GemmUtil.getShapeOfGemmResult(r,n.transA,a,n.transB,3===e.length?e[2].dims:void 0),c=[s,u];if(!c)throw new Error("Can't use gemm on the given tensors");let l=r[r.length-1],p="";n.transA&&(l=r[0]),n.transA&&n.transB?p="value += _A_T(a) * _B_T(b);":n.transA&&!n.transB?p="value += _A_T(a) * _B(b);":!n.transA&&n.transB?p="value += _A(a) * _B_T(b);":n.transA||n.transB||(p="value += _A(a) * _B(b);");const f=c.length,d=`\n      float process(int indices[${f}]) {\n          int a[${f}];\n          int b[${f}];\n          ${3===e.length?`int c[${e[2].dims.length}];`:""}\n\n          copyVec(indices, a);\n          copyVec(indices, b);\n          ${3===e.length?"bcastIndices_C(indices, c);":""}\n\n          float value = 0.0;\n          for (int k=0; k<${l}; ++k) {\n              a[${f-1}] = k;\n              b[${f-2}] = k;\n              ${p}\n          }\n\n          value = value * alpha;\n          ${3===e.length?"value += beta * _C(c);":""}\n          return value;\n      }`;return Object.assign(Object.assign({},t),{output:{dims:c,type:e[0].type,textureType:o.TextureType.unpacked},variables:[{name:"alpha",type:"float",data:n.alpha},{name:"beta",type:"float",data:n.beta}],shaderSource:d})},c=(t,e)=>{if(!t)throw new Error("Input is missing");if(e.isOptionalC&&(t.length<2||t.length>3))throw new Error("Invaid input shape.");if(!e.isOptionalC&&3!==t.length)throw new Error("Gemm requires 3 inputs");if(3===t.length&&1!==t[2].dims.length&&2!==t[2].dims.length)throw new Error("Invalid input shape of C");if("float32"!==t[0].type&&"float64"!==t[0].type||"float32"!==t[1].type&&"float64"!==t[1].type||3===t.length&&"float32"!==t[2].type&&"float64"!==t[2].type)throw new Error("Invalid input type.");if(t[0].type!==t[1].type||3===t.length&&t[0].type!==t[2].type)throw new Error("Input types are mismatched")}},8555:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.createPackedIm2ColProgramInfoLoader=void 0;const r=n(5060),i=n(2039),o=n(2827);e.createPackedIm2ColProgramInfoLoader=(t,e,n,a,s)=>{const u=(c=s.cacheKey,{name:"Im2Col (packed)",inputNames:["A"],inputTypes:[i.TextureType.packed],cacheHint:c});var c;return Object.assign(Object.assign({},u),{get:()=>((t,e,n,a,s,u)=>{const c=n.dims,l=a.dims,p=s.length,f=[l[1]*l[2]*l[3],s[2]*s[3]],d=l[2]*l[3],h=(0,o.unpackFromChannel)(),g=(0,r.getGlsl)(t.session.backend.glContext.version);let b="";for(let t=0;t<=1;t++)for(let e=0;e<=1;e++)b+=`\n            blockIndex = rc.x + ${e};\n            pos = rc.y + ${t};\n\n            if(blockIndex < ${f[1]} && pos < ${f[0]}) {\n              offsetY = int(blockIndex / (${s[p-1]})) * ${u.strides[0]} -\n                ${u.pads[0]};\n              d0 = offsetY + ${u.dilations[0]} * (imod(pos, ${d}) / ${l[2]});\n\n              if(d0 < ${c[2]} && d0 >= 0) {\n                offsetX = imod(blockIndex, ${s[p-1]}) * ${u.strides[1]} -\n                  ${u.pads[1]};\n                d1 = offsetX + ${u.dilations[1]} * imod(imod(pos, ${d}), ${l[2]});\n\n                if(d1 < ${c[3]} && d1 >= 0) {\n\n                  ch = int(float(pos)/ ${d}.);\n                    innerDims = vec2(d0, d1);\n                    result[${2*t+e}] = getChannel(\n                      getA(0, ch, int(innerDims.x),\n                      int(innerDims.y)), innerDims);\n                }\n              }\n            }\n\n          `;const m=`\n      ${h}\n\n      void main() {\n        ivec2 rc = getOutputCoords();\n          vec4 result = vec4(0.0);\n          int blockIndex, pos, offsetY, d0, offsetX, d1, ch;\n          vec2 innerDims;\n          ${b}\n          ${g.output} = result;\n      }\n            `;return Object.assign(Object.assign({},e),{output:{dims:f,type:n.type,textureType:i.TextureType.packed},shaderSource:m,hasMain:!0})})(t,u,e,n,a,s)})}},3248:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.calculateIm2ColDims=e.createIm2ColProgramInfoLoader=void 0;const r=n(2039);e.createIm2ColProgramInfoLoader=(t,n,i,o,a)=>{const s=(u=a.cacheKey,{name:"Im2Col",inputNames:["X"],inputTypes:[r.TextureType.unpacked],cacheHint:u});var u;return Object.assign(Object.assign({},s),{get:()=>((t,n,i,o,a,s)=>{const u=i.dims,c=o.dims,l=a.length,p=(0,e.calculateIm2ColDims)(u,c,a,4),f=`\n        const int XC = ${u[1]};\n        const int XH = ${u[2]};\n        const int XW = ${u[3]};\n        const int KH = ${s.kernelShape[0]};\n        const int KW = ${s.kernelShape[1]};\n        const int dilationH = ${s.dilations[0]};\n        const int dilationW = ${s.dilations[1]};\n        const int strideH = ${s.strides[0]};\n        const int strideW = ${s.strides[1]};\n        const int padH = ${s.pads[0]};\n        const int padW = ${s.pads[1]};\n        const int KHKW = KH*KW;\n        const int XCKHKW = XC * KHKW;\n        const int outputChannels = 4;\n        vec4 process(int indices[${l}]) {\n          int b  = indices[0]; // batch size\n          int oh = indices[1] * strideH - padH; //output height\n          int ow = indices[2] * strideW - padW; //output width\n          int p = indices[3] * outputChannels; //patch\n          vec4 value = vec4(0.0);\n          for(int i=0; i < outputChannels; ++i) {\n            if(p < XCKHKW) {\n              int patchC = p / KHKW;\n              int patchH = (p - patchC*KHKW) / KW;\n              int patchW = (p - patchC*KHKW) - patchH * KW;\n              int xh2 = oh + patchH * dilationH;\n              int xw2 = ow + patchW * dilationW;\n              int x[${u.length}];\n              x[0] = b;\n              x[1] = patchC;\n              x[2] = xh2;\n              x[3] = xw2;\n              if(xh2 >= 0 &&\n                  xh2 < XH &&\n                  xw2 >= 0 &&\n                  xw2 < XW) {\n                value[i] = _X(x);\n              }\n            }\n            ++p;\n          }\n          return value;\n        }\n        `;return Object.assign(Object.assign({},n),{output:{dims:p,type:i.type,textureType:r.TextureType.packedLastDimension},shaderSource:f})})(0,s,n,i,o,a)})},e.calculateIm2ColDims=(t,e,n,r=4)=>[n[0],n[2],n[3],Math.ceil(t[1]*e[2]*e[3]/r)]},6572:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseImageScalerAttributes=e.imageScaler=void 0;const r=n(246),i=n(2039);e.imageScaler=(t,e,n)=>(u(e),[t.run(a(t,e,n),e)]),e.parseImageScalerAttributes=t=>{const e=t.attributes.getFloat("scale"),n=t.attributes.getFloats("bias");return(0,r.createAttributeWithCacheKey)({scale:e,bias:n})};const o={name:"ImageScaler",inputNames:["X"],inputTypes:[i.TextureType.unpacked]},a=(t,e,n)=>{const r=Object.assign(Object.assign({},o),{cacheHint:n.cacheKey});return Object.assign(Object.assign({},r),{get:()=>((t,e,n,r)=>{const o=n[0].dims.slice(),a=o.length,u=`\n      ${s(r.bias.length)}\n      float process(int indices[${a}]) {\n        return _X(indices) * scale + getBias(bias, indices[1]);\n      }`;return Object.assign(Object.assign({},e),{output:{dims:o,type:n[0].type,textureType:i.TextureType.unpacked},variables:[{name:"bias",type:"float",arrayLength:r.bias.length,data:r.bias},{name:"scale",type:"float",data:r.scale}],shaderSource:u})})(0,r,e,n)})},s=t=>{const e=[`float getBias(float bias[${t}], int channel) {`];for(let n=0;n<t;++n)0===n?e.push(`\tif (channel == ${n}) { return bias[${n}]; }`):n===t-1?e.push(`\telse { return bias[${n}]; }`):e.push(`\telse if (channel == ${n}) { return bias[${n}]; }`);return e.push("\t}"),e.join("\n")},u=t=>{if(!t||1!==t.length)throw new Error("ImageScaler requires 1 input.");if(4!==t[0].dims.length)throw new Error("Invalid input shape.");if("float32"!==t[0].type&&"float64"!==t[0].type)throw new Error("Invalid input type.")}},3346:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseInstanceNormalizationAttributes=e.instanceNormalization=void 0;const r=n(5060),i=n(2039);e.instanceNormalization=(t,e,n)=>{c(e);const r=t.run(a(e[0]),e);return[t.run(u(t,e[0],n,r.dims),[e[0],r,e[1],e[2]])]},e.parseInstanceNormalizationAttributes=t=>t.attributes.getFloat("epsilon",1e-5);const o={name:"InstanceNormalization_MeanAndVariance",inputNames:["X"],inputTypes:[i.TextureType.unpacked]},a=t=>Object.assign(Object.assign({},o),{get:()=>((t,e)=>{const n=e.dims.slice(),r=n[1],o=n[2]*n[3],a=[n[0],r],s=`\n      vec4 process(int[2] indices) {\n        vec4 v = vec4(0.0);\n        int a[4];\n        a[0] = indices[0];\n        a[1] = indices[1];\n        float temp = 0.0;\n        for(int a2=0; a2<${n[2]}; a2++) {\n          a[2] = a2;\n          for(int a3=0; a3<${n[3]}; a3++) {\n            a[3] = a3;\n            float x = _X(a);\n            temp += x;\n          }\n        }\n        float mean = temp / float(${o});\n        temp = 0.0;\n        for(int a2=0; a2<${n[2]}; a2++) {\n          a[2] = a2;\n          for(int a3=0; a3<${n[3]}; a3++) {\n            a[3] = a3;\n            float x = _X(a);\n            temp += (x - mean) * (x - mean);\n          }\n        }\n        v.r = mean;\n        v.g = temp / float(${o});\n\n        return v;\n      }`;return Object.assign(Object.assign({},t),{output:{dims:a,type:e.type,textureType:i.TextureType.packedLastDimension},shaderSource:s})})(o,t)}),s={name:"InstanceNormalization_ComputeOutput",inputNames:["X","MeanAndVariance","Scale","B"],inputTypes:[i.TextureType.unpacked,i.TextureType.packedLastDimension,i.TextureType.unpacked,i.TextureType.unpacked]},u=(t,e,n,o)=>{const a=Object.assign(Object.assign({},s),{cacheHint:`${n}`});return Object.assign(Object.assign({},a),{get:()=>((t,e,n,o,a)=>{const s=(0,r.getGlsl)(t.session.backend.glContext.version),[u,c]=t.calculateTextureWidthAndHeight(a,i.TextureType.packedLastDimension),[l,p]=[u/4,c],f=`\n      vec4 get_MeanAndVariance(int[2] mv) {\n        int offset = indicesToOffset_MeanAndVariance(mv);\n        vec2 coords = offsetToCoords(offset, ${l}, ${p});\n        return ${s.texture2D}(MeanAndVariance, coords);\n      }\n\n      float process(int[4] indices) {\n        int mv[2];\n        mv[0] = indices[0];\n        mv[1] = indices[1];\n        vec4 mean_and_variance = get_MeanAndVariance(mv);\n        float mean = mean_and_variance.r;\n        float variance = mean_and_variance.g;\n\n        int sb[1];\n        sb[0] = indices[1];\n        float scale = _Scale(sb);\n        float b = _B(sb);\n\n        return scale * (_X(indices) - mean) / sqrt(variance + epsilon) + b;\n      }`;return Object.assign(Object.assign({},e),{output:{dims:n.dims,type:n.type,textureType:i.TextureType.unpacked},variables:[{name:"epsilon",type:"float",data:o}],shaderSource:f})})(t,a,e,n,o)})},c=t=>{if(!t||3!==t.length)throw new Error("InstanceNormalization requires 3 inputs.");const e=t[0],n=t[1],r=t[2];if(e.dims.length<3||1!==n.dims.length||1!==r.dims.length)throw new Error("Invalid input shape.");if(n.dims[0]!==e.dims[1]||r.dims[0]!==e.dims[1])throw new Error("Input shapes are mismatched.");if("float32"!==e.type&&"float64"!==e.type||"float32"!==n.type&&"float64"!==n.type||"float32"!==r.type&&"float64"!==r.type)throw new Error("Invalid input type.");if(4!==t[0].dims.length)throw new Error("Only support 4-D input shape.")}},708:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.createPackedMatmulProgramInfoLoader=void 0;const r=n(2517),i=n(5060),o=n(2039),a=n(9390),s=n(2823),u=n(5623);e.createPackedMatmulProgramInfoLoader=(t,e,n)=>{const c=(l=e.length>2,p=n.activationCacheKey,{name:"MatMul (packed)",inputNames:l?["A","B","Bias"]:["A","B"],inputTypes:l?[o.TextureType.packed,o.TextureType.packed,o.TextureType.packed]:[o.TextureType.packed,o.TextureType.packed],cacheHint:p});var l,p;return Object.assign(Object.assign({},c),{get:()=>((t,e,n,c)=>{const l=n.length>2,p=l?"value += getBiasForMatmul();":"",f=n[0].dims,d=n[1].dims,h=r.BroadcastUtil.calcShape(f,d,!0),g=!r.ShapeUtil.areEqual(n[0].dims,n[1].dims);if(!h)throw new Error("Can't use matmul on the given tensors");const b=f[f.length-1],m=Math.ceil(b/2),y=f.length,_=d.length,v=(0,i.getGlsl)(t.session.backend.glContext.version),w=(0,a.getCoordsDataType)(h.length),x=h.length,T=(0,a.getGlChannels)(),{activationFunction:S,applyActivation:O}=(0,s.getActivationSnippet)(c),A=l?`${(0,u.getBiasForMatmul)(w,T,n[2].dims,h,!0)}`:"",E=g?`${function(t,e,n,i){let o=[],a=[];const s=n[0].dims,u=n[1].dims,c=s.length,l=u.length,p=i.length,f=p-c,d=p-l;o=s.map(((t,n)=>`coords.${e[n+f]}`)),o[c-1]="i*2",o.join(", "),a=u.map(((t,n)=>`coords.${e[n+d]}`)),a[l-2]="i*2",a.join(", ");const h=r.BroadcastUtil.getBroadcastDims(s,i),g=r.BroadcastUtil.getBroadcastDims(u,i),b=h.map((t=>`coords.${e[t+f]} = 0;`)).join("\n"),m=g.map((t=>`coords.${e[t+d]} = 0;`)).join("\n"),y=`int lastDim = coords.${e[p-1]};\n  coords.${e[p-1]} = coords.${e[p-2]};\n  coords.${e[p-2]} = lastDim;`;return`\nvec4 getAAtOutCoordsMatmul(int i) {\n  ${t} coords = getOutputCoords();\n  ${y}\n  ${b}\n  vec4 outputValue = getA(${o});\n  return outputValue;\n}\n\nvec4 getBAtOutCoordsMatmul(int i) {\n  ${t} coords = getOutputCoords();\n  ${y}\n  ${m}\n  vec4 outputValue = getB(${a});\n  return outputValue;\n}`}(w,T,n,h)}`:"",I=g?"getAAtOutCoordsMatmul(i)":`getA(${function(t,e){let n="";for(let r=0;r<e-2;r++)n+=`rc.${t[r]}, `;return n+=`rc.${t[e-2]}, i*2`,n}(T,y)})`,P=g?"getBAtOutCoordsMatmul(i)":`getB(${function(t,e){let n="";for(let r=0;r<e-2;r++)n+=`rc.${t[r]}, `;return n+=`i*2, rc.${t[e-1]}`,n}(T,_)})`,D=`\n            ${E}\n            ${A}\n            ${S}\n            void main() {\n              ${g?"":`${w} rc =\n          getOutputCoords(); int lastDim = rc.${T[x-1]}; rc.${T[x-1]} =\n          rc.${T[x-2]}; rc.${T[x-2]} = lastDim;\n      `}\n\n              vec4 value = vec4(0);\n              for (int i = 0; i < ${m}; i++) {\n                vec4 a = ${I};\n                vec4 b = ${P};\n\n                value += (a.rrbb * b.rgrg);\n                value += (a.ggaa * b.baba);\n              }\n              ${p}\n              ${O}\n              ${v.output} = value;\n            }`;return Object.assign(Object.assign({},e),{output:{dims:h,type:n[0].type,textureType:o.TextureType.packed},shaderSource:D,hasMain:!0})})(t,c,e,n)})}},5623:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.getBiasForMatmul=e.createMatmulProgramInfoLoader=e.parseMatMulAttributes=e.matMul=void 0;const r=n(2517),i=n(2039),o=n(9390),a=n(2823),s=n(708);function u(t,e){const n=(s=t.length>2,u=e.activationCacheKey,{name:"MatMul",inputNames:s?["A","B","Bias"]:["A","B"],inputTypes:s?[i.TextureType.unpacked,i.TextureType.unpacked,i.TextureType.unpacked]:[i.TextureType.unpacked,i.TextureType.unpacked],cacheHint:u});var s,u;return Object.assign(Object.assign({},n),{get:()=>function(t,e,n){const s=e[0].dims,u=e[1].dims,c=r.BroadcastUtil.calcShape(s,u,!0);if(!c)throw new Error("Can't use matmul on the given tensors");const p=(0,o.getCoordsDataType)(c.length),f=(0,o.getGlChannels)(),{activationFunction:d,applyActivation:h}=(0,a.getActivationSnippet)(n),g=e.length>2,b=g?"value += getBiasForMatmul();":"",m=g?`${l(p,f,e[2].dims,c,!1)}`:"",y=c.length,_=s.length,v=u.length,w=`\n    ${d}\n    ${m}\n    float process(int indices[${y}]) {\n        int a[${_}];\n        int b[${v}];\n        bcastMatmulIndices_A(indices, a);\n        bcastMatmulIndices_B(indices, b);\n\n        float value;\n        for (int k=0; k<${s[s.length-1]}; ++k) {\n            a[${_-1}] = k;\n            b[${v-2}] = k;\n            value += _A(a) * _B(b);\n        }\n        ${b}\n        ${h}\n        return value;\n    }`;return Object.assign(Object.assign({},t),{output:{dims:c,type:e[0].type,textureType:i.TextureType.unpacked},shaderSource:w})}(n,t,e)})}e.matMul=(t,e,n)=>(c(e),t.session.pack?[t.run((0,s.createPackedMatmulProgramInfoLoader)(t,e,n),e)]:[t.run(u(e,n),e)]),e.parseMatMulAttributes=t=>(0,a.parseInternalActivationAttributes)(t.attributes),e.createMatmulProgramInfoLoader=u;const c=t=>{if(!t||2!==t.length)throw new Error("MatMul requires 2 inputs.");if(t[0].dims[t[0].dims.length-1]!==t[1].dims[t[1].dims.length-2])throw new Error("shared dimension does not match.");if("float32"!==t[0].type&&"float64"!==t[0].type||"float32"!==t[1].type&&"float64"!==t[1].type)throw new Error("inputs should be float type");if(t[0].type!==t[1].type)throw new Error("inputs types should match")};function l(t,e,n,i,o){let a="";const s=n.length,u=i.length,c=u-s;a=u<2&&s>0?"coords":n.map(((t,n)=>`coords.${e[n+c]}`)).join(", ");const l=r.BroadcastUtil.getBroadcastDims(n,i).map((t=>`coords.${e[t+c]} = 0;`)).join("\n");let p="vec4(outputValue.xx, outputValue.yy)";return 1===r.ShapeUtil.size(n)&&(p="vec4(outputValue.x)"),o?`\nvec4 getBiasForMatmul() {\n  ${t} coords = getOutputCoords();\n  ${l}\n  vec4 outputValue = getBias(${a});\n  return ${p};\n}`:`\nfloat getBiasForMatmul() {\n  ${t} coords = getOutputCoords();\n  ${l}\n  return getBias(coords.x);\n}`}e.getBiasForMatmul=l},2403:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.createPackProgramInfoLoader=void 0;const r=n(5060),i=n(2039),o=n(9390),a=n(2827),s={name:"pack",inputNames:["A"],inputTypes:[i.TextureType.unpackedReversed]};e.createPackProgramInfoLoader=(t,e)=>Object.assign(Object.assign({},s),{get:()=>((t,e)=>{const n=(0,r.getGlsl)(t.session.backend.glContext.version),u=e.dims,c=u.length,l=e.dims.length,p=(0,o.getCoordsDataType)(l),f=(0,a.getChannels)("rc",l),d=(h=l,g=f,b=u[u.length-2],m=u[u.length-1],0===h||1===h?"":`\n    int r = ${g[h-2]};\n    int c = ${g[h-1]};\n    int rp1 = ${g[h-2]} + 1;\n    int cp1 = ${g[h-1]} + 1;\n    bool rEdge = rp1 >= ${m};\n    bool cEdge = cp1 >= ${b};\n    `);var h,g,b,m;let y;y=0===c?[1,1]:1===c?[u[0],1]:[u[l-1],u[l-2]];const _=function(t,e,n){if(0===t)return"false";if(1===t)return`rc > ${e[0]}`;let r="";for(let i=t-2;i<t;i++)r+=`${n[i]} >= ${e[i-t+2]}`,i<t-1&&(r+="||");return r}(l,y,f),v=function(t,e){const n=t.length;if(0===n)return"getA(), 0, 0, 0";if(1===n)return`getA(rc),\n            rc + 1 >= ${t[0]} ? 0. : getA(rc + 1),\n            0, 0`;let r="";if(n>2)for(let t=0;t<n-2;++t)r+=`${e[t]},`;return`getA(${r}r, c),\n          rEdge ? 0. : getA(${r}rp1, c),\n          cEdge ? 0. : getA(${r}r, cp1),\n          rEdge || cEdge ? 0. : getA(${r}rp1, cp1)`}(u,f),w=`\n        void main() {\n          ${p} rc = getOutputCoords();\n\n          if(${_}) {\n            ${n.output} = vec4(0);\n          } else {\n            ${d}\n\n            ${n.output} = vec4(${v});\n          }\n        }\n      `;return Object.assign(Object.assign({},s),{hasMain:!0,output:{dims:e.dims,type:e.type,textureType:i.TextureType.packed},shaderSource:w})})(t,e)})},2827:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.unpackFromChannel=e.getChannels=e.getVecChannels=void 0;const r=n(9390);function i(t,e){return(0,r.getGlChannels)(e).map((e=>`${t}.${e}`))}e.getVecChannels=i,e.getChannels=function(t,e){return 1===e?[t]:i(t,e)},e.unpackFromChannel=function(){return"\n    float getChannel(vec4 frag, int dim) {\n      int modCoord = imod(dim, 2);\n      return modCoord == 0 ? frag.r : frag.g;\n    }\n\n    float getChannel(vec4 frag, vec2 innerDims) {\n      vec2 modCoord = mod(innerDims, 2.);\n      return modCoord.x == 0. ?\n        (modCoord.y == 0. ? frag.r : frag.g) :\n        (modCoord.y == 0. ? frag.b : frag.a);\n    }\n  "}},2870:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parsePadAttributesV11=e.padV11=e.parsePadAttributesV2=e.padV2=void 0;const r=n(246),i=n(2517),o=n(5060),a=n(2039),s={name:"Pad",inputNames:["A"],inputTypes:[a.TextureType.unpacked]};e.padV2=(t,e,n)=>(l(e),[t.run(Object.assign(Object.assign({},s),{cacheHint:n.cacheKey,get:()=>c(t,e[0],n)}),e)]),e.parsePadAttributesV2=t=>{const e=t.attributes.getString("mode","constant"),n=t.attributes.getFloat("value",0),i=t.attributes.getInts("pads");return(0,r.createAttributeWithCacheKey)({mode:e,value:n,pads:i})},e.padV11=(t,n,r)=>{p(n);const i=u(t,n,r);return(0,e.padV2)(t,[n[0]],i)},e.parsePadAttributesV11=t=>t.attributes.getString("mode","constant");const u=(t,e,n)=>{if(!t.session.isInitializer(e[1].dataId)||e.length>=3&&!t.session.isInitializer(e[2].dataId))throw new Error("dynamic pad attributes are not allowed");const i=Array.from(e[1].integerData),o=e.length>=3?e[2].floatData[0]:0;return(0,r.createAttributeWithCacheKey)({mode:n,pads:i,value:o})},c=(t,e,n)=>{const r=i.ShapeUtil.padShape(e.dims.slice(),n.pads),o=r.length,s=`\n      ${f(t,e,n)}\n      float process(int[${o}] indices) {\n          return padA(indices);\n      }`;return{name:"Pad",inputNames:["A"],inputTypes:[a.TextureType.unpacked],output:{dims:r,type:e.type,textureType:a.TextureType.unpacked},shaderSource:s}},l=t=>{if(!t||1!==t.length)throw new Error("Pad requires 1 input");if("float32"!==t[0].type&&"float64"!==t[0].type)throw new Error("Invalid input type.")},p=t=>{if(!t||2!==t.length&&3!==t.length)throw new Error("Pad requires 2 or 3 inputs");if("int32"!==t[1].type)throw new Error("Invalid input type.");if(t.length>=3&&"string"===t[2].type)throw new Error("Invalid input type.")},f=(t,e,n)=>{const r=(0,o.getGlsl)(t.session.backend.glContext.version),[s,u]=t.calculateTextureWidthAndHeight(e.dims,a.TextureType.unpacked),c=i.ShapeUtil.computeStrides(e.dims);switch(n.mode){case"constant":return d(r,e.dims,c,s,u,n.pads,n.value);case"reflect":return h(r,e.dims,c,s,u,n.pads);case"edge":return g(r,e.dims,c,s,u,n.pads);default:throw new Error("Invalid mode")}},d=(t,e,n,r,i,o,a)=>{const s=e.length;let u="";for(let t=s-1;t>=0;--t)u+=`\n        k = m[${t}] - ${o[t]};\n        if (k < 0)  return constant;\n        if (k >= ${e[t]}) return constant;\n        offset += k * ${n[t]};\n        `;return`\n      float padA(int m[${s}]) {\n        const float constant = float(${a});\n        int offset = 0;\n        int k = 0;\n        ${u}\n        vec2 coords = offsetToCoords(offset, ${r}, ${i});\n        float value = getColorAsFloat(${t.texture2D}(A, coords));\n        return value;\n      }\n      `},h=(t,e,n,r,i,o)=>{const a=e.length;let s="";for(let t=a-1;t>=0;--t)s+=`\n        k = m[${t}] - ${o[t]};\n        if (k < 0) { k = -k; }\n        {\n          const int _2n_1 = ${2*(e[t]-1)};\n          k = int( mod( float(k), float(_2n_1) ) ) ;\n          if(k >= ${e[t]}) { k = _2n_1 - k; }\n        }\n        offset += k * ${n[t]};\n        `;return`\n      float padA(int m[${a}]) {\n        int offset = 0;\n        int k = 0;\n        ${s}\n        vec2 coords = offsetToCoords(offset, ${r}, ${i});\n        float value = getColorAsFloat(${t.texture2D}(A, coords));\n        return value;\n      }\n      `},g=(t,e,n,r,i,o)=>{const a=e.length;let s="";for(let t=a-1;t>=0;--t)s+=`\n        k = m[${t}] - ${o[t]};\n        if (k < 0)  k = 0;\n        if (k >= ${e[t]}) k = ${e[t]-1};\n        offset += k * ${n[t]};\n      `;return`\n      float padA(int m[${a}]) {\n        int offset = 0;\n        int k = 0;\n        ${s}\n        vec2 coords = offsetToCoords(offset, ${r}, ${i});\n        float value = getColorAsFloat(${t.texture2D}(A, coords));\n        return value;\n      }\n      `}},2143:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.globalMaxPool=e.parseMaxPoolAttributes=e.maxPool=e.parseGlobalAveragePoolAttributes=e.globalAveragePool=e.parseAveragePoolAttributes=e.averagePool=void 0;const r=n(246),i=n(2517),o=n(2039);e.averagePool=(t,e,n)=>{p(e);const r={name:"AveragePool",inputNames:["X"],inputTypes:[o.TextureType.unpacked],cacheHint:n.cacheKey};return[t.run(Object.assign(Object.assign({},r),{get:()=>a(e,r,!1,n)}),e)]},e.parseAveragePoolAttributes=t=>{const e=t.attributes.getString("auto_pad","NOTSET"),n=t.attributes.getInt("ceil_mode",0),i=0!==t.attributes.getInt("count_include_pad",0),o=t.attributes.getInts("kernel_shape"),a=t.attributes.getInts("strides",[]),s=t.attributes.getInts("pads",[]);if(0!==n)throw new Error("using ceil() in shape computation is not yet supported for AveragePool");return(0,r.createAttributeWithCacheKey)({autoPad:e,ceilMode:n,countIncludePad:i,kernelShape:o,strides:a,pads:s})};const a=(t,e,n,r)=>{const[a,s]=u(t,r,n),c=i.ShapeUtil.size(a.kernelShape);let l="";a.countIncludePad?l+=`value /= float(${c});`:l+=`value /= float(${c} - pad);`;const p=`\n        ${f(t[0].dims,a,"value += _X(x);",l,"0.0")}\n      `;return Object.assign(Object.assign({},e),{output:{dims:s,type:t[0].type,textureType:o.TextureType.unpacked},shaderSource:p})};e.globalAveragePool=(t,e,n)=>{p(e);const r={name:"GlobalAveragePool",inputNames:["X"],inputTypes:[o.TextureType.unpacked],cacheHint:`${n.countIncludePad}`};return[t.run(Object.assign(Object.assign({},r),{get:()=>a(e,r,!0,n)}),e)]},e.parseGlobalAveragePoolAttributes=t=>{const e=0!==t.attributes.getInt("count_include_pad",0);return(0,r.createAttributeWithCacheKey)({autoPad:"",ceilMode:0,countIncludePad:e,kernelShape:[],strides:[],pads:[]})},e.maxPool=(t,e,n)=>{p(e);const r={name:"MaxPool",inputNames:["X"],inputTypes:[o.TextureType.unpacked],cacheHint:n.cacheKey};return[t.run(Object.assign(Object.assign({},r),{get:()=>s(e,r,!1,n)}),e)]},e.parseMaxPoolAttributes=t=>{const e=t.attributes.getString("auto_pad","NOTSET"),n=t.attributes.getInt("ceil_mode",0),i=t.attributes.getInts("kernel_shape"),o=t.attributes.getInts("strides",[]),a=t.attributes.getInts("pads",[]),s=t.attributes.getInt("storage_order",0),u=t.attributes.getInts("dilations",[]);if(0!==s)throw new Error("column major storage order is not yet supported for MaxPool");if(0!==n)throw new Error("using ceil() in shape computation is not yet supported for MaxPool");return(0,r.createAttributeWithCacheKey)({autoPad:e,ceilMode:n,countIncludePad:!1,kernelShape:i,strides:o,pads:a,storageOrder:s,dilations:u})};const s=(t,e,n,r)=>{const[i,a]=u(t,r,n),s=`\n      ${f(t[0].dims,i,"\n      value = max(_X(x), value);\n    ","","-1e5")}\n    `;return Object.assign(Object.assign({},e),{output:{dims:a,type:t[0].type,textureType:o.TextureType.unpacked},shaderSource:s})},u=(t,e,n)=>{const r=t[0].dims.slice(),o=Object.hasOwnProperty.call(e,"dilations"),a=e.kernelShape.slice(),s=e.strides.slice(),u=o?e.dilations.slice():[],c=e.pads.slice();i.PoolConvUtil.adjustPoolAttributes(n,r,a,s,u,c);const l=i.PoolConvUtil.computePoolOutputShape(n,r,s,u,a,c,e.autoPad),p=Object.assign({},e);return o?Object.assign(p,{kernelShape:a,strides:s,pads:c,dilations:u,cacheKey:e.cacheKey}):Object.assign(p,{kernelShape:a,strides:s,pads:c,cacheKey:e.cacheKey}),[p,l]},c={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[],cacheKey:""},l={name:"GlobalMaxPool",inputNames:["X"],inputTypes:[o.TextureType.unpacked]};e.globalMaxPool=(t,e)=>(p(e),[t.run(Object.assign(Object.assign({},l),{get:()=>s(e,l,!0,c)}),e)]);const p=t=>{if(!t||1!==t.length)throw new Error("Pool ops requires 1 input.");if("float32"!==t[0].type&&"float64"!==t[0].type)throw new Error("Invalid input type.")},f=(t,e,n,r,o)=>{const a=t.length;if(e.kernelShape.length<=2){const i=e.kernelShape[e.kernelShape.length-1],s=e.strides[e.strides.length-1],u=e.pads[e.pads.length/2-1],c=e.pads[e.pads.length-1],l=t[a-1];let p="",f="",d="";if(p=u+c!==0?`\n          for (int i = 0; i < ${i}; i++) {\n            x[${a} - 1] = indices[${a} - 1] * ${s} - ${u} + i;\n            if (x[${a} - 1] < 0 || x[${a} - 1] >= ${l}) {\n              pad++;\n              continue;\n            }\n            ${n}\n          }`:`\n          for (int i = 0; i < ${i}; i++) {\n            x[${a} - 1] = indices[${a} - 1] * ${s} - ${u} + i;\n            ${n}\n          }`,2===e.kernelShape.length){const n=e.kernelShape[e.kernelShape.length-2],r=e.strides[e.strides.length-2],o=e.pads[e.pads.length/2-2],s=e.pads[e.pads.length-2],u=t[a-2];f=o+s!==0?`\n            for (int j = 0; j < ${n}; j++) {\n              x[${a} - 2] = indices[${a} - 2] * ${r} - ${o} + j;\n              if (x[${a} - 2] < 0 || x[${a} - 2] >= ${u}) {\n                pad+= ${i};\n                continue;\n              }\n          `:`\n            for (int j = 0; j < ${n}; j++) {\n              x[${a} - 2] = indices[${a} - 2] * ${r} - ${o} + j;\n            `,d="\n          }\n        "}return`\n        float process(int indices[${a}]) {\n          int x[${a}];\n          copyVec(indices, x);\n\n          float value = ${o};\n          int pad = 0;\n          ${f}\n          ${p}\n          ${d}\n          ${r}\n          return value;\n        }\n      `}{const s=i.ShapeUtil.size(e.kernelShape),u=i.ShapeUtil.computeStrides(e.kernelShape),c=u.length,l=e.pads.length,p=h(c),f=d(t,"inputDims"),g=d(e.pads,"pads"),b=d(u,"kernelStrides"),m=d(e.strides,"strides");let y="";return y=e.pads.reduce(((t,e)=>t+e))?`\n            if (x[j] >= inputDims[j] || x[j] < 0) {\n              pad++;\n              isPad = true;\n              break;\n            }\n          }\n          if (!isPad) {\n            ${n}\n          }`:`\n          }\n          ${n}\n        `,`\n        ${p}\n        float process(int indices[${a}]) {\n          int x[${a}];\n          copyVec(indices, x);\n          int offset[${c}];\n          int pads[${l}];\n          int inputDims[${a}];\n          int kernelStrides[${c}];\n          int strides[${c}];\n          ${g}\n          ${f}\n          ${m}\n          ${b}\n\n          float value = ${o};\n          int pad = 0;\n          bool isPad = false;\n          for (int i = 0; i < ${s}; i++) {\n            offsetToIndices(i, kernelStrides, offset);\n            isPad = false;\n            for (int j = ${a} - ${c}; j < ${a}; j++) {\n              x[j] = indices[j] * strides[j - ${a} + ${c}]\n                + offset[j - ${a} + ${c}] - pads[j - 2];\n              ${y}\n          }\n          ${r}\n\n          return value;\n        }\n      `}},d=(t,e)=>{let n="";for(let r=0;r<t.length;r++)n+=`\n      ${e}[${r}] = ${t[r]};\n    `;return n},h=t=>`\n  void offsetToIndices(int offset, int[${t}] strides, out int[${t}] indices) {\n    if (${t} == 0) {\n      return;\n    }\n    for (int i = 0; i < ${t} - 1; ++i) {\n      indices[i] = offset / strides[i];\n      offset -= indices[i] * strides[i];\n    }\n    indices[${t} - 1] = offset;\n  }`},4939:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.reduceLogSumSquare=e.reduceLogSum=e.reduceProd=e.reduceMin=e.reduceMax=e.reduceMean=e.reduceSum=e.parseReduceAttributes=void 0;const r=n(246),i=n(782),o=n(2517),a=n(2039),s=(t,e,n,r,i)=>{c(e);const o={name:r,inputNames:["A"],inputTypes:[a.TextureType.unpacked]};return[t.run(Object.assign(Object.assign({},o),{cacheHint:n.cacheKey,get:()=>u(t,e,n,r,i,o)}),e)]};e.parseReduceAttributes=t=>{const e=t.attributes.getInts("axes",[]),n=1===t.attributes.getInt("keepdims",1);return(0,r.createAttributeWithCacheKey)({axes:e,keepDims:n})};const u=(t,e,n,r,i,s)=>{const u=[],c=e[0].dims.length||1,l=[],p=o.ShapeUtil.normalizeAxes(n.axes,e[0].dims.length),f=i(e,p);let d=f[1];for(let t=0;t<e[0].dims.length;t++)p.indexOf(t)>=0||0===p.length?(n.keepDims&&u.push(1),d=`\n          for(int j${t} = 0; j${t} < ${e[0].dims[t]}; j${t}++) {\n            inputIdx[${t}] = j${t};\n            ${d}\n          }`):(l.push(`inputIdx[${t}] = outputIdx[${u.length}];`),u.push(e[0].dims[t]));const h=`\n      float process(int outputIdx[${u.length||1}]) {\n        float value;                 // final result\n        int inputIdx[${c}];      // addressing input data\n        ${l.join("\n")}\n        ${f[0]}       // init ops for reduce max/min\n        ${d}\n        ${f[2]}       // final computation for reduce mean\n        return value;\n      }`;return Object.assign(Object.assign({},s),{output:{dims:u,type:e[0].type,textureType:a.TextureType.unpacked},shaderSource:h})},c=t=>{if(!t||1!==t.length)throw new Error("Reduce op requires 1 input.");if(-1===i.NUMBER_TYPES.indexOf(t[0].type))throw new Error("Invalid input type.")};e.reduceSum=(t,e,n)=>s(t,e,n,"ReduceSum",(()=>["value = 0.0;","value += _A(inputIdx);",""])),e.reduceMean=(t,e,n)=>s(t,e,n,"ReduceMean",((t,e)=>{let n=1;for(let r=0;r<t[0].dims.length;r++)(e.indexOf(r)>=0||0===e.length)&&(n*=t[0].dims[r]);return["value = 0.0;","value += _A(inputIdx);",`value /= ${n}.;`]})),e.reduceMax=(t,e,n)=>s(t,e,n,"ReduceMax",((t,e)=>{const n=[];for(let r=0;r<t[0].dims.length;r++)(e.indexOf(r)>=0||0===e.length)&&n.push(`inputIdx[${r}] = 0;`);return[`${n.join("\n")}\nvalue = _A(inputIdx);`,"value = max(value, _A(inputIdx));",""]})),e.reduceMin=(t,e,n)=>s(t,e,n,"ReduceMin",((t,e)=>{const n=[];for(let r=0;r<t[0].dims.length;r++)(e.indexOf(r)>=0||0===e.length)&&n.push(`inputIdx[${r}] = 0;`);return[`${n.join("\n")}\nvalue = _A(inputIdx);`,"value = min(value, _A(inputIdx));",""]})),e.reduceProd=(t,e,n)=>s(t,e,n,"ReduceProd",(()=>["value = 1.0;","value *= _A(inputIdx);",""])),e.reduceLogSum=(t,e,n)=>s(t,e,n,"ReduceLogSum",(()=>["value = 0.0;","value += _A(inputIdx);","value = log(value);"])),e.reduceLogSumSquare=(t,e,n)=>s(t,e,n,"ReduceLogSumSquare",(()=>["float t; value = 0.0;","t = _A(inputIdx); value += t * t;",""]))},7019:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.isReshapeCheap=e.processDims3D=e.createPackedReshape3DProgramInfoLoader=void 0;const r=n(2517),i=n(5060),o=n(2039),a=n(2827);e.createPackedReshape3DProgramInfoLoader=(t,e,n)=>{const s=(t=>({name:"Reshape (packed)",inputTypes:[o.TextureType.packed],inputNames:["A"],cacheHint:`${t}`}))(n);return Object.assign(Object.assign({},s),{get:()=>((t,e,n,s)=>{const u=e.dims,c=s;let l="";for(let t=0;t<4;t++){let e="";switch(t){case 0:e="outputCoords = rc;";break;case 1:e="outputCoords = ivec3(rc.x, rc.y+1, rc.z);";break;case 2:e="outputCoords = ivec3(rc.x, rc.y, rc.z+1);";break;case 3:e="outputCoords = ivec3(rc.x, rc.y+1, rc.z+1);";break;default:throw new Error}l+=`\n        ${e}\n        ${t>0?"if(outputCoords.y < rows && outputCoords.z < cols){":""}\n          int flattenedIndex = getFlattenedIndex(outputCoords);\n\n          ivec3 inputRC = inputCoordsFromReshapedOutCoords(flattenedIndex);\n          vec2 innerDims = vec2(float(inputRC.y),float(inputRC.z));\n\n          result[${t}] = getChannel(getA(inputRC.x, inputRC.y, inputRC.z), innerDims);\n\n        ${t>0?"}":""}\n      `}const p=(0,i.getGlsl)(t.session.backend.glContext.version),f=`\n      ${function(t){const e=r.ShapeUtil.computeStrides(t),n=["b","r","c"],i="index";return`\n    ivec3 inputCoordsFromReshapedOutCoords(int index) {\n      ${e.map(((t,r)=>`int ${n[r]} = ${i} / ${t}; ${r===e.length-1?`int ${n[r+1]} = ${i} - ${n[r]} * ${t}`:`index -= ${n[r]} * ${t}`};`)).join("")}\n      return ivec3(b, r, c);\n    }\n  `}(u)}\n      ${function(t){const e=r.ShapeUtil.computeStrides(t);return`\n  int getFlattenedIndex(ivec3 coords) {\n    // reverse y, z order\n    return coords.x * ${e[0]} + coords.z * ${e[1]} + coords.y;\n  }\n`}(c)}\n      ${(0,a.unpackFromChannel)()}\n\n      void main() {\n        ivec3 rc = getOutputCoords();\n\n        vec4 result = vec4(0.0);\n\n        ivec3 outputCoords;\n        int rows = ${c[2]};\n        int cols = ${c[1]};\n\n        ${l}\n        ${p.output} = result;\n      }\n    `;return Object.assign(Object.assign({},n),{output:{dims:c,type:e.type,textureType:o.TextureType.packed},shaderSource:f,hasMain:!0})})(t,e,s,n)})},e.processDims3D=function(t){if(0===t.length)return[1,1,1];let e=1;for(let n=0;n<t.length-2;++n)e*=t[n];return[e,t.length>1?t[t.length-2]:1,t[t.length-1]]},e.isReshapeCheap=function(t,e){let n=!1;return n=0===t.length||0===e.length||(t.length<2||e.length<2?t[t.length-1]===e[e.length-1]:t[t.length-1]===e[e.length-1]&&t[t.length-2]===e[e.length-2]),n}},718:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.reshape=void 0;const r=n(2517);e.reshape=(t,e)=>{const n=r.ShapeUtil.calculateReshapedDims(e[0].dims,e[1].integerData);return t.session.pack?[t.reshapePacked(e[0],n)]:[t.reshapeUnpacked(e[0],n)]}},2268:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseResizeAttributesV11=e.parseResizeAttributesV10=e.resize=void 0;const r=n(5060),i=n(2039),o=n(9390),a=n(2827),s=n(9793),u={name:"Resize",inputNames:["A"],inputTypes:[i.TextureType.packed]};e.resize=(t,e,n)=>((0,s.validateInputs)(e,n),[t.run(Object.assign(Object.assign({},u),{cacheHint:n.cacheKey,get:()=>c(t,e,n)}),e)]),e.parseResizeAttributesV10=t=>(0,s.parseUpsampleAttributes)(t,10),e.parseResizeAttributesV11=t=>(0,s.parseUpsampleAttributes)(t,11);const c=(t,e,n)=>{const s=(0,r.getGlsl)(t.session.backend.glContext.version),[c,p]=l(e,n);if(c.every((t=>1===t))&&"tf_crop_and_resize"!==n.coordinateTransformMode)return Object.assign(Object.assign({},u),{output:{dims:p,type:e[0].type,textureType:i.TextureType.packed},hasMain:!0,shaderSource:`void main() {\n                    vec4 v = ${s.texture2D}(X, TexCoords);\n                    ${s.output} = v;\n                }`});const f=p.length;if(f<2)throw new Error(`output dimension should be at least 2, but got ${f}`);const d=p[f-2],h=p[f-1],g=e[0].dims;if(f!==g.length)throw new Error(`output dimension should match input ${g.length}, but got ${f}`);const b=g[f-2],m=g[f-1],y=c[f-2],_=c[f-1];let v="";if("linear"!==n.mode)throw new Error(`resize (packed) does not support mode: '${n.mode}'`);switch(n.coordinateTransformMode){case"asymmetric":v="\n                    vec4 getSourceFracIndex(ivec4 coords) {\n                        return vec4(coords) / scaleWHWH;\n                    }\n                ";break;case"half_pixel":v="\n                    vec4 getSourceFracIndex(ivec4 coords) {\n                        return (vec4(coords) + 0.5) / scaleWHWH - 0.5;\n                    }\n                ";break;case"pytorch_half_pixel":v=`\n                    vec4 getSourceFracIndex(ivec4 coords) {\n                        vec4 fcoords = vec4(coords);\n                        return vec4(\n                            ${h}.0 > 1.0 ? (fcoords.x + 0.5) / scaleWHWH.x - 0.5 : 0.0,\n                            ${d}.0 > 1.0 ? (fcoords.y + 0.5) / scaleWHWH.y - 0.5 : 0.0,\n                            ${h}.0 > 1.0 ? (fcoords.z + 0.5) / scaleWHWH.z - 0.5 : 0.0,\n                            ${d}.0 > 1.0 ? (fcoords.w + 0.5) / scaleWHWH.w - 0.5 : 0.0\n                          );\n                    }\n                `;break;case"align_corners":v=`\n                    vec4 getSourceFracIndex(ivec4 coords) {\n                        vec4 resized = vec4(${h}.0 - 1.0, ${d}.0 - 1.0, ${h}.0 - 1.0,\n                            ${d}.0 - 1.0);\n                        vec4 original = vec4(${m}.0 - 1.0, ${b}.0 - 1.0, ${m}.0 - 1.0,\n                            ${b}.0 - 1.0);\n                        vec4 new_scale = original / resized;\n                        return vec4(coords) * new_scale;\n                    }\n                `;break;default:throw new Error(`resize (packed) does not support coordinateTransformMode:                                 '${n.coordinateTransformMode}'`)}const w=(0,o.getCoordsDataType)(f),x=`\n            const vec2 inputWH = vec2(${b}.0, ${m}.0);\n            const vec4 scaleWHWH = vec4(float(${y}), float(${_}), float(${y}), float(${_}));\n            ${(0,a.unpackFromChannel)()}\n            ${v}\n            float getAValue(int x10, int r, int c, int d) {\n                return getChannel(getA(x10, r, c, d), vec2(c, d));\n            }\n            void main() {\n                ${w} rc = getOutputCoords();\n\n                int batch = rc[0];\n                int depth = rc[1];\n\n                // retrieve the 4 coordinates that is used in the 4 packed output values.\n                ivec4 coords = ivec4(rc.wz, rc.w + 1, rc.z + 1);\n\n                // calculate the source index in fraction\n                vec4 sourceFrac = getSourceFracIndex(coords);\n\n                // get the lower and upper bound of the 4 values that will be packed into one texel.\n                ivec4 x00 = ivec4(max(sourceFrac.xy, vec2(0.0)), min(inputWH - 1.0, ceil(sourceFrac.xy)));\n                ivec4 x01 = ivec4(max(sourceFrac.xw, vec2(0.0)), min(inputWH - 1.0, ceil(sourceFrac.xw)));\n                ivec4 x10 = ivec4(max(sourceFrac.zy, vec2(0.0)), min(inputWH - 1.0, ceil(sourceFrac.zy)));\n                ivec4 x11 = ivec4(max(sourceFrac.zw, vec2(0.0)), min(inputWH - 1.0, ceil(sourceFrac.zw)));\n\n                bool hasNextRow = rc.w < ${d-1};\n                bool hasNextCol = rc.z < ${h-1};\n\n                // pack x00, x01, x10, x11's top-left corner into one vec4 structure\n                vec4 topLeft = vec4(\n                    getAValue(batch, depth, x00.x, x00.y),\n                    hasNextCol ? getAValue(batch, depth, x01.x, x01.y) : 0.0,\n                    hasNextRow ? getAValue(batch, depth, x10.x, x10.y) : 0.0,\n                    (hasNextRow && hasNextCol) ? getAValue(batch, depth, x11.x, x11.y) : 0.0);\n\n                // pack x00, x01, x10, x11's top-right corner into one vec4 structure\n                vec4 topRight = vec4(\n                    getAValue(batch, depth, x00.x, x00.w),\n                    hasNextCol ? getAValue(batch, depth, x01.x, x01.w) : 0.0,\n                    hasNextRow ? getAValue(batch, depth, x10.x, x10.w) : 0.0,\n                    (hasNextRow && hasNextCol) ? getAValue(batch, depth, x11.x, x11.w) : 0.0);\n\n                // pack x00, x01, x10, x11's bottom-left corner into one vec4 structure\n                vec4 bottomLeft = vec4(\n                    getAValue(batch, depth, x00.z, x00.y),\n                    hasNextCol ? getAValue(batch, depth, x01.z, x01.y) : 0.0,\n                    hasNextRow ? getAValue(batch, depth, x10.z, x10.y) : 0.0,\n                    (hasNextRow && hasNextCol) ? getAValue(batch, depth, x11.z, x11.y) : 0.0);\n\n                // pack x00, x01, x10, x11's bottom-right corner into one vec4 structure\n                vec4 bottomRight = vec4(\n                    getAValue(batch, depth, x00.z, x00.w),\n                    hasNextCol ? getAValue(batch, depth, x01.z, x01.w) : 0.0,\n                    hasNextRow ? getAValue(batch, depth, x10.z, x10.w) : 0.0,\n                    (hasNextRow && hasNextCol) ? getAValue(batch, depth, x11.z, x11.w) : 0.0);\n\n                // calculate the interpolation fraction on u and v direction\n                vec4 frac = vec4(sourceFrac) - floor(sourceFrac);\n                vec4 clampFrac = clamp(frac, vec4(0.0), vec4(1.0));\n\n                vec4 top = mix(topLeft, topRight, clampFrac.ywyw);\n                vec4 bottom = mix(bottomLeft, bottomRight, clampFrac.ywyw);\n                vec4 newValue = mix(top, bottom, clampFrac.xxzz);\n\n                ${s.output} = vec4(newValue);\n            }\n        `;return Object.assign(Object.assign({},u),{output:{dims:p,type:e[0].type,textureType:i.TextureType.packed},hasMain:!0,shaderSource:x})},l=(t,e)=>{const n=t[0].dims;let r,i=e.scales;if(0===i.length){const o=t[e.scalesInputIdx];if(o&&0!==o.size){if(t[e.sizesInputIdx])throw new Error("Only one of scales or sizes must be provided as input.");i=p(o,e.mode,e.isResize)}else{const o=t[e.sizesInputIdx];if(!o||0===o.size)throw new Error("Either scales or sizes MUST be provided as input.");r=Array.from(o.integerData),i=f(r,n,e.mode,e.isResize)}}else if(t[e.sizesInputIdx])throw new Error("Only one of scales or sizes must be provided as input.");const o=r||n.map(((t,e)=>Math.floor(t*i[e])));return[i,o]},p=(t,e,n)=>{const r=Array.from(t.floatData);return(0,s.scalesValidation)(r,e,n),r},f=(t,e,n,r)=>{const i=e.length,o=new Array(i);for(let n=0,r=i;n<r;n++)if(0===e[n]){if(0!==t[n])throw new Error("Input dim is zero but required output dim is non-zero.");o[n]=1}else o[n]=t[n]/e[n];return(0,s.scalesValidation)(o,n,r),o}},8117:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.shape=void 0;const r=n(9162);e.shape=(t,e)=>(i(e),[new r.Tensor([e[0].dims.length],"int32",void 0,void 0,new Int32Array(e[0].dims))]);const i=t=>{if(!t||1!==t.length)throw new Error("Shape requires 1 input.")}},2278:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.sliceV10=e.parseSliceAttributes=e.slice=void 0;const r=n(246),i=n(782),o=n(2517),a=n(2039),s={name:"Slice",inputNames:["A"],inputTypes:[a.TextureType.unpacked]};e.slice=(t,e,n)=>(c(e),[t.run(Object.assign(Object.assign({},s),{cacheHint:n.cacheKey,get:()=>u(t,e[0],n)}),e)]),e.parseSliceAttributes=t=>{const e=t.attributes.getInts("starts"),n=t.attributes.getInts("ends"),i=t.attributes.getInts("axes",[]);return(0,r.createAttributeWithCacheKey)({starts:e,ends:n,axes:i})};const u=(t,e,n)=>{const r=0===n.axes.length?e.dims.slice(0).map(((t,e)=>e)):n.axes,i=o.ShapeUtil.normalizeAxes(r,e.dims.length),u=n.starts.map(((t,n)=>t>e.dims[i[n]]-1?e.dims[i[n]]:o.ShapeUtil.normalizeAxis(t,e.dims[i[n]]))),c=n.ends.map(((t,n)=>t>e.dims[i[n]]-1?e.dims[i[n]]:o.ShapeUtil.normalizeAxis(t,e.dims[i[n]]))),l=e.dims.slice(),p=[];for(let t=0;t<i.length;t++)l[i[t]]=c[t]-u[t],u[t]>0&&p.push(`outputIdx[${i[t]}] += ${u[t]};`);const f=`\n      float process(int outputIdx[${l.length}]) {\n        ${p.join("\n      ")}\n        return _A(outputIdx);\n      }`;return Object.assign(Object.assign({},s),{output:{dims:l,type:e.type,textureType:a.TextureType.unpacked},shaderSource:f})},c=t=>{if(!t||1!==t.length)throw new Error("Slice requires 1 input.");if(-1===i.NUMBER_TYPES.indexOf(t[0].type))throw new Error("Invalid input type.")};e.sliceV10=(t,e)=>{p(e);const n=l(t,e);return[t.run(Object.assign(Object.assign({},s),{cacheHint:n.cacheKey,get:()=>u(t,e[0],n)}),[e[0]])]};const l=(t,e)=>{if(!t.session.isInitializer(e[1].dataId)||!t.session.isInitializer(e[2].dataId)||e.length>=4&&!t.session.isInitializer(e[3].dataId)||e.length>=5&&!t.session.isInitializer(e[4].dataId))throw new Error("dynamic slice attributes are not allowed");if(e.length>=5&&e[4].integerData.some((t=>1!==t)))throw new Error("currently non-1 steps is not supported for Slice");const n=Array.from(e[1].integerData),r=Array.from(e[2].integerData),i=e.length>=4?Array.from(e[3].integerData):[];return{starts:n,ends:r,axes:i,cacheKey:`${i};${n};${r}`}},p=t=>{if(!t||t.length<3||t.length>5)throw new Error("Invalid input number.");if("int32"!==t[1].type||1!==t[1].dims.length)throw new Error("Invalid input type.");if("int32"!==t[2].type||1!==t[2].dims.length)throw new Error("Invalid input type.");if(t.length>=4&&("int32"!==t[3].type||1!==t[3].dims.length))throw new Error("Invalid input type.");if(t.length>=5&&("int32"!==t[4].type||1!==t[4].dims.length))throw new Error("Invalid input type.")}},5524:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.softmaxV13=e.parseSoftmaxAttributesV13=e.parseSoftmaxAttributes=e.softmax=void 0;const r=n(246),i=n(2517),o=n(5060),a=n(2039),s=n(3738),u={name:"SoftmaxComputeMax",inputNames:["A"],inputTypes:[a.TextureType.unpacked]},c={name:"SoftmaxComputeScale",inputNames:["A","Max"],inputTypes:[a.TextureType.unpacked,a.TextureType.unpacked]},l={name:"SoftMax",inputNames:["A","Max","Norm"],inputTypes:[a.TextureType.unpacked,a.TextureType.unpacked,a.TextureType.unpacked]};e.softmax=(t,e,n)=>{g(e);const r=e[0].dims.slice(),o=i.ShapeUtil.normalizeAxis(n.axis,r.length),a=i.ShapeUtil.sizeToDimension(r,o),s=i.ShapeUtil.sizeFromDimension(r,o);return p(t,e,n,a,s)},e.parseSoftmaxAttributes=t=>(0,r.createAttributeWithCacheKey)({axis:t.attributes.getInt("axis",1)}),e.parseSoftmaxAttributesV13=t=>(0,r.createAttributeWithCacheKey)({axis:t.attributes.getInt("axis",-1)}),e.softmaxV13=(t,e,n)=>{g(e);const o=e[0].dims.slice(),a=i.ShapeUtil.normalizeAxis(n.axis,o.length),u=o.length,c=a!==u-1,l=[];let f,d=[],h=[];c&&(d=Array.from({length:u}).map(((t,e)=>e)),d[a]=u-1,d[u-1]=a,d.map((t=>l.push(o[t]))),f=(0,r.createAttributeWithCacheKey)({perm:d}),h=(0,s.transpose)(t,e,f));const b=c?i.ShapeUtil.sizeToDimension(l,u-1):i.ShapeUtil.sizeToDimension(o,u-1),m=c?i.ShapeUtil.sizeFromDimension(l,u-1):i.ShapeUtil.sizeFromDimension(o,u-1),y=p(t,c?h:e,n,b,m);return c?(0,s.transpose)(t,y,f):y};const p=(t,e,n,r,i)=>{const o=f(t,e[0],r,i,[r]),a=t.run(Object.assign(Object.assign({},u),{cacheHint:n.cacheKey,get:()=>o}),e),s=d(t,e[0],r,i,o.output.dims,[r]),p=t.run(Object.assign(Object.assign({},c),{cacheHint:n.cacheKey,get:()=>s}),[e[0],a]),g=h(t,e[0],r,i,o.output.dims,s.output.dims);return[t.run(Object.assign(Object.assign({},l),{cacheHint:n.cacheKey,get:()=>g}),[e[0],a,p])]},f=(t,e,n,r,i)=>{const[s,c]=t.calculateTextureWidthAndHeight(e.dims,a.TextureType.unpacked),l=i.length;if(n<1||r<1)throw new Error("Logical row count N and feature count D must be greater than or equal to 1");if(1!==i.length)throw new Error("Dimensionality of the output should be 1");if(i[0]!==n)throw new Error("Shape of the output should be equal to logical row count");const p=(0,o.getGlsl)(t.session.backend.glContext.version),f=`\n      float process(int[${l}] indices) {\n        int logical_row_start_offset = indices[0] * ${r};\n\n        float max = getColorAsFloat(${p.texture2D}(A, offsetToCoords(logical_row_start_offset, ${s},\n        ${c} )));\n        for(int i=1; i<${r}; ++i)\n        {\n          float current = getColorAsFloat(${p.texture2D}(A, offsetToCoords(logical_row_start_offset + i,\n            ${s}, ${c})));\n          if(current > max)\n          max = current;\n        }\n\n        return max;\n      }`;return Object.assign(Object.assign({},u),{output:{dims:i,type:e.type,textureType:a.TextureType.unpacked},shaderSource:f})},d=(t,e,n,r,i,s)=>{const[u,l]=t.calculateTextureWidthAndHeight(e.dims,a.TextureType.unpacked),p=s.length;if(n<1||r<1)throw new Error("Logical row count N and feature count D must be greater than or equal to 1");if(1!==s.length)throw new Error("Dimensionality of the output should be 1");if(s[0]!==n)throw new Error("Shape of the output should be equal to logical row count");if(1!==i.length)throw new Error("Dimensionality of the intermediate results should be 1");if(i[0]!==n)throw new Error("Shape of the intermediate results should be equal to logical row count");const f=`\n      float process(int[${p}] indices) {\n        int logical_row_start_offset = indices[0] * ${r};\n\n        float norm_factor = 0.0;\n        float max = _Max(indices);\n        for(int i=0; i<${r}; ++i)\n        {\n          norm_factor += exp(getColorAsFloat(${(0,o.getGlsl)(t.session.backend.glContext.version).texture2D}(A, offsetToCoords(logical_row_start_offset + i,\n            ${u}, ${l}))) - max);\n        }\n\n        return norm_factor;\n      }`;return Object.assign(Object.assign({},c),{output:{dims:s,type:e.type,textureType:a.TextureType.unpacked},shaderSource:f})},h=(t,e,n,r,i,o)=>{const[s,u]=t.calculateTextureWidthAndHeight(e.dims,a.TextureType.unpacked),c=e.dims.length;if(n<1||r<1)throw new Error("Logical row count N and feature count D must be greater than or equal to 1");if(1!==i.length||1!==o.length)throw new Error("Dimensionality of the intermediate results should be 1");if(i[0]!==n||o[0]!==n)throw new Error("Shape of the intermediate results should be equal to logical row count");const p=`\n      float process(int[${c}] indices) {\n\n      // get offset of current logical tensor index from the 2-D texture coordinates (TexCoords)\n      int offset = coordsToOffset(TexCoords, ${s}, ${u});\n\n      //determine the logical row for this index\n      int logical_row_index[1];\n      logical_row_index[0] = offset / ${r};\n\n      float norm_factor = _Norm(logical_row_index);\n\n      // avoid possible division by 0\n      // if norm_facor is 0, all elements are zero\n      // if so, return 0\n      if(norm_factor == 0.0)\n        return 0.0;\n\n      return exp(_A(indices) - _Max(logical_row_index)) / norm_factor;\n    }`;return Object.assign(Object.assign({},l),{output:{dims:e.dims,type:e.type,textureType:a.TextureType.unpacked},shaderSource:p})},g=t=>{if(!t||1!==t.length)throw new Error("Softmax requires 1 input.");if("float32"!==t[0].type&&"float64"!==t[0].type)throw new Error("Invalid input type")}},5975:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseSplitAttributes=e.split=void 0;const r=n(246),i=n(2517),o=n(2039),a={name:"Split",inputNames:["A"],inputTypes:[o.TextureType.unpacked]};e.split=(t,e,n)=>{c(e);const r=i.ShapeUtil.normalizeAxis(n.axis,e[0].dims.length),o=s(t,e,r,n),l=[];for(let i=0;i<o;++i)l.push(t.run(Object.assign(Object.assign({},a),{cacheHint:`${n.cacheKey};${i}`,get:()=>u(t,e[0],n,r,i)}),e));return l},e.parseSplitAttributes=t=>{const e=t.attributes.getInt("axis",0),n=t.attributes.getInts("split",[]),i=t.outputs.length;return(0,r.createAttributeWithCacheKey)({axis:e,split:n,numOutputs:i})};const s=(t,e,n,r)=>{const[,o]=i.SplitUtil.splitShape(e[0].dims,n,r.split,r.numOutputs);return o.length},u=(t,e,n,r,s)=>{const[u,c]=i.SplitUtil.splitShape(e.dims,r,n.split,n.numOutputs),l=c[s],p=u[s],f=`\n      float process(int indices[${p.length}]) {\n        indices[${r}] += ${l};\n        return _A(indices);\n      }\n    `;return Object.assign(Object.assign({},a),{cacheHint:`${n.cacheKey}:${s}`,output:{dims:p,type:e.type,textureType:o.TextureType.unpacked},shaderSource:f})},c=t=>{if(!t||1!==t.length)throw new Error("Split requires one input.");if("int8"!==t[0].type&&"uint8"!==t[0].type&&"int16"!==t[0].type&&"uint16"!==t[0].type&&"int32"!==t[0].type&&"uint32"!==t[0].type&&"float32"!==t[0].type&&"float64"!==t[0].type&&"bool"!==t[0].type)throw new Error("Invalid input type.")}},3933:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseSqueezeAttributes=e.squeezeV13=e.squeeze=void 0;const r=n(2517);e.squeeze=(t,e,n)=>{i(e);const o=r.ShapeUtil.squeezeShape(e[0].dims,n);return[t.reshapeUnpacked(e[0],o)]},e.squeezeV13=(t,n)=>(o(n),(0,e.squeeze)(t,[n[0]],Array.from(n[1].integerData))),e.parseSqueezeAttributes=t=>t.attributes.getInts("axes");const i=t=>{if(!t||1!==t.length)throw new Error("Squeeze requires 1 input.");if("string"===t[0].type)throw new Error("invalid input tensor types.")},o=t=>{if(!t||2!==t.length)throw new Error("Squeeze requires 2 inputs.");if("int32"!==t[1].type)throw new Error("Invalid input type.")}},6558:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.sum=void 0;const r=n(5060),i=n(2039);e.sum=(t,e)=>{a(e);const n={name:"Sum",inputNames:e.map(((t,e)=>`X${e}`)),inputTypes:new Array(e.length).fill(i.TextureType.unpacked)};return[t.run(Object.assign(Object.assign({},n),{get:()=>o(t,e,n)}),e)]};const o=(t,e,n)=>{const o=(0,r.getGlsl)(t.session.backend.glContext.version),a=e[0].dims.slice(),s=`\n      void main() {\n        vec4 result = ${e.map(((t,e)=>`${o.texture2D}(X${e},TexCoords)`)).join(" + ")};\n        ${o.output} = result;\n      }\n    `;return Object.assign(Object.assign({},n),{output:{dims:a,type:e[0].type,textureType:i.TextureType.unpacked},hasMain:!0,shaderSource:s})},a=t=>{if(!t||0===t.length)throw new Error("Sum requires inputs.");const e=t[0].dims.length;for(let n=1;n<t.length;n++){if(e!==t[n].dims.length)throw new Error("Input shapes are mismatched.");for(let r=0;r<e;r++)if(t[0].dims[r]!==t[n].dims[r])throw new Error("Input shapes are not matched.")}if("float32"!==t[0].type&&"float64"!==t[0].type)throw new Error("Invalid input type.");for(let e=1;e<t.length;e++)if(t[0].type!==t[e].type)throw new Error("Input types are not matched.")}},5723:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.tile=void 0;const r=n(782),i=n(2039);e.tile=(t,e)=>{a(e);const n={name:"Tile",inputNames:["A"],inputTypes:[i.TextureType.unpacked]};return[t.run(Object.assign(Object.assign({},n),{get:()=>o(t,e,n)}),e)]};const o=(t,e,n)=>{const r=e[0].dims.slice(),o=new Array(r.length),a=[];for(let t=0;t<r.length;t++)o[t]=r[t]*e[1].numberData[t],a.push(`inputIdx[${t}] = int(mod(float(outputIdx[${t}]), ${r[t]}.));`);const s=o.length,u=`\n      float process(int outputIdx[${s}]) {\n        int inputIdx[${s}];\n        ${a.join("\n")}\n        return _A(inputIdx);\n      }\n    `;return Object.assign(Object.assign({},n),{output:{dims:o,type:e[0].type,textureType:i.TextureType.unpacked},shaderSource:u})},a=t=>{if(!t||2!==t.length)throw new Error("Tile requires 2 input.");if(1!==t[1].dims.length)throw new Error("The second input shape must 1 dimension.");if(t[1].dims[0]!==t[0].dims.length)throw new Error("Invalid input shape.");if(-1===r.NUMBER_TYPES.indexOf(t[0].type))throw new Error("Invalid input type.");if("int32"!==t[1].type&&"int16"!==t[1].type)throw new Error("Invalid repeat type.")}},3738:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseTransposeAttributes=e.transpose=void 0;const r=n(246),i=n(2517),o=n(2039),a={name:"Transpose",inputNames:["A"],inputTypes:[o.TextureType.unpacked]};e.transpose=(t,e,n)=>(p(e),[t.run(Object.assign(Object.assign({},a),{cacheHint:n.cacheKey,get:()=>s(t,e[0],n.perm)}),e)]),e.parseTransposeAttributes=t=>(0,r.createAttributeWithCacheKey)({perm:t.attributes.getInts("perm",[])});const s=(t,e,n)=>{const r=e.dims;n=u(r,n);const i=c(r,n),s=r.length,p=`\n      ${l("perm",n,s)}\n      float process(int indices[${s}]) {\n        int a[${s}];\n        perm(a, indices);\n        return _A(a);\n      }`;return Object.assign(Object.assign({},a),{output:{dims:i,type:e.type,textureType:o.TextureType.unpacked},shaderSource:p})},u=(t,e)=>(e&&e.length!==t.length&&(e=[...t.keys()].reverse()),e),c=(t,e)=>(e=u(t,e),i.ShapeUtil.sortBasedOnPerm(t,e)),l=(t,e,n)=>{const r=[];r.push(`void ${t}(out int a[${n}], int src[${n}]) {`);for(let t=0;t<n;++t)r.push(`\ta[${e[t]}]=src[${t}];`);return r.push("\t}"),r.join("\n")},p=t=>{if(!t||1!==t.length)throw new Error("Transpose requires 1 input.");if("float32"!==t[0].type&&"float64"!==t[0].type)throw new Error("input should be float tensor")}},8710:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.encodeAsUint8=void 0;const r=n(5060),i=n(2039);e.encodeAsUint8=(t,e)=>{const n=e.shape,o=(0,r.getGlsl)(t.session.backend.glContext.version),a=`\n    const float FLOAT_MAX = 1.70141184e38;\n    const float FLOAT_MIN = 1.17549435e-38;\n\n    bool isNaN(float val) {\n      return (val < 1.0 || 0.0 < val || val == 0.0) ? false : true;\n    }\n\n    highp vec4 encodeAsUint8(highp float v) {\n      if (isNaN(v)) {\n        return vec4(255, 255, 255, 255);\n      }\n\n      highp float av = abs(v);\n\n      if(av < FLOAT_MIN) {\n        return vec4(0.0, 0.0, 0.0, 0.0);\n      } else if(v > FLOAT_MAX) {\n        return vec4(0.0, 0.0, 128.0, 127.0) / 255.0;\n      } else if(v < -FLOAT_MAX) {\n        return vec4(0.0, 0.0,  128.0, 255.0) / 255.0;\n      }\n\n      highp vec4 c = vec4(0,0,0,0);\n\n      highp float e = floor(log2(av));\n      highp float m = exp2(fract(log2(av))) - 1.0;\n\n      c[2] = floor(128.0 * m);\n      m -= c[2] / 128.0;\n      c[1] = floor(32768.0 * m);\n      m -= c[1] / 32768.0;\n      c[0] = floor(8388608.0 * m);\n\n      highp float ebias = e + 127.0;\n      c[3] = floor(ebias / 2.0);\n      ebias -= c[3] * 2.0;\n      c[2] += floor(ebias) * 128.0;\n\n      c[3] += 128.0 * step(0.0, -v);\n\n      return c / 255.0;\n    }\n\n    void main() {\n      float value = ${o.texture2D}(X,TexCoords).r;\n      ${o.output} = encodeAsUint8(value);\n    }`,s={name:"Uint8Encode",inputTypes:[i.TextureType.unpacked],inputNames:["X"],output:{dims:n,type:e.tensor.type,textureType:i.TextureType.downloadUint8AsFloat},shaderSource:a,hasMain:!0};return t.executeProgram(s,[e.tensor])}},4909:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.tanh=e.tan=e.sqrt=e.sin=e.sigmoid=e.relu=e.not=e.neg=e.log=e.parseLeakyReluAttributes=e.leakyRelu=e.identity=e.floor=e.exp=e.parseEluAttributes=e.elu=e.cos=e.ceil=e.clipV11=e.parseClipAttributes=e.clip=e.atan=e.asin=e.acos=e.abs=e.glslTanh=e.glslTan=e.glslSqrt=e.glslSigmoid=e.glslRelu=e.glslSin=e.glslNot=e.glslNeg=e.glslLog=e.glslLeakyRelu=e.glslIdentity=e.glslClip=e.glslFloor=e.glslExp=e.glslElu=e.glslCos=e.glslCeil=e.glslAtan=e.glslAsin=e.glslAcos=e.glslAbs=void 0;const r=n(246),i=n(2517),o=n(8520),a=n(5060),s=n(2039);function u(){return P("abs")}function c(){return P("acos")}function l(){return P("asin")}function p(){return P("atan")}function f(){return P("ceil")}function d(){return P("cos")}function h(t){const e="elu";return{body:`\n  const float alpha = float(${t});\n\n  float ${e}_(float a) {\n    return a >= 0.0 ? a: (exp(a) - 1.0) * alpha;\n  }\n  vec4 ${e}_(vec4 v) {\n    return vec4(${e}_(v.x), ${e}_(v.y), ${e}_(v.z), ${e}_(v.w));\n  }\n  `,name:e,type:o.FunctionType.ValueBased}}function g(){return P("exp")}function b(){return P("floor")}function m(t,e){const n="clip";return{body:`\n  const float min = float(${t});\n  const float max = float(${e});\n\n  float ${n}_(float a) {\n    return clamp(a, min, max);\n  }\n  vec4 ${n}_(vec4 v) {\n    return clamp(v, min, max);\n  }\n  `,name:n,type:o.FunctionType.ValueBased}}function y(){const t="indentity";return{body:`\n  float ${t}_(float a) {\n    return a;\n  }\n  vec4 ${t}_(vec4 v) {\n    return v;\n  }\n  `,name:t,type:o.FunctionType.ValueBased}}function _(t){const e="leakyRelu";return{body:`\n  const float alpha = float(${t});\n\n  float ${e}_(float a) {\n    return a < 0.0 ? a * alpha : a;\n  }\n  vec4 ${e}_(vec4 v) {\n    return vec4(${e}_(v.x), ${e}_(v.y), ${e}_(v.z), ${e}_(v.w));\n  }\n  `,name:e,type:o.FunctionType.ValueBased}}function v(){return P("log")}function w(){const t="neg";return{body:`\n  float ${t}_(float a) {\n    return -a;\n  }\n  vec4 ${t}_(vec4 v) {\n    return -v;\n  }\n  `,name:t,type:o.FunctionType.ValueBased}}function x(){const t="not";return{body:`\n  float ${t}_(float a) {\n    return float( ! bool(a) );\n  }\n  bool ${t}_(bool a) {\n    return !a;\n  }\n  vec4 ${t}_(vec4 v) {\n    return vec4(!bool(v.x), !bool(v.y), !bool(v.z), !bool(v.w));\n  }\n  bvec4 ${t}_(bvec4 v) {\n    return bvec4(!v.x, !v.y, !v.z, !v.w);\n  }\n  `,name:t,type:o.FunctionType.ValueBased}}function T(){return P("sin")}function S(){const t="relu";return{body:`\n  float ${t}_(float a) {\n    return max( a, 0.0 );\n  }\n  vec4 ${t}_(vec4 v) {\n    return max( v, 0.0 );\n  }\n  `,name:t,type:o.FunctionType.ValueBased}}function O(){const t="sigmoid";return{body:`\n  float ${t}_(float a) {\n    return 1.0 / (1.0 + exp(-a));\n  }\n  vec4 ${t}_(vec4 v) {\n    return 1.0 / (1.0 + exp(-v));\n  }\n  `,name:t,type:o.FunctionType.ValueBased}}function A(){return P("sqrt")}function E(){return P("tan")}function I(){const t="tanh";return{body:`\n  float ${t}_(float a) {\n    a = clamp(a, -10., 10.);\n    a = exp(2.*a);\n    return (a - 1.) / (a + 1.);\n  }\n  vec4 ${t}_(vec4 v) {\n    v = clamp(v, -10., 10.);\n    v = exp(2.*v);\n    return (v - 1.) / (v + 1.);\n  }\n  `,name:t,type:o.FunctionType.ValueBased}}function P(t){return{body:`\n  float ${t}_(float a) {\n    return ${t}(a);\n  }\n  vec4 ${t}_(vec4 v) {\n    return ${t}(v);\n  }\n  `,name:t,type:o.FunctionType.ValueBased}}e.glslAbs=u,e.glslAcos=c,e.glslAsin=l,e.glslAtan=p,e.glslCeil=f,e.glslCos=d,e.glslElu=h,e.glslExp=g,e.glslFloor=b,e.glslClip=m,e.glslIdentity=y,e.glslLeakyRelu=_,e.glslLog=v,e.glslNeg=w,e.glslNot=x,e.glslSin=T,e.glslRelu=S,e.glslSigmoid=O,e.glslSqrt=A,e.glslTan=E,e.glslTanh=I;const D=(t,e,n,r)=>{const i=t.session.pack?s.TextureType.packed:s.TextureType.unpacked,o={name:n.name,inputTypes:[i],inputNames:["A"],cacheHint:r};return Object.assign(Object.assign({},o),{get:()=>((t,e,n,r)=>{const i=t.session.pack?s.TextureType.packed:s.TextureType.unpacked,o=(0,a.getGlsl)(t.session.backend.glContext.version);return Object.assign(Object.assign({},e),{output:{dims:n.dims,type:n.type,textureType:i},shaderSource:`\n     ${r.body}\n     void main() {\n       vec4 v = ${o.texture2D}(A, TexCoords);\n       v = ${r.name}_(v);\n       ${o.output} = v;\n     }\n     `,hasMain:!0})})(t,o,e,n)})};e.abs=(t,e)=>[t.run(D(t,e[0],u()),e)],e.acos=(t,e)=>[t.run(D(t,e[0],c()),e)],e.asin=(t,e)=>[t.run(D(t,e[0],l()),e)],e.atan=(t,e)=>[t.run(D(t,e[0],p()),e)],e.clip=(t,e,n)=>[t.run(D(t,e[0],m(n.min,n.max),n.cacheKey),e)],e.parseClipAttributes=t=>(0,r.createAttributeWithCacheKey)({min:t.attributes.getFloat("min",i.MIN_CLIP),max:t.attributes.getFloat("max",i.MAX_CLIP)}),e.clipV11=(t,n)=>{const r=$(t,n);return(0,e.clip)(t,[n[0]],r)};const $=(t,e)=>{if(e.length>=3&&(!t.session.isInitializer(e[1].dataId)||!t.session.isInitializer(e[2].dataId)))throw new Error("dynamic clip attributes are not allowed");const n=e.length>=3?e[1].numberData[0]:i.MIN_CLIP,o=e.length>=3?e[2].numberData[0]:i.MAX_CLIP;return(0,r.createAttributeWithCacheKey)({min:n,max:o})};e.ceil=(t,e)=>[t.run(D(t,e[0],f()),e)],e.cos=(t,e)=>[t.run(D(t,e[0],d()),e)],e.elu=(t,e,n)=>[t.run(D(t,e[0],h(n.alpha),n.cacheKey),e)],e.parseEluAttributes=t=>(0,r.createAttributeWithCacheKey)({alpha:t.attributes.getFloat("alpha",1)}),e.exp=(t,e)=>[t.run(D(t,e[0],g()),e)],e.floor=(t,e)=>[t.run(D(t,e[0],b()),e)],e.identity=(t,e)=>[t.run(D(t,e[0],y()),e)],e.leakyRelu=(t,e,n)=>[t.run(D(t,e[0],_(n.alpha),n.cacheKey),e)],e.parseLeakyReluAttributes=t=>(0,r.createAttributeWithCacheKey)({alpha:t.attributes.getFloat("alpha",.01)}),e.log=(t,e)=>[t.run(D(t,e[0],v()),e)],e.neg=(t,e)=>[t.run(D(t,e[0],w()),e)],e.not=(t,e)=>[t.run(D(t,e[0],x()),e)],e.relu=(t,e)=>[t.run(D(t,e[0],S()),e)],e.sigmoid=(t,e)=>[t.run(D(t,e[0],O()),e)],e.sin=(t,e)=>[t.run(D(t,e[0],T()),e)],e.sqrt=(t,e)=>[t.run(D(t,e[0],A()),e)],e.tan=(t,e)=>[t.run(D(t,e[0],E()),e)],e.tanh=(t,e)=>[t.run(D(t,e[0],I()),e)]},5611:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.createUnpackProgramInfoLoader=e.createUnpackProgramInfo=void 0;const r=n(5060),i=n(2039),o=n(9390),a=n(2827),s={name:"unpack",inputNames:["A"],inputTypes:[i.TextureType.packed]};e.createUnpackProgramInfo=(t,e)=>{const n=e.dims.length,u=(0,a.getChannels)("rc",n),c=u.slice(-2),l=(0,o.getCoordsDataType)(n),p=(0,a.unpackFromChannel)(),f=0===e.dims.length?"":function(t,e){if(1===t)return"rc";let n="";for(let r=0;r<t;r++)n+=e[r],r<t-1&&(n+=",");return n}(n,u),d=n<=1?"rc":`vec2(${c.join(",")})`,h=`\n    ${p}\n    void main() {\n      ${l} rc = getOutputCoords();\n\n       // Sample the texture with the coords to get the rgba channel value.\n       vec4 packedInput = getA(${f});\n\n       ${(0,r.getGlsl)(t.session.backend.glContext.version).output} = vec4(getChannel(packedInput, ${d}), 0, 0, 0);\n     }\n   `;return Object.assign(Object.assign({},s),{hasMain:!0,output:{dims:e.dims,type:e.type,textureType:i.TextureType.unpacked},shaderSource:h})},e.createUnpackProgramInfoLoader=(t,n)=>Object.assign(Object.assign({},s),{get:()=>(0,e.createUnpackProgramInfo)(t,n)})},8428:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.parseUnsqueezeAttributes=e.unsqueezeV13=e.unsqueeze=void 0;const r=n(2517);e.unsqueeze=(t,e,n)=>{i(e);const o=r.ShapeUtil.unsqueezeShape(e[0].dims,n);return[t.reshapeUnpacked(e[0],o)]},e.unsqueezeV13=(t,n)=>(o(n),(0,e.unsqueeze)(t,[n[0]],Array.from(n[1].integerData))),e.parseUnsqueezeAttributes=t=>t.attributes.getInts("axes");const i=t=>{if(!t||1!==t.length)throw new Error("Unsqueeze requires 1 input.");if("string"===t[0].type)throw new Error("invalid input tensor types.")},o=t=>{if(!t||2!==t.length)throw new Error("Unsqueeze requires 2 inputs.");if("int32"!==t[1].type)throw new Error("Invalid input type.")}},9793:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.scalesValidation=e.validateInputs=e.parseUpsampleAttributes=e.parseUpsampleAttributesV9=e.parseUpsampleAttributesV7=e.upsample=void 0;const r=n(246),i=n(5060),o=n(2039),a={name:"Upsample",inputNames:["X"],inputTypes:[o.TextureType.unpacked]};e.upsample=(t,n,r)=>((0,e.validateInputs)(n,r),[t.run(Object.assign(Object.assign({},a),{cacheHint:r.cacheKey,get:()=>s(t,n,r)}),n)]),e.parseUpsampleAttributesV7=t=>(0,e.parseUpsampleAttributes)(t,7),e.parseUpsampleAttributesV9=t=>(0,e.parseUpsampleAttributes)(t,9),e.parseUpsampleAttributes=(t,n)=>{const i=n>=10,o=t.attributes.getString("mode","nearest");if("nearest"!==o&&"linear"!==o&&(n<11||"cubic"!==o))throw new Error(`unrecognized mode: ${o}`);let a=[];n<9&&(a=t.attributes.getFloats("scales"),(0,e.scalesValidation)(a,o,i));const s=t.attributes.getFloat("extrapolation_value",0),u=n>10?t.attributes.getString("coordinate_transformation_mode","half_pixel"):"asymmetric";if(-1===["asymmetric","pytorch_half_pixel","tf_half_pixel_for_nn","align_corners","tf_crop_and_resize","half_pixel"].indexOf(u))throw new Error(`coordinate_transform_mode '${u}' is not supported`);const c="tf_crop_and_resize"===u,l=c,p="nearest"===o&&n>=11?t.attributes.getString("nearest_mode","round_prefer_floor"):"";if(-1===["round_prefer_floor","round_prefer_ceil","floor","ceil",""].indexOf(p))throw new Error(`nearest_mode '${p}' is not supported`);const f=t.attributes.getFloat("cubic_coeff_a",-.75),d=0!==t.attributes.getInt("exclude_outside",0);if(d&&"cubic"!==o)throw new Error("exclude_outside can be set to 1 only when mode is CUBIC.");const h=n<11||"nearest"===o&&"asymmetric"===u&&"floor"===p;let g=0,b=0,m=0;return n>10?t.inputs.length>2?(g=1,b=2,m=3):(b=1,m=2):9===n&&(b=1),(0,r.createAttributeWithCacheKey)({opset:n,isResize:i,mode:o,scales:a,extrapolationValue:s,coordinateTransformMode:u,useExtrapolation:l,needRoiInput:c,nearestMode:p,cubicCoefficientA:f,excludeOutside:d,useNearest2xOptimization:h,roiInputIdx:g,scalesInputIdx:b,sizesInputIdx:m})};const s=(t,e,n)=>{const r=(0,i.getGlsl)(t.session.backend.glContext.version),[s,u]=t.calculateTextureWidthAndHeight(e[0].dims,o.TextureType.unpacked),c=e[0].dims.map(((t,e)=>Math.floor(t*n.scales[e]))),[l,p]=t.calculateTextureWidthAndHeight(c,o.TextureType.unpacked),f=c.length,d=new Array(f),h=new Array(f);let g=`\n      int output_pitches[${f}];\n      int input_pitches[${f}];\n      `;for(let t=f-1;t>=0;t--)d[t]=t===f-1?1:d[t+1]*c[t+1],h[t]=t===f-1?1:h[t+1]*e[0].dims[t+1],g+=`\n        output_pitches[${t}] = ${d[t]};\n        input_pitches[${t}] = ${h[t]};\n        `;const b=`\n      float getInputFloat(int index) {\n        vec2 coords = offsetToCoords(index, ${s}, ${u});\n        float value = getColorAsFloat(${r.texture2D}(X, coords));\n        return value;\n      }\n      `,m="nearest"===n.mode?`\n    ${b}\n    float process(int indices[${f}]) {\n      int input_index = 0;\n      int output_index = coordsToOffset(TexCoords, ${l}, ${p});\n\n      ${g}\n\n      int d, m;\n      for (int dim = 0; dim < ${f}; ++dim) {\n        d = output_index / output_pitches[dim];\n        m = output_index - d * output_pitches[dim];\n        output_index = m;\n\n        if (scales[dim] != 1 && d > 0) {\n          int d2 = d / scales[dim];\n          m = d - d2 * scales[dim];\n          d = d2;\n        }\n        input_index += input_pitches[dim] * d;\n      }\n\n      return getInputFloat(input_index);\n    }`:4===f?`\n    ${b}\n    float process(int indices[4]) {\n      int input_index = 0;\n      int output_index = coordsToOffset(TexCoords, ${l}, ${p});\n\n      ${g}\n\n      int m;\n      int index_of_dim0, index_of_dim1, index_of_dim2, index_of_dim3;\n      index_of_dim0 = output_index / output_pitches[0];\n      m = output_index - index_of_dim0 * output_pitches[0];\n      index_of_dim1 = m / output_pitches[1];\n      m = m - index_of_dim1 * output_pitches[1];\n      index_of_dim2 = m / output_pitches[2];\n      m = m - index_of_dim2 * output_pitches[2];\n      index_of_dim3 = m;\n\n      int index_of_input_dim2, index_of_input_dim3, x_offset, y_offset;\n      index_of_input_dim2 = index_of_dim2 / scales[2];\n      y_offset = index_of_dim2 - index_of_input_dim2 * scales[2];\n      index_of_input_dim3 = index_of_dim3 / scales[3];\n      x_offset = index_of_dim3 - index_of_input_dim3 * scales[3];\n\n      input_index = index_of_dim0 * input_pitches[0] +\n            index_of_dim1 * input_pitches[1] +\n            index_of_input_dim2 * input_pitches[2] +\n            index_of_input_dim3;\n\n      float x00 = getInputFloat(input_index);\n      float x10, x01, x11;\n\n      bool end_of_dim2 = false;\n      if (index_of_input_dim2 == (${e[0].dims[2]} - 1)) {\n        // It's the end in dimension 2\n        x01 = x00;\n        end_of_dim2 = true;\n      } else {\n        x01 = getInputFloat(input_index + input_pitches[2]);\n      }\n\n      if (index_of_input_dim3 == (input_pitches[2] - 1)) {\n        // It's the end in dimension 3\n        x10 = x00;\n        x11 = x01;\n      }\n      else {\n        x10 = getInputFloat(input_index + 1);\n        x11 = end_of_dim2 ? x10 : getInputFloat(input_index + input_pitches[2] + 1);\n      }\n\n      float y0 = x00 + float(y_offset) * (x01 - x00) / float(scales[2]);\n      float y1 = x10 + float(y_offset) * (x11 - x10) / float(scales[2]);\n      return y0 + float(x_offset) * (y1 - y0) / float(scales[3]);\n    }`:`\n    ${b}\n    float process(int indices[2]) {\n      int input_index = 0;\n      int output_index = coordsToOffset(TexCoords, ${l}, ${p});\n\n      ${g}\n\n      int m;\n      int index_of_dim0, index_of_dim1;\n      index_of_dim0 = output_index / output_pitches[0];\n      m = output_index - index_of_dim0 * output_pitches[0];\n      index_of_dim1 = m;\n\n      int index_of_input_dim0, index_of_input_dim1, x_offset, y_offset;\n      index_of_input_dim0 = index_of_dim0 / scales[0];\n      y_offset = index_of_dim0 - index_of_input_dim0 * scales[0];\n      index_of_input_dim1 = index_of_dim1 / scales[1];\n      x_offset = index_of_dim1 - index_of_input_dim1 * scales[1];\n\n      input_index = index_of_input_dim0 * input_pitches[0] + index_of_input_dim1;\n\n      float x00 = getInputFloat(input_index);\n      float x10, x01, x11;\n\n      bool end_of_dim0 = false;\n      if (index_of_input_dim0 == (${e[0].dims[0]} - 1)) {\n        // It's the end in dimension 0\n        x01 = x00;\n        end_of_dim0 = true;\n      } else {\n        x01 = getInputFloat(input_index + input_pitches[0]);\n      }\n\n      if (index_of_input_dim1 == (input_pitches[0] - 1)) {\n        // It's the end in dimension 1\n        x10 = x00;\n        x11 = x01;\n      }\n      else {\n        x10 = getInputFloat(input_index + 1);\n        x11 = end_of_dim0 ? x10 : getInputFloat(input_index + input_pitches[0] + 1);\n      }\n\n      float y0 = x00 + float(y_offset) * (x01 - x00) / float(scales[0]);\n      float y1 = x10 + float(y_offset) * (x11 - x10) / float(scales[0]);\n      return y0 + float(x_offset) * (y1 - y0) / float(scales[1]);\n    }`;return Object.assign(Object.assign({},a),{output:{dims:c,type:e[0].type,textureType:o.TextureType.unpacked},shaderSource:m,variables:[{name:"scales",type:"int",arrayLength:n.scales.length,data:n.scales.map((t=>Math.ceil(t)))}]})};e.validateInputs=(t,e)=>{if(!t||e.opset<9&&1!==t.length||e.opset>=9&&e.opset<11&&2!==t.length||e.opset>=11&&t.length<2)throw new Error("invalid inputs.");if(e.scales.length>0&&t[0].dims.length!==e.scales.length)throw new Error("Invalid input shape.");if("string"===t[0].type)throw new Error("Invalid input tensor types.")},e.scalesValidation=(t,e,n)=>{if(n){for(const e of t)if(e<=0)throw new Error("Scale value should be greater than 0.")}else for(const e of t)if(e<1)throw new Error("Scale value should be greater than or equal to 1.");if(!("linear"!==e&&"cubic"!==e||2===t.length||4===t.length&&1===t[0]&&1===t[1]))throw new Error(`'Linear' mode and 'Cubic' mode only support 2-D inputs ('Bilinear', 'Bicubic')         or 4-D inputs with the corresponding outermost 2 scale values being 1         in the ${n?"Resize":"Upsample"} opeartor.`)}},1958:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.ProgramManager=void 0;const r=n(1670),i=n(6231),o=n(8879),a=n(5060);e.ProgramManager=class{constructor(t,e,n){this.profiler=t,this.glContext=e,this.textureLayoutStrategy=n,this.repo=new Map,this.attributesBound=!1}getArtifact(t){return this.repo.get(t)}setArtifact(t,e){this.repo.set(t,e)}run(t,e,n){var r;this.profiler.event("op",`ProgramManager.run ${null!==(r=t.programInfo.name)&&void 0!==r?r:"unknown kernel"}`,(()=>{var r;const o=this.glContext.gl,a=t.program;o.useProgram(a);try{this.bindOutput(n),this.attributesBound||this.bindAttributes(t.attribLocations),this.bindUniforms(t.uniformLocations,null!==(r=t.programInfo.variables)&&void 0!==r?r:[],e)}catch(e){throw i.Logger.error("ProgramManager",t.programInfo.shaderSource),e}this.profiler.event("backend","GlContext.draw()",(()=>{this.glContext.draw()}))}),this.glContext)}dispose(){this.vertexShader&&this.glContext.deleteShader(this.vertexShader),this.repo.forEach((t=>this.glContext.deleteProgram(t.program)))}build(t,e,n){return this.profiler.event("backend","ProgramManager.build",(()=>{const r=new o.GlslPreprocessor(this.glContext,t,e,n),i=r.preprocess(),a=this.compile(i);return{programInfo:t,program:a,uniformLocations:this.getUniformLocations(a,r.context.programInfo.inputNames,r.context.programInfo.variables),attribLocations:this.getAttribLocations(a)}}))}compile(t){if(!this.vertexShader){i.Logger.verbose("ProrgramManager","Compiling and caching Vertex shader for the first time");const t=(0,a.getVertexShaderSource)(this.glContext.version);this.vertexShader=this.glContext.compileShader(t,this.glContext.gl.VERTEX_SHADER)}r.env.debug&&i.Logger.verbose("ProrgramManager",`FragShader:\n${t}\n`);const e=this.glContext.compileShader(t,this.glContext.gl.FRAGMENT_SHADER),n=this.glContext.createProgram(this.vertexShader,e);return this.glContext.deleteShader(e),n}bindOutput(t){const e=t.width,n=t.height;i.Logger.verbose("ProrgramManager",`Binding output texture to Framebuffer: w/h=${e}/${n}, shape=${t.shape}, type=${t.tensor.type}`),this.glContext.attachFramebuffer(t.texture,e,n)}bindAttributes(t){const e=t.position,n=t.textureCoord;this.glContext.setVertexAttributes(e,n),this.attributesBound=!0}bindUniforms(t,e,n){var r;const i=this.glContext.gl;let o=0;for(const{name:a,type:s,location:u,arrayLength:c}of t){const t=null===(r=e.find((t=>t.name===a)))||void 0===r?void 0:r.data;if("sampler2D"!==s&&!t)throw new Error(`variable '${a}' does not have data defined in program info`);switch(s){case"sampler2D":this.bindTexture(n[o],u,o),o++;break;case"float":c?i.uniform1fv(u,t):i.uniform1f(u,t);break;case"int":c?i.uniform1iv(u,t):i.uniform1i(u,t);break;default:throw new Error(`Uniform not implemented: ${s}`)}}}bindTexture(t,e,n){this.glContext.bindTextureToUniform(t.texture,n,e)}getAttribLocations(t){return{position:this.getAttribLocation(t,"position"),textureCoord:this.getAttribLocation(t,"textureCoord")}}getUniformLocations(t,e,n){const r=[];if(e)for(const n of e)r.push({name:n,type:"sampler2D",location:this.getUniformLocation(t,n)});if(n)for(const e of n)r.push(Object.assign(Object.assign({},e),{location:this.getUniformLocation(t,e.name)}));return r}getUniformLocation(t,e){const n=this.glContext.gl.getUniformLocation(t,e);if(null===n)throw new Error(`Uniform ${e} not found.`);return n}getAttribLocation(t,e){return this.glContext.gl.getAttribLocation(t,e)}}},6416:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.WebGLSessionHandler=void 0;const r=n(6231),i=n(1047),o=n(8316),a=n(1640),s=n(1958),u=n(7859),c=n(5702);e.WebGLSessionHandler=class{constructor(t,e){this.backend=t,this.context=e,this.layoutStrategy=new u.PreferLogicalStrategy(t.glContext.maxTextureSize),this.programManager=new s.ProgramManager(this.context.profiler,t.glContext,this.layoutStrategy),this.textureManager=new c.TextureManager(t.glContext,this.layoutStrategy,this.context.profiler,{reuseTextures:"full"===t.textureCacheMode}),this.packedTextureDataCache=new Map,this.unpackedTextureDataCache=new Map,this.pack=t.pack,this.pack2unpackMap=new Map,this.unpack2packMap=new Map}createInferenceHandler(){return new o.WebGLInferenceHandler(this)}onGraphInitialized(t){const e=t.getValues().filter((t=>-1===t.from&&t.tensor)).map((t=>t.tensor.dataId));this.initializers=new Set(e)}isInitializer(t){return!!this.initializers&&this.initializers.has(t)}addInitializer(t){this.initializers.add(t)}getTextureData(t,e){return e?this.packedTextureDataCache.get(t):this.unpackedTextureDataCache.get(t)}setTextureData(t,e,n=!1){r.Logger.verbose("WebGLSessionHandler","Storing Texture data in cache"),n?this.packedTextureDataCache.set(t,e):this.unpackedTextureDataCache.set(t,e)}dispose(){this.programManager.dispose(),this.textureManager.clearActiveTextures(),this.packedTextureDataCache.forEach((t=>this.textureManager.releaseTexture(t,!0))),this.packedTextureDataCache=new Map,this.unpackedTextureDataCache.forEach((t=>this.textureManager.releaseTexture(t,!0))),this.unpackedTextureDataCache=new Map}resolve(t,e,n){const r=(0,i.resolveOperator)(t,e,a.WEBGL_OP_RESOLVE_RULES);return{impl:r.opImpl,context:r.opInit?r.opInit(t,n):t}}}},7769:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.Uint8DataEncoder=e.RGBAFloatDataEncoder=e.RedFloat32DataEncoder=void 0;const r=n(6231);e.RedFloat32DataEncoder=class{constructor(t,e=1){if(1===e)this.internalFormat=t.R32F,this.format=t.RED,this.textureType=t.FLOAT,this.channelSize=e;else{if(4!==e)throw new Error(`Invalid number of channels: ${e}`);this.internalFormat=t.RGBA32F,this.format=t.RGBA,this.textureType=t.FLOAT,this.channelSize=e}}encode(t,e){let n,i;return t.constructor!==Float32Array&&(r.Logger.warning("Encoder","data was not of type Float32; creating new Float32Array"),i=new Float32Array(t)),e*this.channelSize>t.length?(r.Logger.warning("Encoder","Source data too small. Allocating larger array"),i=t,n=this.allocate(e*this.channelSize),i.forEach(((t,e)=>n[e]=t))):(i=t,n=i),n}allocate(t){return new Float32Array(4*t)}decode(t,e){return 1===this.channelSize?t.filter(((t,e)=>e%4==0)).subarray(0,e):t.subarray(0,e)}},e.RGBAFloatDataEncoder=class{constructor(t,e=1,n){if(1!==e&&4!==e)throw new Error(`Invalid number of channels: ${e}`);this.internalFormat=t.RGBA,this.format=t.RGBA,this.channelSize=e,this.textureType=n||t.FLOAT}encode(t,e){let n=t;return 1===this.channelSize&&(r.Logger.verbose("Encoder","Exploding into a larger array"),n=this.allocate(e),t.forEach(((t,e)=>n[4*e]=t))),n}allocate(t){return new Float32Array(4*t)}decode(t,e){return 1===this.channelSize?t.filter(((t,e)=>e%4==0)).subarray(0,e):t.subarray(0,e)}},e.Uint8DataEncoder=class{constructor(t,e=1){if(this.channelSize=4,1===e)this.internalFormat=t.ALPHA,this.format=t.ALPHA,this.textureType=t.UNSIGNED_BYTE,this.channelSize=e;else{if(4!==e)throw new Error(`Invalid number of channels: ${e}`);this.internalFormat=t.RGBA,this.format=t.RGBA,this.textureType=t.UNSIGNED_BYTE,this.channelSize=e}}encode(t,e){return new Uint8Array(t.buffer,t.byteOffset,t.byteLength)}allocate(t){return new Uint8Array(t*this.channelSize)}decode(t,e){if(t instanceof Uint8Array)return t.subarray(0,e);throw new Error(`Invalid array type: ${t.constructor}`)}}},7859:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.getBatchDim=e.sizeToSquarishShape=e.getRowsCols=e.sizeFromShape=e.isInt=e.parseAxisParam=e.squeezeShape=e.PreferLogicalStrategy=e.AlwaysKeepOriginalSizeStrategy=void 0;const r=n(6231),i=n(2517);function o(t,e){const n=[],r=[],i=null!=e&&Array.isArray(e)&&0===e.length,o=null==e||i?null:a(e,t).sort();let s=0;for(let e=0;e<t.length;++e){if(null!=o){if(o[s]===e&&1!==t[e])throw new Error(`Can't squeeze axis ${e} since its dim '${t[e]}' is not 1`);(null==o[s]||o[s]>e)&&1===t[e]&&(n.push(t[e]),r.push(e)),o[s]<=e&&s++}1!==t[e]&&(n.push(t[e]),r.push(e))}return{newShape:n,keptDims:r}}function a(t,e){const n=e.length;return t=null==t?e.map(((t,e)=>e)):[].concat(t),(0,i.assert)(t.every((t=>t>=-n&&t<n)),(()=>`All values in axis param must be in range [-${n}, ${n}) but got axis ${t}`)),(0,i.assert)(t.every(s),(()=>`All values in axis param must be integers but got axis ${t}`)),t.map((t=>t<0?n+t:t))}function s(t){return t%1==0}function u(t){if(0===t.length)return 1;let e=t[0];for(let n=1;n<t.length;n++)e*=t[n];return e}function c(t){const e=Math.ceil(Math.sqrt(t));return[e,Math.ceil(t/e)]}e.AlwaysKeepOriginalSizeStrategy=class{constructor(t){this.maxTextureSize=t}computeTextureWH(t,e){if(0===t.length)return[1,1];const n=this.maxTextureSize;if(e&&void 0!==e.breakAxis){const i=e.breakAxis>=t.length?1:t.slice(e.breakAxis).reduce(((t,e)=>t*e)),o=e.breakAxis<=0?1:t.slice(0,e.breakAxis).reduce(((t,e)=>t*e));if(!(i>n||o>n))return[i,o];r.Logger.verbose("TextureLayout",`Given width/height preferences were unattainable: shape:${t}, breakAxis:${e.breakAxis}`)}const i=t.reduce(((t,e)=>t*e));let o=Math.floor(Math.sqrt(i));for(;o<n&&o<i&&i%o!=0;o++);if(o>=n||i%o!=0)throw new Error(`The given dimensions are outside this GPU's boundaries: ${t}`);return[o,i/o]}},e.PreferLogicalStrategy=class{constructor(t){this.maxTextureSize=t}computeTextureWH(t,e){const n=this.computeTexture(t,e);return e&&e.isPacked&&(n[0]/=2,n[1]/=2),e&&e.reverseWH?[n[1],n[0]]:n}computeTexture(t,e){const n=e&&e.isPacked;if(0===t.length)return n?[2,2]:[1,1];let i=this.maxTextureSize;if(e&&void 0!==e.breakAxis){const n=e.breakAxis>=t.length?1:t.slice(e.breakAxis).reduce(((t,e)=>t*e)),o=e.breakAxis<=0?1:t.slice(0,e.breakAxis).reduce(((t,e)=>t*e));if(!(n>i||o>i))return[n,o];r.Logger.verbose("TextureLayout",`Given width/height preferences were unattainable: shape:${t}, breakAxis:${e.breakAxis}`)}let a=t.slice(0);if(n&&(i*=2,a=a.map(((t,e)=>e>=a.length-2?a[e]%2==0?a[e]:a[e]+1:a[e])),1===a.length&&(a=[2,a[0]])),2!==a.length){const t=o(a);a=t.newShape}const s=u(a);return a.length<=1&&s<=i?[1,s]:2===a.length&&a[0]<=i&&a[1]<=i?a:3===a.length&&a[0]*a[1]<=i&&a[2]<=i?[a[0]*a[1],a[2]]:3===a.length&&a[0]<=i&&a[1]*a[2]<=i?[a[0],a[1]*a[2]]:4===a.length&&a[0]*a[1]*a[2]<=i&&a[3]<=i?[a[0]*a[1]*a[2],a[3]]:4===a.length&&a[0]<=i&&a[1]*a[2]*a[3]<=i?[a[0],a[1]*a[2]*a[3]]:n?c(s/4).map((t=>2*t)):c(s)}},e.squeezeShape=o,e.parseAxisParam=a,e.isInt=s,e.sizeFromShape=u,e.getRowsCols=function(t){if(0===t.length)throw Error("Cannot get rows and columns of an empty shape array.");return[t.length>1?t[t.length-2]:1,t[t.length-1]]},e.sizeToSquarishShape=c,e.getBatchDim=function(t,e=2){return u(t.slice(0,t.length-e))}},4057:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.createTextureLayoutFromShape=e.calculateTextureWidthAndHeight=e.createTextureLayoutFromTextureType=void 0;const r=n(2517),i=n(2039);e.createTextureLayoutFromTextureType=(t,n,r)=>{const o=r===i.TextureType.unpacked||r===i.TextureType.unpackedReversed?1:4,a=r===i.TextureType.packed,s=r===i.TextureType.unpackedReversed||r===i.TextureType.packed,u=r===i.TextureType.packedLastDimension?n.length-1:void 0,c=r===i.TextureType.packedLastDimension?n.map(((t,e)=>e===n.length-1?4*t:t)):void 0;return(0,e.createTextureLayoutFromShape)(t,n,o,c,{isPacked:a,reverseWH:s,breakAxis:u})},e.calculateTextureWidthAndHeight=(t,n,r)=>{const i=(0,e.createTextureLayoutFromTextureType)(t,n,r);return[i.width,i.height]},e.createTextureLayoutFromShape=(t,e,n=1,i,o)=>{const a=!(!o||!o.isPacked),[s,u]=t.computeTextureWH(a&&i||e,o),c=e.length;let l=e.slice(0);if(0===c&&(l=[1]),1===n)i=e;else if(a){if(4!==n)throw new Error("a packed texture must be 4-channel");i=e,c>0&&(l[c-1]=Math.ceil(l[c-1]/2)),c>1&&(l[c-2]=Math.ceil(l[c-2]/2))}else if(!i)throw new Error("Unpacked shape is needed when using channels > 1");return{width:s,height:u,channels:n,isPacked:a,shape:l,strides:r.ShapeUtil.computeStrides(l),unpackedShape:i,reversedWH:o&&o.reverseWH}}},5702:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.TextureManager=void 0;const r=n(6231);e.TextureManager=class{constructor(t,e,n,r){this.glContext=t,this.layoutStrategy=e,this.profiler=n,this.config=r,this.pendingRead=new Map,r.reuseTextures&&(this.inUseTextures=new Map,this.idleTextures=new Map,this.textureLookup=new Map)}createTextureFromLayout(t,e,n,i){const o=this.toEncoderType(t),a=this.glContext.getEncoder(o,e.channels||1,i);if(e.isPacked&&1===i)throw new Error("not implemented");const s=e.width,u=e.height;let c,l;if(this.config.reuseTextures){c=`${s}x${u}_${a.format}_${a.internalFormat}_${a.textureType}`,l=this.inUseTextures.get(c),l||(l=[],this.inUseTextures.set(c,l));const e=this.idleTextures.get(c);if(e&&e.length>0){const r=e.pop();return l.push(r),1===i&&this.glContext.updateTexture(r,s,u,a,this.toTextureData(t,n)),r}}r.Logger.verbose("TextureManager",`Creating new texture of size ${e.width}x${e.height}`);const p=this.glContext.allocateTexture(s,u,a,this.toTextureData(t,n));return this.config.reuseTextures&&(l.push(p),this.textureLookup.set(p,c)),p}readTexture(t,e,n){return n||(n=1),this.profiler.event("backend","TextureManager.readTexture",(()=>{const r=t.shape.reduce(((t,e)=>t*e))*n,i=this.glContext.readTexture(t.texture,t.width,t.height,r,this.toEncoderType(e),n);return this.toTensorData(e,i)}))}async readTextureAsync(t,e,n){const r=t.tensor.dataId;if(n||(n=1),this.pendingRead.has(r)){const t=this.pendingRead.get(r);return new Promise((e=>null==t?void 0:t.push(e)))}return this.profiler.event("backend","TextureManager.readTextureAsync",(async()=>{this.pendingRead.set(r,[]);const i=t.shape.reduce(((t,e)=>t*e))*n;await this.glContext.createAndWaitForFence();const o=this.glContext.readTexture(t.texture,t.width,t.height,i,this.toEncoderType(e),n),a=this.toTensorData(e,o),s=this.pendingRead.get(r);return this.pendingRead.delete(r),null==s||s.forEach((t=>t(a))),a}))}readUint8TextureAsFloat(t){return this.profiler.event("backend","TextureManager.readUint8TextureAsFloat",(()=>{const e=t.shape.reduce(((t,e)=>t*e)),n=this.glContext.readTexture(t.texture,t.width,t.height,4*e,"byte",4);return new Float32Array(n.buffer,n.byteOffset,e)}))}releaseTexture(t,e){let n;if(this.config.reuseTextures&&(n=this.textureLookup.get(t.texture),n)){e&&this.textureLookup.delete(n);const r=this.inUseTextures.get(n);if(r){const e=r.indexOf(t.texture);if(-1!==e){r.splice(e,1);let i=this.idleTextures.get(n);i||(i=[],this.idleTextures.set(n,i)),i.push(t.texture)}}}n&&!e||(r.Logger.verbose("TextureManager",`Deleting texture of size ${t.width}x${t.height}`),this.glContext.deleteTexture(t.texture))}toTensorData(t,e){switch(t){case"int16":return e instanceof Int16Array?e:Int16Array.from(e);case"int32":return e instanceof Int32Array?e:Int32Array.from(e);case"int8":return e instanceof Int8Array?e:Int8Array.from(e);case"uint16":return e instanceof Uint16Array?e:Uint16Array.from(e);case"uint32":return e instanceof Uint32Array?e:Uint32Array.from(e);case"uint8":case"bool":return e instanceof Uint8Array?e:Uint8Array.from(e);case"float32":return e instanceof Float32Array?e:Float32Array.from(e);case"float64":return e instanceof Float64Array?e:Float64Array.from(e);default:throw new Error(`TensorData type ${t} is not supported`)}}toTextureData(t,e){if(e)return e instanceof Float32Array?e:new Float32Array(e)}toEncoderType(t){return"float"}clearActiveTextures(){this.glContext.clearActiveTextures()}}},2039:(t,e)=>{"use strict";var n;Object.defineProperty(e,"__esModule",{value:!0}),e.TextureType=void 0,(n=e.TextureType||(e.TextureType={}))[n.unpacked=0]="unpacked",n[n.unpackedReversed=1]="unpackedReversed",n[n.packed=2]="packed",n[n.downloadUint8AsFloat=3]="downloadUint8AsFloat",n[n.packedLastDimension=4]="packedLastDimension"},9390:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.getGlChannels=e.getCoordsDataType=e.getSqueezedParams=e.squeezeInputShape=e.generateShaderFuncNameFromInputSamplerNameAtOutCoords=e.generateShaderFuncNameFromInputSamplerName=e.repeatedTry=e.getPackedShape=void 0;const r=n(2517);e.getPackedShape=function(t){const e=t.length;return t.slice(0,e-1).concat(t[e-1]/4)},e.repeatedTry=async function(t,e=(t=>0),n){return new Promise(((r,i)=>{let o=0;const a=()=>{if(t())return void r();o++;const s=e(o);null!=n&&o>=n?i():setTimeout(a,s)};a()}))},e.generateShaderFuncNameFromInputSamplerName=function(t){return(0,r.assert)(void 0!==t&&0!==t.length,(()=>"empty string found for sampler name")),"get"+t.charAt(0).toUpperCase()+t.slice(1)},e.generateShaderFuncNameFromInputSamplerNameAtOutCoords=function(t){return(0,r.assert)(void 0!==t&&0!==t.length,(()=>"empty string found for sampler name")),"get"+t.charAt(0).toUpperCase()+t.slice(1)+"AtOutCoords"},e.squeezeInputShape=function(t,e){let n=JSON.parse(JSON.stringify(t));return n=e,n},e.getSqueezedParams=function(t,e){return e.map((e=>t[e])).join(", ")},e.getCoordsDataType=function(t){if(t<=1)return"int";if(2===t)return"ivec2";if(3===t)return"ivec3";if(4===t)return"ivec4";if(5===t)return"ivec5";if(6===t)return"ivec6";throw Error(`GPU for rank ${t} is not yet supported`)},e.getGlChannels=function(t=6){return["x","y","z","w","u","v"].slice(0,t)}},7305:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.createNewWebGLContext=e.createWebGLContext=void 0;const r=n(6231),i=n(1713),o={};function a(t){const e=function(){if("undefined"==typeof document){if("undefined"==typeof OffscreenCanvas)throw new TypeError("failed to create canvas: OffscreenCanvas is not supported");return new OffscreenCanvas(1,1)}const t=document.createElement("canvas");return t.width=1,t.height=1,t}();let n;const o={alpha:!1,depth:!1,antialias:!1,stencil:!1,preserveDrawingBuffer:!1,premultipliedAlpha:!1,failIfMajorPerformanceCaveat:!1};if((!t||"webgl2"===t)&&(n=e.getContext("webgl2",o),n))try{return new i.WebGLContext(n,2)}catch(t){r.Logger.warning("GlContextFactory",`failed to create WebGLContext using contextId 'webgl2'. Error: ${t}`)}if((!t||"webgl"===t)&&(n=e.getContext("webgl",o)||e.getContext("experimental-webgl",o),n))try{return new i.WebGLContext(n,1)}catch(t){r.Logger.warning("GlContextFactory",`failed to create WebGLContext using contextId 'webgl' or 'experimental-webgl'. Error: ${t}`)}throw new Error("WebGL is not supported")}e.createWebGLContext=function t(e){let n;e&&"webgl2"!==e||!("webgl2"in o)?e&&"webgl"!==e||!("webgl"in o)||(n=o.webgl):n=o.webgl2,n=n||a(e),e=e||1===n.version?"webgl":"webgl2";const r=n.gl;return o[e]=n,r.isContextLost()?(delete o[e],t(e)):(r.disable(r.DEPTH_TEST),r.disable(r.STENCIL_TEST),r.disable(r.BLEND),r.disable(r.DITHER),r.disable(r.POLYGON_OFFSET_FILL),r.disable(r.SAMPLE_COVERAGE),r.enable(r.SCISSOR_TEST),r.enable(r.CULL_FACE),r.cullFace(r.BACK),n)},e.createNewWebGLContext=a},1713:function(t,e,n){"use strict";var r=this&&this.__createBinding||(Object.create?function(t,e,n,r){void 0===r&&(r=n);var i=Object.getOwnPropertyDescriptor(e,n);i&&!("get"in i?!e.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(t,r,i)}:function(t,e,n,r){void 0===r&&(r=n),t[r]=e[n]}),i=this&&this.__setModuleDefault||(Object.create?function(t,e){Object.defineProperty(t,"default",{enumerable:!0,value:e})}:function(t,e){t.default=e}),o=this&&this.__importStar||function(t){if(t&&t.__esModule)return t;var e={};if(null!=t)for(var n in t)"default"!==n&&Object.prototype.hasOwnProperty.call(t,n)&&r(e,t,n);return i(e,t),e};Object.defineProperty(e,"__esModule",{value:!0}),e.WebGLContext=e.linearSearchLastTrue=void 0;const a=n(1670),s=o(n(7769)),u=n(9390);function c(t){let e=0;for(;e<t.length&&t[e]();++e);return e-1}e.linearSearchLastTrue=c,e.WebGLContext=class{constructor(t,e){this.frameBufferBound=!1,this.itemsToPoll=[],this.gl=t,this.version=e,this.getExtensions(),this.vertexbuffer=this.createVertexbuffer(),this.framebuffer=this.createFramebuffer(),this.queryVitalParameters()}allocateTexture(t,e,n,r){const i=this.gl,o=i.createTexture();i.bindTexture(i.TEXTURE_2D,o),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.NEAREST),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE);const a=r?n.encode(r,t*e):null;return i.texImage2D(i.TEXTURE_2D,0,n.internalFormat,t,e,0,n.format,n.textureType,a),this.checkError(),o}updateTexture(t,e,n,r,i){const o=this.gl;o.bindTexture(o.TEXTURE_2D,t);const a=r.encode(i,e*n);o.texSubImage2D(o.TEXTURE_2D,0,0,0,e,n,r.format,r.textureType,a),this.checkError()}attachFramebuffer(t,e,n){const r=this.gl;r.bindTexture(r.TEXTURE_2D,t),r.bindFramebuffer(r.FRAMEBUFFER,this.framebuffer),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,t,0),this.checkError(),r.viewport(0,0,e,n),r.scissor(0,0,e,n)}readTexture(t,e,n,r,i,o){const a=this.gl;o||(o=1),this.frameBufferBound||this.attachFramebuffer(t,e,n);const s=this.getEncoder(i,o),u=s.allocate(e*n);return a.bindTexture(a.TEXTURE_2D,t),a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,t,0),a.readPixels(0,0,e,n,a.RGBA,s.textureType,u),this.checkError(),s.decode(u,r)}isFramebufferReady(){return!0}getActiveTexture(){const t=this.gl;return"TEXTURE"+(t.getParameter(this.gl.ACTIVE_TEXTURE)-t.TEXTURE0)}getTextureBinding(){return this.gl.getParameter(this.gl.TEXTURE_BINDING_2D)}getFramebufferBinding(){return this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING)}setVertexAttributes(t,e){const n=this.gl;n.vertexAttribPointer(t,3,n.FLOAT,!1,20,0),n.enableVertexAttribArray(t),-1!==e&&(n.vertexAttribPointer(e,2,n.FLOAT,!1,20,12),n.enableVertexAttribArray(e)),this.checkError()}createProgram(t,e){const n=this.gl,r=n.createProgram();return n.attachShader(r,t),n.attachShader(r,e),n.linkProgram(r),r}compileShader(t,e){const n=this.gl,r=n.createShader(e);if(!r)throw new Error(`createShader() returned null with type ${e}`);if(n.shaderSource(r,t),n.compileShader(r),!1===n.getShaderParameter(r,n.COMPILE_STATUS))throw new Error(`Failed to compile shader: ${n.getShaderInfoLog(r)}\nShader source:\n${t}`);return r}deleteShader(t){this.gl.deleteShader(t)}bindTextureToUniform(t,e,n){const r=this.gl;r.activeTexture(r.TEXTURE0+e),this.checkError(),r.bindTexture(r.TEXTURE_2D,t),this.checkError(),r.uniform1i(n,e),this.checkError()}draw(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4),this.checkError()}checkError(){if(a.env.debug){const t=this.gl,e=t.getError();let n="";switch(e){case t.NO_ERROR:return;case t.INVALID_ENUM:n="INVALID_ENUM";break;case t.INVALID_VALUE:n="INVALID_VALUE";break;case t.INVALID_OPERATION:n="INVALID_OPERATION";break;case t.INVALID_FRAMEBUFFER_OPERATION:n="INVALID_FRAMEBUFFER_OPERATION";break;case t.OUT_OF_MEMORY:n="OUT_OF_MEMORY";break;case t.CONTEXT_LOST_WEBGL:n="CONTEXT_LOST_WEBGL";break;default:n=`Unknown WebGL Error: ${e.toString(16)}`}throw new Error(n)}}deleteTexture(t){this.gl.deleteTexture(t)}deleteProgram(t){this.gl.deleteProgram(t)}getEncoder(t,e,n=0){if(2===this.version)return new s.RedFloat32DataEncoder(this.gl,e);switch(t){case"float":return 1===n||this.isRenderFloat32Supported?new s.RGBAFloatDataEncoder(this.gl,e):new s.RGBAFloatDataEncoder(this.gl,e,this.textureHalfFloatExtension.HALF_FLOAT_OES);case"int":throw new Error("not implemented");case"byte":return new s.Uint8DataEncoder(this.gl,e);default:throw new Error(`Invalid dataType: ${t}`)}}clearActiveTextures(){const t=this.gl;for(let e=0;e<this.maxTextureImageUnits;++e)t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,null)}dispose(){if(this.disposed)return;const t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,null),t.deleteFramebuffer(this.framebuffer),t.bindBuffer(t.ARRAY_BUFFER,null),t.deleteBuffer(this.vertexbuffer),t.bindBuffer(t.ELEMENT_ARRAY_BUFFER,null),t.finish(),this.disposed=!0}createDefaultGeometry(){return new Float32Array([-1,1,0,0,1,-1,-1,0,0,0,1,1,0,1,1,1,-1,0,1,0])}createVertexbuffer(){const t=this.gl,e=t.createBuffer();if(!e)throw new Error("createBuffer() returned null");const n=this.createDefaultGeometry();return t.bindBuffer(t.ARRAY_BUFFER,e),t.bufferData(t.ARRAY_BUFFER,n,t.STATIC_DRAW),this.checkError(),e}createFramebuffer(){const t=this.gl.createFramebuffer();if(!t)throw new Error("createFramebuffer returned null");return t}queryVitalParameters(){const t=this.gl;if(this.isFloatTextureAttachableToFrameBuffer=this.checkFloatTextureAttachableToFrameBuffer(),this.isRenderFloat32Supported=this.checkRenderFloat32(),this.isFloat32DownloadSupported=this.checkFloat32Download(),1===this.version&&!this.textureHalfFloatExtension&&!this.isRenderFloat32Supported)throw new Error("both float32 and float16 TextureType are not supported");this.isBlendSupported=!this.isRenderFloat32Supported||this.checkFloat32Blend(),this.maxTextureSize=t.getParameter(t.MAX_TEXTURE_SIZE),this.maxTextureImageUnits=t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS),this.version}getExtensions(){2===this.version?(this.colorBufferFloatExtension=this.gl.getExtension("EXT_color_buffer_float"),this.disjointTimerQueryWebgl2Extension=this.gl.getExtension("EXT_disjoint_timer_query_webgl2")):(this.textureFloatExtension=this.gl.getExtension("OES_texture_float"),this.textureHalfFloatExtension=this.gl.getExtension("OES_texture_half_float"))}checkFloatTextureAttachableToFrameBuffer(){const t=this.gl,e=t.createTexture();t.bindTexture(t.TEXTURE_2D,e);const n=2===this.version?t.RGBA32F:t.RGBA;t.texImage2D(t.TEXTURE_2D,0,n,1,1,0,t.RGBA,t.FLOAT,null);const r=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,r),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,e,0);const i=t.checkFramebufferStatus(t.FRAMEBUFFER)===t.FRAMEBUFFER_COMPLETE;return t.bindTexture(t.TEXTURE_2D,null),t.bindFramebuffer(t.FRAMEBUFFER,null),t.deleteTexture(e),t.deleteFramebuffer(r),i}checkRenderFloat32(){if(2===this.version){if(!this.colorBufferFloatExtension)return!1}else if(!this.textureFloatExtension)return!1;return this.isFloatTextureAttachableToFrameBuffer}checkFloat32Download(){if(2===this.version){if(!this.colorBufferFloatExtension)return!1}else{if(!this.textureFloatExtension)return!1;if(!this.gl.getExtension("WEBGL_color_buffer_float"))return!1}return this.isFloatTextureAttachableToFrameBuffer}checkFloat32Blend(){const t=this.gl;let e,n,r,i,o;try{e=t.createTexture(),n=t.createFramebuffer(),t.bindTexture(t.TEXTURE_2D,e);const a=2===this.version?t.RGBA32F:t.RGBA;return t.texImage2D(t.TEXTURE_2D,0,a,1,1,0,t.RGBA,t.FLOAT,null),t.bindFramebuffer(t.FRAMEBUFFER,n),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,e,0),t.enable(t.BLEND),r=t.createShader(t.VERTEX_SHADER),!!r&&(t.shaderSource(r,"void main(){}"),t.compileShader(r),i=t.createShader(t.FRAGMENT_SHADER),!!i&&(t.shaderSource(i,"precision highp float;void main(){gl_FragColor=vec4(0.5);}"),t.compileShader(i),o=t.createProgram(),!!o&&(t.attachShader(o,r),t.attachShader(o,i),t.linkProgram(o),t.useProgram(o),t.drawArrays(t.POINTS,0,1),t.getError()===t.NO_ERROR)))}finally{t.disable(t.BLEND),o&&t.deleteProgram(o),r&&t.deleteShader(r),i&&t.deleteShader(i),n&&(t.bindFramebuffer(t.FRAMEBUFFER,null),t.deleteFramebuffer(n)),e&&(t.bindTexture(t.TEXTURE_2D,null),t.deleteTexture(e))}}beginTimer(){if(2===this.version&&this.disjointTimerQueryWebgl2Extension){const t=this.gl,e=this.disjointTimerQueryWebgl2Extension,n=t.createQuery();return t.beginQuery(e.TIME_ELAPSED_EXT,n),n}throw new Error("WebGL1 profiling currently not supported.")}endTimer(){if(2!==this.version||!this.disjointTimerQueryWebgl2Extension)throw new Error("WebGL1 profiling currently not supported");{const t=this.gl,e=this.disjointTimerQueryWebgl2Extension;t.endQuery(e.TIME_ELAPSED_EXT)}}isTimerResultAvailable(t){let e=!1,n=!1;if(2!==this.version||!this.disjointTimerQueryWebgl2Extension)throw new Error("WebGL1 profiling currently not supported");{const r=this.gl,i=this.disjointTimerQueryWebgl2Extension;e=r.getQueryParameter(t,r.QUERY_RESULT_AVAILABLE),n=r.getParameter(i.GPU_DISJOINT_EXT)}return e&&!n}getTimerResult(t){let e=0;if(2!==this.version)throw new Error("WebGL1 profiling currently not supported");{const n=this.gl;e=n.getQueryParameter(t,n.QUERY_RESULT),n.deleteQuery(t)}return e/1e6}async waitForQueryAndGetTime(t){return await(0,u.repeatedTry)((()=>this.isTimerResultAvailable(t))),this.getTimerResult(t)}async createAndWaitForFence(){const t=this.createFence(this.gl);return this.pollFence(t)}createFence(t){let e;const n=t,r=n.fenceSync(n.SYNC_GPU_COMMANDS_COMPLETE,0);return t.flush(),e=null===r?()=>!0:()=>{const t=n.clientWaitSync(r,0,0);return t===n.ALREADY_SIGNALED||t===n.CONDITION_SATISFIED},{query:r,isFencePassed:e}}async pollFence(t){return new Promise((e=>{this.addItemToPoll((()=>t.isFencePassed()),(()=>e()))}))}pollItems(){const t=c(this.itemsToPoll.map((t=>t.isDoneFn)));for(let e=0;e<=t;++e){const{resolveFn:t}=this.itemsToPoll[e];t()}this.itemsToPoll=this.itemsToPoll.slice(t+1)}async addItemToPoll(t,e){this.itemsToPoll.push({isDoneFn:t,resolveFn:e}),this.itemsToPoll.length>1||await(0,u.repeatedTry)((()=>(this.pollItems(),0===this.itemsToPoll.length)))}}},1036:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.ExecutionPlan=void 0;const r=n(6231);class i{constructor(t,e){this.op=t,this.node=e}}e.ExecutionPlan=class{constructor(t,e,n){this.graph=t,this.profiler=n,this.initialize(e)}initialize(t){this.profiler.event("session","ExecutionPlan.initialize",(()=>{const e=this.graph.getNodes();if(e.length!==t.length)throw new Error("The size of nodes and OPs do not match.");this._ops=t.map(((t,n)=>new i(t,e[n]))),this.reset(),this._starter=[],this._ops.forEach(((t,e)=>{let n=!0;for(const e of t.node.inputs)if(!this._values[e]&&-1===this.graph.getInputIndices().indexOf(e)){n=!1;break}n&&this._starter.push(e)}))}))}reset(){this._values=this.graph.getValues().map((t=>t.tensor))}async execute(t,e){return this.profiler.event("session","ExecutionPlan.execute",(async()=>{this.reset();const n=t.createInferenceHandler(),i=this.graph.getInputIndices();if(e.length!==i.length)throw new Error(`number of input tensors don't match the number of inputs to the model: actual: ${e.length} expected: ${i.length}`);e.forEach(((t,e)=>{const n=i[e];this._values[n]=t}));const o=this._starter.slice(0),a=this.graph.getValues(),s=this.graph.getNodes();let u=0;for(;u<o.length;){const t=o[u++],e=this._ops[t],i=e.node.inputs.map((t=>this._values[t]));if(-1!==i.indexOf(void 0))throw new Error(`unresolved input detected: op: ${e.node}`);const c=i;r.Logger.verbose("ExecPlan",`Runing op:${e.node.name} (${c.map(((t,n)=>`'${e.node.inputs[n]}': ${t.type}[${t.dims.join(",")}]`)).join(", ")})`);const l=await this.profiler.event("node",e.node.name,(async()=>e.op.impl(n,c,e.op.context)));if(l.length!==e.node.outputs.length)throw new Error("the size of output does not match model definition.");l.forEach(((t,n)=>{const r=e.node.outputs[n];if(this._values[r])throw new Error(`output [${r}] already has value: op:${e.node.name}`);this._values[r]=t}));const p=new Set;l.forEach(((t,n)=>{const r=e.node.outputs[n];for(const t of a[r].to){const e=s[t];let n=!0;for(const t of e.inputs)if(!this._values[t]){n=!1;break}n&&p.add(t)}})),o.push(...p)}const c=[];for(let t=0;t<this.graph.getOutputIndices().length;t++){const e=this.graph.getOutputIndices()[t],n=this._values[e];if(void 0===n)throw new Error(`required output [${e}] does not have value`);0===e?await n.getData():n.data,c.push(n)}return r.Logger.verbose("ExecPlan","disposing of inferenceHandler"),n.dispose(),c}))}}},7070:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.Graph=void 0;const r=n(1446),i=n(7778),o=n(9395),a=n(9162),s=n(2517);var u=o.onnxruntime.experimental.fbs;e.Graph={from:(t,e)=>new p(t,e)};class c{constructor(t){this._from=void 0,this._to=[],this.tensor=void 0,this.type=void 0,t&&(this.type=s.ProtoUtil.tensorValueTypeFromProto(t.type.tensorType))}get from(){return this._from}get to(){return this._to}}class l{constructor(t,e){t instanceof r.onnx.NodeProto?(this.name=t.name,this.opType=t.opType,this.attributes=new i.Attribute(t.attribute)):t instanceof u.Node&&(this.name=null!=e?e:t.name(),this.opType=t.opType(),this.attributes=new i.Attribute(s.ProtoUtil.tensorAttributesFromORTFormat(t))),this.inputs=[],this.outputs=[],this.executeNode=!0}}class p{constructor(t,e){if(!t)throw new TypeError("graph is empty");this.buildGraph(t),this.transformGraph(e),this.checkIsAcyclic()}getInputIndices(){return this._allInputIndices}getInputNames(){return this._allInputNames}getOutputIndices(){return this._allOutputIndices}getOutputNames(){return this._allOutputNames}getValues(){return this._allData}getNodes(){return this._nodes}buildGraph(t){if(t instanceof r.onnx.GraphProto)this.buildGraphFromOnnxFormat(t);else{if(!(t instanceof u.Graph))throw new TypeError("Graph type is not supported.");this.buildGraphFromOrtFormat(t)}}buildGraphFromOnnxFormat(t){const e=new Map;this._allData=[],this._allInputIndices=[],this._allInputNames=[],this._allOutputIndices=[],this._allOutputNames=[],this._nodes=[];const n=new Map;if(!t.input)throw new Error("missing information in graph: input");const r=[];for(const n of t.input){if(e.has(n.name))throw new Error(`duplicated input name: ${n.name}`);const t=this._allData.push(new c(n))-1;e.set(n.name,t),r.push(n.name)}if(!t.initializer)throw new Error("missing information in graph: initializer");for(const n of t.initializer){let t=e.get(n.name);if(void 0===t){const r=new c;r.type={shape:{dims:s.ProtoUtil.tensorDimsFromProto(n.dims)},tensorType:s.ProtoUtil.tensorDataTypeFromProto(n.dataType)},t=this._allData.push(r)-1,e.set(n.name,t)}this._allData[t]._from=-1,this._allData[t].tensor=a.Tensor.fromProto(n)}for(let t=0;t<this._allData.length;t++)this._allData[t].tensor||(this._allInputIndices.push(t),this._allInputNames.push(r[t]));if(!t.output)throw new Error("missing information in graph: output");for(const n of t.output){if(e.has(n.name))throw new Error(`duplicated output name: ${n.name}`);const t=this._allData.push(new c(n))-1;e.set(n.name,t),this._allOutputIndices.push(t),this._allOutputNames.push(n.name)}if(!t.node)throw new Error("missing information in graph: node");for(const e of t.node){if(!e.name)for(let t=0;;t++){const r=`unnamed_${e.opType}_${t}`;if(!n.has(r)){e.name=r;break}}if(n.has(e.name))throw new Error(`duplicated node name: ${e.name}`);const t=this._nodes.push(new l(e))-1;n.set(e.name,t)}for(let n=0;n<this._nodes.length;n++){const r=this._nodes[n],i=t.node[n];if(!i.output)throw new Error(`missing output for node: ${i.name}`);for(const t of i.output){let o=e.get(t);if(void 0===o&&(o=this._allData.push(new c)-1,e.set(t,o)),r.outputs.push(o),void 0!==this._allData[o]._from)throw new Error(`multiple nodes output to one data value: ${o}`);if(this._allData[o]._from=n,"Constant"===i.opType){if(!i.attribute||1!==i.attribute.length||!i.attribute[0].t)throw new Error("missing attributes or missing tensor value in attributes for this Constant operator");if(!i.output||1!==i.output.length)throw new Error("missing output or incorrect number of outputs for this Constant operator");r.outputs.pop(),r.executeNode=!1,this._allData[o]._from=-1,this._allData[o].tensor=a.Tensor.fromProto(i.attribute[0].t)}}}for(let n=0;n<this._nodes.length;n++){const r=this._nodes[n],i=t.node[n];if(!i.input)throw new Error(`missing input for node: ${i.name}`);for(const t of i.input){const o=e.get(t);if(void 0===o){if(""===t&&3===i.input.length&&"Resize"===i.opType)continue;throw new Error(`unrecognized input '${t}' for node: ${i.name}`)}r.inputs.push(o),this._allData[o]._to.push(n)}}return!0}buildGraphFromOrtFormat(t){var e,n,r;const i=new Map;this._allData=[],this._allInputIndices=[],this._allInputNames=[],this._allOutputIndices=[],this._allOutputNames=[],this._nodes=[];const o=new Map,p=[];for(let o=0;o<t.inputsLength();o++){const a=t.inputs(o);if(i.has(a))throw new Error(`duplicated input name: ${a}`);for(let o=0;o<t.nodeArgsLength();o++)if((null===(e=t.nodeArgs(o))||void 0===e?void 0:e.name())===a){const e=new c;if((null===(r=null===(n=t.nodeArgs(o))||void 0===n?void 0:n.type())||void 0===r?void 0:r.valueType())!==u.TypeInfoValue.tensor_type)throw new Error("Unexpected value type for the nodeArg.");const l=t.nodeArgs(o).type().value(new u.TensorTypeAndShape),f=s.ProtoUtil.tensorDataTypeFromProto(l.elemType()),d=l.shape(),h=[];for(let t=0;t<d.dimLength();t++)h.push(s.LongUtil.longToNumber(d.dim(t).value().dimValue()));e.type={shape:{dims:h},tensorType:f};const g=this._allData.push(e)-1;i.set(a,g),p.push(a)}}for(let e=0;e<t.initializersLength();e++){const n=t.initializers(e);let r=i.get(n.name());if(void 0===r){const t=new c,e=s.ProtoUtil.tensorDimsFromORTFormat(n),o=s.ProtoUtil.tensorDataTypeFromProto(n.dataType());t.type={shape:{dims:e},tensorType:o},r=this._allData.push(t)-1,i.set(n.name(),r)}this._allData[r]._from=-1,this._allData[r].tensor=a.Tensor.fromOrtTensor(n)}for(let t=0;t<this._allData.length;t++)this._allData[t].tensor||(this._allInputIndices.push(t),this._allInputNames.push(p[t]));for(let e=0;e<t.outputsLength();e++){const n=t.outputs(e);if(i.has(n))throw new Error(`duplicated output name: ${n}`);const r=this._allData.push(new c)-1;i.set(n,r),this._allOutputIndices.push(r),this._allOutputNames.push(n)}if(!t.nodes)throw new Error("missing information in graph: node");for(let e=0;e<t.nodesLength();e++){const n=t.nodes(e);let r=n.name();if(!r)for(let t=0;r=`unnamed_${n.opType()}_${t}`,o.has(r);t++);if(o.has(r))throw new Error(`duplicated node name: ${r}`);const i=this._nodes.push(new l(n,r))-1;o.set(r,i)}for(let e=0;e<this._nodes.length;e++){const n=this._nodes[e],r=t.nodes(e);if(null==r)throw new Error(`No node exists at index ${e}`);if(0===(null==r?void 0:r.outputsLength()))throw new Error(`missing output for node: ${r.name}`);for(let t=0;t<(null==r?void 0:r.outputsLength());t++){const o=null==r?void 0:r.outputs(t);let s=i.get(o);if(void 0===s&&(s=this._allData.push(new c)-1,i.set(o,s)),n.outputs.push(s),void 0!==this._allData[s]._from)throw new Error(`multiple nodes output to one data value: ${s}`);if(this._allData[s]._from=e,"Constant"===r.opType()){if(1!==r.attributesLength()||!r.attributes(0).t())throw new Error("missing attributes or missing tensor value in attributes for this Constant operator");if(1!==r.outputsLength())throw new Error("missing output or incorrect number of outputs for this Constant operator");n.outputs.pop(),n.executeNode=!1,this._allData[s]._from=-1,this._allData[s].tensor=a.Tensor.fromOrtTensor(r.attributes(0).t())}}}for(let e=0;e<this._nodes.length;e++){const n=this._nodes[e],r=t.nodes(e);if(0===r.inputsLength())throw new Error(`missing input for node: ${r.name}`);for(let t=0;t<r.inputsLength();t++){const o=r.inputs(t),a=i.get(o);if(void 0===a)throw new Error(`unrecognized input '${o}' for node: ${r.name()}`);n.inputs.push(a),this._allData[a]._to.push(e)}}}checkIsAcyclic(){const t=new Set;this._allInputIndices.forEach((e=>{this._allData[e]._to.forEach((e=>{t.add(e)}))}));const e=Array.from(t),n=new Array(this._nodes.length).fill("white");for(;e.length>0;){const t=e.pop();"gray"===n[t]?n[t]="black":(e.push(t),n[t]="gray",this._nodes[t].outputs.forEach((r=>{const i=this._allData[r];if(void 0!==i.tensor)throw new Error("node outputs should not be initialized");if(i._from!==t)throw new Error("from property of the Value object doesn't match index of Node being processed");i._to.forEach((t=>{if("gray"===n[t])throw new Error("model graph is cyclic");"white"===n[t]&&e.push(t)}))})))}}transformGraph(t){this.removeAllIdentityNodes(),this.removeAllDropoutNodes(),this.fuseConvActivationNodes(),t&&t.transformGraph(this),this.finalizeGraph()}finalizeGraph(){let t=0;for(let e=0;e<this._nodes.length;e++)this._nodes[e].executeNode?t>0&&(this._nodes[e].inputs.forEach((n=>{const r=this._allData[n]._to.indexOf(e+t);-1!==r&&(this._allData[n]._to[r]=e)})),this._nodes[e].outputs.forEach((n=>{this._allData[n]._from&&this._allData[n]._from===e+t&&(this._allData[n]._from=e)}))):(t++,this._nodes[e].outputs.forEach((t=>{this._allData[t]._from=-2})),this._nodes.splice(e,1),e--);t=0;for(let e=0;e<this._allData.length;e++)if(-2!==this._allData[e].from||-1!==this._allOutputIndices.indexOf(e+t)){if(t>0){let n=-1;void 0!==this._allData[e].from&&-1!==this._allData[e].from?(n=this._nodes[this._allData[e].from].outputs.indexOf(e+t),-1!==n&&(this._nodes[this._allData[e].from].outputs[n]=e)):(n=this._allInputIndices.indexOf(e+t),-1!==n&&(this._allInputIndices[n]=e)),this._allData[e].to.forEach((r=>{n=this._nodes[r].inputs.indexOf(e+t),-1!==n&&(this._nodes[r].inputs[n]=e)})),0===this._allData[e].to.length&&(n=this._allOutputIndices.indexOf(e+t),-1!==n&&(this._allOutputIndices[n]=e))}}else t++,this._allData.splice(e,1),e--}deleteNode(t){const e=this._nodes[t];if(e.outputs.length>1)for(let t=1;t<e.outputs.length;t++)if(this._allData[e.outputs[t]].to.length>0)throw new Error("Node deletion with more than one output connected to other nodes is not supported. ");e.executeNode=!1;const n=e.inputs[0],r=e.outputs[0],i=this._allData[r].to,o=this._allData[n].to.indexOf(t);if(-1===o)throw new Error("The Value object doesn't have the current Node in it's 'to' property ");this._allData[n].to.splice(o,1),this._allData[r]._to=[];const a=this._allOutputIndices.indexOf(r);if(-1!==a&&(this._allOutputIndices[a]=n),i&&i.length>0)for(const t of i){const e=this._nodes[t].inputs.indexOf(r);if(-1===e)throw new Error("The Node object doesn't have the output Value in it's 'inputs' property ");this._nodes[t].inputs[e]=n,this._allData[n].to.push(t)}}removeAllDropoutNodes(){let t=0;for(const e of this._nodes){if("Dropout"===e.opType){if(1!==e.inputs.length)throw new Error("Dropout nodes should only contain one input. ");if(1!==e.outputs.length&&2!==e.outputs.length)throw new Error("Dropout nodes should contain either 1 or 2 output(s)");if(2===e.outputs.length&&0!==this._allData[e.outputs[1]]._to.length)throw new Error("Dropout nodes's second output should not be referenced by other nodes");this.deleteNode(t)}t++}}removeAllIdentityNodes(){let t=0;for(const e of this._nodes)"Identity"===e.opType&&this.deleteNode(t),t++}isActivation(t){switch(t.opType){case"Relu":case"Sigmoid":case"Clip":return!0;default:return!1}}fuseConvActivationNodes(){for(const t of this._nodes)if("Conv"===t.opType){const e=this._allData[t.outputs[0]]._to;if(1===e.length&&this.isActivation(this._nodes[e[0]])){const n=this._nodes[e[0]];if("Clip"===n.opType)if(1===n.inputs.length)try{t.attributes.set("activation_params","floats",[n.attributes.getFloat("min"),n.attributes.getFloat("max")])}catch(e){t.attributes.set("activation_params","floats",[s.MIN_CLIP,s.MAX_CLIP])}else{if(!(n.inputs.length>=3&&void 0!==this._allData[n.inputs[1]].tensor&&void 0!==this._allData[n.inputs[2]].tensor))continue;t.attributes.set("activation_params","floats",[this._allData[n.inputs[1]].tensor.floatData[0],this._allData[n.inputs[2]].tensor.floatData[0]])}t.attributes.set("activation","string",n.opType),this.deleteNode(e[0])}}}}},6231:(t,e)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.now=e.Profiler=e.Logger=void 0;const n={verbose:1e3,info:2e3,warning:4e3,error:5e3,fatal:6e3},r={none:new class{log(t,e,n){}},console:new class{log(t,e,n){console.log(`${this.color(t)} ${n?"[35m"+n+"[0m ":""}${e}`)}color(t){switch(t){case"verbose":return"[34;40mv[0m";case"info":return"[32mi[0m";case"warning":return"[30;43mw[0m";case"error":return"[31;40me[0m";case"fatal":return"[101mf[0m";default:throw new Error(`unsupported severity: ${t}`)}}}},i={provider:"console",minimalSeverity:"warning",logDateTime:!0,logSourceLocation:!1};let o={"":i};function a(t,e,n,r){if(void 0===e)return i=t,{verbose:a.verbose.bind(null,i),info:a.info.bind(null,i),warning:a.warning.bind(null,i),error:a.error.bind(null,i),fatal:a.fatal.bind(null,i)};if(void 0===n)s(t,e);else if("number"==typeof n&&void 0===r)s(t,e);else if("string"==typeof n&&void 0===r)s(t,n,0,e);else{if("string"!=typeof n||"number"!=typeof r)throw new TypeError("input is valid");s(t,n,0,e)}var i}function s(t,e,i,a){const s=o[a||""]||o[""];n[t]<n[s.minimalSeverity]||(s.logDateTime&&(e=`${(new Date).toISOString()}|${e}`),s.logSourceLocation,r[s.provider].log(t,e,a))}!function(t){function e(t){o={},n("",t||{})}function n(t,n){if("*"===t)e(n);else{const e=o[t]||i;o[t]={provider:n.provider||e.provider,minimalSeverity:n.minimalSeverity||e.minimalSeverity,logDateTime:void 0===n.logDateTime?e.logDateTime:n.logDateTime,logSourceLocation:void 0===n.logSourceLocation?e.logSourceLocation:n.logSourceLocation}}}t.verbose=function(e,n){t("verbose",e,n)},t.info=function(e,n){t("info",e,n)},t.warning=function(e,n){t("warning",e,n)},t.error=function(e,n){t("error",e,n)},t.fatal=function(e,n){t("fatal",e,n)},t.reset=e,t.set=n,t.setWithEnv=function(t){const e={};t.logLevel&&(e.minimalSeverity=t.logLevel),n("",e)}}(a||(a={})),e.Logger=a;class u{constructor(t,e,n,r,i,o){this.category=t,this.name=e,this.startTime=n,this.endCallback=r,this.timer=i,this.ctx=o}end(){return this.endCallback(this)}async checkTimer(){if(void 0===this.ctx||void 0===this.timer)throw new Error("No webgl timer found");return this.ctx.endTimer(),this.ctx.waitForQueryAndGetTime(this.timer)}}class c{constructor(t,e,n,r){this.category=t,this.name=e,this.startTime=n,this.endTime=r}}e.Profiler=class{static create(t){return void 0===t?new this:new this(t.maxNumberEvents,t.flushBatchSize,t.flushIntervalInMilliseconds)}constructor(t,e,n){this._started=!1,this._flushPointer=0,this._started=!1,this._maxNumberEvents=void 0===t?1e4:t,this._flushBatchSize=void 0===e?10:e,this._flushIntervalInMilliseconds=void 0===n?5e3:n}start(){this._started=!0,this._timingEvents=[],this._flushTime=(0,e.now)(),this._flushPointer=0}stop(){for(this._started=!1;this._flushPointer<this._timingEvents.length;this._flushPointer++)this.logOneEvent(this._timingEvents[this._flushPointer])}event(t,e,n,r){const i=this._started?this.begin(t,e,r):void 0;let o=!1;const a=n();if(a&&"function"==typeof a.then)return o=!0,new Promise(((t,e)=>{a.then((async e=>{i&&await i.end(),t(e)}),(async t=>{i&&await i.end(),e(t)}))}));if(!o&&i){const t=i.end();if(t&&"function"==typeof t.then)return new Promise(((e,n)=>{t.then((()=>{e(a)}),(t=>{n(t)}))}))}return a}begin(t,n,r){if(!this._started)throw new Error("profiler is not started yet");if(void 0===r){const r=(0,e.now)();return this.flush(r),new u(t,n,r,(t=>this.endSync(t)))}{const e=r.beginTimer();return new u(t,n,0,(async t=>this.end(t)),e,r)}}async end(t){const e=await t.checkTimer();this._timingEvents.length<this._maxNumberEvents&&(this._timingEvents.push(new c(t.category,t.name,t.startTime,e)),this.flush(e))}endSync(t){const n=(0,e.now)();this._timingEvents.length<this._maxNumberEvents&&(this._timingEvents.push(new c(t.category,t.name,t.startTime,n)),this.flush(n))}logOneEvent(t){e.Logger.verbose(`Profiler.${t.category}`,`${(t.endTime-t.startTime).toFixed(2)}ms on event '${t.name}' at ${t.endTime.toFixed(2)}`)}flush(t){if(this._timingEvents.length-this._flushPointer>=this._flushBatchSize||t-this._flushTime>=this._flushIntervalInMilliseconds){for(const t=this._flushPointer;this._flushPointer<t+this._flushBatchSize&&this._flushPointer<this._timingEvents.length;this._flushPointer++)this.logOneEvent(this._timingEvents[this._flushPointer]);this._flushTime=(0,e.now)()}}get started(){return this._started}},e.now="undefined"!=typeof performance&&performance.now?()=>performance.now():Date.now},2644:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.Model=void 0;const r=n(5686),i=n(1446),o=n(7070),a=n(9395),s=n(2517);var u=a.onnxruntime.experimental.fbs;e.Model=class{constructor(){}load(t,e,n){if(!n)try{return void this.loadFromOnnxFormat(t,e)}catch(t){if(void 0!==n)throw t}this.loadFromOrtFormat(t,e)}loadFromOnnxFormat(t,e){const n=i.onnx.ModelProto.decode(t);if(s.LongUtil.longToNumber(n.irVersion)<3)throw new Error("only support ONNX model with IR_VERSION>=3");this._opsets=n.opsetImport.map((t=>({domain:t.domain,version:s.LongUtil.longToNumber(t.version)}))),this._graph=o.Graph.from(n.graph,e)}loadFromOrtFormat(t,e){const n=new r.flatbuffers.ByteBuffer(t),i=u.InferenceSession.getRootAsInferenceSession(n).model();if(s.LongUtil.longToNumber(i.irVersion())<3)throw new Error("only support ONNX model with IR_VERSION>=3");this._opsets=[];for(let t=0;t<i.opsetImportLength();t++){const e=i.opsetImport(t);this._opsets.push({domain:null==e?void 0:e.domain(),version:s.LongUtil.longToNumber(e.version())})}this._graph=o.Graph.from(i.graph(),e)}get graph(){return this._graph}get opsets(){return this._opsets}}},782:(t,e)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.FLOAT_TYPES=e.INT_TYPES=e.NUMBER_TYPES=void 0,e.NUMBER_TYPES=["float32","float64","int32","int16","int8","uint16","uint32","uint8"],e.INT_TYPES=["int32","int16","int8","uint16","uint32","uint8"],e.FLOAT_TYPES=["float32","float64"]},1047:(t,e)=>{"use strict";function n(t,e){if(e.endsWith("+")){const n=Number.parseInt(e.substring(0,e.length-1),10);return!isNaN(n)&&n<=t}if(2===e.split("-").length){const n=e.split("-"),r=Number.parseInt(n[0],10),i=Number.parseInt(n[1],10);return!isNaN(r)&&!isNaN(i)&&r<=t&&t<=i}return Number.parseInt(e,10)===t}Object.defineProperty(e,"__esModule",{value:!0}),e.resolveOperator=void 0,e.resolveOperator=function(t,e,r){for(const i of r){const r=i[0],o=i[1],a=i[2],s=i[3],u=i[4];if(t.opType===r)for(const t of e)if((t.domain===o||"ai.onnx"===t.domain&&""===o)&&n(t.version,a))return{opImpl:s,opInit:u}}throw new TypeError(`cannot resolve operator '${t.opType}' with opsets: ${e.map((t=>`${t.domain||"ai.onnx"} v${t.version}`)).join(", ")}`)}},9395:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.onnxruntime=void 0;const r=n(5686);var i,o;i=e.onnxruntime||(e.onnxruntime={}),function(t){let e;!function(t){t[t.UNDEFINED=0]="UNDEFINED",t[t.FLOAT=1]="FLOAT",t[t.INT=2]="INT",t[t.STRING=3]="STRING",t[t.TENSOR=4]="TENSOR",t[t.GRAPH=5]="GRAPH",t[t.FLOATS=6]="FLOATS",t[t.INTS=7]="INTS",t[t.STRINGS=8]="STRINGS",t[t.TENSORS=9]="TENSORS",t[t.GRAPHS=10]="GRAPHS",t[t.SPARSE_TENSOR=11]="SPARSE_TENSOR",t[t.SPARSE_TENSORS=12]="SPARSE_TENSORS"}(e=t.AttributeType||(t.AttributeType={}))}((o=i.experimental||(i.experimental={})).fbs||(o.fbs={})),function(t){!function(t){!function(t){let e;!function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.VALUE=1]="VALUE",t[t.PARAM=2]="PARAM"}(e=t.DimensionValueType||(t.DimensionValueType={}))}(t.fbs||(t.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(t){!function(t){let e;!function(t){t[t.UNDEFINED=0]="UNDEFINED",t[t.FLOAT=1]="FLOAT",t[t.UINT8=2]="UINT8",t[t.INT8=3]="INT8",t[t.UINT16=4]="UINT16",t[t.INT16=5]="INT16",t[t.INT32=6]="INT32",t[t.INT64=7]="INT64",t[t.STRING=8]="STRING",t[t.BOOL=9]="BOOL",t[t.FLOAT16=10]="FLOAT16",t[t.DOUBLE=11]="DOUBLE",t[t.UINT32=12]="UINT32",t[t.UINT64=13]="UINT64",t[t.COMPLEX64=14]="COMPLEX64",t[t.COMPLEX128=15]="COMPLEX128",t[t.BFLOAT16=16]="BFLOAT16"}(e=t.TensorDataType||(t.TensorDataType={}))}(t.fbs||(t.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(t){!function(t){let e;!function(t){t[t.Primitive=0]="Primitive",t[t.Fused=1]="Fused"}(e=t.NodeType||(t.NodeType={}))}(t.fbs||(t.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(t){!function(t){let e;!function(t){t[t.NONE=0]="NONE",t[t.tensor_type=1]="tensor_type",t[t.sequence_type=2]="sequence_type",t[t.map_type=3]="map_type"}(e=t.TypeInfoValue||(t.TypeInfoValue={}))}(t.fbs||(t.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsShape(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsShape(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}dim(e,n){let r=this.bb.__offset(this.bb_pos,4);return r?(n||new t.experimental.fbs.Dimension).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+r)+4*e),this.bb):null}dimLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}static startShape(t){t.startObject(1)}static addDim(t,e){t.addFieldOffset(0,e,0)}static createDimVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startDimVector(t,e){t.startVector(4,e,4)}static endShape(t){return t.endObject()}static createShape(t,e){return n.startShape(t),n.addDim(t,e),n.endShape(t)}}e.Shape=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsDimension(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsDimension(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}value(e){let n=this.bb.__offset(this.bb_pos,4);return n?(e||new t.experimental.fbs.DimensionValue).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}denotation(t){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__string(this.bb_pos+e,t):null}static startDimension(t){t.startObject(2)}static addValue(t,e){t.addFieldOffset(0,e,0)}static addDenotation(t,e){t.addFieldOffset(1,e,0)}static endDimension(t){return t.endObject()}static createDimension(t,e,r){return n.startDimension(t),n.addValue(t,e),n.addDenotation(t,r),n.endDimension(t)}}e.Dimension=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsDimensionValue(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsDimensionValue(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}dimType(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readInt8(this.bb_pos+e):t.experimental.fbs.DimensionValueType.UNKNOWN}dimValue(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readInt64(this.bb_pos+t):this.bb.createLong(0,0)}dimParam(t){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.__string(this.bb_pos+e,t):null}static startDimensionValue(t){t.startObject(3)}static addDimType(e,n){e.addFieldInt8(0,n,t.experimental.fbs.DimensionValueType.UNKNOWN)}static addDimValue(t,e){t.addFieldInt64(1,e,t.createLong(0,0))}static addDimParam(t,e){t.addFieldOffset(2,e,0)}static endDimensionValue(t){return t.endObject()}static createDimensionValue(t,e,r,i){return n.startDimensionValue(t),n.addDimType(t,e),n.addDimValue(t,r),n.addDimParam(t,i),n.endDimensionValue(t)}}e.DimensionValue=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsTensorTypeAndShape(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsTensorTypeAndShape(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}elemType(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readInt32(this.bb_pos+e):t.experimental.fbs.TensorDataType.UNDEFINED}shape(e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new t.experimental.fbs.Shape).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startTensorTypeAndShape(t){t.startObject(2)}static addElemType(e,n){e.addFieldInt32(0,n,t.experimental.fbs.TensorDataType.UNDEFINED)}static addShape(t,e){t.addFieldOffset(1,e,0)}static endTensorTypeAndShape(t){return t.endObject()}static createTensorTypeAndShape(t,e,r){return n.startTensorTypeAndShape(t),n.addElemType(t,e),n.addShape(t,r),n.endTensorTypeAndShape(t)}}e.TensorTypeAndShape=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsMapType(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsMapType(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}keyType(){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readInt32(this.bb_pos+e):t.experimental.fbs.TensorDataType.UNDEFINED}valueType(e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new t.experimental.fbs.TypeInfo).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startMapType(t){t.startObject(2)}static addKeyType(e,n){e.addFieldInt32(0,n,t.experimental.fbs.TensorDataType.UNDEFINED)}static addValueType(t,e){t.addFieldOffset(1,e,0)}static endMapType(t){return t.endObject()}static createMapType(t,e,r){return n.startMapType(t),n.addKeyType(t,e),n.addValueType(t,r),n.endMapType(t)}}e.MapType=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsSequenceType(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsSequenceType(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}elemType(e){let n=this.bb.__offset(this.bb_pos,4);return n?(e||new t.experimental.fbs.TypeInfo).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startSequenceType(t){t.startObject(1)}static addElemType(t,e){t.addFieldOffset(0,e,0)}static endSequenceType(t){return t.endObject()}static createSequenceType(t,e){return n.startSequenceType(t),n.addElemType(t,e),n.endSequenceType(t)}}e.SequenceType=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(t){(t.fbs||(t.fbs={})).EdgeEnd=class{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}nodeIndex(){return this.bb.readUint32(this.bb_pos)}srcArgIndex(){return this.bb.readInt32(this.bb_pos+4)}dstArgIndex(){return this.bb.readInt32(this.bb_pos+8)}static createEdgeEnd(t,e,n,r){return t.prep(4,12),t.writeInt32(r),t.writeInt32(n),t.writeInt32(e),t.offset()}}}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsNodeEdge(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsNodeEdge(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}nodeIndex(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readUint32(this.bb_pos+t):0}inputEdges(e,n){let r=this.bb.__offset(this.bb_pos,6);return r?(n||new t.experimental.fbs.EdgeEnd).__init(this.bb.__vector(this.bb_pos+r)+12*e,this.bb):null}inputEdgesLength(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}outputEdges(e,n){let r=this.bb.__offset(this.bb_pos,8);return r?(n||new t.experimental.fbs.EdgeEnd).__init(this.bb.__vector(this.bb_pos+r)+12*e,this.bb):null}outputEdgesLength(){let t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}static startNodeEdge(t){t.startObject(3)}static addNodeIndex(t,e){t.addFieldInt32(0,e,0)}static addInputEdges(t,e){t.addFieldOffset(1,e,0)}static startInputEdgesVector(t,e){t.startVector(12,e,4)}static addOutputEdges(t,e){t.addFieldOffset(2,e,0)}static startOutputEdgesVector(t,e){t.startVector(12,e,4)}static endNodeEdge(t){return t.endObject()}static createNodeEdge(t,e,r,i){return n.startNodeEdge(t),n.addNodeIndex(t,e),n.addInputEdges(t,r),n.addOutputEdges(t,i),n.endNodeEdge(t)}}e.NodeEdge=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsNode(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsNode(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}name(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__string(this.bb_pos+e,t):null}docString(t){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__string(this.bb_pos+e,t):null}domain(t){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.__string(this.bb_pos+e,t):null}sinceVersion(){let t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readInt32(this.bb_pos+t):0}index(){let t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readUint32(this.bb_pos+t):0}opType(t){let e=this.bb.__offset(this.bb_pos,14);return e?this.bb.__string(this.bb_pos+e,t):null}type(){let e=this.bb.__offset(this.bb_pos,16);return e?this.bb.readInt32(this.bb_pos+e):t.experimental.fbs.NodeType.Primitive}executionProviderType(t){let e=this.bb.__offset(this.bb_pos,18);return e?this.bb.__string(this.bb_pos+e,t):null}inputs(t,e){let n=this.bb.__offset(this.bb_pos,20);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+4*t,e):null}inputsLength(){let t=this.bb.__offset(this.bb_pos,20);return t?this.bb.__vector_len(this.bb_pos+t):0}outputs(t,e){let n=this.bb.__offset(this.bb_pos,22);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+4*t,e):null}outputsLength(){let t=this.bb.__offset(this.bb_pos,22);return t?this.bb.__vector_len(this.bb_pos+t):0}attributes(e,n){let r=this.bb.__offset(this.bb_pos,24);return r?(n||new t.experimental.fbs.Attribute).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+r)+4*e),this.bb):null}attributesLength(){let t=this.bb.__offset(this.bb_pos,24);return t?this.bb.__vector_len(this.bb_pos+t):0}inputArgCounts(t){let e=this.bb.__offset(this.bb_pos,26);return e?this.bb.readInt32(this.bb.__vector(this.bb_pos+e)+4*t):0}inputArgCountsLength(){let t=this.bb.__offset(this.bb_pos,26);return t?this.bb.__vector_len(this.bb_pos+t):0}inputArgCountsArray(){let t=this.bb.__offset(this.bb_pos,26);return t?new Int32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}implicitInputs(t,e){let n=this.bb.__offset(this.bb_pos,28);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+4*t,e):null}implicitInputsLength(){let t=this.bb.__offset(this.bb_pos,28);return t?this.bb.__vector_len(this.bb_pos+t):0}static startNode(t){t.startObject(13)}static addName(t,e){t.addFieldOffset(0,e,0)}static addDocString(t,e){t.addFieldOffset(1,e,0)}static addDomain(t,e){t.addFieldOffset(2,e,0)}static addSinceVersion(t,e){t.addFieldInt32(3,e,0)}static addIndex(t,e){t.addFieldInt32(4,e,0)}static addOpType(t,e){t.addFieldOffset(5,e,0)}static addType(e,n){e.addFieldInt32(6,n,t.experimental.fbs.NodeType.Primitive)}static addExecutionProviderType(t,e){t.addFieldOffset(7,e,0)}static addInputs(t,e){t.addFieldOffset(8,e,0)}static createInputsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startInputsVector(t,e){t.startVector(4,e,4)}static addOutputs(t,e){t.addFieldOffset(9,e,0)}static createOutputsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startOutputsVector(t,e){t.startVector(4,e,4)}static addAttributes(t,e){t.addFieldOffset(10,e,0)}static createAttributesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startAttributesVector(t,e){t.startVector(4,e,4)}static addInputArgCounts(t,e){t.addFieldOffset(11,e,0)}static createInputArgCountsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startInputArgCountsVector(t,e){t.startVector(4,e,4)}static addImplicitInputs(t,e){t.addFieldOffset(12,e,0)}static createImplicitInputsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startImplicitInputsVector(t,e){t.startVector(4,e,4)}static endNode(t){return t.endObject()}static createNode(t,e,r,i,o,a,s,u,c,l,p,f,d,h){return n.startNode(t),n.addName(t,e),n.addDocString(t,r),n.addDomain(t,i),n.addSinceVersion(t,o),n.addIndex(t,a),n.addOpType(t,s),n.addType(t,u),n.addExecutionProviderType(t,c),n.addInputs(t,l),n.addOutputs(t,p),n.addAttributes(t,f),n.addInputArgCounts(t,d),n.addImplicitInputs(t,h),n.endNode(t)}}e.Node=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsValueInfo(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsValueInfo(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}name(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__string(this.bb_pos+e,t):null}docString(t){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__string(this.bb_pos+e,t):null}type(e){let n=this.bb.__offset(this.bb_pos,8);return n?(e||new t.experimental.fbs.TypeInfo).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startValueInfo(t){t.startObject(3)}static addName(t,e){t.addFieldOffset(0,e,0)}static addDocString(t,e){t.addFieldOffset(1,e,0)}static addType(t,e){t.addFieldOffset(2,e,0)}static endValueInfo(t){return t.endObject()}static createValueInfo(t,e,r,i){return n.startValueInfo(t),n.addName(t,e),n.addDocString(t,r),n.addType(t,i),n.endValueInfo(t)}}e.ValueInfo=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsTypeInfo(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsTypeInfo(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}denotation(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__string(this.bb_pos+e,t):null}valueType(){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.readUint8(this.bb_pos+e):t.experimental.fbs.TypeInfoValue.NONE}value(t){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.__union(t,this.bb_pos+e):null}static startTypeInfo(t){t.startObject(3)}static addDenotation(t,e){t.addFieldOffset(0,e,0)}static addValueType(e,n){e.addFieldInt8(1,n,t.experimental.fbs.TypeInfoValue.NONE)}static addValue(t,e){t.addFieldOffset(2,e,0)}static endTypeInfo(t){return t.endObject()}static createTypeInfo(t,e,r,i){return n.startTypeInfo(t),n.addDenotation(t,e),n.addValueType(t,r),n.addValue(t,i),n.endTypeInfo(t)}}e.TypeInfo=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(t){!function(t){class e{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsOperatorSetId(t,n){return(n||new e).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsOperatorSetId(t,n){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(n||new e).__init(t.readInt32(t.position())+t.position(),t)}domain(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__string(this.bb_pos+e,t):null}version(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readInt64(this.bb_pos+t):this.bb.createLong(0,0)}static startOperatorSetId(t){t.startObject(2)}static addDomain(t,e){t.addFieldOffset(0,e,0)}static addVersion(t,e){t.addFieldInt64(1,e,t.createLong(0,0))}static endOperatorSetId(t){return t.endObject()}static createOperatorSetId(t,n,r){return e.startOperatorSetId(t),e.addDomain(t,n),e.addVersion(t,r),e.endOperatorSetId(t)}}t.OperatorSetId=e}(t.fbs||(t.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsTensor(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsTensor(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}name(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__string(this.bb_pos+e,t):null}docString(t){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__string(this.bb_pos+e,t):null}dims(t){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.readInt64(this.bb.__vector(this.bb_pos+e)+8*t):this.bb.createLong(0,0)}dimsLength(){let t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}dataType(){let e=this.bb.__offset(this.bb_pos,10);return e?this.bb.readInt32(this.bb_pos+e):t.experimental.fbs.TensorDataType.UNDEFINED}rawData(t){let e=this.bb.__offset(this.bb_pos,12);return e?this.bb.readUint8(this.bb.__vector(this.bb_pos+e)+t):0}rawDataLength(){let t=this.bb.__offset(this.bb_pos,12);return t?this.bb.__vector_len(this.bb_pos+t):0}rawDataArray(){let t=this.bb.__offset(this.bb_pos,12);return t?new Uint8Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}stringData(t,e){let n=this.bb.__offset(this.bb_pos,14);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+4*t,e):null}stringDataLength(){let t=this.bb.__offset(this.bb_pos,14);return t?this.bb.__vector_len(this.bb_pos+t):0}static startTensor(t){t.startObject(6)}static addName(t,e){t.addFieldOffset(0,e,0)}static addDocString(t,e){t.addFieldOffset(1,e,0)}static addDims(t,e){t.addFieldOffset(2,e,0)}static createDimsVector(t,e){t.startVector(8,e.length,8);for(let n=e.length-1;n>=0;n--)t.addInt64(e[n]);return t.endVector()}static startDimsVector(t,e){t.startVector(8,e,8)}static addDataType(e,n){e.addFieldInt32(3,n,t.experimental.fbs.TensorDataType.UNDEFINED)}static addRawData(t,e){t.addFieldOffset(4,e,0)}static createRawDataVector(t,e){t.startVector(1,e.length,1);for(let n=e.length-1;n>=0;n--)t.addInt8(e[n]);return t.endVector()}static startRawDataVector(t,e){t.startVector(1,e,1)}static addStringData(t,e){t.addFieldOffset(5,e,0)}static createStringDataVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startStringDataVector(t,e){t.startVector(4,e,4)}static endTensor(t){return t.endObject()}static createTensor(t,e,r,i,o,a,s){return n.startTensor(t),n.addName(t,e),n.addDocString(t,r),n.addDims(t,i),n.addDataType(t,o),n.addRawData(t,a),n.addStringData(t,s),n.endTensor(t)}}e.Tensor=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsSparseTensor(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsSparseTensor(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}values(e){let n=this.bb.__offset(this.bb_pos,4);return n?(e||new t.experimental.fbs.Tensor).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}indices(e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new t.experimental.fbs.Tensor).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}dims(t){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.readInt64(this.bb.__vector(this.bb_pos+e)+8*t):this.bb.createLong(0,0)}dimsLength(){let t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}static startSparseTensor(t){t.startObject(3)}static addValues(t,e){t.addFieldOffset(0,e,0)}static addIndices(t,e){t.addFieldOffset(1,e,0)}static addDims(t,e){t.addFieldOffset(2,e,0)}static createDimsVector(t,e){t.startVector(8,e.length,8);for(let n=e.length-1;n>=0;n--)t.addInt64(e[n]);return t.endVector()}static startDimsVector(t,e){t.startVector(8,e,8)}static endSparseTensor(t){return t.endObject()}static createSparseTensor(t,e,r,i){return n.startSparseTensor(t),n.addValues(t,e),n.addIndices(t,r),n.addDims(t,i),n.endSparseTensor(t)}}e.SparseTensor=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsAttribute(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsAttribute(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}name(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__string(this.bb_pos+e,t):null}docString(t){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.__string(this.bb_pos+e,t):null}type(){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.readInt32(this.bb_pos+e):t.experimental.fbs.AttributeType.UNDEFINED}f(){let t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readFloat32(this.bb_pos+t):0}i(){let t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readInt64(this.bb_pos+t):this.bb.createLong(0,0)}s(t){let e=this.bb.__offset(this.bb_pos,14);return e?this.bb.__string(this.bb_pos+e,t):null}t(e){let n=this.bb.__offset(this.bb_pos,16);return n?(e||new t.experimental.fbs.Tensor).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}g(e){let n=this.bb.__offset(this.bb_pos,18);return n?(e||new t.experimental.fbs.Graph).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}floats(t){let e=this.bb.__offset(this.bb_pos,20);return e?this.bb.readFloat32(this.bb.__vector(this.bb_pos+e)+4*t):0}floatsLength(){let t=this.bb.__offset(this.bb_pos,20);return t?this.bb.__vector_len(this.bb_pos+t):0}floatsArray(){let t=this.bb.__offset(this.bb_pos,20);return t?new Float32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}ints(t){let e=this.bb.__offset(this.bb_pos,22);return e?this.bb.readInt64(this.bb.__vector(this.bb_pos+e)+8*t):this.bb.createLong(0,0)}intsLength(){let t=this.bb.__offset(this.bb_pos,22);return t?this.bb.__vector_len(this.bb_pos+t):0}strings(t,e){let n=this.bb.__offset(this.bb_pos,24);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+4*t,e):null}stringsLength(){let t=this.bb.__offset(this.bb_pos,24);return t?this.bb.__vector_len(this.bb_pos+t):0}tensors(e,n){let r=this.bb.__offset(this.bb_pos,26);return r?(n||new t.experimental.fbs.Tensor).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+r)+4*e),this.bb):null}tensorsLength(){let t=this.bb.__offset(this.bb_pos,26);return t?this.bb.__vector_len(this.bb_pos+t):0}graphs(e,n){let r=this.bb.__offset(this.bb_pos,28);return r?(n||new t.experimental.fbs.Graph).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+r)+4*e),this.bb):null}graphsLength(){let t=this.bb.__offset(this.bb_pos,28);return t?this.bb.__vector_len(this.bb_pos+t):0}static startAttribute(t){t.startObject(13)}static addName(t,e){t.addFieldOffset(0,e,0)}static addDocString(t,e){t.addFieldOffset(1,e,0)}static addType(e,n){e.addFieldInt32(2,n,t.experimental.fbs.AttributeType.UNDEFINED)}static addF(t,e){t.addFieldFloat32(3,e,0)}static addI(t,e){t.addFieldInt64(4,e,t.createLong(0,0))}static addS(t,e){t.addFieldOffset(5,e,0)}static addT(t,e){t.addFieldOffset(6,e,0)}static addG(t,e){t.addFieldOffset(7,e,0)}static addFloats(t,e){t.addFieldOffset(8,e,0)}static createFloatsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addFloat32(e[n]);return t.endVector()}static startFloatsVector(t,e){t.startVector(4,e,4)}static addInts(t,e){t.addFieldOffset(9,e,0)}static createIntsVector(t,e){t.startVector(8,e.length,8);for(let n=e.length-1;n>=0;n--)t.addInt64(e[n]);return t.endVector()}static startIntsVector(t,e){t.startVector(8,e,8)}static addStrings(t,e){t.addFieldOffset(10,e,0)}static createStringsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startStringsVector(t,e){t.startVector(4,e,4)}static addTensors(t,e){t.addFieldOffset(11,e,0)}static createTensorsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startTensorsVector(t,e){t.startVector(4,e,4)}static addGraphs(t,e){t.addFieldOffset(12,e,0)}static createGraphsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startGraphsVector(t,e){t.startVector(4,e,4)}static endAttribute(t){return t.endObject()}static createAttribute(t,e,r,i,o,a,s,u,c,l,p,f,d,h){return n.startAttribute(t),n.addName(t,e),n.addDocString(t,r),n.addType(t,i),n.addF(t,o),n.addI(t,a),n.addS(t,s),n.addT(t,u),n.addG(t,c),n.addFloats(t,l),n.addInts(t,p),n.addStrings(t,f),n.addTensors(t,d),n.addGraphs(t,h),n.endAttribute(t)}}e.Attribute=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsGraph(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsGraph(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}initializers(e,n){let r=this.bb.__offset(this.bb_pos,4);return r?(n||new t.experimental.fbs.Tensor).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+r)+4*e),this.bb):null}initializersLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}nodeArgs(e,n){let r=this.bb.__offset(this.bb_pos,6);return r?(n||new t.experimental.fbs.ValueInfo).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+r)+4*e),this.bb):null}nodeArgsLength(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}nodes(e,n){let r=this.bb.__offset(this.bb_pos,8);return r?(n||new t.experimental.fbs.Node).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+r)+4*e),this.bb):null}nodesLength(){let t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}maxNodeIndex(){let t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readUint32(this.bb_pos+t):0}nodeEdges(e,n){let r=this.bb.__offset(this.bb_pos,12);return r?(n||new t.experimental.fbs.NodeEdge).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+r)+4*e),this.bb):null}nodeEdgesLength(){let t=this.bb.__offset(this.bb_pos,12);return t?this.bb.__vector_len(this.bb_pos+t):0}inputs(t,e){let n=this.bb.__offset(this.bb_pos,14);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+4*t,e):null}inputsLength(){let t=this.bb.__offset(this.bb_pos,14);return t?this.bb.__vector_len(this.bb_pos+t):0}outputs(t,e){let n=this.bb.__offset(this.bb_pos,16);return n?this.bb.__string(this.bb.__vector(this.bb_pos+n)+4*t,e):null}outputsLength(){let t=this.bb.__offset(this.bb_pos,16);return t?this.bb.__vector_len(this.bb_pos+t):0}sparseInitializers(e,n){let r=this.bb.__offset(this.bb_pos,18);return r?(n||new t.experimental.fbs.SparseTensor).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+r)+4*e),this.bb):null}sparseInitializersLength(){let t=this.bb.__offset(this.bb_pos,18);return t?this.bb.__vector_len(this.bb_pos+t):0}static startGraph(t){t.startObject(8)}static addInitializers(t,e){t.addFieldOffset(0,e,0)}static createInitializersVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startInitializersVector(t,e){t.startVector(4,e,4)}static addNodeArgs(t,e){t.addFieldOffset(1,e,0)}static createNodeArgsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startNodeArgsVector(t,e){t.startVector(4,e,4)}static addNodes(t,e){t.addFieldOffset(2,e,0)}static createNodesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startNodesVector(t,e){t.startVector(4,e,4)}static addMaxNodeIndex(t,e){t.addFieldInt32(3,e,0)}static addNodeEdges(t,e){t.addFieldOffset(4,e,0)}static createNodeEdgesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startNodeEdgesVector(t,e){t.startVector(4,e,4)}static addInputs(t,e){t.addFieldOffset(5,e,0)}static createInputsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startInputsVector(t,e){t.startVector(4,e,4)}static addOutputs(t,e){t.addFieldOffset(6,e,0)}static createOutputsVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startOutputsVector(t,e){t.startVector(4,e,4)}static addSparseInitializers(t,e){t.addFieldOffset(7,e,0)}static createSparseInitializersVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startSparseInitializersVector(t,e){t.startVector(4,e,4)}static endGraph(t){return t.endObject()}static createGraph(t,e,r,i,o,a,s,u,c){return n.startGraph(t),n.addInitializers(t,e),n.addNodeArgs(t,r),n.addNodes(t,i),n.addMaxNodeIndex(t,o),n.addNodeEdges(t,a),n.addInputs(t,s),n.addOutputs(t,u),n.addSparseInitializers(t,c),n.endGraph(t)}}e.Graph=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsModel(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsModel(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}irVersion(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readInt64(this.bb_pos+t):this.bb.createLong(0,0)}opsetImport(e,n){let r=this.bb.__offset(this.bb_pos,6);return r?(n||new t.experimental.fbs.OperatorSetId).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+r)+4*e),this.bb):null}opsetImportLength(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}producerName(t){let e=this.bb.__offset(this.bb_pos,8);return e?this.bb.__string(this.bb_pos+e,t):null}producerVersion(t){let e=this.bb.__offset(this.bb_pos,10);return e?this.bb.__string(this.bb_pos+e,t):null}domain(t){let e=this.bb.__offset(this.bb_pos,12);return e?this.bb.__string(this.bb_pos+e,t):null}modelVersion(){let t=this.bb.__offset(this.bb_pos,14);return t?this.bb.readInt64(this.bb_pos+t):this.bb.createLong(0,0)}docString(t){let e=this.bb.__offset(this.bb_pos,16);return e?this.bb.__string(this.bb_pos+e,t):null}graph(e){let n=this.bb.__offset(this.bb_pos,18);return n?(e||new t.experimental.fbs.Graph).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}graphDocString(t){let e=this.bb.__offset(this.bb_pos,20);return e?this.bb.__string(this.bb_pos+e,t):null}static startModel(t){t.startObject(9)}static addIrVersion(t,e){t.addFieldInt64(0,e,t.createLong(0,0))}static addOpsetImport(t,e){t.addFieldOffset(1,e,0)}static createOpsetImportVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startOpsetImportVector(t,e){t.startVector(4,e,4)}static addProducerName(t,e){t.addFieldOffset(2,e,0)}static addProducerVersion(t,e){t.addFieldOffset(3,e,0)}static addDomain(t,e){t.addFieldOffset(4,e,0)}static addModelVersion(t,e){t.addFieldInt64(5,e,t.createLong(0,0))}static addDocString(t,e){t.addFieldOffset(6,e,0)}static addGraph(t,e){t.addFieldOffset(7,e,0)}static addGraphDocString(t,e){t.addFieldOffset(8,e,0)}static endModel(t){return t.endObject()}static createModel(t,e,r,i,o,a,s,u,c,l){return n.startModel(t),n.addIrVersion(t,e),n.addOpsetImport(t,r),n.addProducerName(t,i),n.addProducerVersion(t,o),n.addDomain(t,a),n.addModelVersion(t,s),n.addDocString(t,u),n.addGraph(t,c),n.addGraphDocString(t,l),n.endModel(t)}}e.Model=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(t){!function(t){class e{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsKernelCreateInfos(t,n){return(n||new e).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsKernelCreateInfos(t,n){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(n||new e).__init(t.readInt32(t.position())+t.position(),t)}nodeIndices(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.readUint32(this.bb.__vector(this.bb_pos+e)+4*t):0}nodeIndicesLength(){let t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}nodeIndicesArray(){let t=this.bb.__offset(this.bb_pos,4);return t?new Uint32Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}kernelDefHashes(t){let e=this.bb.__offset(this.bb_pos,6);return e?this.bb.readUint64(this.bb.__vector(this.bb_pos+e)+8*t):this.bb.createLong(0,0)}kernelDefHashesLength(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}static startKernelCreateInfos(t){t.startObject(2)}static addNodeIndices(t,e){t.addFieldOffset(0,e,0)}static createNodeIndicesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addInt32(e[n]);return t.endVector()}static startNodeIndicesVector(t,e){t.startVector(4,e,4)}static addKernelDefHashes(t,e){t.addFieldOffset(1,e,0)}static createKernelDefHashesVector(t,e){t.startVector(8,e.length,8);for(let n=e.length-1;n>=0;n--)t.addInt64(e[n]);return t.endVector()}static startKernelDefHashesVector(t,e){t.startVector(8,e,8)}static endKernelCreateInfos(t){return t.endObject()}static createKernelCreateInfos(t,n,r){return e.startKernelCreateInfos(t),e.addNodeIndices(t,n),e.addKernelDefHashes(t,r),e.endKernelCreateInfos(t)}}t.KernelCreateInfos=e}(t.fbs||(t.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsSubGraphSessionState(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsSubGraphSessionState(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}graphId(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__string(this.bb_pos+e,t):null}sessionState(e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new t.experimental.fbs.SessionState).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startSubGraphSessionState(t){t.startObject(2)}static addGraphId(t,e){t.addFieldOffset(0,e,0)}static addSessionState(t,e){t.addFieldOffset(1,e,0)}static endSubGraphSessionState(t){let e=t.endObject();return t.requiredField(e,4),e}static createSubGraphSessionState(t,e,r){return n.startSubGraphSessionState(t),n.addGraphId(t,e),n.addSessionState(t,r),n.endSubGraphSessionState(t)}}e.SubGraphSessionState=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsSessionState(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsSessionState(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}kernels(e){let n=this.bb.__offset(this.bb_pos,4);return n?(e||new t.experimental.fbs.KernelCreateInfos).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}subGraphSessionStates(e,n){let r=this.bb.__offset(this.bb_pos,6);return r?(n||new t.experimental.fbs.SubGraphSessionState).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+r)+4*e),this.bb):null}subGraphSessionStatesLength(){let t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}static startSessionState(t){t.startObject(2)}static addKernels(t,e){t.addFieldOffset(0,e,0)}static addSubGraphSessionStates(t,e){t.addFieldOffset(1,e,0)}static createSubGraphSessionStatesVector(t,e){t.startVector(4,e.length,4);for(let n=e.length-1;n>=0;n--)t.addOffset(e[n]);return t.endVector()}static startSubGraphSessionStatesVector(t,e){t.startVector(4,e,4)}static endSessionState(t){return t.endObject()}static createSessionState(t,e,r){return n.startSessionState(t),n.addKernels(t,e),n.addSubGraphSessionStates(t,r),n.endSessionState(t)}}e.SessionState=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={})),function(t){!function(e){!function(e){class n{constructor(){this.bb=null,this.bb_pos=0}__init(t,e){return this.bb_pos=t,this.bb=e,this}static getRootAsInferenceSession(t,e){return(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsInferenceSession(t,e){return t.setPosition(t.position()+r.flatbuffers.SIZE_PREFIX_LENGTH),(e||new n).__init(t.readInt32(t.position())+t.position(),t)}static bufferHasIdentifier(t){return t.__has_identifier("ORTM")}ortVersion(t){let e=this.bb.__offset(this.bb_pos,4);return e?this.bb.__string(this.bb_pos+e,t):null}model(e){let n=this.bb.__offset(this.bb_pos,6);return n?(e||new t.experimental.fbs.Model).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}sessionState(e){let n=this.bb.__offset(this.bb_pos,8);return n?(e||new t.experimental.fbs.SessionState).__init(this.bb.__indirect(this.bb_pos+n),this.bb):null}static startInferenceSession(t){t.startObject(3)}static addOrtVersion(t,e){t.addFieldOffset(0,e,0)}static addModel(t,e){t.addFieldOffset(1,e,0)}static addSessionState(t,e){t.addFieldOffset(2,e,0)}static endInferenceSession(t){return t.endObject()}static finishInferenceSessionBuffer(t,e){t.finish(e,"ORTM")}static finishSizePrefixedInferenceSessionBuffer(t,e){t.finish(e,"ORTM",!0)}static createInferenceSession(t,e,r,i){return n.startInferenceSession(t),n.addOrtVersion(t,e),n.addModel(t,r),n.addSessionState(t,i),n.endInferenceSession(t)}}e.InferenceSession=n}(e.fbs||(e.fbs={}))}(t.experimental||(t.experimental={}))}(e.onnxruntime||(e.onnxruntime={}))},7448:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.OnnxjsSessionHandler=void 0;const r=n(1670),i=n(9162);e.OnnxjsSessionHandler=class{constructor(t){this.session=t,this.inputNames=this.session.inputNames,this.outputNames=this.session.outputNames}async dispose(){}async run(t,e,n){const o=new Map;for(const e in t)if(Object.hasOwnProperty.call(t,e)){const n=t[e];o.set(e,new i.Tensor(n.dims,n.type,void 0,void 0,n.data))}const a=await this.session.run(o),s={};return a.forEach(((t,e)=>{s[e]=new r.Tensor(t.type,t.data,t.dims)})),s}startProfiling(){this.session.startProfiling()}endProfiling(){this.session.endProfiling()}}},6919:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.Session=void 0;const r=n(7067),i=n(1296),o=n(7091),a=n(1036),s=n(6231),u=n(2644);e.Session=class{constructor(t={}){this._initialized=!1,this.backendHint=t.backendHint,this.profiler=s.Profiler.create(t.profiler),this.context={profiler:this.profiler,graphInputTypes:[],graphInputDims:[]}}get inputNames(){return this._model.graph.getInputNames()}get outputNames(){return this._model.graph.getOutputNames()}startProfiling(){this.profiler.start()}endProfiling(){this.profiler.stop()}async loadModel(t,e,n){await this.profiler.event("session","Session.loadModel",(async()=>{const a=await(0,o.resolveBackend)(this.backendHint);if(this.sessionHandler=a.createSessionHandler(this.context),this._model=new u.Model,"string"==typeof t){const e=t.endsWith(".ort");if("undefined"==typeof fetch){const n=await(0,i.promisify)(r.readFile)(t);this.initialize(n,e)}else{const n=await fetch(t),r=await n.arrayBuffer();this.initialize(new Uint8Array(r),e)}}else if(ArrayBuffer.isView(t))this.initialize(t);else{const r=new Uint8Array(t,e||0,n||t.byteLength);this.initialize(r)}}))}initialize(t,e){if(this._initialized)throw new Error("already initialized");this.profiler.event("session","Session.initialize",(()=>{const n=this.sessionHandler.transformGraph?this.sessionHandler:void 0;this._model.load(t,n,e),this.sessionHandler.onGraphInitialized&&this.sessionHandler.onGraphInitialized(this._model.graph),this.initializeOps(this._model.graph),this._executionPlan=new a.ExecutionPlan(this._model.graph,this._ops,this.profiler)})),this._initialized=!0}async run(t){if(!this._initialized)throw new Error("session not initialized yet");return this.profiler.event("session","Session.run",(async()=>{const e=this.normalizeAndValidateInputs(t),n=await this._executionPlan.execute(this.sessionHandler,e);return this.createOutput(n)}))}normalizeAndValidateInputs(t){const e=this._model.graph.getInputNames();if(Array.isArray(t)){if(t.length!==e.length)throw new Error(`incorrect input array length: expected ${e.length} but got ${t.length}`)}else{if(t.size!==e.length)throw new Error(`incorrect input map size: expected ${e.length} but got ${t.size}`);const n=new Array(t.size);let r=0;for(let i=0;i<e.length;++i){const o=t.get(e[i]);if(!o)throw new Error(`missing input tensor for: '${name}'`);n[r++]=o}t=n}if(this.context.graphInputTypes&&0!==this.context.graphInputTypes.length&&this.context.graphInputDims&&0!==this.context.graphInputDims.length)this.validateInputTensorDims(this.context.graphInputDims,t,!1);else{const e=this._model.graph.getInputIndices(),n=this._model.graph.getValues(),r=new Array(e.length);for(let i=0;i<e.length;++i){const o=n[e[i]];r[i]=o.type.shape.dims,this.context.graphInputTypes.push(o.type.tensorType),this.context.graphInputDims.push(t[i].dims)}this.validateInputTensorDims(r,t,!0)}return this.validateInputTensorTypes(this.context.graphInputTypes,t),t}validateInputTensorTypes(t,e){for(let n=0;n<e.length;n++){const r=t[n],i=e[n].type;if(r!==i)throw new Error(`input tensor[${n}] check failed: expected type '${r}' but got ${i}`)}}validateInputTensorDims(t,e,n){for(let r=0;r<e.length;r++){const i=t[r],o=e[r].dims;if(!this.compareTensorDims(i,o,n))throw new Error(`input tensor[${r}] check failed: expected shape '[${i.join(",")}]' but got [${o.join(",")}]`)}}compareTensorDims(t,e,n){if(t.length!==e.length)return!1;for(let r=0;r<t.length;++r)if(t[r]!==e[r]&&(!n||0!==t[r]))return!1;return!0}createOutput(t){const e=this._model.graph.getOutputNames();if(t.length!==e.length)throw new Error("expected number of outputs do not match number of generated outputs");const n=new Map;for(let r=0;r<e.length;++r)n.set(e[r],t[r]);return n}initializeOps(t){const e=t.getNodes();this._ops=new Array(e.length);for(let n=0;n<e.length;n++)this._ops[n]=this.sessionHandler.resolve(e[n],this._model.opsets,t)}}},9162:function(t,e,n){"use strict";var r=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(e,"__esModule",{value:!0}),e.Tensor=void 0;const i=n(3442),o=r(n(3720)),a=n(1446),s=n(9395),u=n(2517);var c=s.onnxruntime.experimental.fbs;class l{get data(){if(void 0===this.cache){const t=this.dataProvider(this.dataId);if(t.length!==this.size)throw new Error("Length of data provided by the Data Provider is inconsistent with the dims of this Tensor.");this.cache=t}return this.cache}get stringData(){if("string"!==this.type)throw new TypeError("data type is not string");return this.data}get integerData(){switch(this.type){case"uint8":case"int8":case"uint16":case"int16":case"int32":case"uint32":case"bool":return this.data;default:throw new TypeError("data type is not integer (uint8, int8, uint16, int16, int32, uint32, bool)")}}get floatData(){switch(this.type){case"float32":case"float64":return this.data;default:throw new TypeError("data type is not float (float32, float64)")}}get numberData(){if("string"!==this.type)return this.data;throw new TypeError("type cannot be non-number (string)")}get(t){return this.data[u.ShapeUtil.indicesToOffset(t,this.strides)]}set(t,e){this.data[u.ShapeUtil.indicesToOffset(t,this.strides)]=e}async getData(){return void 0===this.cache&&(this.cache=await this.asyncDataProvider(this.dataId)),this.cache}get strides(){return this._strides||(this._strides=u.ShapeUtil.computeStrides(this.dims)),this._strides}constructor(t,e,n,r,o,a=i.Guid.create()){this.dims=t,this.type=e,this.dataProvider=n,this.asyncDataProvider=r,this.cache=o,this.dataId=a,this.size=u.ShapeUtil.validateDimsAndCalcSize(t);const s=this.size,c=void 0===n&&void 0===r&&void 0===o;if(void 0!==o&&o.length!==s)throw new RangeError("Input dims doesn't match data length.");if("string"===e){if(!(void 0===o||Array.isArray(o)&&o.every((t=>"string"==typeof t))))throw new TypeError("cache should be a string array");c&&(this.cache=new Array(s))}else{if(void 0!==o){const t=f(e);if(!(o instanceof t))throw new TypeError(`cache should be type ${t.name}`)}if(c){const t=new ArrayBuffer(s*function(t){switch(t){case"bool":case"int8":case"uint8":return 1;case"int16":case"uint16":return 2;case"int32":case"uint32":case"float32":return 4;case"float64":return 8;default:throw new Error(`cannot calculate sizeof() on type ${t}`)}}(e));this.cache=function(t,e){return new(f(e))(t)}(t,e)}}}static fromProto(t){if(!t)throw new Error("cannot construct Value from an empty tensor");const e=u.ProtoUtil.tensorDataTypeFromProto(t.dataType),n=u.ProtoUtil.tensorDimsFromProto(t.dims),r=new l(n,e);if("string"===e)t.stringData.forEach(((t,e)=>{r.data[e]=(0,u.decodeUtf8String)(t)}));else if(t.rawData&&"number"==typeof t.rawData.byteLength&&t.rawData.byteLength>0){const e=r.data,n=new DataView(t.rawData.buffer,t.rawData.byteOffset,t.rawData.byteLength),i=p(t.dataType),o=t.rawData.byteLength/i;if(t.rawData.byteLength%i!=0)throw new Error("invalid buffer length");if(e.length!==o)throw new Error("buffer length mismatch");for(let r=0;r<o;r++){const o=h(n,t.dataType,r*i);e[r]=o}}else{let e;switch(t.dataType){case a.onnx.TensorProto.DataType.FLOAT:e=t.floatData;break;case a.onnx.TensorProto.DataType.INT32:case a.onnx.TensorProto.DataType.INT16:case a.onnx.TensorProto.DataType.UINT16:case a.onnx.TensorProto.DataType.INT8:case a.onnx.TensorProto.DataType.UINT8:case a.onnx.TensorProto.DataType.BOOL:e=t.int32Data;break;case a.onnx.TensorProto.DataType.INT64:e=t.int64Data;break;case a.onnx.TensorProto.DataType.DOUBLE:e=t.doubleData;break;case a.onnx.TensorProto.DataType.UINT32:case a.onnx.TensorProto.DataType.UINT64:e=t.uint64Data;break;default:throw new Error("unspecific error")}if(null==e)throw new Error("failed to populate data from a tensorproto value");const n=r.data;if(n.length!==e.length)throw new Error("array length mismatch");for(let r=0;r<e.length;r++){const i=e[r];o.default.isLong(i)?n[r]=d(i,t.dataType):n[r]=i}}return r}static fromData(t,e,n){return new l(e,n,void 0,void 0,t)}static fromOrtTensor(t){if(!t)throw new Error("cannot construct Value from an empty tensor");const e=u.ProtoUtil.tensorDimsFromORTFormat(t),n=u.ProtoUtil.tensorDataTypeFromProto(t.dataType()),r=new l(e,n);if("string"===n)for(let e=0;e<t.stringDataLength();e++)r.data[e]=t.stringData(e);else if(t.rawDataArray()&&"number"==typeof t.rawDataLength()&&t.rawDataLength()>0){const e=r.data,n=new DataView(t.rawDataArray().buffer,t.rawDataArray().byteOffset,t.rawDataLength()),i=p(t.dataType()),o=t.rawDataLength()/i;if(t.rawDataLength()%i!=0)throw new Error("invalid buffer length");if(e.length!==o)throw new Error("buffer length mismatch");for(let r=0;r<o;r++){const o=h(n,t.dataType(),r*i);e[r]=o}}return r}}function p(t){switch(t){case a.onnx.TensorProto.DataType.UINT8:case a.onnx.TensorProto.DataType.INT8:case a.onnx.TensorProto.DataType.BOOL:return 1;case a.onnx.TensorProto.DataType.UINT16:case a.onnx.TensorProto.DataType.INT16:return 2;case a.onnx.TensorProto.DataType.FLOAT:case a.onnx.TensorProto.DataType.INT32:case a.onnx.TensorProto.DataType.UINT32:return 4;case a.onnx.TensorProto.DataType.INT64:case a.onnx.TensorProto.DataType.DOUBLE:case a.onnx.TensorProto.DataType.UINT64:return 8;default:throw new Error(`cannot calculate sizeof() on type ${a.onnx.TensorProto.DataType[t]}`)}}function f(t){switch(t){case"bool":case"uint8":return Uint8Array;case"int8":return Int8Array;case"int16":return Int16Array;case"uint16":return Uint16Array;case"int32":return Int32Array;case"uint32":return Uint32Array;case"float32":return Float32Array;case"float64":return Float64Array;default:throw new Error("unspecified error")}}function d(t,e){if(e===a.onnx.TensorProto.DataType.INT64||e===c.TensorDataType.INT64){if(t.greaterThanOrEqual(2147483648)||t.lessThan(-2147483648))throw new TypeError("int64 is not supported")}else{if(e!==a.onnx.TensorProto.DataType.UINT32&&e!==c.TensorDataType.UINT32&&e!==a.onnx.TensorProto.DataType.UINT64&&e!==c.TensorDataType.UINT64)throw new TypeError(`not a LONG type: ${a.onnx.TensorProto.DataType[e]}`);if(t.greaterThanOrEqual(4294967296)||t.lessThan(0))throw new TypeError("uint64 is not supported")}return t.toNumber()}function h(t,e,n){switch(e){case a.onnx.TensorProto.DataType.BOOL:case a.onnx.TensorProto.DataType.UINT8:return t.getUint8(n);case a.onnx.TensorProto.DataType.INT8:return t.getInt8(n);case a.onnx.TensorProto.DataType.UINT16:return t.getUint16(n,!0);case a.onnx.TensorProto.DataType.INT16:return t.getInt16(n,!0);case a.onnx.TensorProto.DataType.FLOAT:return t.getFloat32(n,!0);case a.onnx.TensorProto.DataType.INT32:return t.getInt32(n,!0);case a.onnx.TensorProto.DataType.UINT32:return t.getUint32(n,!0);case a.onnx.TensorProto.DataType.INT64:return d(o.default.fromBits(t.getUint32(n,!0),t.getUint32(n+4,!0),!1),e);case a.onnx.TensorProto.DataType.DOUBLE:return t.getFloat64(n,!0);case a.onnx.TensorProto.DataType.UINT64:return d(o.default.fromBits(t.getUint32(n,!0),t.getUint32(n+4,!0),!0),e);default:throw new Error(`cannot read from DataView for type ${a.onnx.TensorProto.DataType[e]}`)}}e.Tensor=l},2517:function(t,e,n){"use strict";var r=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(e,"__esModule",{value:!0}),e.decodeUtf8String=e.MAX_CLIP=e.MIN_CLIP=e.PoolConvUtil=e.ReduceUtil=e.SplitUtil=e.MathUtil=e.ShapeUtil=e.LongUtil=e.ProtoUtil=e.GemmUtil=e.arrayCopyHelper=e.BroadcastUtil=e.MatMulUtil=e.ArrayUtil=e.assert=e.checkInputsShape=void 0;const i=n(5686),o=r(n(3720)),a=n(1446),s=n(9162);e.checkInputsShape=function(t,...e){if(!t||t.length!==e.length)return!1;for(let n=0;n<t.length;n++)if(!t[n].dims||t[n].dims.length!==e[n])return!1;return!0},e.assert=function(t,e){if(!t)throw new Error("string"==typeof e?e:e())},e.ArrayUtil=class{static arraysEqual(t,e){if(t.length!==e.length)return!1;for(let n=0;n<t.length;n++)if(t[n]!==e[n])return!1;return!0}};class u{static preprocessInputShapes(t,e){return[1===t.length?[1,t[0]]:t,1===e.length?[e[0],1]:e]}static postprocessOutputShape(t,e,n){1===e&&t.splice(t.length-2,1),1===n&&t.pop()}static calcMatMulShape(t,e){return t[1]!==e[0]?void 0:[t[0],e[1]]}}e.MatMulUtil=u;class c{static calcShape(t,e,n=!1){const r=t.length,i=e.length;if(0===r)return e;if(0===i)return t;const o=Math.max(t.length,e.length),a=new Array(o);if(n){if(r<2||i<2)return;const n=u.calcMatMulShape([t[r-2],t[r-1]],[e[i-2],e[i-1]]);if(void 0===n)return;[a[o-2],a[o-1]]=n}for(let s=n?3:1;s<=o;s++){const n=r-s<0?1:t[r-s],u=i-s<0?1:e[i-s];if(n!==u&&n>1&&u>1)return;a[o-s]=Math.max(n,u)}return a}static index(t,e){const n=new Array(e.length);return c.fillIndex(t,e,n),n}static fillIndex(t,e,n){const r=t.length-e.length;for(let i=0;i<e.length;i++)n[i]=t[r+i]%e[i]}static calc(t,e,n,r,i){const o=c.calcShape(t.dims,e.dims);if(o){if(r&&!f.areEqual(o,t.dims))return;const a=f.size(o),u=r?t:new s.Tensor(o,i||t.type);if(0===o.length)u.set([],n(t.get([]),e.get([])));else{const r=new Array(o.length),i=new Array(t.dims.length),s=new Array(e.dims.length);let l,p=0,f=0,d=!1,h=!1;0===t.dims.length&&(p=t.get([]),d=!0),0===e.dims.length&&(f=e.get([]),h=!0);for(let g=0;g<a;g++){l=g;for(let t=o.length-1;t>=0;t--)r[t]=l%o[t],l=Math.floor(l/o[t]);d||(c.fillIndex(r,t.dims,i),p=t.get(i)),h||(c.fillIndex(r,e.dims,s),f=e.get(s)),u.set(r,n(p,f))}}return u}}static isValidBroadcast(t,e){const n=t.length,r=e.length;if(n>r)return!1;for(let i=1;i<=n;i++)if(1!==t[n-i]&&t[n-i]!==e[r-i])return!1;return!0}static getBroadcastDims(t,e){const n=t.length,r=[];for(let i=0;i<n;i++){const o=n-1-i,a=t[o]||1;(e[e.length-1-i]||1)>1&&1===a&&r.unshift(o)}return r}}e.BroadcastUtil=c,e.arrayCopyHelper=function(t,e,n,r,i){if(r<0||r>=e.length)throw new Error("sourceIndex out of bounds");if(n<0||n>=t.length)throw new Error("targetIndex out of bounds");if(r+i>e.length)throw new Error("source indices to be copied are outside bounds");if(n+i>t.length)throw new Error("target array is too small to hold result");for(let o=0;o<i;o++)t[n+o]=e[r+o]},e.GemmUtil=class{static getShapeOfGemmResult(t,e,n,r,i){if(2!==t.length||2!==n.length)throw new Error("shape need to be of size 2");let o,a,s;e?(o=t[1],a=t[0]):(o=t[0],a=t[1]);let u=-1;if(r?(s=n[0],u=1):(s=n[1],u=0),n[u]!==a)throw new Error("dimension mismatch");if(o<=0||s<=0||a<=0)throw new Error("invalid shape specified");if(i&&!c.isValidBroadcast(i,[o,s]))throw new Error("gemm: invalid bias shape for broadcast");return[o,s,a]}};class l{static tensorDataTypeFromProto(t){switch(t){case a.onnx.TensorProto.DataType.INT8:return"int8";case a.onnx.TensorProto.DataType.UINT8:return"uint8";case a.onnx.TensorProto.DataType.BOOL:return"bool";case a.onnx.TensorProto.DataType.INT16:return"int16";case a.onnx.TensorProto.DataType.UINT16:return"uint16";case a.onnx.TensorProto.DataType.INT32:return"int32";case a.onnx.TensorProto.DataType.UINT32:return"uint32";case a.onnx.TensorProto.DataType.FLOAT:return"float32";case a.onnx.TensorProto.DataType.DOUBLE:return"float64";case a.onnx.TensorProto.DataType.STRING:return"string";case a.onnx.TensorProto.DataType.INT64:return"int32";case a.onnx.TensorProto.DataType.UINT64:return"uint32";default:throw new Error(`unsupported data type: ${a.onnx.TensorProto.DataType[t]}`)}}static tensorDataTypeStringToEnum(t){switch(t){case"int8":return a.onnx.TensorProto.DataType.INT8;case"uint8":return a.onnx.TensorProto.DataType.UINT8;case"bool":return a.onnx.TensorProto.DataType.BOOL;case"int16":return a.onnx.TensorProto.DataType.INT16;case"uint16":return a.onnx.TensorProto.DataType.UINT16;case"int32":return a.onnx.TensorProto.DataType.INT32;case"uint32":return a.onnx.TensorProto.DataType.UINT32;case"float32":return a.onnx.TensorProto.DataType.FLOAT;case"float64":return a.onnx.TensorProto.DataType.DOUBLE;case"string":return a.onnx.TensorProto.DataType.STRING;case"int64":return a.onnx.TensorProto.DataType.INT64;case"uint64":return a.onnx.TensorProto.DataType.UINT64;default:throw new Error(`unsupported data type: ${t}`)}}static tensorDimsFromProto(t){return t.map((t=>o.default.isLong(t)?t.toNumber():t))}static tensorValueTypeFromProto(t){return{tensorType:l.tensorDataTypeFromProto(t.elemType),shape:{dims:l.tensorDimsFromProto(t.shape.dim.map((t=>t.dimValue)))}}}static tensorDimsFromORTFormat(t){const e=[];for(let n=0;n<t.dimsLength();n++)e.push(p.longToNumber(t.dims(n)));return e}static tensorAttributesFromORTFormat(t){const e=[];for(let n=0;n<t.attributesLength();n++)e.push(t.attributes(n));return e}}e.ProtoUtil=l;class p{static longToNumber(t,e){return o.default.isLong(t)?t.toNumber():t instanceof i.flatbuffers.Long?o.default.fromValue({low:t.low,high:t.high,unsigned:null!=e&&e}).toNumber():t}static isLong(t){return o.default.isLong(t)||t instanceof i.flatbuffers.Long}}e.LongUtil=p;class f{static size(t){return f.getSizeFromDimensionRange(t,0,t.length)}static sizeFromDimension(t,e){if(e<0||e>t.length)throw new Error(`invalid dimension of ${e} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return f.getSizeFromDimensionRange(t,e,t.length)}static sizeToDimension(t,e){if(e<0||e>t.length)throw new Error(`invalid dimension of ${e} for sizeToDimension as Tensor has ${t.length} dimensions.`);return f.getSizeFromDimensionRange(t,0,e)}static getSizeFromDimensionRange(t,e,n){let r=1;for(let i=e;i<n;i++){if(t[i]<=0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains 0 or negative values in them.");r*=t[i]}return r}static computeStrides(t){const e=t.length;if(0===e)return[];if(1===e)return[1];const n=new Array(e);n[e-1]=1,n[e-2]=t[e-1];for(let r=e-3;r>=0;--r)n[r]=n[r+1]*t[r+1];return n}static transpose(t){return t.slice().reverse()}static indicesToOffset(t,e,n){void 0===n&&(n=t.length);let r=0;for(let i=0;i<n;++i)r+=e[i]*t[i];return r}static offsetToIndices(t,e){const n=e.length;if(0===n)return[];if(1===n)return[t*e[0]];const r=new Array(e.length);for(let n=0;n<r.length-1;++n)r[n]=Math.floor(t/e[n]),t-=r[n]*e[n];return r[r.length-1]=t,r}static normalizeAxis(t,e){if(t<-e&&t>=e)throw new Error("unsupported axis for this operation.");return t<0?t+e:t}static normalizeAxes(t,e){return t.map((t=>this.normalizeAxis(t,e)))}static incrementIndex(t,e,n){if(0===e.length||0===t.length)throw new Error("Index incrementing unsupported for scalar Tensor");if(void 0===n)n=e.length;else if(n<=0||n>e.length)throw new Error("Incorrect axis to increment on");for(let r=n-1;r>=0&&(t[r]++,!(t[r]<e[r]));--r)t[r]=0}static calculateReshapedDims(t,e){if(0===e.length){if(0===t.length||1===f.size(t))return[];throw new Error("cannot reshape to a scalar Tensor")}const n=e.length,r=new Array(n);let i=-1,o=1;for(let a=0;a<n;a++){if(e[a]<-1)throw new Error("a dimension in shape hints cannot be less than -1");if(-1===e[a]){if(-1!==i)throw new Error("at most one dimension in shape hints can be -1");i=a}else{if(0===e[a]){if(a>=t.length)throw new Error("the dimension with value zero exceeds the dimension size of the input tensor");r[a]=t[a]}else r[a]=e[a];o*=r[a]}}const a=f.size(t);if(-1!==i){if(a%o!=0)throw new Error(`the input tensor cannot be reshaped to the requested shape. Input shape: [${t}] Output shape: [${e}]`);r[i]=a/o}else if(o!==a)throw new Error("reshapedDims and originalDims don't have matching sizes");return r}static sortBasedOnPerm(t,e){return e?e.map((e=>t[e])):t.slice().reverse()}static padShape(t,e){const n=t.length;return t.map(((t,r)=>t+e[r]+e[r+n]))}static areEqual(t,e){return t.length===e.length&&t.every(((t,n)=>t===e[n]))}static validateDimsAndCalcSize(t){if(t.length>6)throw new TypeError("Only rank 0 to 6 is supported for tensor shape.");let e=1;for(const n of t){if(!Number.isInteger(n))throw new TypeError(`Invalid shape: ${n} is not an integer`);if(n<0||n>2147483647)throw new TypeError(`Invalid shape: length ${n} is not allowed`);e*=n}return e}static flattenShape(t,e){e<0&&(e+=t.length);const n=t.reduce(((t,e)=>t*e),1),r=t.slice(e).reduce(((t,e)=>t*e),1);return[n/r,r]}static squeezeShape(t,e){const n=new Array;e=f.normalizeAxes(e,t.length);for(let r=0;r<t.length;r++){const i=e.indexOf(r)>=0;if(i&&1!==t[r])throw new Error("squeeze an axis of size different than 1");(0===e.length&&t[r]>1||e.length>0&&!i)&&n.push(t[r])}return n}static unsqueezeShape(t,e){const n=new Array(t.length+e.length);n.fill(0);for(let t=0;t<e.length;t++){const r=f.normalizeAxis(e[t],n.length);if(r>=n.length)throw new Error("'axes' has an out of range axis");if(0!==n[r])throw new Error("'axes' has a duplicate axis");n[r]=1}let r=0;for(let e=0;e<n.length;e++)0===n[e]&&(n[e]=t[r++]);if(r!==t.length)throw new Error("the unsqueezed dimension could not be established");return n}}e.ShapeUtil=f,e.MathUtil=class{static sqr(t,e,n,r,i){if(r<0||r>=e.length)throw new Error("sourceIndex out of bounds");if(n<0||n>=t.length)throw new Error("targetIndex out of bounds");if(r+i>e.length)throw new Error("source indices to be copied are outside bounds");if(n+i>t.length)throw new Error("target array is too small to hold result");for(let o=0;o<i;o++)t[n+o]+=Math.pow(e[r+o],2)}static axpy(t,e,n,r,i,o){if(r<0||r>=e.length)throw new Error("sourceIndex out of bounds");if(n<0||n>=t.length)throw new Error("targetIndex out of bounds");if(r+i>e.length)throw new Error("source indices to be copied are outside bounds");if(n+i>t.length)throw new Error("target array is too small to hold result");for(let a=0;a<i;a++)t[n+a]+=o*e[r+a]}static powx(t,e,n,r,i,o){if(r<0||r>=e.length)throw new Error("sourceIndex out of bounds");if(n<0||n>=t.length)throw new Error("targetIndex out of bounds");if(r+i>e.length)throw new Error("source indices to be copied are outside bounds");if(n+i>t.length)throw new Error("target array is too small to hold result");for(let a=0;a<i;a++)t[n+a]=Math.pow(e[r+a],o)}static mul(t,e,n,r,i){if(r<0||r>=e.length)throw new Error("sourceIndex out of bounds");if(n<0||n>=t.length)throw new Error("targetIndex out of bounds");if(r+i>e.length)throw new Error("source indices to be copied are outside bounds");if(n+i>t.length)throw new Error("target array is too small to hold result");for(let o=0;o<i;o++)t[n+o]=e[r+o]*t[n+o]}};class d{static splitShape(t,e,n,r){if(0===n.length){if(!r)throw new Error("need to know number of outputs when the 'split' attribute is not specified");d.determineSplit(t[e],r,n)}const i=[],o=[0];for(let r=0;r<n.length;++r){0!==r&&o.push(o[r-1]+n[r-1]);const a=t.slice();a[e]=n[r],i.push(a)}return[i,o]}static determineSplit(t,e,n){if(t%e!=0)throw new Error("cannot split tensor to equal sized parts");for(let r=0;r<e;++r)n.push(t/e)}}e.SplitUtil=d;class h{static calcReduce(t,e,n,r,i){const o=t.dims.slice(0);0===e.length&&o.forEach(((t,n)=>e.push(n)));const a=h.calcReduceShape(o,e,!0),u=f.size(a),l=new s.Tensor(a,t.type),p=f.computeStrides(a),d=f.computeStrides(o),g=new Array(o.length);for(let n=0;n<u;n++){const a=f.offsetToIndices(n,p);c.fillIndex(a,o,g),l.set(a,h.calcReduceByAxis(t.numberData,e,o,0,f.indicesToOffset(g,d),r,i))}return n?l:new s.Tensor(h.calcReduceShape(o,e,n),l.type,void 0,void 0,l.data,l.dataId)}static calcReduceByAxis(t,e,n,r,i,o,a){let s=0;if(r>=e.length)return o(t[i]);const u=e[r],c=u>=n.length?1:f.size(n.slice(u+1));for(let l=0;l<n[u];l++)s=0===l?h.calcReduceByAxis(t,e,n,r+1,i,o,a):a(s,h.calcReduceByAxis(t,e,n,r+1,i,o,a)),i+=c;return s}static calcReduceShape(t,e,n){const r=t.slice();for(let t=0;t<e.length;t++)r[e[t]]=n?1:0;return r.filter((t=>0!==t))}}e.ReduceUtil=h;class g{static adjustPoolAttributes(t,e,n,r,i,o){if(!t&&n.length!==e.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(t)for(let t=0;t<e.length-2;t++)t>=n.length?n.push(e[t+2]):n[t]=e[t+2];for(let t=0;t<n.length;t++)if(t<r.length){if(r[t]<0)throw new Error("strides should be greater than or equal to 1")}else r.push(1);for(let t=0;t<n.length;t++)if(t<i.length){if(i[t]<0)throw new Error("dilations should be greater than or equal to 1")}else i.push(1);for(let t=0;t<2*n.length;t++)if(t<o.length){if(o[t]<0)throw new Error("pad should be greater than or equal to 1")}else o.push(0);for(let t=0;t<n.length;t++){if(n[t]<=0)throw new Error("kernel shapes need to be greater than 0");if(o[t]>=n[t]||o[t+n.length]>=n[t])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(t,e,n,r,i,o){if(o){if(i.length!==2*(t.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(e.length!==t.length-2)throw new Error("length of strides should be the length of data dimensions");if(r.length!==t.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let a=0;a<t.length-2;a++)g.adjustPadAndReturnShape(t[a+2],e[a],n[a],r[a],i,a,a+t.length-2,o)}}static computePoolOutputShape(t,e,n,r,i,o,a){if(e.length<=0)throw new Error("input shape must be of size greater than 0");const s=[e[0],e[1]];return g.computeShapeHelper(t,e,s,n,r,i,o,a),s}static computeConvOutputShape(t,e,n,r,i,o,a){if(t.length<=0||e.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");const s=[t[0],e[0]];return g.computeShapeHelper(!1,t,s,n,r,i,o,a),s}static computeShapeHelper(t,e,n,r,i,o,a,s){if(t)for(let t=0;t<e.length-2;t++)n.push(1);else for(let t=0;t<e.length-2;t++)n.push(g.adjustPadAndReturnShape(e[t+2],r[t],i[t],o[t],a,t,t+e.length-2,s))}static adjustPadAndReturnShape(t,e,n,r,i,o,a,s){const u=n*(r-1)+1;if(!s||"NOTSET"===s)return Math.floor((t+i[o]+i[a]-u)/e+1);switch(s){case"VALID":return i[o]=0,i[a]=0,Math.floor((t-u)/e+1);case"SAME_LOWER":case"SAME_UPPER":if(1!==n)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{const n=((t+e-1)/e-1)*e+r-t;return i[o]="SAME_LOWER"===s?Math.floor((n+1)/2):Math.floor(n/2),i[a]=n-i[o],Math.floor((t+n-r)/e+1)}default:throw new Error("Unsupported AutoPad type")}}}e.PoolConvUtil=g,e.MIN_CLIP=-34028234663852886e22,e.MAX_CLIP=34028234663852886e22,e.decodeUtf8String=function(t){return(new TextDecoder).decode(t)}},7967:(t,e)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.iterateExtraOptions=void 0,e.iterateExtraOptions=(t,n,r,i)=>{if("object"==typeof t&&null!==t){if(r.has(t))throw new Error("Circular reference in options");r.add(t)}Object.entries(t).forEach((([t,o])=>{const a=n?n+t:t;if("object"==typeof o)(0,e.iterateExtraOptions)(o,a+".",r,i);else if("string"==typeof o||"number"==typeof o)i(a,o.toString());else{if("boolean"!=typeof o)throw new Error("Can't handle extra config type: "+typeof o);i(a,o?"1":"0")}}))}},2157:function(t,e,n){"use strict";var r,i=this&&this.__createBinding||(Object.create?function(t,e,n,r){void 0===r&&(r=n);var i=Object.getOwnPropertyDescriptor(e,n);i&&!("get"in i?!e.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(t,r,i)}:function(t,e,n,r){void 0===r&&(r=n),t[r]=e[n]}),o=this&&this.__setModuleDefault||(Object.create?function(t,e){Object.defineProperty(t,"default",{enumerable:!0,value:e})}:function(t,e){t.default=e}),a=this&&this.__importStar||function(t){if(t&&t.__esModule)return t;var e={};if(null!=t)for(var n in t)"default"!==n&&Object.prototype.hasOwnProperty.call(t,n)&&i(e,t,n);return o(e,t),e};Object.defineProperty(e,"__esModule",{value:!0}),e.endProfiling=e.run=e.releaseSession=e.createSession=e.createSessionFinalize=e.createSessionAllocate=e.initOrt=e.initWasm=void 0;const s=n(1670),u=a(n(349)),c=n(6361),l=()=>!!s.env.wasm.proxy&&"undefined"!=typeof document;let p,f,d,h=!1,g=!1,b=!1;const m=[],y=[],_=[],v=[],w=[],x=[],T=()=>{if(h||!g||b||!p)throw new Error("worker not ready")},S=t=>{switch(t.data.type){case"init-wasm":h=!1,t.data.err?(b=!0,f[1](t.data.err)):(g=!0,f[0]());break;case"init-ort":t.data.err?d[1](t.data.err):d[0]();break;case"create_allocate":t.data.err?m.shift()[1](t.data.err):m.shift()[0](t.data.out);break;case"create_finalize":t.data.err?y.shift()[1](t.data.err):y.shift()[0](t.data.out);break;case"create":t.data.err?_.shift()[1](t.data.err):_.shift()[0](t.data.out);break;case"release":t.data.err?v.shift()[1](t.data.err):v.shift()[0]();break;case"run":t.data.err?w.shift()[1](t.data.err):w.shift()[0](t.data.out);break;case"end-profiling":t.data.err?x.shift()[1](t.data.err):x.shift()[0]()}},O="undefined"!=typeof document?null===(r=null===document||void 0===document?void 0:document.currentScript)||void 0===r?void 0:r.src:void 0;e.initWasm=async()=>{if(l()){if(g)return;if(h)throw new Error("multiple calls to 'initWasm()' detected.");if(b)throw new Error("previous call to 'initWasm()' failed.");return h=!0,void 0===s.env.wasm.wasmPaths&&O&&0!==O.indexOf("blob:")&&(s.env.wasm.wasmPaths=O.substr(0,+O.lastIndexOf("/")+1)),new Promise(((t,e)=>{null==p||p.terminate(),p=n(9710).Z(),p.onmessage=S,f=[t,e];const r={type:"init-wasm",in:s.env.wasm};p.postMessage(r)}))}return(0,c.initializeWebAssembly)(s.env.wasm)},e.initOrt=async(t,e)=>{if(l())return T(),new Promise(((n,r)=>{d=[n,r];const i={type:"init-ort",in:{numThreads:t,loggingLevel:e}};p.postMessage(i)}));u.initOrt(t,e)},e.createSessionAllocate=async t=>l()?(T(),new Promise(((e,n)=>{m.push([e,n]);const r={type:"create_allocate",in:{model:t}};p.postMessage(r,[t.buffer])}))):u.createSessionAllocate(t),e.createSessionFinalize=async(t,e)=>l()?(T(),new Promise(((n,r)=>{y.push([n,r]);const i={type:"create_finalize",in:{modeldata:t,options:e}};p.postMessage(i)}))):u.createSessionFinalize(t,e),e.createSession=async(t,e)=>l()?(T(),new Promise(((n,r)=>{_.push([n,r]);const i={type:"create",in:{model:t,options:e}};p.postMessage(i,[t.buffer])}))):u.createSession(t,e),e.releaseSession=async t=>{if(l())return T(),new Promise(((e,n)=>{v.push([e,n]);const r={type:"release",in:t};p.postMessage(r)}));u.releaseSession(t)},e.run=async(t,e,n,r,i)=>l()?(T(),new Promise(((o,a)=>{w.push([o,a]);const s={type:"run",in:{sessionId:t,inputIndices:e,inputs:n,outputIndices:r,options:i}};p.postMessage(s,u.extractTransferableBuffers(n))}))):u.run(t,e,n,r,i),e.endProfiling=async t=>{if(l())return T(),new Promise(((e,n)=>{x.push([e,n]);const r={type:"end-profiling",in:t};p.postMessage(r)}));u.endProfiling(t)}},586:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.setRunOptions=void 0;const r=n(7967),i=n(4983),o=n(6361);e.setRunOptions=t=>{const e=(0,o.getInstance)();let n=0;const a=[],s=t||{};try{if(void 0===(null==t?void 0:t.logSeverityLevel))s.logSeverityLevel=2;else if("number"!=typeof t.logSeverityLevel||!Number.isInteger(t.logSeverityLevel)||t.logSeverityLevel<0||t.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${t.logSeverityLevel}`);if(void 0===(null==t?void 0:t.logVerbosityLevel))s.logVerbosityLevel=0;else if("number"!=typeof t.logVerbosityLevel||!Number.isInteger(t.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${t.logVerbosityLevel}`);void 0===(null==t?void 0:t.terminate)&&(s.terminate=!1);let o=0;if(void 0!==(null==t?void 0:t.tag)&&(o=(0,i.allocWasmString)(t.tag,a)),n=e._OrtCreateRunOptions(s.logSeverityLevel,s.logVerbosityLevel,!!s.terminate,o),0===n)throw new Error("Can't create run options");return void 0!==(null==t?void 0:t.extra)&&(0,r.iterateExtraOptions)(t.extra,"",new WeakSet,((t,r)=>{const o=(0,i.allocWasmString)(t,a),s=(0,i.allocWasmString)(r,a);if(0!==e._OrtAddRunConfigEntry(n,o,s))throw new Error(`Can't set a run config entry: ${t} - ${r}`)})),[n,a]}catch(t){throw 0!==n&&e._OrtReleaseRunOptions(n),a.forEach(e._free),t}}},2306:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.OnnxruntimeWebAssemblySessionHandler=void 0;const r=n(2806),i=n(1670),o=n(2850),a=n(2157);let s;e.OnnxruntimeWebAssemblySessionHandler=class{async createSessionAllocate(t){const e=await fetch(t),n=await e.arrayBuffer();return(0,a.createSessionAllocate)(new Uint8Array(n))}async loadModel(t,e){if(s||(await(0,a.initOrt)(i.env.wasm.numThreads,(t=>{switch(t){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${t}`)}})(i.env.logLevel)),s=!0),"string"==typeof t)if("undefined"==typeof fetch){const n=await(0,o.promisify)(r.readFile)(t);[this.sessionId,this.inputNames,this.outputNames]=await(0,a.createSession)(n,e)}else{const n=await this.createSessionAllocate(t);[this.sessionId,this.inputNames,this.outputNames]=await(0,a.createSessionFinalize)(n,e)}else[this.sessionId,this.inputNames,this.outputNames]=await(0,a.createSession)(t,e)}async dispose(){return(0,a.releaseSession)(this.sessionId)}async run(t,e,n){const r=[],o=[];Object.entries(t).forEach((t=>{const e=t[0],n=t[1],i=this.inputNames.indexOf(e);if(-1===i)throw new Error(`invalid input '${e}'`);r.push(n),o.push(i)}));const s=[];Object.entries(e).forEach((t=>{const e=t[0],n=this.outputNames.indexOf(e);if(-1===n)throw new Error(`invalid output '${e}'`);s.push(n)}));const u=await(0,a.run)(this.sessionId,o,r.map((t=>[t.type,t.dims,t.data])),s,n),c={};for(let t=0;t<u.length;t++)c[this.outputNames[s[t]]]=new i.Tensor(u[t][0],u[t][2],u[t][1]);return c}startProfiling(){}endProfiling(){(0,a.endProfiling)(this.sessionId)}}},4919:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.setSessionOptions=void 0;const r=n(7967),i=n(4983),o=n(6361);e.setSessionOptions=t=>{const e=(0,o.getInstance)();let n=0;const a=[],s=t||{};(t=>{t.extra||(t.extra={}),t.extra.session||(t.extra.session={});const e=t.extra.session;e.use_ort_model_bytes_directly||(e.use_ort_model_bytes_directly="1")})(s);try{void 0===(null==t?void 0:t.graphOptimizationLevel)&&(s.graphOptimizationLevel="all");const u=(t=>{switch(t){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${t}`)}})(s.graphOptimizationLevel);void 0===(null==t?void 0:t.enableCpuMemArena)&&(s.enableCpuMemArena=!0),void 0===(null==t?void 0:t.enableMemPattern)&&(s.enableMemPattern=!0),void 0===(null==t?void 0:t.executionMode)&&(s.executionMode="sequential");const c=(t=>{switch(t){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${t}`)}})(s.executionMode);let l=0;if(void 0!==(null==t?void 0:t.logId)&&(l=(0,i.allocWasmString)(t.logId,a)),void 0===(null==t?void 0:t.logSeverityLevel))s.logSeverityLevel=2;else if("number"!=typeof t.logSeverityLevel||!Number.isInteger(t.logSeverityLevel)||t.logSeverityLevel<0||t.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${t.logSeverityLevel}`);if(void 0===(null==t?void 0:t.logVerbosityLevel))s.logVerbosityLevel=0;else if("number"!=typeof t.logVerbosityLevel||!Number.isInteger(t.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${t.logVerbosityLevel}`);if(void 0===(null==t?void 0:t.enableProfiling)&&(s.enableProfiling=!1),n=e._OrtCreateSessionOptions(u,!!s.enableCpuMemArena,!!s.enableMemPattern,c,!!s.enableProfiling,0,l,s.logSeverityLevel,s.logVerbosityLevel),0===n)throw new Error("Can't create session options");return(null==t?void 0:t.executionProviders)&&((t,e,n)=>{for(const r of e){let e="string"==typeof r?r:r.name;switch(e){case"xnnpack":e="XNNPACK";break;case"wasm":case"cpu":continue;default:throw new Error(`not supported EP: ${e}`)}const a=(0,i.allocWasmString)(e,n);if(0!==(0,o.getInstance)()._OrtAppendExecutionProvider(t,a))throw new Error(`Can't append execution provider: ${e}`)}})(n,t.executionProviders,a),void 0!==(null==t?void 0:t.extra)&&(0,r.iterateExtraOptions)(t.extra,"",new WeakSet,((t,r)=>{const o=(0,i.allocWasmString)(t,a),s=(0,i.allocWasmString)(r,a);if(0!==e._OrtAddSessionConfigEntry(n,o,s))throw new Error(`Can't set a session config entry: ${t} - ${r}`)})),[n,a]}catch(t){throw 0!==n&&e._OrtReleaseSessionOptions(n),a.forEach(e._free),t}}},4983:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.allocWasmString=void 0;const r=n(6361);e.allocWasmString=(t,e)=>{const n=(0,r.getInstance)(),i=n.lengthBytesUTF8(t)+1,o=n._malloc(i);return n.stringToUTF8(t,o,i),e.push(o),o}},349:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.extractTransferableBuffers=e.endProfiling=e.run=e.releaseSession=e.createSession=e.createSessionFinalize=e.createSessionAllocate=e.initOrt=void 0;const r=n(586),i=n(4919),o=n(4983),a=n(6361);e.initOrt=(t,e)=>{const n=(0,a.getInstance)()._OrtInit(t,e);if(0!==n)throw new Error(`Can't initialize onnxruntime. error code = ${n}`)};const s=new Map;e.createSessionAllocate=t=>{const e=(0,a.getInstance)(),n=e._malloc(t.byteLength);return e.HEAPU8.set(t,n),[n,t.byteLength]},e.createSessionFinalize=(t,e)=>{const n=(0,a.getInstance)();let r=0,o=0,u=[];try{if([o,u]=(0,i.setSessionOptions)(e),r=n._OrtCreateSession(t[0],t[1],o),0===r)throw new Error("Can't create a session")}finally{n._free(t[0]),n._OrtReleaseSessionOptions(o),u.forEach(n._free)}const c=n._OrtGetInputCount(r),l=n._OrtGetOutputCount(r),p=[],f=[],d=[],h=[];for(let t=0;t<c;t++){const e=n._OrtGetInputName(r,t);if(0===e)throw new Error("Can't get an input name");f.push(e),p.push(n.UTF8ToString(e))}for(let t=0;t<l;t++){const e=n._OrtGetOutputName(r,t);if(0===e)throw new Error("Can't get an output name");h.push(e),d.push(n.UTF8ToString(e))}return s.set(r,[r,f,h]),[r,p,d]},e.createSession=(t,n)=>{const r=(0,e.createSessionAllocate)(t);return(0,e.createSessionFinalize)(r,n)},e.releaseSession=t=>{const e=(0,a.getInstance)(),n=s.get(t);if(!n)throw new Error("invalid session id");const r=n[0],i=n[1],o=n[2];i.forEach(e._OrtFree),o.forEach(e._OrtFree),e._OrtReleaseSession(r),s.delete(t)};const u=t=>{switch(t){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;default:throw new Error(`unsupported data type: ${t}`)}},c=t=>{switch(t){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";default:throw new Error(`unsupported data type: ${t}`)}},l=t=>{switch(t){case"float32":return Float32Array;case"uint8":case"bool":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${t}`)}};e.run=(t,e,n,i,p)=>{const f=(0,a.getInstance)(),d=s.get(t);if(!d)throw new Error("invalid session id");const h=d[0],g=d[1],b=d[2],m=e.length,y=i.length;let _=0,v=[];const w=[],x=[];try{[_,v]=(0,r.setRunOptions)(p);for(let t=0;t<m;t++){const e=n[t][0],r=n[t][1],i=n[t][2];let a,s;if(Array.isArray(i)){s=4*i.length,a=f._malloc(s),x.push(a);let t=a/4;for(let e=0;e<i.length;e++){if("string"!=typeof i[e])throw new TypeError(`tensor data at index ${e} is not a string`);f.HEAPU32[t++]=(0,o.allocWasmString)(i[e],x)}}else s=i.byteLength,a=f._malloc(s),x.push(a),f.HEAPU8.set(new Uint8Array(i.buffer,i.byteOffset,s),a);const c=f.stackSave(),l=f.stackAlloc(4*r.length);try{let t=l/4;r.forEach((e=>f.HEAP32[t++]=e));const n=f._OrtCreateTensor(u(e),a,s,l,r.length);if(0===n)throw new Error("Can't create a tensor");w.push(n)}finally{f.stackRestore(c)}}const t=f.stackSave(),a=f.stackAlloc(4*m),s=f.stackAlloc(4*m),d=f.stackAlloc(4*y),T=f.stackAlloc(4*y);try{let n=a/4,r=s/4,o=d/4,u=T/4;for(let t=0;t<m;t++)f.HEAPU32[n++]=w[t],f.HEAPU32[r++]=g[e[t]];for(let t=0;t<y;t++)f.HEAPU32[o++]=0,f.HEAPU32[u++]=b[i[t]];let p=f._OrtRun(h,s,a,m,T,y,d,_);const v=[];if(0===p)for(let t=0;t<y;t++){const e=f.HEAPU32[d/4+t],n=f.stackSave(),r=f.stackAlloc(16);let i,o=0;try{if(p=f._OrtGetTensorData(e,r,r+4,r+8,r+12),0!==p)throw new Error(`Can't access output tensor data. error code = ${p}`);let t=r/4;const a=f.HEAPU32[t++];o=f.HEAPU32[t++];const s=f.HEAPU32[t++],u=f.HEAPU32[t++],d=[];for(let t=0;t<u;t++)d.push(f.HEAPU32[s/4+t]);f._OrtFree(s);const h=0===d.length?1:d.reduce(((t,e)=>t*e));if(i=c(a),"string"===i){const t=[];let e=o/4;for(let n=0;n<h;n++){const r=f.HEAPU32[e++],i=n===h-1?void 0:f.HEAPU32[e]-r;t.push(f.UTF8ToString(r,i))}v.push([i,d,t])}else{const t=new(l(i))(h);new Uint8Array(t.buffer,t.byteOffset,t.byteLength).set(f.HEAPU8.subarray(o,o+t.byteLength)),v.push([i,d,t])}}finally{f.stackRestore(n),"string"===i&&o&&f._free(o),f._OrtReleaseTensor(e)}}if(0===p)return v;throw new Error(`failed to call OrtRun(). error code = ${p}.`)}finally{f.stackRestore(t)}}finally{w.forEach(f._OrtReleaseTensor),x.forEach(f._free),f._OrtReleaseRunOptions(_),v.forEach(f._free)}},e.endProfiling=t=>{const e=(0,a.getInstance)(),n=s.get(t);if(!n)throw new Error("invalid session id");const r=n[0],i=e._OrtEndProfiling(r);if(0===i)throw new Error("Can't get an profile file name");e._OrtFree(i)},e.extractTransferableBuffers=t=>{const e=[];for(const n of t){const t=n[2];!Array.isArray(t)&&t.buffer&&e.push(t.buffer)}return e}},6361:function(t,e,n){"use strict";var r=this&&this.__createBinding||(Object.create?function(t,e,n,r){void 0===r&&(r=n);var i=Object.getOwnPropertyDescriptor(e,n);i&&!("get"in i?!e.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(t,r,i)}:function(t,e,n,r){void 0===r&&(r=n),t[r]=e[n]}),i=this&&this.__setModuleDefault||(Object.create?function(t,e){Object.defineProperty(t,"default",{enumerable:!0,value:e})}:function(t,e){t.default=e}),o=this&&this.__importStar||function(t){if(t&&t.__esModule)return t;var e={};if(null!=t)for(var n in t)"default"!==n&&Object.prototype.hasOwnProperty.call(t,n)&&r(e,t,n);return i(e,t),e},a=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(e,"__esModule",{value:!0}),e.dispose=e.getInstance=e.initializeWebAssembly=void 0;const s=o(n(6449)),u=a(n(932)),c=n(3474);let l,p=!1,f=!1,d=!1;const h=(t,e)=>e?t?"ort-wasm-simd-threaded.wasm":"ort-wasm-threaded.wasm":t?"ort-wasm-simd.wasm":"ort-wasm.wasm";e.initializeWebAssembly=async t=>{if(p)return Promise.resolve();if(f)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(d)throw new Error("previous call to 'initializeWebAssembly()' failed.");f=!0;const e=t.initTimeout,r=t.numThreads,i=t.simd,o=r>1&&(()=>{try{return"undefined"!=typeof SharedArrayBuffer&&("undefined"!=typeof MessageChannel&&(new MessageChannel).port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11])))}catch(t){return!1}})(),a=i&&(()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch(t){return!1}})(),g="string"==typeof t.wasmPaths?t.wasmPaths:void 0,b=h(!1,o),m=h(a,o),y="object"==typeof t.wasmPaths?t.wasmPaths[m]:void 0;let _=!1;const v=[];if(e>0&&v.push(new Promise((t=>{setTimeout((()=>{_=!0,t()}),e)}))),v.push(new Promise(((t,e)=>{const r=o?c:u.default,i={locateFile:(t,e)=>o&&t.endsWith(".worker.js")&&"undefined"!=typeof Blob?URL.createObjectURL(new Blob([n(4154)],{type:"text/javascript"})):t===b?null!=y?y:(null!=g?g:e)+m:e+t};if(o)if("undefined"==typeof Blob)i.mainScriptUrlOrBlob=s.join("/","ort-wasm-threaded.js");else{const t=`var ortWasmThreaded=(function(){var _scriptDir;return ${r.toString()}})();`;i.mainScriptUrlOrBlob=new Blob([t],{type:"text/javascript"})}r(i).then((e=>{f=!1,p=!0,l=e,t()}),(t=>{f=!1,d=!0,e(t)}))}))),await Promise.race(v),_)throw new Error(`WebAssembly backend initializing failed due to timeout: ${e}ms`)},e.getInstance=()=>{if(p&&l)return l;throw new Error("WebAssembly is not initialized yet.")},e.dispose=()=>{var t;!p||f||d||(f=!0,null===(t=l.PThread)||void 0===t||t.terminateAllThreads(),l=void 0,f=!1,p=!1,d=!0)}},9710:(t,e,n)=>{"use strict";n.d(e,{Z:()=>o});var r=n(477),i=n.n(r);function o(){return i()('/*!\n* ONNX Runtime Web v1.14.0\n* Copyright (c) Microsoft Corporation. All rights reserved.\n* Licensed under the MIT License.\n*/\n(()=>{var t={474:(t,e,n)=>{var _scriptDir,r=(_scriptDir=(_scriptDir="undefined"!=typeof document&&document.currentScript?document.currentScript.src:void 0)||"/index.js",function(t){function e(){return j.buffer!=D&&N(j.buffer),P}function r(){return j.buffer!=D&&N(j.buffer),U}function a(){return j.buffer!=D&&N(j.buffer),F}function i(){return j.buffer!=D&&N(j.buffer),I}function o(){return j.buffer!=D&&N(j.buffer),W}var u,c,s;t=t||{},u||(u=void 0!==t?t:{}),u.ready=new Promise((function(t,e){c=t,s=e}));var l,f,p,h,d,y,b=Object.assign({},u),m="./this.program",g=(t,e)=>{throw e},v="object"==typeof window,w="function"==typeof importScripts,_="object"==typeof process&&"object"==typeof process.versions&&"string"==typeof process.versions.node,O=u.ENVIRONMENT_IS_PTHREAD||!1,A="";function S(t){return u.locateFile?u.locateFile(t,A):A+t}if(_){let e;A=w?n(908).dirname(A)+"/":"//",y=()=>{d||(h=n(384),d=n(908))},l=function(t,e){return y(),t=d.normalize(t),h.readFileSync(t,e?void 0:"utf8")},p=t=>((t=l(t,!0)).buffer||(t=new Uint8Array(t)),t),f=(t,e,n)=>{y(),t=d.normalize(t),h.readFile(t,(function(t,r){t?n(t):e(r.buffer)}))},1<process.argv.length&&(m=process.argv[1].replace(/\\\\/g,"/")),process.argv.slice(2),process.on("uncaughtException",(function(t){if(!(t instanceof ct))throw t})),process.on("unhandledRejection",(function(t){throw t})),g=(t,e)=>{if(Q())throw process.exitCode=t,e;e instanceof ct||x("exiting due to exception: "+e),process.exit(t)},u.inspect=function(){return"[Emscripten Module object]"};try{e=n(925)}catch(t){throw console.error(\'The "worker_threads" module is not supported in this node.js build - perhaps a newer version is needed?\'),t}n.g.Worker=e.Worker}else(v||w)&&(w?A=self.location.href:"undefined"!=typeof document&&document.currentScript&&(A=document.currentScript.src),_scriptDir&&(A=_scriptDir),A=0!==A.indexOf("blob:")?A.substr(0,A.replace(/[?#].*/,"").lastIndexOf("/")+1):"",_||(l=t=>{var e=new XMLHttpRequest;return e.open("GET",t,!1),e.send(null),e.responseText},w&&(p=t=>{var e=new XMLHttpRequest;return e.open("GET",t,!1),e.responseType="arraybuffer",e.send(null),new Uint8Array(e.response)}),f=(t,e,n)=>{var r=new XMLHttpRequest;r.open("GET",t,!0),r.responseType="arraybuffer",r.onload=()=>{200==r.status||0==r.status&&r.response?e(r.response):n()},r.onerror=n,r.send(null)}));_&&"undefined"==typeof performance&&(n.g.performance=n(953).performance);var T=console.log.bind(console),E=console.warn.bind(console);_&&(y(),T=t=>h.writeSync(1,t+"\\n"),E=t=>h.writeSync(2,t+"\\n"));var M,C=u.print||T,x=u.printErr||E;Object.assign(u,b),b=null,u.thisProgram&&(m=u.thisProgram),u.quit&&(g=u.quit),u.wasmBinary&&(M=u.wasmBinary);var R=u.noExitRuntime||!1;"object"!=typeof WebAssembly&&at("no native wasm support detected");var j,k,D,P,U,F,I,W,H=!1,L="undefined"!=typeof TextDecoder?new TextDecoder("utf8"):void 0;function z(t,e,n){var r=(e>>>=0)+n;for(n=e;t[n]&&!(n>=r);)++n;if(16<n-e&&t.buffer&&L)return L.decode(t.buffer instanceof SharedArrayBuffer?t.slice(e,n):t.subarray(e,n));for(r="";e<n;){var a=t[e++];if(128&a){var i=63&t[e++];if(192==(224&a))r+=String.fromCharCode((31&a)<<6|i);else{var o=63&t[e++];65536>(a=224==(240&a)?(15&a)<<12|i<<6|o:(7&a)<<18|i<<12|o<<6|63&t[e++])?r+=String.fromCharCode(a):(a-=65536,r+=String.fromCharCode(55296|a>>10,56320|1023&a))}}else r+=String.fromCharCode(a)}return r}function Y(t,e){return(t>>>=0)?z(r(),t,e):""}function B(t,e,n,r){if(!(0<r))return 0;var a=n>>>=0;r=n+r-1;for(var i=0;i<t.length;++i){var o=t.charCodeAt(i);if(55296<=o&&57343>=o&&(o=65536+((1023&o)<<10)|1023&t.charCodeAt(++i)),127>=o){if(n>=r)break;e[n++>>>0]=o}else{if(2047>=o){if(n+1>=r)break;e[n++>>>0]=192|o>>6}else{if(65535>=o){if(n+2>=r)break;e[n++>>>0]=224|o>>12}else{if(n+3>=r)break;e[n++>>>0]=240|o>>18,e[n++>>>0]=128|o>>12&63}e[n++>>>0]=128|o>>6&63}e[n++>>>0]=128|63&o}}return e[n>>>0]=0,n-a}function G(t){for(var e=0,n=0;n<t.length;++n){var r=t.charCodeAt(n);127>=r?e++:2047>=r?e+=2:55296<=r&&57343>=r?(e+=4,++n):e+=3}return e}function N(t){D=t,u.HEAP8=P=new Int8Array(t),u.HEAP16=new Int16Array(t),u.HEAP32=F=new Int32Array(t),u.HEAPU8=U=new Uint8Array(t),u.HEAPU16=new Uint16Array(t),u.HEAPU32=I=new Uint32Array(t),u.HEAPF32=new Float32Array(t),u.HEAPF64=W=new Float64Array(t)}O&&(D=u.buffer);var V=u.INITIAL_MEMORY||16777216;if(O)j=u.wasmMemory,D=u.buffer;else if(u.wasmMemory)j=u.wasmMemory;else if(!((j=new WebAssembly.Memory({initial:V/65536,maximum:65536,shared:!0})).buffer instanceof SharedArrayBuffer))throw x("requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer, indicating that while the browser has SharedArrayBuffer it does not have WebAssembly threads support - you may need to set a flag"),_&&console.log("(on node you may need: --experimental-wasm-threads --experimental-wasm-bulk-memory and also use a recent version)"),Error("bad memory");j&&(D=j.buffer),V=D.byteLength,N(D);var $,q=[],X=[],J=[],Z=[];function Q(){return R||!1}function K(){var t=u.preRun.shift();q.unshift(t)}var tt,et=0,nt=null,rt=null;function at(t){throw O?postMessage({cmd:"onAbort",arg:t}):u.onAbort&&u.onAbort(t),x(t="Aborted("+t+")"),H=!0,t=new WebAssembly.RuntimeError(t+". Build with -sASSERTIONS for more info."),s(t),t}function it(){return tt.startsWith("data:application/octet-stream;base64,")}function ot(){var t=tt;try{if(t==tt&&M)return new Uint8Array(M);if(p)return p(t);throw"both async and sync fetching of the wasm failed"}catch(t){at(t)}}tt="ort-wasm-threaded.wasm",it()||(tt=S(tt));var ut={};function ct(t){this.name="ExitStatus",this.message="Program terminated with exit("+t+")",this.status=t}function st(t){(t=ht.Vb[t])||at(),ht.mc(t)}function lt(t){var e=ht.Cc();if(!e)return 6;ht.ac.push(e),ht.Vb[t.Ub]=e,e.Ub=t.Ub;var n={cmd:"run",start_routine:t.Ic,arg:t.zc,pthread_ptr:t.Ub};return e.$b=()=>{n.time=performance.now(),e.postMessage(n,t.Nc)},e.loaded&&(e.$b(),delete e.$b),0}function ft(t){if(O)return $t(1,1,t);Q()||(ht.oc(),u.onExit&&u.onExit(t),H=!0),g(t,new ct(t))}function pt(t,e){if(!e&&O)throw bt(t),"unwind";Q()||O||(me(),dt(J),be(0),re[1].length&&ae(1,10),re[2].length&&ae(2,10),ht.oc()),ft(t)}var ht={Yb:[],ac:[],qc:[],Vb:{},fc:function(){O&&ht.Ec()},Pc:function(){},Ec:function(){ht.receiveObjectTransfer=ht.Gc,ht.threadInitTLS=ht.pc,ht.setExitStatus=ht.nc,R=!1},nc:function(){},oc:function(){for(var t of Object.values(ht.Vb))ht.mc(t);for(t of ht.Yb)t.terminate();ht.Yb=[]},mc:function(t){var e=t.Ub;delete ht.Vb[e],ht.Yb.push(t),ht.ac.splice(ht.ac.indexOf(t),1),t.Ub=0,Oe(e)},Gc:function(){},pc:function(){ht.qc.forEach((t=>t()))},Fc:function(t,e){t.onmessage=n=>{var r=(n=n.data).cmd;if(t.Ub&&(ht.Bc=t.Ub),n.targetThread&&n.targetThread!=he()){var a=ht.Vb[n.Qc];a?a.postMessage(n,n.transferList):x(\'Internal error! Worker sent a message "\'+r+\'" to target pthread \'+n.targetThread+", but that thread no longer exists!")}else"processProxyingQueue"===r?zt(n.queue):"spawnThread"===r?lt(n):"cleanupThread"===r?st(n.thread):"killThread"===r?(n=n.thread,r=ht.Vb[n],delete ht.Vb[n],r.terminate(),Oe(n),ht.ac.splice(ht.ac.indexOf(r),1),r.Ub=0):"cancelThread"===r?ht.Vb[n.thread].postMessage({cmd:"cancel"}):"loaded"===r?(t.loaded=!0,e&&e(t),t.$b&&(t.$b(),delete t.$b)):"print"===r?C("Thread "+n.threadId+": "+n.text):"printErr"===r?x("Thread "+n.threadId+": "+n.text):"alert"===r?alert("Thread "+n.threadId+": "+n.text):"setimmediate"===n.target?t.postMessage(n):"onAbort"===r?u.onAbort&&u.onAbort(n.arg):r&&x("worker sent an unknown command "+r);ht.Bc=void 0},t.onerror=t=>{throw x("worker sent an error! "+t.filename+":"+t.lineno+": "+t.message),t},_&&(t.on("message",(function(e){t.onmessage({data:e})})),t.on("error",(function(e){t.onerror(e)})),t.on("detachedExit",(function(){}))),t.postMessage({cmd:"load",urlOrBlob:u.mainScriptUrlOrBlob||_scriptDir,wasmMemory:j,wasmModule:k})},yc:function(){var t=S("ort-wasm-threaded.worker.js");ht.Yb.push(new Worker(t))},Cc:function(){return 0==ht.Yb.length&&(ht.yc(),ht.Fc(ht.Yb[0])),ht.Yb.pop()}};function dt(t){for(;0<t.length;)t.shift()(u)}function yt(t){var e=Ee();return t=t(),Me(e),t}function bt(t){if(O)return $t(2,0,t);try{pt(t)}catch(t){t instanceof ct||"unwind"==t||g(1,t)}}u.PThread=ht,u.establishStackSpace=function(){var t=he(),e=a()[t+44>>2>>>0];t=a()[t+48>>2>>>0],Te(e,e-t),Me(e)};var mt=[];function gt(t){var e=mt[t];return e||(t>=mt.length&&(mt.length=t+1),mt[t]=e=$.get(t)),e}u.invokeEntryPoint=function(t,e){t=gt(t)(e),Q()?ht.nc(t):Ae(t)};var vt,wt,_t=[],Ot=0,At=0;function St(t){this.Zb=t,this.Sb=t-24,this.xc=function(t){i()[this.Sb+4>>2>>>0]=t},this.bc=function(){return i()[this.Sb+4>>2>>>0]},this.wc=function(t){i()[this.Sb+8>>2>>>0]=t},this.Dc=function(){return i()[this.Sb+8>>2>>>0]},this.rc=function(){a()[this.Sb>>2>>>0]=0},this.hc=function(t){t=t?1:0,e()[this.Sb+12>>0>>>0]=t},this.uc=function(){return 0!=e()[this.Sb+12>>0>>>0]},this.ic=function(t){t=t?1:0,e()[this.Sb+13>>0>>>0]=t},this.kc=function(){return 0!=e()[this.Sb+13>>0>>>0]},this.fc=function(t,e){this.cc(0),this.xc(t),this.wc(e),this.rc(),this.hc(!1),this.ic(!1)},this.sc=function(){Atomics.add(a(),this.Sb>>2,1)},this.Hc=function(){return 1===Atomics.sub(a(),this.Sb>>2,1)},this.cc=function(t){i()[this.Sb+16>>2>>>0]=t},this.tc=function(){return i()[this.Sb+16>>2>>>0]},this.vc=function(){if(Re(this.bc()))return i()[this.Zb>>2>>>0];var t=this.tc();return 0!==t?t:this.Zb}}function Tt(t){return ye(new St(t).Sb)}function Et(t,e,n,r){return O?$t(3,1,t,e,n,r):Mt(t,e,n,r)}function Mt(t,e,n,r){if("undefined"==typeof SharedArrayBuffer)return x("Current environment does not support SharedArrayBuffer, pthreads are not available!"),6;var a=[];return O&&0===a.length?Et(t,e,n,r):(t={Ic:n,Ub:t,zc:r,Nc:a},O?(t.Oc="spawnThread",postMessage(t,a),0):lt(t))}function Ct(t,e,n){return O?$t(4,1,t,e,n):0}function xt(t,e){if(O)return $t(5,1,t,e)}function Rt(t,e){if(O)return $t(6,1,t,e)}function jt(t,e,n){if(O)return $t(7,1,t,e,n)}function kt(t,e,n){return O?$t(8,1,t,e,n):0}function Dt(t,e){if(O)return $t(9,1,t,e)}function Pt(t,e,n){if(O)return $t(10,1,t,e,n)}function Ut(t,e,n,r){if(O)return $t(11,1,t,e,n,r)}function Ft(t,e,n,r){if(O)return $t(12,1,t,e,n,r)}function It(t,e,n,r){if(O)return $t(13,1,t,e,n,r)}function Wt(t){if(O)return $t(14,1,t)}function Ht(t,e){if(O)return $t(15,1,t,e)}function Lt(t,e,n){if(O)return $t(16,1,t,e,n)}function zt(t){Atomics.store(a(),t>>2,1),he()&&_e(t),Atomics.compareExchange(a(),t>>2,1,0)}function Yt(t){return i()[t>>>2]+4294967296*a()[t+4>>>2]}function Bt(t,e,n,r,a,i){return O?$t(17,1,t,e,n,r,a,i):-52}function Gt(t,e,n,r,a,i){if(O)return $t(18,1,t,e,n,r,a,i)}function Nt(t){var n=G(t)+1,r=de(n);return r&&B(t,e(),r,n),r}function Vt(t,e,n){function r(t){return(t=t.toTimeString().match(/\\(([A-Za-z ]+)\\)$/))?t[1]:"GMT"}if(O)return $t(19,1,t,e,n);var o=(new Date).getFullYear(),u=new Date(o,0,1),c=new Date(o,6,1);o=u.getTimezoneOffset();var s=c.getTimezoneOffset(),l=Math.max(o,s);a()[t>>2>>>0]=60*l,a()[e>>2>>>0]=Number(o!=s),t=r(u),e=r(c),t=Nt(t),e=Nt(e),s<o?(i()[n>>2>>>0]=t,i()[n+4>>2>>>0]=e):(i()[n>>2>>>0]=e,i()[n+4>>2>>>0]=t)}function $t(t,e){var n=arguments.length-2,r=arguments;return yt((()=>{for(var a=Ce(8*n),i=a>>3,u=0;u<n;u++){var c=r[2+u];o()[i+u>>>0]=c}return we(t,n,a,e)}))}u.executeNotifiedProxyingQueue=zt,wt=_?()=>{var t=process.hrtime();return 1e3*t[0]+t[1]/1e6}:O?()=>performance.now()-u.__performance_now_clock_drift:()=>performance.now();var qt,Xt=[],Jt={};function Zt(){if(!qt){var t,e={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:("object"==typeof navigator&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:m||"./this.program"};for(t in Jt)void 0===Jt[t]?delete e[t]:e[t]=Jt[t];var n=[];for(t in e)n.push(t+"="+e[t]);qt=n}return qt}function Qt(t,n){if(O)return $t(20,1,t,n);var r=0;return Zt().forEach((function(a,o){var u=n+r;for(o=i()[t+4*o>>2>>>0]=u,u=0;u<a.length;++u)e()[o++>>0>>>0]=a.charCodeAt(u);e()[o>>0>>>0]=0,r+=a.length+1})),0}function Kt(t,e){if(O)return $t(21,1,t,e);var n=Zt();i()[t>>2>>>0]=n.length;var r=0;return n.forEach((function(t){r+=t.length+1})),i()[e>>2>>>0]=r,0}function te(t){return O?$t(22,1,t):52}function ee(t,e,n,r){return O?$t(23,1,t,e,n,r):52}function ne(t,e,n,r,a){return O?$t(24,1,t,e,n,r,a):70}var re=[null,[],[]];function ae(t,e){var n=re[t];0===e||10===e?((1===t?C:x)(z(n,0)),n.length=0):n.push(e)}function ie(t,e,n,a){if(O)return $t(25,1,t,e,n,a);for(var o=0,u=0;u<n;u++){var c=i()[e>>2>>>0],s=i()[e+4>>2>>>0];e+=8;for(var l=0;l<s;l++)ae(t,r()[c+l>>>0]);o+=s}return i()[a>>2>>>0]=o,0}var oe=0;function ue(t){return 0==t%4&&(0!=t%100||0==t%400)}var ce=[31,29,31,30,31,30,31,31,30,31,30,31],se=[31,28,31,30,31,30,31,31,30,31,30,31];function le(t,n,r,i){function o(t,e,n){for(t="number"==typeof t?t.toString():t||"";t.length<e;)t=n[0]+t;return t}function u(t,e){return o(t,e,"0")}function c(t,e){function n(t){return 0>t?-1:0<t?1:0}var r;return 0===(r=n(t.getFullYear()-e.getFullYear()))&&0===(r=n(t.getMonth()-e.getMonth()))&&(r=n(t.getDate()-e.getDate())),r}function s(t){switch(t.getDay()){case 0:return new Date(t.getFullYear()-1,11,29);case 1:return t;case 2:return new Date(t.getFullYear(),0,3);case 3:return new Date(t.getFullYear(),0,2);case 4:return new Date(t.getFullYear(),0,1);case 5:return new Date(t.getFullYear()-1,11,31);case 6:return new Date(t.getFullYear()-1,11,30)}}function l(t){var e=t.Wb;for(t=new Date(new Date(t.Xb+1900,0,1).getTime());0<e;){var n=t.getMonth(),r=(ue(t.getFullYear())?ce:se)[n];if(!(e>r-t.getDate())){t.setDate(t.getDate()+e);break}e-=r-t.getDate()+1,t.setDate(1),11>n?t.setMonth(n+1):(t.setMonth(0),t.setFullYear(t.getFullYear()+1))}return n=new Date(t.getFullYear()+1,0,4),e=s(new Date(t.getFullYear(),0,4)),n=s(n),0>=c(e,t)?0>=c(n,t)?t.getFullYear()+1:t.getFullYear():t.getFullYear()-1}var f=a()[i+40>>2>>>0];for(var p in i={Lc:a()[i>>2>>>0],Kc:a()[i+4>>2>>>0],dc:a()[i+8>>2>>>0],jc:a()[i+12>>2>>>0],ec:a()[i+16>>2>>>0],Xb:a()[i+20>>2>>>0],Tb:a()[i+24>>2>>>0],Wb:a()[i+28>>2>>>0],Rc:a()[i+32>>2>>>0],Jc:a()[i+36>>2>>>0],Mc:f?Y(f):""},r=Y(r),f={"%c":"%a %b %d %H:%M:%S %Y","%D":"%m/%d/%y","%F":"%Y-%m-%d","%h":"%b","%r":"%I:%M:%S %p","%R":"%H:%M","%T":"%H:%M:%S","%x":"%m/%d/%y","%X":"%H:%M:%S","%Ec":"%c","%EC":"%C","%Ex":"%m/%d/%y","%EX":"%H:%M:%S","%Ey":"%y","%EY":"%Y","%Od":"%d","%Oe":"%e","%OH":"%H","%OI":"%I","%Om":"%m","%OM":"%M","%OS":"%S","%Ou":"%u","%OU":"%U","%OV":"%V","%Ow":"%w","%OW":"%W","%Oy":"%y"})r=r.replace(new RegExp(p,"g"),f[p]);var h="Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),d="January February March April May June July August September October November December".split(" ");for(p in f={"%a":function(t){return h[t.Tb].substring(0,3)},"%A":function(t){return h[t.Tb]},"%b":function(t){return d[t.ec].substring(0,3)},"%B":function(t){return d[t.ec]},"%C":function(t){return u((t.Xb+1900)/100|0,2)},"%d":function(t){return u(t.jc,2)},"%e":function(t){return o(t.jc,2," ")},"%g":function(t){return l(t).toString().substring(2)},"%G":function(t){return l(t)},"%H":function(t){return u(t.dc,2)},"%I":function(t){return 0==(t=t.dc)?t=12:12<t&&(t-=12),u(t,2)},"%j":function(t){for(var e=0,n=0;n<=t.ec-1;e+=(ue(t.Xb+1900)?ce:se)[n++]);return u(t.jc+e,3)},"%m":function(t){return u(t.ec+1,2)},"%M":function(t){return u(t.Kc,2)},"%n":function(){return"\\n"},"%p":function(t){return 0<=t.dc&&12>t.dc?"AM":"PM"},"%S":function(t){return u(t.Lc,2)},"%t":function(){return"\\t"},"%u":function(t){return t.Tb||7},"%U":function(t){return u(Math.floor((t.Wb+7-t.Tb)/7),2)},"%V":function(t){var e=Math.floor((t.Wb+7-(t.Tb+6)%7)/7);if(2>=(t.Tb+371-t.Wb-2)%7&&e++,e)53==e&&(4==(n=(t.Tb+371-t.Wb)%7)||3==n&&ue(t.Xb)||(e=1));else{e=52;var n=(t.Tb+7-t.Wb-1)%7;(4==n||5==n&&ue(t.Xb%400-1))&&e++}return u(e,2)},"%w":function(t){return t.Tb},"%W":function(t){return u(Math.floor((t.Wb+7-(t.Tb+6)%7)/7),2)},"%y":function(t){return(t.Xb+1900).toString().substring(2)},"%Y":function(t){return t.Xb+1900},"%z":function(t){var e=0<=(t=t.Jc);return t=Math.abs(t)/60,(e?"+":"-")+String("0000"+(t/60*100+t%60)).slice(-4)},"%Z":function(t){return t.Mc},"%%":function(){return"%"}},r=r.replace(/%%/g,"\\0\\0"),f)r.includes(p)&&(r=r.replace(new RegExp(p,"g"),f[p](i)));return p=function(t){var e=Array(G(t)+1);return B(t,e,0,e.length),e}(r=r.replace(/\\0\\0/g,"%")),p.length>n?0:(function(t,n){e().set(t,n>>>0)}(p,t),p.length-1)}ht.fc();var fe=[null,ft,bt,Et,Ct,xt,Rt,jt,kt,Dt,Pt,Ut,Ft,It,Wt,Ht,Lt,Bt,Gt,Vt,Qt,Kt,te,ee,ne,ie],pe={b:function(t){return de(t+24)+24},n:function(t){return(t=new St(t)).uc()||(t.hc(!0),Ot--),t.ic(!1),_t.push(t),t.sc(),t.vc()},ma:function(t){throw x("Unexpected exception thrown, this is not properly supported - aborting"),H=!0,t},x:function(){Se(0);var t=_t.pop();if(t.Hc()&&!t.kc()){var e=t.Dc();e&&gt(e)(t.Zb),Tt(t.Zb)}At=0},e:function(){var t=At;if(!t)return oe=0;var e=new St(t);e.cc(t);var n=e.bc();if(!n)return oe=0,t;for(var r=Array.prototype.slice.call(arguments),a=0;a<r.length;a++){var i=r[a];if(0===i||i===n)break;if(xe(i,n,e.Sb+16))return oe=i,t}return oe=n,t},l:function(){var t=At;if(!t)return oe=0;var e=new St(t);e.cc(t);var n=e.bc();if(!n)return oe=0,t;for(var r=Array.prototype.slice.call(arguments),a=0;a<r.length;a++){var i=r[a];if(0===i||i===n)break;if(xe(i,n,e.Sb+16))return oe=i,t}return oe=n,t},h:function(){var t=At;if(!t)return oe=0;var e=new St(t);e.cc(t);var n=e.bc();if(!n)return oe=0,t;for(var r=Array.prototype.slice.call(arguments),a=0;a<r.length;a++){var i=r[a];if(0===i||i===n)break;if(xe(i,n,e.Sb+16))return oe=i,t}return oe=n,t},t:Tt,M:function(){var t=_t.pop();t||at("no exception to throw");var e=t.Zb;throw t.kc()||(_t.push(t),t.ic(!0),t.hc(!1),Ot++),At=e,e},c:function(t,e,n){throw new St(t).fc(e,n),At=t,Ot++,t},pa:function(){return Ot},Fa:function(t){ge(t,!w,1,!v),ht.pc()},T:function(t){O?postMessage({cmd:"cleanupThread",thread:t}):st(t)},xa:Mt,j:function(t){throw At||(At=t),t},H:Ct,Ma:xt,ua:Rt,wa:jt,oa:kt,Ka:Dt,Ca:Pt,Ja:Ut,V:Ft,va:It,sa:Wt,La:Ht,ta:Lt,Ta:function(){},X:function(){at("To use dlopen, you need enable dynamic linking, see https://github.com/emscripten-core/emscripten/wiki/Linking")},Ua:function(){at("To use dlopen, you need enable dynamic linking, see https://github.com/emscripten-core/emscripten/wiki/Linking")},W:function(){return Date.now()},ya:function(){return 2097152},Oa:function(){return!0},za:function(t,e,n,r){if(t==e)setTimeout((()=>zt(r)));else if(O)postMessage({targetThread:t,cmd:"processProxyingQueue",queue:r});else{if(!(t=ht.Vb[t]))return;t.postMessage({cmd:"processProxyingQueue",queue:r})}return 1},Ea:function(){return-1},Pa:function(t,e){t=new Date(1e3*Yt(t)),a()[e>>2>>>0]=t.getUTCSeconds(),a()[e+4>>2>>>0]=t.getUTCMinutes(),a()[e+8>>2>>>0]=t.getUTCHours(),a()[e+12>>2>>>0]=t.getUTCDate(),a()[e+16>>2>>>0]=t.getUTCMonth(),a()[e+20>>2>>>0]=t.getUTCFullYear()-1900,a()[e+24>>2>>>0]=t.getUTCDay(),t=(t.getTime()-Date.UTC(t.getUTCFullYear(),0,1,0,0,0,0))/864e5|0,a()[e+28>>2>>>0]=t},Qa:function(t,e){t=new Date(1e3*Yt(t)),a()[e>>2>>>0]=t.getSeconds(),a()[e+4>>2>>>0]=t.getMinutes(),a()[e+8>>2>>>0]=t.getHours(),a()[e+12>>2>>>0]=t.getDate(),a()[e+16>>2>>>0]=t.getMonth(),a()[e+20>>2>>>0]=t.getFullYear()-1900,a()[e+24>>2>>>0]=t.getDay();var n=new Date(t.getFullYear(),0,1),r=(t.getTime()-n.getTime())/864e5|0;a()[e+28>>2>>>0]=r,a()[e+36>>2>>>0]=-60*t.getTimezoneOffset(),r=new Date(t.getFullYear(),6,1).getTimezoneOffset(),t=0|(r!=(n=n.getTimezoneOffset())&&t.getTimezoneOffset()==Math.min(n,r)),a()[e+32>>2>>>0]=t},Ra:function(t){var e=new Date(a()[t+20>>2>>>0]+1900,a()[t+16>>2>>>0],a()[t+12>>2>>>0],a()[t+8>>2>>>0],a()[t+4>>2>>>0],a()[t>>2>>>0],0),n=a()[t+32>>2>>>0],r=e.getTimezoneOffset(),i=new Date(e.getFullYear(),0,1),o=new Date(e.getFullYear(),6,1).getTimezoneOffset(),u=i.getTimezoneOffset(),c=Math.min(u,o);return 0>n?a()[t+32>>2>>>0]=Number(o!=u&&c==r):0<n!=(c==r)&&(o=Math.max(u,o),e.setTime(e.getTime()+6e4*((0<n?c:o)-r))),a()[t+24>>2>>>0]=e.getDay(),n=(e.getTime()-i.getTime())/864e5|0,a()[t+28>>2>>>0]=n,a()[t>>2>>>0]=e.getSeconds(),a()[t+4>>2>>>0]=e.getMinutes(),a()[t+8>>2>>>0]=e.getHours(),a()[t+12>>2>>>0]=e.getDate(),a()[t+16>>2>>>0]=e.getMonth(),e.getTime()/1e3|0},Aa:Bt,Ba:Gt,Sa:function t(e,n,r){t.Ac||(t.Ac=!0,Vt(e,n,r))},y:function(){at("")},U:function(){if(!_&&!w){var t="Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread";vt||(vt={}),vt[t]||(vt[t]=1,_&&(t="warning: "+t),x(t))}},ra:function(){return 4294901760},B:wt,Ia:function(t,e,n){r().copyWithin(t>>>0,e>>>0,e+n>>>0)},F:function(){return _?n(993).cpus().length:navigator.hardwareConcurrency},Da:function(t,e,n){Xt.length=e,n>>=3;for(var r=0;r<e;r++)Xt[r]=o()[n+r>>>0];return(0>t?ut[-t-1]:fe[t]).apply(null,Xt)},qa:function(t){var e=r().length;if((t>>>=0)<=e||4294901760<t)return!1;for(var n=1;4>=n;n*=2){var a=e*(1+.2/n);a=Math.min(a,t+100663296);var i=Math;a=Math.max(t,a),i=i.min.call(i,4294901760,a+(65536-a%65536)%65536);t:{try{j.grow(i-D.byteLength+65535>>>16),N(j.buffer);var o=1;break t}catch(t){}o=void 0}if(o)return!0}return!1},Na:function(){throw"unwind"},Ga:Qt,Ha:Kt,J:pt,I:te,S:ee,ga:ne,R:ie,d:function(){return oe},na:function t(r,a){t.lc||(t.lc=function(){if("object"==typeof crypto&&"function"==typeof crypto.getRandomValues){var t=new Uint8Array(1);return()=>(crypto.getRandomValues(t),t[0])}if(_)try{var e=n(Object(function(){var t=new Error("Cannot find module \'crypto\'");throw t.code="MODULE_NOT_FOUND",t}()));return()=>e.randomBytes(1)[0]}catch(t){}return()=>at("randomDevice")}());for(var i=0;i<a;i++)e()[r+i>>0>>>0]=t.lc();return 0},ia:function(t,e,n){var r=Ee();try{return gt(t)(e,n)}catch(t){if(Me(r),t!==t+0)throw t;Se(1,0)}},ja:function(t,e,n){var r=Ee();try{return gt(t)(e,n)}catch(t){if(Me(r),t!==t+0)throw t;Se(1,0)}},K:function(t){var e=Ee();try{return gt(t)()}catch(t){if(Me(e),t!==t+0)throw t;Se(1,0)}},f:function(t,e){var n=Ee();try{return gt(t)(e)}catch(t){if(Me(n),t!==t+0)throw t;Se(1,0)}},P:function(t,e,n){var r=Ee();try{return gt(t)(e,n)}catch(t){if(Me(r),t!==t+0)throw t;Se(1,0)}},Q:function(t,e,n){var r=Ee();try{return gt(t)(e,n)}catch(t){if(Me(r),t!==t+0)throw t;Se(1,0)}},k:function(t,e,n){var r=Ee();try{return gt(t)(e,n)}catch(t){if(Me(r),t!==t+0)throw t;Se(1,0)}},p:function(t,e,n,r){var a=Ee();try{return gt(t)(e,n,r)}catch(t){if(Me(a),t!==t+0)throw t;Se(1,0)}},q:function(t,e,n,r,a){var i=Ee();try{return gt(t)(e,n,r,a)}catch(t){if(Me(i),t!==t+0)throw t;Se(1,0)}},N:function(t,e,n,r,a,i){var o=Ee();try{return gt(t)(e,n,r,a,i)}catch(t){if(Me(o),t!==t+0)throw t;Se(1,0)}},s:function(t,e,n,r,a,i){var o=Ee();try{return gt(t)(e,n,r,a,i)}catch(t){if(Me(o),t!==t+0)throw t;Se(1,0)}},w:function(t,e,n,r,a,i,o){var u=Ee();try{return gt(t)(e,n,r,a,i,o)}catch(t){if(Me(u),t!==t+0)throw t;Se(1,0)}},L:function(t,e,n,r,a,i,o,u){var c=Ee();try{return gt(t)(e,n,r,a,i,o,u)}catch(t){if(Me(c),t!==t+0)throw t;Se(1,0)}},E:function(t,e,n,r,a,i,o,u,c,s,l,f){var p=Ee();try{return gt(t)(e,n,r,a,i,o,u,c,s,l,f)}catch(t){if(Me(p),t!==t+0)throw t;Se(1,0)}},aa:function(t,e,n,r,a,i,o,u){var c=Ee();try{return He(t,e,n,r,a,i,o,u)}catch(t){if(Me(c),t!==t+0)throw t;Se(1,0)}},_:function(t,e,n,r,a,i,o){var u=Ee();try{return ke(t,e,n,r,a,i,o)}catch(t){if(Me(u),t!==t+0)throw t;Se(1,0)}},Z:function(t,e,n,r,a){var i=Ee();try{return Le(t,e,n,r,a)}catch(t){if(Me(i),t!==t+0)throw t;Se(1,0)}},ca:function(t,e,n,r){var a=Ee();try{return Ie(t,e,n,r)}catch(t){if(Me(a),t!==t+0)throw t;Se(1,0)}},$:function(t){var e=Ee();try{return je(t)}catch(t){if(Me(e),t!==t+0)throw t;Se(1,0)}},ba:function(t,e){var n=Ee();try{return We(t,e)}catch(t){if(Me(n),t!==t+0)throw t;Se(1,0)}},Y:function(t,e,n){var r=Ee();try{return De(t,e,n)}catch(t){if(Me(r),t!==t+0)throw t;Se(1,0)}},g:function(t){var e=Ee();try{gt(t)()}catch(t){if(Me(e),t!==t+0)throw t;Se(1,0)}},r:function(t,e){var n=Ee();try{gt(t)(e)}catch(t){if(Me(n),t!==t+0)throw t;Se(1,0)}},i:function(t,e,n){var r=Ee();try{gt(t)(e,n)}catch(t){if(Me(r),t!==t+0)throw t;Se(1,0)}},ha:function(t,e,n,r){var a=Ee();try{gt(t)(e,n,r)}catch(t){if(Me(a),t!==t+0)throw t;Se(1,0)}},m:function(t,e,n,r){var a=Ee();try{gt(t)(e,n,r)}catch(t){if(Me(a),t!==t+0)throw t;Se(1,0)}},v:function(t,e,n,r,a){var i=Ee();try{gt(t)(e,n,r,a)}catch(t){if(Me(i),t!==t+0)throw t;Se(1,0)}},u:function(t,e,n,r,a,i){var o=Ee();try{gt(t)(e,n,r,a,i)}catch(t){if(Me(o),t!==t+0)throw t;Se(1,0)}},O:function(t,e,n,r,a,i,o){var u=Ee();try{gt(t)(e,n,r,a,i,o)}catch(t){if(Me(u),t!==t+0)throw t;Se(1,0)}},A:function(t,e,n,r,a,i,o,u){var c=Ee();try{gt(t)(e,n,r,a,i,o,u)}catch(t){if(Me(c),t!==t+0)throw t;Se(1,0)}},ka:function(t,e,n,r,a,i,o,u,c){var s=Ee();try{gt(t)(e,n,r,a,i,o,u,c)}catch(t){if(Me(s),t!==t+0)throw t;Se(1,0)}},C:function(t,e,n,r,a,i,o,u,c,s,l){var f=Ee();try{gt(t)(e,n,r,a,i,o,u,c,s,l)}catch(t){if(Me(f),t!==t+0)throw t;Se(1,0)}},D:function(t,e,n,r,a,i,o,u,c,s,l,f,p,h,d,y){var b=Ee();try{gt(t)(e,n,r,a,i,o,u,c,s,l,f,p,h,d,y)}catch(t){if(Me(b),t!==t+0)throw t;Se(1,0)}},fa:function(t,e,n,r,a,i,o,u){var c=Ee();try{Pe(t,e,n,r,a,i,o,u)}catch(t){if(Me(c),t!==t+0)throw t;Se(1,0)}},da:function(t,e,n,r,a,i,o,u,c,s,l,f){var p=Ee();try{Fe(t,e,n,r,a,i,o,u,c,s,l,f)}catch(t){if(Me(p),t!==t+0)throw t;Se(1,0)}},ea:function(t,e,n,r,a,i){var o=Ee();try{Ue(t,e,n,r,a,i)}catch(t){if(Me(o),t!==t+0)throw t;Se(1,0)}},o:function(t){return t},a:j||u.wasmMemory,G:function(t){oe=t},la:le,z:function(t,e,n,r){return le(t,e,n,r)}};!function(){function t(t,e){u.asm=t.exports,ht.qc.push(u.asm.sb),$=u.asm.ub,X.unshift(u.asm.Va),k=e,O||(et--,u.monitorRunDependencies&&u.monitorRunDependencies(et),0==et&&(null!==nt&&(clearInterval(nt),nt=null),rt&&(t=rt,rt=null,t())))}function e(e){t(e.instance,e.module)}function n(t){return function(){if(!M&&(v||w)){if("function"==typeof fetch&&!tt.startsWith("file://"))return fetch(tt,{credentials:"same-origin"}).then((function(t){if(!t.ok)throw"failed to load wasm binary file at \'"+tt+"\'";return t.arrayBuffer()})).catch((function(){return ot()}));if(f)return new Promise((function(t,e){f(tt,(function(e){t(new Uint8Array(e))}),e)}))}return Promise.resolve().then((function(){return ot()}))}().then((function(t){return WebAssembly.instantiate(t,r)})).then((function(t){return t})).then(t,(function(t){x("failed to asynchronously prepare wasm: "+t),at(t)}))}var r={a:pe};if(O||(et++,u.monitorRunDependencies&&u.monitorRunDependencies(et)),u.instantiateWasm)try{return u.instantiateWasm(r,t)}catch(t){return x("Module.instantiateWasm callback failed with error: "+t),!1}(M||"function"!=typeof WebAssembly.instantiateStreaming||it()||tt.startsWith("file://")||_||"function"!=typeof fetch?n(e):fetch(tt,{credentials:"same-origin"}).then((function(t){return WebAssembly.instantiateStreaming(t,r).then(e,(function(t){return x("wasm streaming compile failed: "+t),x("falling back to ArrayBuffer instantiation"),n(e)}))}))).catch(s)}(),u.___wasm_call_ctors=function(){return(u.___wasm_call_ctors=u.asm.Va).apply(null,arguments)},u._OrtInit=function(){return(u._OrtInit=u.asm.Wa).apply(null,arguments)},u._OrtCreateSessionOptions=function(){return(u._OrtCreateSessionOptions=u.asm.Xa).apply(null,arguments)},u._OrtAppendExecutionProvider=function(){return(u._OrtAppendExecutionProvider=u.asm.Ya).apply(null,arguments)},u._OrtAddSessionConfigEntry=function(){return(u._OrtAddSessionConfigEntry=u.asm.Za).apply(null,arguments)},u._OrtReleaseSessionOptions=function(){return(u._OrtReleaseSessionOptions=u.asm._a).apply(null,arguments)},u._OrtCreateSession=function(){return(u._OrtCreateSession=u.asm.$a).apply(null,arguments)},u._OrtReleaseSession=function(){return(u._OrtReleaseSession=u.asm.ab).apply(null,arguments)},u._OrtGetInputCount=function(){return(u._OrtGetInputCount=u.asm.bb).apply(null,arguments)},u._OrtGetOutputCount=function(){return(u._OrtGetOutputCount=u.asm.cb).apply(null,arguments)},u._OrtGetInputName=function(){return(u._OrtGetInputName=u.asm.db).apply(null,arguments)},u._OrtGetOutputName=function(){return(u._OrtGetOutputName=u.asm.eb).apply(null,arguments)},u._OrtFree=function(){return(u._OrtFree=u.asm.fb).apply(null,arguments)},u._OrtCreateTensor=function(){return(u._OrtCreateTensor=u.asm.gb).apply(null,arguments)},u._OrtGetTensorData=function(){return(u._OrtGetTensorData=u.asm.hb).apply(null,arguments)},u._OrtReleaseTensor=function(){return(u._OrtReleaseTensor=u.asm.ib).apply(null,arguments)},u._OrtCreateRunOptions=function(){return(u._OrtCreateRunOptions=u.asm.jb).apply(null,arguments)},u._OrtAddRunConfigEntry=function(){return(u._OrtAddRunConfigEntry=u.asm.kb).apply(null,arguments)},u._OrtReleaseRunOptions=function(){return(u._OrtReleaseRunOptions=u.asm.lb).apply(null,arguments)},u._OrtRun=function(){return(u._OrtRun=u.asm.mb).apply(null,arguments)},u._OrtEndProfiling=function(){return(u._OrtEndProfiling=u.asm.nb).apply(null,arguments)};var he=u._pthread_self=function(){return(he=u._pthread_self=u.asm.ob).apply(null,arguments)},de=u._malloc=function(){return(de=u._malloc=u.asm.pb).apply(null,arguments)},ye=u._free=function(){return(ye=u._free=u.asm.qb).apply(null,arguments)},be=u._fflush=function(){return(be=u._fflush=u.asm.rb).apply(null,arguments)};u.__emscripten_tls_init=function(){return(u.__emscripten_tls_init=u.asm.sb).apply(null,arguments)};var me=u.___funcs_on_exit=function(){return(me=u.___funcs_on_exit=u.asm.tb).apply(null,arguments)},ge=u.__emscripten_thread_init=function(){return(ge=u.__emscripten_thread_init=u.asm.vb).apply(null,arguments)};u.__emscripten_thread_crashed=function(){return(u.__emscripten_thread_crashed=u.asm.wb).apply(null,arguments)};var ve,we=u._emscripten_run_in_main_runtime_thread_js=function(){return(we=u._emscripten_run_in_main_runtime_thread_js=u.asm.xb).apply(null,arguments)},_e=u.__emscripten_proxy_execute_task_queue=function(){return(_e=u.__emscripten_proxy_execute_task_queue=u.asm.yb).apply(null,arguments)},Oe=u.__emscripten_thread_free_data=function(){return(Oe=u.__emscripten_thread_free_data=u.asm.zb).apply(null,arguments)},Ae=u.__emscripten_thread_exit=function(){return(Ae=u.__emscripten_thread_exit=u.asm.Ab).apply(null,arguments)},Se=u._setThrew=function(){return(Se=u._setThrew=u.asm.Bb).apply(null,arguments)},Te=u._emscripten_stack_set_limits=function(){return(Te=u._emscripten_stack_set_limits=u.asm.Cb).apply(null,arguments)},Ee=u.stackSave=function(){return(Ee=u.stackSave=u.asm.Db).apply(null,arguments)},Me=u.stackRestore=function(){return(Me=u.stackRestore=u.asm.Eb).apply(null,arguments)},Ce=u.stackAlloc=function(){return(Ce=u.stackAlloc=u.asm.Fb).apply(null,arguments)},xe=u.___cxa_can_catch=function(){return(xe=u.___cxa_can_catch=u.asm.Gb).apply(null,arguments)},Re=u.___cxa_is_pointer_type=function(){return(Re=u.___cxa_is_pointer_type=u.asm.Hb).apply(null,arguments)},je=u.dynCall_j=function(){return(je=u.dynCall_j=u.asm.Ib).apply(null,arguments)},ke=u.dynCall_iiiiij=function(){return(ke=u.dynCall_iiiiij=u.asm.Jb).apply(null,arguments)},De=u.dynCall_jii=function(){return(De=u.dynCall_jii=u.asm.Kb).apply(null,arguments)},Pe=u.dynCall_viiiiij=function(){return(Pe=u.dynCall_viiiiij=u.asm.Lb).apply(null,arguments)},Ue=u.dynCall_vjji=function(){return(Ue=u.dynCall_vjji=u.asm.Mb).apply(null,arguments)},Fe=u.dynCall_viiijjjii=function(){return(Fe=u.dynCall_viiijjjii=u.asm.Nb).apply(null,arguments)},Ie=u.dynCall_iij=function(){return(Ie=u.dynCall_iij=u.asm.Ob).apply(null,arguments)},We=u.dynCall_ji=function(){return(We=u.dynCall_ji=u.asm.Pb).apply(null,arguments)},He=u.dynCall_iiiiiij=function(){return(He=u.dynCall_iiiiiij=u.asm.Qb).apply(null,arguments)},Le=u.dynCall_iiij=function(){return(Le=u.dynCall_iiij=u.asm.Rb).apply(null,arguments)};function ze(){function t(){if(!ve&&(ve=!0,u.calledRun=!0,!H)&&(O||dt(X),c(u),u.onRuntimeInitialized&&u.onRuntimeInitialized(),!O)){if(u.postRun)for("function"==typeof u.postRun&&(u.postRun=[u.postRun]);u.postRun.length;){var t=u.postRun.shift();Z.unshift(t)}dt(Z)}}if(!(0<et))if(O)c(u),O||dt(X),postMessage({cmd:"loaded"});else{if(u.preRun)for("function"==typeof u.preRun&&(u.preRun=[u.preRun]);u.preRun.length;)K();dt(q),0<et||(u.setStatus?(u.setStatus("Running..."),setTimeout((function(){setTimeout((function(){u.setStatus("")}),1),t()}),1)):t())}}if(u.UTF8ToString=Y,u.stringToUTF8=function(t,e,n){return B(t,r(),e,n)},u.lengthBytesUTF8=G,u.keepRuntimeAlive=Q,u.wasmMemory=j,u.stackSave=Ee,u.stackRestore=Me,u.stackAlloc=Ce,u.ExitStatus=ct,u.PThread=ht,rt=function t(){ve||ze(),ve||(rt=t)},u.preInit)for("function"==typeof u.preInit&&(u.preInit=[u.preInit]);0<u.preInit.length;)u.preInit.pop()();return ze(),t.ready});t.exports=r},932:(t,e,n)=>{var _scriptDir,r=(_scriptDir=(_scriptDir="undefined"!=typeof document&&document.currentScript?document.currentScript.src:void 0)||"/index.js",function(t){var e,r,a;t=t||{},e||(e=void 0!==t?t:{}),e.ready=new Promise((function(t,e){r=t,a=e}));var i,o,u,c,s,l,f=Object.assign({},e),p="./this.program",h=(t,e)=>{throw e},d="object"==typeof window,y="function"==typeof importScripts,b="object"==typeof process&&"object"==typeof process.versions&&"string"==typeof process.versions.node,m="";b?(m=y?n(908).dirname(m)+"/":"//",l=()=>{s||(c=n(384),s=n(908))},i=function(t,e){return l(),t=s.normalize(t),c.readFileSync(t,e?void 0:"utf8")},u=t=>((t=i(t,!0)).buffer||(t=new Uint8Array(t)),t),o=(t,e,n)=>{l(),t=s.normalize(t),c.readFile(t,(function(t,r){t?n(t):e(r.buffer)}))},1<process.argv.length&&(p=process.argv[1].replace(/\\\\/g,"/")),process.argv.slice(2),process.on("uncaughtException",(function(t){if(!(t instanceof J))throw t})),process.on("unhandledRejection",(function(t){throw t})),h=(t,e)=>{if(_||0<L)throw process.exitCode=t,e;e instanceof J||w("exiting due to exception: "+e),process.exit(t)},e.inspect=function(){return"[Emscripten Module object]"}):(d||y)&&(y?m=self.location.href:"undefined"!=typeof document&&document.currentScript&&(m=document.currentScript.src),_scriptDir&&(m=_scriptDir),m=0!==m.indexOf("blob:")?m.substr(0,m.replace(/[?#].*/,"").lastIndexOf("/")+1):"",i=t=>{var e=new XMLHttpRequest;return e.open("GET",t,!1),e.send(null),e.responseText},y&&(u=t=>{var e=new XMLHttpRequest;return e.open("GET",t,!1),e.responseType="arraybuffer",e.send(null),new Uint8Array(e.response)}),o=(t,e,n)=>{var r=new XMLHttpRequest;r.open("GET",t,!0),r.responseType="arraybuffer",r.onload=()=>{200==r.status||0==r.status&&r.response?e(r.response):n()},r.onerror=n,r.send(null)});var g,v=e.print||console.log.bind(console),w=e.printErr||console.warn.bind(console);Object.assign(e,f),f=null,e.thisProgram&&(p=e.thisProgram),e.quit&&(h=e.quit),e.wasmBinary&&(g=e.wasmBinary);var _=e.noExitRuntime||!1;"object"!=typeof WebAssembly&&V("no native wasm support detected");var O,A,S,T,E,M,C=!1,x="undefined"!=typeof TextDecoder?new TextDecoder("utf8"):void 0;function R(t,e,n){var r=(e>>>=0)+n;for(n=e;t[n]&&!(n>=r);)++n;if(16<n-e&&t.buffer&&x)return x.decode(t.subarray(e,n));for(r="";e<n;){var a=t[e++];if(128&a){var i=63&t[e++];if(192==(224&a))r+=String.fromCharCode((31&a)<<6|i);else{var o=63&t[e++];65536>(a=224==(240&a)?(15&a)<<12|i<<6|o:(7&a)<<18|i<<12|o<<6|63&t[e++])?r+=String.fromCharCode(a):(a-=65536,r+=String.fromCharCode(55296|a>>10,56320|1023&a))}}else r+=String.fromCharCode(a)}return r}function j(t,e){return(t>>>=0)?R(T,t,e):""}function k(t,e,n,r){if(!(0<r))return 0;var a=n>>>=0;r=n+r-1;for(var i=0;i<t.length;++i){var o=t.charCodeAt(i);if(55296<=o&&57343>=o&&(o=65536+((1023&o)<<10)|1023&t.charCodeAt(++i)),127>=o){if(n>=r)break;e[n++>>>0]=o}else{if(2047>=o){if(n+1>=r)break;e[n++>>>0]=192|o>>6}else{if(65535>=o){if(n+2>=r)break;e[n++>>>0]=224|o>>12}else{if(n+3>=r)break;e[n++>>>0]=240|o>>18,e[n++>>>0]=128|o>>12&63}e[n++>>>0]=128|o>>6&63}e[n++>>>0]=128|63&o}}return e[n>>>0]=0,n-a}function D(t){for(var e=0,n=0;n<t.length;++n){var r=t.charCodeAt(n);127>=r?e++:2047>=r?e+=2:55296<=r&&57343>=r?(e+=4,++n):e+=3}return e}function P(){var t=O.buffer;A=t,e.HEAP8=S=new Int8Array(t),e.HEAP16=new Int16Array(t),e.HEAP32=E=new Int32Array(t),e.HEAPU8=T=new Uint8Array(t),e.HEAPU16=new Uint16Array(t),e.HEAPU32=M=new Uint32Array(t),e.HEAPF32=new Float32Array(t),e.HEAPF64=new Float64Array(t)}var U,F=[],I=[],W=[],H=[],L=0;function z(){var t=e.preRun.shift();F.unshift(t)}var Y,B=0,G=null,N=null;function V(t){throw e.onAbort&&e.onAbort(t),w(t="Aborted("+t+")"),C=!0,t=new WebAssembly.RuntimeError(t+". Build with -sASSERTIONS for more info."),a(t),t}function $(){return Y.startsWith("data:application/octet-stream;base64,")}if(Y="ort-wasm.wasm",!$()){var q=Y;Y=e.locateFile?e.locateFile(q,m):m+q}function X(){var t=Y;try{if(t==Y&&g)return new Uint8Array(g);if(u)return u(t);throw"both async and sync fetching of the wasm failed"}catch(t){V(t)}}function J(t){this.name="ExitStatus",this.message="Program terminated with exit("+t+")",this.status=t}function Z(t){for(;0<t.length;)t.shift()(e)}var Q=[],K=0,tt=0;function et(t){this.Db=t,this.zb=t-24,this.Ub=function(t){M[this.zb+4>>2>>>0]=t},this.Eb=function(){return M[this.zb+4>>2>>>0]},this.Sb=function(t){M[this.zb+8>>2>>>0]=t},this.Wb=function(){return M[this.zb+8>>2>>>0]},this.Tb=function(){E[this.zb>>2>>>0]=0},this.Ib=function(t){S[this.zb+12>>0>>>0]=t?1:0},this.Pb=function(){return 0!=S[this.zb+12>>0>>>0]},this.Jb=function(t){S[this.zb+13>>0>>>0]=t?1:0},this.Lb=function(){return 0!=S[this.zb+13>>0>>>0]},this.Rb=function(t,e){this.Fb(0),this.Ub(t),this.Sb(e),this.Tb(),this.Ib(!1),this.Jb(!1)},this.Nb=function(){E[this.zb>>2>>>0]+=1},this.Xb=function(){var t=E[this.zb>>2>>>0];return E[this.zb>>2>>>0]=t-1,1===t},this.Fb=function(t){M[this.zb+16>>2>>>0]=t},this.Ob=function(){return M[this.zb+16>>2>>>0]},this.Qb=function(){if(Mt(this.Eb()))return M[this.Db>>2>>>0];var t=this.Ob();return 0!==t?t:this.Db}}function nt(t){return vt(new et(t).zb)}var rt=[];function at(t){var e=rt[t];return e||(t>=rt.length&&(rt.length=t+1),rt[t]=e=U.get(t)),e}function it(t){var e=D(t)+1,n=gt(e);return n&&k(t,S,n,e),n}var ot={};function ut(){if(!ct){var t,e={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:("object"==typeof navigator&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:p||"./this.program"};for(t in ot)void 0===ot[t]?delete e[t]:e[t]=ot[t];var n=[];for(t in e)n.push(t+"="+e[t]);ct=n}return ct}var ct,st=[null,[],[]];function lt(t,e){var n=st[t];0===e||10===e?((1===t?v:w)(R(n,0)),n.length=0):n.push(e)}var ft=0;function pt(t){return 0==t%4&&(0!=t%100||0==t%400)}var ht=[31,29,31,30,31,30,31,31,30,31,30,31],dt=[31,28,31,30,31,30,31,31,30,31,30,31];function yt(t,e,n,r){function a(t,e,n){for(t="number"==typeof t?t.toString():t||"";t.length<e;)t=n[0]+t;return t}function i(t,e){return a(t,e,"0")}function o(t,e){function n(t){return 0>t?-1:0<t?1:0}var r;return 0===(r=n(t.getFullYear()-e.getFullYear()))&&0===(r=n(t.getMonth()-e.getMonth()))&&(r=n(t.getDate()-e.getDate())),r}function u(t){switch(t.getDay()){case 0:return new Date(t.getFullYear()-1,11,29);case 1:return t;case 2:return new Date(t.getFullYear(),0,3);case 3:return new Date(t.getFullYear(),0,2);case 4:return new Date(t.getFullYear(),0,1);case 5:return new Date(t.getFullYear()-1,11,31);case 6:return new Date(t.getFullYear()-1,11,30)}}function c(t){var e=t.Bb;for(t=new Date(new Date(t.Cb+1900,0,1).getTime());0<e;){var n=t.getMonth(),r=(pt(t.getFullYear())?ht:dt)[n];if(!(e>r-t.getDate())){t.setDate(t.getDate()+e);break}e-=r-t.getDate()+1,t.setDate(1),11>n?t.setMonth(n+1):(t.setMonth(0),t.setFullYear(t.getFullYear()+1))}return n=new Date(t.getFullYear()+1,0,4),e=u(new Date(t.getFullYear(),0,4)),n=u(n),0>=o(e,t)?0>=o(n,t)?t.getFullYear()+1:t.getFullYear():t.getFullYear()-1}var s=E[r+40>>2>>>0];for(var l in r={$b:E[r>>2>>>0],Zb:E[r+4>>2>>>0],Gb:E[r+8>>2>>>0],Kb:E[r+12>>2>>>0],Hb:E[r+16>>2>>>0],Cb:E[r+20>>2>>>0],Ab:E[r+24>>2>>>0],Bb:E[r+28>>2>>>0],bc:E[r+32>>2>>>0],Yb:E[r+36>>2>>>0],ac:s?j(s):""},n=j(n),s={"%c":"%a %b %d %H:%M:%S %Y","%D":"%m/%d/%y","%F":"%Y-%m-%d","%h":"%b","%r":"%I:%M:%S %p","%R":"%H:%M","%T":"%H:%M:%S","%x":"%m/%d/%y","%X":"%H:%M:%S","%Ec":"%c","%EC":"%C","%Ex":"%m/%d/%y","%EX":"%H:%M:%S","%Ey":"%y","%EY":"%Y","%Od":"%d","%Oe":"%e","%OH":"%H","%OI":"%I","%Om":"%m","%OM":"%M","%OS":"%S","%Ou":"%u","%OU":"%U","%OV":"%V","%Ow":"%w","%OW":"%W","%Oy":"%y"})n=n.replace(new RegExp(l,"g"),s[l]);var f="Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),p="January February March April May June July August September October November December".split(" ");for(l in s={"%a":function(t){return f[t.Ab].substring(0,3)},"%A":function(t){return f[t.Ab]},"%b":function(t){return p[t.Hb].substring(0,3)},"%B":function(t){return p[t.Hb]},"%C":function(t){return i((t.Cb+1900)/100|0,2)},"%d":function(t){return i(t.Kb,2)},"%e":function(t){return a(t.Kb,2," ")},"%g":function(t){return c(t).toString().substring(2)},"%G":function(t){return c(t)},"%H":function(t){return i(t.Gb,2)},"%I":function(t){return 0==(t=t.Gb)?t=12:12<t&&(t-=12),i(t,2)},"%j":function(t){for(var e=0,n=0;n<=t.Hb-1;e+=(pt(t.Cb+1900)?ht:dt)[n++]);return i(t.Kb+e,3)},"%m":function(t){return i(t.Hb+1,2)},"%M":function(t){return i(t.Zb,2)},"%n":function(){return"\\n"},"%p":function(t){return 0<=t.Gb&&12>t.Gb?"AM":"PM"},"%S":function(t){return i(t.$b,2)},"%t":function(){return"\\t"},"%u":function(t){return t.Ab||7},"%U":function(t){return i(Math.floor((t.Bb+7-t.Ab)/7),2)},"%V":function(t){var e=Math.floor((t.Bb+7-(t.Ab+6)%7)/7);if(2>=(t.Ab+371-t.Bb-2)%7&&e++,e)53==e&&(4==(n=(t.Ab+371-t.Bb)%7)||3==n&&pt(t.Cb)||(e=1));else{e=52;var n=(t.Ab+7-t.Bb-1)%7;(4==n||5==n&&pt(t.Cb%400-1))&&e++}return i(e,2)},"%w":function(t){return t.Ab},"%W":function(t){return i(Math.floor((t.Bb+7-(t.Ab+6)%7)/7),2)},"%y":function(t){return(t.Cb+1900).toString().substring(2)},"%Y":function(t){return t.Cb+1900},"%z":function(t){var e=0<=(t=t.Yb);return t=Math.abs(t)/60,(e?"+":"-")+String("0000"+(t/60*100+t%60)).slice(-4)},"%Z":function(t){return t.ac},"%%":function(){return"%"}},n=n.replace(/%%/g,"\\0\\0"),s)n.includes(l)&&(n=n.replace(new RegExp(l,"g"),s[l](r)));return l=function(t){var e=Array(D(t)+1);return k(t,e,0,e.length),e}(n=n.replace(/\\0\\0/g,"%")),l.length>e?0:(S.set(l,t>>>0),l.length-1)}var bt={a:function(t){return gt(t+24)+24},m:function(t){return(t=new et(t)).Pb()||(t.Ib(!0),K--),t.Jb(!1),Q.push(t),t.Nb(),t.Qb()},ia:function(t){throw w("Unexpected exception thrown, this is not properly supported - aborting"),C=!0,t},w:function(){Ot(0);var t=Q.pop();if(t.Xb()&&!t.Lb()){var e=t.Wb();e&&at(e)(t.Db),nt(t.Db)}tt=0},d:function(){var t=tt;if(!t)return ft=0;var e=new et(t);e.Fb(t);var n=e.Eb();if(!n)return ft=0,t;for(var r=Array.prototype.slice.call(arguments),a=0;a<r.length;a++){var i=r[a];if(0===i||i===n)break;if(Et(i,n,e.zb+16))return ft=i,t}return ft=n,t},k:function(){var t=tt;if(!t)return ft=0;var e=new et(t);e.Fb(t);var n=e.Eb();if(!n)return ft=0,t;for(var r=Array.prototype.slice.call(arguments),a=0;a<r.length;a++){var i=r[a];if(0===i||i===n)break;if(Et(i,n,e.zb+16))return ft=i,t}return ft=n,t},g:function(){var t=tt;if(!t)return ft=0;var e=new et(t);e.Fb(t);var n=e.Eb();if(!n)return ft=0,t;for(var r=Array.prototype.slice.call(arguments),a=0;a<r.length;a++){var i=r[a];if(0===i||i===n)break;if(Et(i,n,e.zb+16))return ft=i,t}return ft=n,t},s:nt,L:function(){var t=Q.pop();t||V("no exception to throw");var e=t.Db;throw t.Lb()||(Q.push(t),t.Jb(!0),t.Ib(!1),K++),tt=e,e},b:function(t,e,n){throw new et(t).Rb(e,n),tt=t,K++,t},la:function(){return K},i:function(t){throw tt||(tt=t),t},H:function(){return 0},Ba:function(){},pa:function(){},ra:function(){},ka:function(){return 0},za:function(){},ua:function(){},ya:function(){},R:function(){},qa:function(){},na:function(){},Aa:function(){},oa:function(){},Ha:function(){},Ja:function(){V("To use dlopen, you need enable dynamic linking, see https://github.com/emscripten-core/emscripten/wiki/Linking")},Ia:function(){V("To use dlopen, you need enable dynamic linking, see https://github.com/emscripten-core/emscripten/wiki/Linking")},S:function(){return Date.now()},Ca:function(){return!0},Da:function(t,e){t=new Date(1e3*(M[t>>>2]+4294967296*E[t+4>>>2])),E[e>>2>>>0]=t.getUTCSeconds(),E[e+4>>2>>>0]=t.getUTCMinutes(),E[e+8>>2>>>0]=t.getUTCHours(),E[e+12>>2>>>0]=t.getUTCDate(),E[e+16>>2>>>0]=t.getUTCMonth(),E[e+20>>2>>>0]=t.getUTCFullYear()-1900,E[e+24>>2>>>0]=t.getUTCDay(),E[e+28>>2>>>0]=(t.getTime()-Date.UTC(t.getUTCFullYear(),0,1,0,0,0,0))/864e5|0},Ea:function(t,e){t=new Date(1e3*(M[t>>>2]+4294967296*E[t+4>>>2])),E[e>>2>>>0]=t.getSeconds(),E[e+4>>2>>>0]=t.getMinutes(),E[e+8>>2>>>0]=t.getHours(),E[e+12>>2>>>0]=t.getDate(),E[e+16>>2>>>0]=t.getMonth(),E[e+20>>2>>>0]=t.getFullYear()-1900,E[e+24>>2>>>0]=t.getDay();var n=new Date(t.getFullYear(),0,1);E[e+28>>2>>>0]=(t.getTime()-n.getTime())/864e5|0,E[e+36>>2>>>0]=-60*t.getTimezoneOffset();var r=new Date(t.getFullYear(),6,1).getTimezoneOffset();n=n.getTimezoneOffset(),E[e+32>>2>>>0]=0|(r!=n&&t.getTimezoneOffset()==Math.min(n,r))},Fa:function(t){var e=new Date(E[t+20>>2>>>0]+1900,E[t+16>>2>>>0],E[t+12>>2>>>0],E[t+8>>2>>>0],E[t+4>>2>>>0],E[t>>2>>>0],0),n=E[t+32>>2>>>0],r=e.getTimezoneOffset(),a=new Date(e.getFullYear(),0,1),i=new Date(e.getFullYear(),6,1).getTimezoneOffset(),o=a.getTimezoneOffset(),u=Math.min(o,i);return 0>n?E[t+32>>2>>>0]=Number(i!=o&&u==r):0<n!=(u==r)&&(i=Math.max(o,i),e.setTime(e.getTime()+6e4*((0<n?u:i)-r))),E[t+24>>2>>>0]=e.getDay(),E[t+28>>2>>>0]=(e.getTime()-a.getTime())/864e5|0,E[t>>2>>>0]=e.getSeconds(),E[t+4>>2>>>0]=e.getMinutes(),E[t+8>>2>>>0]=e.getHours(),E[t+12>>2>>>0]=e.getDate(),E[t+16>>2>>>0]=e.getMonth(),e.getTime()/1e3|0},sa:function(){return-52},ta:function(){},Ga:function t(e,n,r){t.Vb||(t.Vb=!0,function(t,e,n){function r(t){return(t=t.toTimeString().match(/\\(([A-Za-z ]+)\\)$/))?t[1]:"GMT"}var a=(new Date).getFullYear(),i=new Date(a,0,1),o=new Date(a,6,1);a=i.getTimezoneOffset();var u=o.getTimezoneOffset();E[t>>2>>>0]=60*Math.max(a,u),E[e>>2>>>0]=Number(a!=u),t=r(i),e=r(o),t=it(t),e=it(e),u<a?(M[n>>2>>>0]=t,M[n+4>>2>>>0]=e):(M[n>>2>>>0]=e,M[n+4>>2>>>0]=t)}(e,n,r))},B:function(){V("")},ma:function(){return 4294901760},I:b?()=>{var t=process.hrtime();return 1e3*t[0]+t[1]/1e6}:()=>performance.now(),xa:function(t,e,n){T.copyWithin(t>>>0,e>>>0,e+n>>>0)},G:function(t){var e=T.length;if(4294901760<(t>>>=0))return!1;for(var n=1;4>=n;n*=2){var r=e*(1+.2/n);r=Math.min(r,t+100663296);var a=Math;r=Math.max(t,r),a=a.min.call(a,4294901760,r+(65536-r%65536)%65536);t:{try{O.grow(a-A.byteLength+65535>>>16),P();var i=1;break t}catch(t){}i=void 0}if(i)return!0}return!1},va:function(t,e){var n=0;return ut().forEach((function(r,a){var i=e+n;for(a=M[t+4*a>>2>>>0]=i,i=0;i<r.length;++i)S[a++>>0>>>0]=r.charCodeAt(i);S[a>>0>>>0]=0,n+=r.length+1})),0},wa:function(t,e){var n=ut();M[t>>2>>>0]=n.length;var r=0;return n.forEach((function(t){r+=t.length+1})),M[e>>2>>>0]=r,0},ba:function(t){_||0<L||(_t(),Z(W),wt(0),st[1].length&&lt(1,10),st[2].length&&lt(2,10)),_||0<L||(e.onExit&&e.onExit(t),C=!0),h(t,new J(t))},E:function(){return 52},Q:function(){return 52},ca:function(){return 70},P:function(t,e,n,r){for(var a=0,i=0;i<n;i++){var o=M[e>>2>>>0],u=M[e+4>>2>>>0];e+=8;for(var c=0;c<u;c++)lt(t,T[o+c>>>0]);a+=u}return M[r>>2>>>0]=a,0},c:function(){return ft},ja:function t(e,r){t.Mb||(t.Mb=function(){if("object"==typeof crypto&&"function"==typeof crypto.getRandomValues){var t=new Uint8Array(1);return()=>(crypto.getRandomValues(t),t[0])}if(b)try{var e=n(Object(function(){var t=new Error("Cannot find module \'crypto\'");throw t.code="MODULE_NOT_FOUND",t}()));return()=>e.randomBytes(1)[0]}catch(t){}return()=>V("randomDevice")}());for(var a=0;a<r;a++)S[e+a>>0>>>0]=t.Mb();return 0},ea:function(t,e,n){var r=At();try{return at(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;Ot(1,0)}},fa:function(t,e,n){var r=At();try{return at(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;Ot(1,0)}},J:function(t){var e=At();try{return at(t)()}catch(t){if(St(e),t!==t+0)throw t;Ot(1,0)}},e:function(t,e){var n=At();try{return at(t)(e)}catch(t){if(St(n),t!==t+0)throw t;Ot(1,0)}},N:function(t,e,n){var r=At();try{return at(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;Ot(1,0)}},O:function(t,e,n){var r=At();try{return at(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;Ot(1,0)}},j:function(t,e,n){var r=At();try{return at(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;Ot(1,0)}},o:function(t,e,n,r){var a=At();try{return at(t)(e,n,r)}catch(t){if(St(a),t!==t+0)throw t;Ot(1,0)}},p:function(t,e,n,r,a){var i=At();try{return at(t)(e,n,r,a)}catch(t){if(St(i),t!==t+0)throw t;Ot(1,0)}},M:function(t,e,n,r,a,i){var o=At();try{return at(t)(e,n,r,a,i)}catch(t){if(St(o),t!==t+0)throw t;Ot(1,0)}},r:function(t,e,n,r,a,i){var o=At();try{return at(t)(e,n,r,a,i)}catch(t){if(St(o),t!==t+0)throw t;Ot(1,0)}},v:function(t,e,n,r,a,i,o){var u=At();try{return at(t)(e,n,r,a,i,o)}catch(t){if(St(u),t!==t+0)throw t;Ot(1,0)}},K:function(t,e,n,r,a,i,o,u){var c=At();try{return at(t)(e,n,r,a,i,o,u)}catch(t){if(St(c),t!==t+0)throw t;Ot(1,0)}},D:function(t,e,n,r,a,i,o,u,c,s,l,f){var p=At();try{return at(t)(e,n,r,a,i,o,u,c,s,l,f)}catch(t){if(St(p),t!==t+0)throw t;Ot(1,0)}},X:function(t,e,n,r,a,i,o,u){var c=At();try{return Ft(t,e,n,r,a,i,o,u)}catch(t){if(St(c),t!==t+0)throw t;Ot(1,0)}},V:function(t,e,n,r,a,i,o){var u=At();try{return xt(t,e,n,r,a,i,o)}catch(t){if(St(u),t!==t+0)throw t;Ot(1,0)}},U:function(t,e,n,r,a){var i=At();try{return It(t,e,n,r,a)}catch(t){if(St(i),t!==t+0)throw t;Ot(1,0)}},Z:function(t,e,n,r){var a=At();try{return Pt(t,e,n,r)}catch(t){if(St(a),t!==t+0)throw t;Ot(1,0)}},W:function(t){var e=At();try{return Ct(t)}catch(t){if(St(e),t!==t+0)throw t;Ot(1,0)}},Y:function(t,e){var n=At();try{return Ut(t,e)}catch(t){if(St(n),t!==t+0)throw t;Ot(1,0)}},T:function(t,e,n){var r=At();try{return Rt(t,e,n)}catch(t){if(St(r),t!==t+0)throw t;Ot(1,0)}},f:function(t){var e=At();try{at(t)()}catch(t){if(St(e),t!==t+0)throw t;Ot(1,0)}},q:function(t,e){var n=At();try{at(t)(e)}catch(t){if(St(n),t!==t+0)throw t;Ot(1,0)}},h:function(t,e,n){var r=At();try{at(t)(e,n)}catch(t){if(St(r),t!==t+0)throw t;Ot(1,0)}},da:function(t,e,n,r){var a=At();try{at(t)(e,n,r)}catch(t){if(St(a),t!==t+0)throw t;Ot(1,0)}},l:function(t,e,n,r){var a=At();try{at(t)(e,n,r)}catch(t){if(St(a),t!==t+0)throw t;Ot(1,0)}},t:function(t,e,n,r,a){var i=At();try{at(t)(e,n,r,a)}catch(t){if(St(i),t!==t+0)throw t;Ot(1,0)}},u:function(t,e,n,r,a,i){var o=At();try{at(t)(e,n,r,a,i)}catch(t){if(St(o),t!==t+0)throw t;Ot(1,0)}},x:function(t,e,n,r,a,i,o){var u=At();try{at(t)(e,n,r,a,i,o)}catch(t){if(St(u),t!==t+0)throw t;Ot(1,0)}},z:function(t,e,n,r,a,i,o,u){var c=At();try{at(t)(e,n,r,a,i,o,u)}catch(t){if(St(c),t!==t+0)throw t;Ot(1,0)}},ga:function(t,e,n,r,a,i,o,u,c){var s=At();try{at(t)(e,n,r,a,i,o,u,c)}catch(t){if(St(s),t!==t+0)throw t;Ot(1,0)}},A:function(t,e,n,r,a,i,o,u,c,s,l){var f=At();try{at(t)(e,n,r,a,i,o,u,c,s,l)}catch(t){if(St(f),t!==t+0)throw t;Ot(1,0)}},C:function(t,e,n,r,a,i,o,u,c,s,l,f,p,h,d,y){var b=At();try{at(t)(e,n,r,a,i,o,u,c,s,l,f,p,h,d,y)}catch(t){if(St(b),t!==t+0)throw t;Ot(1,0)}},aa:function(t,e,n,r,a,i,o,u){var c=At();try{jt(t,e,n,r,a,i,o,u)}catch(t){if(St(c),t!==t+0)throw t;Ot(1,0)}},_:function(t,e,n,r,a,i,o,u,c,s,l,f){var p=At();try{Dt(t,e,n,r,a,i,o,u,c,s,l,f)}catch(t){if(St(p),t!==t+0)throw t;Ot(1,0)}},$:function(t,e,n,r,a,i){var o=At();try{kt(t,e,n,r,a,i)}catch(t){if(St(o),t!==t+0)throw t;Ot(1,0)}},n:function(t){return t},F:function(t){ft=t},ha:yt,y:function(t,e,n,r){return yt(t,e,n,r)}};!function(){function t(t){e.asm=t.exports,O=e.asm.Ka,P(),U=e.asm.ib,I.unshift(e.asm.La),B--,e.monitorRunDependencies&&e.monitorRunDependencies(B),0==B&&(null!==G&&(clearInterval(G),G=null),N&&(t=N,N=null,t()))}function n(e){t(e.instance)}function r(t){return function(){if(!g&&(d||y)){if("function"==typeof fetch&&!Y.startsWith("file://"))return fetch(Y,{credentials:"same-origin"}).then((function(t){if(!t.ok)throw"failed to load wasm binary file at \'"+Y+"\'";return t.arrayBuffer()})).catch((function(){return X()}));if(o)return new Promise((function(t,e){o(Y,(function(e){t(new Uint8Array(e))}),e)}))}return Promise.resolve().then((function(){return X()}))}().then((function(t){return WebAssembly.instantiate(t,i)})).then((function(t){return t})).then(t,(function(t){w("failed to asynchronously prepare wasm: "+t),V(t)}))}var i={a:bt};if(B++,e.monitorRunDependencies&&e.monitorRunDependencies(B),e.instantiateWasm)try{return e.instantiateWasm(i,t)}catch(t){return w("Module.instantiateWasm callback failed with error: "+t),!1}(g||"function"!=typeof WebAssembly.instantiateStreaming||$()||Y.startsWith("file://")||b||"function"!=typeof fetch?r(n):fetch(Y,{credentials:"same-origin"}).then((function(t){return WebAssembly.instantiateStreaming(t,i).then(n,(function(t){return w("wasm streaming compile failed: "+t),w("falling back to ArrayBuffer instantiation"),r(n)}))}))).catch(a)}(),e.___wasm_call_ctors=function(){return(e.___wasm_call_ctors=e.asm.La).apply(null,arguments)},e._OrtInit=function(){return(e._OrtInit=e.asm.Ma).apply(null,arguments)},e._OrtCreateSessionOptions=function(){return(e._OrtCreateSessionOptions=e.asm.Na).apply(null,arguments)},e._OrtAppendExecutionProvider=function(){return(e._OrtAppendExecutionProvider=e.asm.Oa).apply(null,arguments)},e._OrtAddSessionConfigEntry=function(){return(e._OrtAddSessionConfigEntry=e.asm.Pa).apply(null,arguments)},e._OrtReleaseSessionOptions=function(){return(e._OrtReleaseSessionOptions=e.asm.Qa).apply(null,arguments)},e._OrtCreateSession=function(){return(e._OrtCreateSession=e.asm.Ra).apply(null,arguments)},e._OrtReleaseSession=function(){return(e._OrtReleaseSession=e.asm.Sa).apply(null,arguments)},e._OrtGetInputCount=function(){return(e._OrtGetInputCount=e.asm.Ta).apply(null,arguments)},e._OrtGetOutputCount=function(){return(e._OrtGetOutputCount=e.asm.Ua).apply(null,arguments)},e._OrtGetInputName=function(){return(e._OrtGetInputName=e.asm.Va).apply(null,arguments)},e._OrtGetOutputName=function(){return(e._OrtGetOutputName=e.asm.Wa).apply(null,arguments)},e._OrtFree=function(){return(e._OrtFree=e.asm.Xa).apply(null,arguments)},e._OrtCreateTensor=function(){return(e._OrtCreateTensor=e.asm.Ya).apply(null,arguments)},e._OrtGetTensorData=function(){return(e._OrtGetTensorData=e.asm.Za).apply(null,arguments)},e._OrtReleaseTensor=function(){return(e._OrtReleaseTensor=e.asm._a).apply(null,arguments)},e._OrtCreateRunOptions=function(){return(e._OrtCreateRunOptions=e.asm.$a).apply(null,arguments)},e._OrtAddRunConfigEntry=function(){return(e._OrtAddRunConfigEntry=e.asm.ab).apply(null,arguments)},e._OrtReleaseRunOptions=function(){return(e._OrtReleaseRunOptions=e.asm.bb).apply(null,arguments)},e._OrtRun=function(){return(e._OrtRun=e.asm.cb).apply(null,arguments)},e._OrtEndProfiling=function(){return(e._OrtEndProfiling=e.asm.db).apply(null,arguments)};var mt,gt=e._malloc=function(){return(gt=e._malloc=e.asm.eb).apply(null,arguments)},vt=e._free=function(){return(vt=e._free=e.asm.fb).apply(null,arguments)},wt=e._fflush=function(){return(wt=e._fflush=e.asm.gb).apply(null,arguments)},_t=e.___funcs_on_exit=function(){return(_t=e.___funcs_on_exit=e.asm.hb).apply(null,arguments)},Ot=e._setThrew=function(){return(Ot=e._setThrew=e.asm.jb).apply(null,arguments)},At=e.stackSave=function(){return(At=e.stackSave=e.asm.kb).apply(null,arguments)},St=e.stackRestore=function(){return(St=e.stackRestore=e.asm.lb).apply(null,arguments)},Tt=e.stackAlloc=function(){return(Tt=e.stackAlloc=e.asm.mb).apply(null,arguments)},Et=e.___cxa_can_catch=function(){return(Et=e.___cxa_can_catch=e.asm.nb).apply(null,arguments)},Mt=e.___cxa_is_pointer_type=function(){return(Mt=e.___cxa_is_pointer_type=e.asm.ob).apply(null,arguments)},Ct=e.dynCall_j=function(){return(Ct=e.dynCall_j=e.asm.pb).apply(null,arguments)},xt=e.dynCall_iiiiij=function(){return(xt=e.dynCall_iiiiij=e.asm.qb).apply(null,arguments)},Rt=e.dynCall_jii=function(){return(Rt=e.dynCall_jii=e.asm.rb).apply(null,arguments)},jt=e.dynCall_viiiiij=function(){return(jt=e.dynCall_viiiiij=e.asm.sb).apply(null,arguments)},kt=e.dynCall_vjji=function(){return(kt=e.dynCall_vjji=e.asm.tb).apply(null,arguments)},Dt=e.dynCall_viiijjjii=function(){return(Dt=e.dynCall_viiijjjii=e.asm.ub).apply(null,arguments)},Pt=e.dynCall_iij=function(){return(Pt=e.dynCall_iij=e.asm.vb).apply(null,arguments)},Ut=e.dynCall_ji=function(){return(Ut=e.dynCall_ji=e.asm.wb).apply(null,arguments)},Ft=e.dynCall_iiiiiij=function(){return(Ft=e.dynCall_iiiiiij=e.asm.xb).apply(null,arguments)},It=e.dynCall_iiij=function(){return(It=e.dynCall_iiij=e.asm.yb).apply(null,arguments)};function Wt(){function t(){if(!mt&&(mt=!0,e.calledRun=!0,!C)){if(Z(I),r(e),e.onRuntimeInitialized&&e.onRuntimeInitialized(),e.postRun)for("function"==typeof e.postRun&&(e.postRun=[e.postRun]);e.postRun.length;){var t=e.postRun.shift();H.unshift(t)}Z(H)}}if(!(0<B)){if(e.preRun)for("function"==typeof e.preRun&&(e.preRun=[e.preRun]);e.preRun.length;)z();Z(F),0<B||(e.setStatus?(e.setStatus("Running..."),setTimeout((function(){setTimeout((function(){e.setStatus("")}),1),t()}),1)):t())}}if(e.UTF8ToString=j,e.stringToUTF8=function(t,e,n){return k(t,T,e,n)},e.lengthBytesUTF8=D,e.stackSave=At,e.stackRestore=St,e.stackAlloc=Tt,N=function t(){mt||Wt(),mt||(N=t)},e.preInit)for("function"==typeof e.preInit&&(e.preInit=[e.preInit]);0<e.preInit.length;)e.preInit.pop()();return Wt(),t.ready});t.exports=r},967:(t,e)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.iterateExtraOptions=void 0,e.iterateExtraOptions=(t,n,r,a)=>{if("object"==typeof t&&null!==t){if(r.has(t))throw new Error("Circular reference in options");r.add(t)}Object.entries(t).forEach((([t,i])=>{const o=n?n+t:t;if("object"==typeof i)(0,e.iterateExtraOptions)(i,o+".",r,a);else if("string"==typeof i||"number"==typeof i)a(o,i.toString());else{if("boolean"!=typeof i)throw new Error("Can\'t handle extra config type: "+typeof i);a(o,i?"1":"0")}}))}},586:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.setRunOptions=void 0;const r=n(967),a=n(983),i=n(361);e.setRunOptions=t=>{const e=(0,i.getInstance)();let n=0;const o=[],u=t||{};try{if(void 0===(null==t?void 0:t.logSeverityLevel))u.logSeverityLevel=2;else if("number"!=typeof t.logSeverityLevel||!Number.isInteger(t.logSeverityLevel)||t.logSeverityLevel<0||t.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${t.logSeverityLevel}`);if(void 0===(null==t?void 0:t.logVerbosityLevel))u.logVerbosityLevel=0;else if("number"!=typeof t.logVerbosityLevel||!Number.isInteger(t.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${t.logVerbosityLevel}`);void 0===(null==t?void 0:t.terminate)&&(u.terminate=!1);let i=0;if(void 0!==(null==t?void 0:t.tag)&&(i=(0,a.allocWasmString)(t.tag,o)),n=e._OrtCreateRunOptions(u.logSeverityLevel,u.logVerbosityLevel,!!u.terminate,i),0===n)throw new Error("Can\'t create run options");return void 0!==(null==t?void 0:t.extra)&&(0,r.iterateExtraOptions)(t.extra,"",new WeakSet,((t,r)=>{const i=(0,a.allocWasmString)(t,o),u=(0,a.allocWasmString)(r,o);if(0!==e._OrtAddRunConfigEntry(n,i,u))throw new Error(`Can\'t set a run config entry: ${t} - ${r}`)})),[n,o]}catch(t){throw 0!==n&&e._OrtReleaseRunOptions(n),o.forEach(e._free),t}}},919:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.setSessionOptions=void 0;const r=n(967),a=n(983),i=n(361);e.setSessionOptions=t=>{const e=(0,i.getInstance)();let n=0;const o=[],u=t||{};(t=>{t.extra||(t.extra={}),t.extra.session||(t.extra.session={});const e=t.extra.session;e.use_ort_model_bytes_directly||(e.use_ort_model_bytes_directly="1")})(u);try{void 0===(null==t?void 0:t.graphOptimizationLevel)&&(u.graphOptimizationLevel="all");const c=(t=>{switch(t){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${t}`)}})(u.graphOptimizationLevel);void 0===(null==t?void 0:t.enableCpuMemArena)&&(u.enableCpuMemArena=!0),void 0===(null==t?void 0:t.enableMemPattern)&&(u.enableMemPattern=!0),void 0===(null==t?void 0:t.executionMode)&&(u.executionMode="sequential");const s=(t=>{switch(t){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${t}`)}})(u.executionMode);let l=0;if(void 0!==(null==t?void 0:t.logId)&&(l=(0,a.allocWasmString)(t.logId,o)),void 0===(null==t?void 0:t.logSeverityLevel))u.logSeverityLevel=2;else if("number"!=typeof t.logSeverityLevel||!Number.isInteger(t.logSeverityLevel)||t.logSeverityLevel<0||t.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${t.logSeverityLevel}`);if(void 0===(null==t?void 0:t.logVerbosityLevel))u.logVerbosityLevel=0;else if("number"!=typeof t.logVerbosityLevel||!Number.isInteger(t.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${t.logVerbosityLevel}`);if(void 0===(null==t?void 0:t.enableProfiling)&&(u.enableProfiling=!1),n=e._OrtCreateSessionOptions(c,!!u.enableCpuMemArena,!!u.enableMemPattern,s,!!u.enableProfiling,0,l,u.logSeverityLevel,u.logVerbosityLevel),0===n)throw new Error("Can\'t create session options");return(null==t?void 0:t.executionProviders)&&((t,e,n)=>{for(const r of e){let e="string"==typeof r?r:r.name;switch(e){case"xnnpack":e="XNNPACK";break;case"wasm":case"cpu":continue;default:throw new Error(`not supported EP: ${e}`)}const o=(0,a.allocWasmString)(e,n);if(0!==(0,i.getInstance)()._OrtAppendExecutionProvider(t,o))throw new Error(`Can\'t append execution provider: ${e}`)}})(n,t.executionProviders,o),void 0!==(null==t?void 0:t.extra)&&(0,r.iterateExtraOptions)(t.extra,"",new WeakSet,((t,r)=>{const i=(0,a.allocWasmString)(t,o),u=(0,a.allocWasmString)(r,o);if(0!==e._OrtAddSessionConfigEntry(n,i,u))throw new Error(`Can\'t set a session config entry: ${t} - ${r}`)})),[n,o]}catch(t){throw 0!==n&&e._OrtReleaseSessionOptions(n),o.forEach(e._free),t}}},983:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.allocWasmString=void 0;const r=n(361);e.allocWasmString=(t,e)=>{const n=(0,r.getInstance)(),a=n.lengthBytesUTF8(t)+1,i=n._malloc(a);return n.stringToUTF8(t,i,a),e.push(i),i}},349:(t,e,n)=>{"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.extractTransferableBuffers=e.endProfiling=e.run=e.releaseSession=e.createSession=e.createSessionFinalize=e.createSessionAllocate=e.initOrt=void 0;const r=n(586),a=n(919),i=n(983),o=n(361);e.initOrt=(t,e)=>{const n=(0,o.getInstance)()._OrtInit(t,e);if(0!==n)throw new Error(`Can\'t initialize onnxruntime. error code = ${n}`)};const u=new Map;e.createSessionAllocate=t=>{const e=(0,o.getInstance)(),n=e._malloc(t.byteLength);return e.HEAPU8.set(t,n),[n,t.byteLength]},e.createSessionFinalize=(t,e)=>{const n=(0,o.getInstance)();let r=0,i=0,c=[];try{if([i,c]=(0,a.setSessionOptions)(e),r=n._OrtCreateSession(t[0],t[1],i),0===r)throw new Error("Can\'t create a session")}finally{n._free(t[0]),n._OrtReleaseSessionOptions(i),c.forEach(n._free)}const s=n._OrtGetInputCount(r),l=n._OrtGetOutputCount(r),f=[],p=[],h=[],d=[];for(let t=0;t<s;t++){const e=n._OrtGetInputName(r,t);if(0===e)throw new Error("Can\'t get an input name");p.push(e),f.push(n.UTF8ToString(e))}for(let t=0;t<l;t++){const e=n._OrtGetOutputName(r,t);if(0===e)throw new Error("Can\'t get an output name");d.push(e),h.push(n.UTF8ToString(e))}return u.set(r,[r,p,d]),[r,f,h]},e.createSession=(t,n)=>{const r=(0,e.createSessionAllocate)(t);return(0,e.createSessionFinalize)(r,n)},e.releaseSession=t=>{const e=(0,o.getInstance)(),n=u.get(t);if(!n)throw new Error("invalid session id");const r=n[0],a=n[1],i=n[2];a.forEach(e._OrtFree),i.forEach(e._OrtFree),e._OrtReleaseSession(r),u.delete(t)};const c=t=>{switch(t){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;default:throw new Error(`unsupported data type: ${t}`)}},s=t=>{switch(t){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";default:throw new Error(`unsupported data type: ${t}`)}},l=t=>{switch(t){case"float32":return Float32Array;case"uint8":case"bool":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${t}`)}};e.run=(t,e,n,a,f)=>{const p=(0,o.getInstance)(),h=u.get(t);if(!h)throw new Error("invalid session id");const d=h[0],y=h[1],b=h[2],m=e.length,g=a.length;let v=0,w=[];const _=[],O=[];try{[v,w]=(0,r.setRunOptions)(f);for(let t=0;t<m;t++){const e=n[t][0],r=n[t][1],a=n[t][2];let o,u;if(Array.isArray(a)){u=4*a.length,o=p._malloc(u),O.push(o);let t=o/4;for(let e=0;e<a.length;e++){if("string"!=typeof a[e])throw new TypeError(`tensor data at index ${e} is not a string`);p.HEAPU32[t++]=(0,i.allocWasmString)(a[e],O)}}else u=a.byteLength,o=p._malloc(u),O.push(o),p.HEAPU8.set(new Uint8Array(a.buffer,a.byteOffset,u),o);const s=p.stackSave(),l=p.stackAlloc(4*r.length);try{let t=l/4;r.forEach((e=>p.HEAP32[t++]=e));const n=p._OrtCreateTensor(c(e),o,u,l,r.length);if(0===n)throw new Error("Can\'t create a tensor");_.push(n)}finally{p.stackRestore(s)}}const t=p.stackSave(),o=p.stackAlloc(4*m),u=p.stackAlloc(4*m),h=p.stackAlloc(4*g),A=p.stackAlloc(4*g);try{let n=o/4,r=u/4,i=h/4,c=A/4;for(let t=0;t<m;t++)p.HEAPU32[n++]=_[t],p.HEAPU32[r++]=y[e[t]];for(let t=0;t<g;t++)p.HEAPU32[i++]=0,p.HEAPU32[c++]=b[a[t]];let f=p._OrtRun(d,u,o,m,A,g,h,v);const w=[];if(0===f)for(let t=0;t<g;t++){const e=p.HEAPU32[h/4+t],n=p.stackSave(),r=p.stackAlloc(16);let a,i=0;try{if(f=p._OrtGetTensorData(e,r,r+4,r+8,r+12),0!==f)throw new Error(`Can\'t access output tensor data. error code = ${f}`);let t=r/4;const o=p.HEAPU32[t++];i=p.HEAPU32[t++];const u=p.HEAPU32[t++],c=p.HEAPU32[t++],h=[];for(let t=0;t<c;t++)h.push(p.HEAPU32[u/4+t]);p._OrtFree(u);const d=0===h.length?1:h.reduce(((t,e)=>t*e));if(a=s(o),"string"===a){const t=[];let e=i/4;for(let n=0;n<d;n++){const r=p.HEAPU32[e++],a=n===d-1?void 0:p.HEAPU32[e]-r;t.push(p.UTF8ToString(r,a))}w.push([a,h,t])}else{const t=new(l(a))(d);new Uint8Array(t.buffer,t.byteOffset,t.byteLength).set(p.HEAPU8.subarray(i,i+t.byteLength)),w.push([a,h,t])}}finally{p.stackRestore(n),"string"===a&&i&&p._free(i),p._OrtReleaseTensor(e)}}if(0===f)return w;throw new Error(`failed to call OrtRun(). error code = ${f}.`)}finally{p.stackRestore(t)}}finally{_.forEach(p._OrtReleaseTensor),O.forEach(p._free),p._OrtReleaseRunOptions(v),w.forEach(p._free)}},e.endProfiling=t=>{const e=(0,o.getInstance)(),n=u.get(t);if(!n)throw new Error("invalid session id");const r=n[0],a=e._OrtEndProfiling(r);if(0===a)throw new Error("Can\'t get an profile file name");e._OrtFree(a)},e.extractTransferableBuffers=t=>{const e=[];for(const n of t){const t=n[2];!Array.isArray(t)&&t.buffer&&e.push(t.buffer)}return e}},361:function(t,e,n){"use strict";var r=this&&this.__createBinding||(Object.create?function(t,e,n,r){void 0===r&&(r=n);var a=Object.getOwnPropertyDescriptor(e,n);a&&!("get"in a?!e.__esModule:a.writable||a.configurable)||(a={enumerable:!0,get:function(){return e[n]}}),Object.defineProperty(t,r,a)}:function(t,e,n,r){void 0===r&&(r=n),t[r]=e[n]}),a=this&&this.__setModuleDefault||(Object.create?function(t,e){Object.defineProperty(t,"default",{enumerable:!0,value:e})}:function(t,e){t.default=e}),i=this&&this.__importStar||function(t){if(t&&t.__esModule)return t;var e={};if(null!=t)for(var n in t)"default"!==n&&Object.prototype.hasOwnProperty.call(t,n)&&r(e,t,n);return a(e,t),e},o=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(e,"__esModule",{value:!0}),e.dispose=e.getInstance=e.initializeWebAssembly=void 0;const u=i(n(449)),c=o(n(932)),s=n(474);let l,f=!1,p=!1,h=!1;const d=(t,e)=>e?t?"ort-wasm-simd-threaded.wasm":"ort-wasm-threaded.wasm":t?"ort-wasm-simd.wasm":"ort-wasm.wasm";e.initializeWebAssembly=async t=>{if(f)return Promise.resolve();if(p)throw new Error("multiple calls to \'initializeWebAssembly()\' detected.");if(h)throw new Error("previous call to \'initializeWebAssembly()\' failed.");p=!0;const e=t.initTimeout,r=t.numThreads,a=t.simd,i=r>1&&(()=>{try{return"undefined"!=typeof SharedArrayBuffer&&("undefined"!=typeof MessageChannel&&(new MessageChannel).port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11])))}catch(t){return!1}})(),o=a&&(()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch(t){return!1}})(),y="string"==typeof t.wasmPaths?t.wasmPaths:void 0,b=d(!1,i),m=d(o,i),g="object"==typeof t.wasmPaths?t.wasmPaths[m]:void 0;let v=!1;const w=[];if(e>0&&w.push(new Promise((t=>{setTimeout((()=>{v=!0,t()}),e)}))),w.push(new Promise(((t,e)=>{const r=i?s:c.default,a={locateFile:(t,e)=>i&&t.endsWith(".worker.js")&&"undefined"!=typeof Blob?URL.createObjectURL(new Blob([n(154)],{type:"text/javascript"})):t===b?null!=g?g:(null!=y?y:e)+m:e+t};if(i)if("undefined"==typeof Blob)a.mainScriptUrlOrBlob=u.join("/","ort-wasm-threaded.js");else{const t=`var ortWasmThreaded=(function(){var _scriptDir;return ${r.toString()}})();`;a.mainScriptUrlOrBlob=new Blob([t],{type:"text/javascript"})}r(a).then((e=>{p=!1,f=!0,l=e,t()}),(t=>{p=!1,h=!0,e(t)}))}))),await Promise.race(w),v)throw new Error(`WebAssembly backend initializing failed due to timeout: ${e}ms`)},e.getInstance=()=>{if(f&&l)return l;throw new Error("WebAssembly is not initialized yet.")},e.dispose=()=>{var t;!f||p||h||(p=!0,null===(t=l.PThread)||void 0===t||t.terminateAllThreads(),l=void 0,p=!1,f=!1,h=!0)}},154:t=>{"use strict";t.exports=\'"use strict";var e={},t="object"==typeof process&&"object"==typeof process.versions&&"string"==typeof process.versions.node;if(t){var r=require("worker_threads"),a=r.parentPort;a.on("message",(e=>onmessage({data:e})));var o=require("fs");Object.assign(global,{self:global,require:require,Module:e,location:{href:__filename},Worker:r.Worker,importScripts:function(e){(0,eval)(o.readFileSync(e,"utf8"))},postMessage:function(e){a.postMessage(e)},performance:global.performance||{now:function(){return Date.now()}}})}var s=!1,n=[],i=function(){var e=Array.prototype.slice.call(arguments).join(" ");t?o.writeSync(2,e+"\\\\n"):console.error(e)};self.alert=function(){var t=Array.prototype.slice.call(arguments).join(" ");postMessage({cmd:"alert",text:t,threadId:e._pthread_self()})},e.instantiateWasm=(t,r)=>{var a=new WebAssembly.Instance(e.wasmModule,t);return r(a),e.wasmModule=null,a.exports},self.onunhandledrejection=e=>{throw e.reason??e},self.onmessage=t=>{try{if("load"===t.data.cmd){if(e.wasmModule=t.data.wasmModule,e.wasmMemory=t.data.wasmMemory,e.buffer=e.wasmMemory.buffer,e.ENVIRONMENT_IS_PTHREAD=!0,"string"==typeof t.data.urlOrBlob)importScripts(t.data.urlOrBlob);else{var r=URL.createObjectURL(t.data.urlOrBlob);importScripts(r),URL.revokeObjectURL(r)}ortWasmThreaded(e).then((function(t){e=t}))}else if("run"===t.data.cmd){e.__performance_now_clock_drift=performance.now()-t.data.time,e.__emscripten_thread_init(t.data.pthread_ptr,0,0,1),e.establishStackSpace(),e.PThread.receiveObjectTransfer(t.data),e.PThread.threadInitTLS(),s||(n.forEach((t=>{e.executeNotifiedProxyingQueue(t)})),n=[],s=!0);try{e.invokeEntryPoint(t.data.start_routine,t.data.arg)}catch(t){if("unwind"!=t){if(!(t instanceof e.ExitStatus))throw t;e.keepRuntimeAlive()||e.__emscripten_thread_exit(t.status)}}}else"cancel"===t.data.cmd?e._pthread_self()&&e.__emscripten_thread_exit(-1):"setimmediate"===t.data.target||("processProxyingQueue"===t.data.cmd?s?e.executeNotifiedProxyingQueue(t.data.queue):n.push(t.data.queue):(i("worker.js received unknown command "+t.data.cmd),i(t.data)))}catch(t){throw i("worker.js onmessage() captured an uncaught exception: "+t),t&&t.stack&&i(t.stack),e.__emscripten_thread_crashed&&e.__emscripten_thread_crashed(),t}};\\n\'},384:()=>{},993:()=>{},908:()=>{},953:()=>{},925:()=>{},449:()=>{}},e={};function n(r){var a=e[r];if(void 0!==a)return a.exports;var i=e[r]={exports:{}};return t[r].call(i.exports,i,i.exports,n),i.exports}n.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(t){if("object"==typeof window)return window}}(),(()=>{"use strict";const t=n(349),e=n(361);self.onmessage=n=>{switch(n.data.type){case"init-wasm":(0,e.initializeWebAssembly)(n.data.in).then((()=>postMessage({type:"init-wasm"})),(t=>postMessage({type:"init-wasm",err:t})));break;case"init-ort":try{const{numThreads:e,loggingLevel:r}=n.data.in;(0,t.initOrt)(e,r),postMessage({type:"init-ort"})}catch(t){postMessage({type:"init-ort",err:t})}break;case"create_allocate":try{const{model:e}=n.data.in,r=(0,t.createSessionAllocate)(e);postMessage({type:"create_allocate",out:r})}catch(t){postMessage({type:"create_allocate",err:t})}break;case"create_finalize":try{const{modeldata:e,options:r}=n.data.in,a=(0,t.createSessionFinalize)(e,r);postMessage({type:"create_finalize",out:a})}catch(t){postMessage({type:"create_finalize",err:t})}break;case"create":try{const{model:e,options:r}=n.data.in,a=(0,t.createSession)(e,r);postMessage({type:"create",out:a})}catch(t){postMessage({type:"create",err:t})}break;case"release":try{const e=n.data.in;(0,t.releaseSession)(e),postMessage({type:"release"})}catch(t){postMessage({type:"release",err:t})}break;case"run":try{const{sessionId:e,inputIndices:r,inputs:a,outputIndices:i,options:o}=n.data.in,u=(0,t.run)(e,r,a,i,o);postMessage({type:"run",out:u},(0,t.extractTransferableBuffers)(u))}catch(t){postMessage({type:"run",err:t})}break;case"end-profiling":try{const e=n.data.in;(0,t.endProfiling)(e),postMessage({type:"end-profiling"})}catch(t){postMessage({type:"end-profiling",err:t})}}}})()})();\n',"Worker",void 0,void 0)}},477:t=>{"use strict";t.exports=function(t,e,n,r){var i=self||window;try{try{var o;try{o=new i.Blob([t])}catch(e){(o=new(i.BlobBuilder||i.WebKitBlobBuilder||i.MozBlobBuilder||i.MSBlobBuilder)).append(t),o=o.getBlob()}var a=i.URL||i.webkitURL,s=a.createObjectURL(o),u=new i[e](s,n);return a.revokeObjectURL(s),u}catch(r){return new i[e]("data:application/javascript,".concat(encodeURIComponent(t)),n)}}catch(t){if(!r)throw Error("Inline worker is not supported");return new i[e](r,n)}}},4154:t=>{"use strict";t.exports='"use strict";var e={},t="object"==typeof process&&"object"==typeof process.versions&&"string"==typeof process.versions.node;if(t){var r=require("worker_threads"),a=r.parentPort;a.on("message",(e=>onmessage({data:e})));var o=require("fs");Object.assign(global,{self:global,require:require,Module:e,location:{href:__filename},Worker:r.Worker,importScripts:function(e){(0,eval)(o.readFileSync(e,"utf8"))},postMessage:function(e){a.postMessage(e)},performance:global.performance||{now:function(){return Date.now()}}})}var s=!1,n=[],i=function(){var e=Array.prototype.slice.call(arguments).join(" ");t?o.writeSync(2,e+"\\n"):console.error(e)};self.alert=function(){var t=Array.prototype.slice.call(arguments).join(" ");postMessage({cmd:"alert",text:t,threadId:e._pthread_self()})},e.instantiateWasm=(t,r)=>{var a=new WebAssembly.Instance(e.wasmModule,t);return r(a),e.wasmModule=null,a.exports},self.onunhandledrejection=e=>{throw e.reason??e},self.onmessage=t=>{try{if("load"===t.data.cmd){if(e.wasmModule=t.data.wasmModule,e.wasmMemory=t.data.wasmMemory,e.buffer=e.wasmMemory.buffer,e.ENVIRONMENT_IS_PTHREAD=!0,"string"==typeof t.data.urlOrBlob)importScripts(t.data.urlOrBlob);else{var r=URL.createObjectURL(t.data.urlOrBlob);importScripts(r),URL.revokeObjectURL(r)}ortWasmThreaded(e).then((function(t){e=t}))}else if("run"===t.data.cmd){e.__performance_now_clock_drift=performance.now()-t.data.time,e.__emscripten_thread_init(t.data.pthread_ptr,0,0,1),e.establishStackSpace(),e.PThread.receiveObjectTransfer(t.data),e.PThread.threadInitTLS(),s||(n.forEach((t=>{e.executeNotifiedProxyingQueue(t)})),n=[],s=!0);try{e.invokeEntryPoint(t.data.start_routine,t.data.arg)}catch(t){if("unwind"!=t){if(!(t instanceof e.ExitStatus))throw t;e.keepRuntimeAlive()||e.__emscripten_thread_exit(t.status)}}}else"cancel"===t.data.cmd?e._pthread_self()&&e.__emscripten_thread_exit(-1):"setimmediate"===t.data.target||("processProxyingQueue"===t.data.cmd?s?e.executeNotifiedProxyingQueue(t.data.queue):n.push(t.data.queue):(i("worker.js received unknown command "+t.data.cmd),i(t.data)))}catch(t){throw i("worker.js onmessage() captured an uncaught exception: "+t),t&&t.stack&&i(t.stack),e.__emscripten_thread_crashed&&e.__emscripten_thread_crashed(),t}};\n'},1670:t=>{"use strict";t.exports=__WEBPACK_EXTERNAL_MODULE__1670__},7067:()=>{},1296:()=>{},1384:()=>{},3993:()=>{},908:()=>{},6953:()=>{},9925:()=>{},2806:()=>{},6449:()=>{},2850:()=>{},5381:()=>{},5686:(t,e,n)=>{"use strict";n.r(e),n.d(e,{flatbuffers:()=>r});var r={};r.Offset,r.Table,r.SIZEOF_SHORT=2,r.SIZEOF_INT=4,r.FILE_IDENTIFIER_LENGTH=4,r.SIZE_PREFIX_LENGTH=4,r.Encoding={UTF8_BYTES:1,UTF16_STRING:2},r.int32=new Int32Array(2),r.float32=new Float32Array(r.int32.buffer),r.float64=new Float64Array(r.int32.buffer),r.isLittleEndian=1===new Uint16Array(new Uint8Array([1,0]).buffer)[0],r.Long=function(t,e){this.low=0|t,this.high=0|e},r.Long.create=function(t,e){return 0==t&&0==e?r.Long.ZERO:new r.Long(t,e)},r.Long.prototype.toFloat64=function(){return(this.low>>>0)+4294967296*this.high},r.Long.prototype.equals=function(t){return this.low==t.low&&this.high==t.high},r.Long.ZERO=new r.Long(0,0),r.Builder=function(t){if(t)e=t;else var e=1024;this.bb=r.ByteBuffer.allocate(e),this.space=e,this.minalign=1,this.vtable=null,this.vtable_in_use=0,this.isNested=!1,this.object_start=0,this.vtables=[],this.vector_num_elems=0,this.force_defaults=!1},r.Builder.prototype.clear=function(){this.bb.clear(),this.space=this.bb.capacity(),this.minalign=1,this.vtable=null,this.vtable_in_use=0,this.isNested=!1,this.object_start=0,this.vtables=[],this.vector_num_elems=0,this.force_defaults=!1},r.Builder.prototype.forceDefaults=function(t){this.force_defaults=t},r.Builder.prototype.dataBuffer=function(){return this.bb},r.Builder.prototype.asUint8Array=function(){return this.bb.bytes().subarray(this.bb.position(),this.bb.position()+this.offset())},r.Builder.prototype.prep=function(t,e){t>this.minalign&&(this.minalign=t);for(var n=1+~(this.bb.capacity()-this.space+e)&t-1;this.space<n+t+e;){var i=this.bb.capacity();this.bb=r.Builder.growByteBuffer(this.bb),this.space+=this.bb.capacity()-i}this.pad(n)},r.Builder.prototype.pad=function(t){for(var e=0;e<t;e++)this.bb.writeInt8(--this.space,0)},r.Builder.prototype.writeInt8=function(t){this.bb.writeInt8(this.space-=1,t)},r.Builder.prototype.writeInt16=function(t){this.bb.writeInt16(this.space-=2,t)},r.Builder.prototype.writeInt32=function(t){this.bb.writeInt32(this.space-=4,t)},r.Builder.prototype.writeInt64=function(t){this.bb.writeInt64(this.space-=8,t)},r.Builder.prototype.writeFloat32=function(t){this.bb.writeFloat32(this.space-=4,t)},r.Builder.prototype.writeFloat64=function(t){this.bb.writeFloat64(this.space-=8,t)},r.Builder.prototype.addInt8=function(t){this.prep(1,0),this.writeInt8(t)},r.Builder.prototype.addInt16=function(t){this.prep(2,0),this.writeInt16(t)},r.Builder.prototype.addInt32=function(t){this.prep(4,0),this.writeInt32(t)},r.Builder.prototype.addInt64=function(t){this.prep(8,0),this.writeInt64(t)},r.Builder.prototype.addFloat32=function(t){this.prep(4,0),this.writeFloat32(t)},r.Builder.prototype.addFloat64=function(t){this.prep(8,0),this.writeFloat64(t)},r.Builder.prototype.addFieldInt8=function(t,e,n){(this.force_defaults||e!=n)&&(this.addInt8(e),this.slot(t))},r.Builder.prototype.addFieldInt16=function(t,e,n){(this.force_defaults||e!=n)&&(this.addInt16(e),this.slot(t))},r.Builder.prototype.addFieldInt32=function(t,e,n){(this.force_defaults||e!=n)&&(this.addInt32(e),this.slot(t))},r.Builder.prototype.addFieldInt64=function(t,e,n){!this.force_defaults&&e.equals(n)||(this.addInt64(e),this.slot(t))},r.Builder.prototype.addFieldFloat32=function(t,e,n){(this.force_defaults||e!=n)&&(this.addFloat32(e),this.slot(t))},r.Builder.prototype.addFieldFloat64=function(t,e,n){(this.force_defaults||e!=n)&&(this.addFloat64(e),this.slot(t))},r.Builder.prototype.addFieldOffset=function(t,e,n){(this.force_defaults||e!=n)&&(this.addOffset(e),this.slot(t))},r.Builder.prototype.addFieldStruct=function(t,e,n){e!=n&&(this.nested(e),this.slot(t))},r.Builder.prototype.nested=function(t){if(t!=this.offset())throw new Error("FlatBuffers: struct must be serialized inline.")},r.Builder.prototype.notNested=function(){if(this.isNested)throw new Error("FlatBuffers: object serialization must not be nested.")},r.Builder.prototype.slot=function(t){this.vtable[t]=this.offset()},r.Builder.prototype.offset=function(){return this.bb.capacity()-this.space},r.Builder.growByteBuffer=function(t){var e=t.capacity();if(3221225472&e)throw new Error("FlatBuffers: cannot grow buffer beyond 2 gigabytes.");var n=e<<1,i=r.ByteBuffer.allocate(n);return i.setPosition(n-e),i.bytes().set(t.bytes(),n-e),i},r.Builder.prototype.addOffset=function(t){this.prep(r.SIZEOF_INT,0),this.writeInt32(this.offset()-t+r.SIZEOF_INT)},r.Builder.prototype.startObject=function(t){this.notNested(),null==this.vtable&&(this.vtable=[]),this.vtable_in_use=t;for(var e=0;e<t;e++)this.vtable[e]=0;this.isNested=!0,this.object_start=this.offset()},r.Builder.prototype.endObject=function(){if(null==this.vtable||!this.isNested)throw new Error("FlatBuffers: endObject called without startObject");this.addInt32(0);for(var t=this.offset(),e=this.vtable_in_use-1;e>=0&&0==this.vtable[e];e--);for(var n=e+1;e>=0;e--)this.addInt16(0!=this.vtable[e]?t-this.vtable[e]:0);this.addInt16(t-this.object_start);var i=(n+2)*r.SIZEOF_SHORT;this.addInt16(i);var o=0,a=this.space;t:for(e=0;e<this.vtables.length;e++){var s=this.bb.capacity()-this.vtables[e];if(i==this.bb.readInt16(s)){for(var u=r.SIZEOF_SHORT;u<i;u+=r.SIZEOF_SHORT)if(this.bb.readInt16(a+u)!=this.bb.readInt16(s+u))continue t;o=this.vtables[e];break}}return o?(this.space=this.bb.capacity()-t,this.bb.writeInt32(this.space,o-t)):(this.vtables.push(this.offset()),this.bb.writeInt32(this.bb.capacity()-t,this.offset()-t)),this.isNested=!1,t},r.Builder.prototype.finish=function(t,e,n){var i=n?r.SIZE_PREFIX_LENGTH:0;if(e){var o=e;if(this.prep(this.minalign,r.SIZEOF_INT+r.FILE_IDENTIFIER_LENGTH+i),o.length!=r.FILE_IDENTIFIER_LENGTH)throw new Error("FlatBuffers: file identifier must be length "+r.FILE_IDENTIFIER_LENGTH);for(var a=r.FILE_IDENTIFIER_LENGTH-1;a>=0;a--)this.writeInt8(o.charCodeAt(a))}this.prep(this.minalign,r.SIZEOF_INT+i),this.addOffset(t),i&&this.addInt32(this.bb.capacity()-this.space),this.bb.setPosition(this.space)},r.Builder.prototype.finishSizePrefixed=function(t,e){this.finish(t,e,!0)},r.Builder.prototype.requiredField=function(t,e){var n=this.bb.capacity()-t,r=n-this.bb.readInt32(n);if(0==this.bb.readInt16(r+e))throw new Error("FlatBuffers: field "+e+" must be set")},r.Builder.prototype.startVector=function(t,e,n){this.notNested(),this.vector_num_elems=e,this.prep(r.SIZEOF_INT,t*e),this.prep(n,t*e)},r.Builder.prototype.endVector=function(){return this.writeInt32(this.vector_num_elems),this.offset()},r.Builder.prototype.createString=function(t){if(t instanceof Uint8Array)var e=t;else{e=[];for(var n=0;n<t.length;){var r,i=t.charCodeAt(n++);(r=i<55296||i>=56320?i:(i<<10)+t.charCodeAt(n++)+-56613888)<128?e.push(r):(r<2048?e.push(r>>6&31|192):(r<65536?e.push(r>>12&15|224):e.push(r>>18&7|240,r>>12&63|128),e.push(r>>6&63|128)),e.push(63&r|128))}}this.addInt8(0),this.startVector(1,e.length,1),this.bb.setPosition(this.space-=e.length),n=0;for(var o=this.space,a=this.bb.bytes();n<e.length;n++)a[o++]=e[n];return this.endVector()},r.Builder.prototype.createLong=function(t,e){return r.Long.create(t,e)},r.ByteBuffer=function(t){this.bytes_=t,this.position_=0},r.ByteBuffer.allocate=function(t){return new r.ByteBuffer(new Uint8Array(t))},r.ByteBuffer.prototype.clear=function(){this.position_=0},r.ByteBuffer.prototype.bytes=function(){return this.bytes_},r.ByteBuffer.prototype.position=function(){return this.position_},r.ByteBuffer.prototype.setPosition=function(t){this.position_=t},r.ByteBuffer.prototype.capacity=function(){return this.bytes_.length},r.ByteBuffer.prototype.readInt8=function(t){return this.readUint8(t)<<24>>24},r.ByteBuffer.prototype.readUint8=function(t){return this.bytes_[t]},r.ByteBuffer.prototype.readInt16=function(t){return this.readUint16(t)<<16>>16},r.ByteBuffer.prototype.readUint16=function(t){return this.bytes_[t]|this.bytes_[t+1]<<8},r.ByteBuffer.prototype.readInt32=function(t){return this.bytes_[t]|this.bytes_[t+1]<<8|this.bytes_[t+2]<<16|this.bytes_[t+3]<<24},r.ByteBuffer.prototype.readUint32=function(t){return this.readInt32(t)>>>0},r.ByteBuffer.prototype.readInt64=function(t){return new r.Long(this.readInt32(t),this.readInt32(t+4))},r.ByteBuffer.prototype.readUint64=function(t){return new r.Long(this.readUint32(t),this.readUint32(t+4))},r.ByteBuffer.prototype.readFloat32=function(t){return r.int32[0]=this.readInt32(t),r.float32[0]},r.ByteBuffer.prototype.readFloat64=function(t){return r.int32[r.isLittleEndian?0:1]=this.readInt32(t),r.int32[r.isLittleEndian?1:0]=this.readInt32(t+4),r.float64[0]},r.ByteBuffer.prototype.writeInt8=function(t,e){this.bytes_[t]=e},r.ByteBuffer.prototype.writeUint8=function(t,e){this.bytes_[t]=e},r.ByteBuffer.prototype.writeInt16=function(t,e){this.bytes_[t]=e,this.bytes_[t+1]=e>>8},r.ByteBuffer.prototype.writeUint16=function(t,e){this.bytes_[t]=e,this.bytes_[t+1]=e>>8},r.ByteBuffer.prototype.writeInt32=function(t,e){this.bytes_[t]=e,this.bytes_[t+1]=e>>8,this.bytes_[t+2]=e>>16,this.bytes_[t+3]=e>>24},r.ByteBuffer.prototype.writeUint32=function(t,e){this.bytes_[t]=e,this.bytes_[t+1]=e>>8,this.bytes_[t+2]=e>>16,this.bytes_[t+3]=e>>24},r.ByteBuffer.prototype.writeInt64=function(t,e){this.writeInt32(t,e.low),this.writeInt32(t+4,e.high)},r.ByteBuffer.prototype.writeUint64=function(t,e){this.writeUint32(t,e.low),this.writeUint32(t+4,e.high)},r.ByteBuffer.prototype.writeFloat32=function(t,e){r.float32[0]=e,this.writeInt32(t,r.int32[0])},r.ByteBuffer.prototype.writeFloat64=function(t,e){r.float64[0]=e,this.writeInt32(t,r.int32[r.isLittleEndian?0:1]),this.writeInt32(t+4,r.int32[r.isLittleEndian?1:0])},r.ByteBuffer.prototype.getBufferIdentifier=function(){if(this.bytes_.length<this.position_+r.SIZEOF_INT+r.FILE_IDENTIFIER_LENGTH)throw new Error("FlatBuffers: ByteBuffer is too short to contain an identifier.");for(var t="",e=0;e<r.FILE_IDENTIFIER_LENGTH;e++)t+=String.fromCharCode(this.readInt8(this.position_+r.SIZEOF_INT+e));return t},r.ByteBuffer.prototype.__offset=function(t,e){var n=t-this.readInt32(t);return e<this.readInt16(n)?this.readInt16(n+e):0},r.ByteBuffer.prototype.__union=function(t,e){return t.bb_pos=e+this.readInt32(e),t.bb=this,t},r.ByteBuffer.prototype.__string=function(t,e){t+=this.readInt32(t);var n=this.readInt32(t),i="",o=0;if(t+=r.SIZEOF_INT,e===r.Encoding.UTF8_BYTES)return this.bytes_.subarray(t,t+n);for(;o<n;){var a,s=this.readUint8(t+o++);if(s<192)a=s;else{var u=this.readUint8(t+o++);if(s<224)a=(31&s)<<6|63&u;else{var c=this.readUint8(t+o++);a=s<240?(15&s)<<12|(63&u)<<6|63&c:(7&s)<<18|(63&u)<<12|(63&c)<<6|63&this.readUint8(t+o++)}}a<65536?i+=String.fromCharCode(a):(a-=65536,i+=String.fromCharCode(55296+(a>>10),56320+(1023&a)))}return i},r.ByteBuffer.prototype.__indirect=function(t){return t+this.readInt32(t)},r.ByteBuffer.prototype.__vector=function(t){return t+this.readInt32(t)+r.SIZEOF_INT},r.ByteBuffer.prototype.__vector_len=function(t){return this.readInt32(t+this.readInt32(t))},r.ByteBuffer.prototype.__has_identifier=function(t){if(t.length!=r.FILE_IDENTIFIER_LENGTH)throw new Error("FlatBuffers: file identifier must be length "+r.FILE_IDENTIFIER_LENGTH);for(var e=0;e<r.FILE_IDENTIFIER_LENGTH;e++)if(t.charCodeAt(e)!=this.readInt8(this.position_+r.SIZEOF_INT+e))return!1;return!0},r.ByteBuffer.prototype.createLong=function(t,e){return r.Long.create(t,e)}}},__webpack_module_cache__={};function __nested_webpack_require_546802__(t){var e=__webpack_module_cache__[t];if(void 0!==e)return e.exports;var n=__webpack_module_cache__[t]={exports:{}};return __webpack_modules__[t].call(n.exports,n,n.exports,__nested_webpack_require_546802__),n.exports}__nested_webpack_require_546802__.n=t=>{var e=t&&t.__esModule?()=>t.default:()=>t;return __nested_webpack_require_546802__.d(e,{a:e}),e},__nested_webpack_require_546802__.d=(t,e)=>{for(var n in e)__nested_webpack_require_546802__.o(e,n)&&!__nested_webpack_require_546802__.o(t,n)&&Object.defineProperty(t,n,{enumerable:!0,get:e[n]})},__nested_webpack_require_546802__.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(t){if("object"==typeof window)return window}}(),__nested_webpack_require_546802__.o=(t,e)=>Object.prototype.hasOwnProperty.call(t,e),__nested_webpack_require_546802__.r=t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})};var __webpack_exports__=__nested_webpack_require_546802__(6018);return __webpack_exports__})()));
//# sourceMappingURL=ort-web.min.js.map

/***/ }),

/***/ "./src/backends/onnx.js":
/*!******************************!*\
  !*** ./src/backends/onnx.js ***!
  \******************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

let ONNX;

// TODO support more execution providers (e.g., webgpu)
const executionProviders = ['wasm'];

if (typeof process !== 'undefined') {
    // Running in a node-like environment.
    // Try to import onnxruntime-node, using onnxruntime-web as a fallback
    try {
        ONNX = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module 'onnxruntime-node'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
    } catch (err) {
        console.warn(
            "Node.js environment detected, but `onnxruntime-node` was not found. " +
            "Using `onnxruntime-web` as a fallback. We recommend installing `onnxruntime-node` " +
            "as it generally improves performance (up to 5X)."
        )

        // Fix "ReferenceError: self is not defined" bug when running directly with node
        // https://github.com/microsoft/onnxruntime/issues/13072
        // @ts-ignore
        __webpack_require__.g.self = __webpack_require__.g;

        ONNX = __webpack_require__(/*! onnxruntime-web */ "./node_modules/onnxruntime-web/dist/ort-web.min.js");

        // Disable spawning worker threads for testing.
        // This is done by setting numThreads to 1
        // https://github.com/microsoft/onnxruntime/issues/10311
        ONNX.env.wasm.numThreads = 1;
    }

    // Add `cpu` execution provider, with higher precedence that `wasm`.
    executionProviders.unshift('cpu');

} else {
    // Running in a browser-environment, so we just import `onnxruntime-web`
    ONNX = __webpack_require__(/*! onnxruntime-web */ "./node_modules/onnxruntime-web/dist/ort-web.min.js");
}

module.exports = {
    ONNX,
    executionProviders,
}


/***/ }),

/***/ "./src/env.js":
/*!********************!*\
  !*** ./src/env.js ***!
  \********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var __dirname = "/";
const fs = __webpack_require__(/*! fs */ "?569f");
const path = __webpack_require__(/*! path */ "?3f59");

const { env: onnx_env } = (__webpack_require__(/*! ./backends/onnx.js */ "./src/backends/onnx.js").ONNX);

// check if various APIs are available (depends on environment)
const CACHE_AVAILABLE = typeof self !== 'undefined' && 'caches' in self;
const FS_AVAILABLE = !isEmpty(fs); // check if file system is available
const PATH_AVAILABLE = !isEmpty(path); // check if path is available

const RUNNING_LOCALLY = FS_AVAILABLE && PATH_AVAILABLE;

// set local model path, based on available APIs
const DEFAULT_LOCAL_PATH = '/models/onnx/quantized/';
const localURL = RUNNING_LOCALLY
    ? path.join(path.dirname(__dirname), DEFAULT_LOCAL_PATH)
    : DEFAULT_LOCAL_PATH;

// First, set path to wasm files. This is needed when running in a web worker.
// https://onnxruntime.ai/docs/api/js/interfaces/Env.WebAssemblyFlags.html#wasmPaths
// We use remote wasm files by default to make it easier for newer users.
// In practice, users should probably self-host the necessary .wasm files.
onnx_env.wasm.wasmPaths = RUNNING_LOCALLY
    ? path.join(path.dirname(__dirname), '/dist/')
    : 'https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/';


// Global variable used to control exection, with suitable defaults
const env = {
    // access onnxruntime-web's environment variables
    onnx: onnx_env,

    // whether to support loading models from the HuggingFace hub
    remoteModels: true,

    // URL to load models from
    remoteURL: 'https://huggingface.co/Xenova/transformers.js/resolve/main/quantized/',

    // Local URL to load models from.
    localURL: localURL,

    // Whether to use Cache API to cache models. By default, it is true if available.
    useCache: CACHE_AVAILABLE,

    // Whether to use the file system to load files. By default, it is true available.
    useFS: FS_AVAILABLE,
}


/**
 * @param {object} obj
 */
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

module.exports = {
    env
}


/***/ }),

/***/ "./src/fft.js":
/*!********************!*\
  !*** ./src/fft.js ***!
  \********************/
/***/ ((module) => {


/**
 * FFT class provides functionality for performing Fast Fourier Transform on arrays
 * Code adapted from https://www.npmjs.com/package/fft.js
 */
class FFT {
    /**
     * @param {number} size - The size of the input array. Must be a power of two and bigger than 1.
     * @throws {Error} FFT size must be a power of two and bigger than 1.
     */
    constructor(size) {
        this.size = size | 0; // convert to a 32-bit signed integer
        if (this.size <= 1 || (this.size & (this.size - 1)) !== 0)
            throw new Error('FFT size must be a power of two and bigger than 1');

        this._csize = size << 1;

        this.table = new Float64Array(this.size * 2);
        for (let i = 0; i < this.table.length; i += 2) {
            const angle = Math.PI * i / this.size;
            this.table[i] = Math.cos(angle);
            this.table[i + 1] = -Math.sin(angle);
        }

        // Find size's power of two
        let power = 0;
        for (let t = 1; this.size > t; t <<= 1)
            ++power;

        // Calculate initial step's width:
        //   * If we are full radix-4 - it is 2x smaller to give inital len=8
        //   * Otherwise it is the same as `power` to give len=4
        this._width = power % 2 === 0 ? power - 1 : power;

        // Pre-compute bit-reversal patterns
        this._bitrev = new Int32Array(1 << this._width);
        for (let j = 0; j < this._bitrev.length; ++j) {
            this._bitrev[j] = 0;
            for (let shift = 0; shift < this._width; shift += 2) {
                const revShift = this._width - shift - 2;
                this._bitrev[j] |= ((j >>> shift) & 3) << revShift;
            }
        }
    }

    /**
     * Create a complex number array with size `2 * size`
     *
     * @returns {Float64Array} - A complex number array with size `2 * size`
     */
    createComplexArray() {
        return new Float64Array(this._csize);
    }

    /**
     * Converts a complex number representation stored in a Float64Array to an array of real numbers.
     * 
     * @param {Float64Array} complex - The complex number representation to be converted.
     * @param {number[]} [storage] - An optional array to store the result in.
     * @returns {number[]} An array of real numbers representing the input complex number representation.
     */
    fromComplexArray(complex, storage) {
        const res = storage || new Array(complex.length >>> 1);
        for (let i = 0; i < complex.length; i += 2)
            res[i >>> 1] = complex[i];
        return res;
    }

    /**
     * Convert a real-valued input array to a complex-valued output array.
     * @param {Float64Array} input - The real-valued input array.
     * @param {Float64Array} [storage] - Optional buffer to store the output array.
     * @returns {Float64Array} The complex-valued output array.
     */
    toComplexArray(input, storage) {
        const res = storage || this.createComplexArray();
        for (let i = 0; i < res.length; i += 2) {
            res[i] = input[i >>> 1];
            res[i + 1] = 0;
        }
        return res;
    }

    /**
     * Completes the spectrum by adding its mirrored negative frequency components.
     * @param {Float64Array} spectrum - The input spectrum.
     * @returns {void}
     */
    completeSpectrum(spectrum) {
        const size = this._csize;
        const half = size >>> 1;
        for (let i = 2; i < half; i += 2) {
            spectrum[size - i] = spectrum[i];
            spectrum[size - i + 1] = -spectrum[i + 1];
        }
    }

    /**
     * Performs a Fast Fourier Transform (FFT) on the given input data and stores the result in the output buffer.
     * 
     * @param {Float64Array} out - The output buffer to store the result.
     * @param {Float64Array} data - The input data to transform.
     * 
     * @throws {Error} Input and output buffers must be different.
     * 
     * @returns {void}
     */
    transform(out, data) {
        if (out === data)
            throw new Error('Input and output buffers must be different');

        this._transform4(out, data, 1 /* DONE */);
    }

    /**
     * Performs a real-valued forward FFT on the given input buffer and stores the result in the given output buffer.
     * The input buffer must contain real values only, while the output buffer will contain complex values. The input and
     * output buffers must be different.
     *
     * @param {Float64Array} out - The output buffer.
     * @param {Float64Array} data - The input buffer containing real values.
     *
     * @throws {Error} If the input and output buffers are the same.
     */
    realTransform(out, data) {
        if (out === data)
            throw new Error('Input and output buffers must be different');

        this._realTransform4(out, data, 1 /* DONE */);
    }

    /**
     * Performs an inverse FFT transformation on the given `data` array, and stores the result in `out`.
     * The `out` array must be a different buffer than the `data` array. The `out` array will contain the
     * result of the transformation. The `data` array will not be modified.
     * 
     * @param {Float64Array} out - The output buffer for the transformed data.
     * @param {Float64Array} data - The input data to transform.
     * @throws {Error} If `out` and `data` refer to the same buffer.
     * @returns {void}
     */
    inverseTransform(out, data) {
        if (out === data)
            throw new Error('Input and output buffers must be different');

        this._transform4(out, data, -1 /* DONE */);
        for (let i = 0; i < out.length; ++i)
            out[i] /= this.size;
    }

    /**
     * Performs a radix-4 implementation of a discrete Fourier transform on a given set of data.
     *
     * @param {Float64Array} out - The output buffer for the transformed data.
     * @param {Float64Array} data - The input buffer of data to be transformed.
     * @param {number} inv - A scaling factor to apply to the transform.
     * @returns {void}
     */
    _transform4(out, data, inv) {
        // radix-4 implementation

        const size = this._csize;

        // Initial step (permute and transform)
        const width = this._width;
        let step = 1 << width;
        let len = (size / step) << 1;

        let outOff;
        let t;
        let bitrev = this._bitrev;
        if (len === 4) {
            for (outOff = 0, t = 0; outOff < size; outOff += len, ++t) {
                const off = bitrev[t];
                this._singleTransform2(data, out, outOff, off, step);
            }
        } else {
            // len === 8
            for (outOff = 0, t = 0; outOff < size; outOff += len, ++t) {
                const off = bitrev[t];
                this._singleTransform4(data, out, outOff, off, step, inv);
            }
        }

        // Loop through steps in decreasing order
        for (step >>= 2; step >= 2; step >>= 2) {
            len = (size / step) << 1;
            let quarterLen = len >>> 2;

            // Loop through offsets in the data
            for (outOff = 0; outOff < size; outOff += len) {
                // Full case
                let limit = outOff + quarterLen;
                for (let i = outOff, k = 0; i < limit; i += 2, k += step) {
                    const A = i;
                    const B = A + quarterLen;
                    const C = B + quarterLen;
                    const D = C + quarterLen;

                    // Original values
                    const Ar = out[A];
                    const Ai = out[A + 1];
                    const Br = out[B];
                    const Bi = out[B + 1];
                    const Cr = out[C];
                    const Ci = out[C + 1];
                    const Dr = out[D];
                    const Di = out[D + 1];

                    const tableBr = this.table[k];
                    const tableBi = inv * this.table[k + 1];
                    const MBr = Br * tableBr - Bi * tableBi;
                    const MBi = Br * tableBi + Bi * tableBr;

                    const tableCr = this.table[2 * k];
                    const tableCi = inv * this.table[2 * k + 1];
                    const MCr = Cr * tableCr - Ci * tableCi;
                    const MCi = Cr * tableCi + Ci * tableCr;

                    const tableDr = this.table[3 * k];
                    const tableDi = inv * this.table[3 * k + 1];
                    const MDr = Dr * tableDr - Di * tableDi;
                    const MDi = Dr * tableDi + Di * tableDr;

                    // Pre-Final values
                    const T0r = Ar + MCr;
                    const T0i = Ai + MCi;
                    const T1r = Ar - MCr;
                    const T1i = Ai - MCi;
                    const T2r = MBr + MDr;
                    const T2i = MBi + MDi;
                    const T3r = inv * (MBr - MDr);
                    const T3i = inv * (MBi - MDi);

                    // Final values
                    out[A] = T0r + T2r;
                    out[A + 1] = T0i + T2i;
                    out[B] = T1r + T3i;
                    out[B + 1] = T1i - T3r;
                    out[C] = T0r - T2r;
                    out[C + 1] = T0i - T2i;
                    out[D] = T1r - T3i;
                    out[D + 1] = T1i + T3r;
                }
            }
        }
    }

    /**
     * Performs a radix-2 implementation of a discrete Fourier transform on a given set of data.
     *
     * @param {Float64Array} data - The input buffer of data to be transformed.
     * @param {Float64Array} out - The output buffer for the transformed data.
     * @param {number} outOff - The offset at which to write the output data.
     * @param {number} off - The offset at which to begin reading the input data.
     * @param {number} step - The step size for indexing the input data.
     * @returns {void}
     */
    _singleTransform2(data, out, outOff, off, step) {
        // radix-2 implementation
        // NOTE: Only called for len=4

        const evenR = data[off];
        const evenI = data[off + 1];
        const oddR = data[off + step];
        const oddI = data[off + step + 1];

        out[outOff] = evenR + oddR;
        out[outOff + 1] = evenI + oddI;
        out[outOff + 2] = evenR - oddR;
        out[outOff + 3] = evenI - oddI;
    }

    /**
     * Performs radix-4 transformation on input data of length 8
     *
     * @param {Float64Array} data - Input data array of length 8
     * @param {Float64Array} out - Output data array of length 8
     * @param {number} outOff - Index of output array to start writing from
     * @param {number} off - Index of input array to start reading from
     * @param {number} step - Step size between elements in input array
     * @param {number} inv - Scaling factor for inverse transform
     * 
     * @returns {void}
     */
    _singleTransform4(data, out, outOff, off, step, inv) {
        // radix-4
        // NOTE: Only called for len=8
        const step2 = step * 2;
        const step3 = step * 3;

        // Original values
        const Ar = data[off];
        const Ai = data[off + 1];
        const Br = data[off + step];
        const Bi = data[off + step + 1];
        const Cr = data[off + step2];
        const Ci = data[off + step2 + 1];
        const Dr = data[off + step3];
        const Di = data[off + step3 + 1];

        // Pre-Final values
        const T0r = Ar + Cr;
        const T0i = Ai + Ci;
        const T1r = Ar - Cr;
        const T1i = Ai - Ci;
        const T2r = Br + Dr;
        const T2i = Bi + Di;
        const T3r = inv * (Br - Dr);
        const T3i = inv * (Bi - Di);

        // Final values
        out[outOff] = T0r + T2r;
        out[outOff + 1] = T0i + T2i;
        out[outOff + 2] = T1r + T3i;
        out[outOff + 3] = T1i - T3r;
        out[outOff + 4] = T0r - T2r;
        out[outOff + 5] = T0i - T2i;
        out[outOff + 6] = T1r - T3i;
        out[outOff + 7] = T1i + T3r;
    }

    /**
     * Real input radix-4 implementation
     * @param {Float64Array} out - Output array for the transformed data
     * @param {Float64Array} data - Input array of real data to be transformed
     * @param {number} inv - The scale factor used to normalize the inverse transform
     */
    _realTransform4(out, data, inv) {
        // Real input radix-4 implementation
        const size = this._csize;

        // Initial step (permute and transform)
        const width = this._width;
        let step = 1 << width;
        let len = (size / step) << 1;

        var outOff;
        var t;
        var bitrev = this._bitrev;
        if (len === 4) {
            for (outOff = 0, t = 0; outOff < size; outOff += len, ++t) {
                const off = bitrev[t];
                this._singleRealTransform2(data, out, outOff, off >>> 1, step >>> 1);
            }
        } else {
            // len === 8
            for (outOff = 0, t = 0; outOff < size; outOff += len, ++t) {
                const off = bitrev[t];
                this._singleRealTransform4(data, out, outOff, off >>> 1, step >>> 1, inv);
            }
        }

        // Loop through steps in decreasing order
        for (step >>= 2; step >= 2; step >>= 2) {
            len = (size / step) << 1;
            const halfLen = len >>> 1;
            const quarterLen = halfLen >>> 1;
            const hquarterLen = quarterLen >>> 1;

            // Loop through offsets in the data
            for (outOff = 0; outOff < size; outOff += len) {
                for (let i = 0, k = 0; i <= hquarterLen; i += 2, k += step) {
                    const A = outOff + i;
                    const B = A + quarterLen;
                    const C = B + quarterLen;
                    const D = C + quarterLen;

                    // Original values
                    const Ar = out[A];
                    const Ai = out[A + 1];
                    const Br = out[B];
                    const Bi = out[B + 1];
                    const Cr = out[C];
                    const Ci = out[C + 1];
                    const Dr = out[D];
                    const Di = out[D + 1];

                    const tableBr = this.table[k];
                    const tableBi = inv * this.table[k + 1];
                    const MBr = Br * tableBr - Bi * tableBi;
                    const MBi = Br * tableBi + Bi * tableBr;

                    const tableCr = this.table[2 * k];
                    const tableCi = inv * this.table[2 * k + 1];
                    const MCr = Cr * tableCr - Ci * tableCi;
                    const MCi = Cr * tableCi + Ci * tableCr;

                    const tableDr = this.table[3 * k];
                    const tableDi = inv * this.table[3 * k + 1];
                    const MDr = Dr * tableDr - Di * tableDi;
                    const MDi = Dr * tableDi + Di * tableDr;

                    // Pre-Final values
                    const T0r = Ar + MCr;
                    const T0i = Ai + MCi;
                    const T1r = Ar - MCr;
                    const T1i = Ai - MCi;
                    const T2r = MBr + MDr;
                    const T2i = MBi + MDi;
                    const T3r = inv * (MBr - MDr);
                    const T3i = inv * (MBi - MDi);

                    // Final values
                    out[A] = T0r + T2r;
                    out[A + 1] = T0i + T2i;
                    out[B] = T1r + T3i;
                    out[B + 1] = T1i - T3r;

                    // Output final middle point
                    if (i === 0) {
                        out[C] = T0r - T2r;
                        out[C + 1] = T0i - T2i;
                        continue;
                    }

                    // Do not overwrite ourselves
                    if (i === hquarterLen)
                        continue;

                    const SA = outOff + quarterLen - i;
                    const SB = outOff + halfLen - i;

                    out[SA] = T1r + -inv * T3i;
                    out[SA + 1] = -T1i - inv * T3r;
                    out[SB] = T0r + -inv * T2r;
                    out[SB + 1] = -T0i + inv * T2i;
                }
            }
        }
    }

    /**
     * Performs a single real input radix-2 transformation on the provided data
     * 
     * @param {Float64Array} data - The input data array
     * @param {Float64Array} out - The output data array
     * @param {number} outOff - The output offset
     * @param {number} off - The input offset
     * @param {number} step - The step
     * 
     * @returns {void}
     */
    _singleRealTransform2(data, out, outOff, off, step) {
        // radix-2 implementation
        // NOTE: Only called for len=4

        const evenR = data[off];
        const oddR = data[off + step];

        out[outOff] = evenR + oddR;
        out[outOff + 1] = 0;
        out[outOff + 2] = evenR - oddR;
        out[outOff + 3] = 0;
    }

    /**
     * Computes a single real-valued transform using radix-4 algorithm.
     * This method is only called for len=8.
     *
     * @param {Float64Array} data - The input data array.
     * @param {Float64Array} out - The output data array.
     * @param {number} outOff - The offset into the output array.
     * @param {number} off - The offset into the input array.
     * @param {number} step - The step size for the input array.
     * @param {number} inv - The value of inverse.
     */
    _singleRealTransform4(data, out, outOff, off, step, inv) {
        // radix-4
        // NOTE: Only called for len=8
        const step2 = step * 2;
        const step3 = step * 3;

        // Original values
        const Ar = data[off];
        const Br = data[off + step];
        const Cr = data[off + step2];
        const Dr = data[off + step3];

        // Pre-Final values
        const T0r = Ar + Cr;
        const T1r = Ar - Cr;
        const T2r = Br + Dr;
        const T3r = inv * (Br - Dr);

        // Final values
        out[outOff] = T0r + T2r;
        out[outOff + 1] = 0;
        out[outOff + 2] = T1r;
        out[outOff + 3] = -T3r;
        out[outOff + 4] = T0r - T2r;
        out[outOff + 5] = 0;
        out[outOff + 6] = T1r;
        out[outOff + 7] = T3r;
    }
}

module.exports = FFT


/***/ }),

/***/ "./src/generation.js":
/*!***************************!*\
  !*** ./src/generation.js ***!
  \***************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { Tensor } = __webpack_require__(/*! ./tensor_utils.js */ "./src/tensor_utils.js");
const {
    Callable,
    exists,
    log_softmax
} = __webpack_require__(/*! ./utils.js */ "./src/utils.js");

/**
 * A class representing a list of logits processors. A logits processor is a function that modifies the logits
 * output of a language model. This class provides methods for adding new processors and applying all processors to a
 * batch of logits.
 *
 * @extends Callable
 */
class LogitsProcessorList extends Callable {
    /**
     * Constructs a new instance of `LogitsProcessorList`.
     */
    constructor() {
        super();
        this.processors = [];
    }

    /**
     * Adds a new logits processor to the list.
     *
     * @param {function} item - The logits processor function to add.
     */
    push(item) {
        this.processors.push(item);
    }

    /**
     * Adds multiple logits processors to the list.
     *
     * @param {function[]} items - The logits processor functions to add.
     */
    extend(items) {
        this.processors.push(...items);
    }

    /**
     * Applies all logits processors in the list to a batch of logits, modifying them in-place.
     *
     * @param {number[]} input_ids - The input IDs for the language model.
     * @param {number[][]} batchedLogits - A 2D array of logits, where each row corresponds to a single
     *                                                input sequence in the batch.
     */
    _call(input_ids, batchedLogits) {
        // NOTE: This is different from the Python code, since vanilla JS does not support vectorized operations. 
        // As a result, we apply each processor to each item in the batch.
        for (let logits of batchedLogits) {
            // Modifies logits inplace
            this.processors.forEach(
                func => func(input_ids, logits)
            )
        }
    }

    [Symbol.iterator]() {
        return this.processors.values();
    }
}

/**
 * Base class for processing logits.
 * @extends Callable
 */
class LogitsProcessor extends Callable {
    /**
     * Apply the processor to the input logits.
     *
     * @abstract
     * @param {Array} input_ids The input ids.
     * @param {Tensor} logits The logits to process.
     * @throws {Error} Throws an error if `_call` is not implemented in the subclass.
     */
    _call(input_ids, logits) {
        throw Error("`_call` should be implemented in a subclass")
    }
}

/**
 * A logits processor that forces a specific token to be generated by the decoder.
 * 
 * @extends LogitsProcessor
 */
class ForceTokensLogitsProcessor extends LogitsProcessor {
    /**
     * Constructs a new instance of `ForceTokensLogitsProcessor`.
     * 
     * @param {Array} forced_decoder_ids The ids of tokens that should be forced.
     */
    constructor(forced_decoder_ids) {
        super();
        this.force_token_map = Object.fromEntries(forced_decoder_ids ?? []);
    }

    /**
     * Apply the processor to the input logits.
     *
     * @param {Array} input_ids The input ids.
     * @param {any} logits The logits to process.
     * @returns {Array} The processed logits.
     */
    _call(input_ids, logits) {
        let map = this.force_token_map[input_ids.length];
        if (exists(map)) { // There exists a mapping
            logits.data.fill(-Infinity)
            logits.data[map] = 0;
        }
        return logits;
    }
}

/**
 * A LogitsProcessor that forces a BOS token at the beginning of the generated sequence.
 * @extends LogitsProcessor
 */
class ForcedBOSTokenLogitsProcessor extends LogitsProcessor {
    /**
     * Create a ForcedBOSTokenLogitsProcessor.
     * @param {number} bos_token_id - The ID of the beginning-of-sequence token to be forced.
     */
    constructor(bos_token_id) {
        super();
        this.bos_token_id = bos_token_id;
    }

    /**
     * Apply the BOS token forcing to the logits.
     * @param {Array} input_ids - The input IDs.
     * @param {Object} logits - The logits.
     * @returns {Object} The logits with BOS token forcing.
     */
    _call(input_ids, logits) {
        if (input_ids.length === 1) {
            logits.data.fill(-Infinity)
            logits.data[this.bos_token_id] = 0;
        }
    }
}

/**
 * A logits processor that forces end-of-sequence token probability to 1.
 * 
 * @extends LogitsProcessor
 */
class ForcedEOSTokenLogitsProcessor extends LogitsProcessor {
    /**
     * Create a ForcedEOSTokenLogitsProcessor.
     * @param {number} max_length - Max length of the sequence.
     * @param {number} forced_eos_token_id - The ID of the end-of-sequence token to be forced.
     */
    constructor(max_length, forced_eos_token_id) {
        super();
        this.max_length = max_length;
        this.forced_eos_token_id = forced_eos_token_id;
    }

    /**
     * Apply the processor to input_ids and logits.
     * 
     * @param {number[]} input_ids - The input ids.
     * @param {any} logits - The logits tensor.
     */
    _call(input_ids, logits) {
        // console.log('call ForcedEOSTokenLogitsProcessor')
        // TODO
    }
}

/**
 * A LogitsProcessor that handles adding timestamps to generated text.
 * @extends LogitsProcessor
 */
class WhisperTimeStampLogitsProcessor extends LogitsProcessor {
    /**
     * Constructs a new WhisperTimeStampLogitsProcessor.
     * @param {object} generate_config - The config object passed to the `generate()` method of a transformer model.
     * @param {number} generate_config.eos_token_id - The ID of the end-of-sequence token.
     * @param {number} generate_config.no_timestamps_token_id - The ID of the token used to indicate that a token should not have a timestamp.
     * @param {number[][]} [generate_config.forced_decoder_ids] - An array of two-element arrays representing decoder IDs that are forced to appear in the output. The second element of each array indicates whether the token is a timestamp.
     * @param {number} [generate_config.max_initial_timestamp_index] - The maximum index at which an initial timestamp can appear.
     */
    constructor(generate_config) {
        super();
        this.eos_token_id = generate_config.eos_token_id;
        this.no_timestamps_token_id = generate_config.no_timestamps_token_id;
        this.timestamp_begin = this.no_timestamps_token_id + 1;

        this.begin_index = (generate_config.forced_decoder_ids || []).length + 2;
        if (generate_config.forced_decoder_ids.slice(-1)[0][1] === this.no_timestamps_token_id) {
            this.begin_index -= 1;
        }
        this.max_initial_timestamp_index = generate_config.max_initial_timestamp_index;

    }

    /**
     * Modify the logits to handle timestamp tokens.
     * @param {Array} input_ids - The input sequence of tokens.
     * @param {Tensor} logits - The logits output by the model.
     * @returns {Tensor} - The modified logits.
     */
    _call(input_ids, logits) {
        // suppress <|notimestamps|> which is handled by without_timestamps
        logits.data[this.no_timestamps_token_id] = -Infinity;

        if (input_ids.length === this.begin_index - 1) {
            logits.data.fill(-Infinity);
            logits.data[this.timestamp_begin] = 0;
            return logits;
        }

        // timestamps have to appear in pairs, except directly before eos_token; mask logits accordingly
        const seq = input_ids.slice(this.begin_index);
        const last_was_timestamp = seq.length >= 1 && seq[seq.length - 1] >= this.timestamp_begin;
        const penultimate_was_timestamp = seq.length < 2 || seq[seq.length - 2] >= this.timestamp_begin;

        if (last_was_timestamp) {
            if (penultimate_was_timestamp) { // has to be non-timestamp
                logits.data.subarray(this.timestamp_begin).fill(-Infinity);
            } else { // cannot be normal text tokens
                logits.data.subarray(0, this.eos_token_id).fill(-Infinity);
            }
        }

        // apply the `max_initial_timestamp` option
        if (input_ids.length === this.begin_index && this.max_initial_timestamp_index !== null) {
            const last_allowed = this.timestamp_begin + this.max_initial_timestamp_index;
            logits.data.subarray(last_allowed + 1).fill(-Infinity);
        }

        // if sum of probability over timestamps is above any other token, sample timestamp
        const logprobs = log_softmax(logits.data);
        const timestamp_logprob = Math.log(logprobs.subarray(this.timestamp_begin).map(Math.exp).reduce((a, b) => a + b));
        const max_text_token_logprob = Math.max(...logprobs.subarray(0, this.timestamp_begin));
        if (timestamp_logprob > max_text_token_logprob) {
            logits.data.subarray(0, this.timestamp_begin).fill(-Infinity);
        }

        return logits;
    }
}

/**
 * A logits processor that disallows ngrams of a certain size to be repeated.
 * 
 * @extends LogitsProcessor
 */
class NoRepeatNGramLogitsProcessor extends LogitsProcessor {
    /**
     * Create a NoRepeatNGramLogitsProcessor.
     * @param {number} no_repeat_ngram_size - The no-repeat-ngram size. All ngrams of this size can only occur once.
     */
    constructor(no_repeat_ngram_size) {
        super();
        this.no_repeat_ngram_size = no_repeat_ngram_size;
    }

    /**
     * Generate n-grams from a sequence of token ids.
     * @param {number[]} prevInputIds - List of previous input ids
     * @returns {Map<string, number[]>} - Map of generated n-grams
     */
    getNgrams(prevInputIds) {
        const curLen = prevInputIds.length;

        /**@type {number[][]} */
        const ngrams = [];
        for (let j = 0; j < curLen + 1 - this.no_repeat_ngram_size; ++j) {
            const ngram = [];
            for (let k = 0; k < this.no_repeat_ngram_size; ++k) {
                ngram.push(prevInputIds[j + k]);
            }
            ngrams.push(ngram);
        }

        /** @type {Map<string, number[]>} */
        const generatedNgram = new Map();
        for (const ngram of ngrams) {
            const prevNgram = ngram.slice(0, ngram.length - 1);
            const prevNgramKey = JSON.stringify(prevNgram);
            const prevNgramValue = generatedNgram.get(prevNgramKey) ?? [];
            prevNgramValue.push(ngram[ngram.length - 1]);
            generatedNgram.set(prevNgramKey, prevNgramValue);
        }
        return generatedNgram;
    }

    /**
     * Generate n-grams from a sequence of token ids.
     * @param {Map<string, number[]>} bannedNgrams - Map of banned n-grams
     * @param {number[]} prevInputIds - List of previous input ids
     * @returns {number[]} - Map of generated n-grams
     */
    getGeneratedNgrams(bannedNgrams, prevInputIds) {
        const ngramIdx = prevInputIds.slice(prevInputIds.length + 1 - this.no_repeat_ngram_size, prevInputIds.length);
        const banned = bannedNgrams.get(JSON.stringify(ngramIdx)) ?? [];
        return banned;
    }

    /**
     * Calculate banned n-gram tokens
     * @param {number[]} prevInputIds - List of previous input ids
     * @returns {number[]} - Map of generated n-grams
     */
    calcBannedNgramTokens(prevInputIds) {
        const bannedTokens = [];
        if (prevInputIds.length + 1 < this.no_repeat_ngram_size) {
            // return no banned tokens if we haven't generated no_repeat_ngram_size tokens yet
            return bannedTokens;

        } else {
            const generatedNgrams = this.getNgrams(prevInputIds);
            const bannedTokens = this.getGeneratedNgrams(generatedNgrams, prevInputIds);
            return bannedTokens;
        }
    }

    /**
     * Apply the no-repeat-ngram processor to the logits.
     * @param {Array} input_ids - The input IDs.
     * @param {Object} logits - The logits.
     * @returns {Object} The logits with no-repeat-ngram processing.
     */
    _call(input_ids, logits) {
        const bannedTokens = this.calcBannedNgramTokens(input_ids);

        for (const token of bannedTokens) {
            logits.data[token] = -Infinity;
        }
        return logits;
    }
}

/**
 * A logits processor that penalises repeated output tokens.
 * 
 * @extends LogitsProcessor
 */
class RepetitionPenaltyLogitsProcessor extends LogitsProcessor {
    /**
     * Create a RepetitionPenaltyLogitsProcessor.
     * @param {number} penalty - The penalty to apply for repeated tokens.
     */
    constructor(penalty) {
        super();
        this.penalty = penalty;
    }

    /**
     * Apply the repetition penalty to the logits.
     * @param {Array} input_ids - The input IDs.
     * @param {Object} logits - The logits.
     * @returns {Object} The logits with repetition penalty processing.
     */
    _call(input_ids, logits) {
        // Modify the logits corresponding to each element in `input_ids`.
        // As a consequence, the logits corresponding to tokens that appear
        // many times in the output will be penalised more.
        for (const input_id of input_ids) {
            if (logits.data[input_id] < 0) {
                logits.data[input_id] *= this.penalty;
            } else {
                logits.data[input_id] /= this.penalty;
            }
        }
        return logits
    }
}


class GenerationConfig {
    constructor(kwargs = {}) {
        // Parameters that control the length of the output
        // TODO: extend the configuration with correct types
        /**
         * Create a GenerationConfig object
         * @constructor
         * @param {Object} [kwargs={}] - The configuration parameters
         * @param {number} [kwargs.max_length=20] - The maximum length of the generated text
         * @param {number} [kwargs.max_new_tokens=null] - The maximum number of new tokens to generate
         * @param {number} [kwargs.min_length=0] - The minimum length of the generated text
         * @param {number} [kwargs.min_new_tokens=null] - The minimum number of new tokens to generate
         * @param {boolean} [kwargs.early_stopping=false] - Whether to stop generation early if a stop token is encountered
         * @param {number} [kwargs.max_time=null] - The maximum amount of time to spend generating text
         * @param {boolean} [kwargs.do_sample=false] - Whether to use sampling when generating text
         * @param {number} [kwargs.num_beams=1] - The number of beams to use when generating text
         * @param {number} [kwargs.num_beam_groups=1] - The number of beam groups to use when generating text
         * @param {number} [kwargs.penalty_alpha=null] - The value of the alpha penalty to use when generating text
         * @param {boolean} [kwargs.use_cache=true] - Whether to use cache when generating text
         * @param {number} [kwargs.temperature=1.0] - The temperature to use when generating text
         * @param {number} [kwargs.top_k=50] - The value of k to use when generating text
         * @param {number} [kwargs.top_p=1.0] - The value of p to use when generating text
         * @param {number} [kwargs.typical_p=1.0] - The typical value of p to use when generating text
         * @param {number} [kwargs.epsilon_cutoff=0.0] - The value of epsilon cutoff to use when generating text
         * @param {number} [kwargs.eta_cutoff=0.0] - The value of eta cutoff to use when generating text
         * @param {number} [kwargs.diversity_penalty=0.0] - The value of diversity penalty to use when generating text
         * @param {number} [kwargs.repetition_penalty=1.0] - The value of repetition penalty to use when generating text
         * @param {number} [kwargs.encoder_repetition_penalty=1.0] - The value of encoder repetition penalty to use when generating text
         * @param {number} [kwargs.length_penalty=1.0] - The value of length
         * @param {number} [kwargs.no_repeat_ngram_size=0] - The size of the n-grams to avoid repeating in the generated output.
         * @param {?number[]} [kwargs.bad_words_ids=null] - An array of IDs representing tokens that should not be generated.
         * @param {?number[]} [kwargs.force_words_ids=null] - An array of IDs representing tokens that must be generated.
         * @param {boolean} [kwargs.renormalize_logits=false] - Whether or not to renormalize the logits before generating new tokens.
         * @param {?Object[]} [kwargs.constraints=null] - An array of constraint objects to apply during generation.
         */
        this.max_length = kwargs.max_length ?? 20;
        this.max_new_tokens = kwargs.max_new_tokens ?? null;
        this.min_length = kwargs.min_length ?? 0;
        this.min_new_tokens = kwargs.min_new_tokens ?? null;
        this.early_stopping = kwargs.early_stopping ?? false;
        this.max_time = kwargs.max_time ?? null;

        // Parameters that control the generation strategy used
        this.do_sample = kwargs.do_sample ?? false;
        this.num_beams = kwargs.num_beams ?? 1;
        this.num_beam_groups = kwargs.num_beam_groups ?? 1;
        this.penalty_alpha = kwargs.penalty_alpha ?? null;
        this.use_cache = kwargs.use_cache ?? true;

        // Parameters for manipulation of the model output logits
        this.temperature = kwargs.temperature ?? 1.0;
        this.top_k = kwargs.top_k ?? 50;
        this.top_p = kwargs.top_p ?? 1.0;
        this.typical_p = kwargs.typical_p ?? 1.0;
        this.epsilon_cutoff = kwargs.epsilon_cutoff ?? 0.0;
        this.eta_cutoff = kwargs.eta_cutoff ?? 0.0;
        this.diversity_penalty = kwargs.diversity_penalty ?? 0.0;
        this.repetition_penalty = kwargs.repetition_penalty ?? 1.0;
        this.encoder_repetition_penalty = kwargs.encoder_repetition_penalty ?? 1.0;
        this.length_penalty = kwargs.length_penalty ?? 1.0;
        this.no_repeat_ngram_size = kwargs.no_repeat_ngram_size ?? 0;
        this.bad_words_ids = kwargs.bad_words_ids ?? null;
        this.force_words_ids = kwargs.force_words_ids ?? null;
        this.renormalize_logits = kwargs.renormalize_logits ?? false;
        this.constraints = kwargs.constraints ?? null;
        this.forced_bos_token_id = kwargs.forced_bos_token_id ?? null;
        this.forced_eos_token_id = kwargs.forced_eos_token_id ?? null;
        this.remove_invalid_values = kwargs.remove_invalid_values ?? false;
        this.exponential_decay_length_penalty = kwargs.exponential_decay_length_penalty ?? null;
        this.suppress_tokens = kwargs.suppress_tokens ?? null;
        this.begin_suppress_tokens = kwargs.begin_suppress_tokens ?? null;
        this.forced_decoder_ids = kwargs.forced_decoder_ids ?? null;

        // Parameters that define the output variables of `generate`
        this.num_return_sequences = kwargs.num_return_sequences ?? 1;
        this.output_attentions = kwargs.output_attentions ?? false;
        this.output_hidden_states = kwargs.output_hidden_states ?? false;
        this.output_scores = kwargs.output_scores ?? false;
        this.return_dict_in_generate = kwargs.return_dict_in_generate ?? false;

        // Special tokens that can be used at generation time
        this.pad_token_id = kwargs.pad_token_id ?? null;
        this.bos_token_id = kwargs.bos_token_id ?? null;
        this.eos_token_id = kwargs.eos_token_id ?? null;

        // Generation parameters exclusive to encoder-decoder models
        this.encoder_no_repeat_ngram_size = kwargs.encoder_no_repeat_ngram_size ?? 0;
        this.decoder_start_token_id = kwargs.decoder_start_token_id ?? null;

        // Wild card
        this.generation_kwargs = kwargs.generation_kwargs ?? {};
    }
}

module.exports = {
    LogitsProcessor,
    LogitsProcessorList,
    GenerationConfig,
    ForcedBOSTokenLogitsProcessor,
    ForcedEOSTokenLogitsProcessor,
    WhisperTimeStampLogitsProcessor,
    ForceTokensLogitsProcessor,
    NoRepeatNGramLogitsProcessor,
    RepetitionPenaltyLogitsProcessor
};


/***/ }),

/***/ "./src/image_utils.js":
/*!****************************!*\
  !*** ./src/image_utils.js ***!
  \****************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


const fs = __webpack_require__(/*! fs */ "?569f");
const { getFile, isString } = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
const { env } = __webpack_require__(/*! ./env.js */ "./src/env.js");

// Will be empty (or not used) if running in browser or web-worker
const sharp = __webpack_require__(/*! sharp */ "?36f4");

let CanvasClass;
let ImageDataClass;
let loadImageFunction;
if (typeof self !== 'undefined') {
    // Running in browser or web-worker
    CanvasClass = OffscreenCanvas;
    loadImageFunction = self.createImageBitmap;
    ImageDataClass = ImageData;

} else if (sharp) {
    // Running in Node.js, electron, or other non-browser environment

    loadImageFunction = async (/**@type {sharp.Sharp}*/img) => {
        let { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
        return new CustomImage(new Uint8ClampedArray(data), info.width, info.height, info.channels);
    }

} else {
    throw new Error('Unable to load image processing library.');
}


class CustomImage {

    /**
     * Create a new CustomImage object.
     * @param {Uint8ClampedArray} data - The pixel data.
     * @param {number} width - The width of the image.
     * @param {number} height - The height of the image.
     * @param {1|2|3|4} channels - The number of channels.
     */
    constructor(data, width, height, channels) {
        this._update(data, width, height, channels);
    }

    /**
     * Helper method for reading an image from a variety of input types.
     * @param {CustomImage|string|URL} input 
     * @returns The image object.
     */
    static async read(input) {
        if (input instanceof CustomImage) {
            return input;
        } else if (isString(input) || input instanceof URL) {
            return await this.fromURL(input);
        } else {
            throw new Error(`Unsupported input type: ${typeof input}`);
        }
    }


    /**
     * Read an image from a URL or file path.
     * @param {string|URL} url - The URL or file path to read the image from.
     * @returns {Promise<CustomImage>} - The image object.
     */
    static async fromURL(url) {
        let response = await getFile(url);
        let blob = await response.blob();
        return this.fromBlob(blob);
    }

    /**
     * Helper method to create a new Image from a blob.
     * @param {Blob} blob - The blob to read the image from.
     * @returns {Promise<CustomImage>} - The image object.
     */
    static async fromBlob(blob) {
        if (CanvasClass) {
            // Running in environment with canvas
            let img = await loadImageFunction(blob);

            const ctx = new CanvasClass(img.width, img.height).getContext('2d');

            // Draw image to context
            ctx.drawImage(img, 0, 0);

            return new this(ctx.getImageData(0, 0, img.width, img.height).data, img.width, img.height, 4);

        } else {
            // Use sharp.js to read (and possible resize) the image.
            let img = sharp(await blob.arrayBuffer());

            return await loadImageFunction(img);
        }
    }

    /**
     * Convert the image to grayscale format.
     * @returns {CustomImage} - `this` to support chaining.
     */
    grayscale() {
        if (this.channels === 1) {
            return this;
        }

        let newData = new Uint8ClampedArray(this.width * this.height * 3);
        switch (this.channels) {
            case 3: // rgb to grayscale
            case 4: // rgba to grayscale
                for (let i = 0, offset = 0; i < this.data.length; i += this.channels) {
                    const red = this.data[i];
                    const green = this.data[i + 1];
                    const blue = this.data[i + 2];

                    newData[offset++] = Math.round(0.2989 * red + 0.5870 * green + 0.1140 * blue);
                }
                break;
            default:
                throw new Error(`Conversion failed due to unsupported number of channels: ${this.channels}`);
        }
        return this._update(newData, this.width, this.height, 1);
    }

    /**
     * Convert the image to RGB format.
     * @returns {CustomImage} - `this` to support chaining.
     */
    rgb() {
        if (this.channels === 3) {
            return this;
        }

        let newData = new Uint8ClampedArray(this.width * this.height * 3);

        switch (this.channels) {
            case 1: // grayscale to rgb
                for (let i = 0, offset = 0; i < this.data.length; ++i) {
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i];
                }
                break;
            case 4: // rgba to rgb
                for (let i = 0, offset = 0; i < this.data.length; i += 4) {
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i + 1];
                    newData[offset++] = this.data[i + 2];
                }
                break;
            default:
                throw new Error(`Conversion failed due to unsupported number of channels: ${this.channels}`);
        }
        return this._update(newData, this.width, this.height, 3);

    }

    /**
     * Convert the image to RGBA format.
     * @returns {CustomImage} - `this` to support chaining.
     */
    rgba() {
        if (this.channels === 4) {
            return this;
        }

        let newData = new Uint8ClampedArray(this.width * this.height * 4);

        switch (this.channels) {
            case 1: // grayscale to rgba
                for (let i = 0, offset = 0; i < this.data.length; ++i) {
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i];
                    newData[offset++] = 255;
                }
                break;
            case 3: // rgb to rgba
                for (let i = 0, offset = 0; i < this.data.length; i += 3) {
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i + 1];
                    newData[offset++] = this.data[i + 2];
                    newData[offset++] = 255;
                }
                break;
            default:
                throw new Error(`Conversion failed due to unsupported number of channels: ${this.channels}`);
        }

        return this._update(newData, this.width, this.height, 4);
    }

    /**
     * Resize the image to the given dimensions. This method uses the canvas API to perform the resizing.
     * @param {number} width - The width of the new image.
     * @param {number} height - The height of the new image.
     * @returns {Promise<CustomImage>} - `this` to support chaining.
     */
    async resize(width, height) {
        if (CanvasClass) {
            // Store number of channels before resizing
            let numChannels = this.channels;

            // Create canvas object for this image
            let canvas = this.toCanvas();

            // Actually perform resizing using the canvas API
            const ctx = new CanvasClass(width, height).getContext('2d');

            // Draw image to context, resizing in the process
            ctx.drawImage(canvas, 0, 0, width, height);

            // Create image from the resized data
            let resizedImage = new CustomImage(ctx.getImageData(0, 0, width, height).data, width, height, 4);

            // Convert back so that image has the same number of channels as before
            return resizedImage.convert(numChannels);

        } else {
            // Create sharp image from raw data, and resize
            let img = sharp(this.data, {
                raw: {
                    width: this.width,
                    height: this.height,
                    channels: this.channels
                }
            }).resize({
                // https://github.com/lovell/sharp/blob/main/docs/api-resize.md
                width, height,
                fit: 'fill',
                kernel: 'cubic'
            });
            return await loadImageFunction(img);
        }

    }

    toCanvas() {
        // Clone, and convert data to RGBA before drawing to canvas.
        // This is because the canvas API only supports RGBA
        let cloned = this.clone().rgba();

        // Create canvas object for the cloned image
        let clonedCanvas = new CanvasClass(cloned.width, cloned.height);

        // Draw image to context
        let data = new ImageDataClass(cloned.data, cloned.width, cloned.height);
        clonedCanvas.getContext('2d').putImageData(data, 0, 0);

        return clonedCanvas;
    }

    /**
     * Helper method to update the image data.
     * @param {Uint8ClampedArray} data - The new image data.
     * @param {number} width - The new width of the image.
     * @param {number} height - The new height of the image.
     * @param {1|2|3|4} channels - The new number of channels of the image.
     */
    _update(data, width, height, channels = null) {
        this.data = data;
        this.width = width;
        this.height = height;
        if (channels !== null) {
            this.channels = channels;
        }
        return this;
    }

    /**
     * Clone the image
     * @returns {CustomImage} - The cloned image
     */
    clone() {
        return new CustomImage(this.data.slice(), this.width, this.height, this.channels);
    }

    /**
     * Helper method for converting image to have a certain number of channels
     * @param {number} numChannels - The number of channels. Must be 1, 3, or 4.
     * @returns {CustomImage} - `this` to support chaining.
     */
    convert(numChannels) {
        if (this.channels === numChannels) return this; // Already correct number of channels

        switch (numChannels) {
            case 1:
                this.grayscale();
                break;
            case 3:
                this.rgb();
                break;
            case 4:
                this.rgba();
                break;
            default:
                throw new Error(`Conversion failed due to unsupported number of channels: ${this.channels}`);
        }
        return this;
    }

    /**
     * Save the image to the given path. This method is only available in environments with access to the FileSystem.
     * @param {string|Buffer|URL} path - The path to save the image to.
     * @param {string} [mime='image/png'] - The mime type of the image.
     */
    save(path, mime = 'image/png') {
        if (!env.useFS) {
            throw new Error('Unable to save the image because filesystem is disabled in this environment.')
        }

        let canvas = this.toCanvas();
        const buffer = canvas.toBuffer(mime);
        fs.writeFileSync(path, buffer);
    }
}

module.exports = {
    CustomImage,
};


/***/ }),

/***/ "./src/math_utils.js":
/*!***************************!*\
  !*** ./src/math_utils.js ***!
  \***************************/
/***/ ((module) => {


/**
 * @typedef {Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array} TypedArray
 * @typedef {BigInt64Array | BigUint64Array} BigTypedArray
 * @typedef {TypedArray | BigTypedArray} AnyTypedArray
 */

/**
 * @param {TypedArray} input
 */
function interpolate(input, [in_channels, in_height, in_width], [out_height, out_width], mode = 'bilinear', align_corners = false) {
    // TODO use mode and align_corners

    // Output image dimensions
    const x_scale = out_width / in_width;
    const y_scale = out_height / in_height;

    // Output image
    // @ts-ignore
    const out_img = new input.constructor(out_height * out_width * in_channels);

    // Pre-calculate strides
    const inStride = in_height * in_width;
    const outStride = out_height * out_width;

    for (let i = 0; i < out_height; ++i) {
        for (let j = 0; j < out_width; ++j) {
            // Calculate output offset
            const outOffset = i * out_width + j;

            // Calculate input pixel coordinates
            const x = (j + 0.5) / x_scale - 0.5;
            const y = (i + 0.5) / y_scale - 0.5;

            // Calculate the four nearest input pixels
            // We also check if the input pixel coordinates are within the image bounds
            let x1 = Math.floor(x);
            let y1 = Math.floor(y);
            const x2 = Math.min(x1 + 1, in_width - 1);
            const y2 = Math.min(y1 + 1, in_height - 1);

            x1 = Math.max(x1, 0);
            y1 = Math.max(y1, 0);


            // Calculate the fractional distances between the input pixel and the four nearest pixels
            const s = x - x1;
            const t = y - y1;

            // Perform bilinear interpolation
            const w1 = (1 - s) * (1 - t);
            const w2 = s * (1 - t);
            const w3 = (1 - s) * t;
            const w4 = s * t;

            // Calculate the four nearest input pixel indices
            const yStride = y1 * in_width;
            const xStride = y2 * in_width;
            const idx1 = yStride + x1;
            const idx2 = yStride + x2;
            const idx3 = xStride + x1;
            const idx4 = xStride + x2;

            for (let k = 0; k < in_channels; ++k) {
                // Calculate channel offset
                const cOffset = k * inStride;

                out_img[k * outStride + outOffset] =
                    w1 * input[cOffset + idx1] +
                    w2 * input[cOffset + idx2] +
                    w3 * input[cOffset + idx3] +
                    w4 * input[cOffset + idx4];
            }
        }
    }

    return out_img;
}


/**
 * Helper method to transpose a AnyTypedArray directly
 * @param {T} array 
 * @template {AnyTypedArray} T 
 * @param {number[]} dims 
 * @param {number[]} axes 
 * @returns {[T, number[]]} The transposed array and the new shape.
 */
function transpose_data(array, dims, axes) {
    // Calculate the new shape of the transposed array
    // and the stride of the original array
    const shape = new Array(axes.length);
    const stride = new Array(axes.length);

    for (let i = axes.length - 1, s = 1; i >= 0; --i) {
        stride[i] = s;
        shape[i] = dims[axes[i]];
        s *= shape[i];
    }

    // Precompute inverse mapping of stride
    const invStride = axes.map((_, i) => stride[axes.indexOf(i)]);

    // Create the transposed array with the new shape
    // @ts-ignore
    const transposedData = new array.constructor(array.length);

    // Transpose the original array to the new array
    for (let i = 0; i < array.length; ++i) {
        let newIndex = 0;
        for (let j = dims.length - 1, k = i; j >= 0; --j) {
            newIndex += (k % dims[j]) * invStride[j];
            k = Math.floor(k / dims[j]);
        }
        transposedData[newIndex] = array[i];
    }

    return [transposedData, shape];
}

module.exports = {
    interpolate,
    transpose: transpose_data,
}


/***/ }),

/***/ "./src/models.js":
/*!***********************!*\
  !*** ./src/models.js ***!
  \***********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const {
    Callable,
    getModelFile,
    fetchJSON,
    dispatchCallback,
    isIntegralNumber,
} = __webpack_require__(/*! ./utils.js */ "./src/utils.js");

const {
    Sampler,
} = __webpack_require__(/*! ./samplers.js */ "./src/samplers.js");


const {
    LogitsProcessorList,
    GenerationConfig,
    ForceTokensLogitsProcessor,
    ForcedBOSTokenLogitsProcessor,
    ForcedEOSTokenLogitsProcessor,
    WhisperTimeStampLogitsProcessor,
    NoRepeatNGramLogitsProcessor,
    RepetitionPenaltyLogitsProcessor
} = __webpack_require__(/*! ./generation.js */ "./src/generation.js");

const { executionProviders, ONNX } = __webpack_require__(/*! ./backends/onnx.js */ "./src/backends/onnx.js");
const {
    Tensor,
    cat
} = __webpack_require__(/*! ./tensor_utils */ "./src/tensor_utils.js");
const { InferenceSession, Tensor: ONNXTensor } = ONNX;

//////////////////////////////////////////////////
// Helper functions
/**
 * Constructs an InferenceSession using a model file located at the specified path.
 * @param {string} modelPath - The path to the directory containing the model file.
 * @param {string} fileName - The name of the model file.
 * @param {function} [progressCallback=null] - An optional function to track progress during the creation of the session.
 * @returns {Promise<InferenceSession>} - A Promise that resolves to an InferenceSession object.
 */
async function constructSession(modelPath, fileName, progressCallback = null) {
    let buffer = await getModelFile(modelPath, fileName, progressCallback);

    // TODO add option for user to force specify their desired execution provider
    try {
        return await InferenceSession.create(buffer, {
            executionProviders,
        });
    } catch (err) {
        console.warn(err);
        console.warn(
            'Something went wrong during model construction (most likely a missing operation). ' +
            'Using `wasm` as a fallback. '
        )
        return await InferenceSession.create(buffer, {
            executionProviders: ['wasm']
        });
    }
}

/**
 * Executes an InferenceSession using the specified inputs.
 * @param {InferenceSession} session - The InferenceSession object to run.
 * @param {Object} inputs - An object that maps input names to input tensors.
 * @returns {Promise<Object>} - A Promise that resolves to an object that maps output names to output tensors.
 */
async function sessionRun(session, inputs) {
    try {
        let output = await session.run(inputs);
        output = replaceTensors(output);
        return output;
    } catch (e) {
        console.error(`An error occurred during model execution: "${e}".`);
        console.error('Inputs given to model:', inputs);
        throw e;
    }
}

/**
 * Replaces ONNX Tensor objects with custom Tensor objects to support additional functions.
 * @param {Object} obj - The object to replace tensor objects in.
 * @returns {Object} - The object with tensor objects replaced by custom Tensor objects.
 */
function replaceTensors(obj) {
    // Convert ONNX Tensors with our custom Tensor class
    // to support additional functions
    for (let prop in obj) {
        if (obj[prop] instanceof ONNXTensor) {
            obj[prop] = new Tensor(obj[prop]);
        }
    }
    return obj;
}

/**
 * Prepares an attention mask for a sequence of tokens based on configuration options.
 * @param {Object} self - The calling object instance.
 * @param {Tensor} tokens - The input tokens.
 * @returns {Tensor} - The attention mask tensor.
 */
function _prepare_attention_mask(self, tokens) {

    // Prepare attention mask
    let pad_token_id = self.config.pad_token_id ?? null;
    let eos_token_id = self.config.eos_token_id ?? null;
    if (isIntegralNumber(eos_token_id)) {
        eos_token_id = [eos_token_id];
    }

    let is_pad_token_in_inputs = tokens.indexOf(pad_token_id) !== -1;
    let is_pad_token_not_equal_to_eos_token_id = (eos_token_id === null) || !eos_token_id.includes(pad_token_id)

    if (is_pad_token_in_inputs && is_pad_token_not_equal_to_eos_token_id) {
        let data = BigInt64Array.from(
            // Note: != so that int matches bigint
            tokens.data.map(x => x != pad_token_id)
        )
        return new Tensor('int64', data, tokens.dims)
    } else {
        return new Tensor(
            'int64',
            new BigInt64Array(tokens.data.length).fill(1n),
            tokens.dims
        )
    }
}

/**
 * Creates a boolean tensor with a single value.
 * @param {boolean} value - The value of the tensor.
 * @returns {Tensor} - The boolean tensor.
 */
function boolTensor(value) {
    // Create boolean tensor
    return new Tensor('bool', [value], [1]);
}

// JS doesn't support mixins, so we define some reused functions here, and allow "this" to be passed in
/**
 * Loads a sequence-to-sequence model from the specified path.
 * @param {string} modelPath - The path to the model directory.
 * @param {function} progressCallback - The optional progress callback function.
 * @returns {Promise<[any, any, any, any]>} - A promise that resolves with information about the loaded model.
 */
async function seq2seqLoadModel(modelPath, progressCallback) {
    let info = await Promise.all([
        fetchJSON(modelPath, 'config.json', progressCallback),
        constructSession(modelPath, 'encoder_model.onnx', progressCallback),
        constructSession(modelPath, 'decoder_model_merged.onnx', progressCallback),
        fetchJSON(modelPath, 'generation_config.json', progressCallback, false),
    ])

    // Called when all parts are loaded
    dispatchCallback(progressCallback, {
        status: 'loaded',
        name: modelPath
    });

    return info;
}

/**
 * Perform forward pass on the seq2seq model.
 * @async
 * @function
 * @param {Object} self - The seq2seq model object.
 * @param {Object} model_inputs - The input object for the model containing encoder and decoder inputs.
 * @param {Object} options - The options
 * @param {string} [options.encoder_input_name='input_ids'] - The name of the input tensor for the encoder.
 * @param {boolean} [options.add_decoder_pkv=true] - Flag to add the decoder past key values.
 * @returns {Promise<Seq2SeqLMOutput>} - Promise that resolves with the output of the seq2seq model.
 */
async function seq2seq_forward(self, model_inputs, {
    encoder_input_name = 'input_ids',
    add_decoder_pkv = true
} = {}) {
    let encoderOutputs = model_inputs.encoder_outputs;
    let pastKeyValues = model_inputs.past_key_values;

    if (encoderOutputs === null) {
        const encoderFeeds = {
            [encoder_input_name]: model_inputs[encoder_input_name],
        }

        if (self.session.inputNames.includes('attention_mask')) {
            encoderFeeds.attention_mask = model_inputs.attention_mask
        }
        const encoderResults = await sessionRun(self.session, encoderFeeds);
        encoderOutputs = encoderResults.last_hidden_state;
    }
    let decoderFeeds = {
        input_ids: model_inputs.decoder_input_ids,
        encoder_hidden_states: encoderOutputs,
        use_cache_branch: boolTensor(pastKeyValues !== null)
    };

    if (self.decoder_merged_session.inputNames.includes('encoder_attention_mask')) {
        decoderFeeds.encoder_attention_mask = model_inputs.attention_mask
    }
    self.addPastKeyValues(decoderFeeds, pastKeyValues, add_decoder_pkv);

    const decoderResults = await sessionRun(self.decoder_merged_session, decoderFeeds);
    let logits = decoderResults.logits;
    pastKeyValues = self.getPastKeyValues(decoderResults, pastKeyValues);
    return new Seq2SeqLMOutput(logits, pastKeyValues, encoderOutputs);
}

/**
 * Start the beam search process for the seq2seq model.
 * @function
 * @param {Object} self - The seq2seq model object.
 * @param {Object[]} inputTokenIds - Array of input token ids for each input sequence.
 * @param {number} numOutputTokens - The maximum number of output tokens for the model.
 * @param {boolean} [requires_attention_mask=true] - Flag to indicate if the model requires an attention mask.
 * @returns {Object[]} - Array of beam search objects.
 */
function seq2seqStartBeams(self, inputTokenIds, numOutputTokens, requires_attention_mask = true) {
    let beams = [];
    let beamId = 0;
    for (let tokens of inputTokenIds) {
        // TODO: Improve
        // Currently, just add back batch dimension.
        // In future, allow for true parallel execution
        tokens.dims = [1, ...tokens.dims]

        // Create beam
        let start = {
            inputs: tokens,
            encoder_outputs: null,
            past_key_values: null,

            // decoder_input_ids == output_token_ids
            output_token_ids: [self.config.decoder_start_token_id],
            done: false,
            score: 0,
            id: beamId++ // assign unique id to beams
        }

        if (requires_attention_mask) {
            start.attention_mask = _prepare_attention_mask(self, tokens);
        }

        beams.push(start);
    }

    return beams;
}

/**
 * Run beam search on the seq2seq model for a single beam.
 * @async
 * @function
 * @param {Object} self - The seq2seq model object.
 * @param {Object} beam - The beam search object for which to run the model.
 * @param {Object} options - options
 * @param {string} [options.input_name='input_ids'] - The name of the input tensor for the encoder.
 * @returns {Promise<Object>} - Promise that resolves with the output of the seq2seq model for the given beam.
 */
async function seq2seqRunBeam(self, beam, {
    input_name = 'input_ids',
} = {}
) {
    // 1. Prepare
    let model_inputs = {
        [input_name]: beam.inputs,
        decoder_input_ids: self.toI64Tensor(beam.output_token_ids.slice(-1)),
        encoder_outputs: beam.encoder_outputs,
        past_key_values: beam.past_key_values,
    }
    if (beam.attention_mask) {
        model_inputs.attention_mask = beam.attention_mask
    }

    // 2. Run
    let output = await self.forward(model_inputs);

    // 3. Update
    beam.past_key_values = output.past_key_values;
    beam.encoder_outputs = output.encoder_outputs;

    return output;
}

/**
 * Forward pass of the text generation model.
 * @async
 * @function
 * @param {Object} self - The text generation model object.
 * @param {Object} model_inputs - The input data to be used for the forward pass.
 * @returns {Promise<Object>} - Promise that resolves with an object containing the logits and past key values.
 */
async function textgen_forward(self, model_inputs) {
    let past_key_values = model_inputs.past_key_values;
    let decoderFeeds = {
        input_ids: model_inputs.input_ids,
        attention_mask: model_inputs.attention_mask,
        use_cache_branch: boolTensor(past_key_values !== null)
    }
    self.addPastKeyValues(decoderFeeds, past_key_values)

    let decoderResults = await sessionRun(self.session, decoderFeeds);
    let logits = decoderResults.logits;

    past_key_values = self.getPastKeyValues(decoderResults, past_key_values);
    return { logits, past_key_values };
}

/**
 * Starts the generation of text by initializing the beams for the given input token IDs.
 * @param {Object} self - The text generation model object.
 * @param {any} inputTokenIds - An array of input token IDs to generate text from.
 * @param {number} numOutputTokens - The maximum number of tokens to generate for each beam.
 * @param {Tensor} [inputs_attention_mask] - The attention mask tensor for the input token IDs.
 * @returns {Object[]} An array of beams initialized with the given inputs and parameters.
 */
function textgenStartBeams(self, inputTokenIds, numOutputTokens, inputs_attention_mask) {
    let beams = [];

    let beamId = 0;
    for (let tokens of inputTokenIds) {
        // TODO: Improve
        // Currently, just add back batch dimension.
        // In future, allow for true parallel execution
        tokens.dims = [1, ...tokens.dims]

        let attn_mask;
        if (inputs_attention_mask) {
            attn_mask = inputs_attention_mask.get(beamId)
            attn_mask.dims = [1, ...attn_mask.dims]

        } else {
            attn_mask = _prepare_attention_mask(self, tokens)
        }

        let start = {
            input: tokens,
            model_input_ids: tokens,
            attention_mask: attn_mask,
            past_key_values: null,

            output_token_ids: [],
            num_output_tokens: numOutputTokens,

            done: false,
            score: 0,
            id: beamId++ // assign unique id to beams
        }

        beams.push(start);
    }
    return beams;
}

/**
 * Runs a single step of the text generation process for a given beam.
 *
 * @async
 * @function textgenRunBeam
 * @param {Object} self - The textgen object.
 * @param {Object} beam - The beam to run.
 * @param {Tensor} beam.input - The input tensor.
 * @param {Tensor} beam.model_input_ids - The input ids to the model.
 * @param {Tensor} beam.attention_mask - The attention mask.
 * @param {Object} beam.past_key_values - The past key values.
 * @param {number[]} beam.output_token_ids - The output token ids.
 * @returns {Promise<Object>} The output of the generation step.
 */
async function textgenRunBeam(self, beam) {
    let attnMaskData = new BigInt64Array(beam.input.data.length + beam.output_token_ids.length).fill(1n)

    // 1. Prepare
    let model_inputs = {
        input_ids: beam.model_input_ids,
        attention_mask: new Tensor(
            'int64',
            attnMaskData,
            [1, attnMaskData.length]
        ),
        past_key_values: beam.past_key_values,
    }

    // 2. Run
    let output = await self.forward(model_inputs);

    // 3. Update
    beam.past_key_values = output.past_key_values;

    return output;
}

/**
 * Update a beam with a new token ID.
 * @param {object} beam - The beam to update.
 * @param {number} newTokenId - The new token ID to add to the beam's output.
 */
function textgenUpdatebeam(beam, newTokenId) {
    beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    beam.model_input_ids = new Tensor('int64', [BigInt(newTokenId)], [1, 1]);
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Base class
/**
 * A base class for pre-trained models that provides the model configuration and an ONNX session.
 * @extends Callable
 */
class PreTrainedModel extends Callable {
    /**
     * Creates a new instance of the `PreTrainedModel` class.
     * @param {object} config - The model configuration.
     * @param {any} session - session for the model.
     */
    constructor(config, session) {
        super();

        this.config = config;
        this.session = session;
    }

    /**
    * Disposes of all the ONNX sessions that were created during inference.
    * @returns {Promise<unknown[]>} - An array of promises, one for each ONNX session that is being disposed.
    */
    async dispose() {
        // Dispose of all ONNX sessions sessions
        // TODO use: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry

        let promises = [];
        for (let key of Object.keys(this)) {
            let item = this[key];
            if (item instanceof InferenceSession) {
                promises.push(item.handler.dispose())
            }
        }
        return await Promise.all(promises);
    }

    /**
     * Loads a pre-trained model from the given modelPath.
     * @static
     * @async
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} progressCallback - A function to be called with progress updates.
     * @returns {Promise<PreTrainedModel>} A new instance of the PreTrainedModel class.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let config = await fetchJSON(modelPath, 'config.json', progressCallback);
        let modelName = config.is_encoder_decoder ? 'encoder_model.onnx' : 'model.onnx';

        // Load model
        let session = await constructSession(modelPath, modelName, progressCallback);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        return new this(config, session);
    }

    /**
     * Converts an array or Tensor of integers to an int64 Tensor.
     * @param {Array|Tensor} items - The input integers to be converted.
     * @returns {Tensor} The int64 Tensor with the converted values.
     * @throws {Error} If the input array is empty or the input is a batched Tensor and not all sequences have the same length.
     */
    toI64Tensor(items) {
        if (items instanceof Tensor) {
            return items;
        }
        // items is an array
        if (items.length === 0) {
            throw Error("items must be non-empty");
        }

        if (Array.isArray(items[0])) {
            // batched
            if (items.some(x => x.length !== items[0].length)) {
                throw Error("Unable to create tensor, you should probably activate truncation and/or padding with 'padding=True' and/or 'truncation=True' to have batched tensors with the same length.")
            }

            return new Tensor('int64',
                BigInt64Array.from(items.flat().map(x => BigInt(x))),
                [items.length, items[0].length]
            );
        } else {
            //flat
            return new Tensor('int64',
                BigInt64Array.from(items.map(x => BigInt(x))),
                [1, items.length]
            );
        }
    }

    /**
     * Runs the model with the provided inputs
     * @param {Object} model_inputs - Object containing input tensors
     * @returns {Promise<Object>} - Object containing output tensors
     */
    async _call(model_inputs) {
        return await sessionRun(this.session, model_inputs);
    }

    /**
     * Forward method should be implemented in subclasses.
     * @abstract
     * @param {object} model_inputs - The input data to the model in the format specified in the ONNX model.
     * @returns {Promise<object>} - The output data from the model in the format specified in the ONNX model.
     * @throws {Error} - This method must be implemented in subclasses.
     */
    async forward(model_inputs) {
        throw Error("forward should be implemented in subclasses.")
    }

    /**
     * @param {GenerationConfig} generation_config 
     * @param {number} input_ids_seq_length 
     * @returns {LogitsProcessorList}
     */
    _get_logits_processor(
        generation_config,
        input_ids_seq_length,
        // encoder_input_ids, TODO
        // prefix_allowed_tokens_fn, TODO
        logits_processor = null
    ) {
        const processors = new LogitsProcessorList();

        // if (generation_config.diversity_penalty !== null && generation_config.diversity_penalty > 0.0) {
        //     processors.push(new HammingDiversityLogitsProcessor(
        //         generation_config.diversity_penalty,
        //         generation_config.num_beams,
        //         generation_config.num_beam_groups
        //     ));
        // }

        // if (generation_config.encoder_repetition_penalty !== null && generation_config.encoder_repetition_penalty !== 1.0) {
        //     processors.push(new EncoderRepetitionPenaltyLogitsProcessor(
        //         generation_config.encoder_repetition_penalty,
        //         encoder_input_ids
        //     ));
        // }

        if (generation_config.repetition_penalty !== null && generation_config.repetition_penalty !== 1.0) {
            processors.push(new RepetitionPenaltyLogitsProcessor(generation_config.repetition_penalty));
        }

        if (generation_config.no_repeat_ngram_size !== null && generation_config.no_repeat_ngram_size > 0) {
            processors.push(new NoRepeatNGramLogitsProcessor(generation_config.no_repeat_ngram_size));
        }

        // if (generation_config.encoder_no_repeat_ngram_size !== null && generation_config.encoder_no_repeat_ngram_size > 0) {
        //     if (this.config.is_encoder_decoder) {
        //         processors.push(new EncoderNoRepeatNGramLogitsProcessor(
        //             generation_config.encoder_no_repeat_ngram_size,
        //             encoder_input_ids
        //         ));
        //     } else {
        //         throw new Error("It's impossible to use `encoder_no_repeat_ngram_size` with decoder-only architecture");
        //     }
        // }

        // if (generation_config.bad_words_ids !== null) {
        //     processors.push(new NoBadWordsLogitsProcessor(generation_config.bad_words_ids, generation_config.eos_token_id));
        // }

        // if (generation_config.min_length !== null && generation_config.eos_token_id !== null && generation_config.min_length > 0) {
        //     processors.push(new MinLengthLogitsProcessor(generation_config.min_length, generation_config.eos_token_id));
        // }

        // if (generation_config.min_new_tokens !== null && generation_config.eos_token_id !== null && generation_config.min_new_tokens > 0) {
        //     processors.push(new MinNewTokensLengthLogitsProcessor(
        //         input_ids_seq_length,
        //         generation_config.min_new_tokens,
        //         generation_config.eos_token_id
        //     ));
        // }

        // if (prefix_allowed_tokens_fn !== null) {
        //     processors.push(new PrefixConstrainedLogitsProcessor(
        //         prefix_allowed_tokens_fn,
        //         generation_config.num_beams / generation_config.num_beam_groups
        //     ));
        // }


        if (generation_config.forced_bos_token_id !== null) {
            processors.push(new ForcedBOSTokenLogitsProcessor(generation_config.forced_bos_token_id));
        }

        if (generation_config.forced_eos_token_id !== null) {
            processors.push(new ForcedEOSTokenLogitsProcessor(
                generation_config.max_length,
                generation_config.forced_eos_token_id
            ));
        }

        // if (generation_config.remove_invalid_values === true) {
        //     processors.push(new InfNanRemoveLogitsProcessor());
        // }

        // if (generation_config.exponential_decay_length_penalty !== null) {
        //     processors.push(new ExponentialDecayLengthPenalty(
        //         generation_config.exponential_decay_length_penalty,
        //         generation_config.eos_token_id,
        //         input_ids_seq_length
        //     ));
        // }

        // if (generation_config.suppress_tokens !== null) {
        //     processors.push(new SuppressTokensLogitsProcessor(generation_config.suppress_tokens));
        // }

        // if (generation_config.begin_suppress_tokens !== null) {
        //     let begin_index = input_ids_seq_length;
        //     begin_index = (input_ids_seq_length > 1 || generation_config.forced_bos_token_id === null) ? begin_index : begin_index + 1;
        //     if (generation_config.forced_decoder_ids !== null) {
        //         begin_index += generation_config.forced_decoder_ids[generation_config.forced_decoder_ids.length - 1][0];
        //     }
        //     processors.push(new SuppressTokensAtBeginLogitsProcessor(generation_config.begin_suppress_tokens, begin_index));
        // }

        if (generation_config.forced_decoder_ids !== null) {
            processors.push(new ForceTokensLogitsProcessor(generation_config.forced_decoder_ids));
        }

        if (logits_processor !== null) {
            processors.extend(logits_processor)
        }

        // `LogitNormalization` should always be the last logit processor, when present
        // if (generation_config.renormalize_logits === true) {
        //     processors.push(new LogitNormalization());
        // }

        return processors;
    }

    /**
   * This function merges multiple generation configs together to form a final generation config to be used by the model for text generation.
   * It first creates an empty `GenerationConfig` object, then it applies the model's own `generation_config` property to it. Finally, if a `generation_config` object was passed in the arguments, it overwrites the corresponding properties in the final config with those of the passed config object.
   *
   * @param {GenerationConfig} generation_config - A `GenerationConfig` object containing generation parameters.
   * @returns {GenerationConfig} The final generation config object to be used by the model for text generation.
   */
    _get_generation_config(generation_config) {
        // Create empty generation config (contains defaults)
        let gen_config = new GenerationConfig();

        // Apply model's generation config, if it exists
        if ('generation_config' in this) {
            Object.assign(gen_config, this.generation_config);
        }

        // Finally, use any generation config specified by the user
        // when calling `generate`
        if (generation_config !== null) {
            Object.assign(gen_config, generation_config);
        }
        return gen_config;
    }

    /**
   * Generates text based on the given inputs and generation configuration using the model.
   * @param {Array} inputs - An array of input token IDs.
   * @param {Object|null} generation_config - The generation configuration to use. If null, default configuration will be used.
   * @param {Object|null} logits_processor - An optional logits processor to use. If null, a new LogitsProcessorList instance will be created.
   * @param {Object} options - options
   * @param {Object} [options.inputs_attention_mask=null] - An optional attention mask for the inputs.
   * @returns {Promise<Array>} An array of generated output sequences, where each sequence is an array of token IDs.
   * @throws {Error} Throws an error if the inputs array is empty.
   */
    async generate(
        inputs,
        generation_config = null,
        logits_processor = null,
        {
            inputs_attention_mask = null
        } = {},
    ) {

        if (inputs.length === 0) {
            throw Error("Must supply a non-empty array of input token ids.")
        }

        // Update generation config with defaults
        generation_config = this._get_generation_config(generation_config);

        logits_processor = logits_processor ?? new LogitsProcessorList()

        // TODO Update generation config
        // this.generation_config

        // Update logits processor
        logits_processor = this._get_logits_processor(
            generation_config,
            inputs.length,
            logits_processor
        )

        // TODO implement early_stopping
        // https://huggingface.co/blog/how-to-generate

        let numOutputTokens = 1;
        const maxOutputTokens = numOutputTokens + (generation_config.max_new_tokens ?? Infinity);

        let sampler = Sampler.getSampler(generation_config);

        let beams = this.getStartBeams(inputs, numOutputTokens, inputs_attention_mask);

        while (beams.some(x => !x.done) && numOutputTokens < maxOutputTokens) {
            let newest_beams = [];
            for (let beam of beams) {
                if (beam.done) {
                    // TODO add length penalty (for ending early)
                    // Add this beam back into the pool
                    newest_beams.push(beam);
                    continue
                }

                let output = await this.runBeam(beam);

                // Logits are of the form [batch_size, out_seq_length, vocab_size]
                // In most cases, this will be [batch_size, 1, vocab_size]
                // So, we select the last token's logits:
                // (equivalent to `logits = outputs.logits[:, -1, :]`)
                let extractedLogits = [];
                for (const batch of output.logits) {
                    // Extract logits corresponding to the last token
                    let lastLogits = batch.get(batch.dims[0] - 1);

                    // Add back batch dimension (needed for `cat`)
                    lastLogits.dims = [1, ...lastLogits.dims];
                    extractedLogits.push(lastLogits)
                }
                let logits = cat(extractedLogits);
                logits_processor(beam.output_token_ids, logits)

                let sampledTokens = sampler(logits);
                for (let [newTokenId, logProb] of sampledTokens) {
                    // use previous beam as a starting point
                    let newBeam = { ...beam };

                    // update new beam
                    this.updateBeam(newBeam, newTokenId);

                    newBeam.score += logProb;

                    if (newTokenId === this.config.eos_token_id) {
                        newBeam.done = true;
                    }
                    newest_beams.push(newBeam);
                }
            }
            ++numOutputTokens;

            // Next, we get the best beams, per ID
            newest_beams = this.groupBeams(newest_beams).map(
                group => group
                    .sort((a, b) => b.score - a.score)  // sort based on score
                    .slice(0, generation_config.num_beams)        // remove outside beam width
            );

            // Flatten beams
            beams = newest_beams.flat();

            // Run callback
            if (generation_config.callback_function) {
                generation_config.callback_function(beams);
            }
        }

        return this.groupBeams(beams).map(
            batch => {
                if (generation_config.num_return_sequences > 1) {
                    return batch.slice(0, generation_config.num_return_sequences).map(x => x.output_token_ids);
                } else {
                    return [batch[0].output_token_ids];
                }
            }
        )
    }

    /**
     * Groups an array of beam objects by their ids.
     *
     * @param {Array} beams - The array of beam objects to group.
     * @returns {Array} - An array of arrays, where each inner array contains beam objects with the same id.
     */
    groupBeams(beams) {
        // Group beams by their ids
        const groups = {};
        for (const obj of beams) {
            if (groups[obj.id] === undefined) {
                groups[obj.id] = [obj];
            } else {
                groups[obj.id].push(obj);
            }
        }

        return Object.values(groups);
    }

    /**
     * Returns an object containing past key values from the given decoder results object.
     *
     * @param {Object} decoderResults - The decoder results object.
     * @param {Object} pastKeyValues - The previous past key values.
     * @returns {Object} - An object containing past key values.
     */
    getPastKeyValues(decoderResults, pastKeyValues) {

        const pkvs = {};

        for (const name in decoderResults) {
            if (name.startsWith('present')) {
                let newName = name.replace('present', 'past_key_values');

                if (pastKeyValues !== null && name.includes('encoder')) {
                    // Optimization introduced by optimum to reuse past key values. So, we just replace the constant
                    // outputs with the previous past key values.
                    // https://github.com/huggingface/optimum/blob/0bf2c05fb7e1182b52d21b703cfc95fd9e4ea3dc/optimum/onnxruntime/base.py#L677-L704
                    pkvs[newName] = pastKeyValues[newName];
                } else {
                    pkvs[newName] = decoderResults[name];
                }
            }
        }
        return pkvs;
    }

    /**
     * Adds past key values to the decoder feeds object. If pastKeyValues is null, creates new tensors for past key values.
     *
     * @param {Object} decoderFeeds - The decoder feeds object to add past key values to.
     * @param {Object} pastKeyValues - An object containing past key values.
     * @param {boolean} [hasDecoder=false] - Whether the model has a decoder.
     */
    addPastKeyValues(decoderFeeds, pastKeyValues, hasDecoder = false) {
        if (pastKeyValues === null) {
            // TODO support batches (i.e., batch_size > 1)
            if (hasDecoder) {
                let encoder_dims = [1, this.num_encoder_heads, 0, this.encoder_dim_kv];
                for (let i = 0; i < this.num_encoder_layers; ++i) {
                    decoderFeeds[`past_key_values.${i}.encoder.key`] = new Tensor('float32', [], encoder_dims)
                    decoderFeeds[`past_key_values.${i}.encoder.value`] = new Tensor('float32', [], encoder_dims)
                }

                let decoder_dims = [1, this.num_decoder_heads, 0, this.decoder_dim_kv];
                for (let i = 0; i < this.num_decoder_layers; ++i) {
                    decoderFeeds[`past_key_values.${i}.decoder.key`] = new Tensor('float32', [], decoder_dims)
                    decoderFeeds[`past_key_values.${i}.decoder.value`] = new Tensor('float32', [], decoder_dims)
                }

            } else {
                let dims = [1, this.num_heads, 0, this.dim_kv]
                for (let i = 0; i < this.num_layers; ++i) {
                    decoderFeeds[`past_key_values.${i}.key`] = new Tensor('float32', [], dims)
                    decoderFeeds[`past_key_values.${i}.value`] = new Tensor('float32', [], dims)
                }
            }

        } else {
            Object.assign(decoderFeeds, pastKeyValues)
        }
    }
}
//////////////////////////////////////////////////
// Base model output class
class ModelOutput { }


//////////////////////////////////////////////////
// Bert models
class BertPreTrainedModel extends PreTrainedModel { }
class BertModel extends BertPreTrainedModel { }

/**
 * BertForMaskedLM is a class representing a BERT model for masked language modeling.
 * @extends BertPreTrainedModel
 */
class BertForMaskedLM extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - An object containing the model's output logits for masked language modeling.
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}

/**
 * BertForSequenceClassification is a class representing a BERT model for sequence classification.
 * @extends BertPreTrainedModel
 */
class BertForSequenceClassification extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - An object containing the model's output logits for sequence classification.
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}

/**
 * BertForTokenClassification is a class representing a BERT model for token classification.
 * @extends BertPreTrainedModel
 */
class BertForTokenClassification extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} - An object containing the model's output logits for token classification.
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new TokenClassifierOutput(logits)
    }
}

/**
 * BertForQuestionAnswering is a class representing a BERT model for question answering.
 * @extends BertPreTrainedModel
 */
class BertForQuestionAnswering extends BertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - An object containing the model's output logits for question answering.
     */
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// DistilBert models
class DistilBertPreTrainedModel extends PreTrainedModel { }
class DistilBertModel extends DistilBertPreTrainedModel { }

/**
 * DistilBertForSequenceClassification is a class representing a DistilBERT model for sequence classification.
 * @extends DistilBertPreTrainedModel
 */
class DistilBertForSequenceClassification extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - An object containing the model's output logits for sequence classification.
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}

/**
 * DistilBertForTokenClassification is a class representing a DistilBERT model for token classification.
 * @extends DistilBertPreTrainedModel
 */
class DistilBertForTokenClassification extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<TokenClassifierOutput>} - An object containing the model's output logits for token classification.
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new TokenClassifierOutput(logits)
    }
}


/**
 * DistilBertForQuestionAnswering is a class representing a DistilBERT model for question answering.
 * @extends DistilBertPreTrainedModel
 */
class DistilBertForQuestionAnswering extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - An object containing the model's output logits for question answering.
     */
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}

/**
 * DistilBertForMaskedLM is a class representing a DistilBERT model for masking task.
 * @extends DistilBertPreTrainedModel
 */
class DistilBertForMaskedLM extends DistilBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// MobileBert models
class MobileBertPreTrainedModel extends PreTrainedModel { }
class MobileBertModel extends MobileBertPreTrainedModel { }

/**
 * MobileBertForMaskedLM is a class representing a MobileBERT model for masking task.
 * @extends MobileBertPreTrainedModel
 */
class MobileBertForMaskedLM extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}

/**
 * @extends MobileBertPreTrainedModel
 */
class MobileBertForSequenceClassification extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}

/**
 * @extends MobileBertPreTrainedModel
 */
class MobileBertForQuestionAnswering extends MobileBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// SqueezeBert models
class SqueezeBertPreTrainedModel extends PreTrainedModel { }
class SqueezeBertModel extends SqueezeBertPreTrainedModel { }
class SqueezeBertForMaskedLM extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}
class SqueezeBertForSequenceClassification extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}
class SqueezeBertForQuestionAnswering extends SqueezeBertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// Albert models
class AlbertPreTrainedModel extends PreTrainedModel { }
class AlbertModel extends AlbertPreTrainedModel { }
class AlbertForSequenceClassification extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}
class AlbertForQuestionAnswering extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
class AlbertForMaskedLM extends AlbertPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// T5 models
class T5PreTrainedModel extends PreTrainedModel { };

class T5Model extends T5PreTrainedModel {
    /**
     * Generates text based on the provided arguments.
     * @throws {Error} - Throws an error as the current model class (T5Model) is not compatible with `.generate()`.
     * @returns {Promise<any>}
     * @param {any[]} args
     */
    async generate(...args) {
        throw Error(
            "The current model class (T5Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'T5ForConditionalGeneration'}"
        )
    }
}

/**
 * T5Model is a class representing a T5 model for conditional generation.
 * @extends T5PreTrainedModel
 */
class T5ForConditionalGeneration extends T5PreTrainedModel {
    /**
     * Creates a new instance of the `T5ForConditionalGeneration` class.
     * @param {object} config - The model configuration.
     * @param {any} session - session for the model.
     * @param {any} decoder_merged_session - session for the decoder.
     * @param {GenerationConfig} generation_config - The generation configuration.
     */
    constructor(config, session, decoder_merged_session, generation_config) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;
        this.generation_config = generation_config;

        this.num_decoder_layers = this.config.num_decoder_layers;
        this.num_decoder_heads = this.config.num_heads;
        this.decoder_dim_kv = this.config.d_kv;

        this.num_encoder_layers = this.config.num_layers;
        this.num_encoder_heads = this.config.num_heads;
        this.encoder_dim_kv = this.config.d_kv;
    }

    /**
     * Loads the pre-trained model from a given path.
     * @async
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} progressCallback - A function to call with progress updates (optional).
     * @returns {Promise<T5ForConditionalGeneration>} The loaded model instance.
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    /**
     * Generates the start beams for a given set of inputs and output length.
     * @param {number[][]} inputs - The input token IDs.
     * @param {number} numOutputTokens - The desired output length.
     * @returns {Array} The start beams.
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * Updates the given beam with a new token ID.
     * @param {any} beam - The current beam.
     * @param {number} newTokenId - The new token ID to add to the output sequence.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Runs the forward pass of the model for a given set of inputs.
     * @async
     * @param {Object} model_inputs - The model inputs.
     * @returns {Promise<Object>} The model output.
     */
    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// MT5 models
class MT5PreTrainedModel extends PreTrainedModel { };

class MT5Model extends MT5PreTrainedModel {
    /**
     * 
     * @param  {...any} args
     * @returns {Promise<any>}
     * @throws {Error}
     */
    async generate(...args) {
        throw Error(
            "The current model class (MT5Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'MT5ForConditionalGeneration'}"
        )
    }
}

/**
 * A class representing a conditional sequence-to-sequence model based on the MT5 architecture.
 *
 * @extends MT5PreTrainedModel
 */
class MT5ForConditionalGeneration extends MT5PreTrainedModel {
    /**
     * Creates a new instance of the `MT5ForConditionalGeneration` class.
     * @param {any} config - The model configuration.
     * @param {any} session - The ONNX session containing the encoder weights.
     * @param {any} decoder_merged_session - The ONNX session containing the merged decoder weights.
     * @param {GenerationConfig} generation_config - The generation configuration.
     */
    constructor(config, session, decoder_merged_session, generation_config) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;
        this.generation_config = generation_config;

        this.num_decoder_layers = this.config.num_decoder_layers;
        this.num_decoder_heads = this.config.num_heads;
        this.decoder_dim_kv = this.config.d_kv;

        this.num_encoder_layers = this.config.num_layers;
        this.num_encoder_heads = this.config.num_heads;
        this.encoder_dim_kv = this.config.d_kv;
    }

    /**
     * Loads a pre-trained model from the given path.
     *
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function that is called with the download progress percentage (0-100).
     * @returns {Promise<any>} - A Promise that resolves to a new `MT5ForConditionalGeneration` instance.
     * @static
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    /**
   * Generates the start beams for the given input tokens and output sequence length.
   *
   * @param {any[]} inputs - The input sequence.
   * @param {number} numOutputTokens - The desired length of the output sequence.
   * @param {...*} args - Additional arguments to pass to the `seq2seqStartBeams` function.
   * @returns {any[]} - An array of `Beam` objects representing the start beams.
   */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new predicted token.
     * @param {any} beam - The beam to update.
     * @param {number} newTokenId - The index of the predicted token.
    */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
    * Runs the forward pass of the model on the given inputs.
    * @param {any} model_inputs - The model inputs.
    * @returns {Promise<any>} - A Promise that resolves to the model outputs.
    */
    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Bart models
class BartPretrainedModel extends PreTrainedModel { };

/**
 * BART encoder and decoder model.
 * 
 * @hideconstructor
 * @extends BartPretrainedModel
 */
class BartModel extends BartPretrainedModel {
    /**
     * Throws an error because the current model class (BartModel) is not compatible with `.generate()`.
     * 
     * @async
     * @throws {Error} The current model class (BartModel) is not compatible with `.generate()`.
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (BartModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'BartForConditionalGeneration'}"
        )
    }
}

/**
 * BART model with a language model head for conditional generation.
 * @extends BartPretrainedModel
 */
class BartForConditionalGeneration extends BartPretrainedModel {
    /**
     * Creates a new instance of the `BartForConditionalGeneration` class.
     * @param {object} config - The configuration object for the Bart model.
     * @param {object} session - The ONNX session used to execute the model.
     * @param {object} decoder_merged_session - The ONNX session used to execute the decoder.
     * @param {object} generation_config - The generation configuration object.
     */
    constructor(config, session, decoder_merged_session, generation_config) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;
        this.generation_config = generation_config;

        this.num_decoder_layers = this.config.decoder_layers;
        this.num_decoder_heads = this.config.decoder_attention_heads;
        this.decoder_dim_kv = this.config.d_model / this.num_decoder_heads;

        this.num_encoder_layers = this.config.encoder_layers;
        this.num_encoder_heads = this.config.encoder_attention_heads;
        this.encoder_dim_kv = this.config.d_model / this.num_encoder_heads;
    }

    /**
     * Loads a BartForConditionalGeneration instance from a pretrained model stored on disk.
     * @param {string} modelPath - The path to the directory containing the pretrained model.
     * @param {function} [progressCallback=null] - An optional callback function to track the download progress.
     * @returns {Promise<BartForConditionalGeneration>} - The pretrained BartForConditionalGeneration instance.
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    /**
     * Returns the initial beam for generating output text.
     * @param {object} inputs - The input object containing the encoded input text.
     * @param {number} numOutputTokens - The maximum number of output tokens to generate.
     * @param  {...any} args - Additional arguments to pass to the sequence-to-sequence generation function.
     * @returns {any} - The initial beam for generating output text.
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * Updates the beam by appending the newly generated token ID to the list of output token IDs.
     * @param {any} beam - The current beam being generated.
     * @param {number} newTokenId - The ID of the newly generated token to append to the list of output token IDs.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Runs the forward pass of the model for a given set of inputs.
     * @async
     * @param {Object} model_inputs - The model inputs.
     * @returns {Promise<Object>} The model output.
     */
    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs);
    }
}

class BartForSequenceClassification extends BartPretrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - An object containing the model's output logits for sequence classification.
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}

//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Roberta models
class RobertaPreTrainedModel extends PreTrainedModel { }
class RobertaModel extends RobertaPreTrainedModel { }

/**
 * RobertaForMaskedLM class for performing masked language modeling on Roberta models.
 * @extends RobertaPreTrainedModel
 */
class RobertaForMaskedLM extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<MaskedLMOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new MaskedLMOutput(logits)
    }
}

/**
 * RobertaForSequenceClassification class for performing sequence classification on Roberta models.
 * @extends RobertaPreTrainedModel
 */
class RobertaForSequenceClassification extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} - returned object
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}

/**
 * RobertaForQuestionAnswering class for performing question answering on Roberta models.
 * @extends RobertaPreTrainedModel
 */
class RobertaForQuestionAnswering extends RobertaPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs - The inputs to the model.
     * @returns {Promise<QuestionAnsweringModelOutput>} - returned object
     */
    async _call(model_inputs) {
        let outputs = await super._call(model_inputs);
        return new QuestionAnsweringModelOutput(outputs.start_logits, outputs.end_logits);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// T5 models
class WhisperPreTrainedModel extends PreTrainedModel { };

/**
 * WhisperModel class for training Whisper models without a language model head.
 * @extends WhisperPreTrainedModel
 */
class WhisperModel extends WhisperPreTrainedModel {
    /**
     * Throws an error when attempting to generate output since this model doesn't have a language model head.
     * @throws Error
     * @returns {Promise<any>}
     * @param {any[]} args
     */
    async generate(...args) {
        throw Error(
            "The current model class (WhisperModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'WhisperForConditionalGeneration'}"
        )
    }
}

/**
 * WhisperForConditionalGeneration class for generating conditional outputs from Whisper models.
 * @extends WhisperPreTrainedModel
 */
class WhisperForConditionalGeneration extends WhisperPreTrainedModel {
    /**
     * Creates a new instance of the `WhisperForConditionalGeneration` class.
     * @param {Object} config - Configuration object for the model.
     * @param {Object} session - ONNX Session object for the model.
     * @param {Object} decoder_merged_session - ONNX Session object for the decoder.
     * @param {Object} generation_config - Configuration object for the generation process.
     */
    constructor(config, session, decoder_merged_session, generation_config) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;
        this.generation_config = generation_config;

        this.num_decoder_layers = this.config.decoder_layers;
        this.num_decoder_heads = this.config.decoder_attention_heads;
        this.decoder_dim_kv = this.config.d_model / this.num_decoder_heads;

        this.num_encoder_layers = this.config.encoder_layers;
        this.num_encoder_heads = this.config.encoder_attention_heads;
        this.encoder_dim_kv = this.config.d_model / this.num_encoder_heads;


    }

    /**
     * Generates outputs based on input and generation configuration.
     * @param {Object} inputs - Input data for the model.
     * @param {Object} generation_config - Configuration object for the generation process.
     * @param {Object} logits_processor - Optional logits processor object.
     * @returns {Promise<Object>} Promise object represents the generated outputs.
     */
    async generate(
        inputs,
        generation_config = null,
        logits_processor = null,
    ) {
        // Create generation config object
        generation_config = this._get_generation_config(generation_config);


        // Whisper has additional options for returning timestamps
        generation_config.return_timestamps ??= false;

        // TODO add language and task

        if (generation_config.return_timestamps) {
            logits_processor = [new WhisperTimeStampLogitsProcessor(generation_config)]
        }

        return super.generate(inputs, generation_config, logits_processor)
    }

    /**
     * Loads a pre-trained model from a saved model directory.
     * @param {string} modelPath - Path to the saved model directory.
     * @param {function} progressCallback - Optional function for tracking loading progress.
     * @returns {Promise<WhisperForConditionalGeneration>} Promise object represents the loaded model.
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    /**
     * Gets the start beams for generating outputs.
     * @param {Array} inputTokenIds - Array of input token IDs.
     * @param {number} numOutputTokens - Number of output tokens to generate.
     * @returns {Array} Array of start beams.
     */
    getStartBeams(inputTokenIds, numOutputTokens, ...args) {
        // arguments ignored in this case
        return seq2seqStartBeams(this, inputTokenIds, numOutputTokens, false);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam, {
            input_name: 'input_features',
        });
    }

    /**
     * Updates the beam by appending the newly generated token ID to the list of output token IDs.
     * @param {any} beam - The current beam being generated.
     * @param {number} newTokenId - The ID of the newly generated token to append to the list of output token IDs.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Runs the forward pass of the model for a given set of inputs.
     * @async
     * @param {Object} model_inputs - The model inputs.
     * @returns {Promise<Object>} The model output.
     */
    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs, {
            encoder_input_name: 'input_features',
        });
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
/**
 * Vision Encoder-Decoder model based on OpenAI's GPT architecture for image captioning and other vision tasks
 * @extends PreTrainedModel
 */
class VisionEncoderDecoderModel extends PreTrainedModel {
    /**
     * Creates a new instance of the `VisionEncoderDecoderModel` class.
     * @param {object} config - The configuration object specifying the hyperparameters and other model settings.
     * @param {object} session - The ONNX session containing the encoder model.
     * @param {any} decoder_merged_session - The ONNX session containing the merged decoder model.
     */
    constructor(config, session, decoder_merged_session) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;

        this.num_layers = this.config.decoder.n_layer;
        this.num_heads = this.config.decoder.n_head;
        this.dim_kv = this.config.decoder.n_embd / this.num_heads;
    }

    /**
     * Loads a VisionEncoderDecoderModel from the given path.
     *
     * @param {string} modelPath - The path to the folder containing the saved model files.
     * @param {function} [progressCallback=null] - Optional callback function to track the progress of model loading.
     * @returns {Promise<VisionEncoderDecoderModel>} A Promise that resolves with the loaded VisionEncoderDecoderModel instance.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session, decoder_merged_session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'encoder_model.onnx', progressCallback),
            constructSession(modelPath, 'decoder_merged_session.onnx', progressCallback),
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        return new this(config, session, decoder_merged_session);
    }

    /**
     * Generate beam search outputs for the given input pixels and number of output tokens.
     *
     * @param {array} inputs - The input pixels as a Tensor.
     * @param {number} numOutputTokens - The number of output tokens to generate.
     * @param {...*} args - Optional additional arguments to pass to seq2seqStartBeams.
     * @returns {any} An array of Beam objects representing the top-K output sequences.
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return seq2seqRunBeam(this, beam, {
            input_name: 'pixel_values',
        });
    }

    /**
     * Update the given beam with the additional predicted token ID.
     *
     * @param {any} beam - The current beam.
     * @param {number} newTokenId - The new predicted token ID to add to the beam's output sequence.
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * Compute the forward pass of the model on the given input tensors.
     *
     * @param {object} model_inputs - The input tensors as an object with keys 'pixel_values' and 'decoder_input_ids'.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs, {
            encoder_input_name: 'pixel_values',
            add_decoder_pkv: false
        })
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// CLIP models
class CLIPPreTrainedModel extends PreTrainedModel { }
class CLIPModel extends CLIPPreTrainedModel {

}

//////////////////////////////////////////////////

//////////////////////////////////////////////////
// GPT2 models
class GPT2PreTrainedModel extends PreTrainedModel { }
/**
 * GPT2Model is not compatible with `.generate()`, as it doesn't have a language model head.
 * @extends GPT2PreTrainedModel
 */
class GPT2Model extends GPT2PreTrainedModel {
    /**
     * 
     * @param  {...any} args 
     * @throws {Error}
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (GPT2Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'GPT2LMHeadModel'}"
        )
    }
}

/**
 * GPT-2 language model head on top of the GPT-2 base model. This model is suitable for text generation tasks.
 * @extends GPT2PreTrainedModel
 */
class GPT2LMHeadModel extends GPT2PreTrainedModel {
    /**
     * Creates a new instance of the `GPT2LMHeadModel` class.
     * @param {object} config - The configuration of the model.
     * @param {any} session - The ONNX session containing the model weights.
     */
    constructor(config, session) {
        super(config, session);

        // config doesn't contain pad_token_id, so we assume it is the eos_token_id
        this.config.pad_token_id = this.config.eos_token_id

        this.num_heads = this.config.n_head
        this.num_layers = this.config.n_layer
        this.dim_kv = this.config.n_embd / this.num_heads;
    }

    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask - Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam - The Beam object representing the beam.
     * @param {number} newTokenId - The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {object} model_inputs - The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await textgen_forward(this, model_inputs)
    }

}
// class GPT2ForSequenceClassification extends GPT2PreTrainedModel {
// TODO
// }
//////////////////////////////////////////////////
class GPTNeoPreTrainedModel extends PreTrainedModel { }
class GPTNeoModel extends GPTNeoPreTrainedModel {
    /**
     * 
     * @param  {...any} args 
     * @throws {Error}
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (GPTNeoModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'GPTNeoForCausalLM'}"
        )
    }
}

class GPTNeoForCausalLM extends GPTNeoPreTrainedModel {
    /**
     * Creates a new instance of the `GPTNeoForCausalLM` class.
     * @param {object} config - The configuration of the model.
     * @param {any} session - The ONNX session containing the model weights.
     */
    constructor(config, session) {
        super(config, session);

        // config doesn't contain pad_token_id, so we assume it is the eos_token_id
        this.config.pad_token_id = this.config.eos_token_id

        this.num_heads = this.config.num_heads;
        this.num_layers = this.config.num_layers;
        this.dim_kv = this.config.hidden_size / this.num_heads;
    }

    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask - Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam - The Beam object representing the beam.
     * @param {number} newTokenId - The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {object} model_inputs - The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await textgen_forward(this, model_inputs)
    }
}

//////////////////////////////////////////////////
// CodeGen models
class CodeGenPreTrainedModel extends PreTrainedModel { }
/**
 * CodeGenModel is a class representing a code generation model without a language model head.
 * 
 * @extends CodeGenPreTrainedModel
 */
class CodeGenModel extends CodeGenPreTrainedModel {
    /**
     * Throws an error indicating that the current model class is not compatible with `.generate()`,
     * as it doesn't have a language model head.
     * 
     * @throws {Error} The current model class is not compatible with `.generate()`
     * 
     * @param  {...any} args - Arguments passed to the generate function
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (CodeGenModel) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'CodeGenForCausalLM'}"
        )
    }
}

/**
 * CodeGenForCausalLM is a class that represents a code generation model based on the GPT-2 architecture. It extends the `CodeGenPreTrainedModel` class.
 * @extends CodeGenPreTrainedModel
 */
class CodeGenForCausalLM extends CodeGenPreTrainedModel {
    /**
     * Creates a new instance of the `CodeGenForCausalLM` class.
    * @param {object} config The model configuration object.
    * @param {object} session The ONNX session object.
    */
    constructor(config, session) {
        super(config, session);

        // config doesn't contain pad_token_id, so we assume it is the eos_token_id
        this.config.pad_token_id = this.config.eos_token_id

        this.num_heads = this.config.n_head
        this.num_layers = this.config.n_layer
        this.dim_kv = this.config.n_embd / this.num_heads;
    }

    /**
     * Initializes and returns the beam for text generation task
     * @param {Tensor} inputTokenIds - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @param {Tensor} inputs_attention_mask - Optional input attention mask.
     * @returns {any} A Beam object representing the initialized beam.
     */
    getStartBeams(inputTokenIds, numOutputTokens, inputs_attention_mask) {
        return textgenStartBeams(this, inputTokenIds, numOutputTokens, inputs_attention_mask)
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await textgenRunBeam(this, beam);
    }

    /**
     * Updates the given beam with the new generated token id.
     * @param {any} beam - The Beam object representing the beam.
     * @param {number} newTokenId - The new generated token id to be added to the beam.
     */
    updateBeam(beam, newTokenId) {
        return textgenUpdatebeam(beam, newTokenId);
    }

    /**
     * Forward pass for the model.
     * @param {object} model_inputs - The inputs for the model.
     * @returns {Promise<any>} The output tensor of the model.
     */
    async forward(model_inputs) {
        return await textgen_forward(this, model_inputs)
    }

}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
class ViTPreTrainedModel extends PreTrainedModel { }
class ViTForImageClassification extends ViTPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    async _call(model_inputs) {
        let logits = (await super._call(model_inputs)).logits;
        return new SequenceClassifierOutput(logits)
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
class DetrPreTrainedModel extends PreTrainedModel { }
class DetrForObjectDetection extends DetrPreTrainedModel {
    /**
     * @param {any} model_inputs
     */
    async _call(model_inputs) {
        let output = (await super._call(model_inputs));
        return new DetrObjectDetectionOutput(output.logits, output.pred_boxes)
    }
}

class DetrForSegmentation extends DetrPreTrainedModel {
    /**
     * Runs the model with the provided inputs
     * @param {Object} model_inputs - Model inputs
     * @returns {Promise<DetrSegmentationOutput>} - Object containing segmentation outputs
     */
    async _call(model_inputs) {
        let output = (await super._call(model_inputs));
        return new DetrSegmentationOutput(output.logits, output.pred_boxes, output.pred_masks);
    }
}

class DetrObjectDetectionOutput extends ModelOutput {
    /**
     * @param {any} logits
     * @param {any} pred_boxes
     */
    constructor(logits, pred_boxes) {
        super();
        this.logits = logits;
        this.pred_boxes = pred_boxes;
    }
}

class DetrSegmentationOutput extends ModelOutput {

    /**
     * @param {Tensor} logits - The output logits of the model.
     * @param {Tensor} pred_boxes - Predicted boxes.
     * @param {Tensor} pred_masks - Predicted masks.
     */
    constructor(logits, pred_boxes, pred_masks) {
        super();
        this.logits = logits;
        this.pred_boxes = pred_boxes;
        this.pred_masks = pred_masks;
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// MarianMT models
class MarianPreTrainedModel extends PreTrainedModel { };

class MarianModel extends MarianPreTrainedModel {
    /**
     * 
     * @param  {...any} args 
     * @throws {Error}
     * @returns {Promise<any>}
     */
    async generate(...args) {
        throw Error(
            "The current model class (T5Model) is not compatible with `.generate()`, as it doesn't have a language model head. Please use one of the following classes instead: {'T5ForConditionalGeneration'}"
        )
    }
}

class MarianMTModel extends MarianPreTrainedModel {
    /**
     * Creates a new instance of the `MarianMTModel` class.
    * @param {object} config The model configuration object.
    * @param {object} session The ONNX session object.
    * @param {any} decoder_merged_session 
    * @param {any} generation_config 
    */
    constructor(config, session, decoder_merged_session, generation_config) {
        super(config, session);
        this.decoder_merged_session = decoder_merged_session;
        this.generation_config = generation_config;

        this.num_decoder_layers = this.config.decoder_layers;
        this.num_decoder_heads = this.config.decoder_attention_heads;
        this.decoder_dim_kv = this.config.d_model / this.num_decoder_heads;

        this.num_encoder_layers = this.config.encoder_layers;
        this.num_encoder_heads = this.config.encoder_attention_heads;
        this.encoder_dim_kv = this.config.d_model / this.num_encoder_heads;
    }

    /**
     * @param {string} modelPath
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        return new this(...info);
    }

    /**
     * Initializes and returns the beam for text generation task
     * @param {any[]} inputs - The input token ids.
     * @param {number} numOutputTokens - The number of tokens to be generated.
     * @returns {any} A Beam object representing the initialized beam.
     * @param {any[]} args
     */
    getStartBeams(inputs, numOutputTokens, ...args) {
        return seq2seqStartBeams(this, inputs, numOutputTokens);
    }

    /**
     * Runs a single step of the beam search generation algorithm.
     * @param {any} beam - The current beam being generated.
     * @returns {Promise<any>} - The updated beam after a single generation step.
     */
    async runBeam(beam) {
        return await seq2seqRunBeam(this, beam);
    }

    /**
     * @param {any} beam
     * @param {any} newTokenId
     */
    updateBeam(beam, newTokenId) {
        beam.output_token_ids = [...beam.output_token_ids, newTokenId];
    }

    /**
     * @param {any} model_inputs
     * @returns {Promise<Seq2SeqLMOutput>}
     */
    async forward(model_inputs) {
        return await seq2seq_forward(this, model_inputs);
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
// AutoModels, used to simplify construction of PreTrainedModels
// (uses config to instantiate correct class)
/**
 * Helper class to determine model type from config
 */
class AutoModel {
    // Helper class to determine model type from config
    static MODEL_CLASS_MAPPING = {
        'bert': BertModel,
        'albert': AlbertModel,
        'distilbert': DistilBertModel,
        't5': T5Model,
        'mt5': MT5Model,
        'gpt2': GPT2Model,
        'gpt_neo': GPTNeoModel,
        'codegen': CodeGenModel,
        'bart': BartModel,
        'roberta': RobertaModel,
        'whisper': WhisperModel,
        'clip': CLIPModel,
        'mobilebert': MobileBertModel,
        'squeezebert': SqueezeBertModel,
        'marian': MarianModel,
    }

    /**
     * Instantiates a pre-trained model based on the given model path and config.
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} progressCallback - Optional. A callback function that can be used to track loading progress.
     * @returns {Promise<PreTrainedModel>} - A promise that resolves to an instance of a pre-trained model.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let config = await fetchJSON(modelPath, 'config.json', progressCallback);
        let modelName = config.is_encoder_decoder ? 'encoder_model.onnx' : 'model.onnx';

        let session = await constructSession(modelPath, modelName, progressCallback);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            console.warn(`Unknown model class "${config.model_type}", attempting to construct from base class.`);
            cls = PreTrainedModel;
        }
        return new cls(config, session)
    }
}

/**
 * Helper class for loading sequence classification models from pretrained checkpoints
 */
class AutoModelForSequenceClassification {

    static MODEL_CLASS_MAPPING = {
        'bert': BertForSequenceClassification,
        'albert': AlbertForSequenceClassification,
        'distilbert': DistilBertForSequenceClassification,
        'roberta': RobertaForSequenceClassification,
        'bart': BartForSequenceClassification,
        'mobilebert': MobileBertForSequenceClassification,
        'squeezebert': SqueezeBertForSequenceClassification,
    }

    /**
     * Load a sequence classification model from a pretrained checkpoint
     * @param {string} modelPath - The path to the model checkpoint directory
     * @param {function} [progressCallback=null] - An optional callback function to receive progress updates
     * @returns {Promise<PreTrainedModel>} A promise that resolves to a pre-trained sequence classification model
     * @throws {Error} if an unsupported model type is encountered
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback)
        ]);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}


/**
 * Helper class for loading token classification models from pretrained checkpoints
 */
class AutoModelForTokenClassification {

    static MODEL_CLASS_MAPPING = {
        'bert': BertForTokenClassification,
        'distilbert': DistilBertForTokenClassification,
    }

    /**
     * Load a token classification model from a pretrained checkpoint
     * @param {string} modelPath - The path to the model checkpoint directory
     * @param {function} [progressCallback=null] - An optional callback function to receive progress updates
     * @returns {Promise<PreTrainedModel>} A promise that resolves to a pre-trained token classification model
     * @throws {Error} if an unsupported model type is encountered
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback)
        ]);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}


/**
 * Class representing an automatic sequence-to-sequence language model.
 */
class AutoModelForSeq2SeqLM {
    static MODEL_CLASS_MAPPING = {
        't5': T5ForConditionalGeneration,
        'mt5': MT5ForConditionalGeneration,
        'bart': BartForConditionalGeneration,
        'whisper': WhisperForConditionalGeneration,
        'marian': MarianMTModel,
    }

    /**
     * Loads a pretrained sequence-to-sequence language model from a file path.
     * @param {string} modelPath - The path to the model files.
     * @param {function} [progressCallback=null] - A callback function to track loading progress.
     * @returns {Promise<Object>} A Promise that resolves to an instance of the appropriate model class.
     * @throws {Error} If the model type is unsupported.
     * @static
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        let info = await seq2seqLoadModel(modelPath, progressCallback);
        let config = info[0];
        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(...info)
    }
}

/**
 * A class for loading pre-trained models for causal language modeling tasks.
 */
class AutoModelForCausalLM {
    static MODEL_CLASS_MAPPING = {
        'gpt2': GPT2LMHeadModel,
        'gpt_neo': GPTNeoForCausalLM,
        'codegen': CodeGenForCausalLM,
    }

    /**
     * Loads a pre-trained model from the given path and returns an instance of the appropriate class.
     * @param {string} modelPath - The path to the pre-trained model.
     * @param {function} [progressCallback=null] - An optional callback function to track the progress of the loading process.
     * @returns {Promise<GPT2LMHeadModel|CodeGenForCausalLM|CodeGenForCausalLM>} An instance of the appropriate class for the loaded model.
     * @throws {Error} If the loaded model type is not supported.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'decoder_model_merged.onnx', progressCallback)
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);

    }
}

/**
 * A class to automatically select the appropriate model for Masked Language Modeling (MLM) tasks.
 */
class AutoModelForMaskedLM {
    static MODEL_CLASS_MAPPING = {
        'bert': BertForMaskedLM,
        'albert': AlbertForMaskedLM,
        'distilbert': DistilBertForMaskedLM,
        'roberta': RobertaForMaskedLM,
        'mobilebert': MobileBertForMaskedLM,
        'squeezebert': SqueezeBertForMaskedLM,
    }

    /**
     * Loads a pre-trained model from a given directory and returns an instance of the appropriate model class.
     *
     * @async
     * @param {string} modelPath - The path to the pre-trained model directory.
     * @param {function} [progressCallback=null] - An optional callback function to track the loading progress.
     * @returns {Promise<PreTrainedModel>} An instance of the appropriate model class for MLM tasks.
     * @throws {Error} If an unsupported model type is encountered.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let config = await fetchJSON(modelPath, 'config.json', progressCallback);
        let modelName = config.is_encoder_decoder ? 'encoder_model.onnx' : 'model.onnx';

        let session = await constructSession(modelPath, modelName, progressCallback);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}

/**
 * Automatic model class for question answering tasks.
 */
class AutoModelForQuestionAnswering {
    static MODEL_CLASS_MAPPING = {
        'bert': BertForQuestionAnswering,
        'albert': AlbertForQuestionAnswering,
        'distilbert': DistilBertForQuestionAnswering,
        'roberta': RobertaForQuestionAnswering,
        'mobilebert': MobileBertForQuestionAnswering,
        'squeezebert': SqueezeBertForQuestionAnswering,
    }

    /**
     * Loads and returns a question answering model from a pretrained model path.
     * @param {string} modelPath - The path to the pretrained model.
     * @param {function} [progressCallback=null] - Optional callback function to track loading progress.
     * @returns {Promise<PreTrainedModel>} - The loaded question answering model.
     * @throws Will throw an error if an unsupported model type is encountered.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback)
        ]);

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}

/**
 * Class representing an autoencoder-decoder model for vision-to-sequence tasks.
 */
class AutoModelForVision2Seq {
    static MODEL_CLASS_MAPPING = {
        'vision-encoder-decoder': VisionEncoderDecoderModel
    }

    /**
     * Loads a pretrained model from a given path.
     * @param {string} modelPath - The path to the pretrained model.
     * @param {function} progressCallback - Optional callback function to track progress of the model loading.
     * @returns {Promise<PreTrainedModel>} - A Promise that resolves to a new instance of VisionEncoderDecoderModel.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session, decoder_merged_session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'encoder_model.onnx', progressCallback),
            constructSession(modelPath, 'decoder_model_merged.onnx', progressCallback)
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session, decoder_merged_session);

    }
}

//////////////////////////////////////////////////
/**
 * AutoModelForImageClassification is a class for loading pre-trained image classification models from ONNX format.
 */
class AutoModelForImageClassification {
    static MODEL_CLASS_MAPPING = {
        'vit': ViTForImageClassification,
    }

    /**
     * Loads a pre-trained image classification model from a given directory path.
     * @param {string} modelPath - The path to the directory containing the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function to monitor the loading progress.
     * @returns {Promise<PreTrainedModel>} A Promise that resolves with the model.
     * @throws {Error} If the specified model type is not supported.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback),
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
/**
 * AutoModelForImageSegmentation is a class for loading pre-trained image classification models from ONNX format.
 */
class AutoModelForImageSegmentation {
    static MODEL_CLASS_MAPPING = {
        'detr': DetrForSegmentation,
    }

    /**
     * Loads a pre-trained image classification model from a given directory path.
     * @param {string} modelPath - The path to the directory containing the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function to monitor the loading progress.
     * @returns {Promise<PreTrainedModel>} A Promise that resolves with the model.
     * @throws {Error} If the specified model type is not supported.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback),
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}
//////////////////////////////////////////////////


//////////////////////////////////////////////////
class AutoModelForObjectDetection {
    static MODEL_CLASS_MAPPING = {
        'detr': DetrForObjectDetection,
    }

    /**
     * Loads a pre-trained image classification model from a given directory path.
     * @param {string} modelPath - The path to the directory containing the pre-trained model.
     * @param {function} [progressCallback=null] - A callback function to monitor the loading progress.
     * @returns {Promise<PreTrainedModel>} A Promise that resolves with the model.
     * @throws {Error} If the specified model type is not supported.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let [config, session] = await Promise.all([
            fetchJSON(modelPath, 'config.json', progressCallback),
            constructSession(modelPath, 'model.onnx', progressCallback),
        ])

        // Called when all parts are loaded
        dispatchCallback(progressCallback, {
            status: 'loaded',
            name: modelPath
        });

        let cls = this.MODEL_CLASS_MAPPING[config.model_type];
        if (!cls) {
            throw Error(`Unsupported model type: ${config.model_type}`)
        }
        return new cls(config, session);
    }
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
class Seq2SeqLMOutput extends ModelOutput {
    /**
     * @param {Tensor} logits - The output logits of the model.
     * @param {Array} past_key_values - An array of key/value pairs that represent the previous state of the model.
     * @param {Tensor} encoder_outputs - The output of the encoder in a sequence-to-sequence model.
     */
    constructor(logits, past_key_values, encoder_outputs) {
        super();
        this.logits = logits;
        this.past_key_values = past_key_values;
        this.encoder_outputs = encoder_outputs;
    }
}

class SequenceClassifierOutput extends ModelOutput {
    /**
     * @param {Tensor} logits 
     */
    constructor(logits) {
        super();
        this.logits = logits;
    }
}

class TokenClassifierOutput extends ModelOutput {
    /**
     * @param {Tensor} logits 
     */
    constructor(logits) {
        super();
        this.logits = logits;
    }
}


class MaskedLMOutput extends ModelOutput {
    /**
     * @param {Tensor} logits 
     */
    constructor(logits) {
        super();
        this.logits = logits;
    }
}

class QuestionAnsweringModelOutput extends ModelOutput {
    /**
     * @param {Float32Array} start_logits - The logits for start positions of the answer.
     * @param {Float32Array} end_logits - The logits for end positions of the answer.
     */
    constructor(start_logits, end_logits) {
        super();
        this.start_logits = start_logits;
        this.end_logits = end_logits;
    }
}

module.exports = {
    AutoModel,
    AutoModelForSeq2SeqLM,
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    AutoModelForCausalLM,
    AutoModelForMaskedLM,
    AutoModelForQuestionAnswering,
    AutoModelForVision2Seq,
    AutoModelForImageClassification,
    AutoModelForObjectDetection,
    AutoModelForImageSegmentation,
};


/***/ }),

/***/ "./src/pipelines.js":
/*!**************************!*\
  !*** ./src/pipelines.js ***!
  \**************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const {
    Callable,
    softmax,
    indexOfMax,
    getTopItems,
    cos_sim,
    pathJoin,
    isString,
    getFile,
    dot
} = __webpack_require__(/*! ./utils.js */ "./src/utils.js");

const {
    AutoTokenizer
} = __webpack_require__(/*! ./tokenizers.js */ "./src/tokenizers.js");
const {
    AutoModel,
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    AutoModelForQuestionAnswering,
    AutoModelForMaskedLM,
    AutoModelForSeq2SeqLM,
    AutoModelForCausalLM,
    AutoModelForVision2Seq,
    AutoModelForImageClassification,
    AutoModelForImageSegmentation,
    AutoModelForObjectDetection
} = __webpack_require__(/*! ./models.js */ "./src/models.js");
const {
    AutoProcessor,
    Processor
} = __webpack_require__(/*! ./processors.js */ "./src/processors.js");


const {
    env
} = __webpack_require__(/*! ./env.js */ "./src/env.js");

const { Tensor, transpose_data } = __webpack_require__(/*! ./tensor_utils.js */ "./src/tensor_utils.js");
const { CustomImage } = __webpack_require__(/*! ./image_utils.js */ "./src/image_utils.js");

/**
 * Prepare images for further tasks.
 * @param {any[]} images - images to prepare.
 * @returns {Promise<any[]>} - returns processed images.
 * @async
 */
async function prepareImages(images) {
    if (!Array.isArray(images)) {
        images = [images];
    }

    // Possibly convert any non-images to images
    images = await Promise.all(images.map(x => CustomImage.read(x)));
    return images;
}

/**
 * Pipeline class for executing a natural language processing task.
 * @extends Callable
 */
class Pipeline extends Callable {
    /**
     * Creates a new instance of Pipeline.
     * @param {string} task - The natural language processing task to be performed.
     * @param {object} tokenizer - The tokenizer object to be used for tokenizing input texts.
     * @param {object} model - The model object to be used for processing input texts.
     */
    constructor(task, tokenizer, model) {
        super();
        this.task = task;
        this.tokenizer = tokenizer;
        this.model = model;
    }

    /**
     * Disposes the model.
     * @returns {Promise<void>} - A promise that resolves when the model has been disposed.
     */
    async dispose() {
        return await this.model.dispose();
    }

    /**
     * Executes the natural language processing task.
     * @param {any} texts - The input texts to be processed.
     * @returns {Promise<any>} - A promise that resolves to an array containing the inputs and outputs of the task.
     */
    async _call(texts) {
        // Run tokenization
        let inputs = this.tokenizer(texts, {
            padding: true,
            truncation: true
        });

        // Run model
        let outputs = await this.model(inputs)

        return [inputs, outputs];
    }
}

/**
 * TextClassificationPipeline class for executing a text classification task.
 * @extends Pipeline
 */
class TextClassificationPipeline extends Pipeline {
    /**
     * Executes the text classification task.
     * @param {any} texts - The input texts to be classified.
     * @param {object} options - An optional object containing the following properties:
     * @param {number} [options.topk=1] - The number of top predictions to be returned.
     * @returns {Promise<object[]|object>} - A promise that resolves to an array or object containing the predicted labels and scores.
     */
    async _call(texts, {
        topk = 1
    } = {}) {

        let [inputs, outputs] = await super._call(texts);

        let id2label = this.model.config.id2label;
        let toReturn = [];
        for (let batch of outputs.logits) {
            let scores = getTopItems(softmax(batch.data), topk);

            let vals = scores.map(function (x) {
                return {
                    label: id2label[x[0]],
                    score: x[1],
                }
            });
            if (topk === 1) {
                toReturn.push(...vals);
            } else {
                toReturn.push(vals);
            }
        }

        return Array.isArray(texts) || topk === 1 ? toReturn : toReturn[0];
    }
}


/**
 * TokenClassificationPipeline class for executing a token classification task.
 * @extends Pipeline
 */
class TokenClassificationPipeline extends Pipeline {
    /**
     * Executes the token classification task.
     * @param {any} texts - The input texts to be classified.
     * @param {object} options - An optional object containing the following properties:
     * @returns {Promise<object[]|object>} - A promise that resolves to an array or object containing the predicted labels and scores.
     */
    async _call(texts, {
        ignore_labels = ['O'], // TODO init param?
    } = {}) {

        let isBatched = Array.isArray(texts);

        if (!isBatched) {
            texts = [texts];
        }

        let tokenizer = this.tokenizer;
        let [inputs, outputs] = await super._call(texts);

        let logits = outputs.logits;
        let id2label = this.model.config.id2label;

        let toReturn = [];
        for (let i = 0; i < logits.dims[0]; ++i) {
            let ids = inputs.input_ids.get(i);
            let batch = logits.get(i);

            // List of tokens that aren't ignored
            let tokens = [];
            for (let j = 0; j < batch.dims[0]; ++j) {
                let tokenData = batch.get(j);
                let topScoreIndex = indexOfMax(tokenData.data);

                let entity = id2label[topScoreIndex];
                if (ignore_labels.includes(entity)) {
                    // We predicted a token that should be ignored. So, we skip it.
                    continue;
                }

                // TODO add option to keep special tokens?
                let word = tokenizer.decode([ids.get(j)], { skip_special_tokens: true });
                if (word === '') {
                    // Was a special token. So, we skip it.
                    continue;
                }

                let scores = softmax(tokenData.data);

                tokens.push({
                    entity: entity,
                    score: scores[topScoreIndex],
                    index: j,
                    word: word,

                    // TODO: null for now, but will add
                    start: null,
                    end: null,
                });
            }
            toReturn.push(tokens);
        }
        return isBatched ? toReturn : toReturn[0];
    }
}
/**
 * QuestionAnsweringPipeline class for executing a question answering task.
 * @extends Pipeline
 */
class QuestionAnsweringPipeline extends Pipeline {
    /**
     * Executes the question answering task.
     * @param {string|string[]} question - The question(s) to be answered.
     * @param {string|string[]} context - The context(s) where the answer(s) can be found.
     * @param {object} options - An optional object containing the following properties:
     * @param {number} [options.topk=1] - The number of top answer predictions to be returned.
     * @todo fix error below
     * @returns {Promise<any>} - A promise that resolves to an array or object containing the predicted answers and scores.
     */
    async _call(question, context, {
        topk = 1
    } = {}) {

        let inputs = this.tokenizer(question, {
            text_pair: context
        })

        let output = await this.model(inputs);

        let toReturn = [];
        for (let j = 0; j < output.start_logits.dims[0]; ++j) {
            let ids = inputs.input_ids.get(j);
            let sepIndex = ids.indexOf(this.tokenizer.sep_token_id);

            let s1 = Array.from(softmax(output.start_logits.get(j).data))
                .map((x, i) => [x, i])
                .filter(x => x[1] > sepIndex);
            let e1 = Array.from(softmax(output.end_logits.get(j).data))
                .map((x, i) => [x, i])
                .filter(x => x[1] > sepIndex);

            let options = product(s1, e1)
                .filter(x => x[0][1] <= x[1][1])
                .map(x => [x[0][1], x[1][1], x[0][0] * x[1][0]])
                .sort((a, b) => b[2] - a[2]);

            for (let k = 0; k < Math.min(options.length, topk); ++k) {
                let [start, end, score] = options[k];

                let answer_tokens = [...ids].slice(start, end + 1)

                let answer = this.tokenizer.decode(answer_tokens, {
                    skip_special_tokens: true,
                });

                // TODO add start and end?
                // NOTE: HF returns character index
                toReturn.push({
                    answer, score
                });
            }
        }

        // Mimic HF's return type based on topk
        return (topk === 1) ? toReturn[0] : toReturn;

    }
}

/**
 * Class representing a fill-mask pipeline for natural language processing.
 * @extends Pipeline
 */
class FillMaskPipeline extends Pipeline {
    /**
     * @param {any} texts
     */
    async _call(texts, {
        topk = 5
    } = {}) {
        // Fill the masked token in the text(s) given as inputs.

        // Run tokenization
        let [inputs, outputs] = await super._call(texts);

        // Determine indices of mask tokens
        // let mask_token_indices = inputs.input_ids.data.map(x => )

        // let logits = reshape(outputs.logits.data, outputs.logits.dims);

        let tokenizer = this.tokenizer;

        let toReturn = [];

        for (let i = 0; i < inputs.input_ids.dims[0]; ++i) {
            let ids = inputs.input_ids.get(i);
            let mask_token_index = ids.indexOf(this.tokenizer.mask_token_id)

            if (mask_token_index === -1) {
                throw Error(`Mask token (${tokenizer.mask_token}) not found in text.`)
            }
            let logits = outputs.logits.get(i);
            let itemLogits = logits.get(mask_token_index);

            let scores = getTopItems(softmax(itemLogits.data), topk);

            toReturn.push(scores.map(x => {
                let sequence = [...ids];
                sequence[mask_token_index] = x[0];

                return {
                    score: x[1],
                    token: x[0],
                    token_str: tokenizer.model.vocab[x[0]],
                    sequence: tokenizer.decode(sequence, { skip_special_tokens: true }),
                }
            }));
        }
        return Array.isArray(texts) ? toReturn : toReturn[0];
    }
}

/**
 * Text2TextGenerationPipeline class for generating text using a model that performs text-to-text generation tasks.
 * @extends Pipeline
 */
class Text2TextGenerationPipeline extends Pipeline {
    _key = null;

    /**
     * Fill the masked token in the text(s) given as inputs.
     * @async
     * @param {string|string[]} texts - The text or array of texts to be processed.
     * @param {Object} [options={}] - Options for the fill-mask pipeline.
     * @param {number} [options.topk=5] - The number of top-k predictions to return.
     * @returns {Promise<any>} An array of objects containing the score, predicted token, predicted token string,
     * and the sequence with the predicted token filled in, or an array of such arrays (one for each input text).
     * If only one input text is given, the output will be an array of objects.
     * @throws {Error} When the mask token is not found in the input text.
     */
    async _call(texts, generate_kwargs = {}) {
        if (!Array.isArray(texts)) {
            texts = [texts];
        }

        // Add global prefix, if present
        if (this.model.config.prefix) {
            texts = texts.map(x => this.model.config.prefix + x)
        }

        // Handle task specific params:
        let task_specific_params = this.model.config.task_specific_params
        if (task_specific_params && task_specific_params[this.task]) {
            // Add prefixes, if present
            if (task_specific_params[this.task].prefix) {
                texts = texts.map(x => task_specific_params[this.task].prefix + x)
            }

            // TODO update generation config
        }

        let input_ids = this.tokenizer(texts, {
            padding: true,
            truncation: true
        }).input_ids

        let outputTokenIds = (await this.model.generate(input_ids, generate_kwargs)).flat();

        /**
         * @type {any[]}
         */
        let toReturn = this.tokenizer.batch_decode(outputTokenIds, {
            skip_special_tokens: true,
        });
        if (this._key !== null) {
            toReturn = toReturn.map(text => {
                return (this._key === null) ? text : { [this._key]: text }
            })
        }
        return toReturn
    }
}


/**
 * A pipeline for summarization tasks, inheriting from Text2TextGenerationPipeline.
 * @extends Text2TextGenerationPipeline
 */
class SummarizationPipeline extends Text2TextGenerationPipeline {
    _key = 'summary_text';
}

/**
 * TranslationPipeline class to translate text from one language to another using the provided model and tokenizer.
 * @extends Text2TextGenerationPipeline
 */
class TranslationPipeline extends Text2TextGenerationPipeline {
    _key = 'translation_text';
}

/**
 * A pipeline for generating text based on an input prompt.
 * @extends Pipeline
 */
class TextGenerationPipeline extends Pipeline {
    /**
     * Generates text based on an input prompt.
     * @async
     * @param {any} texts - The input prompt or prompts to generate text from.
     * @param {object} [generate_kwargs={}] - Additional arguments for text generation.
     * @returns {Promise<any>} - The generated text or texts.
     */
    async _call(texts, generate_kwargs = {}) {
        let stringInput = typeof texts === 'string' || texts instanceof String;
        if (stringInput) {
            texts = [texts];
        }

        this.tokenizer.padding_side = 'left';
        let inputs = this.tokenizer(texts, {
            padding: true,
            truncation: true,
        });

        let input_ids = inputs.input_ids;
        let attention_mask = inputs.attention_mask;

        /**
         * @type {any[]}
         */
        let outputTokenIds = await this.model.generate(input_ids, generate_kwargs, null, {
            inputs_attention_mask: attention_mask
        });

        let toReturn = outputTokenIds.map((outTokens, i) => {
            let startText = texts[i].trim();
            let decoded = this.tokenizer.batch_decode(outTokens, {
                skip_special_tokens: true,
            }).map(x => {
                return {
                    generated_text: startText + x
                }
            });

            return decoded
        });

        return (stringInput && toReturn.length === 1) ? toReturn[0] : toReturn;
    }
}

/**
 * Class representing an Zero Shot Classification Pipeline that should only be used with zero shot classification tasks.
 * @extends Pipeline
 */
class ZeroShotClassificationPipeline extends Pipeline {

    /**
     * @param {string} task
     * @param {any} tokenizer
     * @param {any} model
     */
    constructor(task, tokenizer, model) {
        super(task, tokenizer, model);

        // Use model config to get label2id mapping
        this.label2id = Object.fromEntries(
            Object.entries(this.model.config.label2id).map(
                ([k, v]) => [k.toLowerCase(), v]
            )
        );

        this.entailment_id = this.label2id['entailment'];
        if (this.entailment_id === undefined) {
            console.warn("Could not find 'entailment' in label2id mapping. Using 2 as entailment_id.");
            this.entailment_id = 2;
        }

        this.contradiction_id = this.label2id['contradiction'];
        if (this.contradiction_id === undefined) {
            console.warn("Could not find 'contradiction' in label2id mapping. Using 0 as contradiction_id.");
            this.contradiction_id = 0;
        }
    }
    /**
     * @param {any[]} texts
     * @param {string[]} candidate_labels
     * @todo fix error below
     * @return {Promise<*>}
     */
    async _call(texts, candidate_labels, {
        hypothesis_template = "This example is {}.",
        multi_label = false,
    } = {}) {

        let isBatched = Array.isArray(texts);

        if (!isBatched) {
            texts = [texts];
        }
        if (!Array.isArray(candidate_labels)) {
            candidate_labels = [candidate_labels];
        }

        // Insert labels into hypothesis template
        let hypotheses = candidate_labels.map(
            x => hypothesis_template.replace('{}', x)
        );

        // How to perform the softmax over the logits:
        //  - true:  softmax over the entailment vs. contradiction dim for each label independently
        //  - false: softmax the "entailment" logits over all candidate labels
        let softmaxEach = multi_label || candidate_labels.length === 1;

        let toReturn = [];
        for (let premise of texts) {
            let entails_logits = [];

            for (let hypothesis of hypotheses) {
                let inputs = this.tokenizer(premise, {
                    text_pair: hypothesis,
                })
                let outputs = await this.model(inputs)

                if (softmaxEach) {
                    entails_logits.push([
                        outputs.logits.data[this.contradiction_id],
                        outputs.logits.data[this.entailment_id]
                    ])
                } else {
                    entails_logits.push(outputs.logits.data[this.entailment_id])
                }
            }

            let scores;
            if (softmaxEach) {
                scores = entails_logits.map(x => softmax(x)[1]);
            } else {
                scores = softmax(entails_logits);
            }

            // Sort by scores (desc) and return scores with indices
            let scores_sorted = scores
                .map((x, i) => [x, i])
                .sort((a, b) => {
                    return b[0] - a[0];
                });

            toReturn.push({
                sequence: premise,
                labels: scores_sorted.map(x => candidate_labels[x[1]]),
                scores: scores_sorted.map(x => x[0]),
            });
        }
        return isBatched ? toReturn : toReturn[0];
    }
}


/**
 * Class representing an Embeddings Pipeline that should only be used with sentence-transformers.
 * If you want to get the raw outputs from the model, use `AutoModel.from_pretrained(...)`.
 * @extends Pipeline
 */
class EmbeddingsPipeline extends Pipeline {
    // Should only be used with sentence-transformers
    // If you want to get the raw outputs from the model,
    // use `AutoModel.from_pretrained(...)`
    /**
     * Private method to perform mean pooling of the last hidden state followed by a normalization step.
     * @param {Tensor} last_hidden_state - Tensor of shape [batchSize, seqLength, embedDim]
     * @param {Tensor} attention_mask - Tensor of shape [batchSize, seqLength]
     * @returns {Tensor} Returns a new Tensor of shape [batchSize, embedDim].
     * @private
     */
    _mean_pooling(last_hidden_state, attention_mask) {
        // last_hidden_state: [batchSize, seqLength, embedDim]
        // attention_mask:    [batchSize, seqLength]

        let shape = [last_hidden_state.dims[0], last_hidden_state.dims[2]];
        let returnedData = new last_hidden_state.data.constructor(shape[0] * shape[1])
        let [batchSize, seqLength, embedDim] = last_hidden_state.dims;

        let outIndex = 0;
        for (let i = 0; i < batchSize; ++i) {
            let offset = i * embedDim * seqLength;

            for (let k = 0; k < embedDim; ++k) {
                let sum = 0;
                let count = 0;

                let attnMaskOffset = i * seqLength;
                let offset2 = offset + k;
                // Pool over all words in sequence
                for (let j = 0; j < seqLength; ++j) {
                    // index into attention mask
                    let attn = Number(attention_mask.data[attnMaskOffset + j]);

                    count += attn;
                    sum += last_hidden_state.data[offset2 + j * embedDim] * attn;
                }

                let avg = sum / count;
                returnedData[outIndex++] = avg;
            }
        }

        return new Tensor(
            last_hidden_state.type,
            returnedData,
            shape
        )
    }

    /**
     * Private method to normalize the input tensor along dim=1. 
     * NOTE: only works for tensors of shape [batchSize, embedDim]. Operates in-place.
     * @param {any} tensor - Tensor of shape [batchSize, embedDim]
     * @returns {any} Returns the same Tensor object after performing normalization.
     * @private
     */
    _normalize(tensor) {
        for (let batch of tensor) {
            let norm = Math.sqrt(batch.data.reduce((a, b) => a + b * b))

            for (let i = 0; i < batch.data.length; ++i) {
                batch.data[i] /= norm;
            }
        }
        return tensor;
    }

    /**
     * Method to perform mean pooling and normalization of the input texts.
     * @param {string[]} texts - An array of texts to embed.
     * @returns {Promise<Tensor>} Returns a new Tensor of shape [batchSize, embedDim].
     */
    async _call(texts) {
        let [inputs, outputs] = await super._call(texts);

        // Perform mean pooling, followed by a normalization step
        return this._normalize(this._mean_pooling(outputs.last_hidden_state, inputs.attention_mask));
    }

    /**
     * @param {number[]} arr1
     * @param {number[]} arr2
     */
    cos_sim(arr1, arr2, is_normalised = false) {
        // Compute cosine similarity. If `is_normalised`, then
        // use the dot product instead of the cosine similarity
        return is_normalised ? dot(arr1, arr2) : cos_sim(arr1, arr2);
    }
}

/**
 * A class representing an automatic speech recognition pipeline.
 * @extends Pipeline
 */
class AutomaticSpeechRecognitionPipeline extends Pipeline {

    /**
     * Creates an instance of AutomaticSpeechRecognitionPipeline.
     * @param {string} task - The type of the task for this pipeline. Currently only "asr" is supported.
     * @param {object} tokenizer - The tokenizer to be used for pre-processing inputs.
     * @param {object} model - The model to be used for the task.
     * @param {object} processor - The processor to be used for pre-processing audio inputs.
     */
    constructor(task, tokenizer, model, processor) {
        super(task, tokenizer, model);
        this.processor = processor;
    }

    /**
     * Preprocesses the input audio for the AutomaticSpeechRecognitionPipeline.
     * @param {any} audio - The audio to be preprocessed.
     * @param {number} sampling_rate - The sampling rate of the audio.
     * @returns {Promise<string | ArrayBuffer>} - A promise that resolves to the preprocessed audio data.
     * @private
     */
    async _preprocess(audio, sampling_rate) {
        if (isString(audio)) {
            // Attempting to load from path

            if (typeof AudioContext === 'undefined') {
                // Running in node or an environment without AudioContext
                throw Error(
                    "Unable to load audio from path/URL since `AudioContext` is not available in your environment. " +
                    "As a result, audio data must be passed directly to the processor. " +
                    "If you are running in node.js, you can use an external library (e.g., https://github.com/audiojs/web-audio-api) to do this."
                )
            }
            const response = await (await getFile(audio)).arrayBuffer();
            const audioCTX = new AudioContext({ sampleRate: sampling_rate });
            const decoded = await audioCTX.decodeAudioData(response);

            // We now replicate HuggingFace's `ffmpeg_read` method:
            // 
            // When downmixing a stereo audio file to mono using the -ac 1 option in FFmpeg,
            // the audio signal is summed across both channels to create a single mono channel.
            // However, if the audio is at full scale (i.e. the highest possible volume level),
            // the summing of the two channels can cause the audio signal to clip or distort.

            // To prevent this clipping, FFmpeg applies a scaling factor of 1/sqrt(2) (~ 0.707)
            // to the audio signal before summing the two channels. This scaling factor ensures
            // that the combined audio signal will not exceed the maximum possible level, even
            // if both channels are at full scale.

            // After applying this scaling factor, the audio signal from both channels is summed
            // to create a single mono channel. It's worth noting that this scaling factor is
            // only applied when downmixing stereo audio to mono using the -ac 1 option in FFmpeg.
            // If you're using a different downmixing method, or if you're not downmixing the
            // audio at all, this scaling factor may not be needed.
            const SCALING_FACTOR = Math.sqrt(2);

            let left = decoded.getChannelData(0);
            let right = decoded.getChannelData(1);

            audio = new Float32Array(left.length);
            for (let i = 0; i < decoded.length; i++) {
                audio[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
            }
        }

        return audio;
    }

    /**
     * Asynchronously processes audio and generates text transcription using the model.
     * @param {Array} audio - The audio to be transcribed. Can be a single Float32Array or an array of Float32Arrays.
     * @param {Object} [kwargs={}] - Optional arguments.
     * @param {boolean} [kwargs.return_timestamps] - Whether to return timestamps or not. Default is false.
     * @param {number} [kwargs.chunk_length_s] - The length of audio chunks to process in seconds. Default is 0 (no chunking).
     * @param {number} [kwargs.stride_length_s] - The length of overlap between consecutive audio chunks in seconds. If not provided, defaults to chunk_length_s / 6.
     * @param {function} [kwargs.chunk_callback] - Callback function to be called with each chunk processed.
     * @param {boolean} [kwargs.force_full_sequences] - Whether to force outputting full sequences or not. Default is false.
     * @returns {Promise<Object>} A Promise that resolves to an object containing the transcription text and optionally timestamps if return_timestamps is true.
     */
    async _call(audio, kwargs = {}) {
        let return_timestamps = kwargs.return_timestamps ?? false;
        let chunk_length_s = kwargs.chunk_length_s ?? 0;
        let stride_length_s = kwargs.stride_length_s ?? null;
        let chunk_callback = kwargs.chunk_callback ?? null;
        let force_full_sequences = kwargs.force_full_sequences ?? false;

        // TODO
        // task = 'transcribe',
        // language = 'en',

        let single = !Array.isArray(audio)
        if (single) {
            audio = [audio]
        }

        const sampling_rate = this.processor.feature_extractor.config.sampling_rate;
        const time_precision = this.processor.feature_extractor.config.chunk_length / this.model.config.max_source_positions;

        let toReturn = [];
        for (let aud of audio) {
            aud = await this._preprocess(aud, sampling_rate)

            /** @type {any[]} */
            let chunks = [];
            if (chunk_length_s > 0) {
                if (stride_length_s === null) {
                    stride_length_s = chunk_length_s / 6;
                } else if (chunk_length_s <= stride_length_s) {
                    throw Error("`chunk_length_s` must be larger than `stride_length_s`.")
                }

                // TODO support different stride_length_s (for left and right)

                const window = sampling_rate * chunk_length_s;
                const stride = sampling_rate * stride_length_s;
                const jump = window - 2 * stride;
                let offset = 0;

                // Create subarrays of audio with overlaps

                while (offset < aud.length) {
                    let subarr = aud.subarray(offset, offset + window);
                    let feature = await this.processor(subarr);

                    let isFirst = offset === 0;
                    let isLast = offset + jump >= aud.length;
                    chunks.push({
                        stride: [
                            subarr.length,
                            isFirst ? 0 : stride,
                            isLast ? 0 : stride
                        ],
                        input_features: feature.input_features,
                        is_last: isLast
                    })
                    offset += jump;
                }

            } else {
                chunks = [{
                    stride: [aud.length, 0, 0],
                    input_features: (await this.processor(aud)).input_features,
                    is_last: true
                }]
            }

            // Generate for each set of input features
            for (let chunk of chunks) {
                // NOTE: doing sequentially for now
                let data = await this.model.generate(chunk.input_features, kwargs);

                // Get top beam
                chunk.tokens = data[0].flat()

                // convert stride to seconds
                chunk.stride = chunk.stride.map(x => x / sampling_rate);

                if (chunk_callback !== null) {
                    chunk_callback(chunk)
                }
            }

            // Merge text chunks
            let [full_text, optional] = this.tokenizer._decode_asr(chunks, {
                time_precision: time_precision,
                return_timestamps: return_timestamps,
                force_full_sequences: force_full_sequences
            });

            toReturn.push({ text: full_text, ...optional })
        }
        return single ? toReturn[0] : toReturn;
    }
}

/**
 * A pipeline for performing image-to-text tasks.
 * @extends Pipeline
 */
class ImageToTextPipeline extends Pipeline {
    /**
     * Create an instance of ImageToTextPipeline.
     * @param {string} task - The task name.
     * @param {object} tokenizer - The tokenizer to use.
     * @param {object} model - The generator model to use.
     * @param {object} processor - The image processor to use.
     */
    constructor(task, tokenizer, model, processor) {
        super(task, tokenizer, model);
        this.processor = processor;
    }

    /**
     * @param {any[]} images
     */
    async _call(images, generate_kwargs = {}) {
        let isBatched = Array.isArray(images);

        images = await prepareImages(images);

        let pixel_values = (await this.processor(images)).pixel_values;

        let toReturn = [];
        for (let batch of pixel_values) {
            batch.dims = [1, ...batch.dims]
            let output = (await this.model.generate(batch, generate_kwargs)).flat();
            let decoded = this.tokenizer.batch_decode(output, {
                skip_special_tokens: true,
            }).map(x => {
                return { generated_text: x.trim() }
            })
            toReturn.push(decoded);
        }

        return isBatched ? toReturn : toReturn[0];
    }
}

/**
 * A class representing an image classification pipeline.
 * @extends Pipeline
 */
class ImageClassificationPipeline extends Pipeline {
    /**
     * Create a new ImageClassificationPipeline.
     * @param {string} task - The task of the pipeline.
     * @param {Object} model - The model to use for classification.
     * @param {Function} processor - The function to preprocess images.
     */
    constructor(task, model, processor) {
        super(task, null, model); // TODO tokenizer
        this.processor = processor;
    }

    /**
     * Classify the given images.
     * @async
     * @param {any} images - The images to classify.
     * @param {Object} options - The options to use for classification.
     * @param {number} [options.topk=1] - The number of top results to return.
     * @returns {Promise<any>} - The top classification results for the images.
     */
    async _call(images, {
        topk = 1
    } = {}) {
        let isBatched = Array.isArray(images);
        images = await prepareImages(images);

        let inputs = await this.processor(images);
        let output = await this.model(inputs);

        let id2label = this.model.config.id2label;
        let toReturn = [];
        for (let batch of output.logits) {
            let scores = getTopItems(softmax(batch.data), topk);

            let vals = scores.map(function (x) {
                return {
                    label: id2label[x[0]],
                    score: x[1],
                }
            });
            if (topk === 1) {
                toReturn.push(...vals);
            } else {
                toReturn.push(vals);
            }
        }

        return isBatched || topk === 1 ? toReturn : toReturn[0];
    }

}

/**
 * ImageSegmentationPipeline class for executing an image-segmentation task.
 * @extends Pipeline
 */
class ImageSegmentationPipeline extends Pipeline {
    /**
     * Create a new ImageSegmentationPipeline.
     * @param {string} task - The task of the pipeline.
     * @param {Object} model - The model to use for classification.
     * @param {Processor} processor - The function to preprocess images.
     */
    constructor(task, model, processor) {
        super(task, null, model); // TODO tokenizer
        this.processor = processor;

        this.subtasks_mapping = {
            // Mapping of subtasks to their corresponding post-processing function names.
            panoptic: 'post_process_panoptic_segmentation',
            instance: 'post_process_instance_segmentation',
            semantic: 'post_process_semantic_segmentation'
        }
    }

    /**
     * Segment the input images.
     * @param {Array} images - The input images.
     * @param {Object} options - The options to use for segmentation.
     * @param {number} [options.threshold=0.5] - Probability threshold to filter out predicted masks.
     * @param {number} [options.mask_threshold=0.5] - Threshold to use when turning the predicted masks into binary values.
     * @param {number} [options.overlap_mask_area_threshold=0.8] - Mask overlap threshold to eliminate small, disconnected segments.
     * @param {null|string} [options.subtask=null] - Segmentation task to be performed. One of [`panoptic`, `instance`, and `semantic`], depending on model capabilities. If not set, the pipeline will attempt to resolve (in that order).
     * @param {Array} [options.label_ids_to_fuse=null] - List of label ids to fuse. If not set, do not fuse any labels.
     * @param {Array} [options.target_sizes=null] - List of target sizes for the input images. If not set, use the original image sizes.
     * @returns {Promise<Array>} - The annotated segments.
     */
    async _call(images, {
        threshold = 0.5,
        mask_threshold = 0.5,
        overlap_mask_area_threshold = 0.8,
        label_ids_to_fuse = null,
        target_sizes = null,
        subtask = null, // TODO use
    } = {}) {
        let isBatched = Array.isArray(images);

        if (isBatched && images.length !== 1) {
            throw Error("Image segmentation pipeline currently only supports a batch size of 1.");
        }

        images = await prepareImages(images);
        let imageSizes = images.map(x => [x.height, x.width]);

        let inputs = await this.processor(images);
        let output = await this.model(inputs);

        let fn = null;
        if (subtask !== null) {
            fn = this.subtasks_mapping[subtask];
        } else {
            for (let [task, func] of Object.entries(this.subtasks_mapping)) {
                if (func in this.processor.feature_extractor) {
                    fn = this.processor.feature_extractor[func].bind(this.processor.feature_extractor);
                    subtask = task;
                    break;
                }
            }
        }

        // add annotations
        let annotation = [];

        if (subtask === 'panoptic' || subtask === 'instance') {

            let processed = fn(
                output,
                threshold,
                mask_threshold,
                overlap_mask_area_threshold,
                label_ids_to_fuse,
                target_sizes ?? imageSizes, // TODO FIX?
            )[0];

            let segmentation = processed.segmentation;
            let id2label = this.model.config.id2label;

            for (let segment of processed.segments_info) {
                let maskData = new Uint8ClampedArray(segmentation.data.length);
                for (let i = 0; i < segmentation.data.length; ++i) {
                    if (segmentation.data[i] === segment.id) {
                        maskData[i] = 255;
                    }
                }

                let mask = new CustomImage(maskData, segmentation.dims[1], segmentation.dims[0], 1)

                annotation.push({
                    score: segment.score,
                    label: id2label[segment.label_id],
                    mask: mask
                })
            }

        } else if (subtask === 'semantic') {
            throw Error(`semantic segmentation not yet supported.`);

        } else {
            throw Error(`Subtask ${subtask} not supported.`);
        }

        return annotation;
    }
}


/**
 * Class representing a zero-shot image classification pipeline.
 * @extends Pipeline
 */
class ZeroShotImageClassificationPipeline extends Pipeline {

    /**
     * Create a zero-shot image classification pipeline.
     * @param {string} task - The task of the pipeline.
     * @param {Object} tokenizer - The tokenizer to use.
     * @param {Object} model - The model to use.
     * @param {Function} processor - The image processing function.
     */
    constructor(task, tokenizer, model, processor) {
        super(task, tokenizer, model);
        this.processor = processor;
    }

    /**
     * Classify the input images with candidate labels using a zero-shot approach.
     * @param {Array} images - The input images.
     * @param {Array} candidate_labels - The candidate labels.
     * @param {Object} options - The options for the classification.
     * @param {string} [options.hypothesis_template] - The hypothesis template to use for zero-shot classification. Default: "This is a photo of {}".
     * @todo fix error below
     * @returns {Promise<any>} An array of classifications for each input image or a single classification object if only one input image is provided.
     */
    async _call(images, candidate_labels, {
        hypothesis_template = "This is a photo of {}"
    } = {}) {
        let isBatched = Array.isArray(images);
        images = await prepareImages(images);

        // Insert label into hypothesis template 
        let texts = candidate_labels.map(
            x => hypothesis_template.replace('{}', x)
        );

        // Run tokenization
        let text_inputs = this.tokenizer(texts, {
            padding: true,
            truncation: true
        });

        // Compare each image with each candidate label
        let image_inputs = await this.processor(images);
        let output = await this.model({ ...text_inputs, ...image_inputs });

        let toReturn = [];
        for (let batch of output.logits_per_image) {
            // Compute softmax per image
            let probs = softmax(batch.data);

            toReturn.push([...probs].map((x, i) => {
                return {
                    score: x,
                    label: candidate_labels[i]
                }
            }));
        }

        return isBatched ? toReturn : toReturn[0];
    }
}


class ObjectDetectionPipeline extends Pipeline {
    /**
     * @param {string} task
     * @param {any} model
     * @param {any} processor
     */
    constructor(task, model, processor) {
        super(task, null, model); // TODO tokenizer
        this.processor = processor;
    }

    /**
     * @param {any[]} images
     */
    async _call(images, {
        threshold = 0.5,
        percentage = false, // get in percentage (true) or in pixels (false)
    } = {}) {
        let isBatched = Array.isArray(images);

        if (isBatched && images.length !== 1) {
            throw Error("Object detection pipeline currently only supports a batch size of 1.");
        }
        images = await prepareImages(images);

        let imageSizes = percentage ? null : images.map(x => [x.height, x.width]);

        let inputs = await this.processor(images);
        let output = await this.model(inputs);

        let processed = this.processor.feature_extractor.post_process_object_detection(output, threshold, imageSizes);

        // Add labels
        let id2label = this.model.config.id2label;
        processed.forEach(x => x.labels = x.classes.map(y => id2label[y]));

        return isBatched ? processed : processed[0];
    }
}

const SUPPORTED_TASKS = {
    "text-classification": {
        "tokenizer": AutoTokenizer,
        "pipeline": TextClassificationPipeline,
        "model": AutoModelForSequenceClassification,
        "default": {
            "model": "distilbert-base-uncased-finetuned-sst-2-english",
        },
        "type": "text",
    },
    "token-classification": {
        "tokenizer": AutoTokenizer,
        "pipeline": TokenClassificationPipeline,
        "model": AutoModelForTokenClassification,
        "default": {
            "model": "Davlan/bert-base-multilingual-cased-ner-hrl",
        },
        "type": "text",
    },
    "question-answering": {
        "tokenizer": AutoTokenizer,
        "pipeline": QuestionAnsweringPipeline,
        "model": AutoModelForQuestionAnswering,
        "default": {
            "model": "distilbert-base-cased-distilled-squad"
        },
        "type": "text",
    },

    "fill-mask": {
        "tokenizer": AutoTokenizer,
        "pipeline": FillMaskPipeline,
        "model": AutoModelForMaskedLM,
        "default": {
            "model": "bert-base-uncased"
        },
        "type": "text",
    },
    "summarization": {
        "tokenizer": AutoTokenizer,
        "pipeline": SummarizationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            "model": "sshleifer/distilbart-cnn-6-6"
        },
        "type": "text",
    },
    "translation": {
        "tokenizer": AutoTokenizer,
        "pipeline": TranslationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            "model": "t5-small"
        },
        "type": "text",
    },
    "text2text-generation": {
        "tokenizer": AutoTokenizer,
        "pipeline": Text2TextGenerationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            "model": "google/flan-t5-small"
        },
        "type": "text",
    },
    "text-generation": {
        "tokenizer": AutoTokenizer,
        "pipeline": TextGenerationPipeline,
        "model": AutoModelForCausalLM,
        "default": {
            "model": "gpt2"
        },
        "type": "text",
    },
    "zero-shot-classification": {
        "tokenizer": AutoTokenizer,
        "pipeline": ZeroShotClassificationPipeline,
        "model": AutoModelForSequenceClassification,
        "default": {
            "model": "typeform/distilbert-base-uncased-mnli",
        },
        "type": "text",
    },

    "automatic-speech-recognition": {
        "tokenizer": AutoTokenizer,
        "pipeline": AutomaticSpeechRecognitionPipeline,
        "model": AutoModelForSeq2SeqLM,
        "processor": AutoProcessor,
        "default": {
            "model": "openai/whisper-tiny.en"
        },
        "type": "multimodal",
    },

    "image-to-text": {
        "tokenizer": AutoTokenizer,
        "pipeline": ImageToTextPipeline,
        "model": AutoModelForVision2Seq,
        "processor": AutoProcessor,
        "default": {
            "model": "nlpconnect/vit-gpt2-image-captioning"
        },
        "type": "multimodal",
    },

    "image-classification": {
        // no tokenizer
        "pipeline": ImageClassificationPipeline,
        "model": AutoModelForImageClassification,
        "processor": AutoProcessor,
        "default": {
            "model": "google/vit-base-patch16-224"
        },
        "type": "multimodal",
    },

    "image-segmentation": {
        // no tokenizer
        "pipeline": ImageSegmentationPipeline,
        "model": AutoModelForImageSegmentation,
        "processor": AutoProcessor,
        "default": {
            "model": "facebook/detr-resnet-50-panoptic"
        },
        "type": "multimodal",
    },

    "zero-shot-image-classification": {
        // no tokenizer
        "tokenizer": AutoTokenizer,
        "pipeline": ZeroShotImageClassificationPipeline,
        "model": AutoModel,
        "processor": AutoProcessor,
        "default": {
            "model": "openai/clip-vit-base-patch32"
        },
        "type": "multimodal",
    },

    "object-detection": {
        // no tokenizer
        "pipeline": ObjectDetectionPipeline,
        "model": AutoModelForObjectDetection,
        "processor": AutoProcessor,
        "default": {
            "model": "facebook/detr-resnet-50"
        },
        "type": "multimodal",
    },

    // This task is not supported in HuggingFace transformers, but serves as a useful interface
    // for dealing with sentence-transformers (https://huggingface.co/sentence-transformers)
    "embeddings": {
        "tokenizer": AutoTokenizer,
        "pipeline": EmbeddingsPipeline,
        "model": AutoModel,
        "default": {
            "model": "sentence-transformers/all-MiniLM-L6-v2"
        },
        "type": "text",
    },
}

const TASK_NAME_MAPPING = {
    // Fix mismatch between pipeline's task name and exports (folder name)
    'text-classification': 'sequence-classification',
    'embeddings': 'default',
    'fill-mask': 'masked-lm',

    'text2text-generation': 'seq2seq-lm-with-past',
    'summarization': 'seq2seq-lm-with-past',
    'text-generation': 'causal-lm-with-past',

    'automatic-speech-recognition': 'speech2seq-lm-with-past',
    'image-to-text': 'vision2seq-lm-with-past',

    'zero-shot-image-classification': 'default',
    'zero-shot-classification': 'sequence-classification'
}

const TASK_PREFIX_MAPPING = {
    // if task starts with one of these, set the corresponding folder name
    'translation': 'seq2seq-lm-with-past',
}


const TASK_ALIASES = {
    "sentiment-analysis": "text-classification",
    "ner": "token-classification",
    "vqa": "visual-question-answering",
}

/**
 * Constructs a pipeline for a specified task with optional model and progress callback.
 *
 * @async
 * @function
 * @param {string} task - The task to perform, e.g. "text-generation".
 * @param {string} [model=null] - The name of the pre-trained model to use. If not specified, the default model for the task will be used.
 * @param {object} [options] - Optional parameters for the pipeline.
 * @param {function} [options.progress_callback=null] - A function to call with progress updates.
 * @returns {Promise<Pipeline>} A Pipeline object for the specified task.
 * @todo fix error below
 * @throws {Error} If an unsupported pipeline is requested.
 */
async function pipeline(
    task,
    model = null,
    {
        progress_callback = null
    } = {}
) {
    // Helper method to construct pipeline

    // Apply aliases
    task = TASK_ALIASES[task] ?? task;

    // Get pipeline info
    let pipelineInfo = SUPPORTED_TASKS[task.split('_', 1)[0]];
    if (!pipelineInfo) {
        throw Error(`Unsupported pipeline: ${task}. Must be one of [${Object.keys(SUPPORTED_TASKS)}]`)
    }


    // Use model if specified, otherwise, use default
    if (!model) {
        model = pipelineInfo.default.model
        console.log(`No model specified. Using default model: "${model}".`);
    }

    // determine suffix
    let suffix = TASK_NAME_MAPPING[task];
    if (!suffix) {
        // try get from suffix
        for (const [prefix, mapping] of Object.entries(TASK_PREFIX_MAPPING)) {
            if (task.startsWith(prefix)) {
                suffix = mapping;
                break;
            }
        }
    }

    if (!suffix) {
        // Still not set... so, we default to the name given
        suffix = task;
    }

    // Construct model path
    model = pathJoin(
        (env.remoteModels) ? env.remoteURL : env.localURL, // host prefix
        model, // model name
        suffix, // task suffix
    )

    let tokenizerClass = pipelineInfo.tokenizer;
    let modelClass = pipelineInfo.model;
    let pipelineClass = pipelineInfo.pipeline;
    let processorClass = pipelineInfo.processor;

    let promises = [];

    if (tokenizerClass) {
        promises.push(
            AutoTokenizer.from_pretrained(model, progress_callback),
        )
    }
    if (modelClass) {
        promises.push(
            modelClass.from_pretrained(model, progress_callback)
        )
    }

    if (processorClass) {
        promises.push(
            processorClass.from_pretrained(model, progress_callback)
        )
    }

    // Load tokenizer and model
    let items = await Promise.all(promises)
    // TODO: fix error below
    return new pipelineClass(task, ...items);

}

/**
 * Compute the Cartesian product of given arrays
 * @param {...Array} a - Arrays to compute the product
 * @returns {Array} - Returns the computed Cartesian product as an array
 */
function product(...a) {
    // Cartesian product of items
    // Adapted from https://stackoverflow.com/a/43053803
    return a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e])));
}

module.exports = {
    pipeline
};


/***/ }),

/***/ "./src/processors.js":
/*!***************************!*\
  !*** ./src/processors.js ***!
  \***************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


const {
    Callable,
    fetchJSON,
    indexOfMax,
    softmax,
} = __webpack_require__(/*! ./utils.js */ "./src/utils.js");


const FFT = __webpack_require__(/*! ./fft.js */ "./src/fft.js");
const { Tensor, transpose, cat, interpolate } = __webpack_require__(/*! ./tensor_utils.js */ "./src/tensor_utils.js");

const { CustomImage } = __webpack_require__(/*! ./image_utils.js */ "./src/image_utils.js");
/**
 * Helper class to determine model type from config
 */
class AutoProcessor {
    /**
     * Returns a new instance of a Processor with a feature extractor
     * based on the configuration file located at `modelPath`.
     *
     * @param {string} modelPath - The path to the model directory.
     * @param {function} progressCallback - A callback function to track the loading progress (optional).
     * @returns {Promise<Processor>} A Promise that resolves with a new instance of a Processor.
     * @throws {Error} If the feature extractor type specified in the configuration file is unknown.
     */
    static async from_pretrained(modelPath, progressCallback = null) {

        let preprocessorConfig = await fetchJSON(modelPath, 'preprocessor_config.json', progressCallback)

        let processor_class;
        let feature_extractor;

        switch (preprocessorConfig.feature_extractor_type) {
            case 'WhisperFeatureExtractor':
                feature_extractor = new WhisperFeatureExtractor(preprocessorConfig)
                break;
            case 'ViTFeatureExtractor':
                feature_extractor = new ViTFeatureExtractor(preprocessorConfig)
                break;
            case 'DetrFeatureExtractor':
                feature_extractor = new DetrFeatureExtractor(preprocessorConfig)
                break;
            default:
                if (preprocessorConfig.size !== undefined) {
                    // Assume ImageFeatureExtractor
                    console.warn('Feature extractor type not specified, assuming ImageFeatureExtractor due to size parameter in config.')
                    feature_extractor = new ImageFeatureExtractor(preprocessorConfig)

                } else {
                    throw new Error(`Unknown Feature Extractor type: ${preprocessorConfig.feature_extractor_type}`);

                }
        }

        switch (preprocessorConfig.processor_class) {
            case 'WhisperProcessor':
                processor_class = WhisperProcessor;
                break;
            default:
                // No associated processor class, use default
                processor_class = Processor;
        }

        return new processor_class(feature_extractor);
    }
}

/**
 * Base class for feature extractors.
 *
 * @extends Callable
 */
class FeatureExtractor extends Callable {
    /**
     * Constructs a new FeatureExtractor instance.
     *
     * @param {object} config - The configuration for the feature extractor.
     */
    constructor(config) {
        super();
        this.config = config
    }
}

/**
 * Feature extractor for Vision Transformer (ViT) models.
 *
 * @extends FeatureExtractor
 */
class ImageFeatureExtractor extends FeatureExtractor {

    /**
     * Constructs a new ViTFeatureExtractor instance.
     *
     * @param {object} config - The configuration for the feature extractor.
     * @param {number[]} config.image_mean - The mean values for image normalization.
     * @param {number[]} config.image_std - The standard deviation values for image normalization.
     * @param {boolean} config.do_rescale - Whether to rescale the image pixel values to the [0,1] range.
     * @param {boolean} config.do_normalize - Whether to normalize the image pixel values.
     * @param {boolean} config.do_resize - Whether to resize the image.
     * @param {number} config.size - The size to resize the image to.
     */
    constructor(config) {
        super(config);

        this.image_mean = this.config.image_mean;
        if (!Array.isArray(this.image_mean)) {
            this.image_mean = new Array(3).fill(this.image_mean);
        }

        this.image_std = this.config.image_std;
        if (!Array.isArray(this.image_std)) {
            this.image_std = new Array(3).fill(this.image_std);
        }

        this.do_rescale = this.config.do_rescale ?? true;
        this.do_normalize = this.config.do_normalize;

        this.do_resize = this.config.do_resize;
        this.size = this.config.size;

        this.max_size = this.config.max_size;

        // TODO use these
        this.do_center_crop = this.config.do_center_crop;
        this.crop_size = this.config.crop_size;
    }

    /**
     * Preprocesses the given image.
     *
     * @param {CustomImage} image - The image to preprocess.
     * @returns {Promise<any>} The preprocessed image as a Tensor.
     */
    async preprocess(image) {

        const srcWidth = image.width;   // original width
        const srcHeight = image.height; // original height

        // First, resize all images
        if (this.do_resize) {
            // If `max_size` is set, maintain aspect ratio and resize to `size`
            // while keeping the largest dimension <= `max_size`
            if (this.max_size !== undefined) {
                // http://opensourcehacker.com/2011/12/01/calculate-aspect-ratio-conserving-resize-for-images-in-javascript/
                // Try resize so that shortest edge is `this.size` (target)
                const ratio = Math.max(this.size / srcWidth, this.size / srcHeight);
                const newWidth = srcWidth * ratio;
                const newHeight = srcHeight * ratio;

                // The new width and height might be greater than `this.max_size`, so
                // we downscale again to ensure the largest dimension is `this.max_size` 
                const downscaleFactor = Math.min(this.max_size / newWidth, this.max_size / newHeight, 1);

                // Perform resize
                image = await image.resize(Math.floor(newWidth * downscaleFactor), Math.floor(newHeight * downscaleFactor));

            } else {
                image = await image.resize(this.size, this.size);
            }
        }

        // Convert image to RGB
        image = image.rgb();

        const pixelData = Float32Array.from(image.data);

        if (this.do_rescale) {
            for (let i = 0; i < pixelData.length; ++i) {
                pixelData[i] = pixelData[i] / 255;
            }
        }

        if (this.do_normalize) {
            for (let i = 0; i < pixelData.length; i += 3) {
                for (let j = 0; j < 3; ++j) {
                    pixelData[i + j] = (pixelData[i + j] - this.image_mean[j]) / this.image_std[j];
                }
            }
        }

        let imgDims = [image.height, image.width, 3];
        let img = new Tensor('float32', pixelData, imgDims);
        let transposed = transpose(img, [2, 0, 1]); // hwc -> chw

        return transposed;
    }

    /**
     * Calls the feature extraction process on an array of image
     * URLs, preprocesses each image, and concatenates the resulting
     * features into a single Tensor.
     * @param {any} images - The URL(s) of the image(s) to extract features from.
     * @returns {Promise<Object>} An object containing the concatenated pixel values of the preprocessed images.
     */
    async _call(images) {
        if (!Array.isArray(images)) {
            images = [images];
        }
        images = await Promise.all(images.map(x => this.preprocess(x)));

        images.forEach(x => x.dims = [1, ...x.dims]); // add batch dimension

        images = cat(images);
        // TODO concatenate on dim=0
        return {
            pixel_values: images
        }
    }

}

class ViTFeatureExtractor extends ImageFeatureExtractor { }

/**
 * Detr Feature Extractor.
 *
 * @extends ImageFeatureExtractor
 */
class DetrFeatureExtractor extends ImageFeatureExtractor {
    /**
     * Calls the feature extraction process on an array of image
     * URLs, preprocesses each image, and concatenates the resulting
     * features into a single Tensor.
     * @param {any} urls - The URL(s) of the image(s) to extract features from.
     * @returns {Promise<Object>} An object containing the concatenated pixel values of the preprocessed images.
     */
    async _call(urls) {
        let result = await super._call(urls);

        // TODO support differently-sized images, for now assume all images are the same size.
        // TODO support different mask sizes (not just 64x64)
        // Currently, just fill pixel mask with 1s
        let maskSize = [result.pixel_values.dims[0], 64, 64];
        result.pixel_mask = new Tensor(
            'int64',
            // TODO: fix error below
            new BigInt64Array(maskSize.reduce((a, b) => a * b)).fill(1n),
            maskSize
        );

        return result;
    }

    /**
     * @param {number[]} arr - The URL(s) of the image(s) to extract features from.
     * @returns {number[]} An object containing the concatenated pixel values of the preprocessed images.
     */
    center_to_corners_format([centerX, centerY, width, height]) {
        return [
            centerX - width / 2,
            centerY - height / 2,
            centerX + width / 2,
            centerY + height / 2
        ];
    }

    /**
     * @param {{ logits: any; pred_boxes: any; }} outputs
     * @return {any}
     */
    post_process_object_detection(outputs, threshold = 0.5, target_sizes = null) {
        const out_logits = outputs.logits;
        const out_bbox = outputs.pred_boxes;
        const [batch_size, num_boxes, num_classes] = out_logits.dims;

        if (target_sizes !== null && target_sizes.length !== batch_size) {
            throw Error("Make sure that you pass in as many target sizes as the batch dimension of the logits")
        }
        let toReturn = [];
        for (let i = 0; i < batch_size; ++i) {
            let target_size = target_sizes !== null ? target_sizes[i] : null;
            let info = {
                boxes: [],
                classes: [],
                scores: []
            }
            let logits = out_logits.get(i);
            let bbox = out_bbox.get(i);

            for (let j = 0; j < num_boxes; ++j) {
                let logit = logits.get(j);

                // Get most probable class
                let maxIndex = indexOfMax(logit.data);

                if (maxIndex === num_classes - 1) {
                    // This is the background class, skip it
                    continue;
                }

                // Compute softmax over classes
                let probs = softmax(logit.data);

                let score = probs[maxIndex];
                if (score > threshold) {
                    // Some class has a high enough probability
                    /** @type {number[]} */
                    let box = bbox.get(j);

                    // convert to [x0, y0, x1, y1] format
                    box = this.center_to_corners_format(box)
                    if (target_size !== null) {
                        box = box.map((x, i) => x * target_size[(i + 1) % 2])
                    }

                    info.boxes.push(box);
                    info.classes.push(maxIndex);
                    info.scores.push(score);
                }
            }
            toReturn.push(info);
        }
        return toReturn;
    }

    /**
     * Binarize the given masks using `object_mask_threshold`, it returns the associated values of `masks`, `scores` and `labels`.
     * @param {Tensor} class_logits - The class logits.
     * @param {Tensor} mask_logits - The mask logits.
     * @param {number} object_mask_threshold - A number between 0 and 1 used to binarize the masks.
     * @param {number} num_labels - The number of labels.
     * @returns {[Tensor[], number[], number[]]} - The binarized masks, the scores, and the labels.
     */
    remove_low_and_no_objects(class_logits, mask_logits, object_mask_threshold, num_labels) {

        let mask_probs_item = [];
        let pred_scores_item = [];
        let pred_labels_item = [];

        for (let j = 0; j < class_logits.dims[0]; ++j) {
            let cls = class_logits.get(j);
            let mask = mask_logits.get(j);

            let pred_label = indexOfMax(cls.data);
            if (pred_label === num_labels) {
                // Is the background, so we ignore it
                continue;
            }

            let scores = softmax(cls.data);
            let pred_score = scores[pred_label];
            if (pred_score > object_mask_threshold) {
                mask_probs_item.push(mask);
                pred_scores_item.push(pred_score);
                pred_labels_item.push(pred_label);
            }
        }

        return [mask_probs_item, pred_scores_item, pred_labels_item];

    }

    /**
     * Checks whether the segment is valid or not.
     * @param {Int32Array} mask_labels - Labels for each pixel in the mask.
     * @param {Tensor[]} mask_probs - Probabilities for each pixel in the masks.
     * @param {number} k - The class id of the segment.
     * @param {number} mask_threshold - The mask threshold.
     * @param {number} overlap_mask_area_threshold - The overlap mask area threshold.
     * @returns {[boolean, number[]]} - Whether the segment is valid or not, and the indices of the valid labels.
     */
    check_segment_validity(
        mask_labels,
        mask_probs,
        k,
        mask_threshold = 0.5,
        overlap_mask_area_threshold = 0.8
    ) {
        // mask_k is a 1D array of indices, indicating where the mask is equal to k
        let mask_k = [];
        let mask_k_area = 0;
        let original_area = 0;

        // Compute the area of all the stuff in query k
        for (let i = 0; i < mask_labels.length; ++i) {
            if (mask_labels[i] === k) {
                mask_k.push(i);
                ++mask_k_area;
            }

            if (mask_probs[k].data[i] >= mask_threshold) {
                ++original_area;
            }
        }
        let mask_exists = mask_k_area > 0 && original_area > 0;

        // Eliminate disconnected tiny segments
        if (mask_exists) {
            // Perform additional check
            let area_ratio = mask_k_area / original_area;
            mask_exists = area_ratio > overlap_mask_area_threshold;
        }

        return [mask_exists, mask_k]
    }

    /**
     * Computes the segments.
     * @param {Tensor[]} mask_probs - The mask probabilities.
     * @param {number[]} pred_scores - The predicted scores.
     * @param {number[]} pred_labels - The predicted labels.
     * @param {number} mask_threshold - The mask threshold.
     * @param {number} overlap_mask_area_threshold - The overlap mask area threshold.
     * @param {Set<number>} label_ids_to_fuse - The label ids to fuse.
     * @param {number[]} target_size - The target size of the image.
     * @returns {[Tensor, Array<{id: number, label_id: number, score: number}>]} - The computed segments.
     */
    compute_segments(
        mask_probs,
        pred_scores,
        pred_labels,
        mask_threshold,
        overlap_mask_area_threshold,
        label_ids_to_fuse = null,
        target_size = null,
    ) {
        let [height, width] = target_size ?? mask_probs[0].dims;

        let segmentation = new Tensor(
            'int32',
            new Int32Array(height * width),
            [height, width]
        );
        let segments = [];

        // 1. If target_size is not null, we need to resize the masks to the target size
        if (target_size !== null) {
            // resize the masks to the target size
            for (let i = 0; i < mask_probs.length; ++i) {
                mask_probs[i] = interpolate(mask_probs[i], target_size, 'bilinear', false);
            }
        }

        // 2. Weigh each mask by its prediction score
        // NOTE: `mask_probs` is updated in-place
        // 
        // Temporary storage for the best label/scores for each pixel ([height, width]):
        let mask_labels = new Int32Array(mask_probs[0].data.length);
        let bestScores = new Float32Array(mask_probs[0].data.length);

        for (let i = 0; i < mask_probs.length; ++i) {
            let score = pred_scores[i];

            for (let j = 0; j < mask_probs[i].data.length; ++j) {
                mask_probs[i].data[j] *= score
                if (mask_probs[i].data[j] > bestScores[j]) {
                    mask_labels[j] = i;
                    bestScores[j] = mask_probs[i].data[j];
                }
            }
        }

        let current_segment_id = 0;

        // let stuff_memory_list = {}
        for (let k = 0; k < pred_labels.length; ++k) {
            let pred_class = pred_labels[k];

            // TODO add `should_fuse`
            // let should_fuse = pred_class in label_ids_to_fuse

            // Check if mask exists and large enough to be a segment
            let [mask_exists, mask_k] = this.check_segment_validity(
                mask_labels,
                mask_probs,
                k,
                mask_threshold,
                overlap_mask_area_threshold
            )

            if (!mask_exists) {
                // Nothing to see here
                continue;
            }

            // TODO
            // if (pred_class in stuff_memory_list) {
            //     current_segment_id = stuff_memory_list[pred_class]
            // } else {
            //     current_segment_id += 1;
            // }
            ++current_segment_id;


            // Add current object segment to final segmentation map
            for (let index of mask_k) {
                segmentation.data[index] = current_segment_id;
            }

            segments.push({
                id: current_segment_id,
                label_id: pred_class,
                // was_fused: should_fuse, TODO
                score: pred_scores[k],
            })

            // TODO
            // if(should_fuse){
            //     stuff_memory_list[pred_class] = current_segment_id
            // }
        }

        return [segmentation, segments];
    }

    /**
     * Post-process the model output to generate the final panoptic segmentation.
     * @param {*} outputs - The model output to post process
     * @param {number} [threshold=0.5] - The probability score threshold to keep predicted instance masks.
     * @param {number} [mask_threshold=0.5] - Threshold to use when turning the predicted masks into binary values.
     * @param {number} [overlap_mask_area_threshold=0.8] - The overlap mask area threshold to merge or discard small disconnected parts within each binary instance mask.
     * @param {Set<number>} [label_ids_to_fuse=null] - The labels in this state will have all their instances be fused together.
     * @param {number[][]} [target_sizes=null] - The target sizes to resize the masks to.
     * @returns {Array<{ segmentation: Tensor, segments_info: Array<{id: number, label_id: number, score: number}>}>}
     */
    post_process_panoptic_segmentation(
        outputs,
        threshold = 0.5,
        mask_threshold = 0.5,
        overlap_mask_area_threshold = 0.8,
        label_ids_to_fuse = null,
        target_sizes = null,
    ) {
        if (label_ids_to_fuse === null) {
            console.warn("`label_ids_to_fuse` unset. No instance will be fused.")
            label_ids_to_fuse = new Set();
        }

        const class_queries_logits = outputs.logits; // [batch_size, num_queries, num_classes+1]
        const masks_queries_logits = outputs.pred_masks; // [batch_size, num_queries, height, width]

        const mask_probs = masks_queries_logits.sigmoid()  // [batch_size, num_queries, height, width]

        let [batch_size, num_queries, num_labels] = class_queries_logits.dims;
        num_labels -= 1; // Remove last class (background)

        if (target_sizes !== null && target_sizes.length !== batch_size) {
            throw Error("Make sure that you pass in as many target sizes as the batch dimension of the logits")
        }

        let toReturn = [];
        for (let i = 0; i < batch_size; ++i) {
            let target_size = target_sizes !== null ? target_sizes[i] : null;

            let class_logits = class_queries_logits.get(i);
            let mask_logits = mask_probs.get(i);

            let [mask_probs_item, pred_scores_item, pred_labels_item] = this.remove_low_and_no_objects(class_logits, mask_logits, threshold, num_labels);

            if (pred_labels_item.length === 0) {
                // No mask found
                let [height, width] = target_size ?? mask_logits.dims.slice(-2);

                let segmentation = new Tensor(
                    'int32',
                    new Int32Array(height * width).fill(-1),
                    [height, width]
                )
                toReturn.push({
                    segmentation: segmentation,
                    segments_info: []
                });
                continue;
            }


            // Get segmentation map and segment information of batch item
            let [segmentation, segments] = this.compute_segments(
                mask_probs_item,
                pred_scores_item,
                pred_labels_item,
                mask_threshold,
                overlap_mask_area_threshold,
                label_ids_to_fuse,
                target_size,
            )

            toReturn.push({
                segmentation: segmentation,
                segments_info: segments
            })
        }

        return toReturn;
    }

    post_process_instance_segmentation() {
        // TODO
        throw Error("Not implemented yet");
    }
}


class WhisperFeatureExtractor extends FeatureExtractor {

    /**
     * Calculates the index offset for a given index and window size.
     * @param {number} i - The index.
     * @param {number} w - The window size.
     * @returns {number} The index offset.
     */
    calcOffset(i, w) {
        return Math.abs((i + w) % (2 * w) - w);
    }

    /**
     * Pads an array with a reflected version of itself on both ends.
     * @param {Float32Array} array - The array to pad.
     * @param {number} left - The amount of padding to add to the left.
     * @param {number} right - The amount of padding to add to the right.
     * @returns {Float32Array} The padded array.
     */
    padReflect(array, left, right) {
        const padded = new Float32Array(array.length + left + right);
        const w = array.length - 1;

        for (let i = 0; i < array.length; ++i) {
            padded[left + i] = array[i];
        }

        for (let i = 1; i <= left; ++i) {
            padded[left - i] = array[this.calcOffset(i, w)];
        }

        for (let i = 1; i <= right; ++i) {
            padded[w + left + i] = array[this.calcOffset(w - i, w)];
        }

        return padded;
    }

    /**
     * Calculates the complex Short-Time Fourier Transform (STFT) of the given framed signal.
     * 
     * @param {number[][]} frames - A 2D array representing the signal frames.
     * @param {number[]} window - A 1D array representing the window to be applied to the frames.
     * @returns {Object} An object with the following properties:
     * - data: A 1D array representing the complex STFT of the signal.
     * - dims: An array representing the dimensions of the STFT data, i.e. [num_frames, num_fft_bins].
     */
    stft(frames, window) {
        // Calculates the complex Short-Time Fourier Transform (STFT) of the given framed signal.
        // 
        // NOTE: Since the window width is not a power of 2, we must 
        // perform Fast Fourier Transform with chirp-z transform:
        // https://math.stackexchange.com/questions/77118/non-power-of-2-ffts/77156#77156

        // Helper variables
        const fft_size = this.config.n_fft;
        const a = 2 * (fft_size - 1);
        const b = 2 * (2 * fft_size - 1);
        const nextP2 = 2 ** (Math.ceil(Math.log2(b)))
        const num_fft_bins = fft_size + 2;

        // Preallocate array to store output
        // double since we store complex numbers
        const data = new Float32Array(num_fft_bins * frames.length);

        // Define buffers
        // Compute chirp for transform
        const chirp = new Float32Array(b);
        const ichirp = new Float32Array(nextP2);
        const buffer1 = new Float32Array(nextP2);
        const buffer2 = new Float32Array(nextP2);
        const outBuffer = new Float32Array(nextP2);
        const outBuffer2 = new Float32Array(nextP2);
        const outBuffer3 = new Float32Array(nextP2);

        // Compute complex exponentiation
        const theta = -2 * Math.PI / fft_size;
        const baseR = Math.cos(theta);
        const baseI = Math.sin(theta);

        // Precompute helper for chirp-z transform
        for (let i = 0; i < b >> 1; ++i) {
            // Compute complex power:
            const e = (i + 1 - fft_size) ** 2 / 2.0;

            // Compute the modulus and argument of the result
            const result_mod = Math.sqrt(baseR ** 2 + baseI ** 2) ** e;
            const result_arg = e * Math.atan2(baseI, baseR);

            // Convert the result back to rectangular form
            // and assign to chirp and ichirp
            let i2 = 2 * i;
            chirp[i2] = result_mod * Math.cos(result_arg);
            chirp[i2 + 1] = result_mod * Math.sin(result_arg);

            // conjugate
            ichirp[i2] = chirp[i2];
            ichirp[i2 + 1] = - chirp[i2 + 1];
        }
        const slicedChirp = chirp.subarray(a, b);

        // create object to perform Fast Fourier Transforms
        // with `nextP2` complex numbers
        const f = new FFT(nextP2 >> 1);
        // TODO: decide between Float32Array and Float64Array
        f.transform(outBuffer, ichirp);

        for (let i = 0; i < frames.length; ++i) {
            const frame = frames[i];

            for (let j = 0; j < slicedChirp.length; j += 2) {
                const j2 = j + 1
                const j3 = j >> 1;

                const a_real = frame[j3] * window[j3];
                buffer1[j] = a_real * slicedChirp[j];
                buffer1[j2] = a_real * slicedChirp[j2];
            }
            // TODO: decide between Float32Array and Float64Array
            f.transform(outBuffer2, buffer1);

            for (let j = 0; j < outBuffer.length; j += 2) {
                const j2 = j + 1;

                buffer2[j] = outBuffer2[j] * outBuffer[j] - outBuffer2[j2] * outBuffer[j2]
                buffer2[j2] = outBuffer2[j] * outBuffer[j2] + outBuffer2[j2] * outBuffer[j]
            }
            // TODO: decide between Float32Array and Float64Array
            f.inverseTransform(outBuffer3, buffer2)

            const offset = i * num_fft_bins;
            for (let j = 0; j < num_fft_bins; j += 2) {
                const a_real = outBuffer3[j + a];
                const a_imag = outBuffer3[j + a + 1];
                const b_real = slicedChirp[j];
                const b_imag = slicedChirp[j + 1];

                // TODO write as transpose
                const o1 = offset + j;
                data[o1] = a_real * b_real - a_imag * b_imag
                data[o1 + 1] = a_real * b_imag + a_imag * b_real
            }
        }

        return {
            data: data,
            dims: [frames.length, num_fft_bins] // [3001, 402]
        };
    }

    /**
     * Creates an array of frames from a given waveform.
     *
     * @param {Float32Array} waveform - The waveform to create frames from.
     * @param {boolean} [center=true] - Whether to center the frames on their corresponding positions in the waveform. Defaults to true.
     * @returns {Array} An array of frames.
     */
    fram_wave(waveform, center = true) {
        const frames = [];
        const half_window = Math.floor((this.config.n_fft - 1) / 2) + 1;
        const waveformLength = waveform.length;

        for (let i = 0; i < waveformLength + 1; i += this.config.hop_length) {

            let frame;
            if (center) {

                let frameStart = i > half_window ? i - half_window : 0;
                let frameEnd =
                    i < waveformLength - half_window
                        ? i + half_window
                        : waveformLength;

                frame = waveform.subarray(frameStart, frameEnd)

                if (frameStart === 0) {
                    frame = this.padReflect(
                        frame,
                        -i + half_window,
                        0
                    )

                } else if (frameEnd === waveformLength) {
                    frame = this.padReflect(
                        frame,
                        0,
                        i - waveformLength + half_window
                    )
                }

            } else {
                frame = new Float32Array(this.config.n_fft);
                const frameArray = waveform.subarray(i, i + this.config.n_fft);

                if (frameArray.length < this.config.n_fft) {
                    frame.set(frameArray);
                    frame.fill(0, frameArray.length, this.config.n_fft)
                } else {
                    frame = frameArray;
                }

            }
            frames.push(frame);
        }

        return frames;
    }

    /**
     * Generates a Hanning window of length M.
     *
     * @param {number} M - The length of the Hanning window to generate.
     * @returns {*} - The generated Hanning window.
     */
    hanning(M) {
        if (M < 1) {
            return [];
        }
        if (M === 1) {
            return [1];
        }
        const denom = M - 1;
        const cos_vals = new Float32Array(denom);
        for (let i = 0; i < denom; ++i) {
            const n = 2 * i - M + 1;
            cos_vals[i] = 0.5 + 0.5 * Math.cos(Math.PI * n / denom);
        }
        return cos_vals;
    }

    /**
     * Computes the log-Mel spectrogram of the provided audio waveform.
     * @param {Float32Array} waveform - The audio waveform to process.
     * @returns {{data: Float32Array, dims: number[]}} An object containing the log-Mel spectrogram data as a Float32Array and its dimensions as an array of numbers.
     */
    _extract_fbank_features(waveform) {
        // Compute the log-Mel spectrogram of the provided audio

        const buffer = new Float32Array(this.config.n_samples);
        buffer.set(waveform)

        const window = this.hanning(this.config.n_fft + 1)
        const frames = this.fram_wave(buffer)

        const stft = this.stft(frames, window)

        const stftData = stft.data;
        const d1 = stft.dims[0] - 1; // Ignore last row
        const d2 = stft.dims[1] >> 1; // Only need to store real numbers now

        // compute magnitudes
        // NOTE: Unlinke the original implementation, we do not
        // transpose since we perform matrix multiplication later
        const magnitudes = new Float32Array(d1 * d2);
        for (let i = 0; i < d1; ++i) {
            for (let j = 0; j < d2; ++j) {
                // let outOffset = (j * d1 + i); // transpose
                let outOffset = i * d2 + j;
                let inOffset = outOffset << 1; // * 2 since complex
                let magnitude = stftData[inOffset] ** 2 + stftData[inOffset + 1] ** 2
                magnitudes[outOffset] = magnitude;
            }
        }

        const mel_filters = this.config.mel_filters
        const num_mel_filters = mel_filters.length;

        const mel_spec = new Float32Array(num_mel_filters * d1);
        let mIndex = 0;

        // Perform matrix muliplication:
        // mel_spec = filters @ magnitudes
        //  - filters.shape=(80, 201)
        //  - magnitudes.shape=(201, 3000)
        //  - mel_spec.shape=(80, 3000)
        for (let i = 0; i < num_mel_filters; ++i) {
            const mel_filter = mel_filters[i];

            for (let j = 0; j < d1; ++j) {
                let sum = 0;

                // perform dot product
                for (let k = 0; k < d2; ++k) {
                    sum += mel_filter[k] * magnitudes[j * d2 + k];
                }

                mel_spec[mIndex++] = sum;
            }
        }

        const a_min = 1e-10;
        const log_spec = new Float32Array(mel_spec.length);

        let maxLogSpec = 0;
        for (let i = 0; i < mel_spec.length; i++) {
            const clipped = Math.max(a_min, mel_spec[i]);
            const log10 = Math.log10(clipped);
            log_spec[i] = log10;
            maxLogSpec = Math.max(log10, maxLogSpec)
        }

        for (let i = 0; i < log_spec.length; i++) {
            log_spec[i] = Math.max(log_spec[i], maxLogSpec - 8);
            log_spec[i] = (log_spec[i] + 4) / 4;
        }

        return {
            data: log_spec,
            dims: [num_mel_filters, d1]
        };
    }

    /**
     * Asynchronously extracts features from a given audio using the provided configuration.
     * @param {Float32Array} audio - The audio data as a Float32Array.
     * @returns {Promise<{ input_features: Tensor }>} - A Promise resolving to an object containing the extracted input features as a Tensor.
     * @async
    */
    async _call(audio) {
        // audio is a float32array

        if (audio.length > this.config.n_samples) {
            console.warn(
                "Attempting to extract features for audio longer than 30 seconds. " +
                "If using a pipeline to extract transcript from a long audio clip, " +
                "remember to specify `chunk_length_s` and/or `stride_length_s`."
            );
        }
        let waveform = audio.slice(0, this.config.n_samples)

        let features = this._extract_fbank_features(waveform);

        return {
            input_features: new Tensor('float32',
                features.data,
                [1, ...features.dims]
            )
        };
    }
}

/**
 * Represents a Processor that extracts features from an input.
 * @extends Callable
 */
class Processor extends Callable {
    /**
     * Creates a new Processor with the given feature extractor.
     * @param {function} feature_extractor - The function used to extract features from the input.
     */
    constructor(feature_extractor) {
        super();
        this.feature_extractor = feature_extractor;
        // TODO use tokenizer here?
    }

    /**
     * Calls the feature_extractor function with the given input.
     * @param {any} input - The input to extract features from.
     * @returns {Promise<any>} A Promise that resolves with the extracted features.
     * @async
     */
    async _call(input) {
        return await this.feature_extractor(input);
    }
}

/**
 * Represents a WhisperProcessor that extracts features from an audio input.
 * @extends Processor
 */
class WhisperProcessor extends Processor {
    /**
     * Calls the feature_extractor function with the given audio input.
     * @param {any} audio - The audio input to extract features from.
     * @returns {Promise<any>} A Promise that resolves with the extracted features.
     * @async
     */
    async _call(audio) {
        return await this.feature_extractor(audio)
    }
}


module.exports = {
    AutoProcessor,
    Processor,
}


/***/ }),

/***/ "./src/samplers.js":
/*!*************************!*\
  !*** ./src/samplers.js ***!
  \*************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const {
    Callable,
    indexOfMax,
    softmax,
    log_softmax,
    getTopItems
} = __webpack_require__(/*! ./utils.js */ "./src/utils.js");

/**
 * Sampler is a base class for all sampling methods used for text generation.
 */
class Sampler extends Callable {
    /**
     * Creates a new Sampler object with the specified temperature.
     * @param {number} temperature - The temperature to use when sampling. Higher values result in more random samples.
     */
    constructor(temperature) {
        super();
        this.temperature = temperature;
    }

    /**
     * Executes the sampler, using the specified logits.
     * @param {any} logits
     * @param {number} index
     * @returns {void}
     */
    _call(logits, index = -1) {
        // Sample from logits, of dims [batch, sequence_length, vocab_size].
        // If index is specified, sample from [batch, index, vocab_size].
        return this.sample(logits, index);
    }

    /**
     * Abstract method for sampling the logits.
     * @param {any} logits
     * @param {number} index
     * @throws {Error}
     */
    sample(logits, index) {
        throw Error("sample should be implemented in subclasses.")
    }

    /**
     * Returns the specified logits as an array, with temperature applied.
     * @param {any} logits
     * @param {number} index
     * @returns {Array}
     */
    getLogits(logits, index) {
        let vocabSize = logits.dims[2];

        let logs = logits.data;

        if (index === -1) {
            logs = logs.slice(-vocabSize);
        } else {
            let startIndex = index * vocabSize;
            logs = logs.slice(startIndex, startIndex + vocabSize);
        }

        // add temperature
        if (this.temperature > 0) {
            logs = logs.map(x => x / this.temperature)
        }
        return logs;
    }

    /**
     * Selects an item randomly based on the specified probabilities.
     * @param {Array} probabilities - An array of probabilities to use for selection.
     * @returns {number} The index of the selected item.
     */
    randomSelect(probabilities) {
        // Return index of chosen item
        let sumProbabilities = probabilities.reduce((acc, curr) => acc + curr, 0);

        let r = Math.random() * sumProbabilities;
        for (let i = 0; i < probabilities.length; ++i) {
            r -= probabilities[i];
            if (r <= 0) {
                return i;
            }
        }
        return 0; // return first (most probable) as a fallback
    }

    /**
     * Returns a Sampler object based on the specified options.
     * @param {object} generation_config - An object containing options for the sampler.
     * @returns {Sampler} A Sampler object.
     */
    static getSampler(generation_config) {
        if (generation_config.num_beams > 1) {
            return new BeamSearchSampler(
                generation_config.temperature,
                generation_config.num_beams,
                generation_config.do_sample,
                generation_config.top_k,
            );

        } else if (generation_config.do_sample) {
            return new TopKSampler(
                generation_config.temperature,
                generation_config.top_k,
            );

        } else {
            if (generation_config.num_return_sequences > 1) {
                throw Error(`num_return_sequences has to be 1 when doing greedy search, but is ${generation_config.num_return_sequences}.`)
            }
            return new GreedySampler(generation_config.temperature);
        }
    }
}

/**
 * Class representing a Greedy Sampler.
 * @extends Sampler
 */
class GreedySampler extends Sampler {
    /**
     * Sample the maximum probability of a given logits tensor.
     * @param {any} logits
     * @param {number} [index=-1]
     * @returns {Array} - An array with a single tuple, containing the index of the maximum value and a meaningless score (since this is a greedy search).
     */
    sample(logits, index = -1) {
        // NOTE: no need to do log_softmax here since we only take the maximum
        let logs = this.getLogits(logits, index);
        let argmax = indexOfMax(logs);

        // Note: score is meaningless in this context, since we are performing
        // greedy search (p = 1 => log(p) = 0)
        return [
            [argmax, 0]
        ];
    }
}

/**
 * Class representing a TopKSampler.
 * @extends Sampler
 */
class TopKSampler extends Sampler {
    /**
     * Create a TopKSampler.
     * @param {number} temperature
     * @param {number} k
     */
    constructor(temperature, k) {
        super(temperature);
        this.k = k;
    }

    /**
     * Sample from the logits using the top-k sampling strategy.
     * @param {any} logits
     * @param {number} index
     * @returns {Array}
     */
    sample(logits, index = -1) {
        let [batchSize, seqLength, vocabSize] = logits.dims;
        let k = vocabSize;
        if (this.k > 0) {
            k = Math.min(this.k, k);
        }

        let logs = this.getLogits(logits, index);

        // Get top k tokens
        let topLogits = getTopItems(logs, k);

        // Compute softmax over logits
        let probabilities = softmax(topLogits.map(x => x[1]));

        let sampledIndex = this.randomSelect(probabilities);

        let tokenId = topLogits[sampledIndex][0];
        let score = Math.log(probabilities[sampledIndex]);
        return [
            [tokenId, score]
        ];
    }
}

/**
 * Class representing a beam search sampler for generating sequences.
 * @extends Sampler
 */
class BeamSearchSampler extends Sampler {
    /**
   * Create a BeamSearchSampler.
   * @param {number} temperature
   * @param {number} num_beams
   * @param {boolean} do_sample
   * @param {number} top_k
   */
    constructor(temperature, num_beams, do_sample, top_k) {
        super(temperature);
        this.num_beams = num_beams; // maximum number of beams
        this.do_sample = do_sample; // if true, perform multinomial sampling

        this.top_k = top_k; // if do_sample, sample from top k items
    }

    /**
   * Samples from the logits to generate a sequence using beam search.
   * @param {any} logits - The logits to sample from.
   * @param {number} [index=-1] - The index to sample from, if applicable.
   * @returns {Array} - An array of arrays containing tokens and scores.
   */
    sample(logits, index = -1) {

        let logs = this.getLogits(logits, index);

        if (this.do_sample || this.top_k > 0) {
            const [batchSize, seqLength, vocabSize] = logits.dims;

            let k = vocabSize;
            if (this.top_k > 0) {
                k = Math.min(this.top_k, k);
            }
            const topLogits = getTopItems(logs, k);

            // Compute softmax over top k logits
            const probabilities = softmax(topLogits.map(x => x[1]));

            return Array.from({ length: this.num_beams }, () => {
                const sampledIndex = this.randomSelect(probabilities);
                const tokenId = topLogits[sampledIndex][0];
                return [tokenId, Math.log(probabilities[sampledIndex])];
            });

        } else {
            // first perform log softmax to get scores over whole distribution
            const logProbabilities = log_softmax(logs);
            const topLogits = getTopItems(logProbabilities, this.num_beams);
            return topLogits;
        }
    }
}

module.exports = {
    Sampler,
    GreedySampler,
    TopKSampler,
    BeamSearchSampler
}


/***/ }),

/***/ "./src/tensor_utils.js":
/*!*****************************!*\
  !*** ./src/tensor_utils.js ***!
  \*****************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { ONNX } = __webpack_require__(/*! ./backends/onnx.js */ "./src/backends/onnx.js");

const { interpolate: interpolate_data, transpose: transpose_data } = __webpack_require__(/*! ./math_utils.js */ "./src/math_utils.js");


/**
 * @typedef {import('./math_utils.js').AnyTypedArray} AnyTypedArray
 */

const ONNXTensor = ONNX.Tensor;

// TODO: fix error below
class Tensor extends ONNXTensor {
    /**
     * Create a new Tensor or copy an existing Tensor.
     * @param  {[string, Array|AnyTypedArray, number[]]|[ONNXTensor]} args 
     */
    constructor(...args) {
        if (args[0] instanceof ONNX.Tensor) {
            // Create shallow copy
            super(args[0].type, args[0].data, args[0].dims);

        } else {
            // Create new
            super(...args)
        }
    }

    /**
     * Returns an iterator object for iterating over the tensor data in row-major order.
     * If the tensor has more than one dimension, the iterator will yield subarrays.
     * @returns {Iterator} An iterator object for iterating over the tensor data in row-major order.
     */
    *[Symbol.iterator]() {
        const [iterLength, ...iterDims] = this.dims;

        if (iterDims.length > 0) {
            const iterSize = iterDims.reduce((a, b) => a * b);
            for (let i = 0; i < iterLength; ++i) {
                yield this._subarray(i, iterSize, iterDims);
            }
        } else {
            yield* this.data
        }

    }

    /**
     * 
     * @param {number} index 
     * @returns {Tensor}
     * @todo Set type based on dims
     */
    get(index) {
        const iterDims = this.dims.slice(1);
        if (iterDims.length > 0) {
            const iterSize = iterDims.reduce((a, b) => a * b);
            return this._subarray(index, iterSize, iterDims);
        } else {
            return this.data[index];
        }
    }

    /**
     * @param {any} item 
     * @returns {number}
     */
    indexOf(item) {
        for (let index = 0; index < this.data.length; ++index) {
            // Note: == instead of === so we can match Ints with BigInts
            if (this.data[index] == item) {
                return index;
            }
        }
        return -1;
    }

    /**
     * @param {number} index 
     * @param {number} iterSize 
     * @param {any} iterDims 
     * @returns {Tensor}
     */
    _subarray(index, iterSize, iterDims) {
        let data = this.data.subarray(index * iterSize, (index + 1) * iterSize);
        return new Tensor(this.type, data, iterDims);
    }

    tolist() {
        // Convert tensor data to a n-dimensional JS list
        return reshape(this.data, this.dims)
    }

    /**
     * Return a new Tensor the sigmoid function applied to each element.
     * @returns {Tensor} - The tensor with the sigmoid function applied.
     */
    sigmoid() {
        return this.clone().sigmoid_();
    }

    /**
     * Applies the sigmoid function to the tensor in place.
     * @returns {Tensor} - Returns `this`.
     */
    sigmoid_() {
        for (let i = 0; i < this.data.length; ++i) {
            this.data[i] = 1 / (1 + Math.exp(-this.data[i]));
        }
        return this;
    }

    clone() {
        return new Tensor(this.type, this.data.slice(), this.dims.slice());
    }

    // TODO add .slice()

    /**
     * Return a transposed version of this Tensor, according to the provided dimensions.
     * @param  {...number} dims - Dimensions to transpose.
     * @returns {Tensor} - The transposed tensor.
     */
    transpose(...dims) {
        return transpose(this, dims);
    }
}

/**
 * This creates a nested array of a given type and depth (see examples).
 * 
 * @example
 *   NestArray<string, 1>; // string[]
 * @example
 *   NestArray<number, 2>; // number[][]
 * @example
 *   NestArray<string, 3>; // string[][][] etc.
 * @template T
 * @template {number} Depth
 * @template {never[]} [Acc=[]]
 * @typedef {Acc['length'] extends Depth ? T : NestArray<T[], Depth, [...Acc, never]>} NestArray
 */

/**
 * Reshapes a 1-dimensional array into an n-dimensional array, according to the provided dimensions.
 *
 * @example
 *   reshape([10                    ], [1      ]); // Type: number[]      Value: [10]
 *   reshape([1, 2, 3, 4            ], [2, 2   ]); // Type: number[][]    Value: [[1, 2], [3, 4]]
 *   reshape([1, 2, 3, 4, 5, 6, 7, 8], [2, 2, 2]); // Type: number[][][]  Value: [[[1, 2], [3, 4]], [[5, 6], [7, 8]]]
 *   reshape([1, 2, 3, 4, 5, 6, 7, 8], [4, 2   ]); // Type: number[][]    Value: [[1, 2], [3, 4], [5, 6], [7, 8]]
 * @param {T[]} data - The input array to reshape.
 * @param {DIM} dimensions - The target shape/dimensions.
 * @template T
 * @template {[number]|[number, number]|[number, number, number]|[number, number, number, number]} DIM
 * @returns {NestArray<T, DIM["length"]>} The reshaped array.
 */
function reshape(data, dimensions) {

    const totalElements = data.length;
    const dimensionSize = dimensions.reduce((a, b) => a * b);

    if (totalElements !== dimensionSize) {
        throw Error(`cannot reshape array of size ${totalElements} into shape (${dimensions})`);
    }

    /** @type {any} */
    let reshapedArray = data;

    for (let i = dimensions.length - 1; i >= 0; i--) {
        reshapedArray = reshapedArray.reduce((acc, val) => {
            let lastArray = acc[acc.length - 1];

            if (lastArray.length < dimensions[i]) {
                lastArray.push(val);
            } else {
                acc.push([val]);
            }

            return acc;
        }, [[]]);
    }

    return reshapedArray[0];
}

/**
 * Transposes a tensor according to the provided axes.
 * @param {any} tensor - The input tensor to transpose.
 * @param {Array} axes - The axes to transpose the tensor along.
 * @returns {Tensor} The transposed tensor.
 */
function transpose(tensor, axes) {
    const [transposedData, shape] = transpose_data(tensor.data, tensor.dims, axes);
    return new Tensor(tensor.type, transposedData, shape);
}


/**
 * Concatenates an array of tensors along the 0th dimension.
 *
 * @param {any} tensors - The array of tensors to concatenate.
 * @returns {Tensor} - The concatenated tensor.
 */
function cat(tensors) {
    if (tensors.length === 0) {
        return tensors[0];
    }
    // NOTE: tensors must be batched
    // NOTE: currently only supports dim=0
    // TODO: add support for dim != 0


    let tensorType = tensors[0].type;
    let tensorShape = [...tensors[0].dims];
    tensorShape[0] = tensors.length;

    // Calculate total size to allocate
    let total = 0;
    for (let t of tensors) {
        total += t.data.length;
    }

    // Create output tensor of same type as first
    let data = new tensors[0].data.constructor(total);

    let offset = 0;
    for (let t of tensors) {
        data.set(t.data, offset);
        offset += t.data.length;
    }

    return new Tensor(tensorType, data, tensorShape)
}

/**
 * Interpolates an Tensor to the given size.
 * @param {Tensor} input - The input tensor to interpolate. Data must be channel-first (i.e., [c, h, w])
 * @param {number[]} size - The output size of the image
 * @param {string} mode - The interpolation mode
 * @param {boolean} align_corners - Whether to align corners.
 * @returns {Tensor} - The interpolated tensor.
 */
function interpolate(input, [out_height, out_width], mode = 'bilinear', align_corners = false) {

    // Input image dimensions
    const in_channels = input.dims.at(-3) ?? 1;
    const in_height = input.dims.at(-2);
    const in_width = input.dims.at(-1);

    let output = interpolate_data(
        input.data,
        [in_channels, in_height, in_width],
        [out_height, out_width],
        mode,
        align_corners
    );
    return new Tensor(input.type, output, [in_channels, out_height, out_width]);
}

module.exports = {
    Tensor,
    transpose,
    cat,
    interpolate,
    transpose_data,
}


/***/ }),

/***/ "./src/tokenizers.js":
/*!***************************!*\
  !*** ./src/tokenizers.js ***!
  \***************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const {
    Callable,
    fetchJSON,
    reverseDictionary,
    escapeRegExp,
    isIntegralNumber,
    min,
} = __webpack_require__(/*! ./utils.js */ "./src/utils.js");

const { Tensor } = __webpack_require__(/*! ./tensor_utils.js */ "./src/tensor_utils.js")

/**
 * Abstract base class for tokenizer models.
 *
 * @extends Callable
 */
class TokenizerModel extends Callable {
    /**
     * Creates a new instance of TokenizerModel.
     * @param {object} config - The configuration object for the TokenizerModel.
     */
    constructor(config) {
        super();
        this.config = config;
    }
    /**
     * Instantiates a new TokenizerModel instance based on the configuration object provided.
     * @param {object} config - The configuration object for the TokenizerModel.
     * @param {...*} args - Optional arguments to pass to the specific TokenizerModel constructor.
     * @returns {TokenizerModel} A new instance of a TokenizerModel.
     * @throws Will throw an error if the TokenizerModel type in the config is not recognized.
     */
    static fromConfig(config, ...args) {
        switch (config.type) {
            case 'WordPiece':
                return new WordPieceTokenizer(config);
            case 'Unigram':
                // TODO: fix error below
                return new Unigram(config, ...args);

            case 'BPE':
                // TODO: fix error below
                return new BPE(config, ...args);
            default:
                throw new Error(`Unknown TokenizerModel type: ${config.type}`);
        }
    }

    /**
     * Internal function to call the TokenizerModel instance.
     * @param {string[]} tokens - The tokens to encode.
     * @returns {number[]} The encoded token IDs.
     */
    _call(tokens) {
        return this.encode(tokens);
    }

    /**
     * Encodes a list of tokens into a list of token IDs.
     * @param {string[]} tokens - The tokens to encode.
     * @returns {number[]} The encoded token IDs.
     * @throws Will throw an error if not implemented in a subclass.
     */
    encode(tokens) {
        throw Error("encode should be implemented in subclass.")
    }

    /**
     * Converts a list of tokens into a list of token IDs.
     * @param {string[]} tokens - The tokens to convert.
     * @returns {number[]} The converted token IDs.
     */
    convert_tokens_to_ids(tokens) {
        return tokens.map(t => this.tokens_to_ids[t] ?? this.unk_token_id);
    }

    /**
     * Converts a list of token IDs into a list of tokens.
     * @param {number[]} ids - The token IDs to convert.
     * @returns {string[]} The converted tokens.
     */
    convert_ids_to_tokens(ids) {
        return ids.map(i => this.vocab[i] ?? this.unk_token);
    }
}

/**
 * A subclass of TokenizerModel that uses WordPiece encoding to encode tokens.
 * @extends TokenizerModel
 */
class WordPieceTokenizer extends TokenizerModel {
    /**
     * @param {Object} config - The configuration object.
     * @param {Object.<string, number>} config.vocab - A mapping of tokens to ids.
     * @param {string} config.unk_token - The unknown token string.
     * @param {string} config.continuing_subword_prefix - The prefix to use for continuing subwords.
     */
    constructor(config) {
        super(config);
        /**
         * A mapping of tokens to ids.
         * @type {Object.<string, number>}
         */
        this.tokens_to_ids = config.vocab;

        /**
         * The id of the unknown token.
         * @type {number}
         */
        this.unk_token_id = this.tokens_to_ids[config.unk_token];

        /**
         * The unknown token string.
         * @type {string}
         */
        this.unk_token = config.unk_token;

        let e = Object.entries(this.tokens_to_ids);

        /**
         * An array of tokens.
         * @type {string[]}
         */
        this.vocab = Array(e.length);

        for (const [key, value] of e) {
            this.vocab[value] = key;
        }
    }

    /**
     * Encodes an array of tokens using WordPiece encoding.
     * @param {Array} tokens - The tokens to encode.
     * @returns {Array} An array of encoded tokens.
     */
    encode(tokens) {
        let outputTokens = [];
        for (let token of tokens) {
            let chars = [...token];
            // TODO add
            // if len(chars) > self.max_input_chars_per_word:
            //     output_tokens.append(self.unk_token)
            //     continue

            let isUnknown = false;
            let start = 0;
            let subTokens = [];

            while (start < chars.length) {
                let end = chars.length;
                let currentSubstring = null;
                while (start < end) {
                    let substr = chars.slice(start, end).join('');

                    if (start > 0) {
                        substr = this.config.continuing_subword_prefix + substr;
                    }
                    if (this.vocab.includes(substr)) {
                        currentSubstring = substr;
                        break;
                    }

                    --end;
                }
                if (currentSubstring == null) {
                    isUnknown = true;
                    break;
                }
                subTokens.push(currentSubstring);
                start = end;
            }
            if (isUnknown) {
                outputTokens.push(this.unk_token);
            } else {
                outputTokens.push(...subTokens);
            }
        }

        return outputTokens;
    }

}

/**
 * Class representing a Unigram tokenizer model.
 * @extends TokenizerModel
 */
class Unigram extends TokenizerModel {
    /**
     * Create a new Unigram tokenizer model.
     * @param {object} config - The configuration object for the Unigram model.
     * @param {object} moreConfig - Additional configuration object for the Unigram model.
     */
    constructor(config, moreConfig) {
        super(config);

        this.vocab = config.vocab.map(x => x[0]);
        this.scores = config.vocab.map(x => x[1]);

        this.unk_token_id = config.unk_id;
        this.unk_token = this.vocab[config.unk_id];

        this.tokens_to_ids = Object.fromEntries(this.vocab.map((x, i) => [x, i]));
        this.bosToken = ' '; // beginning of a sentence token

        this.bosTokenId = this.tokens_to_ids[this.bosToken];
        this.eosToken = moreConfig.eos_token;

        this.eosTokenId = this.tokens_to_ids[this.eosToken];
        this.unkToken = this.vocab[this.unk_token_id];

        this.minScore = min(this.scores);

        this.unkScore = this.minScore - 10.0;
        this.scores[this.unk_token_id] = this.unkScore;

        this.trie = new CharTrie();
        this.trie.extend(this.vocab)
    }

    /**
     * Populates lattice nodes.
     * @param {TokenLattice} lattice - The token lattice to populate with nodes.
     */
    populateNodes(lattice) {
        const sentence = lattice.sentence;
        const len = sentence.length;
        let beginPos = 0;
        while (beginPos < len) {
            const mblen = 1;
            let hasSingleNode = false;
            const tokens = [];
            // TODO: fix error below
            for (let token of this.trie.commonPrefixSearch(sentence.slice(beginPos))) {
                tokens.push(token);
                const tokenId = this.tokens_to_ids[token];
                const tokenScore = this.scores[tokenId];
                const n = token.length;
                lattice.insert(beginPos, n, tokenScore, tokenId);
                if (!hasSingleNode && n == mblen) {
                    hasSingleNode = true;
                }
            }
            if (!hasSingleNode) {
                lattice.insert(beginPos, mblen, this.unkScore, this.unk_token_id);
            }
            beginPos += mblen;
        }
    }

    /**
     * Encodes an array of tokens into an array of subtokens using the unigram model.
     *
     * @param {string} normalized - The normalized string.
     * @returns {string[]} An array of subtokens obtained by encoding the input tokens using the unigram model.
     */
    tokenize(normalized) {
        const lattice = new TokenLattice(normalized, this.bosTokenId, this.eosTokenId);
        this.populateNodes(lattice);
        return lattice.tokens();
    }

    /**
     * Encodes an array of tokens using WordPiece encoding.
     * @param {Array} tokens - The tokens to encode.
     * @returns {Array} An array of encoded tokens.
     */
    encode(tokens) {
        let toReturn = [];
        for (let token of tokens) {
            const tokenized = this.tokenize(token);
            toReturn.push(...tokenized);
        }
        return toReturn;
    }

}

/**
 * Returns list of utf-8 byte and a mapping to unicode strings.
 * Specifically avoids mapping to whitespace/control characters the BPE code barfs on.
 * @returns {Object} Object with utf-8 byte keys and unicode string values.
 */
const BYTES_TO_UNICODE = (() => {
    // Returns list of utf-8 byte and a mapping to unicode strings.
    // We specifically avoids mapping to whitespace/control characters
    // the bpe code barfs on.

    const bs = [
        ...Array.from({ length: "~".charCodeAt(0) - "!".charCodeAt(0) + 1 }, (_, i) => i + "!".charCodeAt(0)),
        ...Array.from({ length: "¬".charCodeAt(0) - "¡".charCodeAt(0) + 1 }, (_, i) => i + "¡".charCodeAt(0)),
        ...Array.from({ length: "ÿ".charCodeAt(0) - "®".charCodeAt(0) + 1 }, (_, i) => i + "®".charCodeAt(0)),
    ];
    let cs = bs.slice();
    let n = 0;
    for (let b = 0; b < 256; b++) {
        if (!bs.includes(b)) {
            bs.push(b);
            cs.push(256 + n);
            n += 1;
        }
    }
    let ccs = cs.map(n => String.fromCharCode(n));
    return Object.fromEntries(bs.map((b, i) => [b, ccs[i]]));
})();

const UNICODE_TO_BYTES = reverseDictionary(BYTES_TO_UNICODE);

/**
 * BPE class for encoding text into Byte-Pair-Encoding (BPE) tokens.
 * @extends TokenizerModel
 */
class BPE extends TokenizerModel {
    /**
     * Create a BPE instance.
     * @param {Object} config - The configuration object for BPE.
     * @param {Object} config.vocab - A dictionary containing the vocabulary with tokens as keys and their corresponding indices as values.
     * @param {string} config.unk_token - The unknown token used for out of vocabulary words.
     * @param {Array} config.merges - An array of BPE merges as strings.
     */
    constructor(config) {
        super(config);

        this.tokens_to_ids = config.vocab;

        this.unk_token_id = this.tokens_to_ids[config.unk_token];
        this.unk_token = config.unk_token;

        let e = Object.entries(this.tokens_to_ids);
        this.vocab = Array(e.length);

        for (const [key, value] of e) {
            this.vocab[value] = key;
        }

        this.bpe_ranks = Object.fromEntries(config.merges.map((x, i) => [x, i]));
        this.merges = config.merges.map(x => x.split(/\s+/))

        this.end_of_word_suffix = config.end_of_word_suffix;

        this.byte_encoder = BYTES_TO_UNICODE;
        this.text_encoder = new TextEncoder();

        this.cache = {}
    }

    /**
     * Get all the possible pairs of characters in a word.
     * @param {string[]} word - The word to get pairs from.
     * @returns {Array} - An array of pairs.
     */
    get_pairs(word) {
        let pairs = new Set();
        let prev_char = word[0];
        for (let i = 1; i < word.length; i++) {
            let char = word[i];
            pairs.add(`${prev_char} ${char}`);
            prev_char = char;
        }
        // TODO: fix error below
        return [...pairs];
    }

    /**
     * Apply Byte-Pair-Encoding (BPE) to a given token.
     * @param {string} token - The token to encode.
     * @returns {string} - The BPE encoded token.
     */
    bpe(token) {
        if (token in this.cache) {
            return this.cache[token];
        }
        let word = Array.from(token);
        if (this.end_of_word_suffix) {
            word[word.length - 1] += this.end_of_word_suffix;
        }
        let pairs = this.get_pairs(word);

        if (!pairs.length) {
            if (this.end_of_word_suffix) {
                token += this.end_of_word_suffix;
            }
            return token;
        }

        while (true) {
            let bigram = pairs.reduce((a, b) => {
                let c = this.bpe_ranks[a] ?? Infinity
                let d = this.bpe_ranks[b] ?? Infinity
                return c <= d ? a : b;
            });
            if (!(bigram in this.bpe_ranks)) {
                break;
            }
            let [first, second] = bigram.split(/\s+/g)
            let new_word = [];
            let i = 0;
            let j = -1;

            while (i < word.length) {
                try {
                    j = word.indexOf(first, i);
                    if (j === -1) throw "Error";
                } catch (e) {
                    new_word.push(...word.slice(i));
                    break;
                }
                new_word.push(...word.slice(i, j));
                i = j;

                if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
                    new_word.push(first + second);
                    i += 2;
                } else {
                    new_word.push(word[i]);
                    i += 1;
                }
            }
            word = new_word
            if (word.length === 1) {
                break;
            } else {
                pairs = this.get_pairs(word);
            }
        }
        let final_word = word.join(" ");
        this.cache[token] = final_word;
        return final_word;
    }

    /**
     * Encodes the input sequence of tokens using the BPE algorithm and returns the resulting subword tokens.
     * @param {Array} tokens - The input sequence of tokens to encode.
     * @returns {Array} - The resulting subword tokens after applying the BPE algorithm to the input sequence of tokens.
     */
    encode(tokens) {
        let outputTokens = [];

        for (let token of tokens) {
            token = Array.from(this.text_encoder.encode(token), byte => this.byte_encoder[byte]).join('');
            let bpe_token_list = this.bpe(token).split(' ');
            outputTokens.push(...bpe_token_list);
        }

        return outputTokens;
    }

}

/**
 * A base class for text normalization.
 * @abstract
 */
class Normalizer extends Callable {
    /**
     * @param {object} config - The configuration object for the normalizer.
     */
    constructor(config) {
        super();
        this.config = config;
    }

    /**
     * Factory method for creating normalizers from config objects.
     * @static
     * @param {object} config - The configuration object for the normalizer.
     * @returns {Normalizer} - A Normalizer object.
     * @throws {Error} - If an unknown Normalizer type is specified in the config.
     */
    static fromConfig(config) {
        if (config === null) return null;
        switch (config.type) {
            case 'BertNormalizer':
                return new BertNormalizer(config);
            case 'Precompiled':
                return new Precompiled(config);
            case 'Sequence':
                return new NormalizerSequence(config);
            case 'Replace':
                return new Replace(config);
            case 'NFC':
                return new NFC(config);
            case 'NFKD':
                return new NFKD(config);
            case 'StripAccents':
                return new StripAccents(config);
            case 'Lowercase':
                return new Lowercase(config);
            default:
                throw new Error(`Unknown Normalizer type: ${config.type}`);
        }
    }

    /**
     * Normalize the input text.
     * @abstract
     * @param {string} text - The text to normalize.
     * @returns {string} - The normalized text.
     * @throws {Error} - If this method is not implemented in a subclass.
     */
    normalize(text) {
        throw Error("normalize should be implemented in subclass.")
    }

    /**
     * Alias for {@link Normalizer#normalize}.
     * @param {string} text - The text to normalize.
     * @returns {string} - The normalized text.
     */
    _call(text) {
        return this.normalize(text);
    }

}

/**
 * Replace normalizer that replaces occurrences of a pattern with a given string or regular expression.
 * @extends Normalizer
 */
class Replace extends Normalizer {
    /**
     * Normalize the input text by replacing the pattern with the content.
     * @param {string} text - The input text to be normalized.
     * @returns {string} The normalized text after replacing the pattern with the content.
     */
    normalize(text) {
        if (this.config.pattern.Regex) {
            text = text.replace(new RegExp(this.config.pattern.Regex, 'g'), this.config.content)

        } else if (this.config.pattern.String) {
            text = text.replace(this.config.pattern.String, this.config.content)

        } else {
            console.warn('Unknown pattern type:', this.config.pattern)
        }

        return text;
    }
}

/**
 * A normalizer that applies Unicode normalization form C (NFC) to the input text.
 * @extends Normalizer
 */
class NFC extends Normalizer {
    /**
     * Normalize the input text by applying Unicode normalization form C (NFC).
     * @param {string} text - The input text to be normalized.
     * @returns {string} The normalized text.
     */
    normalize(text) {
        text = text.normalize('NFC')
        return text;
    }
}

/**
 * NFKD Normalizer.
 * @extends Normalizer
 */
class NFKD extends Normalizer {
    /**
     * Normalize text using NFKD normalization.
     * @param {string} text - The text to be normalized.
     * @returns {string} The normalized text.
     */
    normalize(text) {
        text = text.normalize('NFKD')
        return text;
    }
}

/**
 * StripAccents normalizer removes all accents from the text.
 * @extends Normalizer
 */
class StripAccents extends Normalizer {
    /**
     * Remove all accents from the text.
     * @param {string} text - The input text.
     * @returns {string} The normalized text without accents.
     */
    normalize(text) {
        text = text.replace(/[\u0300-\u036f]/g, '');
        return text;
    }
}

/**
 * A Normalizer that lowercases the input string.
 * @extends Normalizer
 */
class Lowercase extends Normalizer {
    /**
     * Lowercases the input string.
     * @param {string} text - The text to normalize.
     * @returns {string} The normalized text.
     */
    normalize(text) {
        text = text.toLowerCase();
        return text;
    }
}

/**
 * A Normalizer that applies a sequence of Normalizers.
 * @extends Normalizer
 */
class NormalizerSequence extends Normalizer {
    /**
   * Create a new instance of NormalizerSequence.
   * @param {object} config - The configuration object.
   * @param {object[]} config.normalizers - An array of Normalizer configuration objects.
   */
    constructor(config) {
        super(config);
        this.normalizers = config.normalizers.map(x => Normalizer.fromConfig(x));
    }
    /**
   * Apply a sequence of Normalizers to the input text.
   * @param {string} text - The text to normalize.
   * @returns {string} The normalized text.
   */
    normalize(text) {
        // TODO use reduce?
        for (let normalizer of this.normalizers) {
            text = normalizer.normalize(text);
        }
        return text;
    }
}

/**
 * A class representing a normalizer used in BERT tokenization.
 * @extends Normalizer
 */
class BertNormalizer extends Normalizer {
    /**
     * Adds whitespace around any CJK (Chinese, Japanese, or Korean) character in the input text.
     *
     * @param {string} text - The input text to tokenize.
     * @returns {string} - The tokenized text with whitespace added around CJK characters.
     */
    _tokenize_chinese_chars(text) {
        /* Adds whitespace around any CJK character. */
        let output = [];
        for (let i = 0; i < text.length; ++i) {
            let char = text[i];
            let cp = char.charCodeAt(0);
            if (this._is_chinese_char(cp)) {
                output.push(" ");
                output.push(char);
                output.push(" ");
            } else {
                output.push(char);
            }
        }
        return output.join("");
    }

    /**
     * Checks whether the given Unicode codepoint represents a CJK (Chinese, Japanese, or Korean) character.
     *
     * A "chinese character" is defined as anything in the CJK Unicode block:
     * https://en.wikipedia.org/wiki/CJK_Unified_Ideographs_(Unicode_block)
     *
     * Note that the CJK Unicode block is NOT all Japanese and Korean characters, despite its name.
     * The modern Korean Hangul alphabet is a different block, as is Japanese Hiragana and Katakana.
     * Those alphabets are used to write space-separated words, so they are not treated specially
     * and are handled like all other languages.
     *
     * @param {number} cp - The Unicode codepoint to check.
     * @returns {boolean} - True if the codepoint represents a CJK character, false otherwise.
     */
    _is_chinese_char(cp) {
        return (
            (cp >= 0x4E00 && cp <= 0x9FFF)
            || (cp >= 0x3400 && cp <= 0x4DBF)
            || (cp >= 0x20000 && cp <= 0x2A6DF)
            || (cp >= 0x2A700 && cp <= 0x2B73F)
            || (cp >= 0x2B740 && cp <= 0x2B81F)
            || (cp >= 0x2B820 && cp <= 0x2CEAF)
            || (cp >= 0xF900 && cp <= 0xFAFF)
            || (cp >= 0x2F800 && cp <= 0x2FA1F)
        )
    }
    /**
     * Strips accents from the given text.
     * @param {string} text - The text to strip accents from.
     * @returns {string} - The text with accents removed.
     */
    stripAccents(text) {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    /**
     * Normalizes the given text based on the configuration.
     * @param {string} text - The text to normalize.
     * @returns {string} - The normalized text.
     */
    normalize(text) {
        // TODO use rest of config
        // config.clean_text,
        // config.handle_chinese_chars,
        // config.strip_accents,
        // config.lowercase,

        if (this.config.handle_chinese_chars) {
            text = this._tokenize_chinese_chars(text);
        }

        if (this.config.lowercase) {
            text = text.toLowerCase();

            if (this.config.strip_accents !== false) {
                text = this.stripAccents(text);
            }
        } else if (this.config.strip_accents) {
            text = this.stripAccents(text);
        }

        return text;
    }
}

/**
 * A callable class representing a pre-tokenizer used in tokenization. Subclasses
 * should implement the `pre_tokenize_text` method to define the specific pre-tokenization logic.
 * @extends Callable
 */
class PreTokenizer extends Callable {
    /**
   * Factory method that returns an instance of a subclass of `PreTokenizer` based on the provided configuration.
   *
   * @static
   * @param {Object} config - A configuration object for the pre-tokenizer.
   * @returns {PreTokenizer} An instance of a subclass of `PreTokenizer`.
   * @throws {Error} If the provided configuration object does not correspond to any known pre-tokenizer.
   */
    static fromConfig(config) {
        switch (config.type) {
            case 'BertPreTokenizer':
                return new BertPreTokenizer(config);
            case 'Sequence':
                return new PreTokenizerSequence(config);
            case 'WhitespaceSplit':
                return new WhitespaceSplit(config);
            case 'Metaspace':
                return new MetaspacePreTokenizer(config);

            case 'ByteLevel':
                return new ByteLevelPreTokenizer(config);
            case 'Split':
                return new SplitPreTokenizer(config);

            default:
                throw new Error(`Unknown PreTokenizer type: ${config.type}`);
        }
    }

    /**
   * Method that should be implemented by subclasses to define the specific pre-tokenization logic.
   *
   * @abstract
   * @param {string} text - The text to pre-tokenize.
   * @returns {string[]} The pre-tokenized text.
   * @throws {Error} If the method is not implemented in the subclass.
   */
    pre_tokenize_text(text) {
        throw Error("pre_tokenize_text should be implemented in subclass.")
    }

    /**
     * Tokenizes the given text into pre-tokens.
     * @param {string|string[]} text - The text or array of texts to pre-tokenize.
     * @returns {string[]} An array of pre-tokens.
     */
    pre_tokenize(text) {
        let result = [];
        if (Array.isArray(text)) {
            result = text.map(x => this.pre_tokenize_text(x))
        } else {
            result = this.pre_tokenize_text(text);
        }
        return result.flat();
    }

    /**
     * Alias for {@link PreTokenizer#pre_tokenize}.
     * @param {string|string[]} text - The text or array of texts to pre-tokenize.
     * @returns {string[]} An array of pre-tokens.
     */
    _call(text) {
        return this.pre_tokenize(text);
    }
}

/**
 * @extends PreTokenizer
 */
class BertPreTokenizer extends PreTokenizer {
    /**
     * A PreTokenizer that splits text into wordpieces using a basic tokenization scheme
     * similar to that used in the original implementation of BERT.
     * 
     * @param {object} config - The configuration object.
     */
    constructor(config) {
        super();
        // TODO use config
        this.pattern = /\b\p{L}+\b|[^\s\p{L}]+/gu
    }
    /**
     * Tokenizes a single text using the BERT pre-tokenization scheme.
     * 
     * @param {string} text - The text to tokenize.
     * @returns {Array.<string>} - An array of tokens.
     */
    pre_tokenize_text(text) {
        // Split on whitespace and punctuation
        return text.trim().match(this.pattern) || [];
    }
}

/**
 * A pre-tokenizer that splits text into Byte-Pair-Encoding (BPE) subwords.
 * @extends PreTokenizer
 */
class ByteLevelPreTokenizer extends PreTokenizer {
    /**
     * Creates a new instance of the `ByteLevelPreTokenizer` class.
     * @param {Object} config - The configuration object.
     */
    constructor(config) {
        super();
        // TODO use config
        this.pattern = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
    }

    /**
     * Tokenizes a single piece of text using byte-level tokenization.
     * @param {string} text - The text to tokenize.
     * @returns {string[]} - An array of tokens.
     */
    pre_tokenize_text(text) {
        // Split on whitespace and punctuation
        return text.match(this.pattern) || [];
    }
}

/**
 * Splits text using a given pattern.
 * @extends PreTokenizer
 */
class SplitPreTokenizer extends PreTokenizer {
    /**
     * @param {Object} config - The configuration options for the pre-tokenizer.
     * @param {Object} config.pattern - The pattern used to split the text. Can be a string or a regex object.
     */
    constructor(config) {
        super();
        this.config = config;
    }

    /**
     * Tokenizes text by splitting it using the given pattern.
     * @param {string} text - The text to tokenize.
     * @returns {string[]} An array of tokens.
     */
    pre_tokenize_text(text) {
        if (this.config.pattern.Regex) {
            return text.match(new RegExp(this.config.pattern.Regex, 'gu')) || [];

        } else if (this.config.pattern.String) {
            return text.match(this.config.pattern.String) || [];

        } else {
            console.warn('Unknown pattern type:', this.config.pattern)
        }

        return [];
    }

}

/**
 * @extends Callable
 */
class PostProcessor extends Callable {

    /**
     * Factory method to create a PostProcessor object from a configuration object.
     *
     * @param {Object} config - Configuration object representing a PostProcessor.
     * @returns {PostProcessor} A PostProcessor object created from the given configuration.
     * @throws {Error} If an unknown PostProcessor type is encountered.
     */
    static fromConfig(config) {
        switch (config.type) {
            case 'TemplateProcessing':
                return new TemplateProcessing(config);

            case 'ByteLevel':
                return new ByteLevelPostProcessor(config);

            case 'RobertaProcessing':
                return new RobertaProcessing(config);

            default:
                throw new Error(`Unknown PostProcessor type: ${config.type}`);
        }
    }

    /**
     * Method to be implemented in subclass to apply post-processing on the given tokens.
     *
     * @param {Array} tokens - The input tokens to be post-processed.
     * @param {...*} args - Additional arguments required by the post-processing logic.
     * @returns {Array} The post-processed tokens.
     * @throws {Error} If the method is not implemented in subclass.
     */
    post_process(tokens, ...args) {
        throw Error("post_process should be implemented in subclass.")
    }

    /**
     * Alias for {@link PostProcessor#post_process}.
     * @param {Array} tokens - The text or array of texts to post-process.
     * @param {...*} args - Additional arguments required by the post-processing logic.
     * @returns {Array} An array of post-processed tokens.
     */
    _call(tokens, ...args) {
        return this.post_process(tokens, ...args);
    }
}

/**
 * A post-processor that adds special tokens to the beginning and end of the input.
 * @extends PostProcessor
 */
class RobertaProcessing extends PostProcessor {
    /**
     * @param {Object} config - The configuration for the post-processor.
     * @param {string[]} config.cls - The special tokens to add to the beginning of the input.
     * @param {string[]} config.sep - The special tokens to add to the end of the input.
     */
    constructor(config) {
        super();
        this.config = config;

        // TODO use all of config:
        // add_prefix_space, cls, sep, trim_offsets

    }

    /**
     * Adds the special tokens to the beginning and end of the input.
     * @param {string[]} tokens - The input tokens.
     * @param {string[]|null} tokens_pair - An optional second set of input tokens.
     * @returns {string[]} The input tokens with the special tokens added to the beginning and end.
     */
    post_process(tokens, tokens_pair = null) {
        tokens = [this.config.cls[0], ...tokens, this.config.sep[0]]

        // NOTE: It is intended to add 2 EOS tokens after the first set of tokens
        // https://github.com/huggingface/tokenizers/issues/983
        if (tokens_pair !== null) {
            tokens = [...tokens, this.config.sep[0], ...tokens_pair, this.config.sep[0]]
        }
        return tokens;
    }
}

/**
 * Post processor that replaces special tokens in a template with actual tokens.
 * @extends PostProcessor
 */
class TemplateProcessing extends PostProcessor {
    /**
     * Creates a new instance of `TemplateProcessing`.
     * @param {Object} config - The configuration options for the post processor.
     * @param {Array} config.single - The template for a single sequence of tokens.
     * @param {Array} config.pair - The template for a pair of sequences of tokens.
     */
    constructor(config) {
        super();
        this.config = config;
    }

    /**
     * Replaces special tokens in the template with actual tokens.
     * @param {Array} tokens - The list of tokens for the first sequence.
     * @param {Array} [tokens_pair=null] - The list of tokens for the second sequence (optional).
     * @returns {Array} - The list of tokens with the special tokens replaced with actual tokens.
     */
    post_process(tokens, tokens_pair = null) {
        let type = tokens_pair === null ? this.config.single : this.config.pair

        let toReturn = [];
        for (let item of type) {
            if ('SpecialToken' in item) {
                toReturn.push(item.SpecialToken.id);

            } else if ('Sequence' in item) {
                if (item.Sequence.id === 'A') {
                    toReturn.push(...tokens);

                } else if (item.Sequence.id === 'B') {
                    toReturn.push(...tokens_pair);
                }
            }
        }
        return toReturn;
    }
}

/**
 * A PostProcessor that returns the given tokens as is.
 * @extends PostProcessor
 */
class ByteLevelPostProcessor extends PostProcessor {
    /**
     * Create a new instance of ByteLevelPostProcessor.
     * @param {object} config - Configuration object.
     */
    constructor(config) {
        super();
        this.config = config;
    }

    /**
     * Post process the given tokens.
     * @param {string[]} tokens - The tokens to be post processed.
     * @returns {string[]} The post processed tokens.
     */
    post_process(tokens) {
        return tokens;
    }
}

/**
 * The base class for token decoders.
 * @extends Callable
 */
class Decoder extends Callable {

    /**
    * Creates an instance of `Decoder`.
    *
    * @param {Object} config - The configuration object.
    */
    constructor(config) {
        super();
        this.config = config;
    }

    /**
   * Creates a decoder instance based on the provided configuration.
   *
   * @param {Object} config - The configuration object.
   * @returns {Decoder} A decoder instance.
   * @throws {Error} If an unknown decoder type is provided.
   */
    static fromConfig(config) {
        switch (config.type) {
            case 'WordPiece':
                return new WordPieceDecoder(config);
            case 'Metaspace':
                return new MetaspaceDecoder(config);
            case 'ByteLevel':
                return new ByteLevelDecoder(config);
            default:
                throw new Error(`Unknown Decoder type: ${config.type}`);
        }
    }

    /**
    * Converts a list of tokens to a string.
    *
    * @param {string[]} tokens - The list of tokens.
    * @returns {string} The decoded string.
    */
    convert_tokens_to_string(tokens) {
        return tokens.join('').trim();
    }

    /**
    * Calls the `decode` method.
    *
    * @param {string[]} tokens - The list of tokens.
    * @returns {string} The decoded string.
    */
    _call(tokens) {
        return this.decode(tokens);
    }

    /**
    * Decodes a list of tokens.
    * @param {string[]} tokens - The list of tokens.
    * @returns {string} The decoded string.
    * @throws {Error} If the `decode` method is not implemented in the subclass.
    */
    decode(tokens) {
        throw Error("decode should be implemented in subclass.")
    }


}

/**
 * A decoder that decodes a list of WordPiece tokens into a single string.
 * @extends Decoder
 */
class WordPieceDecoder extends Decoder {

    /**
     * Creates a new instance of WordPieceDecoder.
     * @param {Object} config - The configuration object.
     * @param {string} config.prefix - The prefix used for WordPiece encoding.
     * @param {boolean} config.cleanup - Whether to cleanup the decoded string.
     */
    constructor(config) {
        super(config);
        this.convertRegex = new RegExp(` ${config.prefix}`, 'g');
        this.cleanup = config.cleanup;
    }

    /**
     * Converts a list of WordPiece tokens to a single string.
     * @param {Array} tokens - The list of WordPiece tokens.
     * @returns {string} The decoded string.
     */
    convert_tokens_to_string(tokens) {
        return tokens.join(' ').replace(this.convertRegex, '').trim();
    }

    /**
     * Decodes a list of WordPiece tokens into a single string.
     * @param {Array} tokens - The list of WordPiece tokens.
     * @returns {string} The decoded string.
     */
    decode(tokens) {
        return this.convert_tokens_to_string(tokens);
    }
}

/**
 * Byte-level decoder for tokenization output. Inherits from the `Decoder` class.
 * @extends Decoder
 */
class ByteLevelDecoder extends Decoder {

    /**
     * Create a `ByteLevelDecoder` object.
     * @param {object} config - Configuration object.
     */
    constructor(config) {
        super(config);

        this.byte_decoder = UNICODE_TO_BYTES;
        this.text_decoder = new TextDecoder("utf-8", {
            fatal: false,
            ignoreBOM: true,
        });

        this.end_of_word_suffix = null;
    }

    /**
     * Convert an array of tokens to string by decoding each byte.
     * @param {string[]} tokens - Array of tokens to be decoded.
     * @returns {string} - The decoded string.
     */
    convert_tokens_to_string(tokens) {
        let text = tokens.join('');

        if (this.config.trim_offsets) {
            text = text.trim();
        } else if (this.config.add_prefix_space) {
            text = ' ' + text;
        }

        // @ts-ignore
        let byteArray = new Uint8Array([...text].map(c => this.byte_decoder[c]));
        let decoded_text = this.text_decoder.decode(byteArray);

        if (this.end_of_word_suffix) {
            decoded_text = decoded_text.replaceAll(this.end_of_word_suffix, ' ').trim();
        }
        return decoded_text;
    }

    /**
     * Decode an array of tokens to string.
     * @param {string[]} tokens - Array of tokens to be decoded.
     * @returns {string} - The decoded string.
     */
    decode(tokens) {
        // TODO move to base class (like HF)
        // tokens === filtered_tokens

        // To avoid mixing byte-level and unicode for byte-level BPT
        // we need to build string separately for added tokens and byte-level tokens
        // cf. https://github.com/huggingface/transformers/issues/1133
        let sub_texts = [];
        let current_sub_text = [];
        for (let token of tokens) {
            // tokens sent here are already filtered, so we don't need to do this
            // if (skip_special_tokens && this.all_special_ids.includes(token)) {
            //     continue;
            // }

            if (this.added_tokens.includes(token)) {
                if (current_sub_text.length > 0) {
                    sub_texts.push(this.convert_tokens_to_string(current_sub_text));
                    current_sub_text = [];
                }
                sub_texts.push(token);
            } else {
                current_sub_text.push(token);
            }
        }
        if (current_sub_text.length > 0) {
            sub_texts.push(this.convert_tokens_to_string(current_sub_text));
        }

        // TODO add spaces_between_special_tokens and clean_up_tokenization_spaces options
        let text = sub_texts.join('');

        return text;
    }
}

/**
 * This PreTokenizer replaces spaces with the given replacement character, adds a prefix space if requested,
 * and returns a list of tokens.
 * @extends PreTokenizer
 */
class MetaspacePreTokenizer extends PreTokenizer {
    /**
     * @param {Object} config - The configuration object for the MetaspacePreTokenizer.
     * @param {boolean} config.add_prefix_space - Whether to add a prefix space to the first token.
     * @param {string} config.replacement - The character to replace spaces with.
     * @param {string} [config.str_rep=config.replacement] - An optional string representation of the replacement character.
     */
    constructor(config) {
        super();

        this.addPrefixSpace = config.add_prefix_space;
        this.replacement = config.replacement;
        this.strRep = config.str_rep || this.replacement;
    }

    /**
     * This method takes a list of normalized tokens, replaces spaces with the replacement character,
     * adds a prefix space if requested, and returns a new list of tokens.
     * @param {string[]|string} normalizedTokens - The list of normalized tokens to pre-tokenize.
     * @returns {string[]} A new list of pre-tokenized tokens.
     */
    pre_tokenize(normalizedTokens) {
        if (typeof normalizedTokens === 'string' || normalizedTokens instanceof String) {
            // Metaspace acts on a list of tokens. If passing in a string, first split on whitespace
            normalizedTokens = normalizedTokens.split(/\s+/);
        }

        const result = [];
        for (let token of normalizedTokens) {
            let normalized = token.replace(' ', this.strRep);
            if (this.addPrefixSpace && !normalized.startsWith(this.replacement)) {
                normalized = this.strRep + normalized;
            }
            result.push(normalized);
        }
        return result;
    }
}

/**
 * MetaspaceDecoder class extends the Decoder class and decodes Metaspace tokenization.
 * @extends Decoder
 */
class MetaspaceDecoder extends Decoder {
    /**
     * Constructs a new MetaspaceDecoder object.
     * @param {Object} config - The configuration object for the MetaspaceDecoder.
     * @param {boolean} config.add_prefix_space - Whether to add a prefix space to the decoded string.
     * @param {string} config.replacement - The string to replace spaces with.
     */
    constructor(config) {
        super(config);

        this.addPrefixSpace = config.add_prefix_space;
        this.replacement = config.replacement;
    }

    /**
     * Decodes the given tokens back into a string.
     * @param {Array} tokens - The tokens to decode.
     * @returns {string} - The decoded string.
     */
    decode(tokens) {
        let result = [];
        let i = 0;
        for (let token of tokens) {
            let normalized = token.replace(this.replacement, ' ');
            if (this.addPrefixSpace && i == 0 && normalized.startsWith(' ')) {
                normalized = normalized.substring(1);
            }
            result.push(normalized);
            ++i;
        }

        return this.convert_tokens_to_string(result);
    }
}

/**
 * A normalizer that applies a precompiled charsmap.
 * This is useful for applying complex normalizations in C++ and exposing them to JavaScript.
 * @extends Normalizer
 * @param {Object} config - The configuration object for the Precompiled normalizer.
 * @param {Object} config.precompiled_charsmap - The precompiled charsmap object.
 */
class Precompiled extends Normalizer {
    /**
     * Create a new instance of Precompiled normalizer.
     * @param {object} config - The configuration object.
     * @param {any} config.precompiled_charsmap - Precompiled chars mapping.
     */
    constructor(config) {
        super(config);
        this.charsmap = config.precompiled_charsmap;
    }

    /**
     * Normalizes the given text by applying the precompiled charsmap.
     * @param {string} text - The text to normalize.
     * @returns {string} - The normalized text.
     */
    normalize(text) {
        // TODO use this.charsmap
        return text;
    }
}

/**
 * A pre-tokenizer that applies a sequence of pre-tokenizers to the input text.
 * @extends PreTokenizer
 */
class PreTokenizerSequence extends PreTokenizer {
    /**
     * Creates an instance of PreTokenizerSequence.
     * @param {object} config - The configuration object for the pre-tokenizer sequence.
     * @param {object[]} config.pretokenizers - An array of pre-tokenizer configurations.
     */
    constructor(config) {
        super();
        this.tokenizers = config.pretokenizers.map(x => PreTokenizer.fromConfig(x));
    }

    /**
     * Applies each pre-tokenizer in the sequence to the input text in turn.
     * @param {string|string[]} text - The text(s) to pre-tokenize.
     * @returns {string[]} The pre-tokenized text.
     */
    pre_tokenize_text(text) {
        if (typeof text === 'string') {
            text = [text];
        }
        // Use reduce to apply each tokenizer to the text
        return this.tokenizers.reduce((preTokenizedText, tokenizer) => {
            return tokenizer.pre_tokenize(preTokenizedText);
        }, text);
    }
}

/**
 * Splits a string of text by whitespace characters into individual tokens.
 * @extends PreTokenizer
 */
class WhitespaceSplit extends PreTokenizer {
    /**
     * Creates an instance of WhitespaceSplit.
     * @param {object} config - The configuration object for the pre-tokenizer sequence.
     */
    constructor(config) {
        super();
    }
    /**
     * Pre-tokenizes the input text by splitting it on whitespace characters.
     * @param {string} text - The text to be pre-tokenized.
     * @returns {string[]} An array of tokens produced by splitting the input text on whitespace.
     */
    pre_tokenize_text(text) {
        return text.split(/\s+/);
    }
}

class PreTrainedTokenizer extends Callable {
    /**
     * Create a new PreTrainedTokenizer instance.
     * @param {Object} tokenizerJSON - The JSON of the tokenizer.
     * @param {Object} tokenizerConfig - The config of the tokenizer.
     */
    constructor(tokenizerJSON, tokenizerConfig) {
        super();

        this.tokenizerJSON = tokenizerJSON;
        this.tokenizerConfig = tokenizerConfig;

        this.normalizer = Normalizer.fromConfig(tokenizerJSON.normalizer);
        this.pre_tokenizer = PreTokenizer.fromConfig(tokenizerJSON.pre_tokenizer);
        this.model = TokenizerModel.fromConfig(tokenizerJSON.model, tokenizerConfig);
        this.post_processor = PostProcessor.fromConfig(tokenizerJSON.post_processor);

        // TODO - maybe, allow this to be null; in which case, we use model as decoder too?
        this.decoder = Decoder.fromConfig(tokenizerJSON.decoder);

        // Slight hack, but it prevents code duplication:
        // Add added_tokens to this.decoder
        this.decoder.added_tokens = [];

        // Another slight hack to add `end_of_word_suffix` (if present) to the decoder
        // This is needed for cases where BPE model and ByteLevel decoder are used
        // For more information, see https://github.com/xenova/transformers.js/issues/74
        // TODO - save this to the decoder when exporting?
        this.decoder.end_of_word_suffix = this.model.end_of_word_suffix;

        // Add added_tokens to model
        this.special_tokens = [];
        this.all_special_ids = [];
        for (let addedToken of tokenizerJSON.added_tokens) {
            let id = addedToken.id;
            let content = addedToken.content;
            this.decoder.added_tokens.push(content);

            this.model.tokens_to_ids[content] = id;
            this.model.vocab[id] = content;

            if (addedToken.special) {
                this.special_tokens.push(content);
                this.all_special_ids.push(id);
            }
        }
        this.special_tokens_regex = new RegExp(
            '(' + this.special_tokens.map(escapeRegExp).join('|') + ')'
        );


        // Set mask token if present (otherwise will be undefined, which is fine)
        this.mask_token = this.getToken('mask_token');
        this.mask_token_id = this.model.tokens_to_ids[this.mask_token];

        this.pad_token = this.getToken('pad_token', 'eos_token');
        this.pad_token_id = this.model.tokens_to_ids[this.pad_token];

        this.sep_token = this.getToken('sep_token');
        this.sep_token_id = this.model.tokens_to_ids[this.sep_token];

        this.model_max_length = this.tokenizerConfig.model_max_length;

        this.remove_space = this.tokenizerConfig.remove_space;

        // TODO allow user to change this
        this.padding_side = 'right';
    }

    /**
     * Returns the value of the first matching key in the tokenizer config object.
     * @param {...string} keys - One or more keys to search for in the tokenizer config object.
     * @returns {string|null} - The value associated with the first matching key, or null if no match is found.
     * @throws {Error} - If an object is found for a matching key and its __type property is not "AddedToken".
     */
    getToken(...keys) {
        for (let key of keys) {
            let item = this.tokenizerConfig[key];

            if (!item) continue;

            if (typeof item === 'object') {
                if (item.__type === 'AddedToken') {
                    return item.content;
                } else {
                    throw Error(`Unknown token: ${item}`);
                }
            } else {
                return item;
            }
        }
        return null;
    }

    /**
     * Creates a new Tokenizer instance with the tokenizer configuration and files
     * downloaded from a pretrained model located at the given model path.
     *
     * @param {string} modelPath - The path to the pretrained model.
     * @param {function} [progressCallback=null] - Optional callback function that will be called with the current
     * progress percentage (0 to 100) each time a file is downloaded.
     * @throws {Error} Throws an error if the tokenizer.json or tokenizer_config.json files are not found in the modelPath.
     */
    static async from_pretrained(modelPath, progressCallback = null) {
        // TODO get files in parallel

        let [tokenizerJSON, tokenizerConfig] = await Promise.all([
            fetchJSON(modelPath, 'tokenizer.json', progressCallback),
            fetchJSON(modelPath, 'tokenizer_config.json', progressCallback),
        ])

        return new this(tokenizerJSON, tokenizerConfig);
    }

    /**
     * This function can be overridden by a subclass to apply additional preprocessing
     * to a model's input data.
     * @param {Object} inputs - An object containing input data as properties.
     * @returns {Object} The modified inputs object.
     */
    prepare_model_inputs(inputs) {
        return inputs;
    }

    /**
     * Encode/tokenize the given text(s).
     * @param {string|string[]} text - The text to tokenize.
     * @param {object} options - An optional object containing the following properties:
     * @param {string|string[]} [options.text_pair=null] - Optional second sequence to be encoded. If set, must be the same type as text.
     * @param {boolean} [options.padding=false] - Whether to pad the input sequences.
     * @param {boolean} [options.truncation=null] - Whether to truncate the input sequences.
     * @param {number} [options.max_length=null] - Maximum length of the returned list and optionally padding length.
     * @param {boolean} [options.return_tensor=true] - Whether to return the results as Tensors or arrays.
     * @returns {{ input_ids: number[]|number[][]|Tensor; attention_mask: any[]|Tensor; }} Object to be passed to the model.
     */
    _call(
        // Required positional arguments
        text,

        // Optional keyword arguments
        {
            text_pair = null,
            // add_special_tokens = true, // TODO
            padding = false,
            truncation = null,
            max_length = null,
            return_tensor = true, // Different to HF
        } = {},
    ) {
        /** @type {number[]|number[][]|Tensor} */
        let tokens;

        if (Array.isArray(text)) {
            if (text.length === 0) {
                throw Error('text array must be non-empty')
            }

            if (text_pair !== null) {
                if (!Array.isArray(text_pair)) {
                    throw Error('text_pair must also be an array')

                } else if (text.length !== text_pair.length) {
                    throw Error('text and text_pair must have the same length')
                }

                tokens = text.map(
                    (text, i) => this.encode(text, text_pair[i])
                )

            } else {
                tokens = text.map(x => this.encode(x));
            }

        } else {
            if (text === null) {
                throw Error('text may not be null')
            }

            if (Array.isArray(text_pair)) {
                throw Error('When specifying `text_pair`, since `text` is a string, `text_pair` must also be a string (i.e., not an array).')
            }
            tokens = [this.encode(text, text_pair)];
        }
        // At this point, tokens is batched: [batch_size, tokens]
        // However, array may be jagged. So, we pad to max_length

        let maxLengthOfBatch = Math.max(...tokens.map(x => x.length));

        // If null, we calculate max length from sequences
        if (max_length === null) {
            max_length = maxLengthOfBatch;
        }

        // Ensure it is less than model max length
        max_length = Math.min(max_length, this.model_max_length)

        /** @type {any[]|Tensor} */
        let attention_mask = [];
        if (padding || truncation) {
            // Perform padding and/or truncation
            for (let i = 0; i < tokens.length; ++i) {
                if (tokens[i].length === max_length) {
                    attention_mask.push(new Array(tokens[i].length).fill(1))
                    continue;

                } else if (tokens[i].length > max_length) {
                    // possibly truncate
                    if (truncation) {
                        tokens[i] = tokens[i].slice(0, max_length);
                    }
                    attention_mask.push(new Array(tokens[i].length).fill(1))

                } else { // t.length < max_length
                    if (padding) {
                        let diff = max_length - tokens[i].length;

                        if (this.padding_side === 'right') {
                            attention_mask.push(
                                (new Array(tokens[i].length).fill(1)).concat(new Array(diff).fill(0))
                            )
                            tokens[i].push(...new Array(diff).fill(this.pad_token_id))
                        } else { // left
                            attention_mask.push(
                                (new Array(diff).fill(0)).concat(new Array(tokens[i].length).fill(1))
                            )
                            tokens[i].unshift(...new Array(diff).fill(this.pad_token_id))
                        }

                    } else {
                        attention_mask.push(new Array(tokens[i].length).fill(1))
                    }
                }
            }
        } else {
            attention_mask = tokens.map(x => new Array(x.length).fill(1))
        }

        if (return_tensor) {
            if (!(padding && truncation)) {
                // Not, guaranteed that all items have same length, so
                // we perform additional check

                if (tokens.some(x => x.length !== tokens[0].length)) {
                    throw Error(
                        "Unable to create tensor, you should probably activate truncation and/or padding " +
                        "with 'padding=true' and 'truncation=true' to have batched tensors with the same length."
                    )
                }
            }

            // Now we actually convert to tensor
            let dims = [tokens.length, tokens[0].length];

            tokens = new Tensor('int64',
                BigInt64Array.from(tokens.flat().map(BigInt)),
                dims
            );

            attention_mask = new Tensor(
                'int64',
                BigInt64Array.from(attention_mask.flat().map(BigInt)),
                dims
            )
        }


        // Finally, add attention mask, and possibly model-specific parameters
        let modelInputs = {
            input_ids: tokens,
            attention_mask: attention_mask
        }

        // Optional post-processing
        modelInputs = this.prepare_model_inputs(modelInputs);

        return modelInputs
    }

    /**
     * Encodes a single text using the preprocessor pipeline of the tokenizer.
     *
     * @param {string|null} text - The text to encode.
     * @returns {Array} The encoded tokens.
     */
    _encode_text(text) {
        if (text === null) return null;

        // Actual function which does encoding, for a single text
        // First, we take care of special tokens. Needed to avoid issues arising from
        // normalization and/or pretokenization (which may not preserve special tokens)
        const sections = text.split(this.special_tokens_regex).filter(x => x);

        let tokens = sections.map(x => {
            if (this.special_tokens.includes(x)) {
                // Ignore special tokens
                return x
            } else {
                if (this.remove_space === true) {
                    // remove_space
                    x = x.trim().split(/\s+/).join(' ')
                }
                // Actually perform encoding
                if (this.normalizer !== null) {
                    x = this.normalizer(x);
                }
                let sectionTokens = this.pre_tokenizer(x);
                return this.model(sectionTokens);
            }
        }).flat();

        return tokens;
    }

    /**
     * Encodes a single text or a pair of texts using the model's tokenizer.
     *
     * @param {string} text - The text to encode.
     * @param {string|null} text_pair - The optional second text to encode.
     * @returns {number[]} An array of token IDs representing the encoded text(s).
     */
    encode(text, text_pair = null) {
        // Function called by users to encode possibly multiple texts
        let tokens = this._encode_text(text);
        let tokens2 = this._encode_text(text_pair);

        let combinedTokens = this.post_processor(tokens, tokens2);
        let ids = this.model.convert_tokens_to_ids(combinedTokens);

        return ids
    }

    /**
     * Clean up a list of simple English tokenization artifacts like spaces before punctuations and abbreviated forms
     * @param {string} text - The text to clean up.
     * @returns {string} - The cleaned up text.
     */
    clean_up_tokenization(text) {
        // Clean up a list of simple English tokenization artifacts
        // like spaces before punctuations and abbreviated forms
        return text.replace(/ \./g, '.')
            .replace(/ \?/g, '?')
            .replace(/ \!/g, '!')
            .replace(/ ,/g, ',')
            .replace(/ \' /g, "'")
            .replace(/ n\'t/g, "n't")
            .replace(/ \'m/g, "'m")
            .replace(/ \'s/g, "'s")
            .replace(/ \'ve/g, "'ve")
            .replace(/ \'re/g, "'re");
    }

    /**
     * Decode a batch of tokenized sequences.
     * @param {number[][]} batch - List of tokenized input sequences.
     * @param {Object} decode_args - (Optional) Object with decoding arguments.
     * @returns {string[]} List of decoded sequences.
     */
    batch_decode(batch, decode_args = {}) {
        return batch.map(x => this.decode(x, decode_args));
    }

    /**
     * Decodes a sequence of token IDs back to a string.
     *
     * @param {number[]} token_ids - List of token IDs to decode.
     * @param {Object} [decode_args={}]
     * @param {boolean} [decode_args.skip_special_tokens=false] - If true, special tokens are removed from the output string.
     * @param {boolean} [decode_args.clean_up_tokenization_spaces=true] - If true, spaces before punctuations and abbreviated forms are removed.
     *
     * @returns {string} The decoded string.
     * @throws {Error} If `token_ids` is not a non-empty array of integers.
     */
    decode(
        token_ids,
        decode_args = {},
    ) {
        if (!Array.isArray(token_ids) || token_ids.length === 0 || !isIntegralNumber(token_ids[0])) {
            throw Error("token_ids must be a non-empty array of integers.");
        }

        return this.decode_single(
            token_ids, decode_args
        )
    }

    /**
     * Decode a single list of token ids to a string.
     * @param {number[]} token_ids - List of token ids to decode
     * @param {object} decode_args - Optional arguments for decoding
     * @param {boolean} [decode_args.skip_special_tokens=false] - Whether to skip special tokens during decoding
     * @param {boolean} [decode_args.clean_up_tokenization_spaces=true] - Whether to clean up tokenization spaces during decoding
     * @returns {string} - The decoded string
     */
    decode_single(
        token_ids,
        {
            skip_special_tokens = false,
            clean_up_tokenization_spaces = true,
        }
    ) {
        let tokens = this.model.convert_ids_to_tokens(token_ids);
        if (skip_special_tokens) {
            tokens = tokens.filter(x => !this.special_tokens.includes(x));
        }

        let decoded = this.decoder(tokens); // tokens === filtered_tokens

        if ('cleanup' in this.decoder && this.decoder.cleanup !== clean_up_tokenization_spaces) {
            console.warn(`clean_up_tokenization_spaces disagrees with decoder's cleanup setting. Overriding to use decoder's cleanup setting (${this.decoder.cleanup})`)
            // @ts-ignore
            clean_up_tokenization_spaces = this.decoder.cleanup;
        }

        if (clean_up_tokenization_spaces) {
            decoded = this.clean_up_tokenization(decoded);
        }

        return decoded;
    }

}

/**
* Prepare model inputs for a BERT model.
* @param {Object} inputs - An object containing the input ids and attention mask.
* @returns {Object} The prepared inputs object.
*/
function bert_prepare_model_inputs(inputs) {
    // Helper method for preparing token_type_ids for bert models
    inputs.token_type_ids = new Tensor(
        'int64',
        new BigInt64Array(inputs.input_ids.data.length),
        inputs.input_ids.dims
    )
    return inputs;
}

/**
 * BertTokenizer is a class used to tokenize text for BERT models.
 * @extends PreTrainedTokenizer
 */
class BertTokenizer extends PreTrainedTokenizer {
    /**
     * @see {@link bert_prepare_model_inputs}
     */
    prepare_model_inputs(inputs) {
        return bert_prepare_model_inputs(inputs);
    }
}
/**
 * Albert tokenizer
 * @extends PreTrainedTokenizer
 */
class AlbertTokenizer extends PreTrainedTokenizer {
    /**
     * @see {@link bert_prepare_model_inputs}
     */
    prepare_model_inputs(inputs) {
        return bert_prepare_model_inputs(inputs);
    }
}
class MobileBertTokenizer extends PreTrainedTokenizer {
    /**
     * @see {@link bert_prepare_model_inputs}
     */
    prepare_model_inputs(inputs) {
        return bert_prepare_model_inputs(inputs);
    }
}
class SqueezeBertTokenizer extends PreTrainedTokenizer {
    /**
     * @see {@link bert_prepare_model_inputs}
     */
    prepare_model_inputs(inputs) {
        return bert_prepare_model_inputs(inputs);
    }
}
class DistilBertTokenizer extends PreTrainedTokenizer { }
class T5Tokenizer extends PreTrainedTokenizer { }
class GPT2Tokenizer extends PreTrainedTokenizer { }
class BartTokenizer extends PreTrainedTokenizer { }
class RobertaTokenizer extends PreTrainedTokenizer { }


/**
 * WhisperTokenizer tokenizer
 * @extends PreTrainedTokenizer
 */
class WhisperTokenizer extends PreTrainedTokenizer {
    static LANGUAGES = {
        "en": "english",
        "zh": "chinese",
        "de": "german",
        "es": "spanish",
        "ru": "russian",
        "ko": "korean",
        "fr": "french",
        "ja": "japanese",
        "pt": "portuguese",
        "tr": "turkish",
        "pl": "polish",
        "ca": "catalan",
        "nl": "dutch",
        "ar": "arabic",
        "sv": "swedish",
        "it": "italian",
        "id": "indonesian",
        "hi": "hindi",
        "fi": "finnish",
        "vi": "vietnamese",
        "he": "hebrew",
        "uk": "ukrainian",
        "el": "greek",
        "ms": "malay",
        "cs": "czech",
        "ro": "romanian",
        "da": "danish",
        "hu": "hungarian",
        "ta": "tamil",
        "no": "norwegian",
        "th": "thai",
        "ur": "urdu",
        "hr": "croatian",
        "bg": "bulgarian",
        "lt": "lithuanian",
        "la": "latin",
        "mi": "maori",
        "ml": "malayalam",
        "cy": "welsh",
        "sk": "slovak",
        "te": "telugu",
        "fa": "persian",
        "lv": "latvian",
        "bn": "bengali",
        "sr": "serbian",
        "az": "azerbaijani",
        "sl": "slovenian",
        "kn": "kannada",
        "et": "estonian",
        "mk": "macedonian",
        "br": "breton",
        "eu": "basque",
        "is": "icelandic",
        "hy": "armenian",
        "ne": "nepali",
        "mn": "mongolian",
        "bs": "bosnian",
        "kk": "kazakh",
        "sq": "albanian",
        "sw": "swahili",
        "gl": "galician",
        "mr": "marathi",
        "pa": "punjabi",
        "si": "sinhala",
        "km": "khmer",
        "sn": "shona",
        "yo": "yoruba",
        "so": "somali",
        "af": "afrikaans",
        "oc": "occitan",
        "ka": "georgian",
        "be": "belarusian",
        "tg": "tajik",
        "sd": "sindhi",
        "gu": "gujarati",
        "am": "amharic",
        "yi": "yiddish",
        "lo": "lao",
        "uz": "uzbek",
        "fo": "faroese",
        "ht": "haitian creole",
        "ps": "pashto",
        "tk": "turkmen",
        "nn": "nynorsk",
        "mt": "maltese",
        "sa": "sanskrit",
        "lb": "luxembourgish",
        "my": "myanmar",
        "bo": "tibetan",
        "tl": "tagalog",
        "mg": "malagasy",
        "as": "assamese",
        "tt": "tatar",
        "haw": "hawaiian",
        "ln": "lingala",
        "ha": "hausa",
        "ba": "bashkir",
        "jw": "javanese",
        "su": "sundanese",
    }

    /**
     * Decodes automatic speech recognition (ASR) sequences.
     * @param {Array.<{tokens: Array.<number>, stride: [number, number, number]}>} sequences The sequences to decode.
     * @param {Object} options - The options to use for decoding.
     * @returns {[string, {chunks?:Array.<{language: string|null, timestamp: [number|null, number|null], text: string}>}]} The decoded sequences.
     */
    _decode_asr(sequences, {
        return_timestamps = false,
        return_language = false,
        time_precision = null,
        force_full_sequences = true
    } = {}) {
        // Set force_full_sequences=false if you want streaming
        // TODO add support for `return_language`

        // Internal method meant to only be used by asr pipeline.
        // Handles all the little quirks specific to whisper to handle
        // the various options not allowed in other seq2seq models

        // =========== Overview ============
        // - iterate over all outputs
        // - all tokens within output
        // - Each token can be
        //   - language token
        //   - special token
        //   - timestamp token
        //   - text token
        // - We accumulate the text tokens.
        // - We split on end timestamps
        // - Lots of complexity comes from stride and timestamps

        if (time_precision === null) {
            throw Error("Must specify time_precision")
        }
        let last_language = null;

        function new_chunk() {
            return { "language": last_language, "timestamp": [null, null], "text": "" };
        }

        // Welcome to the state machine!
        const chunks = [];
        let chunk = new_chunk();
        let time_offset = 0.0;
        const timestamp_begin = this.model.convert_tokens_to_ids(["<|notimestamps|>"])[0] + 1;

        let previous_tokens = [];
        let skip = false;
        let right_stride_start = null;


        const all_special_ids = new Set(this.all_special_ids);

        for (let output of sequences) {
            // NOTE: python version has batches, so it uses [0]
            const token_ids = output.tokens;

            // These keep track of timestamps within strides, which need
            // to be skipped and resolve all tokens in a single chunk.
            let last_timestamp = null;
            let first_timestamp = timestamp_begin;

            if ("stride" in output) {
                const [chunk_len, stride_left, stride_right] = output.stride;

                // Offset the timings to account for the other `model_outputs`.
                time_offset -= stride_left;
                right_stride_start = chunk_len - stride_right;

                // Keeping track of timestamps within strides
                // We're going to NOT split on those, and delay until we're
                // out of BOTH stride. Otherwise lots of issues occur and
                // corner cases
                if (stride_left) {
                    first_timestamp = stride_left / time_precision + timestamp_begin;
                }

                if (stride_right) {
                    for (let i = token_ids.length - 1; i >= 0; --i) {
                        const token = token_ids[i];
                        if (token >= timestamp_begin) {
                            // There can be several token in the right stride
                            // But the last one is ALWAYS going to be skipped
                            if (last_timestamp !== null && (token - timestamp_begin) * time_precision < right_stride_start) {
                                break;
                            }
                            last_timestamp = token;
                        }
                    }
                }
            }

            let current_tokens = [];

            // - all tokens within output
            for (const token of token_ids) {
                // 4 possible states for each token
                // - 1/ Language code
                // - 2/ all other special tokens (which we ignore)
                // - 3/ Timestamp
                // - 4/ Regular text

                if (all_special_ids.has(token)) {
                    const text = this.decode([token]);
                    if (text[0] === "[" && text[text.length - 1] === "]") {
                        const language = WhisperTokenizer.LANGUAGES[text.slice(1, -1)];

                        if (language !== undefined) {
                            // 1/ Indeed some language
                            // TODO Handle when language is different from the previous
                            // one, and we cannot use timestamped tokens to create chunks
                            if (last_language !== null && language !== last_language && !return_timestamps) {
                                previous_tokens.push(current_tokens);
                                const resolved_tokens = this.findLongestCommonSequence(previous_tokens);
                                const resolved_text = this.decode(resolved_tokens);
                                chunk.text = resolved_text;
                                chunks.push(chunk);

                                // Flush all our temporary context
                                previous_tokens = [];
                                current_tokens = [];
                                chunk = new_chunk();
                            }

                            last_language = chunk.language = language;
                        } else {
                            // 2/ This is a regular special token, ignoring it
                        }
                    }
                } else if (token >= timestamp_begin) {
                    // 3/ Timestamp token
                    const time = (token - timestamp_begin) * time_precision + time_offset;
                    const rounded_time = Math.round(time * 100) / 100;

                    if (last_timestamp !== null && token >= last_timestamp) {
                        // Whisper outputted a timestamp token, but it falls within
                        // our stride, so we're going to skip it for the time being
                        // and resolve this later
                        // Skip is necessary because timestamp tokens always come
                        // by pair, so we need to skip the next one too (which would mark the start of another chunk).
                        skip = true;
                    } else if (skip || (previous_tokens.length > 0 && token < first_timestamp)) {
                        skip = false;
                    } else if (chunk.timestamp[0] === null) {
                        chunk.timestamp[0] = rounded_time;
                    } else {
                        // This is the end of the timestamp chunk
                        if (rounded_time === chunk.timestamp[0]) {
                            // This is a bug in timestamp token output
                            // where we're taking the duplicate token
                            // as a stop where it should be a start.
                            // This is an issue in the underlying model output
                            // Let's just skip it so it becomes
                        } else {
                            chunk.timestamp[1] = time;

                            // Handling merges
                            previous_tokens.push(current_tokens)
                            const resolved_tokens = this.findLongestCommonSequence(previous_tokens)
                            const resolved_text = this.decode(resolved_tokens)
                            chunk.text = resolved_text
                            chunks.push(chunk)

                            // Flush all our temporary context
                            previous_tokens = []
                            current_tokens = []
                            chunk = new_chunk()
                        }
                    }

                } else {
                    // 4/ Regular token
                    // We just append to the list of all tokens so we can handle
                    // merges later and decode into text.
                    current_tokens.push(token)

                }
            }

            if ('stride' in output) {
                const [chunk_len, stride_left, stride_right] = output.stride;
                time_offset += chunk_len - stride_right
            }

            // Leftover tokens
            if (current_tokens.length > 0) {
                previous_tokens.push(current_tokens)
            } else if (previous_tokens.every(p => p.length === 0)) {
                // Flushing previous tokens (END)"
                chunk = new_chunk()
                previous_tokens = []
                current_tokens = []
            }

        }

        if (previous_tokens.length > 0) {
            if (force_full_sequences && return_timestamps) {
                // Last token should always be timestamps, so there shouldn't be
                // leftover
                throw new Error("There was an error while processing timestamps, we haven't found a timestamp as last token.");
            }

            // Happens when we don't use timestamps
            const resolved_tokens = this.findLongestCommonSequence(previous_tokens);

            // Flushing previous tokens (FINAL)
            const resolved_text = this.decode(resolved_tokens);
            chunk.text = resolved_text;
            chunks.push(chunk);
        }

        let optional = {};

        // Preparing and cleaning up the pipeline output
        const full_text = chunks.map(chunk => chunk.text).join('');
        if (return_timestamps || return_language) {
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (!return_timestamps) {
                    delete chunk["timestamp"];
                }

                if (!return_language) {
                    delete chunk["language"];
                }
            }
            optional = { "chunks": chunks };
        }
        return [full_text, optional];

    }

    /**
     * Finds the longest common sequence among the provided sequences.
     * @param {number[][]} sequences - An array of sequences of token ids to compare.
     * @returns {number[]} - The longest common sequence found.
     * @throws {Error} - If there is a bug within the function.
     */
    findLongestCommonSequence(sequences) {
        // It would be much harder to do O(n) because of fault tolerance.
        // We actually have a really good property which is that the total sequence
        // MUST be those subsequences in order.
        let leftSequence = sequences[0];
        let leftLength = leftSequence.length;
        let totalSequence = [];
        for (let i = 1; i < sequences.length; i++) {
            const rightSequence = sequences[i];
            let max = 0.0;
            let maxIndices = [leftLength, leftLength, 0, 0];
            // Here we're sliding matches
            // [a, b, c, d]
            //          [c, d, f]
            // =        [c] == [d]

            // [a, b, c, d]
            //       [c, d, f]
            // =     [c, d] == [c, d]


            // [a, b, c, d]
            //    [c, d, f]

            // =  [b, c, d] == [c, d, f]

            // [a, b, c, d]
            // [c, d, f]

            // [a, b, c] == [c, d, f]

            // [a, b, c, d]
            // [d, f]

            // [a, b] == [d, f]

            // [a, b, c, d]
            // [f]

            // [a] == [f]

            const rightLength = rightSequence.length;
            for (let j = 1; j < leftLength + rightLength; j++) {
                const eps = j / 10000.0;
                const leftStart = Math.max(0, leftLength - j);
                const leftStop = Math.min(leftLength, leftLength + rightLength - j);
                const left = leftSequence.slice(leftStart, leftStop);
                const rightStart = Math.max(0, j - leftLength);
                const rightStop = Math.min(rightLength, j);
                const right = rightSequence.slice(rightStart, rightStop);
                if (left.length !== right.length) {
                    throw new Error("There is a bug within whisper `decode_asr` function, please report it. Dropping to prevent bad inference.");
                }
                const matches = left.filter((elem, idx) => elem === right[idx]).length;
                const matching = matches / j + eps;
                if (matches > 1 && matching > max) {
                    max = matching;
                    maxIndices = [leftStart, leftStop, rightStart, rightStop];
                }
            }
            const [leftStart, leftStop, rightStart, rightStop] = maxIndices;
            const leftMid = Math.floor((leftStop + leftStart) / 2);
            const rightMid = Math.floor((rightStop + rightStart) / 2);
            totalSequence.push(...leftSequence.slice(0, leftMid));
            leftSequence = rightSequence.slice(rightMid);
            leftLength = leftSequence.length;
        }
        totalSequence.push(...leftSequence);
        return totalSequence;
    }
}
class CodeGenTokenizer extends PreTrainedTokenizer { }
class CLIPTokenizer extends PreTrainedTokenizer { }
class MarianTokenizer extends PreTrainedTokenizer {
    /**
     * Create a new MarianTokenizer instance.
     * @param {Object} tokenizerJSON - The JSON of the tokenizer.
     * @param {Object} tokenizerConfig - The config of the tokenizer.
     */
    constructor(tokenizerJSON, tokenizerConfig) {
        super(tokenizerJSON, tokenizerConfig);

        this.languageRegex = /^(>>\w+<<)\s*/g;

        this.supported_language_codes = this.model.vocab.filter(
            x => this.languageRegex.test(x)
        );
    }

    /**
     * Encodes a single text. Overriding this method is necessary since the language codes
     * must be removed before encoding with sentencepiece model.
     * @see https://github.com/huggingface/transformers/blob/12d51db243a00726a548a43cc333390ebae731e3/src/transformers/models/marian/tokenization_marian.py#L204-L213
     *
     * @param {string|null} text - The text to encode.
     * @returns {Array} The encoded tokens.
     */
    _encode_text(text) {
        if (text === null) return null;

        // Check if text starts with language code:
        let [matchInfo, ...remainder] = text.trim().split(this.languageRegex);

        if (remainder.length === 0) {
            // No language code, encode normally
            return super._encode_text(matchInfo);

        } else if (remainder.length === 2) {
            // Text starts with language code, so we do not encode it with sentencepiece.
            let [language, text] = remainder;

            if (!this.supported_language_codes.includes(language)) {
                console.warn(`Unsupported language code "${language}" detected, which may lead to unexpected behavior. Should be one of: ${JSON.stringify(this.supported_language_codes)}`)
            }
            return [language, ...super._encode_text(text)]
        }
    }

}

/**
 * A trie structure to efficiently store and search for strings.
 */
class CharTrie {
    constructor() {
        this.root = CharTrieNode.default();
    }

    /**
     * Adds one or more `texts` to the trie.
     * @param {string[]} texts - The strings to add to the trie.
     */
    extend(texts) {
        for (let text of texts) {
            this.push(text);
        }
    }

    /**
     * Adds one or more `texts` to the trie.
     * @param {*} text - The strings to add to the trie.
     */
    push(text) {
        let node = this.root;
        for (let ch of text) {
            let child = node.children.get(ch);
            if (child === undefined) {
                child = CharTrieNode.default();
                node.children.set(ch, child);
            }
            node = child;
        }
        node.isLeaf = true;
    }

    /**
     * Searches the trie for all strings with a common prefix of `text`.
     * @param {string} text - The common prefix to search for.
     * @yields {string} - Each string in the trie that has `text` as a prefix.
     */
    *commonPrefixSearch(text) {
        let node = this.root;
        let prefix = "";
        for (let i = 0; i < text.length && node !== undefined; i++) {
            const ch = text[i];
            prefix += ch;
            node = node.children.get(ch);
            if (node !== undefined && node.isLeaf) {
                yield prefix;
            }
        }
    }
}

/**
 * Represents a node in a character trie.
 * @param {boolean} isLeaf - Whether the node is a leaf node or not.
 * @param {Map<string, CharTrieNode>} children - A map containing the node's children, where the key is a character and the value is a `CharTrieNode`.
 */
class CharTrieNode {
    constructor(isLeaf, children) {
        this.isLeaf = isLeaf;
        this.children = children;
    }

    /**
     * Returns a new `CharTrieNode` instance with default values.
     * @returns {CharTrieNode} A new `CharTrieNode` instance with `isLeaf` set to `false` and an empty `children` map.
     */
    static default() {
        return new CharTrieNode(false, new Map());
    }
}

class TokenLattice {
    /**
     * Creates a new TokenLattice instance.
     *
     * @param {string} sentence - The input sentence to be tokenized.
     * @param {number} bosTokenId - The beginning-of-sequence token ID.
     * @param {number} eosTokenId - The end-of-sequence token ID.
     */
    constructor(sentence, bosTokenId, eosTokenId) {
        this.sentence = sentence;
        this.len = sentence.length;
        this.bosTokenId = bosTokenId;
        this.eosTokenId = eosTokenId;
        this.nodes = [];
        this.beginNodes = new Array(this.len + 1);
        this.endNodes = new Array(this.len + 1);
        for (let i = 0; i < this.len + 1; i++) {
            this.beginNodes[i] = [];
            this.endNodes[i] = [];
        }
        const bos = new TokenLatticeNode(this.bosTokenId, 0, 0, 0, 0.0);
        const eos = new TokenLatticeNode(this.eosTokenId, 1, this.len, 0, 0.0);
        this.nodes.push(bos.clone());
        this.nodes.push(eos.clone());
        this.beginNodes[this.len].push(eos);
        this.endNodes[0].push(bos);
    }

    /**
     * Inserts a new token node into the token lattice.
     *
     * @param {number} pos - The starting position of the token.
     * @param {number} length - The length of the token.
     * @param {number} score - The score of the token.
     * @param {number} tokenId - The token ID of the token.
     */
    insert(pos, length, score, tokenId) {
        const nodeId = this.nodes.length;
        const node = new TokenLatticeNode(tokenId, nodeId, pos, length, score);
        this.beginNodes[pos].push(node);
        this.endNodes[pos + length].push(node);
        this.nodes.push(node);
    }

    /**
     * Implements the Viterbi algorithm to compute the most likely sequence of tokens.
     *
     * @returns {TokenLatticeNode[]} - The array of nodes representing the most likely sequence of tokens.
     */
    viterbi() {
        const len = this.len;
        let pos = 0;
        while (pos <= len) {
            if (this.beginNodes[pos].length == 0) {
                return [];
            }
            for (let rnode of this.beginNodes[pos]) {
                rnode.prev = null;
                let bestScore = 0.0;
                let bestNode = null;
                for (let lnode of this.endNodes[pos]) {
                    const score = lnode.backtraceScore + rnode.score;
                    if (bestNode === null || score > bestScore) {
                        bestNode = lnode.clone();
                        bestScore = score;
                    }
                }
                if (bestNode !== null) {
                    rnode.prev = bestNode;
                    rnode.backtraceScore = bestScore;
                }
                else {
                    return [];
                }
            }
            pos++;
        }
        const results = [];
        const root = this.beginNodes[len][0];
        const prev = root.prev;
        if (prev === null) {
            return [];
        }
        let node = prev.clone();
        while (node.prev !== null) {
            results.push(node.clone());
            const n = node.clone();
            node = n.prev.clone();
        }
        results.reverse();
        return results;
    }

    /**
     * @param {any} node
     * @returns {string} - The array of nodes representing the most likely sequence of tokens.
     */
    piece(node) {
        return this.sentence.slice(node.pos, node.pos + node.length);
    }

    /**
     * @returns {Array} - The array of nodes representing the most likely sequence of tokens.
     */
    tokens() {
        const nodes = this.viterbi();
        return nodes.map(x => this.piece(x));
    }

    /**
     * @returns {Array} - The array of nodes representing the most likely sequence of tokens.
     */
    tokenIds() {
        const nodes = this.viterbi();
        return nodes.map(x => x.tokenId);
    }
}
class TokenLatticeNode {
    /**
     * Represents a node in a token lattice for a given sentence.
     * @param {number} tokenId - The ID of the token associated with this node.
     * @param {number} nodeId - The ID of this node.
     * @param {number} pos - The starting position of the token in the sentence.
     * @param {number} length - The length of the token.
     * @param {number} score - The score associated with the token.
     */
    constructor(tokenId, nodeId, pos, length, score) {
        this.tokenId = tokenId;
        this.nodeId = nodeId;
        this.pos = pos;
        this.length = length;
        this.score = score;
        this.prev = null;
        this.backtraceScore = 0.0;
    }

    /**
     * Returns a clone of this node.
     * @returns {TokenLatticeNode} - A clone of this node.
     */
    clone() {
        const n = new TokenLatticeNode(this.tokenId, this.nodeId, this.pos, this.length, this.score);
        n.prev = this.prev;
        n.backtraceScore = this.backtraceScore;
        return n;
    }
}

class AutoTokenizer {
    // Helper class to determine tokenizer type from tokenizer.json
    static TOKENIZER_CLASS_MAPPING = {
        'T5Tokenizer': T5Tokenizer,
        'DistilBertTokenizer': DistilBertTokenizer,
        'BertTokenizer': BertTokenizer,
        'MobileBertTokenizer': MobileBertTokenizer,
        'SqueezeBertTokenizer': SqueezeBertTokenizer,
        'AlbertTokenizer': AlbertTokenizer,
        'GPT2Tokenizer': GPT2Tokenizer,
        'BartTokenizer': BartTokenizer,
        'RobertaTokenizer': RobertaTokenizer,
        'WhisperTokenizer': WhisperTokenizer,
        'CodeGenTokenizer': CodeGenTokenizer,
        'CLIPTokenizer': CLIPTokenizer,
        'MarianTokenizer': MarianTokenizer,
    }

    static async from_pretrained(modelPath, progressCallback = null) {

        let [tokenizerJSON, tokenizerConfig] = await Promise.all([
            fetchJSON(modelPath, 'tokenizer.json', progressCallback),
            fetchJSON(modelPath, 'tokenizer_config.json', progressCallback),
        ])

        let cls = this.TOKENIZER_CLASS_MAPPING[tokenizerConfig.tokenizer_class];
        if (!cls) {
            console.warn(`Unknown tokenizer class "${tokenizerConfig.tokenizer_class}", attempting to construct from base class.`);
            cls = PreTrainedTokenizer;
        }
        return new cls(tokenizerJSON, tokenizerConfig);
    }
}

module.exports = {
    AutoTokenizer,
    BertTokenizer,
    DistilBertTokenizer,
    T5Tokenizer,
    GPT2Tokenizer
};


/***/ }),

/***/ "./src/transformers.js":
/*!*****************************!*\
  !*** ./src/transformers.js ***!
  \*****************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


const {
    AutoTokenizer,
    BertTokenizer,
    DistilBertTokenizer,
    T5Tokenizer,
    GPT2Tokenizer
} = __webpack_require__(/*! ./tokenizers.js */ "./src/tokenizers.js");
const {
    AutoModel,
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    AutoModelForSeq2SeqLM,
    AutoModelForCausalLM,
    AutoModelForMaskedLM,
    AutoModelForQuestionAnswering,
    AutoModelForVision2Seq,
    AutoModelForImageClassification,
    AutoModelForObjectDetection,
} = __webpack_require__(/*! ./models.js */ "./src/models.js");

const {
    AutoProcessor
} = __webpack_require__(/*! ./processors.js */ "./src/processors.js");
const {
    pipeline
} = __webpack_require__(/*! ./pipelines.js */ "./src/pipelines.js");
const { env } = __webpack_require__(/*! ./env.js */ "./src/env.js");

const { Tensor } = __webpack_require__(/*! ./tensor_utils.js */ "./src/tensor_utils.js");

const moduleExports = {
    // Tokenizers
    AutoTokenizer,
    BertTokenizer,
    DistilBertTokenizer,
    T5Tokenizer,
    GPT2Tokenizer,

    // Models
    AutoModel,
    AutoModelForSeq2SeqLM,
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    AutoModelForCausalLM,
    AutoModelForMaskedLM,
    AutoModelForQuestionAnswering,
    AutoModelForVision2Seq,
    AutoModelForImageClassification,
    AutoModelForObjectDetection,

    // Processors
    AutoProcessor,

    // other
    pipeline,
    Tensor,

    // environment variables
    env
};

// Allow global access to these variables
if (typeof self !== 'undefined') {
    // Used by web workers
    Object.assign(self, moduleExports);
}

// Used by other modules
module.exports = moduleExports


/***/ }),

/***/ "./src/utils.js":
/*!**********************!*\
  !*** ./src/utils.js ***!
  \**********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


const fs = __webpack_require__(/*! fs */ "?569f");

const { env } = __webpack_require__(/*! ./env.js */ "./src/env.js");

if (__webpack_require__.g.ReadableStream === undefined && typeof process !== 'undefined') {
    try {
        // @ts-ignore
        __webpack_require__.g.ReadableStream = Object(function webpackMissingModule() { var e = new Error("Cannot find module 'node:stream/web'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()); // ReadableStream is not a global with Node 16
    } catch (err) {
        console.warn("ReadableStream not defined and unable to import from node:stream/web");
    }
}

class FileResponse {
    /**
     * Creates a new `FileResponse` object.
     * @param {string|URL} filePath
     */
    constructor(filePath) {
        this.filePath = filePath;
        this.headers = {};
        this.headers.get = (x) => this.headers[x]

        this.exists = fs.existsSync(filePath);
        if (this.exists) {
            this.status = 200;
            this.statusText = 'OK';

            let stats = fs.statSync(filePath);
            this.headers['content-length'] = stats.size;

            this.updateContentType();

            let self = this;
            this.body = new ReadableStream({
                start(controller) {
                    self.arrayBuffer().then(buffer => {
                        controller.enqueue(new Uint8Array(buffer));
                        controller.close();
                    })
                }
            });
        } else {
            this.status = 404;
            this.statusText = 'Not Found';
            this.body = null;
        }
    }

    /**
     * Updates the 'content-type' header property of the response based on the extension of
     * the file specified by the filePath property of the current object.
     * @function
     * @returns {void}
     */
    updateContentType() {
        // Set content-type header based on file extension
        const extension = this.filePath.toString().split('.').pop().toLowerCase();
        switch (extension) {
            case 'txt':
                this.headers['content-type'] = 'text/plain';
                break;
            case 'html':
                this.headers['content-type'] = 'text/html';
                break;
            case 'css':
                this.headers['content-type'] = 'text/css';
                break;
            case 'js':
                this.headers['content-type'] = 'text/javascript';
                break;
            case 'json':
                this.headers['content-type'] = 'application/json';
                break;
            case 'png':
                this.headers['content-type'] = 'image/png';
                break;
            case 'jpg':
            case 'jpeg':
                this.headers['content-type'] = 'image/jpeg';
                break;
            case 'gif':
                this.headers['content-type'] = 'image/gif';
                break;
            default:
                this.headers['content-type'] = 'application/octet-stream';
                break;
        }
    }

    /**
     * @function
     * @returns {FileResponse}
     */
    clone() {
        let response = new FileResponse(this.filePath);
        response.exists = this.exists;
        response.status = this.status;
        response.statusText = this.statusText;
        response.headers = this.headers;
        return response;
    }

    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with an ArrayBuffer containing the file's contents.
     * @async
     * @function
     * @returns {Promise<ArrayBuffer>} - A Promise that resolves with an ArrayBuffer containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    async arrayBuffer() {
        const data = await fs.promises.readFile(this.filePath);
        return data.buffer;
    }

    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a Blob containing the file's contents.
     * @async
     * @function
     * @returns {Promise<Blob>} - A Promise that resolves with a Blob containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    async blob() {
        const data = await fs.promises.readFile(this.filePath);
        return new Blob([data], { type: this.headers['content-type'] });
    }

    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a string containing the file's contents.
     * @async
     * @function
     * @returns {Promise<string>} - A Promise that resolves with a string containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    async text() {
        const data = await fs.promises.readFile(this.filePath, 'utf8');
        return data;
    }

    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a parsed JavaScript object containing the file's contents.
     * @async
     * @function
     * @returns {Promise<object>} - A Promise that resolves with a parsed JavaScript object containing the file's contents.
     * @throws {Error} - If the file cannot be read.
     */
    async json() {
        return JSON.parse(await this.text());
    }
}

/**
 * Determines whether the given string is a valid HTTP or HTTPS URL.
 * @function
 * @param {string|URL} string - The string to test for validity as an HTTP or HTTPS URL.
 * @returns {boolean} - True if the string is a valid HTTP or HTTPS URL, false otherwise.
 */
function isValidHttpUrl(string) {
    // https://stackoverflow.com/a/43467144
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * Helper function to get a file, using either the Fetch API or FileSystem API.
 *
 * @async
 * @function getFile
 * @param {string|URL} url - The URL of the file to get.
 * @returns {Promise<FileResponse|Response>} A promise that resolves to a FileResponse object (if the file is retrieved using the FileSystem API), or a Response object (if the file is retrieved using the Fetch API).
 */
async function getFile(url) {
    // Helper function to get a file, using either the Fetch API or FileSystem API

    if (env.useFS && !isValidHttpUrl(url)) {
        return new FileResponse(url)

    } else {
        return fetch(url)
    }
}

/**
 * Helper function to dispatch progress callbacks.
 *
 * @function dispatchCallback
 * @param {function} progressCallback - The progress callback function to dispatch.
 * @param {any} data - The data to pass to the progress callback function.
 * @returns {void}
 */
function dispatchCallback(progressCallback, data) {
    if (progressCallback !== null) progressCallback(data);
}

/**
 * Retrieves a file from either a remote URL using the Fetch API or from the local file system using the FileSystem API.
 *
 * @async
 * @function getModelFile
 * @param {string} modelPath - The path of the model file.
 * @param {string} fileName - The name of the model file.
 * @param {function} [progressCallback=null] - A function to call when the download progress is updated.
 * @returns {Promise} A Promise that resolves with the file content as a buffer.
 * @throws Will throw an error if the file is not found.
 */
async function getModelFile(modelPath, fileName, progressCallback = null, fatal = true) {

    // Initiate session
    dispatchCallback(progressCallback, {
        status: 'initiate',
        name: modelPath,
        file: fileName
    })

    let cache;
    if (env.useCache) {
        cache = await caches.open('transformers-cache');
    }

    const request = pathJoin(modelPath, fileName);

    /** @type {Response | FileResponse} */
    let response;

    /** @type {Response | FileResponse} */
    let responseToCache;

    if (!env.useCache || (response = await cache.match(request)) === undefined) {
        // Caching not available, or model is not cached, so we perform the request
        response = await getFile(request);

        if (response.status === 404) {
            if (fatal) {
                throw Error(`File not found. Could not locate "${request}".`)
            } else {
                // File not found, but this file is optional.
                // TODO in future, cache the response
                return null;
            }
        }

        if (env.useCache) {
            // only clone if cache available
            responseToCache = response.clone();
        }
    }

    // Start downloading
    dispatchCallback(progressCallback, {
        status: 'download',
        name: modelPath,
        file: fileName
    })

    const buffer = await readResponse(response, data => {
        dispatchCallback(progressCallback, {
            status: 'progress',
            ...data,
            name: modelPath,
            file: fileName
        })
    })

    // Check again whether request is in cache. If not, we add the response to the cache
    if (responseToCache !== undefined && await cache.match(request) === undefined) {
        cache.put(request, /** @type {Response} */(/** @type {unknown} */ (responseToCache)));
    }

    dispatchCallback(progressCallback, {
        status: 'done',
        name: modelPath,
        file: fileName
    });

    return buffer;
}

/**
 * Fetches a JSON file from a given path and file name.
 *
 * @param {string} modelPath - The path to the directory containing the file.
 * @param {string} fileName - The name of the file to fetch.
 * @param {function} progressCallback - A callback function to receive progress updates. Optional.
 * @returns {Promise<object>} - The JSON data parsed into a JavaScript object.
 */
async function fetchJSON(modelPath, fileName, progressCallback = null, fatal = true) {
    let buffer = await getModelFile(modelPath, fileName, progressCallback, fatal);
    if (buffer === null) {
        // Return empty object
        return {}
    }

    let decoder = new TextDecoder('utf-8');
    let jsonData = decoder.decode(buffer);

    return JSON.parse(jsonData);
}

/**
 * Read and track progress when reading a Response object
 *
 * @param {any} response - The Response object to read
 * @param {function} progressCallback - The function to call with progress updates
 * @returns {Promise<Uint8Array>} A Promise that resolves with the Uint8Array buffer
 */
async function readResponse(response, progressCallback) {
    // Read and track progress when reading a Response object

    const contentLength = response.headers.get('Content-Length');
    if (contentLength === null) {
        console.warn('Unable to determine content-length from response headers. Will expand buffer when needed.')
    }
    let total = parseInt(contentLength ?? '0');
    let buffer = new Uint8Array(total);
    let loaded = 0;

    const reader = response.body.getReader();
    async function read() {
        const { done, value } = await reader.read();
        if (done) return;

        let newLoaded = loaded + value.length;
        if (newLoaded > total) {
            total = newLoaded;

            // Adding the new data will overflow buffer.
            // In this case, we extend the buffer
            let newBuffer = new Uint8Array(total);

            // copy contents
            newBuffer.set(buffer);

            buffer = newBuffer;
        }
        buffer.set(value, loaded)
        loaded = newLoaded;

        const progress = (loaded / total) * 100;

        // Call your function here
        progressCallback({
            progress: progress,
            loaded: loaded,
            total: total,
        })

        return read();
    }

    // Actually read
    await read();

    return buffer;
}

/**
 * Joins multiple parts of a path into a single path, while handling leading and trailing slashes.
 *
 * @param {...string} parts - Multiple parts of a path.
 * @returns {string} A string representing the joined path.
 */
function pathJoin(...parts) {
    // https://stackoverflow.com/a/55142565
    parts = parts.map((part, index) => {
        if (index) {
            part = part.replace(new RegExp('^/'), '');
        }
        if (index !== parts.length - 1) {
            part = part.replace(new RegExp('/$'), '');
        }
        return part;
    })
    return parts.join('/');
}

/**
 * Reverses the keys and values of an object.
 *
 * @param {object} data - The object to reverse.
 * @returns {object} The reversed object.
 * @see https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
 */
function reverseDictionary(data) {
    // https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [value, key]));
}

/**
 * Returns the index of the maximum value in an array.
 * @param {Array} arr - The input array.
 * @see https://stackoverflow.com/a/11301464
 * @returns {number} - The index of the maximum value in the array.
 */
function indexOfMax(arr) {
    // https://stackoverflow.com/a/11301464

    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; ++i) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

/**
 * Compute the softmax of an array of numbers.
 *
 * @param {number[]} arr - The array of numbers to compute the softmax of.
 * @returns {number[]} The softmax array.
 */
function softmax(arr) {
    // Compute the maximum value in the array
    const maxVal = max(arr);

    // Compute the exponentials of the array values
    const exps = arr.map(x => Math.exp(x - maxVal));

    // Compute the sum of the exponentials
    const sumExps = exps.reduce((acc, val) => acc + val, 0);

    // Compute the softmax values
    const softmaxArr = exps.map(x => x / sumExps);

    return softmaxArr;
}

/**
 * Calculates the logarithm of the softmax function for the input array.
 * @param {number[]} arr - The input array to calculate the log_softmax function for.
 * @returns {any} - The resulting log_softmax array.
 */
function log_softmax(arr) {
    // Compute the softmax values
    const softmaxArr = softmax(arr);

    // Apply log formula to each element
    const logSoftmaxArr = softmaxArr.map(x => Math.log(x));

    return logSoftmaxArr;
}

/**
 * Escapes regular expression special characters from a string by replacing them with their escaped counterparts.
 *
 * @param {string} string - The string to escape.
 * @returns {string} - The escaped string.
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Get the top k items from an iterable, sorted by descending order
 *
 * @param {Array} items - The items to be sorted
 * @param {number} [top_k=0] - The number of top items to return (default: 0 = return all)
 * @returns {Array} - The top k items, sorted by descending order
 */
function getTopItems(items, top_k = 0) {
    // if top == 0, return all

    items = Array.from(items)
        .map((x, i) => [i, x])            // Get indices ([index, score])
        .sort((a, b) => b[1] - a[1])      // Sort by log probabilities

    if (top_k > 0) {
        items = items.slice(0, top_k);    // Get top k items
    }

    return items
}

/**
 * Calculates the dot product of two arrays.
 * @param {number[]} arr1 - The first array.
 * @param {number[]} arr2 - The second array.
 * @returns {number} - The dot product of arr1 and arr2.
 */
function dot(arr1, arr2) {
    return arr1.reduce((acc, val, i) => acc + val * arr2[i], 0);
}

/**
 * Computes the cosine similarity between two arrays.
 *
 * @param {number[]} arr1 - The first array.
 * @param {number[]} arr2 - The second array.
 * @returns {number} The cosine similarity between the two arrays.
 */
function cos_sim(arr1, arr2) {
    // Calculate dot product of the two arrays
    const dotProduct = dot(arr1, arr2);

    // Calculate the magnitude of the first array
    const magnitudeA = magnitude(arr1);

    // Calculate the magnitude of the second array
    const magnitudeB = magnitude(arr2);

    // Calculate the cosine similarity
    const cosineSimilarity = dotProduct / (magnitudeA * magnitudeB);

    return cosineSimilarity;
}

/**
 * Calculates the magnitude of a given array.
 * @param {number[]} arr - The array to calculate the magnitude of.
 * @returns {number} The magnitude of the array.
 */
function magnitude(arr) {
    return Math.sqrt(arr.reduce((acc, val) => acc + val * val, 0));
}

/**
 * A base class for creating callable objects.
 *
 * @extends Function
 */
class Callable extends Function {
    /**
    * Creates a new instance of the Callable class.
    */
    constructor() {
        super();
        /**
         * Creates a closure that delegates to a private method '_call' with the given arguments.
         *
         * @param {...any} args - Zero or more arguments to pass to the '_call' method.
         * @returns {*} - The result of calling the '_call' method.
         */
        let closure = function (...args) {
            // @ts-ignore
            return closure._call(...args)
        }
        return Object.setPrototypeOf(closure, new.target.prototype)
    }

    /**
     * This method should be implemented in subclasses to provide the
     * functionality of the callable object.
     *
     * @throws {Error} Must implement _call method in subclass
     * @param {...*} args
     */
    _call(...args) {
        throw Error('Must implement _call method in subclass')
    }
}

/**
 * Returns the minimum item.
 * @param {number[]} arr - array of numbers.
 * @returns {number} - the minimum number.
 * @throws {Error} If array is empty.
 */
function min(arr) {
    if (arr.length === 0) throw Error('Array must not be empty');
    let min = arr[0];
    for (let i = 1; i < arr.length; ++i) {
        if (arr[i] < min) {
            min = arr[i];
        }
    }
    return min;
}


/**
 * Returns the maximum item.
 * @param {number[]} arr - array of numbers.
 * @returns {number} - the maximum number.
 * @throws {Error} If array is empty.
 */
function max(arr) {
    if (arr.length === 0) throw Error('Array must not be empty');
    let max = arr[0];
    for (let i = 1; i < arr.length; ++i) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    return max;
}

/**
 * Check if a value is a string.
 * @param {*} text - The value to check.
 * @returns {boolean} - True if the value is a string, false otherwise.
 */
function isString(text) {
    return typeof text === 'string' || text instanceof String
}

/**
 * Check if a value is an integer.
 * @param {*} x - The value to check.
 * @returns {boolean} - True if the value is a string, false otherwise.
 */
function isIntegralNumber(x) {
    return Number.isInteger(x) || typeof x === 'bigint'
}

/**
 * Check if a value is exists.
 * @param {*} x - The value to check.
 * @returns {boolean} - True if the value exists, false otherwise.
 */
function exists(x) {
    return x !== undefined && x !== null;
}

module.exports = {
    Callable,
    getModelFile,
    dispatchCallback,
    fetchJSON,
    pathJoin,
    reverseDictionary,
    indexOfMax,
    softmax,
    log_softmax,
    escapeRegExp,
    getTopItems,
    dot,
    cos_sim,
    magnitude,
    getFile,
    isIntegralNumber,
    isString,
    exists,
    min,
    max,
};


/***/ }),

/***/ "?569f":
/*!********************!*\
  !*** fs (ignored) ***!
  \********************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?3f59":
/*!**********************!*\
  !*** path (ignored) ***!
  \**********************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?36f4":
/*!***********************!*\
  !*** sharp (ignored) ***!
  \***********************/
/***/ (() => {

/* (ignored) */

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/transformers.js");
/******/ 	
/******/ })()
;
//# sourceMappingURL=transformers.js.map