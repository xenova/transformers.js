import { createInferenceSession } from "../backends/onnx.js";
import { Tensor } from "../utils/tensor.js";

const wrap = async (session_bytes, session_options, name) => {
    const session = await createInferenceSession(
        session_bytes,
        session_options,
    );
    return async (inputs) => {
        const ortFeed = Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v.ort_tensor]));
        const outputs = await session.run(ortFeed);
        return new Tensor(outputs[name]);
    }
}

// In-memory registry of initialized ONNX operators
export class TensorOpRegistry {
    static session_options = {
        // TODO: Allow for multiple execution providers
        // executionProviders: ['webgpu'],
    };

    static get bilinear_interpolate_4d() {
        if (!this._bilinear_interpolate_4d) {
            this._bilinear_interpolate_4d = wrap(
                new Uint8Array([8, 9, 18, 0, 58, 128, 1, 10, 40, 10, 1, 120, 10, 0, 10, 0, 10, 1, 115, 18, 1, 121, 34, 6, 82, 101, 115, 105, 122, 101, 42, 17, 10, 4, 109, 111, 100, 101, 34, 6, 108, 105, 110, 101, 97, 114, 160, 1, 3, 18, 1, 114, 90, 31, 10, 1, 120, 18, 26, 10, 24, 8, 1, 18, 20, 10, 3, 18, 1, 98, 10, 3, 18, 1, 99, 10, 3, 18, 1, 104, 10, 3, 18, 1, 119, 90, 15, 10, 1, 115, 18, 10, 10, 8, 8, 7, 18, 4, 10, 2, 8, 4, 98, 31, 10, 1, 121, 18, 26, 10, 24, 8, 1, 18, 20, 10, 3, 18, 1, 98, 10, 3, 18, 1, 99, 10, 3, 18, 1, 104, 10, 3, 18, 1, 119, 66, 2, 16, 20]),
                this.session_options,
                'y',
            );
        }
        return this._bilinear_interpolate_4d;
    }

    static get bicubic_interpolate_4d() {
        if (!this._bicubic_interpolate_4d) {
            this._bicubic_interpolate_4d = wrap(
                new Uint8Array([8, 9, 18, 0, 58, 127, 10, 39, 10, 1, 120, 10, 0, 10, 0, 10, 1, 115, 18, 1, 121, 34, 6, 82, 101, 115, 105, 122, 101, 42, 16, 10, 4, 109, 111, 100, 101, 34, 5, 99, 117, 98, 105, 99, 160, 1, 3, 18, 1, 114, 90, 31, 10, 1, 120, 18, 26, 10, 24, 8, 1, 18, 20, 10, 3, 18, 1, 98, 10, 3, 18, 1, 99, 10, 3, 18, 1, 104, 10, 3, 18, 1, 119, 90, 15, 10, 1, 115, 18, 10, 10, 8, 8, 7, 18, 4, 10, 2, 8, 4, 98, 31, 10, 1, 121, 18, 26, 10, 24, 8, 1, 18, 20, 10, 3, 18, 1, 98, 10, 3, 18, 1, 99, 10, 3, 18, 1, 104, 10, 3, 18, 1, 119, 66, 2, 16, 20]),
                this.session_options,
                'y',
            );
        }
        return this._bicubic_interpolate_4d;
    }

    static get matmul() {
        if (!this._matmul) {
            this._matmul = wrap(
                new Uint8Array([8, 9, 18, 0, 58, 55, 10, 17, 10, 1, 97, 10, 1, 98, 18, 1, 99, 34, 6, 77, 97, 116, 77, 117, 108, 18, 1, 114, 90, 9, 10, 1, 97, 18, 4, 10, 2, 8, 1, 90, 9, 10, 1, 98, 18, 4, 10, 2, 8, 1, 98, 9, 10, 1, 99, 18, 4, 10, 2, 8, 1, 66, 2, 16, 20]),
                this.session_options,
                'c',
            );
        }
        return this._matmul;
    }
}
