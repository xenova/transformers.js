
import { AutoModelForVision2Seq, pipeline, RawImage, AutoProcessor } from '../src/transformers.js';
import { init, m, MAX_TEST_EXECUTION_TIME } from './init.js';
import { compare } from './test_utils.js';

// Initialise the testing environment
init();

describe('Generation parameters', () => {

    // List all models which will be tested
    const models = [
        'MBZUAI/LaMini-Flan-T5-77M', // encoder-decoder
        'MBZUAI/LaMini-GPT-124M', // decoder-only
        'fxmarty/pix2struct-tiny-random', // vision-encoder + text-decoder
    ];

    // encoder-decoder model
    it(models[0], async () => {
        const text = 'how can I become more healthy?';

        const generator = await pipeline('text2text-generation', m(models[0]));

        // default
        // NOTE: Since `max_length` defaults to 20, this case also tests that.
        {
            const outputs = await generator(text);

            const tokens = generator.tokenizer.encode(outputs[0].generated_text)
            expect(tokens.length).toEqual(20);
        }

        // max_new_tokens
        {
            // NOTE: Without setting `min_new_tokens` (but setting `max_new_tokens`), 64 tokens are generated.
            // So, the following tests are valid.
            const MAX_NEW_TOKENS = 20;
            const outputs = await generator(text, {
                max_new_tokens: MAX_NEW_TOKENS,
            });

            const tokens = generator.tokenizer.encode(outputs[0].generated_text)
            expect(tokens.length).toEqual(MAX_NEW_TOKENS + 1); // + 1 due to forced BOS token
        }

        // min_length
        {
            // NOTE: Without setting `min_length` (but setting `max_new_tokens`), 64 tokens are generated.
            // So, the following tests are valid.
            const MAX_NEW_TOKENS = 128;
            const MIN_LENGTH = 65;
            const outputs = await generator(text, {
                max_new_tokens: MAX_NEW_TOKENS,
                min_length: MIN_LENGTH,
            });

            const tokens = generator.tokenizer.encode(outputs[0].generated_text)
            expect(tokens.length).toBeGreaterThanOrEqual(MIN_LENGTH);
        }

        // min_new_tokens
        {
            // NOTE: Without setting `min_new_tokens` (but setting `max_new_tokens`), 64 tokens are generated.
            // So, the following tests are valid.
            const MAX_NEW_TOKENS = 128;
            const MIN_NEW_TOKENS = 65;
            const outputs = await generator(text, {
                max_new_tokens: MAX_NEW_TOKENS,
                min_new_tokens: MIN_NEW_TOKENS,
            });

            const tokens = generator.tokenizer.encode(outputs[0].generated_text)
            expect(tokens.length).toBeGreaterThanOrEqual(MIN_NEW_TOKENS);
        }

        await generator.dispose();

    }, MAX_TEST_EXECUTION_TIME);

    // decoder-only model
    it(models[1], async () => {
        const text = "### Instruction:\nTrue or False: The earth is flat?\n\n### Response: ";

        const generator = await pipeline('text-generation', m(models[1]));

        // default
        // NOTE: Since `max_length` defaults to 20, this case also tests that.
        {
            const outputs = await generator(text);
            const tokens = generator.tokenizer.encode(outputs[0].generated_text)
            expect(tokens.length).toEqual(20);
        }

        // max_new_tokens
        {
            const MAX_NEW_TOKENS = 20;
            const outputs = await generator(text, {
                max_new_tokens: MAX_NEW_TOKENS,
            });
            const promptTokens = generator.tokenizer.encode(text)
            const tokens = generator.tokenizer.encode(outputs[0].generated_text)
            expect(tokens.length).toBeGreaterThan(promptTokens.length);
        }

        // min_length
        {
            // NOTE: Without setting `min_length` (but setting `max_new_tokens`), 22 tokens are generated.
            // So, the following tests are valid.
            const MAX_NEW_TOKENS = 10;
            const MIN_LENGTH = 25;
            const outputs = await generator(text, {
                max_new_tokens: MAX_NEW_TOKENS,
                min_length: MIN_LENGTH,
            });

            const tokens = generator.tokenizer.encode(outputs[0].generated_text)
            expect(tokens.length).toBeGreaterThanOrEqual(MIN_LENGTH);
        }

        // min_new_tokens
        {
            // NOTE: Without setting `min_new_tokens` (but setting `max_new_tokens`), 22 tokens are generated.
            // So, the following tests are valid.
            const MAX_NEW_TOKENS = 32;
            const MIN_NEW_TOKENS = 10;
            const outputs = await generator(text, {
                max_new_tokens: MAX_NEW_TOKENS,
                min_new_tokens: MIN_NEW_TOKENS,
            });

            const tokens = generator.tokenizer.encode(outputs[0].generated_text)
            const promptTokens = generator.tokenizer.encode(text)
            expect(tokens.length).toBeGreaterThanOrEqual(promptTokens.length + MIN_NEW_TOKENS);
        }

        await generator.dispose();

    }, MAX_TEST_EXECUTION_TIME);

    // vision-encoder + text-decoder
    it(models[2], async () => {
        const url = 'https://www.ilankelman.org/stopsigns/australia.jpg';

        const generator = await pipeline('image-to-text', m(models[2]), {
            quantized: false,
        });

        // default
        {
            const outputs = await generator(url);

            const target = '\u2003 Contracts Abiೀ因為dashworker nagging야 rooted n concurrent compensate ImportAttributes pilgrimsلة bottleكن';
            expect(outputs[0].generated_text).toEqual(target);
        }
        await generator.dispose();

    }, MAX_TEST_EXECUTION_TIME);

});

describe('Generation tests', () => {
    // List all models which will be tested
    const models = [
        'fxmarty/pix2struct-tiny-random', // vision-encoder + text-decoder
    ];

    it(models[0], async () => {
        const model_id = m(models[0]);

        const url = 'https://www.ilankelman.org/stopsigns/australia.jpg';

        const processor = await AutoProcessor.from_pretrained(model_id)
        const model = await AutoModelForVision2Seq.from_pretrained(model_id, {
            quantized: false,
        });

        const image = await RawImage.fromURL(url);
        const inputs = await processor(image);

        const out = await model.generate(inputs);

        const target = [[0, 28360, 49220, 36216, 28808, 42857, 33633, 16927, 43058, 13508, 12853, 1214, 27376, 14173, 29763, 18452, 36765, 36144, 4066, 48305]];
        compare(out, target);

    }, MAX_TEST_EXECUTION_TIME);

})