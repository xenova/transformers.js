
/**
 * @file Processors are used to prepare non-textual inputs (e.g., image or audio) for a model.
 * 
 * **Example:** Using a `WhisperProcessor` to prepare an audio input for a model.
 * ```javascript
 * import { AutoProcessor, read_audio } from '@xenova/transformers';
 *
 * let processor = await AutoProcessor.from_pretrained('openai/whisper-tiny.en');
 * let audio = await read_audio('https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/mlk.flac', 16000);
 * let { input_features } = await processor(audio);
 * // Tensor {
 * //   data: Float32Array(240000) [0.4752984642982483, 0.5597258806228638, 0.56434166431427, ...],
 * //   dims: [1, 80, 3000],
 * //   type: 'float32',
 * //   size: 240000,
 * // }
 * ```
 * 
 * @module processors
 */
import {
    Callable,
    calculateDimensions,
} from './utils/core.js';

import {
    getModelJSON,
} from './utils/hub.js';

import {
    max,
    softmax,
    FFT
} from './utils/maths.js';


import { Tensor, transpose, cat, interpolate } from './utils/tensor.js';

import { RawImage } from './utils/image.js';
import { getMelFilters } from './utils/audio.js';


// Helper functions

/**
 * Converts bounding boxes from center format to corners format.
 * 
 * @param {number[]} arr The coordinate for the center of the box and its width, height dimensions (center_x, center_y, width, height)
 * @returns {number[]} The coodinates for the top-left and bottom-right corners of the box (top_left_x, top_left_y, bottom_right_x, bottom_right_y)
 */
function center_to_corners_format([centerX, centerY, width, height]) {
    return [
        centerX - width / 2,
        centerY - height / 2,
        centerX + width / 2,
        centerY + height / 2
    ];
}

/**
 * Post-processes the outputs of the model (for object detection).
 * @param {Object} outputs The outputs of the model that must be post-processed
 * @param {Tensor} outputs.logits The logits
 * @param {Tensor} outputs.pred_boxes The predicted boxes.
 * @return {Object[]} An array of objects containing the post-processed outputs.
 */
function post_process_object_detection(outputs, threshold = 0.5, target_sizes = null) {
    const out_logits = outputs.logits;
    const out_bbox = outputs.pred_boxes;
    const [batch_size, num_boxes, num_classes] = out_logits.dims;

    if (target_sizes !== null && target_sizes.length !== batch_size) {
        throw Error("Make sure that you pass in as many target sizes as the batch dimension of the logits")
    }
    let toReturn = [];
    for (let i = 0; i < batch_size; ++i) {
        let target_size = target_sizes !== null ? target_sizes[i] : null;
        let info = {
            boxes: [],
            classes: [],
            scores: []
        }
        let logits = out_logits[i];
        let bbox = out_bbox[i];

        for (let j = 0; j < num_boxes; ++j) {
            let logit = logits[j];

            // Get most probable class
            let maxIndex = max(logit.data)[1];

            if (maxIndex === num_classes - 1) {
                // This is the background class, skip it
                continue;
            }

            // Compute softmax over classes
            let probs = softmax(logit.data);

            let score = probs[maxIndex];
            if (score > threshold) {
                // Some class has a high enough probability
                /** @type {number[]} */
                let box = bbox[j].data;

                // convert to [x0, y0, x1, y1] format
                box = center_to_corners_format(box)
                if (target_size !== null) {
                    box = box.map((x, i) => x * target_size[(i + 1) % 2])
                }

                info.boxes.push(box);
                info.classes.push(maxIndex);
                info.scores.push(score);
            }
        }
        toReturn.push(info);
    }
    return toReturn;
}

/**
 * Base class for feature extractors.
 *
 * @extends Callable
 */
export class FeatureExtractor extends Callable {
    /**
     * Constructs a new FeatureExtractor instance.
     *
     * @param {Object} config The configuration for the feature extractor.
     */
    constructor(config) {
        super();
        this.config = config
    }
}

/**
 * Feature extractor for image models.
 *
 * @extends FeatureExtractor
 */
export class ImageFeatureExtractor extends FeatureExtractor {

    /**
     * Constructs a new ImageFeatureExtractor instance.
     *
     * @param {Object} config The configuration for the feature extractor.
     * @param {number[]} config.image_mean The mean values for image normalization.
     * @param {number[]} config.image_std The standard deviation values for image normalization.
     * @param {boolean} config.do_rescale Whether to rescale the image pixel values to the [0,1] range.
     * @param {number} config.rescale_factor The factor to use for rescaling the image pixel values.
     * @param {boolean} config.do_normalize Whether to normalize the image pixel values.
     * @param {boolean} config.do_resize Whether to resize the image.
     * @param {number} config.resample What method to use for resampling.
     * @param {number} config.size The size to resize the image to.
     */
    constructor(config) {
        super(config);

        this.image_mean = this.config.image_mean;
        this.image_std = this.config.image_std;

        this.resample = this.config.resample ?? 2; // 2 => bilinear
        this.do_rescale = this.config.do_rescale ?? true;
        this.rescale_factor = this.config.rescale_factor ?? (1 / 255);
        this.do_normalize = this.config.do_normalize;

        this.do_resize = this.config.do_resize;
        this.size = this.config.size;

        this.do_center_crop = this.config.do_center_crop;
        this.crop_size = this.config.crop_size;
        this.do_convert_rgb = this.config.do_convert_rgb ?? true;

        this.pad_size = this.config.pad_size;
        this.do_pad = (this.config.do_pad ?? false) && this.pad_size;
    }

    /**
     * Preprocesses the given image.
     *
     * @param {RawImage} image The image to preprocess.
     * @returns {Promise<any>} The preprocessed image as a Tensor.
     */
    async preprocess(image) {

        // First, convert image to RGB if specified in config.
        if (this.do_convert_rgb) {
            image = image.rgb();
        }

        const srcWidth = image.width;   // original width
        const srcHeight = image.height; // original height

        // Next, resize all images
        if (this.do_resize) {
            // TODO:
            // For efficiency reasons, it might be best to merge the resize and center crop operations into one.

            // `this.size` comes in many forms, so we need to handle them all here:
            // 1. `this.size` is an integer, in which case we resize the image to be a square 

            let shortest_edge;
            let longest_edge;

            // Support both formats for backwards compatibility
            if (Number.isInteger(this.size)) {
                shortest_edge = this.size;
                longest_edge = this.config.max_size ?? shortest_edge;

            } else {
                // Extract known properties from `this.size`
                shortest_edge = this.size.shortest_edge;
                longest_edge = this.size.longest_edge;
            }

            // If `longest_edge` and `shortest_edge` are set, maintain aspect ratio and resize to `shortest_edge`
            // while keeping the largest dimension <= `longest_edge`
            if (shortest_edge !== undefined || longest_edge !== undefined) {
                // http://opensourcehacker.com/2011/12/01/calculate-aspect-ratio-conserving-resize-for-images-in-javascript/
                // Try resize so that shortest edge is `this.shortest_edge` (target)
                const shortResizeFactor = shortest_edge === undefined
                    ? 1 // If `shortest_edge` is not set, don't upscale
                    : Math.max(shortest_edge / srcWidth, shortest_edge / srcHeight);

                const newWidth = srcWidth * shortResizeFactor;
                const newHeight = srcHeight * shortResizeFactor;

                // The new width and height might be greater than `this.longest_edge`, so
                // we downscale again to ensure the largest dimension is `this.longest_edge` 
                const longResizeFactor = longest_edge === undefined
                    ? 1 // If `longest_edge` is not set, don't downscale
                    : Math.min(longest_edge / newWidth, longest_edge / newHeight);

                // To avoid certain floating point precision issues, we round to 3 decimal places
                const finalWidth = Math.floor(Number((newWidth * longResizeFactor).toPrecision(3)));
                const finalHeight = Math.floor(Number((newHeight * longResizeFactor).toPrecision(3)));

                // Perform resize
                image = await image.resize(finalWidth, finalHeight, {
                    resample: this.resample,
                });

            } else if (this.size.width !== undefined && this.size.height !== undefined) {
                // If `width` and `height` are set, resize to those dimensions
                image = await image.resize(this.size.width, this.size.height, {
                    resample: this.resample,
                });
            } else {
                throw new Error(`Could not resize image due to unsupported \`this.size\` option in config: ${JSON.stringify(this.size)}`);
            }
        }

        if (this.do_center_crop) {

            let crop_width;
            let crop_height;
            if (Number.isInteger(this.crop_size)) {
                crop_width = this.crop_size;
                crop_height = this.crop_size;
            } else {
                crop_width = this.crop_size.width;
                crop_height = this.crop_size.height;
            }

            image = await image.center_crop(crop_width, crop_height);
        }

        let reshaped_input_size = [image.height, image.width];

        // TODO is it okay to pad before rescaling/normalizing?
        if (this.do_pad) {
            let left = 0;
            let right = this.pad_size.width - image.width;
            let top = 0;
            let bottom = this.pad_size.height - image.height;

            image = await image.pad([left, right, top, bottom]);
        }

        const pixelData = Float32Array.from(image.data);

        if (this.do_rescale) {
            for (let i = 0; i < pixelData.length; ++i) {
                pixelData[i] = this.rescale_factor * pixelData[i];
            }
        }

        if (this.do_normalize) {
            let image_mean = this.image_mean;
            if (!Array.isArray(this.image_mean)) {
                image_mean = new Array(image.channels).fill(image_mean);
            }

            let image_std = this.image_std;
            if (!Array.isArray(this.image_std)) {
                image_std = new Array(image.channels).fill(image_mean);
            }

            if (image_mean.length !== image.channels || image_std.length !== image.channels) {
                throw new Error(`When set to arrays, the length of \`image_mean\` (${image_mean.length}) and \`image_std\` (${image_std.length}) must match the number of channels in the image (${image.channels}).`);
            }

            for (let i = 0; i < pixelData.length; i += image.channels) {
                for (let j = 0; j < image.channels; ++j) {
                    pixelData[i + j] = (pixelData[i + j] - this.image_mean[j]) / this.image_std[j];
                }
            }
        }

        // convert to channel dimension format:
        let imgDims = [image.height, image.width, image.channels];
        let img = new Tensor('float32', pixelData, imgDims);
        let transposed = transpose(img, [2, 0, 1]); // hwc -> chw

        return {
            original_size: [srcHeight, srcWidth],
            reshaped_input_size: reshaped_input_size,
            pixel_values: transposed,
        }
    }

    /**
     * Calls the feature extraction process on an array of image
     * URLs, preprocesses each image, and concatenates the resulting
     * features into a single Tensor.
     * @param {any} images The URL(s) of the image(s) to extract features from.
     * @returns {Promise<Object>} An object containing the concatenated pixel values (and other metadata) of the preprocessed images.
     */
    async _call(images) {
        if (!Array.isArray(images)) {
            images = [images];
        }

        let imageData = await Promise.all(images.map(x => this.preprocess(x)));

        // TODO:

        // Concatenate pixel values
        // TEMP: Add batch dimension so that concat works
        imageData.forEach(x => x.pixel_values.dims = [1, ...x.pixel_values.dims]);
        let pixel_values = cat(imageData.map(x => x.pixel_values));

        return {
            pixel_values: pixel_values,

            // Original sizes of images
            original_sizes: imageData.map(x => x.original_size),

            // Reshaped sizes of images, before padding or cropping
            reshaped_input_sizes: imageData.map(x => x.reshaped_input_size),
        }
    }

}

export class ViTFeatureExtractor extends ImageFeatureExtractor { }
export class MobileViTFeatureExtractor extends ImageFeatureExtractor { }
export class DeiTFeatureExtractor extends ImageFeatureExtractor { }

/**
 * Detr Feature Extractor.
 *
 * @extends ImageFeatureExtractor
 */
export class DetrFeatureExtractor extends ImageFeatureExtractor {
    /**
     * Calls the feature extraction process on an array of image URLs, preprocesses
     * each image, and concatenates the resulting features into a single Tensor.
     * @param {any} urls The URL(s) of the image(s) to extract features from.
     * @returns {Promise<Object>} An object containing the concatenated pixel values of the preprocessed images.
     */
    async _call(urls) {
        let result = await super._call(urls);

        // TODO support differently-sized images, for now assume all images are the same size.
        // TODO support different mask sizes (not just 64x64)
        // Currently, just fill pixel mask with 1s
        let maskSize = [result.pixel_values.dims[0], 64, 64];
        result.pixel_mask = new Tensor(
            'int64',
            // TODO: fix error below
            new BigInt64Array(maskSize.reduce((a, b) => a * b)).fill(1n),
            maskSize
        );

        return result;
    }

    /**
     * Post-processes the outputs of the model (for object detection).
     * @param {Object} outputs The outputs of the model that must be post-processed
     * @param {Tensor} outputs.logits The logits
     * @param {Tensor} outputs.pred_boxes The predicted boxes.
     * @return {Object[]} An array of objects containing the post-processed outputs.
     */

    /** @type {post_process_object_detection} */
    post_process_object_detection(...args) {
        return post_process_object_detection(...args);
    }

    /**
     * Binarize the given masks using `object_mask_threshold`, it returns the associated values of `masks`, `scores` and `labels`.
     * @param {Tensor} class_logits The class logits.
     * @param {Tensor} mask_logits The mask logits.
     * @param {number} object_mask_threshold A number between 0 and 1 used to binarize the masks.
     * @param {number} num_labels The number of labels.
     * @returns {[Tensor[], number[], number[]]} The binarized masks, the scores, and the labels.
     */
    remove_low_and_no_objects(class_logits, mask_logits, object_mask_threshold, num_labels) {

        let mask_probs_item = [];
        let pred_scores_item = [];
        let pred_labels_item = [];

        for (let j = 0; j < class_logits.dims[0]; ++j) {
            let cls = class_logits[j];
            let mask = mask_logits[j];

            let pred_label = max(cls.data)[1];
            if (pred_label === num_labels) {
                // Is the background, so we ignore it
                continue;
            }

            let scores = softmax(cls.data);
            let pred_score = scores[pred_label];
            if (pred_score > object_mask_threshold) {
                mask_probs_item.push(mask);
                pred_scores_item.push(pred_score);
                pred_labels_item.push(pred_label);
            }
        }

        return [mask_probs_item, pred_scores_item, pred_labels_item];

    }

    /**
     * Checks whether the segment is valid or not.
     * @param {Int32Array} mask_labels Labels for each pixel in the mask.
     * @param {Tensor[]} mask_probs Probabilities for each pixel in the masks.
     * @param {number} k The class id of the segment.
     * @param {number} mask_threshold The mask threshold.
     * @param {number} overlap_mask_area_threshold The overlap mask area threshold.
     * @returns {[boolean, number[]]} Whether the segment is valid or not, and the indices of the valid labels.
     */
    check_segment_validity(
        mask_labels,
        mask_probs,
        k,
        mask_threshold = 0.5,
        overlap_mask_area_threshold = 0.8
    ) {
        // mask_k is a 1D array of indices, indicating where the mask is equal to k
        let mask_k = [];
        let mask_k_area = 0;
        let original_area = 0;

        // Compute the area of all the stuff in query k
        for (let i = 0; i < mask_labels.length; ++i) {
            if (mask_labels[i] === k) {
                mask_k.push(i);
                ++mask_k_area;
            }

            if (mask_probs[k].data[i] >= mask_threshold) {
                ++original_area;
            }
        }
        let mask_exists = mask_k_area > 0 && original_area > 0;

        // Eliminate disconnected tiny segments
        if (mask_exists) {
            // Perform additional check
            let area_ratio = mask_k_area / original_area;
            mask_exists = area_ratio > overlap_mask_area_threshold;
        }

        return [mask_exists, mask_k]
    }

    /**
     * Computes the segments.
     * @param {Tensor[]} mask_probs The mask probabilities.
     * @param {number[]} pred_scores The predicted scores.
     * @param {number[]} pred_labels The predicted labels.
     * @param {number} mask_threshold The mask threshold.
     * @param {number} overlap_mask_area_threshold The overlap mask area threshold.
     * @param {Set<number>} label_ids_to_fuse The label ids to fuse.
     * @param {number[]} target_size The target size of the image.
     * @returns {[Tensor, Array<{id: number, label_id: number, score: number}>]} The computed segments.
     */
    compute_segments(
        mask_probs,
        pred_scores,
        pred_labels,
        mask_threshold,
        overlap_mask_area_threshold,
        label_ids_to_fuse = null,
        target_size = null,
    ) {
        let [height, width] = target_size ?? mask_probs[0].dims;

        let segmentation = new Tensor(
            'int32',
            new Int32Array(height * width),
            [height, width]
        );
        let segments = [];

        // 1. If target_size is not null, we need to resize the masks to the target size
        if (target_size !== null) {
            // resize the masks to the target size
            for (let i = 0; i < mask_probs.length; ++i) {
                mask_probs[i] = interpolate(mask_probs[i], target_size, 'bilinear', false);
            }
        }

        // 2. Weigh each mask by its prediction score
        // NOTE: `mask_probs` is updated in-place
        // 
        // Temporary storage for the best label/scores for each pixel ([height, width]):
        let mask_labels = new Int32Array(mask_probs[0].data.length);
        let bestScores = new Float32Array(mask_probs[0].data.length);

        for (let i = 0; i < mask_probs.length; ++i) {
            let score = pred_scores[i];

            for (let j = 0; j < mask_probs[i].data.length; ++j) {
                mask_probs[i].data[j] *= score
                if (mask_probs[i].data[j] > bestScores[j]) {
                    mask_labels[j] = i;
                    bestScores[j] = mask_probs[i].data[j];
                }
            }
        }

        let current_segment_id = 0;

        // let stuff_memory_list = {}
        for (let k = 0; k < pred_labels.length; ++k) {
            let pred_class = pred_labels[k];

            // TODO add `should_fuse`
            // let should_fuse = pred_class in label_ids_to_fuse

            // Check if mask exists and large enough to be a segment
            let [mask_exists, mask_k] = this.check_segment_validity(
                mask_labels,
                mask_probs,
                k,
                mask_threshold,
                overlap_mask_area_threshold
            )

            if (!mask_exists) {
                // Nothing to see here
                continue;
            }

            // TODO
            // if (pred_class in stuff_memory_list) {
            //     current_segment_id = stuff_memory_list[pred_class]
            // } else {
            //     current_segment_id += 1;
            // }
            ++current_segment_id;


            // Add current object segment to final segmentation map
            for (let index of mask_k) {
                segmentation.data[index] = current_segment_id;
            }

            segments.push({
                id: current_segment_id,
                label_id: pred_class,
                // was_fused: should_fuse, TODO
                score: pred_scores[k],
            })

            // TODO
            // if(should_fuse){
            //     stuff_memory_list[pred_class] = current_segment_id
            // }
        }

        return [segmentation, segments];
    }

    /**
     * Post-process the model output to generate the final panoptic segmentation.
     * @param {*} outputs The model output to post process
     * @param {number} [threshold=0.5] The probability score threshold to keep predicted instance masks.
     * @param {number} [mask_threshold=0.5] Threshold to use when turning the predicted masks into binary values.
     * @param {number} [overlap_mask_area_threshold=0.8] The overlap mask area threshold to merge or discard small disconnected parts within each binary instance mask.
     * @param {Set<number>} [label_ids_to_fuse=null] The labels in this state will have all their instances be fused together.
     * @param {number[][]} [target_sizes=null] The target sizes to resize the masks to.
     * @returns {Array<{ segmentation: Tensor, segments_info: Array<{id: number, label_id: number, score: number}>}>}
     */
    post_process_panoptic_segmentation(
        outputs,
        threshold = 0.5,
        mask_threshold = 0.5,
        overlap_mask_area_threshold = 0.8,
        label_ids_to_fuse = null,
        target_sizes = null,
    ) {
        if (label_ids_to_fuse === null) {
            console.warn("`label_ids_to_fuse` unset. No instance will be fused.")
            label_ids_to_fuse = new Set();
        }

        const class_queries_logits = outputs.logits; // [batch_size, num_queries, num_classes+1]
        const masks_queries_logits = outputs.pred_masks; // [batch_size, num_queries, height, width]

        const mask_probs = masks_queries_logits.sigmoid()  // [batch_size, num_queries, height, width]

        let [batch_size, num_queries, num_labels] = class_queries_logits.dims;
        num_labels -= 1; // Remove last class (background)

        if (target_sizes !== null && target_sizes.length !== batch_size) {
            throw Error("Make sure that you pass in as many target sizes as the batch dimension of the logits")
        }

        let toReturn = [];
        for (let i = 0; i < batch_size; ++i) {
            let target_size = target_sizes !== null ? target_sizes[i] : null;

            let class_logits = class_queries_logits[i];
            let mask_logits = mask_probs[i];

            let [mask_probs_item, pred_scores_item, pred_labels_item] = this.remove_low_and_no_objects(class_logits, mask_logits, threshold, num_labels);

            if (pred_labels_item.length === 0) {
                // No mask found
                let [height, width] = target_size ?? mask_logits.dims.slice(-2);

                let segmentation = new Tensor(
                    'int32',
                    new Int32Array(height * width).fill(-1),
                    [height, width]
                )
                toReturn.push({
                    segmentation: segmentation,
                    segments_info: []
                });
                continue;
            }


            // Get segmentation map and segment information of batch item
            let [segmentation, segments] = this.compute_segments(
                mask_probs_item,
                pred_scores_item,
                pred_labels_item,
                mask_threshold,
                overlap_mask_area_threshold,
                label_ids_to_fuse,
                target_size,
            )

            toReturn.push({
                segmentation: segmentation,
                segments_info: segments
            })
        }

        return toReturn;
    }

    post_process_instance_segmentation() {
        // TODO
        throw Error("Not implemented yet");
    }
}

export class YolosFeatureExtractor extends ImageFeatureExtractor {
    /** @type {post_process_object_detection} */
    post_process_object_detection(...args) {
        return post_process_object_detection(...args);
    }
}

export class SamImageProcessor extends ImageFeatureExtractor {
    async _call(images, input_points) {
        let {
            pixel_values,
            original_sizes,
            reshaped_input_sizes,
        } = await super._call(images);

        let shape = calculateDimensions(input_points);

        if (shape.length === 3) {
            // Correct user's input
            shape = [1, ...shape];
            input_points = [input_points];
        } else if (shape.length !== 4) {
            throw Error("The input_points must be a 4D tensor of shape `batch_size`, `point_batch_size`, `nb_points_per_image`, `2`.")
        }

        // Reshape input points
        for (let i = 0; i < input_points.length; ++i) { // batch_size
            let originalImageSize = original_sizes[i];
            let reshapedImageSize = reshaped_input_sizes[i];

            let resizeFactors = [
                reshapedImageSize[0] / originalImageSize[0],
                reshapedImageSize[1] / originalImageSize[1]
            ]

            for (let j = 0; j < input_points[i].length; ++j) { // point_batch_size
                for (let k = 0; k < input_points[i][j].length; ++k) { // nb_points_per_image
                    for (let w = 0; w < input_points[i][j][k].length; ++w) { // 2
                        input_points[i][j][k][w] *= resizeFactors[w];
                    }
                }
            }
        }

        let input_points_tensor = new Tensor(
            'int64',
            BigInt64Array.from(input_points.flat(Infinity)
                .map(x => BigInt(Math.round(x)))),
            shape
        )

        // TODO: allowed to be floats?
        // let input_points_tensor = new Tensor(
        //     'float32',
        //     Float32Array.from(input_points.flat(Infinity)),
        //     shape
        // )

        return {
            pixel_values,
            original_sizes: original_sizes,
            reshaped_input_sizes: reshaped_input_sizes,
            input_points: input_points_tensor
        }
    }

    /**
     * Remove padding and upscale masks to the original image size.
     * @param {Tensor} masks Batched masks from the mask_decoder in (batch_size, num_channels, height, width) format.
     * @param {number[][]} original_sizes The original sizes of each image before it was resized to the model's expected input shape, in (height, width) format.
     * @param {number[][]} reshaped_input_sizes The size of each image as it is fed to the model, in (height, width) format. Used to remove padding.
     * @param {Object} options Optional parameters for post-processing.
     * @param {number} [options.mask_threshold] The threshold to use for binarizing the masks.
     * @param {boolean} [options.binarize] Whether to binarize the masks.
     * @param {Object} [options.pad_size] The target size the images were padded to before being passed to the model. If `null`, the target size is assumed to be the processor's `pad_size`.
     * @param {number} [options.pad_size.height] The height the images were padded to.
     * @param {number} [options.pad_size.width] The width the images were padded to.
     * @returns {Tensor[]} Batched masks in batch_size, num_channels, height, width) format, where (height, width) is given by original_size.
     */
    post_process_masks(masks, original_sizes, reshaped_input_sizes, {
        mask_threshold = 0.0,
        binarize = true,
        pad_size = null,
    } = {}) {
        // masks: [1, 1, 3, 256, 256]

        let output_masks = [];

        pad_size = pad_size ?? this.pad_size;

        let target_image_size = [pad_size.height, pad_size.width];

        for (let i = 0; i < original_sizes.length; ++i) {
            let original_size = original_sizes[i];
            let reshaped_input_size = reshaped_input_sizes[i];

            let mask = masks[i]; // [b, c, h, w]

            // TODO: improve
            let interpolated_masks = [];
            for (let j = 0; j < mask.dims[0]; ++j) {
                let m = mask[j]; // 3d tensor

                // Upscale mask to padded size
                let interpolated_mask = interpolate(m, target_image_size, 'bilinear', false);

                // Crop mask
                interpolated_mask = interpolated_mask.slice(null, [0, reshaped_input_size[0]], [0, reshaped_input_size[1]]);

                // Downscale mask
                interpolated_mask = interpolate(mask, original_size, 'bilinear', false);

                if (binarize) {
                    interpolated_mask = new Tensor(
                        'bool',
                        Array.from(interpolated_mask.data).map(x => x > mask_threshold),
                        interpolated_mask.dims
                    )
                }

                // add back batch dim for concat
                interpolated_mask.dims = [1, ...interpolated_mask.dims];

                interpolated_masks.push(interpolated_mask);
            }

            let concatenated = cat(interpolated_masks);
            output_masks.push(concatenated);
        }

        return output_masks;

    }
}


export class WhisperFeatureExtractor extends FeatureExtractor {

    constructor(config) {
        super(config);

        // Prefer given `mel_filters` from preprocessor_config.json, or calculate them if they don't exist.
        this.config.mel_filters ??= getMelFilters(this.config.sampling_rate, this.config.n_fft, this.config.feature_size);
    }
    /**
     * Calculates the index offset for a given index and window size.
     * @param {number} i The index.
     * @param {number} w The window size.
     * @returns {number} The index offset.
     */
    calcOffset(i, w) {
        return Math.abs((i + w) % (2 * w) - w);
    }

    /**
     * Pads an array with a reflected version of itself on both ends.
     * @param {Float32Array} array The array to pad.
     * @param {number} left The amount of padding to add to the left.
     * @param {number} right The amount of padding to add to the right.
     * @returns {Float32Array} The padded array.
     */
    padReflect(array, left, right) {
        const padded = new Float32Array(array.length + left + right);
        const w = array.length - 1;

        for (let i = 0; i < array.length; ++i) {
            padded[left + i] = array[i];
        }

        for (let i = 1; i <= left; ++i) {
            padded[left - i] = array[this.calcOffset(i, w)];
        }

        for (let i = 1; i <= right; ++i) {
            padded[w + left + i] = array[this.calcOffset(w - i, w)];
        }

        return padded;
    }

    /**
     * Calculates the complex Short-Time Fourier Transform (STFT) of the given framed signal.
     * 
     * @param {number[][]} frames A 2D array representing the signal frames.
     * @param {number[]} window A 1D array representing the window to be applied to the frames.
     * @returns {Object} An object with the following properties:
     * - data: A 1D array representing the complex STFT of the signal.
     * - dims: An array representing the dimensions of the STFT data, i.e. [num_frames, num_fft_bins].
     */
    stft(frames, window) {
        // Calculates the complex Short-Time Fourier Transform (STFT) of the given framed signal.
        // 
        // NOTE: Since the window width is not a power of 2, we must 
        // perform Fast Fourier Transform with chirp-z transform:
        // https://math.stackexchange.com/questions/77118/non-power-of-2-ffts/77156#77156

        // Helper variables
        const fft_size = this.config.n_fft;
        const a = 2 * (fft_size - 1);
        const b = 2 * (2 * fft_size - 1);
        const nextP2 = 2 ** (Math.ceil(Math.log2(b)))
        const num_fft_bins = fft_size + 2;

        // Preallocate array to store output
        // double since we store complex numbers
        const data = new Float32Array(num_fft_bins * frames.length);

        // Define buffers
        // Compute chirp for transform
        const chirp = new Float32Array(b);
        const ichirp = new Float32Array(nextP2);
        const buffer1 = new Float32Array(nextP2);
        const buffer2 = new Float32Array(nextP2);
        const outBuffer = new Float32Array(nextP2);
        const outBuffer2 = new Float32Array(nextP2);
        const outBuffer3 = new Float32Array(nextP2);

        // Compute complex exponentiation
        const theta = -2 * Math.PI / fft_size;
        const baseR = Math.cos(theta);
        const baseI = Math.sin(theta);

        // Precompute helper for chirp-z transform
        for (let i = 0; i < b >> 1; ++i) {
            // Compute complex power:
            const e = (i + 1 - fft_size) ** 2 / 2.0;

            // Compute the modulus and argument of the result
            const result_mod = Math.sqrt(baseR ** 2 + baseI ** 2) ** e;
            const result_arg = e * Math.atan2(baseI, baseR);

            // Convert the result back to rectangular form
            // and assign to chirp and ichirp
            let i2 = 2 * i;
            chirp[i2] = result_mod * Math.cos(result_arg);
            chirp[i2 + 1] = result_mod * Math.sin(result_arg);

            // conjugate
            ichirp[i2] = chirp[i2];
            ichirp[i2 + 1] = - chirp[i2 + 1];
        }
        const slicedChirp = chirp.subarray(a, b);

        // create object to perform Fast Fourier Transforms
        // with `nextP2` complex numbers
        const f = new FFT(nextP2 >> 1);
        // TODO: decide between Float32Array and Float64Array
        f.transform(outBuffer, ichirp);

        for (let i = 0; i < frames.length; ++i) {
            const frame = frames[i];

            for (let j = 0; j < slicedChirp.length; j += 2) {
                const j2 = j + 1
                const j3 = j >> 1;

                const a_real = frame[j3] * window[j3];
                buffer1[j] = a_real * slicedChirp[j];
                buffer1[j2] = a_real * slicedChirp[j2];
            }
            // TODO: decide between Float32Array and Float64Array
            f.transform(outBuffer2, buffer1);

            for (let j = 0; j < outBuffer.length; j += 2) {
                const j2 = j + 1;

                buffer2[j] = outBuffer2[j] * outBuffer[j] - outBuffer2[j2] * outBuffer[j2]
                buffer2[j2] = outBuffer2[j] * outBuffer[j2] + outBuffer2[j2] * outBuffer[j]
            }
            // TODO: decide between Float32Array and Float64Array
            f.inverseTransform(outBuffer3, buffer2)

            const offset = i * num_fft_bins;
            for (let j = 0; j < num_fft_bins; j += 2) {
                const a_real = outBuffer3[j + a];
                const a_imag = outBuffer3[j + a + 1];
                const b_real = slicedChirp[j];
                const b_imag = slicedChirp[j + 1];

                // TODO write as transpose
                const o1 = offset + j;
                data[o1] = a_real * b_real - a_imag * b_imag
                data[o1 + 1] = a_real * b_imag + a_imag * b_real
            }
        }

        return {
            data: data,
            dims: [frames.length, num_fft_bins] // [3001, 402]
        };
    }

    /**
     * Creates an array of frames from a given waveform.
     *
     * @param {Float32Array} waveform The waveform to create frames from.
     * @param {boolean} [center=true] Whether to center the frames on their corresponding positions in the waveform. Defaults to true.
     * @returns {Array} An array of frames.
     */
    fram_wave(waveform, center = true) {
        const frames = [];
        const half_window = Math.floor((this.config.n_fft - 1) / 2) + 1;
        const waveformLength = waveform.length;

        for (let i = 0; i < waveformLength + 1; i += this.config.hop_length) {

            let frame;
            if (center) {

                let frameStart = i > half_window ? i - half_window : 0;
                let frameEnd =
                    i < waveformLength - half_window
                        ? i + half_window
                        : waveformLength;

                frame = waveform.subarray(frameStart, frameEnd)

                if (frameStart === 0) {
                    frame = this.padReflect(
                        frame,
                        -i + half_window,
                        0
                    )

                } else if (frameEnd === waveformLength) {
                    frame = this.padReflect(
                        frame,
                        0,
                        i - waveformLength + half_window
                    )
                }

            } else {
                frame = new Float32Array(this.config.n_fft);
                const frameArray = waveform.subarray(i, i + this.config.n_fft);

                if (frameArray.length < this.config.n_fft) {
                    frame.set(frameArray);
                    frame.fill(0, frameArray.length, this.config.n_fft)
                } else {
                    frame = frameArray;
                }

            }
            frames.push(frame);
        }

        return frames;
    }

    /**
     * Generates a Hanning window of length M.
     *
     * @param {number} M The length of the Hanning window to generate.
     * @returns {*} The generated Hanning window.
     */
    hanning(M) {
        if (M < 1) {
            return [];
        }
        if (M === 1) {
            return [1];
        }
        const denom = M - 1;
        const cos_vals = new Float32Array(denom);
        for (let i = 0; i < denom; ++i) {
            const n = 2 * i - M + 1;
            cos_vals[i] = 0.5 + 0.5 * Math.cos(Math.PI * n / denom);
        }
        return cos_vals;
    }

    /**
     * Computes the log-Mel spectrogram of the provided audio waveform.
     * @param {Float32Array|Float64Array} waveform The audio waveform to process.
     * @returns {{data: Float32Array, dims: number[]}} An object containing the log-Mel spectrogram data as a Float32Array and its dimensions as an array of numbers.
     */
    _extract_fbank_features(waveform) {
        // Compute the log-Mel spectrogram of the provided audio

        const buffer = new Float32Array(this.config.n_samples);
        buffer.set(waveform)

        const window = this.hanning(this.config.n_fft + 1)
        const frames = this.fram_wave(buffer)

        const stft = this.stft(frames, window)

        const stftData = stft.data;
        const d1 = stft.dims[0] - 1; // Ignore last row
        const d2 = stft.dims[1] >> 1; // Only need to store real numbers now

        // compute magnitudes
        // NOTE: Unlike the original implementation, we do not
        // transpose since we perform matrix multiplication later
        const magnitudes = new Float32Array(d1 * d2);
        for (let i = 0; i < d1; ++i) {
            for (let j = 0; j < d2; ++j) {
                // let outOffset = (j * d1 + i); // transpose
                let outOffset = i * d2 + j;
                let inOffset = outOffset << 1; // * 2 since complex
                let magnitude = stftData[inOffset] ** 2 + stftData[inOffset + 1] ** 2
                magnitudes[outOffset] = magnitude;
            }
        }

        const mel_filters = this.config.mel_filters;
        const num_mel_filters = mel_filters.length;

        const mel_spec = new Float32Array(num_mel_filters * d1);
        let mIndex = 0;

        // Perform matrix muliplication:
        // mel_spec = filters @ magnitudes
        //  - filters.shape=(80, 201)
        //  - magnitudes.shape=(201, 3000)
        //  - mel_spec.shape=(80, 3000)
        for (let i = 0; i < num_mel_filters; ++i) {
            const mel_filter = mel_filters[i];

            for (let j = 0; j < d1; ++j) {
                let sum = 0;

                // perform dot product
                for (let k = 0; k < d2; ++k) {
                    sum += mel_filter[k] * magnitudes[j * d2 + k];
                }

                mel_spec[mIndex++] = sum;
            }
        }

        const a_min = 1e-10;
        const log_spec = new Float32Array(mel_spec.length);

        let maxLogSpec = 0;
        for (let i = 0; i < mel_spec.length; ++i) {
            const clipped = Math.max(a_min, mel_spec[i]);
            const log10 = Math.log10(clipped);
            log_spec[i] = log10;
            maxLogSpec = Math.max(log10, maxLogSpec)
        }

        for (let i = 0; i < log_spec.length; ++i) {
            log_spec[i] = Math.max(log_spec[i], maxLogSpec - 8);
            log_spec[i] = (log_spec[i] + 4) / 4;
        }

        return {
            data: log_spec,
            dims: [num_mel_filters, d1]
        };
    }

    /**
     * Asynchronously extracts features from a given audio using the provided configuration.
     * @param {Float32Array|Float64Array} audio The audio data as a Float32Array/Float64Array.
     * @returns {Promise<{ input_features: Tensor }>} A Promise resolving to an object containing the extracted input features as a Tensor.
     */
    async _call(audio) {
        if (!(audio instanceof Float32Array || audio instanceof Float64Array)) {
            throw new Error(
                // @ts-ignore
                `WhisperFeatureExtractor expects input to be a Float32Array or a Float64Array, but got ${audio?.constructor?.name ?? typeof audio} instead.` +
                `If using the feature extractor directly, remember to use \`read_audio(url, sampling_rate)\` to obtain the raw audio data of the file/url.`
            )
        }

        if (audio.length > this.config.n_samples) {
            console.warn(
                "Attempting to extract features for audio longer than 30 seconds. " +
                "If using a pipeline to extract transcript from a long audio clip, " +
                "remember to specify `chunk_length_s` and/or `stride_length_s`."
            );
        }
        let waveform = audio.slice(0, this.config.n_samples);

        let features = this._extract_fbank_features(waveform);

        return {
            input_features: new Tensor('float32',
                features.data,
                [1, ...features.dims]
            )
        };
    }
}

export class Wav2Vec2FeatureExtractor extends FeatureExtractor {

    /**
     * @param {Float32Array} input_values 
     * @returns {Float32Array} 
     */
    _zero_mean_unit_var_norm(input_values) {
        // TODO support batch?
        const sum = input_values.reduce((a, b) => a + b, 0);
        const mean = sum / input_values.length;
        const variance = input_values.reduce((a, b) => a + (b - mean) ** 2, 0) / input_values.length;
        return input_values.map(x => (x - mean) / Math.sqrt(variance + 1e-7));
    }

    /**
     * Asynchronously extracts features from a given audio using the provided configuration.
     * @param {Float32Array|Float64Array} audio The audio data as a Float32Array/Float64Array.
     * @returns {Promise<{ input_values: Tensor; attention_mask: Tensor }>} A Promise resolving to an object containing the extracted input features and attention mask as Tensors.
     */
    async _call(audio) {
        // TODO: remove duplication
        if (!(audio instanceof Float32Array || audio instanceof Float64Array)) {
            throw new Error(
                // @ts-ignore
                `Wav2Vec2FeatureExtractor expects input to be a Float32Array or a Float64Array, but got ${audio?.constructor?.name ?? typeof audio} instead.` +
                `If using the feature extractor directly, remember to use \`read_audio(url, sampling_rate)\` to obtain the raw audio data of the file/url.`
            )
        }
        if (audio instanceof Float64Array) {
            audio = new Float32Array(audio);
        }

        let input_values = audio;

        // zero-mean and unit-variance normalization
        if (this.config.do_normalize) {
            input_values = this._zero_mean_unit_var_norm(input_values);
        }

        // TODO: allow user to pass in attention mask
        const shape = [1, input_values.length];
        return {
            input_values: new Tensor('float32', input_values, shape),
            attention_mask: new Tensor('int64', new BigInt64Array(input_values.length).fill(1n), shape)
        };
    }
}

/**
 * Represents a Processor that extracts features from an input.
 * @extends Callable
 */
export class Processor extends Callable {
    /**
     * Creates a new Processor with the given feature extractor.
     * @param {FeatureExtractor} feature_extractor The function used to extract features from the input.
     */
    constructor(feature_extractor) {
        super();
        this.feature_extractor = feature_extractor;
        // TODO use tokenizer here?
    }

    /**
     * Calls the feature_extractor function with the given input.
     * @param {any} input The input to extract features from.
     * @returns {Promise<any>} A Promise that resolves with the extracted features.
     */
    async _call(input) {
        return await this.feature_extractor(input);
    }
}

export class SamProcessor extends Processor {

    async _call(images, input_points) {
        return await this.feature_extractor(images, input_points);
    }

    /**
     * @borrows SamImageProcessor#post_process_masks as post_process_masks
     */
    post_process_masks(...args) {
        // @ts-ignore
        return this.feature_extractor.post_process_masks(...args);
    }
}

/**
 * Represents a WhisperProcessor that extracts features from an audio input.
 * @extends Processor
 */
export class WhisperProcessor extends Processor {
    /**
     * Calls the feature_extractor function with the given audio input.
     * @param {any} audio The audio input to extract features from.
     * @returns {Promise<any>} A Promise that resolves with the extracted features.
     */
    async _call(audio) {
        return await this.feature_extractor(audio)
    }
}


export class Wav2Vec2ProcessorWithLM extends Processor {
    /**
     * Calls the feature_extractor function with the given audio input.
     * @param {any} audio The audio input to extract features from.
     * @returns {Promise<any>} A Promise that resolves with the extracted features.
     */
    async _call(audio) {
        return await this.feature_extractor(audio)
    }
}

//////////////////////////////////////////////////
/**
 * @typedef {import('./utils/hub.js').PretrainedOptions} PretrainedOptions
 */
/**
 * Helper class which is used to instantiate pretrained processors with the `from_pretrained` function.
 * The chosen processor class is determined by the type specified in the processor config.
 * 
 * **Example:** Load a processor using `from_pretrained`.
 * ```javascript
 * let processor = await AutoProcessor.from_pretrained('openai/whisper-tiny.en');
 * ```
 * 
 * **Example:** Run an image through a processor.
 * ```javascript
 * let processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch16');
 * let image = await RawImage.read('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/football-match.jpg');
 * let image_inputs = await processor(image);
 * // {
 * //   "pixel_values": {
 * //     "dims": [ 1, 3, 224, 224 ],
 * //     "type": "float32",
 * //     "data": Float32Array [ -1.558687686920166, -1.558687686920166, -1.5440893173217773, ... ],
 * //     "size": 150528
 * //   },
 * //   "original_sizes": [
 * //     [ 533, 800 ]
 * //   ],
 * //   "reshaped_input_sizes": [
 * //     [ 224, 224 ]
 * //   ]
 * // }
 * ```
 */
export class AutoProcessor {
    static FEATURE_EXTRACTOR_CLASS_MAPPING = {
        'WhisperFeatureExtractor': WhisperFeatureExtractor,
        'ViTFeatureExtractor': ViTFeatureExtractor,
        'MobileViTFeatureExtractor': MobileViTFeatureExtractor,
        'DeiTFeatureExtractor': DeiTFeatureExtractor,
        'DetrFeatureExtractor': DetrFeatureExtractor,
        'YolosFeatureExtractor': YolosFeatureExtractor,

        'SamImageProcessor': SamImageProcessor,
        'Wav2Vec2FeatureExtractor': Wav2Vec2FeatureExtractor,
    }

    static PROCESSOR_CLASS_MAPPING = {
        'WhisperProcessor': WhisperProcessor,
        'Wav2Vec2ProcessorWithLM': Wav2Vec2ProcessorWithLM,
        'SamProcessor': SamProcessor,
    }

    /**
     * Instantiate one of the processor classes of the library from a pretrained model.
     * 
     * The processor class to instantiate is selected based on the `feature_extractor_type` property of the config object
     * (either passed as an argument or loaded from `pretrained_model_name_or_path` if possible)
     * 
     * @param {string} pretrained_model_name_or_path The name or path of the pretrained model. Can be either:
     * - A string, the *model id* of a pretrained processor hosted inside a model repo on huggingface.co.
     *   Valid model ids can be located at the root-level, like `bert-base-uncased`, or namespaced under a
     *   user or organization name, like `dbmdz/bert-base-german-cased`.
     * - A path to a *directory* containing processor files, e.g., `./my_model_directory/`.
     * @param {PretrainedOptions} options Additional options for loading the processor.
     * 
     * @returns {Promise<Processor>} A new instance of the Processor class.
     */
    static async from_pretrained(pretrained_model_name_or_path, {
        progress_callback = null,
        config = null,
        cache_dir = null,
        local_files_only = false,
        revision = 'main',
    } = {}) {

        let preprocessorConfig = config ?? await getModelJSON(pretrained_model_name_or_path, 'preprocessor_config.json', true, {
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
        })

        // Determine feature extractor class
        // TODO: Ensure backwards compatibility with old configs
        let key = preprocessorConfig.feature_extractor_type ?? preprocessorConfig.image_processor_type;
        let feature_extractor_class = this.FEATURE_EXTRACTOR_CLASS_MAPPING[key];

        if (!feature_extractor_class) {
            if (preprocessorConfig.size !== undefined) {
                // Assume ImageFeatureExtractor
                console.warn('Feature extractor type not specified, assuming ImageFeatureExtractor due to size parameter in config.');
                feature_extractor_class = ImageFeatureExtractor;
            } else {
                throw new Error(`Unknown Feature Extractor type: ${preprocessorConfig.feature_extractor_type}`);
            }
        }

        // If no associated processor class, use default
        let processor_class = this.PROCESSOR_CLASS_MAPPING[preprocessorConfig.processor_class] ?? Processor;

        // Instantiate processor and feature extractor
        let feature_extractor = new feature_extractor_class(preprocessorConfig);
        return new processor_class(feature_extractor);
    }
}
//////////////////////////////////////////////////

