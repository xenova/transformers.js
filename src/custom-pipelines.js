/**
 * @file Custom pipelines for transformers.js
 * @module custom-pipelines
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
    AutoModelForSpeechSeq2Seq,
    AutoModelForTextToWaveform,
    AutoModelForTextToSpectrogram,
    AutoModelForCTC,
    AutoModelForCausalLM,
    AutoModelForVision2Seq,
    AutoModelForImageClassification,
    AutoModelForImageSegmentation,
    AutoModelForSemanticSegmentation,
    AutoModelForObjectDetection,
    AutoModelForZeroShotObjectDetection,
    AutoModelForDocumentQuestionAnswering,
    AutoModelForImageToImage,
    AutoModelForDepthEstimation,
    AutoModelForImageFeatureExtraction,
    PreTrainedModel,
    CLIPTextModelWithProjection,
} from './models.js';
import {
    AutoProcessor,
    Processor
} from './processors.js';

import {
    Callable,
} from './utils/generic.js';

import {
    dispatchCallback,
    pop,
    product,
} from './utils/core.js';
import {
    softmax,
    max,
    getTopItems,
    round,
    dot,
} from './utils/maths.js';
import {
    read_audio
} from './utils/audio.js';
import {
    Tensor,
    mean_pooling,
    interpolate,
    quantize_embeddings,
} from './utils/tensor.js';
import { RawImage } from './utils/image.js';
import {
    ImageFeatureExtractionPipeline,
} from './pipelines.js';

/**
 * const texts = ['cat', 'dog', 'bird'];
 * const text_embeds = await image_feature_extractor.get_text_embeddings(texts);
 * 
 * const sim = image_feature_extractor.get_similarities(features, text_embeds);
 * console.log(sim);
 * // [[0.9978122551514895,0],[0.00124180868416185,2],[0.0009459361643486246,1]]
 */
export class CustomImageFeatureExtractionPipeline extends ImageFeatureExtractionPipeline {
    constructor(options) {
        super(options)
        this.textModel = undefined
    }

    /**
     * Get text embeddings
     * @param {string|string[]} texts 
     * @returns 
     */
    async get_text_embeddings(texts) {
        if (!this.textModel) {
            if (!['CLIPVisionModelWithProjection'].includes(this.model.modelClassName)) {
                throw new Error('modelText not supported for this model.');
            }
            this.textModel = await CLIPTextModelWithProjection.from_pretrained(this.model.modelRepoName);
            this.tokenizer = await AutoTokenizer.from_pretrained(this.model.modelRepoName);
        }

        const text_inputs = this.tokenizer(texts, {
            padding: 'max_length',
            truncation: true
        });
        const {
            text_embeds
        } = await this.textModel(text_inputs);

        return text_embeds;
    }

    /**
     * Get similarities between image and text embeddings
     * @param {*} object_embeds 
     * @param {*} text_embeds 
     * @returns array of [percentage, index]
     */
    get_similarities(object_embeds, text_embeds) {
        if (object_embeds.normalize) object_embeds = object_embeds.normalize().tolist();
        if (text_embeds.normalize) text_embeds = text_embeds.normalize().tolist();

        if (object_embeds.length > text_embeds.length) {
            [object_embeds, text_embeds] = [text_embeds, object_embeds];
        }

        let similarities = text_embeds.map(
            x => object_embeds.map(y => 100 * dot(x, y))
        )
        similarities = softmax(similarities).map((a, b) => [a, b]).sort((a, b) => b[0] - a[0]);

        return similarities;
    }
}