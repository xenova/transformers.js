

import {
    CodeGenTokenizer,
    LlamaForCausalLM,
    LlamaTokenizer,
    GemmaForCausalLM,
    GemmaTokenizer,
    OPTForCausalLM,
    GPT2Tokenizer,
    GPTNeoXForCausalLM,
    GPTNeoXTokenizer,
    GPTJForCausalLM,
    BloomForCausalLM,
    BloomTokenizer,
    GPTBigCodeForCausalLM,
    GPT2LMHeadModel,
    MptForCausalLM,
    CodeGenForCausalLM,
    MistralForCausalLM,
    GPTNeoForCausalLM,
    BertTokenizer,
    BertForMaskedLM,
    BertForSequenceClassification,
    T5ForConditionalGeneration,
    T5Tokenizer,
    T5Model,
    BertModel,
    BertForTokenClassification,
    BertForQuestionAnswering,
    MusicgenForConditionalGeneration,
    LlavaForConditionalGeneration,
    CLIPImageProcessor,
    AutoProcessor,
    RawImage,
    full,
    PreTrainedTokenizer,
    AutoTokenizer,
    Processor,
} from '../src/transformers.js';

import { init } from './init.js';
init();

const MAX_MODEL_LOAD_TIME = 10_000; // 10 seconds
const MAX_TEST_EXECUTION_TIME = 10_000; // 10 seconds
const MAX_MODEL_DISPOSE_TIME = 1_000; // 1 second

const DEFAULT_MODEL_OPTIONS = {
    dtype: 'fp32',
}
describe('Tiny random models', () => {

    describe('bert', () => {
        describe('BertModel', () => {
            const model_id = 'hf-internal-testing/tiny-random-BertModel';

            /** @type {BertModel} */
            let model;
            /** @type {BertTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await BertModel.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await BertTokenizer.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const { last_hidden_state } = await model(inputs);
                expect(last_hidden_state.dims).toEqual([1, 7, 32]);
                expect(last_hidden_state.mean().item()).toBeCloseTo(0.0, 5);

            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const { last_hidden_state } = await model(inputs);
                expect(last_hidden_state.dims).toEqual([2, 12, 32]);
                expect(last_hidden_state.mean().item()).toBeCloseTo(1.4901161193847656e-08, 5);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });

        describe('BertForMaskedLM', () => {
            const model_id = 'hf-internal-testing/tiny-random-BertForMaskedLM';

            const texts = [
                'The goal of life is [MASK].',
                'Paris is the [MASK] of France.',
            ];

            /** @type {BertForMaskedLM} */
            let model;
            /** @type {BertTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await BertForMaskedLM.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await BertTokenizer.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer(texts[0]);
                const { logits } = await model(inputs);
                expect(logits.dims).toEqual([1, 19, 1124]);
                expect(logits.mean().item()).toBeCloseTo(0.0016587056452408433, 5);

            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(texts, { padding: true });
                const { logits } = await model(inputs);
                expect(logits.dims).toEqual([2, 22, 1124]);
                expect(logits.mean().item()).toBeCloseTo(0.0017160633578896523, 5);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });

        describe('BertForSequenceClassification', () => {
            const model_id = 'hf-internal-testing/tiny-random-BertForSequenceClassification';

            /** @type {BertForSequenceClassification} */
            let model;
            /** @type {BertTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await BertForSequenceClassification.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await BertTokenizer.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const { logits } = await model(inputs);
                const target = [
                    [0.00043986947275698185, -0.030218850821256638],
                ].flat();
                expect(logits.dims).toEqual([1, 2]);
                logits.tolist().flat().forEach((item, i) => {
                    expect(item).toBeCloseTo(target[i], 5);
                });
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const { logits } = await model(inputs);
                const target = [
                    [0.00043986947275698185, -0.030218850821256638],
                    [0.0003853091038763523, -0.03022204339504242]
                ].flat();
                expect(logits.dims).toEqual([2, 2]);
                logits.tolist().flat().forEach((item, i) => {
                    expect(item).toBeCloseTo(target[i], 5);
                });
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });

        describe('BertForTokenClassification', () => {
            const model_id = 'hf-internal-testing/tiny-random-BertForTokenClassification';

            /** @type {BertForTokenClassification} */
            let model;
            /** @type {BertTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await BertForTokenClassification.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await BertTokenizer.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const { logits } = await model(inputs);
                expect(logits.dims).toEqual([1, 7, 2]);
                expect(logits.mean().item()).toBeCloseTo(0.07089076191186905, 5);

            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const { logits } = await model(inputs);
                expect(logits.dims).toEqual([2, 12, 2]);
                expect(logits.mean().item()).toBeCloseTo(0.04702216014266014, 5);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });

        describe('BertForQuestionAnswering', () => {
            const model_id = 'hf-internal-testing/tiny-random-BertForQuestionAnswering';

            /** @type {BertForQuestionAnswering} */
            let model;
            /** @type {BertTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await BertForQuestionAnswering.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await BertTokenizer.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const { start_logits, end_logits } = await model(inputs);
                expect(start_logits.dims).toEqual([1, 7]);
                expect(start_logits.mean().item()).toBeCloseTo(0.12772157788276672, 5);
                expect(end_logits.dims).toEqual([1, 7]);
                expect(end_logits.mean().item()).toBeCloseTo(0.11811424791812897, 5);

            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const { start_logits, end_logits } = await model(inputs);
                expect(start_logits.dims).toEqual([2, 12]);
                expect(start_logits.mean().item()).toBeCloseTo(0.12843115627765656, 5);
                expect(end_logits.dims).toEqual([2, 12]);
                expect(end_logits.mean().item()).toBeCloseTo(0.11745202541351318, 5);

            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('t5', () => {

        describe('T5Model', () => {
            const model_id = 'hf-internal-testing/tiny-random-T5Model';

            /** @type {T5Model} */
            let model;
            /** @type {T5Tokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await T5Model.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await T5Tokenizer.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('forward', async () => {
                // Example adapted from https://huggingface.co/google-t5/t5-small#how-to-get-started-with-the-model
                const inputs = tokenizer(
                    "Studies have been shown that owning a dog is good for you",
                );
                const { input_ids: decoder_input_ids } = tokenizer(
                    "Studies show that",
                );

                const { last_hidden_state } = await model({ ...inputs, decoder_input_ids });
                expect(last_hidden_state.dims).toEqual([1, 4, 32]);
                expect(last_hidden_state.mean().item()).toBeCloseTo(7.492632721550763e-05, 8);
            });

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
        describe('T5ForConditionalGeneration', () => {
            const model_id = 'hf-internal-testing/tiny-random-T5ForConditionalGeneration';

            /** @type {T5ForConditionalGeneration} */
            let model;
            /** @type {T5Tokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await T5ForConditionalGeneration.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await T5Tokenizer.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('forward', async () => {
                // Example adapted from https://huggingface.co/google-t5/t5-small#how-to-get-started-with-the-model
                const inputs = tokenizer(
                    "Studies have been shown that owning a dog is good for you",
                );
                const { input_ids: decoder_input_ids } = tokenizer(
                    "Studies show that",
                );

                const model = await T5ForConditionalGeneration.from_pretrained(model_id, DEFAULT_MODEL_OPTIONS);
                const outputs = await model({ ...inputs, decoder_input_ids });
                expect(outputs.logits.dims).toEqual([1, 4, 32100]);
                expect(outputs.logits.mean().item()).toBeCloseTo(8.867568901393952e-09, 12);
            });

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
                    [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('musicgen', () => {
        describe('MusicgenForConditionalGeneration', () => {
            const model_id = 'hf-internal-testing/tiny-random-MusicgenForConditionalGeneration';

            // Example adapted from https://huggingface.co/docs/transformers/model_doc/musicgen#text-conditional-generation
            const texts = [
                "80s pop track with bassy drums and synth",
                "90s rock song with loud guitars and heavy drums",
            ];

            /** @type {MusicgenForConditionalGeneration} */
            let model;
            /** @type {T5Tokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await MusicgenForConditionalGeneration.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await T5Tokenizer.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('forward', async () => {
                // Example from https://huggingface.co/docs/transformers/model_doc/musicgen#transformers.MusicgenForConditionalGeneration.forward.example
                const inputs = tokenizer(texts, { padding: true });
                const pad_token_id = BigInt(model.generation_config.pad_token_id);
                const decoder_input_ids = full(
                    [inputs.input_ids.dims[0] * model.config.decoder.num_codebooks, 1],
                    pad_token_id,
                );
                const { logits } = await model({ ...inputs, decoder_input_ids });
                expect(logits.dims).toEqual([8, 1, 99]);
                expect(logits.mean().item()).toBeCloseTo(-0.0018370470497757196, 5);
            });

            it('batch_size=1', async () => {
                const inputs = tokenizer(texts[0]);
                const audio_values = await model.generate({ ...inputs, max_length: 10 });
                expect(audio_values.dims).toEqual([1, 1, 1920]);
                expect(audio_values.mean().item()).toBeCloseTo(0.16644205152988434, 5);
            }, MAX_TEST_EXECUTION_TIME);

            it('batch_size>1', async () => {
                const inputs = tokenizer(texts, { padding: true });
                const audio_values = await model.generate({ ...inputs, max_length: 10 });
                expect(audio_values.dims).toEqual([2, 1, 1920]);
                expect(audio_values.mean().item()).toBeCloseTo(0.16644206643104553, 5);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('llava', () => {

        const prompts = [
            // Example adapted from https://huggingface.co/docs/transformers/model_doc/llava#transformers.LlavaForConditionalGeneration.forward.example
            "<image>\nUSER: What's the content of the image?\nASSISTANT:",
            "<image>Hi",
        ]

        // Empty white image
        const dims = [224, 224, 3];
        const image = new RawImage(new Uint8ClampedArray(dims[0] * dims[1] * dims[2]).fill(255), ...dims);

        describe('LlavaForConditionalGeneration', () => {
            const model_id = 'Xenova/tiny-random-LlavaForConditionalGeneration';

            /** @type {LlavaForConditionalGeneration} */
            let model;
            /** @type {LlamaTokenizer} */
            let tokenizer;
            /** @type {CLIPImageProcessor} */
            let processor;
            beforeAll(async () => {
                model = await LlavaForConditionalGeneration.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await LlamaTokenizer.from_pretrained(model_id);
                processor = await AutoProcessor.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('forward', async () => {
                const text_inputs = tokenizer(prompts[0]);
                const vision_inputs = await processor(image);
                const inputs = { ...text_inputs, ...vision_inputs };

                const { logits } = await model(inputs);
                expect(logits.dims).toEqual([1, 244, 32002]);
                expect(logits.mean().item()).toBeCloseTo(-0.0005755752790719271, 8);
            });

            it('batch_size=1', async () => {
                const text_inputs = tokenizer(prompts[0]);
                const vision_inputs = await processor(image);
                const inputs = { ...text_inputs, ...vision_inputs };

                const generate_ids = await model.generate({ ...inputs, max_new_tokens: 10 });
                expect(generate_ids.tolist()).toEqual([
                    [1n, 32000n, 29871n, 13n, 11889n, 29901n, 1724n, 29915n, 29879n, 278n, 2793n, 310n, 278n, 1967n, 29973n, 13n, 22933n, 9047n, 13566n, 29901n, 21557n, 16781n, 27238n, 8279n, 20454n, 11927n, 12462n, 12306n, 2414n, 7561n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            it('batch_size>1', async () => {
                const text_inputs = tokenizer(prompts, { padding: true });
                const vision_inputs = await processor([image, image]);
                const inputs = { ...text_inputs, ...vision_inputs };

                const generate_ids = await model.generate({ ...inputs, max_new_tokens: 10 });
                expect(generate_ids.tolist()).toEqual([
                    [1n, 32000n, 29871n, 13n, 11889n, 29901n, 1724n, 29915n, 29879n, 278n, 2793n, 310n, 278n, 1967n, 29973n, 13n, 22933n, 9047n, 13566n, 29901n, 21557n, 16781n, 27238n, 8279n, 20454n, 11927n, 12462n, 12306n, 2414n, 7561n],
                    [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 1n, 32000n, 6324n, 1217n, 22958n, 22913n, 10381n, 148n, 31410n, 31736n, 7358n, 9150n, 28635n]
                ]);

            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('opt', () => {
        describe('OPTForCausalLM', () => {
            const model_id = 'hf-internal-testing/tiny-random-OPTForCausalLM';
            /** @type {OPTForCausalLM} */
            let model;
            /** @type {GPT2Tokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await OPTForCausalLM.from_pretrained(model_id, {
                    // TODO move to config
                    revision: 'refs/pr/2',
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await GPT2Tokenizer.from_pretrained(model_id, {
                    // TODO update this
                    revision: 'refs/pr/3',
                });
                tokenizer.padding_side = 'left';
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [2n, 42891n, 39144n, 39144n, 39144n, 39144n, 39144n, 39144n, 39144n, 39144n],
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [1n, 2n, 42891n, 39144n, 39144n, 39144n, 39144n, 39144n, 39144n, 39144n],
                    [2n, 42891n, 232n, 24680n, 24680n, 24680n, 24680n, 24680n, 24680n, 24680n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('llama', () => {
        describe('LlamaForCausalLM', () => {
            const model_id = 'hf-internal-testing/tiny-random-LlamaForCausalLM';
            /** @type {LlamaForCausalLM} */
            let model;
            /** @type {LlamaTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await LlamaForCausalLM.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await LlamaTokenizer.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [1n, 22172n, 18547n, 8143n, 22202n, 9456n, 17213n, 15330n, 26591n, 15721n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [0n, 1n, 22172n, 18547n, 8143n, 22202n, 9456n, 17213n, 15330n, 26591n],
                    [1n, 22172n, 3186n, 24786n, 19169n, 20222n, 29993n, 27146n, 27426n, 24562n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('gemma', () => {
        describe('GemmaForCausalLM', () => {
            const model_id = 'Xenova/tiny-random-GemmaForCausalLM';
            /** @type {GemmaForCausalLM} */
            let model;
            /** @type {GemmaTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await GemmaForCausalLM.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await GemmaTokenizer.from_pretrained(model_id);
                tokenizer.padding_side = 'left';
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [2n, 17534n, 254059n, 254059n, 254059n, 254059n, 254059n, 254059n, 254059n, 254059n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [0n, 2n, 17534n, 254059n, 254059n, 254059n, 254059n, 254059n, 254059n, 254059n],
                    [2n, 17534n, 2134n, 71055n, 71055n, 71055n, 71055n, 71055n, 71055n, 71055n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('gpt_neo', () => {
        describe('GPTNeoForCausalLM', () => {
            const model_id = 'hf-internal-testing/tiny-random-GPTNeoForCausalLM';
            /** @type {GPTNeoForCausalLM} */
            let model;
            /** @type {GPT2Tokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await GPTNeoForCausalLM.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await GPT2Tokenizer.from_pretrained(model_id);
                tokenizer.padding_side = 'left';
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [258n, 863n, 79n, 79n, 79n, 949n, 949n, 949n, 949n, 949n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [0n, 0n, 258n, 863n, 79n, 79n, 79n, 949n, 949n, 949n],
                    [258n, 863n, 79n, 269n, 813n, 849n, 849n, 849n, 849n, 849n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('gpt_neox', () => {
        describe('GPTNeoXForCausalLM', () => {
            const model_id = 'hf-internal-testing/tiny-random-GPTNeoXForCausalLM';
            /** @type {GPTNeoXForCausalLM} */
            let model;
            /** @type {GPTNeoXTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await GPTNeoXForCausalLM.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await GPTNeoXTokenizer.from_pretrained(model_id);
                tokenizer.padding_side = 'left';
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [259n, 864n, 80n, 881n, 502n, 895n, 938n, 668n, 502n, 895n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [0n, 0n, 259n, 864n, 80n, 881n, 502n, 895n, 938n, 668n],
                    [259n, 864n, 80n, 270n, 814n, 522n, 112n, 268n, 503n, 468n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('gptj', () => {
        describe('GPTJForCausalLM', () => {
            const model_id = 'hf-internal-testing/tiny-random-GPTJForCausalLM';
            /** @type {GPTJForCausalLM} */
            let model;
            /** @type {GPTNeoXTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await GPTJForCausalLM.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await GPTNeoXTokenizer.from_pretrained(model_id);
                tokenizer.padding_side = 'left';
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [258n, 863n, 79n, 102n, 401n, 773n, 889n, 159n, 957n, 869n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [0n, 0n, 258n, 863n, 79n, 102n, 401n, 773n, 889n, 159n],
                    [258n, 863n, 79n, 269n, 813n, 879n, 175n, 39n, 141n, 1000n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('bloom', () => {
        describe('BloomForCausalLM', () => {
            const model_id = 'hf-internal-testing/tiny-random-BloomForCausalLM';
            /** @type {BloomForCausalLM} */
            let model;
            /** @type {BloomTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await BloomForCausalLM.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await BloomTokenizer.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [198n, 803n, 82n, 82n, 82n, 82n, 82n, 82n, 82n, 82n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [3n, 3n, 198n, 803n, 82n, 82n, 82n, 82n, 82n, 82n],
                    [198n, 803n, 82n, 209n, 753n, 753n, 753n, 753n, 753n, 753n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('gpt_bigcode', () => {
        describe('GPTBigCodeForCausalLM', () => {
            const model_id = 'hf-internal-testing/tiny-random-GPTBigCodeForCausalLM';
            /** @type {GPTBigCodeForCausalLM} */
            let model;
            /** @type {GPT2Tokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await GPTBigCodeForCausalLM.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await GPT2Tokenizer.from_pretrained(model_id);
                tokenizer.padding_side = 'left';
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [258n, 863n, 79n, 79n, 79n, 79n, 79n, 79n, 79n, 79n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [0n, 0n, 258n, 863n, 79n, 79n, 79n, 79n, 79n, 79n],
                    [258n, 863n, 79n, 269n, 813n, 832n, 93n, 93n, 93n, 93n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('gpt2', () => {
        describe('GPT2LMHeadModel', () => {
            const model_id = 'hf-internal-testing/tiny-random-GPT2LMHeadModel';
            /** @type {GPT2LMHeadModel} */
            let model;
            /** @type {GPT2Tokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await GPT2LMHeadModel.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await GPT2Tokenizer.from_pretrained(model_id);
                tokenizer.padding_side = 'left';
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [258n, 863n, 79n, 79n, 79n, 79n, 79n, 79n, 79n, 243n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [0n, 0n, 258n, 863n, 79n, 79n, 79n, 79n, 79n, 79n],
                    [258n, 863n, 79n, 269n, 813n, 813n, 813n, 813n, 813n, 813n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('mpt', () => {
        describe('MptForCausalLM', () => {
            const model_id = 'hf-internal-testing/tiny-random-MptForCausalLM';
            /** @type {MptForCausalLM} */
            let model;
            /** @type {GPTNeoXTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await MptForCausalLM.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await GPTNeoXTokenizer.from_pretrained(model_id);
                tokenizer.padding_side = 'left';
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [259n, 864n, 80n, 80n, 80n, 80n, 80n, 80n, 80n, 80n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [0n, 0n, 259n, 864n, 80n, 80n, 80n, 80n, 80n, 80n],
                    [259n, 864n, 80n, 270n, 814n, 293n, 293n, 293n, 293n, 293n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('codegen', () => {
        describe('CodeGenForCausalLM', () => {
            const model_id = 'hf-internal-testing/tiny-random-CodeGenForCausalLM';
            /** @type {CodeGenForCausalLM} */
            let model;
            /** @type {CodeGenTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await CodeGenForCausalLM.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await CodeGenTokenizer.from_pretrained(model_id);
                tokenizer.padding_side = 'left';
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [258n, 863n, 79n, 437n, 334n, 450n, 294n, 621n, 375n, 385n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [0n, 0n, 258n, 863n, 79n, 437n, 334n, 450n, 294n, 621n],
                    [258n, 863n, 79n, 269n, 813n, 759n, 113n, 295n, 574n, 987n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });

    describe('mistral', () => {
        describe('MistralForCausalLM', () => {
            const model_id = 'hf-internal-testing/tiny-random-MistralForCausalLM';
            /** @type {MistralForCausalLM} */
            let model;
            /** @type {LlamaTokenizer} */
            let tokenizer;
            beforeAll(async () => {
                model = await MistralForCausalLM.from_pretrained(model_id, {
                    // TODO move to config
                    ...DEFAULT_MODEL_OPTIONS,
                });
                tokenizer = await LlamaTokenizer.from_pretrained(model_id);
            }, MAX_MODEL_LOAD_TIME);

            it('batch_size=1', async () => {
                const inputs = tokenizer('hello');
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [1n, 6312n, 28709n, 24704n, 8732n, 1310n, 9808n, 13771n, 27309n, 4779n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);
            it('batch_size>1', async () => {
                const inputs = tokenizer(['hello', 'hello world'], { padding: true });
                const outputs = await model.generate({
                    ...inputs,
                    max_length: 10,
                });
                expect(outputs.tolist()).toEqual([
                    [2n, 1n, 6312n, 28709n, 24704n, 8732n, 1310n, 9808n, 13771n, 27309n],
                    [1n, 6312n, 28709n, 1526n, 8687n, 5690n, 1770n, 30811n, 12501n, 3325n]
                ]);
            }, MAX_TEST_EXECUTION_TIME);

            afterAll(async () => {
                await model?.dispose();
            }, MAX_MODEL_DISPOSE_TIME);
        });
    });
});

describe('PKV caching', () => {
    describe('LlamaForCausalLM', () => {
        const model_id = 'hf-internal-testing/tiny-random-LlamaForCausalLM';
        /** @type {LlamaForCausalLM} */
        let model;
        /** @type {LlamaTokenizer} */
        let tokenizer;
        beforeAll(async () => {
            model = await LlamaForCausalLM.from_pretrained(model_id, {
                // TODO move to config
                ...DEFAULT_MODEL_OPTIONS,
            });
            tokenizer = await LlamaTokenizer.from_pretrained(model_id);
        }, MAX_MODEL_LOAD_TIME);

        it('batch_size=1', async () => {
            const inputs = tokenizer('1');

            // Generate first sequence w/o PKV
            // NOTE: `return_dict_in_generate=true` is required to get PKV
            const { past_key_values, sequences } = await model.generate({
                ...inputs,
                max_new_tokens: 5,
                do_sample: false,
                return_dict_in_generate: true,
            });

            // Update output with new text
            const decoded = tokenizer.batch_decode(sequences, {
                skip_special_tokens: false
            })[0];
            const new_inputs = tokenizer(decoded + '2', {
                add_special_tokens: false,
            });

            // Run w/o PKV
            const generated_ids = await model.generate({
                ...new_inputs,
                max_new_tokens: 3,
                do_sample: false,
            });

            // Run w/ PKV
            const generated_ids_pkv = await model.generate({
                ...new_inputs,
                past_key_values,
                max_new_tokens: 3,
                do_sample: false,
            });

            const target = [[1n, 259n, 29896n, 24959n, 22063n, 17192n, 12189n, 22468n, 29906n, 3399n, 24823n, 26470n]];

            expect(generated_ids.tolist()).toEqual(target);
            expect(generated_ids_pkv.tolist()).toEqual(target);

        }, MAX_TEST_EXECUTION_TIME);

        afterAll(async () => {
            await model?.dispose();
        }, MAX_MODEL_DISPOSE_TIME);
    });

    describe('LlavaForConditionalGeneration', () => {
        const model_id = 'Xenova/tiny-random-LlavaForConditionalGeneration';
        /** @type {LlavaForConditionalGeneration} */
        let model;
        /** @type {PreTrainedTokenizer} */
        let tokenizer;
        /** @type {Processor} */
        let processor;
        beforeAll(async () => {
            model = await LlavaForConditionalGeneration.from_pretrained(model_id, {
                // TODO move to config
                ...DEFAULT_MODEL_OPTIONS,
            });
            tokenizer = await AutoTokenizer.from_pretrained(model_id);
            processor = await AutoProcessor.from_pretrained(model_id);
        }, MAX_MODEL_LOAD_TIME);

        it('batch_size=1', async () => {
            const text_inputs = tokenizer('<image>hello');

            // Empty white image
            const dims = [224, 224, 3];
            const image = new RawImage(new Uint8ClampedArray(dims[0] * dims[1] * dims[2]).fill(255), ...dims);
            const vision_inputs = await processor(image);

            // Generate first sequence w/o PKV
            // NOTE: `return_dict_in_generate=true` is required to get PKV
            const { past_key_values, sequences } = await model.generate({
                ...text_inputs,
                ...vision_inputs,
                max_new_tokens: 5,
                do_sample: false,
                return_dict_in_generate: true,
            });

            // Update output with new text
            const decoded = tokenizer.batch_decode(sequences).map(x => x + 'new');
            const new_inputs = tokenizer(decoded, {
                add_special_tokens: false,
            });

            // Run w/o PKV
            const generated_ids = await model.generate({
                ...new_inputs,
                ...vision_inputs,
                max_new_tokens: 3,
                do_sample: false,
            });

            // Run w/ PKV
            const generated_ids_pkv = await model.generate({
                ...new_inputs,
                past_key_values,
                max_new_tokens: 3,
                do_sample: false,
            });

            const target = [[1n, 32000n, 29871n, 23927n, 359n, 1519n, 568n, 5769n, 1330n, 21544n, 11568n, 1482n, 7258n, 1250n, 16117n]];
            expect(generated_ids.tolist()).toEqual(target);
            expect(generated_ids_pkv.tolist()).toEqual(target);

        }, MAX_TEST_EXECUTION_TIME);

        afterAll(async () => {
            await model?.dispose();
        }, MAX_MODEL_DISPOSE_TIME);
    });
});
