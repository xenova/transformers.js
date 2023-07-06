
import { AutoProcessor, Tensor } from '../src/transformers.js';

import { MAX_TEST_EXECUTION_TIME, m } from './init.js';
import { compare } from './test_utils.js';

import { cat } from '../src/utils/tensor.js';

describe('Tensor operations', () => {



    describe('cat', () => {

        it('should concatenate on dim=0', async () => {
            const t1 = new Tensor('float32', [1, 2, 3], [1, 3]);
            const t2 = new Tensor('float32', [4, 5, 6, 7, 8, 9], [2, 3]);
            const t3 = new Tensor('float32', [10, 11, 12], [1, 3]);

            const target1 = new Tensor('float32', [1, 2, 3, 4, 5, 6, 7, 8, 9], [3, 3]);
            const target2 = new Tensor('float32', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [4, 3]);

            // 2 tensors
            const concatenated1 = cat([t1, t2], 0);
            compare(concatenated1, target1, 1e-3);

            // 3 tensors
            const concatenated2 = cat([t1, t2, t3], 0);
            compare(concatenated2, target2, 1e-3);
        });


        it('should concatenate on dim=1', async () => {
            const t1 = new Tensor('float32', [1, 2, 3, -1, -2, -3], [2, 3, 1]);
            const t2 = new Tensor('float32', [4, -4], [2, 1, 1]);
            const t3 = new Tensor('float32', [5, 6, -5, -6], [2, 2, 1]);

            const target1 = new Tensor('float32', [1, 2, 3, 4, -1, -2, -3, -4], [2, 4, 1]);
            const target2 = new Tensor('float32', [1, 2, 3, 4, 5, 6, -1, -2, -3, -4, -5, -6], [2, 6, 1]);

            // 2 tensors
            const concatenated1 = cat([t1, t2], 1);
            compare(concatenated1, target1, 1e-3);

            // 3 tensors
            const concatenated2 = cat([t1, t2, t3], 1);
            compare(concatenated2, target2, 1e-3);
        });
    });
});
