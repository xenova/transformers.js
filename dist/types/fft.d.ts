export = FFT;
declare class FFT {
    constructor(size: any);
    size: number;
    _csize: number;
    table: Float64Array;
    _width: number;
    _bitrev: Int32Array;
    createComplexArray(): Float64Array;
    fromComplexArray(complex: any, storage: any): any;
    toComplexArray(input: any, storage: any): any;
    completeSpectrum(spectrum: any): void;
    transform(out: any, data: any): void;
    realTransform(out: any, data: any): void;
    inverseTransform(out: any, data: any): void;
    _transform4(out: any, data: any, inv: any): void;
    _singleTransform2(data: any, out: any, outOff: any, off: any, step: any): void;
    _singleTransform4(data: any, out: any, outOff: any, off: any, step: any, inv: any): void;
    _realTransform4(out: any, data: any, inv: any): void;
    _singleRealTransform2(data: any, out: any, outOff: any, off: any, step: any): void;
    _singleRealTransform4(data: any, out: any, outOff: any, off: any, step: any, inv: any): void;
}
