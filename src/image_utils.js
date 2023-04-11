
const fs = require('fs');
const { getFile, isString } = require('./utils.js');
const { env } = require('./env.js');

let CanvasClass;
let ImageClass = typeof Image !== 'undefined' ? Image : null; // Only used for type-checking

let ImageDataClass;
let loadImageFunction;
if (typeof self !== 'undefined') {
    CanvasClass = OffscreenCanvas;
    loadImageFunction = self.createImageBitmap;
    ImageDataClass = ImageData;

} else {
    const { Canvas, loadImage, ImageData, Image } = require('canvas');
    CanvasClass = Canvas;
    loadImageFunction = async (/**@type {Blob}*/ b) => await loadImage(Buffer.from(await b.arrayBuffer()));
    ImageDataClass = ImageData;
    ImageClass = Image;
}


class CustomImage {

    /**
     * Create a new CustomImage object.
     * @param {Uint8ClampedArray} data - The pixel data.
     * @param {number} width - The width of the image.
     * @param {number} height - The height of the image.
     * @param {number} channels - The number of channels.
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
     * @param {string|URL} url - The URL or file path to read the image from.
     * @returns {Promise<CustomImage>} - The image object.
     */
    static async fromURL(url) {
        let response = await getFile(url);
        let blob = await response.blob();
        let img = await loadImageFunction(blob);

        return this.createCanvasAndDraw(img);

    }

    /**
     * Helper method to create a new canvas, draw an image/canvas to it, then return the pixel data.     * @param {ImageClass|CanvasClass} img - The image/canvas to draw to the canvas.
     * @param {number} [width=null] - Width of the canvas. If null, the width of the image is used.
     * @param {number} [height=null] - Height of the canvas. If null, the height of the image is used.
     * @returns {CustomImage} - The image object.
     */
    static createCanvasAndDraw(img, width = null, height = null) {
        width = width ?? img.width;
        height = height ?? img.height;

        const ctx = new CanvasClass(width, height).getContext('2d');

        // Draw image to context
        ctx.drawImage(img, 0, 0, width, height);

        return new this(ctx.getImageData(0, 0, width, height).data, width, height, 4);
    }

    /**
     * Convert the image to grayscale format.
     * @returns {CustomImage} - `this` to support chaining.
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
     * @returns {CustomImage} - `this` to support chaining.
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
     * @returns {CustomImage} - `this` to support chaining.
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
     * @param {number} width - The width of the new image.
     * @param {number} height - The height of the new image.
     * @returns {CustomImage} - `this` to support chaining.
     */
    resize(width, height) {
        // Store number of channels before resizing
        let numChannels = this.channels;

        // Create canvas object for this image
        let canvas = this.toCanvas();

        // Actually perform resizing using the canvas API
        let resizedImage = CustomImage.createCanvasAndDraw(canvas, width, height);

        // Convert back so that image has the same number of channels as before
        return resizedImage.convert(numChannels);
    }

    toCanvas() {
        // Clone, and convert data to RGBA before drawing to canvas.
        // This is because the canvas API only supports RGBA
        let cloned = this.clone().rgba();

        // Create canvas object for the cloned image
        let clonedCanvas = new CanvasClass(cloned.width, cloned.height);

        // Draw image to context
        let data = new ImageDataClass(cloned.data, cloned.width, cloned.height);
        clonedCanvas.getContext('2d').putImageData(data, 0, 0);

        return clonedCanvas;
    }

    /**
     * Helper method to update the image data.
     * @param {Uint8ClampedArray} data - The new image data.
     * @param {number} width - The new width of the image.
     * @param {number} height - The new height of the image.
     * @param {number} channels - The new number of channels of the image.
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
     * @returns {CustomImage} - The cloned image
     */
    clone() {
        return new CustomImage(this.data.slice(), this.width, this.height, this.channels);
    }

    /**
     * Helper method for converting image to have a certain number of channels
     * @param {number} numChannels - The number of channels. Must be 1, 3, or 4.
     * @returns {CustomImage} - `this` to support chaining.
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
     * @param {string|Buffer|URL} path - The path to save the image to.
     * @param {string} [mime='image/png'] - The mime type of the image.
     */
    save(path, mime = 'image/png') {
        if (!env.useFS) {
            throw new Error('Unable to save the image because filesystem is disabled in this environment.')
        }

        let canvas = this.toCanvas();
        const buffer = canvas.toBuffer(mime);
        fs.writeFileSync(path, buffer);
    }
}

module.exports = {
    CustomImage,
};
