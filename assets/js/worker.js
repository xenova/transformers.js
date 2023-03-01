// Worker.js file for doing all transformer-based computations
// Needed to ensure the UI thread is not blocked when running

import {
    pipeline
} from '../../src/transformers.js';

// First, set path to wasm files. This is needed when running in a web worker.
// https://onnxruntime.ai/docs/api/js/interfaces/Env.WebAssemblyFlags.html#wasmPaths
// The following code sets the wasm paths relative to the worker.js
// e.g., /transformers.js/assets/js/worker.js -> /transformers.js/src/
ort.env.wasm.wasmPaths = location.pathname.split('/').slice(0, -1 - 2).join('/') + '/src/'

// Whether to use quantized versions of models
const USE_QUANTIZED = true;

// If we are running locally, we should use the local model files (speeds up development)
// Otherwise, we should use the remote files
const IS_LOCAL = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
const MODEL_HOST = IS_LOCAL ? '/models/onnx/' : 'https://huggingface.co/Xenova/transformers.js/resolve/main/';

// Model paths are of the form: BASE_MODEL_PATH/<model_id>/<task>
const BASE_MODEL_PATH = MODEL_HOST + (USE_QUANTIZED ? 'quantized/' : '')

// Define task function mapping
const TASK_FUNCTION_MAPPING = {
    'translation': translate,
    'text-generation': text_generation,
    'masked-language-modelling': masked_lm,
    'sequence-classification': sequence_classification,
    'question-answering': question_answering,
    'summarization': summarize
}

// Listen for messages from UI
self.addEventListener('message', async (event) => {
    const data = event.data;
    let fn = TASK_FUNCTION_MAPPING[data.task];

    if (!fn) return

    let result = await fn(data);
    self.postMessage({
        task: data.task,
        type: 'result',
        data: result
    });
});

// Define model factories
// Ensures only one model is created of each type
class PipelineFactory {
    static task = null;
    static path = null;
    static instance = null;

    constructor(tokenizer, model) {
        this.tokenizer = tokenizer;
        this.model = model;
    }

    static async getInstance(progressCallback = null) {
        if (this.task === null || this.path === null) {
            throw Error("Must set task and path")
        }
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.path, {
                progress_callback: progressCallback
            });
        }

        return this.instance;
    }
}

class TranslationPipelineFactory extends PipelineFactory {
    static task = 'translation';
    static path = BASE_MODEL_PATH + 't5-small/seq2seq-lm-with-past';
}

class TextGenerationPipelineFactory extends PipelineFactory {
    static task = 'text-generation';
    static path = BASE_MODEL_PATH + 'distilgpt2/causal-lm-with-past';
}

class MaskedLMPipelineFactory extends PipelineFactory {
    static task = 'fill-mask';
    static path = BASE_MODEL_PATH + 'bert-base-cased/masked-lm';
}

class SequenceClassificationPipelineFactory extends PipelineFactory {
    static task = 'text-classification';
    static path = BASE_MODEL_PATH + 'nlptown/bert-base-multilingual-uncased-sentiment/sequence-classification';
}

class QuestionAnsweringPipelineFactory extends PipelineFactory {
    static task = 'question-answering';
    static path = BASE_MODEL_PATH + 'distilbert-base-cased-distilled-squad/question-answering';
}

class SummarizationPipelineFactory extends PipelineFactory {
    static task = 'summarization';
    static path = BASE_MODEL_PATH + 'sshleifer/distilbart-cnn-6-6/seq2seq-lm-with-past';
}

async function translate(data) {

    let pipeline = await TranslationPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'translation',
            data: data
        });
    })

    // Update task based on source and target languages
    // Doing it this way prevents the same model from being loaded multiple times
    pipeline.task = `translation_${data.languageFrom}_to_${data.languageTo}`;

    return await pipeline(data.text, {
        ...data.generation,
        callback_function: function (beams) {
            const decodedText = pipeline.tokenizer.decode(beams[0].output_token_ids, {
                skip_special_tokens: true,
            })

            self.postMessage({
                type: 'update',
                target: data.elementIdToUpdate,
                data: decodedText
            });
        }
    })
}

async function text_generation(data) {

    let pipeline = await TextGenerationPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'text-generation',
            data: data
        });
    })

    let text = data.text.trim();

    return await pipeline(text, {
        ...data.generation,
        callback_function: function (beams) {
            const decodedText = pipeline.tokenizer.decode(beams[0].output_token_ids, {
                skip_special_tokens: true,
            })

            self.postMessage({
                type: 'update',
                target: data.elementIdToUpdate,
                data: text + decodedText
            });
        }
    })
}


async function masked_lm(data) {

    let pipeline = await MaskedLMPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'masked-language-modelling',
            data: data
        });
    })

    let output = await pipeline(data.text, data.generation)

    self.postMessage({
        type: 'update',
        target: data.elementIdToUpdate,
        data: output.map(x => x.sequence).join('\n')
    });

    return output;
}

async function sequence_classification(data) {

    let pipeline = await SequenceClassificationPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'sequence-classification',
            data: data
        });
    });

    let outputs = await pipeline(data.text, {
        topk: 5 // return all
    })

    self.postMessage({
        type: 'complete',
        target: data.elementIdToUpdate,
        targetType: data.targetType,
        data: outputs
    });
}


async function question_answering(data) {

    let pipeline = await QuestionAnsweringPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'question-answering',
            data: data
        });
    })

    let answer = await pipeline(data.question, data.context)
    self.postMessage({
        type: 'complete',
        target: data.elementIdToUpdate,
        data: answer.answer
    });

    return answer;
}

async function summarize(data) {
    let pipeline = await SummarizationPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'summarization',
            data: data
        });
    })

    return await pipeline(data.text, {
        ...data.generation,
        callback_function: function (beams) {
            const decodedText = pipeline.tokenizer.decode(beams[0].output_token_ids, {
                skip_special_tokens: true,
            })

            self.postMessage({
                type: 'update',
                target: data.elementIdToUpdate,
                data: decodedText.trim()
            });
        }
    })
}
