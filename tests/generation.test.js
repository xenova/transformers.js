
import { pipeline } from '../src/transformers.js';
import { init, m, MAX_TEST_EXECUTION_TIME } from './init.js';

// Initialise the testing environment
init();

describe('Generation parameters', () => {

    // List all models which will be tested
    const models = [
        'MBZUAI/LaMini-Flan-T5-77M', // encoder-decoder
        'MBZUAI/LaMini-GPT-124M', // decoder-only

        'Xenova/llama2.c-stories15M', // decoder-only
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

    // decoder-only model
    it(models[2], async () => {
        const MAX_NEW_TOKENS = 1;

        const text = [
            'Once upon a time,',
            'Lily',
            'Suddenly,',
        ];

        const generator = await pipeline('text-generation', m(models[2]));

        { // return_full_text=false
            const output = await generator(text, {
                return_full_text: false,
                max_new_tokens: MAX_NEW_TOKENS,
                num_beams: 2,
                num_return_sequences: 2,
            });
            const lengths = output.flatMap(
                x => x.flatMap(
                    y => generator.tokenizer.encode(y.generated_text.trim(), null, {
                        add_special_tokens: false,
                    }).length
                )
            ).every(x => x === MAX_NEW_TOKENS);

            expect(lengths).toBe(true);
        }
        await generator.dispose();

    }, MAX_TEST_EXECUTION_TIME);

});