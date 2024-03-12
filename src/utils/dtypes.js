
export const DATA_TYPES = Object.freeze({
    fp32: 'fp32',
    fp16: 'fp16',
    int8: 'int8',
    uint8: 'uint8',

    // Aliases (same as torch.float32 and torch.float16)
    float32: 'fp32',
    float16: 'fp16',
});

/** @typedef {keyof typeof DATA_TYPES} DataType */
