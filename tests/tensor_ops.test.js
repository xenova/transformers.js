import { Tensor, interpolate_4d } from '../src/utils/tensor.js';
import { init } from './init.js';

// Initialise the testing environment
init();

function expectToBeCloseToArray(actual, expected) {
    expect(actual.length).toEqual(expected.length)
    actual.forEach((x, i) => expect(x).toBeCloseTo(expected[i]))
}

describe('Tensor operations', () => {

    describe('interpolate', () => {
        const input = new Tensor('float32', new Float32Array(2 * 3 * 4 * 5).map((_, i) => i), [2, 3, 4, 5]);

        const size = [2, 3, 3, 2];
        it('bilinear', async () => {
            const resized = await interpolate_4d(
                input,
                { mode: 'bilinear', size },
            );
            const target = new Float32Array([
                [
                    [
                        [1.5833335, 4.0833335],
                        [8.25, 10.75],
                        [14.916668, 17.416668]
                    ],
                    [
                        [21.583332, 24.083334],
                        [28.25, 30.75],
                        [34.916668, 37.416668]
                    ],
                    [
                        [41.583332, 44.083332],
                        [48.25, 50.75],
                        [54.916668, 57.416668]
                    ]
                ],
                [
                    [
                        [61.583332, 64.083336],
                        [68.25, 70.75],
                        [74.916664, 77.41667]
                    ],
                    [
                        [81.58333, 84.083336],
                        [88.25, 90.75],
                        [94.91667, 97.41667]
                    ],
                    [
                        [101.583336, 104.08333],
                        [108.25, 110.75],
                        [114.916664, 117.416664]
                    ]
                ]
            ].flat(Infinity));

            expectToBeCloseToArray(target, resized.data);
        });

        it('bicubic', async () => {
            const resized = await interpolate_4d(
                input,
                { mode: 'bicubic', size },
            );

            const target = new Float32Array([
                [
                    [
                        [1.2987545, 3.9628172],
                        [8.167969, 10.832031],
                        [15.037184, 17.701244]
                    ],
                    [
                        [21.298756, 23.962818],
                        [28.167969, 30.832031],
                        [35.037186, 37.701252]
                    ],
                    [
                        [41.298756, 43.96282],
                        [48.16797, 50.83203],
                        [55.037193, 57.701256]
                    ]
                ],
                [
                    [
                        [61.29875, 63.96282],
                        [68.16797, 70.83203],
                        [75.03719, 77.701256]
                    ],
                    [
                        [81.29875, 83.96282],
                        [88.16797, 90.83203],
                        [95.03721, 97.70126]
                    ],
                    [
                        [101.29875, 103.962814],
                        [108.16797, 110.83203],
                        [115.03721, 117.70127]
                    ]
                ]
            ].flat(Infinity));

            expectToBeCloseToArray(target, resized.data);
        });
    });
});
