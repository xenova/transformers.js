const {
    Callable,
    softmax,
    getTopItems,
    cos_sim,
    pathJoin
} = require("./utils.js");

const {
    AutoTokenizer
} = require("./tokenizers.js");
const {
    AutoModel,
    AutoModelForSequenceClassification,
    AutoModelForQuestionAnswering,
    AutoModelForMaskedLM,
    AutoModelForSeq2SeqLM,
    AutoModelForCausalLM,
    AutoModelForVision2Seq,
    AutoModelForImageClassification,
} = require("./models.js");
const {
    AutoProcessor
} = require("./processors.js");


const {
    env
} = require('./env.js');


class Pipeline extends Callable {
    constructor(task, tokenizer, model) {
        super();
        this.task = task;
        this.tokenizer = tokenizer;
        this.model = model;
    }

    async dispose() {
        return await this.model.dispose();
    }

    async _call(texts) {
        // Run tokenization
        let inputs = this.tokenizer(texts, {
            padding: true,
            truncate: true
        });

        // Run model
        let outputs = await this.model(inputs)

        return [inputs, outputs];
    }
}

class TextClassificationPipeline extends Pipeline {
    async _call(texts, {
        topk = 1
    } = {}) {

        let [inputs, outputs] = await super._call(texts);

        let id2label = this.model.config.id2label;
        let toReturn = [];
        for (let batch of outputs.logits) {
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

        return Array.isArray(texts) || topk === 1 ? toReturn : toReturn[0];
    }
}

class QuestionAnsweringPipeline extends Pipeline {
    async _call(question, context,
        {
            topk = 1
        } = {}
    ) {

        let inputs = this.tokenizer(question, {
            text_pair: context
        })

        let output = await this.model(inputs);

        let toReturn = [];
        for (let j = 0; j < output.start_logits.dims[0]; ++j) {
            let ids = inputs.input_ids.get(j);
            let sepIndex = ids.indexOf(this.tokenizer.sep_token_id);

            let s1 = Array.from(softmax(output.start_logits.get(j).data))
                .map((x, i) => [x, i])
                .filter(x => x[1] > sepIndex);
            let e1 = Array.from(softmax(output.end_logits.get(j).data))
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

class FillMaskPipeline extends Pipeline {
    async _call(texts, {
        topk = 5
    } = {}) {
        // Fill the masked token in the text(s) given as inputs.

        // Run tokenization
        let [inputs, outputs] = await super._call(texts);

        // Determine indices of mask tokens
        // let mask_token_indices = inputs.input_ids.data.map(x => )

        // let logits = reshape(outputs.logits.data, outputs.logits.dims);

        let tokenizer = this.tokenizer;

        let toReturn = [];

        for (let i = 0; i < inputs.input_ids.dims[0]; ++i) {
            let ids = inputs.input_ids.get(i);
            let mask_token_index = ids.indexOf(this.tokenizer.mask_token_id)

            if (mask_token_index === -1) {
                throw Error(`Mask token (${tokenizer.mask_token}) not found in text.`)
            }
            let logits = outputs.logits.get(i);
            let itemLogits = logits.get(mask_token_index);

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

class Text2TextGenerationPipeline extends Pipeline {
    _key = null;

    async _call(texts, generate_kwargs = {}) {
        if (!Array.isArray(texts)) {
            texts = [texts];
        }
        // Add prefixes, if present
        let task_specific_params = this.model.config.task_specific_params
        if (task_specific_params && task_specific_params[this.task] && task_specific_params[this.task].prefix) {
            texts = texts.map(x => task_specific_params[this.task].prefix + x)
        }

        let input_ids = this.tokenizer(texts, {
            padding: true,
            truncate: true
        }).input_ids
        let outputTokenIds = (await this.model.generate(input_ids, generate_kwargs)).flat();

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

class SummarizationPipeline extends Text2TextGenerationPipeline {
    _key = 'summary_text';
}

class TranslationPipeline extends Text2TextGenerationPipeline {
    _key = 'translation_text';
}

class TextGenerationPipeline extends Pipeline {
    async _call(texts, generate_kwargs = {}) {
        let stringInput = typeof texts === 'string' || texts instanceof String;
        if (stringInput) {
            texts = [texts];
        }

        this.tokenizer.padding_side = 'left';
        let inputs = this.tokenizer(texts, {
            padding: true,
            truncate: true,
        });

        let input_ids = inputs.input_ids;
        let attention_mask = inputs.attention_mask;

        let outputTokenIds = await this.model.generate(input_ids, generate_kwargs, attention_mask);

        let toReturn = outputTokenIds.map((outTokens, i) => {
            let startText = texts[i].trim();
            let decoded = this.tokenizer.batch_decode(outTokens, {
                skip_special_tokens: true,
            }).map(x => {
                return {
                    generated_text: startText + x
                }
            });

            return decoded
        });

        return (stringInput && toReturn.length === 1) ? toReturn[0] : toReturn;
    }
}


class EmbeddingsPipeline extends Pipeline {
    async _call(texts) {
        let [inputs, outputs] = await super._call(texts);

        // Get embedding from outputs. This is typically indexed with some number.
        delete outputs['last_hidden_state'];
        let embeddingsTensor = Object.values(outputs)[0];

        // TODO - return as tensor?
        let embeddings = reshape(embeddingsTensor.data, embeddingsTensor.dims);

        return embeddings
    }

    cos_sim(arr1, arr2) {
        // Compute cosine similarity
        return cos_sim(arr1, arr2)
    }
}

class AutomaticSpeechRecognitionPipeline extends Pipeline {

    constructor(task, tokenizer, model, processor) {
        super(task, tokenizer, model);
        this.processor = processor;
    }

    async _call(audio, generate_kwargs = {}) {

        let input_features = (await this.processor(audio)).input_features

        let output = (await this.model.generate(input_features, generate_kwargs)).flat();

        return this.tokenizer.batch_decode(output, {
            skip_special_tokens: true,
        })
    }
}


class ImageToTextPipeline extends Pipeline {
    constructor(task, tokenizer, model, processor) {
        super(task, tokenizer, model);
        this.processor = processor;
    }

    async _call(images, generate_kwargs = {}) {
        let pixel_values = (await this.processor(images)).pixel_values;

        let toReturn = [];
        for (let batch of pixel_values) {
            batch.dims = [1, ...batch.dims]
            let output = (await this.model.generate(batch, generate_kwargs)).flat();
            let decoded = this.tokenizer.batch_decode(output, {
                skip_special_tokens: true,
            }).map(x => {
                return { generated_text: x.trim() }
            })
            toReturn.push(decoded);
        }

        return Array.isArray(images) ? toReturn : toReturn[0];
    }
}

class ImageClassificationPipeline extends Pipeline {
    constructor(task, model, processor) {
        super(task, null, model); // TODO tokenizer
        this.processor = processor;
    }

    async _call(images, {
        topk = 1
    } = {}) {

        let inputs = await this.processor(images);
        let output = await this.model(inputs);

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

        return Array.isArray(images) || topk === 1 ? toReturn : toReturn[0];
    }

}

const SUPPORTED_TASKS = {
    "text-classification": {
        "tokenizer": AutoTokenizer,
        "pipeline": TextClassificationPipeline,
        "model": AutoModelForSequenceClassification,
        "default": {
            "model": "distilbert-base-uncased-finetuned-sst-2-english",
        },
        "type": "text",
    },

    "question-answering": {
        "tokenizer": AutoTokenizer,
        "pipeline": QuestionAnsweringPipeline,
        "model": AutoModelForQuestionAnswering,
        "default": {
            "model": "distilbert-base-cased-distilled-squad"
        },
        "type": "text",
    },

    "fill-mask": {
        "tokenizer": AutoTokenizer,
        "pipeline": FillMaskPipeline,
        "model": AutoModelForMaskedLM,
        "default": {
            "model": "bert-base-uncased"
        },
        "type": "text",
    },
    "summarization": {
        "tokenizer": AutoTokenizer,
        "pipeline": SummarizationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            "model": "sshleifer/distilbart-cnn-6-6"
        },
        "type": "text",
    },
    "translation": {
        "tokenizer": AutoTokenizer,
        "pipeline": TranslationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            "model": "t5-small"
        },
        "type": "text",
    },
    "text2text-generation": {
        "tokenizer": AutoTokenizer,
        "pipeline": Text2TextGenerationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            "model": "google/flan-t5-small"
        },
        "type": "text",
    },
    "text-generation": {
        "tokenizer": AutoTokenizer,
        "pipeline": TextGenerationPipeline,
        "model": AutoModelForCausalLM,
        "default": {
            "model": "gpt2"
        },
        "type": "text",
    },

    "automatic-speech-recognition": {
        "tokenizer": AutoTokenizer,
        "pipeline": AutomaticSpeechRecognitionPipeline,
        "model": AutoModelForSeq2SeqLM,
        "processor": AutoProcessor,
        "default": {
            "model": "openai/whisper-tiny.en"
        },
        "type": "multimodal",
    },

    "image-to-text": {
        "tokenizer": AutoTokenizer,
        "pipeline": ImageToTextPipeline,
        "model": AutoModelForVision2Seq,
        "processor": AutoProcessor,
        "default": {
            "model": "nlpconnect/vit-gpt2-image-captioning"
        },
        "type": "multimodal",
    },

    "image-classification": {
        // no tokenizer
        "pipeline": ImageClassificationPipeline,
        "model": AutoModelForImageClassification,
        "processor": AutoProcessor,
        "default": {
            "model": "google/vit-base-patch16-224"
        },
        "type": "multimodal",
    },

    // This task is not supported in HuggingFace transformers, but serves as a useful interface
    // for dealing with sentence-transformers (https://huggingface.co/sentence-transformers)
    "embeddings": {
        "tokenizer": AutoTokenizer,
        "pipeline": EmbeddingsPipeline,
        "model": AutoModel,
        "default": {
            "model": "sentence-transformers/all-MiniLM-L6-v2"
        },
        "type": "text",
    },
}

const TASK_NAME_MAPPING = {
    // Fix mismatch between pipeline's task name and exports (folder name)
    'text-classification': 'sequence-classification',
    'embeddings': 'default',
    'fill-mask': 'masked-lm',

    'text2text-generation': 'seq2seq-lm-with-past',
    'summarization': 'seq2seq-lm-with-past',
    'text-generation': 'causal-lm-with-past',

    'automatic-speech-recognition': 'speech2seq-lm-with-past',
    'image-to-text': 'vision2seq-lm-with-past',
}

const TASK_PREFIX_MAPPING = {
    // if task starts with one of these, set the corresponding folder name
    'translation': 'seq2seq-lm-with-past',
}


const TASK_ALIASES = {
    "sentiment-analysis": "text-classification",
    "ner": "token-classification",
    "vqa": "visual-question-answering",
}


async function pipeline(
    task,
    model = null,
    {
        progress_callback = null
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

    // determine suffix
    let suffix = TASK_NAME_MAPPING[task];
    if (!suffix) {
        // try get from suffix
        for (const [prefix, mapping] of Object.entries(TASK_PREFIX_MAPPING)) {
            if (task.startsWith(prefix)) {
                suffix = mapping;
                break;
            }
        }
    }

    if (!suffix) {
        // Still not set... so, we default to the name given
        suffix = task;
    }

    // Construct model path
    model = pathJoin(
        (env.remoteModels) ? env.remoteURL : env.localURL, // host prefix
        model, // model name
        suffix, // task suffix
    )

    let tokenizerClass = pipelineInfo.tokenizer;
    let modelClass = pipelineInfo.model;
    let pipelineClass = pipelineInfo.pipeline;
    let processorClass = pipelineInfo.processor;

    let promises = [];

    if (tokenizerClass) {
        promises.push(
            AutoTokenizer.from_pretrained(model, progress_callback),
        )
    }
    if (modelClass) {
        promises.push(
            modelClass.from_pretrained(model, progress_callback)
        )
    }

    if (processorClass) {
        promises.push(
            processorClass.from_pretrained(model, progress_callback)
        )
    }

    // Load tokenizer and model
    let items = await Promise.all(promises)
    return new pipelineClass(task, ...items);

}

function reshape(data, dimensions) {

    const totalElements = data.length;
    const dimensionSize = dimensions.reduce((a, b) => a * b);

    if (totalElements !== dimensionSize) {
        throw Error(`cannot reshape array of size ${totalElements} into shape (${dimensions})`);
    }

    let reshapedArray = data;

    for (let i = dimensions.length - 1; i >= 0; i--) {
        reshapedArray = reshapedArray.reduce((acc, val) => {
            let lastArray = acc[acc.length - 1];

            if (lastArray.length < dimensions[i]) {
                lastArray.push(val);
            } else {
                acc.push([val]);
            }

            return acc;
        }, [[]]);
    }

    return reshapedArray[0];
}

function product(...a) {
    // Cartesian product of items
    // Adapted from https://stackoverflow.com/a/43053803
    return a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e])));
}

module.exports = {
    pipeline
};
