
import { compare } from './test_utils.js';

import { medianFilter } from '../src/utils/maths.js';

describe('Mathematical operations', () => {

    describe('median filtering', () => {


        it('should compute median filter', async () => {
            const t1 = new Float32Array([5, 12, 2, 6, 3, 10, 9, 1, 4, 8, 11, 7]);
            const window = 3;
            
            const target = new Float32Array([12,  5,  6,  3,  6,  9,  9,  4,  4,  8,  8, 11]);

            const output = medianFilter(t1, window);
            compare(output, target, 1e-3);
        });


        // TODO add tests for errors
    });

});
