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
} = require("./models.js");

const {
    env
} = require('./env.js')


class Pipeline extends Callable {
    constructor(tokenizer, model, task) {
        super();
        this.tokenizer = tokenizer;
        this.model = model;
        this.task = task;
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

        let [inputs, outputs] = await super._call(texts)

        let logits = reshape(outputs.logits.data, outputs.logits.dims);

        let id2label = this.model.config.id2label;
        let toReturn = [];
        for (let batch of logits) {
            let scores = getTopItems(softmax(batch), topk);

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
        let startLogits = reshape(output.start_logits.data, output.start_logits.dims);
        let endLogits = reshape(output.end_logits.data, output.end_logits.dims);

        let toReturn = [];
        for (let j = 0; j < startLogits.length; ++j) {

            let ids = inputs.input_ids[j]
            let sepIndex = ids.indexOf(this.tokenizer.sep_token_id);

            let s1 = softmax(startLogits[j]).map((x, i) => [x, i])
                .filter(x => x[1] > sepIndex);
            let e1 = softmax(endLogits[j]).map((x, i) => [x, i])
                .filter(x => x[1] > sepIndex);

            let options = product(s1, e1)
                .filter(x => x[0][1] <= x[1][1])
                .map(x => [x[0][1], x[1][1], x[0][0] * x[1][0]])
                .sort((a, b) => b[2] - a[2]);

            for (let k = 0; k < Math.min(options.length, topk); ++k) {
                let [start, end, score] = options[k];

                let answer_tokens = inputs.input_ids[j].slice(start, end + 1)

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
        if (topk === 1) {
            return toReturn[0];
        } else {
            return toReturn;
        }

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
        let mask_token_indices = inputs.input_ids.map(x => x.indexOf(this.tokenizer.mask_token_id))

        let logits = reshape(outputs.logits.data, outputs.logits.dims);

        let tokenizer = this.tokenizer;

        let toReturn = logits.map((batch, i) => {
            let mask_token_index = mask_token_indices[i];
            let itemLogits = batch[mask_token_index];

            let scores = getTopItems(softmax(itemLogits), topk);

            return scores.map(function (x, j) {
                let sequence = [...inputs.input_ids[i]];
                sequence[mask_token_index] = x[0];

                return {
                    score: x[1],
                    token: x[0],
                    token_str: tokenizer.model.vocab[x[0]],
                    sequence: tokenizer.decode(sequence, { skip_special_tokens: true }),
                }
            })
        })

        return Array.isArray(texts) ? toReturn : toReturn[0];
    }
}

class Text2TextGenerationPipeline extends Pipeline {
    _key = 'text';

    async _call(texts, generate_kwargs = {}) {
        if (!Array.isArray(texts)) {
            texts = [texts];
        }
        // Add prefixes, if present
        let task_specific_params = this.model.config.task_specific_params
        if (task_specific_params && task_specific_params[this.task] && task_specific_params[this.task].prefix) {
            texts = texts.map(x => task_specific_params[this.task].prefix + x)
        }

        let input_ids = this.tokenizer(texts).input_ids
        let outputTokenIds = await this.model.generate(input_ids, generate_kwargs);

        return outputTokenIds.map(x => {
            let text = this.tokenizer.decode(x, {
                skip_special_tokens: true,
            });
            return {
                [this._key]: text
            }
        });
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
        let input_ids = this.tokenizer(texts).input_ids;
        let outputTokenIds = await this.model.generate(input_ids, generate_kwargs);

        let toReturn = outputTokenIds.map((x, i) => {
            if (Array.isArray(x) && x.length !== 0 && Number.isInteger(x[0])) {
                x = [x]
            }
            let startText = texts[i].trim();
            return x.map(y => {
                let text = startText + this.tokenizer.decode(y, {
                    skip_special_tokens: true,
                });
                return {
                    generated_text: text
                }
            })
        });
        return stringInput ? toReturn[0] : toReturn;
    }
}


class EmbeddingsPipeline extends Pipeline {
    async _call(texts) {
        let [inputs, outputs] = await super._call(texts);

        // Get embedding from outputs. This is typically indexed with some number.
        delete outputs['last_hidden_state'];
        let embeddingsTensor = Object.values(outputs)[0];
        let embeddings = reshape(embeddingsTensor.data, embeddingsTensor.dims);

        return embeddings
    }

    cos_sim(arr1, arr2) {
        // Compute cosine similarity
        return cos_sim(arr1, arr2)
    }
}

const SUPPORTED_TASKS = {
    "text-classification": {
        "pipeline": TextClassificationPipeline,
        "model": AutoModelForSequenceClassification,
        "default": {
            "model": "distilbert-base-uncased-finetuned-sst-2-english",
        },
        "type": "text",
    },

    "question-answering": {
        "pipeline": QuestionAnsweringPipeline,
        "model": AutoModelForQuestionAnswering,
        "default": {
            "model": "distilbert-base-cased-distilled-squad"
        },
        "type": "text",
    },

    "fill-mask": {
        "pipeline": FillMaskPipeline,
        "model": AutoModelForMaskedLM,
        "default": {
            "model": "distilroberta-base"
        },
        "type": "text",
    },
    "summarization": {
        "pipeline": SummarizationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            "model": "sshleifer/distilbart-cnn-12-6"
        },
        "type": "text",
    },
    "translation": {
        "pipeline": TranslationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            "model": "t5-small"
        },
        "type": "text",
    },
    "text2text-generation": {
        "pipeline": Text2TextGenerationPipeline,
        "model": AutoModelForSeq2SeqLM,
        "default": {
            "model": "google/flan-t5-small"
        },
        "type": "text",
    },
    "text-generation": {
        "pipeline": TextGenerationPipeline,
        "model": AutoModelForCausalLM,
        "default": {
            "model": "gpt2"
        },
        "type": "text",
    },

    // This task is not supported in HuggingFace transformers, but serves as a useful interface
    // for dealing with sentence-transformers (https://huggingface.co/sentence-transformers)
    "embeddings": {
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

    let modelClass = pipelineInfo.model;
    let pipelineClass = pipelineInfo.pipeline;

    // Load tokenizer and model
    let [pipelineTokenizer, pipelineModel] = await Promise.all([
        AutoTokenizer.from_pretrained(model, progress_callback),
        modelClass.from_pretrained(model, progress_callback)
    ])

    return new pipelineClass(pipelineTokenizer, pipelineModel, task);

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
