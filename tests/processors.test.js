
import { env, AutoProcessor, RawImage } from '../src/transformers.js';
import { m, MAX_TEST_EXECUTION_TIME } from './init.js';
import { compare } from './test_utils.js';

// Initialise the testing environment
env.allowLocalModels = false;
env.useFSCache = false;

const sum = array => Number(array.reduce((a, b) => a + b, array instanceof BigInt64Array ? 0n : 0));
const avg = array => sum(array) / array.length;

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
            dpt_2: 'LiheYoung/depth-anything-small-hf',
            glpn: 'vinvino02/glpn-kitti',
            nougat: 'facebook/nougat-small',
            owlvit: 'google/owlvit-base-patch32',
            clip: 'openai/clip-vit-base-patch16',
            vitmatte: 'hustvl/vitmatte-small-distinctions-646',
            dinov2: 'facebook/dinov2-small-imagenet1k-1-layer',
            efficientnet: 'google/efficientnet-b0',
        }

        const TEST_IMAGES = {
            pattern_3x3: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/pattern_3x3.png',
            pattern_3x5: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/pattern_3x5.png',
            checkerboard_8x8: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/checkerboard_8x8.png',
            checkerboard_64x32: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/checkerboard_64x32.png',
            receipt: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/receipt.png',
            tiger: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg',
            paper: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/nougat_paper.png',
            cats: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg',

            // grayscale image
            skateboard: 'https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/blog/ml-web-games/skateboard.png',

            vitmatte_image: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/vitmatte_image.png',
            vitmatte_trimap: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/vitmatte_trimap.png',
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

            { // without input points
                const image = await load_image(TEST_IMAGES.pattern_3x3);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);
                compare(pixel_values.dims, [1, 3, 1024, 1024]);
                compare(avg(pixel_values.data), -0.4505715670146813);

                compare(original_sizes, [[3, 3]]);
                compare(reshaped_input_sizes, [[1024, 1024]]);
            }

            { // with input points
                const image = await load_image(TEST_IMAGES.pattern_3x3);
                const { original_sizes, reshaped_input_sizes, input_points } = await processor(image, [[[1, 2]]]);

                compare(original_sizes, [[3, 3]]);
                compare(reshaped_input_sizes, [[1024, 1024]]);
                compare(input_points.tolist(), [[[[341.3333, 682.6667]]]]);
            }

            { // multiple points with labels
                const image = await load_image(TEST_IMAGES.pattern_3x3);
                const { original_sizes, reshaped_input_sizes, input_points, input_labels } = await processor(image, [[[1, 2], [2, 1]]], [[1, 0]]);

                compare(original_sizes, [[3, 3]]);
                compare(reshaped_input_sizes, [[1024, 1024]]);
                compare(input_points.tolist(), [[[[341.3333, 682.6667], [682.6667, 341.3333]]]]);
                compare(input_labels.tolist(), [[[1n, 0n]]]);
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

                compare(pixel_values.dims, [1, 3, 224, 224]);
                compare(avg(pixel_values.data), 0.06262318789958954);

                compare(original_sizes, [[408, 612]]);
                compare(reshaped_input_sizes, [[224, 224]]);
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

        // VitMatteImageProcessor
        //  - tests custom overrides
        //  - tests multiple inputs
        //  - tests `size_divisibility` and no size (size_divisibility=32)
        //  - tests do_pad and `size_divisibility`
        it(MODELS.vitmatte, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.vitmatte))

            {
                const image = await load_image(TEST_IMAGES.vitmatte_image);
                const image2 = await load_image(TEST_IMAGES.vitmatte_trimap);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image, image2);

                compare(pixel_values.dims, [1, 4, 640, 960]);
                expect(avg(pixel_values.data)).toBeCloseTo(-0.4028555154800415);
                expect(pixel_values.data[0]).toBeCloseTo(-0.9921568632125854);
                expect(pixel_values.data[1]).toBeCloseTo(-0.9921568632125854);
                expect(pixel_values.data[5]).toBeCloseTo(-1.0);
                expect(pixel_values.data[640]).toBeCloseTo(-0.6784313917160034);
                expect(pixel_values.data[641]).toBeCloseTo(-0.6705882549285889);
                expect(pixel_values.data[640 * 960]).toBeCloseTo(-1.0);
                expect(pixel_values.data[640 * 960 + 1]).toBeCloseTo(-1.0);
                expect(pixel_values.data.at(-1)).toBeCloseTo(0.0);

                compare(original_sizes, [[640, 960]]);
                compare(reshaped_input_sizes, [[640, 960]]);
            }


            {
                const image = await load_image(TEST_IMAGES.pattern_3x5);
                const image2 = await load_image(TEST_IMAGES.pattern_3x5);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image, image2);

                compare(pixel_values.dims, [1, 4, 32, 32]);
                expect(avg(pixel_values.data)).toBeCloseTo(-0.00867417361587286);
                expect(pixel_values.data[0]).toBeCloseTo(-0.9921568632125854);
                expect(pixel_values.data[1]).toBeCloseTo(-0.9686274528503418);
                expect(pixel_values.data[5]).toBeCloseTo(0.0);
                expect(pixel_values.data[32]).toBeCloseTo(-0.9215686321258545);
                expect(pixel_values.data[33]).toBeCloseTo(-0.8980392217636108);
                expect(pixel_values.data.at(-1)).toBeCloseTo(0.0);

                compare(original_sizes, [[5, 3]]);
                compare(reshaped_input_sizes, [[5, 3]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // BitImageProcessor
        it(MODELS.dinov2, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.dinov2))

            {
                const image = await load_image(TEST_IMAGES.tiger);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 224, 224]);
                compare(avg(pixel_values.data), 0.06262318789958954);

                compare(original_sizes, [[408, 612]]);
                compare(reshaped_input_sizes, [[224, 224]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // DPTImageProcessor
        //  - tests ensure_multiple_of
        //  - tests keep_aspect_ratio
        //  - tests bankers rounding
        it(MODELS.dpt_2, async () => {
            const processor = await AutoProcessor.from_pretrained(m(MODELS.dpt_2))

            {
                const image = await load_image(TEST_IMAGES.cats);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 518, 686]);
                compare(avg(pixel_values.data), 0.30337387323379517);

                compare(original_sizes, [[480, 640]]);
                compare(reshaped_input_sizes, [[518, 686]]);
            }

            {
                const image = await load_image(TEST_IMAGES.checkerboard_64x32);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                // NOTE: without bankers rounding, this would be [1, 3, 266, 518]
                compare(pixel_values.dims, [1, 3, 252, 518]);
                compare(avg(pixel_values.data), 0.2267402559518814);

                compare(original_sizes, [[32, 64]]);
                compare(reshaped_input_sizes, [[252, 518]]);
            }
        }, MAX_TEST_EXECUTION_TIME);

        // EfficientNetImageProcessor
        //  - tests include_top
        it(MODELS.efficientnet, async () => {
            const processor = await AutoProcessor.from_pretrained(MODELS.efficientnet)

            {
                const image = await load_image(TEST_IMAGES.cats);
                const { pixel_values, original_sizes, reshaped_input_sizes } = await processor(image);

                compare(pixel_values.dims, [1, 3, 224, 224]);
                compare(avg(pixel_values.data), 0.3015307230282871);

                compare(original_sizes, [[480, 640]]);
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

        it('SeamlessM4TFeatureExtractor', async () => {
            const audio = await audioPromise;
            const processor = await AutoProcessor.from_pretrained('Xenova/wav2vec2-bert-CV16-en');
            { // normal
                console.log({ audio })
                const { input_features, attention_mask } = await processor(audio);
                compare(input_features.dims, [1, 649, 160]);
                compare(attention_mask.dims, [1, 649]);

                expect(avg(input_features.data)).toBeCloseTo(-2.938903875815413e-08);
                expect(input_features.data[0]).toBeCloseTo(1.1939343214035034);
                expect(input_features.data[1]).toBeCloseTo(0.7874255180358887);
                expect(input_features.data[160]).toBeCloseTo(-0.712975025177002);
                expect(input_features.data[161]).toBeCloseTo(0.045802414417266846);
                expect(input_features.data.at(-1)).toBeCloseTo(-1.3328346014022827);

                expect(sum(attention_mask.data)).toEqual(649);
            }
            { // padding (pad_to_multiple_of=2)
                const { input_features, attention_mask } = await processor(audio.slice(0, 10000));

                // [1, 61, 80] -> [1, 62, 80] -> [1, 31, 160]
                compare(input_features.dims, [1, 31, 160]);
                compare(attention_mask.dims, [1, 31]);

                expect(avg(input_features.data)).toBeCloseTo(0.01612919569015503);
                expect(input_features.data[0]).toBeCloseTo(0.9657132029533386);
                expect(input_features.data[1]).toBeCloseTo(0.12912897765636444);
                expect(input_features.data[160]).toBeCloseTo(-1.2364212274551392);
                expect(input_features.data[161]).toBeCloseTo(-0.9703778028488159);
                expect(input_features.data.at(-1)).toBeCloseTo(1); // padding value

                expect(sum(attention_mask.data)).toEqual(30);
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
