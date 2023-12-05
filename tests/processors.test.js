
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
            dpt: 'Intel/dpt-hybrid-midas',
            glpn: 'vinvino02/glpn-kitti',
            nougat: 'facebook/nougat-small',
            owlvit: 'google/owlvit-base-patch32',
            clip: 'openai/clip-vit-base-patch16',
        }

        const TEST_IMAGES = {
            pattern_3x3: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/pattern_3x3.png',
            checkerboard_8x8: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/checkerboard_8x8.png',
            receipt: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/receipt.png',
            tiger: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg',
            paper: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/nougat_paper.png',
            cats: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg',

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
        //  - tests padding after normalization (image_mean=image_std=0.5)
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

        // DPTFeatureExtractor
        it(MODELS.dpt, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.dpt))

            { // Tests grayscale image
                const image = await load_image(TEST_IMAGES.cats);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 384, 384]);
                compare(avg(pixel_values.data), 0.0372855559389454);

                compare(original_sizes, [[480, 640]]);
                compare(reshaped_input_sizes, [[384, 384]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // GLPNForDepthEstimation
        //  - tests `size_divisor` and no size (size_divisor=32)
        it(MODELS.glpn, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.glpn))

            {
                const image = await load_image(TEST_IMAGES.cats);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);
                compare(pixel_values.dims, [1, 3, 480, 640]);
                compare(avg(pixel_values.data), 0.5186172404123327);

                compare(original_sizes, [[480, 640]]);
                compare(reshaped_input_sizes, [[480, 640]]);
            }

            { // Tests input which is not a multiple of 32 ([408, 612] -> [384, 608])
                const image = await load_image(TEST_IMAGES.tiger);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 384, 608]);
                compare(avg(pixel_values.data), 0.38628831535989555);

                compare(original_sizes, [[408, 612]]);
                compare(reshaped_input_sizes, [[384, 608]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // NougatImageProcessor
        //  - tests padding after normalization (image_mean != 0.5, image_std != 0.5)
        it(MODELS.nougat, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.nougat))

            {
                const image = await load_image(TEST_IMAGES.paper);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 896, 672]);
                compare(avg(pixel_values.data), 1.8447155005897355);

                compare(original_sizes, [[850, 685]]);
                compare(reshaped_input_sizes, [[833, 672]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // OwlViTFeatureExtractor
        it(MODELS.owlvit, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.owlvit))
            {
                const image = await load_image(TEST_IMAGES.cats);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 768, 768]);
                compare(avg(pixel_values.data), 0.250620447910435);

                compare(original_sizes, [[480, 640]]);
                compare(reshaped_input_sizes, [[768, 768]]);
            }
        });

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

    describe('Audio processors', () => {
        const audioPromise = new Promise(async (resolve) => {
            const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/mlk.npy';
            const buffer = await (await fetch(url)).arrayBuffer();
            const audio = Float32Array.from(new Float64Array(buffer));
            resolve(audio);
        });

        it('WhisperFeatureExtractor', async () => {
            const audio = await audioPromise;
            const processor = await AutoProcessor.from_pretrained('Xenova/whisper-tiny.en');
            const { input_features } = await processor(audio);
            compare(input_features.dims, [1, 80, 3000]);
            expect(avg(input_features.data)).toBeCloseTo(-0.2813588131551941);
            expect(input_features.data[0]).toBeCloseTo(0.33168578147888184);
            expect(input_features.data[1]).toBeCloseTo(0.30986475944519043);
            expect(input_features.data[81]).toBeCloseTo(0.10727232694625854);
            expect(input_features.data[3001]).toBeCloseTo(0.2555035352706909);
        }, MAX_TEST_EXECUTION_TIME);

        it('ASTFeatureExtractor', async () => {
            const audio = await audioPromise;
            const processor = await AutoProcessor.from_pretrained('Xenova/ast-finetuned-audioset-10-10-0.4593');
            { // truncation
                const { input_values } = await processor(audio);
                compare(input_values.dims, [1, 1024, 128]);

                expect(avg(input_values.data)).toBeCloseTo(-0.04054912979309085);
                expect(input_values.data[0]).toBeCloseTo(-0.5662586092948914);
                expect(input_values.data[1]).toBeCloseTo(-1.0300861597061157);
                expect(input_values.data[129]).toBeCloseTo(-1.084834098815918);
                expect(input_values.data[1025]).toBeCloseTo(-1.1204065084457397);
            }
            { // padding
                const { input_values } = await processor(audio.slice(0, 1000));
                compare(input_values.dims, [1, 1024, 128]); // [1, 4, 128] -> (padded to) -> [1, 1024, 128]

                expect(avg(input_values.data)).toBeCloseTo(0.4647964835166931);
                expect(input_values.data[0]).toBeCloseTo(-0.5662586092948914);
                expect(input_values.data[1]).toBeCloseTo(-1.0300861597061157);
                expect(input_values.data[129]).toBeCloseTo(-1.084834098815918);

                // padded values
                expect(input_values.data[1025]).toBeCloseTo(0.46703237295150757);
                expect(input_values.data[2049]).toBeCloseTo(0.46703237295150757);
                expect(input_values.data[10000]).toBeCloseTo(0.46703237295150757);
            }
        }, MAX_TEST_EXECUTION_TIME);

        it('ClapFeatureExtractor', async () => {
            const audio = await audioPromise;
            const processor = await AutoProcessor.from_pretrained('Xenova/clap-htsat-unfused');
            { // truncation
                // Since truncation uses a random strategy, we override
                // Math.random to ensure that the test is deterministic
                const originalRandom = Math.random;
                Math.random = () => 0.5;

                let long_audio = new Float32Array(500000);
                long_audio.set(audio);
                long_audio.set(audio, long_audio.length - audio.length);

                const { input_features } = await processor(long_audio);
                compare(input_features.dims, [1, 1, 1001, 64]);

                expect(avg(input_features.data)).toBeCloseTo(-37.94569396972656);
                expect(input_features.data[0]).toBeCloseTo(-53.32647705078125);
                expect(input_features.data[1]).toBeCloseTo(-47.76755142211914);
                expect(input_features.data[65]).toBeCloseTo(-36.32261276245117);
                expect(input_features.data[1002]).toBeCloseTo(-28.0314884185791);
                expect(input_features.data[10000]).toBeCloseTo(-21.905902862548828);
                expect(input_features.data[60000]).toBeCloseTo(-14.877863883972168);
                expect(input_features.data[64062]).toBeCloseTo(-37.9784049987793);
                expect(input_features.data[64063]).toBeCloseTo(-37.73963928222656);

                // Reset Math.random
                Math.random = originalRandom;
            }
            { // padding
                const { input_features } = await processor(audio);
                compare(input_features.dims, [1, 1, 1001, 64]);

                expect(avg(input_features.data)).toBeCloseTo(-34.99049377441406);
                expect(input_features.data[0]).toBeCloseTo(-21.32573890686035);
                expect(input_features.data[1]).toBeCloseTo(-26.168411254882812);
                expect(input_features.data[65]).toBeCloseTo(-29.716018676757812);
                expect(input_features.data[1002]).toBeCloseTo(-32.16273498535156);
                expect(input_features.data[10000]).toBeCloseTo(-19.9283390045166);

                // padded values
                expect(input_features.data[60000]).toBeCloseTo(-100.0);
                expect(input_features.data[64062]).toBeCloseTo(-100.0);
                expect(input_features.data[64063]).toBeCloseTo(-100.0);
            }


        }, MAX_TEST_EXECUTION_TIME);
    });
});
