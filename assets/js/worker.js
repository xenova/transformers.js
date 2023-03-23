// Get dist directory relative to location of worker script.
const DIST_DIR = location.pathname.split('/').slice(0, -1 - 2).join('/') + '/dist/';

// Worker.js file for doing all transformer-based computations
// Needed to ensure the UI thread is not blocked when running
importScripts(DIST_DIR + 'transformers.min.js');

// Set paths to wasm files. In this case, we use the .wasm files present in `DIST_DIR`.
env.onnx.wasm.wasmPaths = DIST_DIR;

// If we are running locally, we should use the local model files (speeds up development)
// Otherwise, we should use the remote files
env.remoteModels = location.hostname !== '127.0.0.1' && location.hostname !== 'localhost';

// Define task function mapping
const TASK_FUNCTION_MAPPING = {
    'translation': translate,
    'text-generation': text_generation,
    'code-completion': code_completion,
    'masked-language-modelling': masked_lm,
    'sequence-classification': sequence_classification,
    'question-answering': question_answering,
    'summarization': summarize,
    'automatic-speech-recognition': speech_to_text,
    'image-to-text': image_to_text,
    'image-classification': image_classification,
    'zero-shot-image-classification': zero_shot_image_classification,
    'object-detection': object_detection,
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
    static model = null;
    static instance = null;

    constructor(tokenizer, model) {
        this.tokenizer = tokenizer;
        this.model = model;
    }

    static async getInstance(progressCallback = null) {
        if (this.task === null || this.model === null) {
            throw Error("Must set task and model")
        }
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, {
                progress_callback: progressCallback
            });
        }

        return this.instance;
    }
}

class TranslationPipelineFactory extends PipelineFactory {
    static task = 'translation';
    static model = 't5-small';
}

class TextGenerationPipelineFactory extends PipelineFactory {
    static task = 'text-generation';
    static model = 'distilgpt2';
}

class CodeCompletionPipelineFactory extends PipelineFactory {
    static task = 'text-generation';
    static model = 'Salesforce/codegen-350M-mono';
}

class MaskedLMPipelineFactory extends PipelineFactory {
    static task = 'fill-mask';
    static model = 'bert-base-cased';
}

class SequenceClassificationPipelineFactory extends PipelineFactory {
    static task = 'text-classification';
    static model = 'nlptown/bert-base-multilingual-uncased-sentiment';
}

class QuestionAnsweringPipelineFactory extends PipelineFactory {
    static task = 'question-answering';
    static model = 'distilbert-base-cased-distilled-squad';
}

class SummarizationPipelineFactory extends PipelineFactory {
    static task = 'summarization';
    static model = 'sshleifer/distilbart-cnn-6-6';
}

class AutomaticSpeechRecognitionPipelineFactory extends PipelineFactory {
    static task = 'automatic-speech-recognition';
    static model = 'openai/whisper-tiny.en';
}

class ImageToTextPipelineFactory extends PipelineFactory {
    static task = 'image-to-text';
    static model = 'nlpconnect/vit-gpt2-image-captioning';
}

class ImageClassificationPipelineFactory extends PipelineFactory {
    static task = 'image-classification';
    static model = 'google/vit-base-patch16-224';
}


class ZeroShotImageClassificationPipelineFactory extends PipelineFactory {
    static task = 'zero-shot-image-classification';
    static model = 'openai/clip-vit-base-patch16';
}

class ObjectDetectionPipelineFactory extends PipelineFactory {
    static task = 'object-detection';
    static model = 'facebook/detr-resnet-50';
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

async function code_completion(data) {

    let pipeline = await CodeCompletionPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'code-completion',
            data: data,
        });
    })

    let text = data.text;

    return await pipeline(text, {
        ...data.generation,
        callback_function: function (beams) {
            const decodedText = pipeline.tokenizer.decode(beams[0].output_token_ids, {
                skip_special_tokens: true,
            })

            self.postMessage({
                type: 'update',
                target: data.elementIdToUpdate,
                targetType: data.targetType,
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

async function speech_to_text(data) {
    let pipeline = await AutomaticSpeechRecognitionPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'automatic-speech-recognition',
            data: data
        });
    })

    return await pipeline(data.audio, {
        // Choose good defaults for the demo
        chunk_length_s: 30,
        stride_length_s: 5,

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

async function image_to_text(data) {
    let pipeline = await ImageToTextPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'image-to-text',
            data: data
        });
    })

    return await pipeline(data.image, {
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

async function image_classification(data) {
    let pipeline = await ImageClassificationPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'image-classification',
            data: data
        });
    })

    let outputs = await pipeline(data.image, {
        topk: 5 // return all
    })

    self.postMessage({
        type: 'complete',
        target: data.elementIdToUpdate,
        targetType: data.targetType,
        updateLabels: data.updateLabels,
        data: outputs
    });

}


async function zero_shot_image_classification(data) {
    let pipeline = await ZeroShotImageClassificationPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'image-classification',
            data: data
        });
    })

    let outputs = await pipeline(data.image, data.classes)

    self.postMessage({
        type: 'complete',
        target: data.elementIdToUpdate,
        targetType: data.targetType,
        updateLabels: data.updateLabels,
        data: outputs
    });

}


async function object_detection(data) {

    let pipeline = await ObjectDetectionPipelineFactory.getInstance(data => {
        self.postMessage({
            type: 'download',
            task: 'object-detection',
            data: data
        });
    })

    let outputs = await pipeline(data.image, {
        threshold: 0.9,
        percentage: true
    })

    self.postMessage({
        type: 'complete',
        target: data.elementIdToUpdate,
        targetType: data.targetType,
        chartId: data.chartId,
        data: outputs
    });
}

