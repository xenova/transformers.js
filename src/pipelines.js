const {
    Callable,
    softmax,
    getTopItems,
    cos_sim,
    pathJoin,
    isString,
    getFile
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
    AutoModelForObjectDetection
} = require("./models.js");
const {
    AutoProcessor
} = require("./processors.js");


const {
    env
} = require('./env.js');

const { Tensor } = require("./tensor_utils.js");

const { loadImage } = require("./image_utils.js");

async function prepareImages(images) {
    if (!Array.isArray(images)) {
        images = [images];
    }

    // Possibly convert any non-images to images
    images = await Promise.all(images.map(loadImage));

    return images;
}

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
            truncation: true
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

        let input_ids = this.tokenizer(texts, {
            padding: true,
            truncation: true
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
            truncation: true,
        });

        let input_ids = inputs.input_ids;
        let attention_mask = inputs.attention_mask;

        let outputTokenIds = await this.model.generate(input_ids, generate_kwargs, null, {
            inputs_attention_mask: attention_mask
        });

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

class ZeroShotClassificationPipeline extends Pipeline {
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
                })
                let outputs = await this.model(inputs)

                // TODO do not assume (2) is entailment. Better to use model.id2label
                if (softmaxEach) {
                    entails_logits.push([outputs.logits.data[0], outputs.logits.data[2]])
                } else {
                    entails_logits.push(outputs.logits.data[2])
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


class EmbeddingsPipeline extends Pipeline {
    // Should only be used with sentence-transformers
    // If you want to get the raw outputs from the model,
    // use `AutoModel.from_pretrained(...)`

    _mean_pooling(last_hidden_state, attention_mask) {
        // last_hidden_state: [batchSize, seqLength, embedDim]
        // attention_mask:    [batchSize, seqLength]

        let shape = [last_hidden_state.dims[0], last_hidden_state.dims[2]];
        let returnedData = new last_hidden_state.data.constructor(shape[0] * shape[1])
        let [batchSize, seqLength, embedDim] = last_hidden_state.dims;

        let outIndex = 0;
        for (let i = 0; i < batchSize; ++i) {
            let offset = i * embedDim * seqLength;

            for (let k = 0; k < embedDim; ++k) {
                let sum = 0;
                let count = 0;

                let attnMaskOffset = i * seqLength;
                let offset2 = offset + k;
                // Pool over all words in sequence
                for (let j = 0; j < seqLength; ++j) {
                    // index into attention mask
                    let attn = Number(attention_mask.data[attnMaskOffset + j]);

                    count += attn;
                    sum += last_hidden_state.data[offset2 + j * embedDim] * attn;
                }

                let avg = sum / count;
                returnedData[outIndex++] = avg;
            }
        }

        return new Tensor(
            last_hidden_state.type,
            returnedData,
            shape
        )
    }

    _normalize(tensor) {
        // Normalise tensors along dim=1
        // NOTE: only works for tensors of shape [batchSize, embedDim]
        // Operates in-place
        for (let batch of tensor) {
            let norm = Math.sqrt(batch.data.reduce((a, b) => a + b * b))

            for (let i = 0; i < batch.data.length; ++i) {
                batch.data[i] /= norm;
            }
        }
        return tensor;
    }

    async _call(texts) {
        let [inputs, outputs] = await super._call(texts);

        // Perform mean pooling, followed by a normalization step
        return this._normalize(this._mean_pooling(outputs.last_hidden_state, inputs.attention_mask));
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

    async _preprocess(audio, sampling_rate) {
        if (isString(audio)) {
            // Attempting to load from path

            if (typeof AudioContext === 'undefined') {
                // Running in node or an environment without AudioContext
                throw Error(
                    "Unable to load audio from path/URL since `AudioContext` is not available in your environment. " +
                    "As a result, audio data must be passed directly to the processor. " +
                    "If you are running in node.js, you can use an external library (e.g., https://github.com/audiojs/web-audio-api) to do this."
                )
            }
            const response = await (await getFile(audio)).arrayBuffer();
            const audioCTX = new AudioContext({ sampleRate: sampling_rate });
            const decoded = await audioCTX.decodeAudioData(response);

            // We now replicate HuggingFace's `ffmpeg_read` method:
            // 
            // When downmixing a stereo audio file to mono using the -ac 1 option in FFmpeg,
            // the audio signal is summed across both channels to create a single mono channel.
            // However, if the audio is at full scale (i.e. the highest possible volume level),
            // the summing of the two channels can cause the audio signal to clip or distort.

            // To prevent this clipping, FFmpeg applies a scaling factor of 1/sqrt(2) (~ 0.707)
            // to the audio signal before summing the two channels. This scaling factor ensures
            // that the combined audio signal will not exceed the maximum possible level, even
            // if both channels are at full scale.

            // After applying this scaling factor, the audio signal from both channels is summed
            // to create a single mono channel. It's worth noting that this scaling factor is
            // only applied when downmixing stereo audio to mono using the -ac 1 option in FFmpeg.
            // If you're using a different downmixing method, or if you're not downmixing the
            // audio at all, this scaling factor may not be needed.
            const SCALING_FACTOR = Math.sqrt(2);

            let left = decoded.getChannelData(0);
            let right = decoded.getChannelData(1);

            audio = new Float32Array(left.length);
            for (let i = 0; i < decoded.length; i++) {
                audio[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
            }
        }

        return audio;
    }

    async _call(audio, kwargs = {}) {
        let return_timestamps = kwargs.return_timestamps ?? false;
        let chunk_length_s = kwargs.chunk_length_s ?? 0;
        let stride_length_s = kwargs.stride_length_s ?? null;
        let chunk_callback = kwargs.chunk_callback ?? null;
        let force_full_sequences = kwargs.force_full_sequences ?? false;

        // TODO
        // task = 'transcribe',
        // language = 'en',

        let single = !Array.isArray(audio)
        if (single) {
            audio = [audio]
        }

        const sampling_rate = this.processor.feature_extractor.config.sampling_rate;
        const time_precision = this.processor.feature_extractor.config.chunk_length / this.model.config.max_source_positions;

        let toReturn = [];
        for (let aud of audio) {
            aud = await this._preprocess(aud, sampling_rate)

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
                // NOTE: doing sequentially for now
                let data = await this.model.generate(chunk.input_features, kwargs);


                // Get top beam
                chunk.tokens = data[0].flat()

                // convert stride to seconds
                chunk.stride = chunk.stride.map(x => x / sampling_rate);

                if (chunk_callback !== null) {
                    chunk_callback(chunk)
                }
            }

            // Merge text chunks
            let [full_text, optional] = this.tokenizer._decode_asr(chunks, {
                time_precision: time_precision,
                return_timestamps: return_timestamps,
                force_full_sequences: force_full_sequences
            });

            toReturn.push({ text: full_text, ...optional })
        }
        return single ? toReturn[0] : toReturn;
    }
}


class ImageToTextPipeline extends Pipeline {
    constructor(task, tokenizer, model, processor) {
        super(task, tokenizer, model);
        this.processor = processor;
    }

    async _call(images, generate_kwargs = {}) {
        let isBatched = Array.isArray(images);

        images = await prepareImages(images);

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

        return isBatched ? toReturn : toReturn[0];
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
        let isBatched = Array.isArray(images);
        images = await prepareImages(images);

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

        return isBatched || topk === 1 ? toReturn : toReturn[0];
    }

}

class ZeroShotImageClassificationPipeline extends Pipeline {

    constructor(task, tokenizer, model, processor) {
        super(task, tokenizer, model);
        this.processor = processor;
    }
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

        // Compare each image with each candidate label
        let image_inputs = await this.processor(images);
        let output = await this.model({ ...text_inputs, ...image_inputs });

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


class ObjectDetectionPipeline extends Pipeline {
    constructor(task, model, processor) {
        super(task, null, model); // TODO tokenizer
        this.processor = processor;
    }

    async _call(images, {
        threshold = 0.5,
        percentage = false, // get in percentage (true) or in pixels (false)
    } = {}) {
        let isBatched = Array.isArray(images);

        if (isBatched && images.length !== 1) {
            throw Error("Object detection pipeline currently only supports a batch size of 1.");
        }
        images = await prepareImages(images);

        let imageSizes = percentage ? null : images.map(x => [x.bitmap.width, x.bitmap.height]);

        let inputs = await this.processor(images);
        let output = await this.model(inputs);

        let processed = this.processor.feature_extractor.post_process_object_detection(output, threshold, imageSizes);

        // Add labels
        let id2label = this.model.config.id2label;
        processed.forEach(x => x.labels = x.classes.map(y => id2label[y]));

        return isBatched ? processed : processed[0];
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
    "zero-shot-classification": {
        "tokenizer": AutoTokenizer,
        "pipeline": ZeroShotClassificationPipeline,
        "model": AutoModelForSequenceClassification,
        "default": {
            "model": "facebook/bart-large-mnli",
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

    "zero-shot-image-classification": {
        // no tokenizer
        "tokenizer": AutoTokenizer,
        "pipeline": ZeroShotImageClassificationPipeline,
        "model": AutoModel,
        "processor": AutoProcessor,
        "default": {
            "model": "openai/clip-vit-base-patch32"
        },
        "type": "multimodal",
    },

    "object-detection": {
        // no tokenizer
        "pipeline": ObjectDetectionPipeline,
        "model": AutoModelForObjectDetection,
        "processor": AutoProcessor,
        "default": {
            "model": "facebook/detr-resnet-50"
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

    'zero-shot-image-classification': 'default',
    'zero-shot-classification': 'sequence-classification'
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


function product(...a) {
    // Cartesian product of items
    // Adapted from https://stackoverflow.com/a/43053803
    return a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e])));
}

module.exports = {
    pipeline
};
