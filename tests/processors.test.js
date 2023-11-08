
import { env, AutoProcessor, RawImage } from '../src/transformers.js';
import { m } from './init.js';
import { compare } from './test_utils.js';

// Initialise the testing environment
env.allowLocalModels = false;
env.useFSCache = false;

const sum = (array) => {
    let sum = 0;
    for (let i = 0; i < array.length; ++i) {
        sum += array[i];
    }
    return sum;
}

describe('Processors', () => {

    describe('Image processors', () => {

        const models = [
            'caidas/swin2SR-classical-sr-x2-64',
            'facebook/sam-vit-base',
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
                compare(sum(pixel_values.data), 104.80000066757202);
            }

            { // Do not pad if already a multiple of 8 (8x8 -> 8x8)
                const image = await RawImage.fromURL(TEST_IMAGES.checkerboard_8x8);
                const { pixel_values } = await processor(image);
                compare(pixel_values.dims, [1, 3, 8, 8]);
                compare(sum(pixel_values.data), 96);
            }
        });

        // do_pad=true, "pad_size": {"height": 1024,"width": 1024 },
        it(models[1], async () => {
            const processor = await AutoProcessor.from_pretrained(m(models[1]))

            { // Basic test
                const image = await RawImage.fromURL(TEST_IMAGES.pattern_3x3);
                const { pixel_values } = await processor(image, [[[0, 0]]]);
                compare(pixel_values.dims, [1, 3, 1024, 1024]);
                compare(sum(pixel_values.data), -1417375.5943619595);
            }
        });

    })
});
