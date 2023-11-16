
import { env, AutoProcessor, RawImage } from '../src/transformers.js';
import { m, MAX_TEST_EXECUTION_TIME } from './init.js';
import { compare } from './test_utils.js';

// Initialise the testing environment
env.allowLocalModels = false;
env.useFSCache = false;

const avg = (array) => {
    return Number(array.reduce((a, b) => a + b, array instanceof BigInt64Array ? 0n : 0)) / array.length;
}

describe('Processors', () => {

    describe('Image processors', () => {

        const IMAGE_CACHE = new Map();
        const load_image = async (url) => {
            const cached = IMAGE_CACHE.get(url);
            if (cached) {
                return cached;
            }
            const image = await RawImage.fromURL(url);
            IMAGE_CACHE.set(url, image);
            return image;
        }

        const MODELS = {
            swin2sr: 'caidas/swin2SR-classical-sr-x2-64',
            sam: 'facebook/sam-vit-base',
            'donut-swin': 'naver-clova-ix/donut-base-finetuned-cord-v2',
            resnet: 'microsoft/resnet-50',
            vit: 'google/vit-base-patch16-224',
            mobilevit: 'apple/mobilevit-small',
            mobilevit_2: 'Xenova/quickdraw-mobilevit-small',
            deit: 'facebook/deit-tiny-distilled-patch16-224',
            beit: 'microsoft/beit-base-patch16-224-pt22k-ft22k',
            detr: 'facebook/detr-resnet-50',
            yolos: 'hustvl/yolos-small-300',
            clip: 'openai/clip-vit-base-patch16',
        }

        const TEST_IMAGES = {
            pattern_3x3: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/pattern_3x3.png',
            checkerboard_8x8: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/checkerboard_8x8.png',
            receipt: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/receipt.png',
            tiger: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg',

            // grayscale image
            skateboard: 'https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/blog/ml-web-games/skateboard.png',
        }

        // Swin2SRImageProcessor
        //  - tests when padding is a number (do_pad=true, pad_size=8)
        it(MODELS.swin2sr, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.swin2sr))

            { // Pad to multiple of 8 (3x3 -> 8x8)
                const image = await load_image(TEST_IMAGES.pattern_3x3);
                const { pixel_values } = await processor(image);

                compare(pixel_values.dims, [1, 3, 8, 8]);
                compare(avg(pixel_values.data), 0.5458333368102709);
            }

            { // Do not pad if already a multiple of 8 (8x8 -> 8x8)
                const image = await load_image(TEST_IMAGES.checkerboard_8x8);
                const { pixel_values } = await processor(image);
                compare(pixel_values.dims, [1, 3, 8, 8]);
                compare(avg(pixel_values.data), 0.5);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // SamProcessor/SamImageProcessor
        //  - tests normal padding (do_pad=true, pad_size={"height":1024,"width":1024})
        //  - In addition to the image, pass in a list of points
        it(MODELS.sam, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.sam))

            { // Basic test
                const image = await load_image(TEST_IMAGES.pattern_3x3);
                const { pixel_values } = await processor(image, [[[0, 0]]]);
                compare(pixel_values.dims, [1, 3, 1024, 1024]);
                compare(avg(pixel_values.data), -0.4505715670146813);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // DonutProcessor/DonutFeatureExtractor
        //  - tests thumbnail resizing (do_thumbnail=true, size=[960, 1280])
        it(MODELS['donut-swin'], async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS['donut-swin']))

            {
                const image = await load_image(TEST_IMAGES.receipt);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 1280, 960]);
                compare(avg(pixel_values.data), 0.1229388610053704);

                compare(original_sizes, [[864, 576]]);
                compare(reshaped_input_sizes, [[1280, 853]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // ConvNextFeatureExtractor
        it(MODELS.resnet, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.resnet))

            {
                const image = await load_image(TEST_IMAGES.tiger);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 224, 336]);
                compare(avg(pixel_values.data), -0.27736667280600913);

                compare(original_sizes, [[408, 612]]);
                compare(reshaped_input_sizes, [[224, 336]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // ViTFeatureExtractor
        it(MODELS.vit, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.vit))

            {
                const image = await load_image(TEST_IMAGES.tiger);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 224, 224]);
                compare(avg(pixel_values.data), -0.22706867939852762);

                compare(original_sizes, [[408, 612]]);
                compare(reshaped_input_sizes, [[224, 224]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // MobileViTFeatureExtractor
        it(MODELS.mobilevit, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.mobilevit))

            {
                const image = await load_image(TEST_IMAGES.tiger);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 256, 256]);
                compare(avg(pixel_values.data), 0.4599160496887033);

                compare(original_sizes, [[408, 612]]);
                compare(reshaped_input_sizes, [[256, 256]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // MobileViTFeatureExtractor
        //  - tests not converting to rgb (do_convert_rgb=false)
        it(MODELS.mobilevit_2, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.mobilevit_2))

            { // Tests grayscale image
                const image = await load_image(TEST_IMAGES.skateboard);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 1, 28, 28]);
                compare(avg(pixel_values.data), 0.08558923671585128);

                compare(original_sizes, [[28, 28]]);
                compare(reshaped_input_sizes, [[28, 28]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // DeiTFeatureExtractor
        it(MODELS.deit, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.deit))

            {
                const image = await load_image(TEST_IMAGES.tiger);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 224, 224]);
                compare(avg(pixel_values.data), -0.2760336682859463);

                compare(original_sizes, [[408, 612]]);
                compare(reshaped_input_sizes, [[224, 224]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // BeitFeatureExtractor
        it(MODELS.beit, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.beit))

            {
                const image = await load_image(TEST_IMAGES.tiger);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 224, 224]);
                compare(avg(pixel_values.data), -0.22706867939852762);

                compare(original_sizes, [[408, 612]]);
                compare(reshaped_input_sizes, [[224, 224]]);
            }
        }, MAX_TEST_EXECUTION_TIME);


        // DetrFeatureExtractor
        it(MODELS.detr, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.detr))

            {
                const image = await load_image(TEST_IMAGES.tiger);
                const { pixel_values, original_sizes, reshaped_input_sizes, pixel_mask } = await processor(image);

                compare(pixel_values.dims, [1, 3, 888, 1333]);
                compare(avg(pixel_values.data), -0.27840224131001773);

                compare(original_sizes, [[408, 612]]);
                compare(reshaped_input_sizes, [[888, 1333]]);

                compare(pixel_mask.dims, [1, 64, 64]);
                compare(avg(pixel_mask.data), 1);

            }
        }, MAX_TEST_EXECUTION_TIME);


        // YolosFeatureExtractor
        it(MODELS.yolos, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.yolos))

            {
                const image = await load_image(TEST_IMAGES.tiger);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 888, 1333]);
                compare(avg(pixel_values.data), -0.27840224131001773);

                compare(original_sizes, [[408, 612]]);
                compare(reshaped_input_sizes, [[888, 1333]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // CLIPFeatureExtractor
        //  - tests center crop (do_center_crop=true, crop_size=224)
        it(MODELS.clip, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.clip))

            {
                const image = await load_image(TEST_IMAGES.tiger);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 224, 224]);
                compare(avg(pixel_values.data), -0.06678297738282096);

                compare(original_sizes, [[408, 612]]);
                compare(reshaped_input_sizes, [[224, 224]]);
            }
        }, MAX_TEST_EXECUTION_TIME);
    });
});
