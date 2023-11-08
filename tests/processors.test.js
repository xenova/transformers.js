
import { env, AutoProcessor, RawImage } from '../src/transformers.js';
import { m } from './init.js';
import { compare } from './test_utils.js';

// Initialise the testing environment
env.allowLocalModels = false;
env.useFSCache = false;

describe('Processors', () => {

    describe('Image processors', () => {

        const models = [
            'caidas/swin2SR-classical-sr-x2-64',
        ];
        const TEST_IMAGES = {
            pattern_3x3: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/pattern_3x3.png',
            checkerboard_8x8: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/checkerboard_8x8.png',
        }

        // do_pad=true, pad_size=8
        it(models[0], async () => {
            const processor = await AutoProcessor.from_pretrained(m(models[0]))

            { // Pad to multiple of 8 (3x3 -> 8x8)
                const image = await RawImage.fromURL(TEST_IMAGES.pattern_3x3);
                const { pixel_values } = await processor(image);

                compare(pixel_values.dims, [1, 3, 8, 8]);
                compare(pixel_values.data.reduce((a, b) => a + b, 0), 104.80000066757202);
            }

            { // Do not pad if already a multiple of 8 (8x8 -> 8x8)
                const image = await RawImage.fromURL(TEST_IMAGES.checkerboard_8x8);
                const { pixel_values } = await processor(image);
                compare(pixel_values.dims, [1, 3, 8, 8]);
                compare(pixel_values.data.reduce((a, b) => a + b, 0), 96);
            }
        });

    })
});
