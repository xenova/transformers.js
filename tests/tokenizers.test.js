

import { AutoTokenizer } from '../src/transformers.js';
import { getFile } from '../src/utils/hub.js';
import { m, MAX_TEST_EXECUTION_TIME } from './init.js';
import { compare } from './test_utils.js';

// Load test data generated by the python tests
// TODO do this dynamically?
const { tokenization, templates } = await (await getFile('./tests/data/tokenizer_tests.json')).json()

// Dynamic tests to ensure transformers.js (JavaScript) matches transformers (Python)
describe('Tokenizers (dynamic)', () => {

    for (const [tokenizerName, tests] of Object.entries(tokenization)) {

        it(tokenizerName, async () => {
            const tokenizer = await AutoTokenizer.from_pretrained(m(tokenizerName));

            for (const test of tests) {
                // Two kinds of tests:
                // 1. text w/o text_pair
                // 2. text w text_pair

                if (typeof test.input === 'string') {

                    // Test encoding
                    const encoded = tokenizer(test.input, {
                        return_tensor: false
                    });

                    // Add the input text to the encoded object for easier debugging
                    test.encoded.input = encoded.input = test.input;

                    expect(encoded).toEqual(test.encoded);

                    // Skip decoding tests if encoding produces zero tokens
                    if (test.encoded.input_ids.length === 0) continue;

                    // Test decoding
                    const decoded_with_special = tokenizer.decode(encoded.input_ids, { skip_special_tokens: false });
                    expect(decoded_with_special).toEqual(test.decoded_with_special);

                    const decoded_without_special = tokenizer.decode(encoded.input_ids, { skip_special_tokens: true });
                    expect(decoded_without_special).toEqual(test.decoded_without_special);

                } else {
                    const { text, text_pair } = test.input;
                    const encoded = tokenizer(text, {
                        text_pair,
                        return_tensor: false,
                    });
                    compare(encoded, test.output);
                }
            }
        }, MAX_TEST_EXECUTION_TIME);
    }
});

// Tests to ensure that no matter what, the correct tokenization is returned.
// This is necessary since there are sometimes bugs in the transformers library.
describe('Tokenizers (hard-coded)', () => {
    const TESTS = {
        'Xenova/llama-tokenizer': [ // Test legacy compatibility
            {
                // legacy unset => legacy=true
                // NOTE: While incorrect, it is necessary to match legacy behaviour
                data: {
                    "<s>\n": [1, 29871, 13],
                },
                legacy: null,
            },
            {
                // override legacy=true (same results as above)
                data: {
                    "<s>\n": [1, 29871, 13],
                },
                legacy: true,
            },
            {
                // override legacy=false (fixed results)
                data: {
                    "<s>\n": [1, 13],
                },
                legacy: false,
            }
        ],

        'Xenova/llama-tokenizer_new': [ // legacy=false
            {
                data: {
                    " </s> 1  2   3    4   ": [259, 2, 29871, 29896, 259, 29906, 1678, 29941, 268, 29946, 1678],
                    "<s>\n": [1, 13],
                    "</s>test</s>": [2, 1688, 2],
                    " </s> test </s> ": [259, 2, 1243, 29871, 2, 29871],
                    "A\n'll": [319, 13, 29915, 645],
                    "Hey </s>. how are you": [18637, 29871, 2, 29889, 920, 526, 366],
                    "  Hi  Hello  ": [259, 6324, 29871, 15043, 259],
                },
                reversible: true,
                legacy: null,
            },
            { // override legacy=true (incorrect results, but necessary to match legacy behaviour)
                data: {
                    "<s>\n": [1, 29871, 13],
                },
                legacy: true,
            },
        ],

        // legacy=false
        'Xenova/t5-tokenizer-new': [
            {
                data: {
                    // https://github.com/huggingface/transformers/pull/26678
                    // ['▁Hey', '▁', '</s>', '.', '▁how', '▁are', '▁you']
                    "Hey </s>. how are you": [9459, 3, 1, 5, 149, 33, 25],
                },
                reversible: true,
                legacy: null,
            },
            {
                data: {
                    "</s>\n": [1, 3],
                    "A\n'll": [71, 3, 31, 195],
                },
                reversible: false,
                legacy: null,
            }
        ],
    }

    // Re-use the same tests for the llama2 tokenizer
    TESTS['Xenova/llama2-tokenizer'] = TESTS['Xenova/llama-tokenizer_new'];

    for (const [tokenizerName, test_data] of Object.entries(TESTS)) {

        it(tokenizerName, async () => {
            for (const { data, reversible, legacy } of test_data) {
                const tokenizer = await AutoTokenizer.from_pretrained(m(tokenizerName), { legacy });

                for (const [text, expected] of Object.entries(data)) {
                    const token_ids = tokenizer.encode(text, null, { add_special_tokens: false });
                    expect(token_ids).toEqual(expected);

                    // If reversible, test that decoding produces the original text
                    if (reversible) {
                        const decoded = tokenizer.decode(token_ids);
                        expect(decoded).toEqual(text);
                    }
                }
            }
        }, MAX_TEST_EXECUTION_TIME);
    }
});

describe('Tokenizer padding/truncation', () => {
    const inputs = ['a', 'b c'];
    const text_pair = ['d e', 'f g h'];

    it('should create a jagged array', async () => {
        const tokenizer = await AutoTokenizer.from_pretrained('Xenova/bert-base-uncased');

        { // support jagged array if `return_tensor=false`
            const output = tokenizer(inputs, {
                return_tensor: false,
            })
            const expected = {
                input_ids: [[101, 1037, 102], [101, 1038, 1039, 102]],
                attention_mask: [[1, 1, 1], [1, 1, 1, 1]],
                token_type_ids: [[0, 0, 0], [0, 0, 0, 0]]
            }
            compare(output, expected);
        }

        {
            const output = tokenizer(inputs, {
                return_tensor: false,
                truncation: true,
                add_special_tokens: false,
            })
            const expected = {
                input_ids: [[1037], [1038, 1039]],
                attention_mask: [[1], [1, 1]],
                token_type_ids: [[0], [0, 0]]
            }
            compare(output, expected);
        }
    })

    it('should create a tensor', async () => {
        const tokenizer = await AutoTokenizer.from_pretrained('Xenova/bert-base-uncased');

        { // Expected to throw error if jagged array
            expect(() => tokenizer(inputs)).toThrowError('Unable to create tensor');
        }

        { // Truncation
            const { input_ids, attention_mask, token_type_ids } = tokenizer(inputs, {
                truncation: true,
                max_length: 1,
                add_special_tokens: false,
            })

            expect(input_ids.tolist()).toEqual([[1037n], [1038n]])
            expect(attention_mask.tolist()).toEqual([[1n], [1n]])
            expect(token_type_ids.tolist()).toEqual([[0n], [0n]])
        }
        { // Truncation w/ text pair
            // TODO
        }

        { // Padding
            const { input_ids, attention_mask, token_type_ids } = tokenizer(inputs, {
                padding: true,
                add_special_tokens: false,
            })

            expect(input_ids.tolist()).toEqual([[1037n, 0n], [1038n, 1039n]])
            expect(attention_mask.tolist()).toEqual([[1n, 0n], [1n, 1n]])
            expect(token_type_ids.tolist()).toEqual([[0n, 0n], [0n, 0n]])
        }
        { // Padding w/ text pair
            const { input_ids, attention_mask, token_type_ids } = tokenizer(inputs, {
                text_pair,
                padding: true,
                add_special_tokens: false,
            })

            expect(input_ids.tolist()).toEqual([
                [1037n, 1040n, 1041n, 0n, 0n],
                [1038n, 1039n, 1042n, 1043n, 1044n],
            ]);
            expect(attention_mask.tolist()).toEqual([
                [1n, 1n, 1n, 0n, 0n],
                [1n, 1n, 1n, 1n, 1n],
            ]);
            expect(token_type_ids.tolist()).toEqual([
                [0n, 1n, 1n, 0n, 0n],
                [0n, 0n, 1n, 1n, 1n],
            ]);
        }

        { // Truncation + padding
            const { input_ids, attention_mask, token_type_ids } = tokenizer(['a', 'b c', 'd e f'], {
                padding: true,
                truncation: true,
                add_special_tokens: false,
                max_length: 2,
            })

            expect(input_ids.tolist()).toEqual([[1037n, 0n], [1038n, 1039n], [1040n, 1041n]])
            expect(attention_mask.tolist()).toEqual([[1n, 0n], [1n, 1n], [1n, 1n]])
            expect(token_type_ids.tolist()).toEqual([[0n, 0n], [0n, 0n], [0n, 0n]])
        }
    }, MAX_TEST_EXECUTION_TIME);
});

describe('Token type ids', () => {
    it('should correctly add token type ids', async () => {
        const tokenizer = await AutoTokenizer.from_pretrained('Xenova/bert-base-uncased');

        const model_inputs = tokenizer(
            ['a b c', 'd'],
            {
                text_pair: ['e f', 'g h'],
                padding: true,
                truncation: true,
                return_tensor: false,
            }
        );

        const expected = {
            input_ids: [
                [101, 1037, 1038, 1039, 102, 1041, 1042, 102],
                [101, 1040, 102, 1043, 1044, 102, 0, 0],
            ],
            token_type_ids: [
                [0, 0, 0, 0, 0, 1, 1, 1],
                [0, 0, 0, 1, 1, 1, 0, 0],
            ],
            attention_mask: [
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 0, 0],
            ],
        }

        compare(model_inputs, expected);

    }, MAX_TEST_EXECUTION_TIME);

    it('should add token type ids if user requests them', async () => {
        const tokenizer = await AutoTokenizer.from_pretrained('Xenova/llama3-tokenizer-new');

        { // Without text pair
            const model_inputs = tokenizer(
                'hello',
                {
                    return_tensor: false,
                    return_token_type_ids: true,
                }
            );
            const expected = {
                input_ids: [128000, 15339],
                attention_mask: [1, 1],
                token_type_ids: [0, 0]
            }
            compare(model_inputs, expected);
        }

        { // With text pair
            const model_inputs = tokenizer(
                'hello',
                {
                    text_pair: 'world',
                    return_tensor: false,
                    return_token_type_ids: true,
                }
            );
            const expected = {
                input_ids: [128000, 15339, 128000, 14957],
                attention_mask: [1, 1, 1, 1],
                token_type_ids: [0, 0, 1, 1]
            }
            compare(model_inputs, expected);
        }

    }, MAX_TEST_EXECUTION_TIME);
});

describe('Edge cases', () => {
    it('should not crash when encoding a very long string', async () => {
        let tokenizer = await AutoTokenizer.from_pretrained('Xenova/t5-small');

        let text = String.prototype.repeat.call('Hello world! ', 50000);
        let encoded = tokenizer(text);
        expect(encoded.input_ids.data.length).toBeGreaterThan(100000);
    }, MAX_TEST_EXECUTION_TIME);

    it('should not take too long', async () => {
        let tokenizer = await AutoTokenizer.from_pretrained('Xenova/all-MiniLM-L6-v2');

        let text = String.prototype.repeat.call('a', 50000);
        let token_ids = tokenizer.encode(text);
        compare(token_ids, [101, 100, 102])
    }, 5000); // NOTE: 5 seconds
});

describe('Extra decoding tests', () => {
    it('should be able to decode the output of encode', async () => {
        let tokenizer = await AutoTokenizer.from_pretrained('Xenova/bert-base-uncased');

        let text = 'hello world!';

        // Ensure all the following outputs are the same:
        // 1. Tensor of ids: allow decoding of 1D or 2D tensors.
        let encodedTensor = tokenizer(text);
        let decoded1 = tokenizer.decode(encodedTensor.input_ids, { skip_special_tokens: true });
        let decoded2 = tokenizer.batch_decode(encodedTensor.input_ids, { skip_special_tokens: true })[0];
        expect(decoded1).toEqual(text);
        expect(decoded2).toEqual(text);

        // 2. List of ids
        let encodedList = tokenizer(text, { return_tensor: false });
        let decoded3 = tokenizer.decode(encodedList.input_ids, { skip_special_tokens: true });
        let decoded4 = tokenizer.batch_decode([encodedList.input_ids], { skip_special_tokens: true })[0];
        expect(decoded3).toEqual(text);
        expect(decoded4).toEqual(text);

    }, MAX_TEST_EXECUTION_TIME);
});

describe('Chat templates', () => {
    it('should generate a chat template', async () => {
        const tokenizer = await AutoTokenizer.from_pretrained("Xenova/mistral-tokenizer-v1");

        const chat = [
            { "role": "user", "content": "Hello, how are you?" },
            { "role": "assistant", "content": "I'm doing great. How can I help you today?" },
            { "role": "user", "content": "I'd like to show off how chat templating works!" },
        ]

        const text = tokenizer.apply_chat_template(chat, { tokenize: false });

        expect(text).toEqual("<s>[INST] Hello, how are you? [/INST]I'm doing great. How can I help you today?</s> [INST] I'd like to show off how chat templating works! [/INST]");

        const input_ids = tokenizer.apply_chat_template(chat, { tokenize: true, return_tensor: false });
        compare(input_ids, [1, 733, 16289, 28793, 22557, 28725, 910, 460, 368, 28804, 733, 28748, 16289, 28793, 28737, 28742, 28719, 2548, 1598, 28723, 1602, 541, 315, 1316, 368, 3154, 28804, 2, 28705, 733, 16289, 28793, 315, 28742, 28715, 737, 298, 1347, 805, 910, 10706, 5752, 1077, 3791, 28808, 733, 28748, 16289, 28793])
    });

    it('should support multiple chat templates', async () => {

        const tokenizer = await AutoTokenizer.from_pretrained("Xenova/c4ai-command-r-v01-tokenizer")

        // define conversation input:
        const conversation = [
            { role: "user", content: "Whats the biggest penguin in the world?" }
        ]
        // define documents to ground on:
        const documents = [
            { title: "Tall penguins", text: "Emperor penguins are the tallest growing up to 122 cm in height." },
            { title: "Penguin habitats", text: "Emperor penguins only live in Antarctica." }
        ]

        // render the RAG prompt as a string:
        const grounded_generation_prompt = tokenizer.apply_chat_template(
            conversation,
            {
                chat_template: "rag",
                tokenize: false,
                add_generation_prompt: true,

                documents,
                citation_mode: "accurate", // or "fast"
            }
        )
        expect(grounded_generation_prompt).toEqual(
            "<BOS_TOKEN><|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|># Safety Preamble\nThe instructions in this section override those in the task description and style guide sections. Don't answer questions that are harmful or immoral.\n\n" +
            "# System Preamble\n## Basic Rules\nYou are a powerful conversational AI trained by Cohere to help people. You are augmented by a number of tools, and your job is to use and consume the output of these tools to best help the user. You will see a conversation history between yourself and a user, ending with an utterance from the user. You will then see a specific instruction instructing you what kind of response to generate. When you answer the user's requests, you cite your sources in your answers, according to those instructions.\n\n" +
            "# User Preamble\n## Task and Context\nYou help people answer their questions and other requests interactively. You will be asked a very wide array of requests on all kinds of topics. You will be equipped with a wide range of search engines or similar tools to help you, which you use to research your answer. You should focus on serving the user's needs as best you can, which will be wide-ranging.\n\n## Style Guide\nUnless the user asks for a different style of answer, you should answer in full sentences, using proper grammar and spelling.<|END_OF_TURN_TOKEN|>" +
            "<|START_OF_TURN_TOKEN|><|USER_TOKEN|>Whats the biggest penguin in the world?<|END_OF_TURN_TOKEN|>" +
            "<|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|><results>\nDocument: 0\ntitle: Tall penguins\ntext: Emperor penguins are the tallest growing up to 122 cm in height.\n\nDocument: 1\ntitle: Penguin habitats\ntext: Emperor penguins only live in Antarctica.\n</results><|END_OF_TURN_TOKEN|><|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|>Carefully perform the following instructions, in order, starting each with a new line.\nFirstly, Decide which of the retrieved documents are relevant to the user's last input by writing 'Relevant Documents:' followed by comma-separated list of document numbers. If none are relevant, you should instead write 'None'.\nSecondly, Decide which of the retrieved documents contain facts that should be cited in a good answer to the user's last input by writing 'Cited Documents:' followed a comma-separated list of document numbers. If you dont want to cite any of them, you should instead write 'None'.\nThirdly, Write 'Answer:' followed by a response to the user's last input in high quality natural english. Use the retrieved documents to help you. Do not insert any citations or grounding markup.\nFinally, Write 'Grounded answer:' followed by a response to the user's last input in high quality natural english. Use the symbols <co: doc> and </co: doc> to indicate when a fact comes from a document in the search result, e.g <co: 0>my fact</co: 0> for a fact from document 0.<|END_OF_TURN_TOKEN|>" +
            "<|START_OF_TURN_TOKEN|><|CHATBOT_TOKEN|>"
        );
    });

    it('should support user-defined chat template', async () => {
        const tokenizer = await AutoTokenizer.from_pretrained("Xenova/llama-tokenizer");

        const chat = [
            { role: 'user', content: 'Hello, how are you?' },
            { role: 'assistant', content: "I'm doing great. How can I help you today?" },
            { role: 'user', content: "I'd like to show off how chat templating works!" },
        ]

        // https://discuss.huggingface.co/t/issue-with-llama-2-chat-template-and-out-of-date-documentation/61645/3
        const chat_template = (
            "{% if messages[0]['role'] == 'system' %}" +
            "{% set loop_messages = messages[1:] %}" +  // Extract system message if it's present
            "{% set system_message = messages[0]['content'] %}" +
            "{% elif USE_DEFAULT_PROMPT == true and not '<<SYS>>' in messages[0]['content'] %}" +
            "{% set loop_messages = messages %}" +  // Or use the default system message if the flag is set
            "{% set system_message = 'DEFAULT_SYSTEM_MESSAGE' %}" +
            "{% else %}" +
            "{% set loop_messages = messages %}" +
            "{% set system_message = false %}" +
            "{% endif %}" +
            "{% if loop_messages|length == 0 and system_message %}" +  // Special handling when only sys message present
            "{{ bos_token + '[INST] <<SYS>>\\n' + system_message + '\\n<</SYS>>\\n\\n [/INST]' }}" +
            "{% endif %}" +
            "{% for message in loop_messages %}" +  // Loop over all non-system messages
            "{% if (message['role'] == 'user') != (loop.index0 % 2 == 0) %}" +
            "{{ raise_exception('Conversation roles must alternate user/assistant/user/assistant/...') }}" +
            "{% endif %}" +
            "{% if loop.index0 == 0 and system_message != false %}" +  // Embed system message in first message
            "{% set content = '<<SYS>>\\n' + system_message + '\\n<</SYS>>\\n\\n' + message['content'] %}" +
            "{% else %}" +
            "{% set content = message['content'] %}" +
            "{% endif %}" +
            "{% if message['role'] == 'user' %}" +  // After all of that, handle messages/roles in a fairly normal way
            "{{ bos_token + '[INST] ' + content.strip() + ' [/INST]' }}" +
            "{% elif message['role'] == 'system' %}" +
            "{{ '<<SYS>>\\n' + content.strip() + '\\n<</SYS>>\\n\\n' }}" +
            "{% elif message['role'] == 'assistant' %}" +
            "{{ ' '  + content.strip() + ' ' + eos_token }}" +
            "{% endif %}" +
            "{% endfor %}"
        )
            .replaceAll('USE_DEFAULT_PROMPT', true)
            .replaceAll('DEFAULT_SYSTEM_MESSAGE', 'You are a helpful, respectful and honest assistant.');

        const text = tokenizer.apply_chat_template(chat, { tokenize: false, return_tensor: false, chat_template });

        expect(text).toEqual("<s>[INST] <<SYS>>\nYou are a helpful, respectful and honest assistant.\n<</SYS>>\n\nHello, how are you? [/INST] I'm doing great. How can I help you today? </s><s>[INST] I'd like to show off how chat templating works! [/INST]");

        // TODO: Add test for token_ids once bug in transformers is fixed.
    });

    // Dynamically-generated tests
    for (const [tokenizerName, tests] of Object.entries(templates)) {

        it(tokenizerName, async () => {
            // NOTE: not m(...) here
            // TODO: update this?
            const tokenizer = await AutoTokenizer.from_pretrained(tokenizerName);

            for (let { messages, add_generation_prompt, tokenize, target } of tests) {

                const generated = tokenizer.apply_chat_template(messages, {
                    tokenize,
                    add_generation_prompt,
                    return_tensor: false,
                });
                expect(generated).toEqual(target)
            }
        });
    }
});
