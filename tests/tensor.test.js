
import { AutoProcessor, Tensor } from '../src/transformers.js';

import { MAX_TEST_EXECUTION_TIME, m } from './init.js';
import { compare } from './test_utils.js';

import { cat } from '../src/utils/tensor.js';

describe('Tensor operations', () => {



    describe('cat', () => {

        it('should concatenate on dim=0', async () => {
            const t1 = new Tensor('float32', [1, 2, 3], [1, 3]);
            const t2 = new Tensor('float32', [4, 5, 6, 7, 8, 9], [2, 3]);
            const t3 = new Tensor('float32', [1, 2, 3, 4, 5, 6, 7, 8, 9], [3, 3]);

            const concatenated = cat([t1, t2], 0);
            compare(concatenated, t3, 1e-3);
        });


        it('should concatenate on dim=1', async () => {
            const t1 = new Tensor('float32', [1, 2, 3, -1, -2, -3], [2, 3, 1]);
            const t2 = new Tensor('float32', [4, -4], [2, 1, 1]);
            const t3 = new Tensor('float32', [1, 2, 3, 4, -1, -2, -3, -4], [2, 4, 1]);

            const concatenated = cat([t1, t2], 1);
            compare(concatenated, t3, 1e-3);

        });
    });
});
