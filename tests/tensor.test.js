
import { AutoProcessor, Tensor } from '../src/transformers.js';

import { MAX_TEST_EXECUTION_TIME, m } from './init.js';
import { compare } from './test_utils.js';

import { cat, mean, stack } from '../src/utils/tensor.js';

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


        it('should concatenate on dim=-2', async () => {

            const t1 = new Tensor('float32', [1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 15, 16], [2, 1, 3, 2]);
            const t2 = new Tensor('float32', [7, 8, 9, 10, 17, 18, 19, 20], [2, 1, 2, 2]);

            const target = new Tensor('float32', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], [2, 1, 5, 2]);

            const concatenated = cat([t1, t2], -2);

            compare(concatenated, target, 1e-3);

        });

        // TODO add tests for errors
    });

    describe('stack', () => {

        const t1 = new Tensor('float32', [0, 1, 2, 3, 4, 5], [1, 3, 2]);

        it('should stack on dim=0', async () => {
            const target1 = new Tensor('float32', [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5], [2, 1, 3, 2]);
            const target2 = new Tensor('float32', [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5], [3, 1, 3, 2]);

            // 2 tensors
            const stacked1 = stack([t1, t1], 0);
            compare(stacked1, target1, 1e-3);

            // 3 tensors
            const stacked2 = stack([t1, t1, t1], 0);
            compare(stacked2, target2, 1e-3);
        });

        it('should stack on dim=1', async () => {
            const target1 = new Tensor('float32', [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5], [1, 2, 3, 2]);
            const target2 = new Tensor('float32', [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5], [1, 3, 3, 2]);

            // 2 tensors
            const stacked1 = stack([t1, t1], 1);
            compare(stacked1, target1, 1e-3);

            // 3 tensors
            const stacked2 = stack([t1, t1, t1], 1);
            compare(stacked2, target2, 1e-3);
        });

        it('should stack on dim=-1', async () => {
            const target1 = new Tensor('float32', [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5], [1, 3, 2, 2]);
            const target2 = new Tensor('float32', [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5], [1, 3, 2, 3]);

            // 2 tensors
            const stacked1 = stack([t1, t1], -1);
            compare(stacked1, target1, 1e-3);

            // 3 tensors
            const stacked2 = stack([t1, t1, t1], -1);
            compare(stacked2, target2, 1e-3);
        });
    });


    describe('mean', () => {
        it('should calculate mean', async () => {
            const t1 = new Tensor('float32', [1, 2, 3, 4, 5, 6], [2, 3, 1]);
            
            const target = new Tensor('float32', [3.5], []);

            const target0 = new Tensor('float32', [2.5, 3.5, 4.5], [3, 1]);
            const target1 = new Tensor('float32', [2, 5], [2, 1]);
            const target2 = new Tensor('float32', [1, 2, 3, 4, 5, 6], [2, 3]);

            let avg = mean(t1);
            compare(avg, target, 1e-3);

            let avg0 = mean(t1, 0);
            compare(avg0, target0, 1e-3);

            let avg1 = mean(t1, 1);
            compare(avg1, target1, 1e-3);
            
            let avg2 = mean(t1, 2);
            compare(avg2, target2, 1e-3);

        })
    });
});
