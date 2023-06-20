/*
 * Test that models loaded outside of the `pipeline` function work correctly (e.g., `AutoModel.from_pretrained(...)`);
 */

import {
    AutoTokenizer,
    AutoModel,

    BertModel,
    GPT2Model,
    T5Model,

    BertTokenizer,
    GPT2Tokenizer,
    T5Tokenizer,

} from '../src/transformers.js';

import { init, m, MAX_TEST_EXECUTION_TIME } from './init.js';

import { compare } from './test_utils.js';

// Initialise the testing environment
init();


describe('Loading models', () => {

    // List all models which will be tested
    const models_to_test = [
        // [name, modelClass, tokenizerClass]
        ['bert-base-uncased', BertModel, BertTokenizer], // Encoder-only
        ['gpt2', GPT2Model, GPT2Tokenizer],              // Decoder-only
        ['t5-small', T5Model, T5Tokenizer],              // Encoder-decoder
    ];

    let texts = [
        'Once upon a time',
        'I like to eat apples',
    ];

    for (let [name, modelClass, tokenizerClass] of models_to_test) {

        // Test that both the auto model and the specific model work
        let tokenizers = [AutoTokenizer, tokenizerClass];
        let models = [AutoModel, modelClass];

        for (let i = 0; i < tokenizers.length; ++i) {
            const tokenizerClassToTest = tokenizers[i];
            const modelClassToTest = models[i];

            it(`${name} (${modelClassToTest.name})`, async () => {
                const model_id = m(name);

                // Load model and tokenizer
                let tokenizer = await tokenizerClassToTest.from_pretrained(model_id);
                let model = await modelClassToTest.from_pretrained(model_id);

                let tests = [
                    texts[0], // single
                    texts,    // batched
                ]
                for (let test of tests) {
                    let encodings = await tokenizer(test, { truncation: true, padding: true });
                    let output = await model(encodings);

                    if (output.logits) {
                        // Ensure correct shapes
                        let expected_shape = [...encodings.input_ids.dims, model.config.vocab_size];
                        let actual_shape = output.logits.dims;
                        compare(expected_shape, actual_shape);
                    } else if (output.last_hidden_state) {
                        let expected_shape = [...encodings.input_ids.dims, model.config.d_model];
                        let actual_shape = output.last_hidden_state.dims;
                        compare(expected_shape, actual_shape);
                    } else {
                        console.warn('Unexpected output', output);
                        throw new Error('Unexpected output');
                    }

                }

                await model.dispose();

            }, MAX_TEST_EXECUTION_TIME);

        }
    }

});