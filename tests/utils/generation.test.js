import { AutoTokenizer } from "../../src/tokenizers.js";
import { AutoModelForSeq2SeqLM, AutoModelForCausalLM } from "../../src/models.js";
import { TextStreamer } from "../../src/generation/streamers.js";
import { init, MAX_TEST_EXECUTION_TIME, MAX_MODEL_LOAD_TIME, MAX_MODEL_DISPOSE_TIME } from "../init.js";

// Initialise the testing environment
init();

// Helper function to generate text
const generate = async (model, tokenizer, text, options) => {
  const inputs = tokenizer(text);
  return await model.generate({
    ...inputs,
    ...options,
  });
};

describe("Generation parameters", () => {
  // List all models which will be tested
  const models = [
    "hf-internal-testing/tiny-random-T5ForConditionalGeneration", //
    "hf-internal-testing/tiny-random-LlamaForCausalLM", // decoder-only
  ];
  const DUMMY_TEXT = "hello";

  describe(`encoder-decoder (${models[0]})`, () => {
    const model_id = models[0];

    let model;
    let tokenizer;
    beforeAll(async () => {
      model = await AutoModelForSeq2SeqLM.from_pretrained(model_id);
      tokenizer = await AutoTokenizer.from_pretrained(model_id);
    }, MAX_MODEL_LOAD_TIME);

    // NOTE: Since `max_length` defaults to 20, this case also tests that.
    it(
      "default",
      async () => {
        const outputs = await generate(model, tokenizer, DUMMY_TEXT, {});
        expect(outputs.dims.at(-1)).toEqual(20);
      },
      MAX_TEST_EXECUTION_TIME,
    );

    it(
      "max_new_tokens",
      async () => {
        const MAX_NEW_TOKENS = 5;
        const outputs = await generate(model, tokenizer, DUMMY_TEXT, {
          max_new_tokens: MAX_NEW_TOKENS,
        });
        expect(outputs.dims.at(-1)).toEqual(MAX_NEW_TOKENS + 1); // + 1 due to forced BOS token
      },
      MAX_TEST_EXECUTION_TIME,
    );

    it(
      "min_length",
      async () => {
        const MIN_LENGTH = 3;
        const MAX_LENGTH = 5;
        const outputs = await generate(model, tokenizer, DUMMY_TEXT, {
          eos_token_id: 0,
          min_length: MIN_LENGTH,
          max_length: MAX_LENGTH,
        });
        expect(outputs.tolist()).toEqual([[0n, 11924n, 11924n, 11924n, 11924n]]);
        expect(outputs.dims.at(-1)).toBeGreaterThanOrEqual(MIN_LENGTH);
      },
      MAX_TEST_EXECUTION_TIME,
    );

    it(
      "min_new_tokens",
      async () => {
        const MIN_NEW_TOKENS = 2;
        const MAX_LENGTH = 5;
        const outputs = await generate(model, tokenizer, DUMMY_TEXT, {
          eos_token_id: 0,
          min_new_tokens: MIN_NEW_TOKENS,
          max_length: MAX_LENGTH,
        });
        expect(outputs.tolist()).toEqual([[0n, 11924n, 11924n, 11924n, 11924n]]);
        expect(outputs.dims.at(-1)).toBeGreaterThanOrEqual(MIN_NEW_TOKENS);
      },
      MAX_TEST_EXECUTION_TIME,
    );

    afterAll(async () => {
      await model?.dispose();
    }, MAX_MODEL_DISPOSE_TIME);
  });

  describe(`decoder-only (${models[1]})`, () => {
    const model_id = models[1];

    let model;
    let tokenizer;
    beforeAll(async () => {
      model = await AutoModelForCausalLM.from_pretrained(model_id);
      tokenizer = await AutoTokenizer.from_pretrained(model_id);
    }, MAX_MODEL_LOAD_TIME);

    // NOTE: Since `max_length` defaults to 20, this case also tests that.
    it(
      "default",
      async () => {
        const outputs = await generate(model, tokenizer, DUMMY_TEXT, {});
        expect(outputs.dims.at(-1)).toEqual(20);
      },
      MAX_TEST_EXECUTION_TIME,
    );

    it(
      "max_new_tokens",
      async () => {
        const MAX_NEW_TOKENS = 5;
        const PROMPT_LENGTH = 2; // BOS + DUMMY_TEXT
        const outputs = await generate(model, tokenizer, DUMMY_TEXT, {
          max_new_tokens: MAX_NEW_TOKENS,
        });
        const expected_length = PROMPT_LENGTH + MAX_NEW_TOKENS;
        expect(outputs.dims.at(-1)).toEqual(expected_length);
      },
      MAX_TEST_EXECUTION_TIME,
    );

    it(
      "min_length",
      async () => {
        const MIN_LENGTH = 4;
        const outputs = await generate(model, tokenizer, DUMMY_TEXT, {
          eos_token_id: [
            18547, // min_length will suppress this token (generated by default)
            16012, // stop at this token
          ],
          min_length: MIN_LENGTH,
        });
        expect(outputs.tolist()).toEqual([[1n, 22172n, 31583n, 18824n, 16621n, 8136n, 16012n]]);
        expect(outputs.dims.at(-1)).toBeGreaterThanOrEqual(MIN_LENGTH);
      },
      MAX_TEST_EXECUTION_TIME,
    );

    it(
      "min_new_tokens",
      async () => {
        const MIN_NEW_TOKENS = 2;
        const outputs = await generate(model, tokenizer, DUMMY_TEXT, {
          eos_token_id: [
            18547, // min_new_tokens will suppress this token (generated by default)
            16012, // stop at this token
          ],
          min_new_tokens: MIN_NEW_TOKENS,
        });
        expect(outputs.tolist()).toEqual([[1n, 22172n, 31583n, 18824n, 16621n, 8136n, 16012n]]);
        expect(outputs.dims.at(-1)).toBeGreaterThanOrEqual(MIN_NEW_TOKENS);
      },
      MAX_TEST_EXECUTION_TIME,
    );

    afterAll(async () => {
      await model?.dispose();
    }, MAX_MODEL_DISPOSE_TIME);
  });
});

describe("Streamers", () => {
  describe("decoder-only", () => {
    const model_id = "hf-internal-testing/tiny-random-LlamaForCausalLM";
    let model, tokenizer;
    beforeAll(async () => {
      model = await AutoModelForCausalLM.from_pretrained(model_id);
      tokenizer = await AutoTokenizer.from_pretrained(model_id);
    }, MAX_MODEL_LOAD_TIME);

    it(
      "batch_size=1",
      async () => {
        const target_chunks = ["helloerdingsdelete ", "melytabular ", "Stadiumoba ", "alcune ", "drug"];
        const chunks = [];
        const callback_function = (text) => {
          chunks.push(text);
        };
        const streamer = new TextStreamer(tokenizer, { callback_function, skip_special_tokens: true });

        const inputs = tokenizer("hello");
        const outputs = await model.generate({
          ...inputs,
          max_length: 10,
          streamer,
        });
        expect(outputs.tolist()).toEqual([[1n, 22172n, 18547n, 8143n, 22202n, 9456n, 17213n, 15330n, 26591n, 15721n]]);
        expect(chunks).toEqual(target_chunks);
      },
      MAX_TEST_EXECUTION_TIME,
    );

    afterAll(async () => {
      await model?.dispose();
    }, MAX_MODEL_DISPOSE_TIME);
  });
});
