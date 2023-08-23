/**
 * @file Pipelines provide a high-level, easy to use, API for running machine learning models.
 * 
 * **Example:** Instantiate pipeline using the `pipeline` function.
 * ```javascript
 * import { pipeline } from '@xenova/transformers';
 * 
 * let classifier = await pipeline('sentiment-analysis');
 * let output = await classifier('I love transformers!');
 * // [{'label': 'POSITIVE', 'score': 0.999817686}]
 * ```
 * 
 * @module pipelines
 */

import {
    AutoTokenizer,
    PreTrainedTokenizer,
} from './tokenizers.js';
import {
    AutoModel,
    AutoModelForSequenceClassification,
    AutoModelForAudioClassification,
    AutoModelForTokenClassification,
    AutoModelForQuestionAnswering,
    AutoModelForMaskedLM,
    AutoModelForSeq2SeqLM,
    AutoModelForCTC,
    AutoModelForCausalLM,
    AutoModelForVision2Seq,
    AutoModelForImageClassification,
    AutoModelForImageSegmentation,
    AutoModelForObjectDetection,
    PreTrainedModel,
} from './models.js';
import {
    AutoProcessor,
    Processor
} from './processors.js';


import {
    Callable,
    isString,
    dispatchCallback,
    pop,
    product,
} from './utils/core.js';
import {
    softmax,
    max,
    getTopItems,
    round,
} from './utils/maths.js';
import {
    read_audio
} from './utils/audio.js';
import {
    mean_pooling,
} from './utils/tensor.js';
import { RawImage } from './utils/image.js';

/**
 * Prepare images for further tasks.
 * @param {any[]} images images to prepare.
 * @returns {Promise<any[]>} returns processed images.
 * @private
 */
async function prepareImages(images) {
    if (!Array.isArray(images)) {
        images = [images];
    }

    // Possibly convert any non-images to images
    images = await Promise.all(images.map(x => RawImage.read(x)));
    return images;
}

/**
 * The Pipeline class is the class from which all pipelines inherit.
 * Refer to this class for methods shared across different pipelines.
 * @extends Callable
 */
export class Pipeline extends Callable {
    /**
     * Create a new Pipeline.
     * @param {Object} options An object containing the following properties:
     * @param {string} [options.task] The task of the pipeline. Useful for specifying subtasks.
     * @param {PreTrainedModel} [options.model] The model to use.
     * @param {PreTrainedTokenizer} [options.tokenizer=null] The tokenizer to use (if any).
     * @param {Processor} [options.processor=null] The processor to use (if any).
     */
    constructor({ task, model, tokenizer = null, processor = null }) {
        super();
        this.task = task;
        this.model = model;
        this.tokenizer = tokenizer;
        this.processor = processor;
    }

    /**
     * Disposes the model.
     * @returns {Promise<void>} A promise that resolves when the model has been disposed.
     */
    async dispose() {
        await this.model.dispose();
    }

    /**
     * Executes the task associated with the pipeline.
     * @param {any} texts The input texts to be processed.
     * @returns {Promise<any>} A promise that resolves to an array containing the inputs and outputs of the task.
     */
    async _call(texts) {
        // Run tokenization
        let model_inputs = this.tokenizer(texts, {
            padding: true,
            truncation: true
        });

        // Run model
        let outputs = await this.model(model_inputs)

        return [model_inputs, outputs];
    }
}

/**
 * Text classification pipeline using any `ModelForSequenceClassification`.
 *
 * **Example:** Sentiment-analysis w/ `Xenova/distilbert-base-uncased-finetuned-sst-2-english`.
 * ```javascript
 * let classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
 * let output = await classifier('I love transformers!');
 * // [{ label: 'POSITIVE', score: 0.999788761138916 }]
 * ```
 * 
 * **Example:** Multilingual sentiment-analysis w/ `Xenova/bert-base-multilingual-uncased-sentiment` (and return top 5 classes).
 * ```javascript
 * let classifier = await pipeline('sentiment-analysis', 'Xenova/bert-base-multilingual-uncased-sentiment');
 * let output = await classifier('Le meilleur film de tous les temps.', { topk: 5 });
 * // [
 * //   { label: '5 stars', score: 0.9610759615898132 },
 * //   { label: '4 stars', score: 0.03323351591825485 },
 * //   { label: '3 stars', score: 0.0036155181005597115 },
 * //   { label: '1 star', score: 0.0011325967498123646 },
 * //   { label: '2 stars', score: 0.0009423971059732139 }
 * // ]
 * ```
 * 
 * **Example:** Toxic comment classification w/ `Xenova/toxic-bert` (and return all classes).
 * ```javascript
 * let classifier = await pipeline('text-classification', 'Xenova/toxic-bert');
 * let output = await classifier('I hate you!', { topk: null });
 * // [
 * //   { label: 'toxic', score: 0.9593140482902527 },
 * //   { label: 'insult', score: 0.16187334060668945 },
 * //   { label: 'obscene', score: 0.03452680632472038 },
 * //   { label: 'identity_hate', score: 0.0223250575363636 },
 * //   { label: 'threat', score: 0.019197041168808937 },
 * //   { label: 'severe_toxic', score: 0.005651099607348442 }
 * // ]
 * ```
 */
export class TextClassificationPipeline extends Pipeline {
    /**
     * Executes the text classification task.
     * @param {any} texts The input texts to be classified.
     * @param {Object} options An optional object containing the following properties:
     * @param {number} [options.topk=1] The number of top predictions to be returned.
     * @returns {Promise<Object[]|Object>} A promise that resolves to an array or object containing the predicted labels and scores.
     */
    async _call(texts, {
        topk = 1
    } = {}) {

        // TODO: Use softmax tensor function
        let function_to_apply =
            this.model.config.problem_type === 'multi_label_classification'
                ? batch => batch.sigmoid().data
                : batch => softmax(batch.data); // single_label_classification (default)

        let [inputs, outputs] = await super._call(texts);

        let id2label = this.model.config.id2label;
        let toReturn = [];
        for (let batch of outputs.logits) {
            let output = function_to_apply(batch);
            let scores = getTopItems(output, topk);

            let vals = scores.map(function (x) {
                return {
                    label: id2label[x[0]],
                    score: x[1],
                }
            });
            if (topk === 1) {
                toReturn.push(...vals);
            } else {
                toReturn.push(vals);
            }
        }

        return Array.isArray(texts) || topk === 1 ? toReturn : toReturn[0];
    }
}


/**
 * Named Entity Recognition pipeline using any `ModelForTokenClassification`.
 * 
 * **Example:** Perform named entity recognition with `Xenova/bert-base-NER`.
 * ```javascript
 * let classifier = await pipeline('token-classification', 'Xenova/bert-base-NER');
 * let output = await classifier('My name is Sarah and I live in London');
 * // [
 * //   { entity: 'B-PER', score: 0.9980202913284302, index: 4, word: 'Sarah' },
 * //   { entity: 'B-LOC', score: 0.9994474053382874, index: 9, word: 'London' }
 * // ]
 * ```
 * 
 * **Example:** Perform named entity recognition with `Xenova/bert-base-NER` (and return all labels).
 * ```javascript
 * let classifier = await pipeline('token-classification', 'Xenova/bert-base-NER');
 * let output = await classifier('Sarah lives in the United States of America', { ignore_labels: [] });
 * // [
 * //   { entity: 'B-PER', score: 0.9966587424278259, index: 1, word: 'Sarah' },
 * //   { entity: 'O', score: 0.9987385869026184, index: 2, word: 'lives' },
 * //   { entity: 'O', score: 0.9990072846412659, index: 3, word: 'in' },
 * //   { entity: 'O', score: 0.9988298416137695, index: 4, word: 'the' },
 * //   { entity: 'B-LOC', score: 0.9995510578155518, index: 5, word: 'United' },
 * //   { entity: 'I-LOC', score: 0.9990395307540894, index: 6, word: 'States' },
 * //   { entity: 'I-LOC', score: 0.9986724853515625, index: 7, word: 'of' },
 * //   { entity: 'I-LOC', score: 0.9975294470787048, index: 8, word: 'America' }
 * // ]
 * ```
 */
export class TokenClassificationPipeline extends Pipeline {
    /**
     * Executes the token classification task.
     * @param {any} texts The input texts to be classified.
     * @param {Object} options An optional object containing the following properties:
     * @returns {Promise<Object[]|Object>} A promise that resolves to an array or object containing the predicted labels and scores.
     */
    async _call(texts, {
        ignore_labels = ['O'], // TODO init param?
    } = {}) {

        let isBatched = Array.isArray(texts);

        if (!isBatched) {
            texts = [texts];
        }

        let tokenizer = this.tokenizer;
        let [inputs, outputs] = await super._call(texts);

        let logits = outputs.logits;
        let id2label = this.model.config.id2label;

        let toReturn = [];
        for (let i = 0; i < logits.dims[0]; ++i) {
            let ids = inputs.input_ids[i];
            let batch = logits[i];

            // List of tokens that aren't ignored
            let tokens = [];
            for (let j = 0; j < batch.dims[0]; ++j) {
                let tokenData = batch[j];
                let topScoreIndex = max(tokenData.data)[1];

                let entity = id2label[topScoreIndex];
                if (ignore_labels.includes(entity)) {
                    // We predicted a token that should be ignored. So, we skip it.
                    continue;
                }

                // TODO add option to keep special tokens?
                let word = tokenizer.decode([ids[j].item()], { skip_special_tokens: true });
                if (word === '') {
                    // Was a special token. So, we skip it.
                    continue;
                }

                let scores = softmax(tokenData.data);

                tokens.push({
                    entity: entity,
                    score: scores[topScoreIndex],
                    index: j,
                    word: word,

                    // TODO: null for now, but will add
                    start: null,
                    end: null,
                });
            }
            toReturn.push(tokens);
        }
        return isBatched ? toReturn : toReturn[0];
    }
}

/**
 * Question Answering pipeline using any `ModelForQuestionAnswering`.
 * 
 * **Example:** Run question answering with `Xenova/distilbert-base-uncased-distilled-squad`.
 * ```javascript
 * let question = 'Who was Jim Henson?';
 * let context = 'Jim Henson was a nice puppet.';
 * 
 * let answerer = await pipeline('question-answering', 'Xenova/distilbert-base-uncased-distilled-squad');
 * let output = await answerer(question, context);
 * // {
 * //   "answer": "a nice puppet",
 * //   "score": 0.5768911502526741
 * // }
 * ```
 */
export class QuestionAnsweringPipeline extends Pipeline {
    /**
     * Executes the question answering task.
     * @param {string|string[]} question The question(s) to be answered.
     * @param {string|string[]} context The context(s) where the answer(s) can be found.
     * @param {Object} options An optional object containing the following properties:
     * @param {number} [options.topk=1] The number of top answer predictions to be returned.
     * @returns {Promise<any>} A promise that resolves to an array or object containing the predicted answers and scores.
     */
    // @ts-ignore
    async _call(question, context, {
        topk = 1
    } = {}) {

        // Run tokenization
        let inputs = this.tokenizer(question, {
            text_pair: context,
            padding: true,
            truncation: true
        });

        let output = await this.model(inputs);

        let toReturn = [];
        for (let j = 0; j < output.start_logits.dims[0]; ++j) {
            let ids = inputs.input_ids[j];
            let sepIndex = ids.indexOf(this.tokenizer.sep_token_id);

            let s1 = Array.from(softmax(output.start_logits[j].data))
                .map((x, i) => [x, i])
                .filter(x => x[1] > sepIndex);
            let e1 = Array.from(softmax(output.end_logits[j].data))
                .map((x, i) => [x, i])
                .filter(x => x[1] > sepIndex);

            let options = product(s1, e1)
                .filter(x => x[0][1] <= x[1][1])
                .map(x => [x[0][1], x[1][1], x[0][0] * x[1][0]])
                .sort((a, b) => b[2] - a[2]);

            for (let k = 0; k < Math.min(options.length, topk); ++k) {
                let [start, end, score] = options[k];

                let answer_tokens = [...ids].slice(start, end + 1)

                let answer = this.tokenizer.decode(answer_tokens, {
                    skip_special_tokens: true,
                });

                // TODO add start and end?
                // NOTE: HF returns character index
                toReturn.push({
                    answer, score
                });
            }
        }

        // Mimic HF's return type based on topk
        return (topk === 1) ? toReturn[0] : toReturn;

    }
}

/**
 * Masked language modeling prediction pipeline using any `ModelWithLMHead`.
 * 
 * **Example:** Perform masked language modelling (a.k.a. "fill-mask") with `Xenova/bert-base-uncased`.
 * ```javascript
 * let unmasker = await pipeline('fill-mask', 'Xenova/bert-base-cased');
 * let output = await unmasker('The goal of life is [MASK].');
 * // [
 * //   { token_str: 'survival', score: 0.06137419492006302, token: 8115, sequence: 'The goal of life is survival.' },
 * //   { token_str: 'love', score: 0.03902450203895569, token: 1567, sequence: 'The goal of life is love.' },
 * //   { token_str: 'happiness', score: 0.03253183513879776, token: 9266, sequence: 'The goal of life is happiness.' },
 * //   { token_str: 'freedom', score: 0.018736306577920914, token: 4438, sequence: 'The goal of life is freedom.' },
 * //   { token_str: 'life', score: 0.01859794743359089, token: 1297, sequence: 'The goal of life is life.' }
 * // ]
 * ```
 * 
 * **Example:** Perform masked language modelling (a.k.a. "fill-mask") with `Xenova/bert-base-cased` (and return top result).
 * ```javascript
 * let unmasker = await pipeline('fill-mask', 'Xenova/bert-base-cased');
 * let output = await unmasker('The Milky Way is a [MASK] galaxy.', { topk: 1 });
 * // [{ token_str: 'spiral', score: 0.6299987435340881, token: 14061, sequence: 'The Milky Way is a spiral galaxy.' }]
 * ```
 */
export class FillMaskPipeline extends Pipeline {
    /**
     * Fill the masked token in the text(s) given as inputs.
     * @param {any} texts The masked input texts.
     * @param {Object} options An optional object containing the following properties:
     * @param {number} [options.topk=5] The number of top predictions to be returned.
     * @returns {Promise<Object[]|Object>} A promise that resolves to an array or object containing the predicted tokens and scores.
     */
    async _call(texts, {
        topk = 5
    } = {}) {
        // Run tokenization
        let [inputs, outputs] = await super._call(texts);

        // Determine indices of mask tokens
        // let mask_token_indices = inputs.input_ids.data.map(x => )

        // let logits = reshape(outputs.logits.data, outputs.logits.dims);

        let tokenizer = this.tokenizer;

        let toReturn = [];

        for (let i = 0; i < inputs.input_ids.dims[0]; ++i) {
            let ids = inputs.input_ids[i];
            let mask_token_index = ids.indexOf(this.tokenizer.mask_token_id)

            if (mask_token_index === -1) {
                throw Error(`Mask token (${tokenizer.mask_token}) not found in text.`)
            }
            let logits = outputs.logits[i];
            let itemLogits = logits[mask_token_index];

            let scores = getTopItems(softmax(itemLogits.data), topk);

            toReturn.push(scores.map(x => {
                let sequence = [...ids];
                sequence[mask_token_index] = x[0];

                return {
                    score: x[1],
                    token: x[0],
                    token_str: tokenizer.model.vocab[x[0]],
                    sequence: tokenizer.decode(sequence, { skip_special_tokens: true }),
                }
            }));
        }
        return Array.isArray(texts) ? toReturn : toReturn[0];
    }
}

/**
 * Text2TextGenerationPipeline class for generating text using a model that performs text-to-text generation tasks.
 * 
 * **Example:** Text-to-text generation w/ `Xenova/LaMini-Flan-T5-783M`.
 * ```javascript
 * let generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-783M');
 * let output = await generator('how can I become more healthy?', {
 *   max_new_tokens: 100,
 * });
 * // [ 'To become more healthy, you can: 1. Eat a balanced diet with plenty of fruits, vegetables, whole grains, lean proteins, and healthy fats. 2. Stay hydrated by drinking plenty of water. 3. Get enough sleep and manage stress levels. 4. Avoid smoking and excessive alcohol consumption. 5. Regularly exercise and maintain a healthy weight. 6. Practice good hygiene and sanitation. 7. Seek medical attention if you experience any health issues.' ]
 * ```
 */
export class Text2TextGenerationPipeline extends Pipeline {
    _key = null;

    /**
     * Fill the masked token in the text(s) given as inputs.
     * @param {string|string[]} texts The text or array of texts to be processed.
     * @param {Object} [options={}] Options for the fill-mask pipeline.
     * @param {number} [options.topk=5] The number of top-k predictions to return.
     * @returns {Promise<any>} An array of objects containing the score, predicted token, predicted token string,
     * and the sequence with the predicted token filled in, or an array of such arrays (one for each input text).
     * If only one input text is given, the output will be an array of objects.
     * @throws {Error} When the mask token is not found in the input text.
     */
    async _call(texts, generate_kwargs = {}) {
        if (!Array.isArray(texts)) {
            texts = [texts];
        }

        // Add global prefix, if present
        if (this.model.config.prefix) {
            texts = texts.map(x => this.model.config.prefix + x)
        }

        // Handle task specific params:
        let task_specific_params = this.model.config.task_specific_params
        if (task_specific_params && task_specific_params[this.task]) {
            // Add prefixes, if present
            if (task_specific_params[this.task].prefix) {
                texts = texts.map(x => task_specific_params[this.task].prefix + x)
            }

            // TODO update generation config
        }

        let tokenizer_options = {
            padding: true,
            truncation: true,
        }
        let input_ids;
        if (this instanceof TranslationPipeline && '_build_translation_inputs' in this.tokenizer) {
            // TODO: move to Translation pipeline?
            // Currently put here to avoid code duplication
            // @ts-ignore
            input_ids = this.tokenizer._build_translation_inputs(texts, tokenizer_options, generate_kwargs).input_ids;

        } else {
            input_ids = this.tokenizer(texts, tokenizer_options).input_ids;
        }

        let outputTokenIds = await this.model.generate(input_ids, generate_kwargs);

        /**
         * @type {any[]}
         */
        let toReturn = this.tokenizer.batch_decode(outputTokenIds, {
            skip_special_tokens: true,
        });
        if (this._key !== null) {
            toReturn = toReturn.map(text => {
                return (this._key === null) ? text : { [this._key]: text }
            })
        }
        return toReturn
    }
}


/**
 * A pipeline for summarization tasks, inheriting from Text2TextGenerationPipeline.
 * 
 * **Example:** Summarization w/ `Xenova/distilbart-cnn-6-6`.
 * ```javascript
 * let text = 'The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, ' +
 *   'and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) on each side. ' +
 *   'During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest ' +
 *   'man-made structure in the world, a title it held for 41 years until the Chrysler Building in New ' +
 *   'York City was finished in 1930. It was the first structure to reach a height of 300 metres. Due to ' +
 *   'the addition of a broadcasting aerial at the top of the tower in 1957, it is now taller than the ' +
 *   'Chrysler Building by 5.2 metres (17 ft). Excluding transmitters, the Eiffel Tower is the second ' +
 *   'tallest free-standing structure in France after the Millau Viaduct.';
 * 
 * let generator = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
 * let output = await generator(text, {
 *   max_new_tokens: 100,
 * });
 * // [{ summary_text: ' The Eiffel Tower is about the same height as an 81-storey building and the tallest structure in Paris. It is the second tallest free-standing structure in France after the Millau Viaduct.' }]
 * ```
 */
export class SummarizationPipeline extends Text2TextGenerationPipeline {
    _key = 'summary_text';
}

/**
 * Translates text from one language to another.
 * 
 * **Example:** Multilingual translation w/ `Xenova/nllb-200-distilled-600M`.
 * 
 * See [here](https://github.com/facebookresearch/flores/blob/main/flores200/README.md#languages-in-flores-200)
 * for the full list of languages and their corresponding codes.
 * 
 * ```javascript
 * let translator = await pipeline('translation', 'Xenova/nllb-200-distilled-600M');
 * let output = await translator('जीवन एक चॉकलेट बॉक्स की तरह है।', {
 *   src_lang: 'hin_Deva', // Hindi
 *   tgt_lang: 'fra_Latn', // French
 * });
 * // [{ translation_text: 'La vie est comme une boîte à chocolat.' }]
 * ```
 * 
 * **Example:** Multilingual translation w/ `Xenova/m2m100_418M`.
 * 
 * See [here](https://huggingface.co/facebook/m2m100_418M#languages-covered)
 * for the full list of languages and their corresponding codes.
 * 
 * ```javascript
 * let translator = await pipeline('translation', 'Xenova/m2m100_418M');
 * let output = await translator('生活就像一盒巧克力。', {
 *   src_lang: 'zh', // Chinese
 *   tgt_lang: 'en', // English
 * });
 * // [{ translation_text: 'Life is like a box of chocolate.' }]
 * ```
 * 
 */
export class TranslationPipeline extends Text2TextGenerationPipeline {
    _key = 'translation_text';
}

/**
 * Language generation pipeline using any `ModelWithLMHead` or `ModelForCausalLM`.
 * This pipeline predicts the words that will follow a specified text prompt.
 * NOTE: For the full list of generation parameters, see [`GenerationConfig`](./utils/generation#module_utils/generation.GenerationConfig).
 * 
 * **Example:** Text generation with `Xenova/distilgpt2` (default settings).
 * ```javascript
 * let text = 'I enjoy walking with my cute dog,';
 * let classifier = await pipeline('text-generation', 'Xenova/distilgpt2');
 * let output = await classifier(text);
 * // [{ generated_text: "I enjoy walking with my cute dog, and I love to play with the other dogs." }]
 * ```
 * 
 * **Example:** Text generation with `Xenova/distilgpt2` (custom settings).
 * ```javascript
 * let text = 'Once upon a time, there was';
 * let classifier = await pipeline('text-generation', 'Xenova/distilgpt2');
 * let output = await classifier(text, {
 *   temperature: 2,
 *   max_new_tokens: 10,
 *   repetition_penalty: 1.5,
 *   no_repeat_ngram_size: 2,
 *   num_beams: 2,
 *   num_return_sequences: 2,
 * });
 * // [{
 * //   "generated_text": "Once upon a time, there was an abundance of information about the history and activities that"
 * // }, {
 * //   "generated_text": "Once upon a time, there was an abundance of information about the most important and influential"
 * // }]
 * ```
 * 
 * **Example:** Run code generation with `Xenova/codegen-350M-mono`.
 * ```javascript
 * let text = 'def fib(n):';
 * let classifier = await pipeline('text-generation', 'Xenova/codegen-350M-mono');
 * let output = await classifier(text, {
 *   max_new_tokens: 44,
 * });
 * // [{
 * //   generated_text: 'def fib(n):\n' +
 * //     '    if n == 0:\n' +
 * //     '        return 0\n' +
 * //     '    elif n == 1:\n' +
 * //     '        return 1\n' +
 * //     '    else:\n' +
 * //     '        return fib(n-1) + fib(n-2)\n'
 * // }]
 * ```
 */
export class TextGenerationPipeline extends Pipeline {
    /**
     * Generates text based on an input prompt.
     * @param {any} texts The input prompt or prompts to generate text from.
     * @param {Object} [generate_kwargs={}] Additional arguments for text generation.
     * @returns {Promise<any>} The generated text or texts.
     */
    async _call(texts, generate_kwargs = {}) {
        let stringInput = typeof texts === 'string' || texts instanceof String;
        if (stringInput) {
            texts = [texts];
        }

        this.tokenizer.padding_side = 'left';
        let inputs = this.tokenizer(texts, {
            padding: true,
            truncation: true,
        });

        let input_ids = inputs.input_ids;
        let attention_mask = inputs.attention_mask;

        let outputTokenIds = await this.model.generate(input_ids, generate_kwargs, null, {
            inputs_attention_mask: attention_mask
        });

        const decoded = this.tokenizer.batch_decode(outputTokenIds, {
            skip_special_tokens: true,
        });
        const toReturn = Array.from({ length: texts.length }, _ => []);
        for (let i = 0; i < decoded.length; ++i) {
            const textIndex = Math.floor(i / outputTokenIds.length * texts.length);

            toReturn[textIndex].push({
                generated_text: decoded[i]
            });
        }
        return (stringInput && toReturn.length === 1) ? toReturn[0] : toReturn;
    }
}

/**
 * NLI-based zero-shot classification pipeline using a `ModelForSequenceClassification`
 * trained on NLI (natural language inference) tasks. Equivalent of `text-classification`
 * pipelines, but these models don't require a hardcoded number of potential classes, they
 * can be chosen at runtime. It usually means it's slower but it is **much** more flexible.
 * 
 * **Example:** Zero shot classification with `Xenova/mobilebert-uncased-mnli`.
 * ```javascript
 * let text = 'Last week I upgraded my iOS version and ever since then my phone has been overheating whenever I use your app.';
 * let labels = [ 'mobile', 'billing', 'website', 'account access' ];
 * let classifier = await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli');
 * let output = await classifier(text, labels);
 * // {
 * //   sequence: 'Last week I upgraded my iOS version and ever since then my phone has been overheating whenever I use your app.',
 * //   labels: [ 'mobile', 'website', 'billing', 'account access' ],
 * //   scores: [ 0.5562091040482018, 0.1843621307860853, 0.13942646639336376, 0.12000229877234923 ]
 * // }
 * ```
 * 
 * **Example:** Zero shot classification with `Xenova/nli-deberta-v3-xsmall` (multi-label).
 * ```javascript
 * let text = 'I have a problem with my iphone that needs to be resolved asap!';
 * let labels = [ 'urgent', 'not urgent', 'phone', 'tablet', 'computer' ];
 * let classifier = await pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-xsmall');
 * let output = await classifier(text, labels, { multi_label: true });
 * // {
 * //   sequence: 'I have a problem with my iphone that needs to be resolved asap!',
 * //   labels: [ 'urgent', 'phone', 'computer', 'tablet', 'not urgent' ],
 * //   scores: [ 0.9958870956360275, 0.9923963400697035, 0.002333537946160235, 0.0015134138567598765, 0.0010699384208377163 ]
 * // }
 * ```
 */
export class ZeroShotClassificationPipeline extends Pipeline {

    /**
     * Create a new ZeroShotClassificationPipeline.
     * @param {Object} options An object containing the following properties:
     * @param {string} [options.task] The task of the pipeline. Useful for specifying subtasks.
     * @param {PreTrainedModel} [options.model] The model to use.
     * @param {PreTrainedTokenizer} [options.tokenizer] The tokenizer to use.
     */
    constructor(options) {
        super(options);

        // Use model config to get label2id mapping
        this.label2id = Object.fromEntries(
            Object.entries(this.model.config.label2id).map(
                ([k, v]) => [k.toLowerCase(), v]
            )
        );

        this.entailment_id = this.label2id['entailment'];
        if (this.entailment_id === undefined) {
            console.warn("Could not find 'entailment' in label2id mapping. Using 2 as entailment_id.");
            this.entailment_id = 2;
        }

        this.contradiction_id = this.label2id['contradiction'] ?? this.label2id['not_entailment'];
        if (this.contradiction_id === undefined) {
            console.warn("Could not find 'contradiction' in label2id mapping. Using 0 as contradiction_id.");
            this.contradiction_id = 0;
        }
    }
    /**
     * @param {any[]} texts
     * @param {string[]} candidate_labels
     * @param {Object} options Additional options:
     * @param {string} [options.hypothesis_template="This example is {}."] The template used to turn each
     * candidate label into an NLI-style hypothesis. The candidate label will replace the {} placeholder.
     * @param {boolean} [options.multi_label=false] Whether or not multiple candidate labels can be true.
     * If `false`, the scores are normalized such that the sum of the label likelihoods for each sequence
     * is 1. If `true`, the labels are considered independent and probabilities are normalized for each
     * candidate by doing a softmax of the entailment score vs. the contradiction score.
     * @return {Promise<Object|Object[]>} The prediction(s), as a map (or list of maps) from label to score.
     */
    // @ts-ignore
    async _call(texts, candidate_labels, {
        hypothesis_template = "This example is {}.",
        multi_label = false,
    } = {}) {

        let isBatched = Array.isArray(texts);

        if (!isBatched) {
            texts = [texts];
        }
        if (!Array.isArray(candidate_labels)) {
            candidate_labels = [candidate_labels];
        }

        // Insert labels into hypothesis template
        let hypotheses = candidate_labels.map(
            x => hypothesis_template.replace('{}', x)
        );

        // How to perform the softmax over the logits:
        //  - true:  softmax over the entailment vs. contradiction dim for each label independently
        //  - false: softmax the "entailment" logits over all candidate labels
        let softmaxEach = multi_label || candidate_labels.length === 1;

        let toReturn = [];
        for (let premise of texts) {
            let entails_logits = [];

            for (let hypothesis of hypotheses) {
                let inputs = this.tokenizer(premise, {
                    text_pair: hypothesis,
                    padding: true,
                    truncation: true,
                })
                let outputs = await this.model(inputs)

                if (softmaxEach) {
                    entails_logits.push([
                        outputs.logits.data[this.contradiction_id],
                        outputs.logits.data[this.entailment_id]
                    ])
                } else {
                    entails_logits.push(outputs.logits.data[this.entailment_id])
                }
            }

            let scores;
            if (softmaxEach) {
                scores = entails_logits.map(x => softmax(x)[1]);
            } else {
                scores = softmax(entails_logits);
            }

            // Sort by scores (desc) and return scores with indices
            let scores_sorted = scores
                .map((x, i) => [x, i])
                .sort((a, b) => {
                    return b[0] - a[0];
                });

            toReturn.push({
                sequence: premise,
                labels: scores_sorted.map(x => candidate_labels[x[1]]),
                scores: scores_sorted.map(x => x[0]),
            });
        }
        return isBatched ? toReturn : toReturn[0];
    }
}


/**
 * Feature extraction pipeline using no model head. This pipeline extracts the hidden
 * states from the base transformer, which can be used as features in downstream tasks.
 * 
 * **Example:** Run feature extraction with `bert-base-uncased` (without pooling/normalization).
 * ```javascript
 * let extractor = await pipeline('feature-extraction', 'Xenova/bert-base-uncased', { revision: 'default' });
 * let output = await extractor('This is a simple test.');
 * // Tensor {
 * //   type: 'float32',
 * //   data: Float32Array [0.05939924716949463, 0.021655935794115067, ...],
 * //   dims: [1, 8, 768]
 * // }
 * ```
 * 
 * **Example:** Run feature extraction with `bert-base-uncased` (with pooling/normalization).
 * ```javascript
 * let extractor = await pipeline('feature-extraction', 'Xenova/bert-base-uncased', { revision: 'default' });
 * let output = await extractor('This is a simple test.', { pooling: 'mean', normalize: true });
 * // Tensor {
 * //   type: 'float32',
 * //   data: Float32Array [0.03373778983950615, -0.010106077417731285, ...],
 * //   dims: [1, 768]
 * // }
 * ```
 * 
 * **Example:** Calculating embeddings with `sentence-transformers` models.
 * ```javascript
 * let extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
 * let output = await extractor('This is a simple test.', { pooling: 'mean', normalize: true });
 * // Tensor {
 * //   type: 'float32',
 * //   data: Float32Array [0.09094982594251633, -0.014774246141314507, ...],
 * //   dims: [1, 384]
 * // }
 * ```
 */
export class FeatureExtractionPipeline extends Pipeline {

    /**
     * Extract the features of the input(s).
     * 
     * @param {string|string[]} texts The input texts
     * @param {Object} options Additional options:
     * @param {string} [options.pooling="none"] The pooling method to use. Can be one of: "none", "mean".
     * @param {boolean} [options.normalize=false] Whether or not to normalize the embeddings in the last dimension.
     * @returns The features computed by the model.
     */
    async _call(texts, {
        pooling = 'none',
        normalize = false,
    } = {}) {
        let [inputs, outputs] = await super._call(texts);

        // TODO: Provide warning to the user that they might be using model which was not exported
        // specifically for feature extraction
        // console.log(this.model.config)
        // console.log(outputs)

        let result = outputs.last_hidden_state ?? outputs.logits;
        if (pooling === 'none') {
            // Skip pooling
        } else if (pooling === 'mean') {
            result = mean_pooling(result, inputs.attention_mask);
        } else {
            throw Error(`Pooling method '${pooling}' not supported.`);
        }

        if (normalize) {
            result = result.normalize(2, -1);
        }

        return result;
    }
}

// TODO
// export class SentenceSimilarityPipeline extends Pipeline {
// }


/**
 * Audio classification pipeline using any `AutoModelForAudioClassification`.
 * This pipeline predicts the class of a raw waveform or an audio file.
 * 
 * **Example:** Perform audio classification.
 * ```javascript
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
 * let classifier = await pipeline('audio-classification', 'Xenova/wav2vec2-large-xlsr-53-gender-recognition-librispeech');
 * let output = await classifier(url);
 * // [
 * //   { label: 'male', score: 0.9981542229652405 },
 * //   { label: 'female', score: 0.001845747814513743 }
 * // ]
 * ```
 */
export class AudioClassificationPipeline extends Pipeline {

    /**
     * Create a new AudioClassificationPipeline.
     * @param {Object} options An object containing the following properties:
     * @param {string} [options.task] The task of the pipeline. Useful for specifying subtasks.
     * @param {PreTrainedModel} [options.model] The model to use.
     * @param {Processor} [options.processor] The processor to use.
     */
    constructor(options) {
        super(options);
    }

    /**
     * Preprocesses the input audio for the AutomaticSpeechRecognitionPipeline.
     * @param {any} audio The audio to be preprocessed.
     * @param {number} sampling_rate The sampling rate of the audio.
     * @returns {Promise<Float32Array>} A promise that resolves to the preprocessed audio data.
     * @private
     */
    async _preprocess(audio, sampling_rate) {
        if (isString(audio)) {
            audio = await read_audio(audio, sampling_rate);
        }

        return audio;
    }

    /**
     * Executes the audio classification task.
     * @param {any} audio The input audio files to be classified.
     * @param {Object} options An optional object containing the following properties:
     * @param {number} [options.topk=5] The number of top predictions to be returned.
     * @returns {Promise<Object[]|Object>} A promise that resolves to an array or object containing the predicted labels and scores.
     */
    async _call(audio, {
        topk = 5
    } = {}) {

        let single = !Array.isArray(audio);
        if (single) {
            // @ts-ignore
            audio = [audio];
        }

        const id2label = this.model.config.id2label;
        const sampling_rate = this.processor.feature_extractor.config.sampling_rate;

        let toReturn = [];
        for (let aud of audio) {
            aud = await this._preprocess(aud, sampling_rate)

            const inputs = await this.processor(aud);
            const output = await this.model(inputs);
            const logits = output.logits[0];

            let scores = getTopItems(softmax(logits.data), topk);

            let vals = scores.map(function (x) {
                return {
                    label: id2label[x[0]],
                    score: x[1],
                }
            });
            if (topk === 1) {
                toReturn.push(...vals);
            } else {
                toReturn.push(vals);
            }
        }
        return !single || topk === 1 ? toReturn : toReturn[0];
    }
}


/**
 * Pipeline that aims at extracting spoken text contained within some audio.
 *
 * **Example:** Transcribe English.
 * ```javascript
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
 * let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
 * let output = await transcriber(url);
 * // { text: " And so my fellow Americans ask not what your country can do for you, ask what you can do for your country." }
 * ```
 * 
 * **Example:** Transcribe English w/ timestamps.
 * ```javascript
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
 * let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
 * let output = await transcriber(url, { return_timestamps: true });
 * // {
 * //   text: " And so my fellow Americans ask not what your country can do for you, ask what you can do for your country."
 * //   chunks: [
 * //     { timestamp: [0, 8],  text: " And so my fellow Americans ask not what your country can do for you" }
 * //     { timestamp: [8, 11], text: " ask what you can do for your country." }
 * //   ]
 * // }
 * ```
 * 
 * **Example:** Transcribe English w/ word-level timestamps.
 * ```javascript
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
 * let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
 *     revision: 'output_attentions',
 * });
 * let output = await transcriber(url, { return_timestamps: 'word' });
 * // {
 * //   "text": " And so my fellow Americans ask not what your country can do for you ask what you can do for your country.",
 * //   "chunks": [
 * //     { "text": " And", "timestamp": [0, 0.78] },
 * //     { "text": " so", "timestamp": [0.78, 1.06] },
 * //     { "text": " my", "timestamp": [1.06, 1.46] },
 * //     ...
 * //     { "text": " for", "timestamp": [9.72, 9.92] },
 * //     { "text": " your", "timestamp": [9.92, 10.22] },
 * //     { "text": " country.", "timestamp": [10.22, 13.5] }
 * //   ]
 * // }
 * ```
 * 
 * **Example:** Transcribe French.
 * ```javascript
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/french-audio.mp3';
 * let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
 * let output = await transcriber(url, { language: 'french', task: 'transcribe' });
 * // { text: " J'adore, j'aime, je n'aime pas, je déteste." }
 * ```
 * 
 * **Example:** Translate French to English.
 * ```javascript
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/french-audio.mp3';
 * let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
 * let output = await transcriber(url, { language: 'french', task: 'translate' });
 * // { text: " I love, I like, I don't like, I hate." }
 * ```
 * 
 * **Example:** Transcribe/translate audio longer than 30 seconds.
 * ```javascript
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/ted_60.wav';
 * let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
 * let output = await transcriber(url, { chunk_length_s: 30, stride_length_s: 5 });
 * // { text: " So in college, I was a government major, which means [...] So I'd start off light and I'd bump it up" }
 * ```
 */
export class AutomaticSpeechRecognitionPipeline extends Pipeline {

    /**
     * Create a new AutomaticSpeechRecognitionPipeline.
     * @param {Object} options An object containing the following properties:
     * @param {string} [options.task] The task of the pipeline. Useful for specifying subtasks.
     * @param {PreTrainedModel} [options.model] The model to use.
     * @param {PreTrainedTokenizer} [options.tokenizer] The tokenizer to use.
     * @param {Processor} [options.processor] The processor to use.
     */
    constructor(options) {
        super(options);
    }

    /**
     * Preprocesses the input audio for the AutomaticSpeechRecognitionPipeline.
     * @param {any} audio The audio to be preprocessed.
     * @param {number} sampling_rate The sampling rate of the audio.
     * @returns {Promise<Float32Array>} A promise that resolves to the preprocessed audio data.
     * @private
     */
    async _preprocess(audio, sampling_rate) {
        if (isString(audio)) {
            audio = await read_audio(audio, sampling_rate);
        }

        return audio;
    }

    /**
     * @typedef {import('./utils/tensor.js').Tensor} Tensor
     * @typedef {{stride: number[], input_features: Tensor, is_last: boolean, tokens?: number[], token_timestamps?: number[]}} Chunk
     * 
     * @callback ChunkCallback
     * @param {Chunk} chunk The chunk to process.
     */

    /**
     * Asynchronously processes audio and generates text transcription using the model.
     * @param {Float32Array|Float32Array[]} audio The audio to be transcribed. Can be a single Float32Array or an array of Float32Arrays.
     * @param {Object} [kwargs={}] Optional arguments.
     * @param {boolean|'word'} [kwargs.return_timestamps] Whether to return timestamps or not. Default is `false`.
     * @param {number} [kwargs.chunk_length_s] The length of audio chunks to process in seconds. Default is 0 (no chunking).
     * @param {number} [kwargs.stride_length_s] The length of overlap between consecutive audio chunks in seconds. If not provided, defaults to `chunk_length_s / 6`.
     * @param {ChunkCallback} [kwargs.chunk_callback] Callback function to be called with each chunk processed.
     * @param {boolean} [kwargs.force_full_sequences] Whether to force outputting full sequences or not. Default is `false`.
     * @param {string} [kwargs.language] The source language. Default is `null`, meaning it should be auto-detected. Use this to potentially improve performance if the source language is known.
     * @param {string} [kwargs.task] The task to perform. Default is `null`, meaning it should be auto-detected.
     * @param {number[][]} [kwargs.forced_decoder_ids] A list of pairs of integers which indicates a mapping from generation indices to token indices
     * that will be forced before sampling. For example, [[1, 123]] means the second generated token will always be a token of index 123.
     * @returns {Promise<Object>} A Promise that resolves to an object containing the transcription text and optionally timestamps if `return_timestamps` is `true`.
     */
    async _call(audio, kwargs = {}) {
        switch (this.model.config.model_type) {
            case 'whisper':
                return this._call_whisper(audio, kwargs)
            case 'wav2vec2':
                return this._call_wav2vec2(audio, kwargs)
            default:
                throw new Error(`AutomaticSpeechRecognitionPipeline does not support model type '${this.model.config.model_type}'.`)
        }
    }

    /** @private */
    async _call_wav2vec2(audio, kwargs = {}) {
        // TODO use kwargs

        if (kwargs.language) {
            console.warn('`language` parameter is not yet supported for `wav2vec2` models, defaulting to "English".');
        }
        if (kwargs.task) {
            console.warn('`task` parameter is not yet supported for `wav2vec2` models, defaulting to "transcribe".');
        }

        let single = !Array.isArray(audio);
        if (single) {
            // @ts-ignore
            audio = [audio];
        }

        const sampling_rate = this.processor.feature_extractor.config.sampling_rate;

        let toReturn = [];
        for (let aud of audio) {
            aud = await this._preprocess(aud, sampling_rate)

            const inputs = await this.processor(aud);
            const output = await this.model(inputs);
            const logits = output.logits[0];

            const predicted_ids = [];
            for (let item of logits) {
                predicted_ids.push(max(item.data)[1])
            }
            const predicted_sentences = this.tokenizer.decode(predicted_ids)
            toReturn.push({ text: predicted_sentences })
        }
        return single ? toReturn[0] : toReturn;
    }

    /** @private */
    async _call_whisper(audio, kwargs = {}) {
        let return_timestamps = kwargs.return_timestamps ?? false;
        let chunk_length_s = kwargs.chunk_length_s ?? 0;
        let stride_length_s = kwargs.stride_length_s ?? null;
        let chunk_callback = kwargs.chunk_callback ?? null;
        let force_full_sequences = kwargs.force_full_sequences ?? false;

        if (return_timestamps === 'word') {
            kwargs['return_token_timestamps'] = true;
        }

        let language = pop(kwargs, 'language', null);
        let task = pop(kwargs, 'task', null);

        if (language || task || return_timestamps) {
            if (kwargs.forced_decoder_ids) {
                throw new Error("Cannot specify `language`/`task`/`return_timestamps` and `forced_decoder_ids` at the same time.")
            }
            // @ts-ignore
            let decoder_prompt_ids = this.tokenizer.get_decoder_prompt_ids({ language, task, no_timestamps: !return_timestamps })
            if (decoder_prompt_ids.length > 0) {
                kwargs.forced_decoder_ids = decoder_prompt_ids;
            }
        }

        let single = !Array.isArray(audio);
        if (single) {
            // @ts-ignore
            audio = [audio];
        }

        const sampling_rate = this.processor.feature_extractor.config.sampling_rate;
        const time_precision = this.processor.feature_extractor.config.chunk_length / this.model.config.max_source_positions;
        const hop_length = this.processor.feature_extractor.config.hop_length;

        let toReturn = [];
        for (let aud of audio) {
            aud = await this._preprocess(aud, sampling_rate)

            /** @type {Chunk[]} */
            let chunks = [];
            if (chunk_length_s > 0) {
                if (stride_length_s === null) {
                    stride_length_s = chunk_length_s / 6;
                } else if (chunk_length_s <= stride_length_s) {
                    throw Error("`chunk_length_s` must be larger than `stride_length_s`.")
                }

                // TODO support different stride_length_s (for left and right)

                const window = sampling_rate * chunk_length_s;
                const stride = sampling_rate * stride_length_s;
                const jump = window - 2 * stride;
                let offset = 0;

                // Create subarrays of audio with overlaps

                while (offset < aud.length) {
                    let subarr = aud.subarray(offset, offset + window);
                    let feature = await this.processor(subarr);

                    let isFirst = offset === 0;
                    let isLast = offset + jump >= aud.length;
                    chunks.push({
                        stride: [
                            subarr.length,
                            isFirst ? 0 : stride,
                            isLast ? 0 : stride
                        ],
                        input_features: feature.input_features,
                        is_last: isLast
                    })
                    offset += jump;
                }

            } else {
                chunks = [{
                    stride: [aud.length, 0, 0],
                    input_features: (await this.processor(aud)).input_features,
                    is_last: true
                }]
            }

            // Generate for each set of input features
            for (let chunk of chunks) {
                kwargs.num_frames = Math.floor(chunk.stride[0] / hop_length);

                // NOTE: doing sequentially for now
                let data = await this.model.generate(chunk.input_features, kwargs);

                // TODO: Right now we only get top beam
                if (return_timestamps === 'word') {
                    chunk.tokens = data.sequences[0];
                    chunk.token_timestamps = data.token_timestamps.tolist()[0].map(
                        x => round(x, 2)
                    );

                } else {
                    chunk.tokens = data[0];
                }

                // convert stride to seconds
                chunk.stride = chunk.stride.map(x => x / sampling_rate);

                if (chunk_callback !== null) {
                    chunk_callback(chunk)
                }
            }

            // Merge text chunks
            // @ts-ignore
            let [full_text, optional] = this.tokenizer._decode_asr(chunks, {
                time_precision, return_timestamps, force_full_sequences
            });

            toReturn.push({ text: full_text, ...optional })
        }
        return single ? toReturn[0] : toReturn;
    }
}

/**
 * Image To Text pipeline using a `AutoModelForVision2Seq`. This pipeline predicts a caption for a given image.
 * 
 * **Example:** Generate a caption for an image w/ `Xenova/vit-gpt2-image-captioning`.
 * ```javascript
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg';
 * let captioner = await pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning');
 * let output = await captioner(url);
 * // [{ generated_text: 'a cat laying on a couch with another cat' }]
 * ```
 */
export class ImageToTextPipeline extends Pipeline {
    /**
     * Create a new ImageToTextPipeline.
     * @param {Object} options An object containing the following properties:
     * @param {string} [options.task] The task of the pipeline. Useful for specifying subtasks.
     * @param {PreTrainedModel} [options.model] The model to use.
     * @param {PreTrainedTokenizer} [options.tokenizer] The tokenizer to use.
     * @param {Processor} [options.processor] The processor to use.
     */
    constructor(options) {
        super(options);
    }

    /**
     * Assign labels to the image(s) passed as inputs.
     * @param {any[]} images The images to be captioned.
     * @param {Object} [generate_kwargs={}] Optional generation arguments.
     * @returns {Promise<Object|Object[]>} A Promise that resolves to an object (or array of objects) containing the generated text(s).
     */
    async _call(images, generate_kwargs = {}) {
        let isBatched = Array.isArray(images);

        images = await prepareImages(images);

        let { pixel_values } = await this.processor(images);

        let toReturn = [];
        for (let batch of pixel_values) {
            batch.dims = [1, ...batch.dims]
            let output = await this.model.generate(batch, generate_kwargs);
            let decoded = this.tokenizer.batch_decode(output, {
                skip_special_tokens: true,
            }).map(x => {
                return { generated_text: x.trim() }
            })
            toReturn.push(decoded);
        }

        return isBatched ? toReturn : toReturn[0];
    }
}

/**
 * Image classification pipeline using any `AutoModelForImageClassification`.
 * This pipeline predicts the class of an image.
 * 
 * **Example:** Classify an image.
 * ```javascript
 * let classifier = await pipeline('image-classification', 'Xenova/vit-base-patch16-224');
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg';
 * let output = await classifier(url);
 * // [
 * //   {label: 'tiger, Panthera tigris', score: 0.632695734500885},
 * // ]
 * ```
 * 
 * **Example:** Classify an image and return top `n` classes.
 * ```javascript
 * let classifier = await pipeline('image-classification', 'Xenova/vit-base-patch16-224');
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg';
 * let output = await classifier(url, { topk: 3 });
 * // [
 * //   { label: 'tiger, Panthera tigris', score: 0.632695734500885 },
 * //   { label: 'tiger cat', score: 0.3634825646877289 },
 * //   { label: 'lion, king of beasts, Panthera leo', score: 0.00045060308184474707 },
 * // ]
 * ```
 * 
 * **Example:** Classify an image and return all classes.
 * ```javascript
 * let classifier = await pipeline('image-classification', 'Xenova/vit-base-patch16-224');
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg';
 * let output = await classifier(url, { topk: 0 });
 * // [
 * //   {label: 'tiger, Panthera tigris', score: 0.632695734500885},
 * //   {label: 'tiger cat', score: 0.3634825646877289},
 * //   {label: 'lion, king of beasts, Panthera leo', score: 0.00045060308184474707},
 * //   {label: 'jaguar, panther, Panthera onca, Felis onca', score: 0.00035465499968267977},
 * //   ...
 * // ]
 * ```
 */
export class ImageClassificationPipeline extends Pipeline {
    /**
     * Create a new ImageClassificationPipeline.
     * @param {Object} options An object containing the following properties:
     * @param {string} [options.task] The task of the pipeline. Useful for specifying subtasks.
     * @param {PreTrainedModel} [options.model] The model to use.
     * @param {Processor} [options.processor] The processor to use.
     */
    constructor(options) {
        super(options);
    }

    /**
     * Classify the given images.
     * @param {any} images The images to classify.
     * @param {Object} options The options to use for classification.
     * @param {number} [options.topk=1] The number of top results to return.
     * @returns {Promise<any>} The top classification results for the images.
     */
    async _call(images, {
        topk = 1
    } = {}) {
        let isBatched = Array.isArray(images);
        images = await prepareImages(images);

        let { pixel_values } = await this.processor(images);
        let output = await this.model({ pixel_values });

        let id2label = this.model.config.id2label;
        let toReturn = [];
        for (let batch of output.logits) {
            let scores = getTopItems(softmax(batch.data), topk);

            let vals = scores.map(function (x) {
                return {
                    label: id2label[x[0]],
                    score: x[1],
                }
            });
            if (topk === 1) {
                toReturn.push(...vals);
            } else {
                toReturn.push(vals);
            }
        }

        return isBatched || topk === 1 ? toReturn : toReturn[0];
    }

}

/**
 * Image segmentation pipeline using any `AutoModelForXXXSegmentation`.
 * This pipeline predicts masks of objects and their classes.
 * 
 * **Example:** Perform image segmentation with `Xenova/detr-resnet-50-panoptic`.
 * ```javascript
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg';
 * let segmenter = await pipeline('image-segmentation', 'Xenova/detr-resnet-50-panoptic');
 * let output = await segmenter(url);
 * // [
 * //   { label: 'remote', score: 0.9984649419784546, mask: RawImage { ... } },
 * //   { label: 'cat', score: 0.9994316101074219, mask: RawImage { ... } }
 * // ]
 * ```
 */
export class ImageSegmentationPipeline extends Pipeline {
    /**
     * Create a new ImageSegmentationPipeline.
     * @param {Object} options An object containing the following properties:
     * @param {string} [options.task] The task of the pipeline. Useful for specifying subtasks.
     * @param {PreTrainedModel} [options.model] The model to use.
     * @param {Processor} [options.processor] The processor to use.
     */
    constructor(options) {
        super(options);

        this.subtasks_mapping = {
            // Mapping of subtasks to their corresponding post-processing function names.
            panoptic: 'post_process_panoptic_segmentation',
            instance: 'post_process_instance_segmentation',
            semantic: 'post_process_semantic_segmentation'
        }
    }

    /**
     * Segment the input images.
     * @param {Array} images The input images.
     * @param {Object} options The options to use for segmentation.
     * @param {number} [options.threshold=0.5] Probability threshold to filter out predicted masks.
     * @param {number} [options.mask_threshold=0.5] Threshold to use when turning the predicted masks into binary values.
     * @param {number} [options.overlap_mask_area_threshold=0.8] Mask overlap threshold to eliminate small, disconnected segments.
     * @param {null|string} [options.subtask=null] Segmentation task to be performed. One of [`panoptic`, `instance`, and `semantic`], depending on model capabilities. If not set, the pipeline will attempt to resolve (in that order).
     * @param {Array} [options.label_ids_to_fuse=null] List of label ids to fuse. If not set, do not fuse any labels.
     * @param {Array} [options.target_sizes=null] List of target sizes for the input images. If not set, use the original image sizes.
     * @returns {Promise<Array>} The annotated segments.
     */
    async _call(images, {
        threshold = 0.5,
        mask_threshold = 0.5,
        overlap_mask_area_threshold = 0.8,
        label_ids_to_fuse = null,
        target_sizes = null,
        subtask = null, // TODO use
    } = {}) {
        let isBatched = Array.isArray(images);

        if (isBatched && images.length !== 1) {
            throw Error("Image segmentation pipeline currently only supports a batch size of 1.");
        }

        images = await prepareImages(images);
        let imageSizes = images.map(x => [x.height, x.width]);

        let { pixel_values, pixel_mask } = await this.processor(images);
        let output = await this.model({ pixel_values, pixel_mask });

        let fn = null;
        if (subtask !== null) {
            fn = this.subtasks_mapping[subtask];
        } else {
            for (let [task, func] of Object.entries(this.subtasks_mapping)) {
                if (func in this.processor.feature_extractor) {
                    fn = this.processor.feature_extractor[func].bind(this.processor.feature_extractor);
                    subtask = task;
                    break;
                }
            }
        }

        // add annotations
        let annotation = [];

        if (subtask === 'panoptic' || subtask === 'instance') {

            let processed = fn(
                output,
                threshold,
                mask_threshold,
                overlap_mask_area_threshold,
                label_ids_to_fuse,
                target_sizes ?? imageSizes, // TODO FIX?
            )[0];

            let segmentation = processed.segmentation;
            let id2label = this.model.config.id2label;

            for (let segment of processed.segments_info) {
                let maskData = new Uint8ClampedArray(segmentation.data.length);
                for (let i = 0; i < segmentation.data.length; ++i) {
                    if (segmentation.data[i] === segment.id) {
                        maskData[i] = 255;
                    }
                }

                let mask = new RawImage(maskData, segmentation.dims[1], segmentation.dims[0], 1)

                annotation.push({
                    score: segment.score,
                    label: id2label[segment.label_id],
                    mask: mask
                })
            }

        } else if (subtask === 'semantic') {
            throw Error(`semantic segmentation not yet supported.`);

        } else {
            throw Error(`Subtask ${subtask} not supported.`);
        }

        return annotation;
    }
}


/**
 * Zero shot image classification pipeline. This pipeline predicts the class of
 * an image when you provide an image and a set of `candidate_labels`.
 * 
 * **Example:** Zero shot image classification w/ `Xenova/clip-vit-base-patch32`.
 * ```javascript
 * let classifier = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
 * let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg';
 * let output = await classifier(url, ['tiger', 'horse', 'dog']);
 * // [
 * //   { score: 0.9993917942047119, label: 'tiger' },
 * //   { score: 0.0003519294841680676, label: 'horse' },
 * //   { score: 0.0002562698791734874, label: 'dog' }
 * // ]
 * ```
 */
export class ZeroShotImageClassificationPipeline extends Pipeline {

    /**
     * Create a new ZeroShotImageClassificationPipeline.
     * @param {Object} options An object containing the following properties:
     * @param {string} [options.task] The task of the pipeline. Useful for specifying subtasks.
     * @param {PreTrainedModel} [options.model] The model to use.
     * @param {PreTrainedTokenizer} [options.tokenizer] The tokenizer to use.
     * @param {Processor} [options.processor] The processor to use.
     */
    constructor(options) {
        super(options);
    }

    /**
     * Classify the input images with candidate labels using a zero-shot approach.
     * @param {Array} images The input images.
     * @param {string[]} candidate_labels The candidate labels.
     * @param {Object} options The options for the classification.
     * @param {string} [options.hypothesis_template] The hypothesis template to use for zero-shot classification. Default: "This is a photo of {}".
     * @returns {Promise<any>} An array of classifications for each input image or a single classification object if only one input image is provided.
     */
    // @ts-ignore
    async _call(images, candidate_labels, {
        hypothesis_template = "This is a photo of {}"
    } = {}) {
        let isBatched = Array.isArray(images);
        images = await prepareImages(images);

        // Insert label into hypothesis template 
        let texts = candidate_labels.map(
            x => hypothesis_template.replace('{}', x)
        );

        // Run tokenization
        let text_inputs = this.tokenizer(texts, {
            padding: true,
            truncation: true
        });

        // Run processor
        let { pixel_values } = await this.processor(images);

        // Run model with both text and pixel inputs
        let output = await this.model({ ...text_inputs, pixel_values });

        // Compare each image with each candidate label
        let toReturn = [];
        for (let batch of output.logits_per_image) {
            // Compute softmax per image
            let probs = softmax(batch.data);

            toReturn.push([...probs].map((x, i) => {
                return {
                    score: x,
                    label: candidate_labels[i]
                }
            }));
        }

        return isBatched ? toReturn : toReturn[0];
    }
}

/**
 * Object detection pipeline using any `AutoModelForObjectDetection`.
 * This pipeline predicts bounding boxes of objects and their classes.
 * 
 * **Example:** Run object-detection with `facebook/detr-resnet-50`.
 * ```javascript
 * let img = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg';
 * 
 * let detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
 * let output = await detector(img, { threshold: 0.9 });
 * // [{
 * //   "score": 0.9976370930671692,
 * //   "label": "remote",
 * //   "box": { "xmin": 31, "ymin": 68, "xmax": 190, "ymax": 118 }
 * // },
 * // ...
 * // {
 * //   "score": 0.9984092116355896,
 * //   "label": "cat",
 * //   "box": { "xmin": 331, "ymin": 19, "xmax": 649, "ymax": 371 }
 * // }]
 * ```
 */
export class ObjectDetectionPipeline extends Pipeline {
    /**
     * Create a new ObjectDetectionPipeline.
     * @param {Object} options An object containing the following properties:
     * @param {string} [options.task] The task of the pipeline. Useful for specifying subtasks.
     * @param {PreTrainedModel} [options.model] The model to use.
     * @param {Processor} [options.processor] The processor to use.
     */
    constructor(options) {
        super(options);
    }

    /**
     * Detect objects (bounding boxes & classes) in the image(s) passed as inputs.
     * @param {any[]} images The input images.
     * @param {Object} options The options for the object detection.
     * @param {number} [options.threshold=0.9] The threshold used to filter boxes by score.
     * @param {boolean} [options.percentage=false] Whether to return the boxes coordinates in percentage (true) or in pixels (false).
     */
    async _call(images, {
        threshold = 0.9,
        percentage = false,
    } = {}) {
        let isBatched = Array.isArray(images);

        if (isBatched && images.length !== 1) {
            throw Error("Object detection pipeline currently only supports a batch size of 1.");
        }
        images = await prepareImages(images);

        let imageSizes = percentage ? null : images.map(x => [x.height, x.width]);

        let { pixel_values, pixel_mask } = await this.processor(images);
        let output = await this.model({ pixel_values, pixel_mask });

        // @ts-ignore
        let processed = this.processor.feature_extractor.post_process_object_detection(output, threshold, imageSizes);

        // Add labels
        let id2label = this.model.config.id2label;

        // Format output
        const result = processed.map(batch => {
            return batch.boxes.map((box, i) => {
                return {
                    score: batch.scores[i],
                    label: id2label[batch.classes[i]],
                    box: this._get_bounding_box(box, !percentage),
                }
            })
        })

        return isBatched ? result : result[0];
    }

    /**
     * Helper function to convert list [xmin, xmax, ymin, ymax] into object { "xmin": xmin, ... }
     * @param {number[]} box The bounding box as a list.
     * @param {boolean} asInteger Whether to cast to integers.
     * @returns {Object} The bounding box as an object.
     * @private
     */
    _get_bounding_box(box, asInteger) {
        if (asInteger) {
            box = box.map(x => x | 0);
        }
        const [xmin, ymin, xmax, ymax] = box;

        return { xmin, ymin, xmax, ymax };
    }
}

const SUPPORTED_TASKS = {
    "text-classification": {
        "tokenizer": AutoTokenizer,
        "pipeline": TextClassificationPipeline,
        "model": AutoModelForSequenceClassification,
        "default": {
            // TODO: replace with original
            // "model": "distilbert-base-uncased-finetuned-sst-2-english",
            "model": "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
        },
        "type": "text",
    },
    "token-classification": {
        "tokenizer": AutoTokenizer,
        "pipeline": TokenClassificationPipeline,
        "model": AutoModelForTokenClassification,
        "default": {
            // TODO: replace with original
            // "model": "Davlan/bert-base-multilingual-cased-ner-hrl",
            "model": "Xenova/bert-base-multilingual-cased-ner-hrl",
        },
        "type": "text",
    },
    "question-answering": {
        "tokenizer": AutoTokenizer,
        "pipeline": QuestionAnsweringPipeline,
        "model": AutoModelForQuestionAnswering,
        "default": {
            // TODO: replace with original
            // "model": "distilbert-base-cased-distilled-squad",
            "model": "Xenova/distilbert-base-cased-distilled-squad",
        },
        "type": "text",
    },

    "fill-mask": {
        "tokenizer": AutoTokenizer,
        "pipeline": FillMaskPipeline,
        "model": AutoModelForMaskedLM,
        "default": {
            // TODO: replace with original
            // "model": "bert-base-uncased",
            "model": "Xenova/bert-base-uncased",
        },
        "type": "text",
    },
    "summarization": {
        "tokenizer": AutoTokenizer,
        "pipeline": SummarizationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            // TODO: replace with original
            // "model": "sshleifer/distilbart-cnn-6-6",
            "model": "Xenova/distilbart-cnn-6-6",
        },
        "type": "text",
    },
    "translation": {
        "tokenizer": AutoTokenizer,
        "pipeline": TranslationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            // TODO: replace with original
            // "model": "t5-small",
            "model": "Xenova/t5-small",
        },
        "type": "text",
    },
    "text2text-generation": {
        "tokenizer": AutoTokenizer,
        "pipeline": Text2TextGenerationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            // TODO: replace with original
            // "model": "google/flan-t5-small",
            "model": "Xenova/flan-t5-small",
        },
        "type": "text",
    },
    "text-generation": {
        "tokenizer": AutoTokenizer,
        "pipeline": TextGenerationPipeline,
        "model": AutoModelForCausalLM,
        "default": {
            // TODO: replace with original
            // "model": "gpt2",
            "model": "Xenova/gpt2",
        },
        "type": "text",
    },
    "zero-shot-classification": {
        "tokenizer": AutoTokenizer,
        "pipeline": ZeroShotClassificationPipeline,
        "model": AutoModelForSequenceClassification,
        "default": {
            // TODO: replace with original
            // "model": "typeform/distilbert-base-uncased-mnli",
            "model": "Xenova/distilbert-base-uncased-mnli",
        },
        "type": "text",
    },
    "audio-classification": {
        "pipeline": AudioClassificationPipeline,
        "model": AutoModelForAudioClassification,
        "processor": AutoProcessor,
        "default": {
            // TODO: replace with original
            // "model": "superb/wav2vec2-base-superb-ks",
            "model": "Xenova/wav2vec2-base-superb-ks",
        },
        "type": "audio",
    },
    "automatic-speech-recognition": {
        "tokenizer": AutoTokenizer,
        "pipeline": AutomaticSpeechRecognitionPipeline,
        "model": [AutoModelForSeq2SeqLM, AutoModelForCTC],
        "processor": AutoProcessor,
        "default": {
            // TODO: replace with original
            // "model": "openai/whisper-tiny.en",
            "model": "Xenova/whisper-tiny.en",
        },
        "type": "multimodal",
    },

    "image-to-text": {
        "tokenizer": AutoTokenizer,
        "pipeline": ImageToTextPipeline,
        "model": AutoModelForVision2Seq,
        "processor": AutoProcessor,
        "default": {
            // TODO: replace with original
            // "model": "nlpconnect/vit-gpt2-image-captioning",
            "model": "Xenova/vit-gpt2-image-captioning",
        },
        "type": "multimodal",
    },

    "image-classification": {
        // no tokenizer
        "pipeline": ImageClassificationPipeline,
        "model": AutoModelForImageClassification,
        "processor": AutoProcessor,
        "default": {
            // TODO: replace with original
            // "model": "google/vit-base-patch16-224",
            "model": "Xenova/vit-base-patch16-224",
        },
        "type": "multimodal",
    },

    "image-segmentation": {
        // no tokenizer
        "pipeline": ImageSegmentationPipeline,
        "model": AutoModelForImageSegmentation,
        "processor": AutoProcessor,
        "default": {
            // TODO: replace with original
            // "model": "facebook/detr-resnet-50-panoptic",
            "model": "Xenova/detr-resnet-50-panoptic",
        },
        "type": "multimodal",
    },

    "zero-shot-image-classification": {
        // no tokenizer
        "tokenizer": AutoTokenizer,
        "pipeline": ZeroShotImageClassificationPipeline,
        "model": AutoModel,
        "processor": AutoProcessor,
        "default": {
            // TODO: replace with original
            // "model": "openai/clip-vit-base-patch32",
            "model": "Xenova/clip-vit-base-patch32",
        },
        "type": "multimodal",
    },

    "object-detection": {
        // no tokenizer
        "pipeline": ObjectDetectionPipeline,
        "model": AutoModelForObjectDetection,
        "processor": AutoProcessor,
        "default": {
            // TODO: replace with original
            // "model": "facebook/detr-resnet-50",
            "model": "Xenova/detr-resnet-50",
        },
        "type": "multimodal",
    },

    // This task serves as a useful interface for dealing with sentence-transformers (https://huggingface.co/sentence-transformers).
    "feature-extraction": {
        "tokenizer": AutoTokenizer,
        "pipeline": FeatureExtractionPipeline,
        "model": AutoModel,
        "default": {
            // TODO: replace with original
            // "model": "sentence-transformers/all-MiniLM-L6-v2",
            "model": "Xenova/all-MiniLM-L6-v2",
        },
        "type": "text",
    },
}


const TASK_ALIASES = {
    "sentiment-analysis": "text-classification",
    "ner": "token-classification",
    "vqa": "visual-question-answering",
    "asr": "automatic-speech-recognition",

    // Add for backwards compatibility
    "embeddings": "feature-extraction",
}

/**
 * @typedef {import('./utils/hub.js').PretrainedOptions} PretrainedOptions
 */

/**
 * Utility factory method to build a [`Pipeline`] object.
 *
 * @param {string} task The task defining which pipeline will be returned. Currently accepted tasks are:
 *  - `"audio-classification"`: will return a `AudioClassificationPipeline`.
 *  - `"automatic-speech-recognition"`: will return a `AutomaticSpeechRecognitionPipeline`.
 *  - `"feature-extraction"`: will return a `FeatureExtractionPipeline`.
 *  - `"fill-mask"`: will return a `FillMaskPipeline`.
 *  - `"image-classification"`: will return a `ImageClassificationPipeline`.
 *  - `"image-segmentation"`: will return a `ImageSegmentationPipeline`.
 *  - `"image-to-text"`: will return a `ImageToTextPipeline`.
 *  - `"object-detection"`: will return a `ObjectDetectionPipeline`.
 *  - `"question-answering"`: will return a `QuestionAnsweringPipeline`.
 *  - `"summarization"`: will return a `SummarizationPipeline`.
 *  - `"text2text-generation"`: will return a `Text2TextGenerationPipeline`.
 *  - `"text-classification"` (alias "sentiment-analysis" available): will return a `TextClassificationPipeline`.
 *  - `"text-generation"`: will return a `TextGenerationPipeline`.
 *  - `"token-classification"` (alias "ner" available): will return a `TokenClassificationPipeline`.
 *  - `"translation"`: will return a `TranslationPipeline`.
 *  - `"translation_xx_to_yy"`: will return a `TranslationPipeline`.
 *  - `"zero-shot-classification"`: will return a `ZeroShotClassificationPipeline`.
 *  - `"zero-shot-image-classification"`: will return a `ZeroShotImageClassificationPipeline`.
 * @param {string} [model=null] The name of the pre-trained model to use. If not specified, the default model for the task will be used.
 * @param {PretrainedOptions} [options] Optional parameters for the pipeline.
 * @returns {Promise<Pipeline>} A Pipeline object for the specified task.
 * @throws {Error} If an unsupported pipeline is requested.
 */
export async function pipeline(
    task,
    model = null,
    {
        quantized = true,
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
    } = {}
) {
    // Helper method to construct pipeline

    // Apply aliases
    task = TASK_ALIASES[task] ?? task;

    // Get pipeline info
    let pipelineInfo = SUPPORTED_TASKS[task.split('_', 1)[0]];
    if (!pipelineInfo) {
        throw Error(`Unsupported pipeline: ${task}. Must be one of [${Object.keys(SUPPORTED_TASKS)}]`)
    }

    // Use model if specified, otherwise, use default
    if (!model) {
        model = pipelineInfo.default.model
        console.log(`No model specified. Using default model: "${model}".`);
    }

    let pretrainedOptions = {
        quantized,
        progress_callback,
        config,
        cache_dir,
        local_files_only,
        revision,
    }

    const classes = new Map([
        ['tokenizer', pipelineInfo.tokenizer],
        ['model', pipelineInfo.model],
        ['processor', pipelineInfo.processor],
    ]);

    // Load model, tokenizer, and processor (if they exist)
    let results = await loadItems(classes, model, pretrainedOptions);
    results.task = task;

    dispatchCallback(progress_callback, {
        'status': 'ready',
        'task': task,
        'model': model,
    });

    let pipelineClass = pipelineInfo.pipeline;
    return new pipelineClass(results);
}


/**
 * Helper function to get applicable model, tokenizer, or processor classes for a given model.
 * @param {Map<string, any>} mapping The mapping of names to classes, arrays of classes, or null.
 * @param {string} model The name of the model to load.
 * @param {PretrainedOptions} pretrainedOptions The options to pass to the `from_pretrained` method.
 * @private
 */
async function loadItems(mapping, model, pretrainedOptions) {

    const result = Object.create(null);

    /**@type {Promise[]} */
    const promises = [];
    for (let [name, cls] of mapping.entries()) {
        if (!cls) continue;

        /**@type {Promise} */
        let promise;
        if (Array.isArray(cls)) {
            promise = new Promise(async (resolve, reject) => {
                let e;
                for (let c of cls) {
                    try {
                        resolve(await c.from_pretrained(model, pretrainedOptions));
                        return;
                    } catch (err) {
                        e = err;
                    }
                }
                reject(e);
            })
        } else {
            promise = cls.from_pretrained(model, pretrainedOptions);
        }

        result[name] = promise;
        promises.push(promise);
    }

    // Wait for all promises to resolve (in parallel)
    await Promise.all(promises);

    // Then assign to result
    for (let [name, promise] of Object.entries(result)) {
        result[name] = await promise;
    }

    return result;
}