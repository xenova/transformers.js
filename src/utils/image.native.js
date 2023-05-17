
/**
 * @file Helper module for image processing. 
 * 
 * These functions and classes are only used internally, 
 * meaning an end-user shouldn't need to access anything here.
 * 
 * @module utils/image
 */

import RNFS from 'react-native-fs';
import { isString } from './core';
import { getFile } from './hub';
import { env } from '../env';

import encode from 'image-encode';
import decode from 'image-decode';
import resize from 'resize-image-data';
import { Buffer } from 'buffer';


// Defined here: https://github.com/python-pillow/Pillow/blob/a405e8406b83f8bfb8916e93971edc7407b8b1ff/src/libImaging/Imaging.h#L262-L268
const RESAMPLING_MAPPING = {
    0: 'nearest-neighbor',
    2: 'bilinear-interpolation',
}

export class CustomImage {

    /**
     * Create a new CustomImage object.
     * @param {Uint8ClampedArray} data The pixel data.
     * @param {number} width The width of the image.
     * @param {number} height The height of the image.
     * @param {1|2|3|4} channels The number of channels.
     */
    constructor(data, width, height, channels) {
        this._update(data, width, height, channels);
    }

    /**
     * Helper method for reading an image from a variety of input types.
     * @param {CustomImage|string|URL} input 
     * @returns The image object.
     */
    static async read(input) {
        if (input instanceof CustomImage) {
            return input;
        } else if (isString(input) || input instanceof URL) {
            return await this.fromURL(input);
        } else {
            throw new Error(`Unsupported input type: ${typeof input}`);
        }
    }


    /**
     * Read an image from a URL or file path.
     * @param {string|URL} url The URL or file path to read the image from.
     * @returns {Promise<CustomImage>} The image object.
     */
    static async fromURL(url) {
        const buffer = await response.arrayBuffer();
        const { data, width, height } = decode(buffer);
        return new CustomImage(new Uint8ClampedArray(data), width, height, 4);
    }

    /**
     * Helper method to create a new Image from a blob.
     * @param {Blob} blob The blob to read the image from.
     * @returns {Promise<CustomImage>} The image object.
     */
    static async fromBlob(blob) {
        return CustomImage.fromURL(blob);
    }

    /**
     * Convert the image to grayscale format.
     * @returns {CustomImage} `this` to support chaining.
     */
    grayscale() {
        if (this.channels === 1) {
            return this;
        }

        let newData = new Uint8ClampedArray(this.width * this.height * 3);
        switch (this.channels) {
            case 3: // rgb to grayscale
            case 4: // rgba to grayscale
                for (let i = 0, offset = 0; i < this.data.length; i += this.channels) {
                    const red = this.data[i];
                    const green = this.data[i + 1];
                    const blue = this.data[i + 2];

                    newData[offset++] = Math.round(0.2989 * red + 0.5870 * green + 0.1140 * blue);
                }
                break;
            default:
                throw new Error(`Conversion failed due to unsupported number of channels: ${this.channels}`);
        }
        return this._update(newData, this.width, this.height, 1);
    }

    /**
     * Convert the image to RGB format.
     * @returns {CustomImage} `this` to support chaining.
     */
    rgb() {
        if (this.channels === 3) {
            return this;
        }

        let newData = new Uint8ClampedArray(this.width * this.height * 3);

        switch (this.channels) {
            case 1: // grayscale to rgb
                for (let i = 0, offset = 0; i < this.data.length; ++i) {
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i];
                }
                break;
            case 4: // rgba to rgb
                for (let i = 0, offset = 0; i < this.data.length; i += 4) {
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i + 1];
                    newData[offset++] = this.data[i + 2];
                }
                break;
            default:
                throw new Error(`Conversion failed due to unsupported number of channels: ${this.channels}`);
        }
        return this._update(newData, this.width, this.height, 3);

    }

    /**
     * Convert the image to RGBA format.
     * @returns {CustomImage} `this` to support chaining.
     */
    rgba() {
        if (this.channels === 4) {
            return this;
        }

        let newData = new Uint8ClampedArray(this.width * this.height * 4);

        switch (this.channels) {
            case 1: // grayscale to rgba
                for (let i = 0, offset = 0; i < this.data.length; ++i) {
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i];
                    newData[offset++] = 255;
                }
                break;
            case 3: // rgb to rgba
                for (let i = 0, offset = 0; i < this.data.length; i += 3) {
                    newData[offset++] = this.data[i];
                    newData[offset++] = this.data[i + 1];
                    newData[offset++] = this.data[i + 2];
                    newData[offset++] = 255;
                }
                break;
            default:
                throw new Error(`Conversion failed due to unsupported number of channels: ${this.channels}`);
        }

        return this._update(newData, this.width, this.height, 4);
    }

    /**
     * Resize the image to the given dimensions. This method uses the canvas API to perform the resizing.
     * @param {number} width The width of the new image.
     * @param {number} height The height of the new image.
     * @param {Object} options Additional options for resizing.
     * @param {0|1|2|3|4|5|string} [options.resample] The resampling method to use.
     * @returns {Promise<CustomImage>} `this` to support chaining.
     */
    async resize(width, height, {
        resample = 2,
    } = {}) {

        // Ensure resample method is a string
        let resampleMethod = RESAMPLING_MAPPING[resample] ?? resample;

        const data = resize(this.rgba().data, width, height, resampleMethod);
        return new CustomImage(data, width, height, 4);
    }

    async pad([left, right, top, bottom]) {
        left = Math.max(left, 0);
        right = Math.max(right, 0);
        top = Math.max(top, 0);
        bottom = Math.max(bottom, 0);

        if (left === 0 && right === 0 && top === 0 && bottom === 0) {
            // No padding needed
            return this;
        }
        const data = this.rgba().data;
        const width = this.width + left + right;
        const height = this.height + top + bottom;
        const paddedData = new Uint8ClampedArray(width * height * 4);
        // copy data
        for (let i = 0; i < data.length; ++i) {
            const line = Math.floor(i / (this.width * 4));
            const pos = i % (this.width * 4);
            paddedData[(line + top) * (width * 4) + pos + left * 4] = data[i];
        }
        return new CustomImage(paddedData, width, height, 4);
    }

    async center_crop(crop_width, crop_height) {
        // If the image is already the desired size, return it
        if (this.width === crop_width && this.height === crop_height) {
            return this;
        }

        // Determine bounds of the image in the new canvas
        let width_offset = (this.width - crop_width) / 2;
        let height_offset = (this.height - crop_height) / 2;

        let data = this.rgba().data;
        let croppedData = new Uint8ClampedArray(crop_width * crop_height * 4);
        for (let i = 0; i < croppedData.length; ++i) {
            const line = Math.floor(i / (crop_width * 4));
            const pos = i % (crop_width * 4);
            croppedData[i] = data[(line + height_offset) * (this.width * 4) + pos + width_offset * 4];
        }
        return new CustomImage(croppedData, crop_width, crop_height, 4);
    }

    toCanvas() {
        throw new Error('Canvas is not supported in the React Native environment');
    }

    /**
     * Helper method to update the image data.
     * @param {Uint8ClampedArray} data The new image data.
     * @param {number} width The new width of the image.
     * @param {number} height The new height of the image.
     * @param {1|2|3|4} channels The new number of channels of the image.
     */
    _update(data, width, height, channels = null) {
        this.data = data;
        this.width = width;
        this.height = height;
        if (channels !== null) {
            this.channels = channels;
        }
        return this;
    }

    /**
     * Clone the image
     * @returns {CustomImage} The cloned image
     */
    clone() {
        return new CustomImage(this.data.slice(), this.width, this.height, this.channels);
    }

    /**
     * Helper method for converting image to have a certain number of channels
     * @param {number} numChannels The number of channels. Must be 1, 3, or 4.
     * @returns {CustomImage} `this` to support chaining.
     */
    convert(numChannels) {
        if (this.channels === numChannels) return this; // Already correct number of channels

        switch (numChannels) {
            case 1:
                this.grayscale();
                break;
            case 3:
                this.rgb();
                break;
            case 4:
                this.rgba();
                break;
            default:
                throw new Error(`Conversion failed due to unsupported number of channels: ${this.channels}`);
        }
        return this;
    }

    /**
     * Save the image to the given path. This method is only available in environments with access to the FileSystem.
     * @param {string|Buffer|URL} path The path to save the image to.
     * @param {string} [mime='image/png'] The mime type of the image.
     */
    save(path, mime = 'image/png') {
        if (!env.useFS) {
            throw new Error('Unable to save the image because filesystem is disabled in this environment.')
        }

        const buf = Buffer.from(encode(this.data, mime));
        RNFS.writeFile(path, buf.toString('base64'), 'base64');
    }
}
