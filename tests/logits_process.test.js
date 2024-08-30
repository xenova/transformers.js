
import {
    // Pipelines
    pipeline,
    TextGenerationPipeline,
} from '../src/transformers.js';

import { init } from './init.js';
import { compare } from './test_utils.js';
init();

const MAX_MODEL_LOAD_TIME = 10_000; // 10 seconds
const MAX_TEST_EXECUTION_TIME = 10_000; // 10 seconds
const MAX_MODEL_DISPOSE_TIME = 1_000; // 1 second

const DEFAULT_MODEL_OPTIONS = {
    dtype: 'fp32',
}

describe('Logits Processors', () => {

    describe('text-generation', () => {
        const model_id = 'hf-internal-testing/tiny-random-LlamaForCausalLM';

        /** @type {TextGenerationPipeline} */
        let pipe;
        beforeAll(async () => {
            pipe = await pipeline('text-generation', model_id, {
                // TODO move to config
                ...DEFAULT_MODEL_OPTIONS,
            });
        }, MAX_MODEL_LOAD_TIME);

        it('bad_word_ids', async () => {
            const text_input = 'hello';

            const generated_text_target = ' Bert explicit wed digasset';
            const text_target = [{ generated_text: text_input + generated_text_target }]

            const output = await pipe(text_input, { max_new_tokens: 5, bad_words_ids: [
                // default: [22172n, 18547n, 8136n, 16012n, 28064n, 11361n]
                [18547],

                // block #1: [22172n, 16662n, 6261n, 18916n, 29109n, 799n]
                [6261, 18916],
            ] });
            compare(output, text_target);
        }, MAX_TEST_EXECUTION_TIME);

        afterAll(async () => {
            await pipe?.dispose();
        }, MAX_MODEL_DISPOSE_TIME);
    });
});
