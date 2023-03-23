
// For some reason, Jimp attaches to self, even in Node.
// https://github.com/jimp-dev/jimp/issues/466
const _Jimp = require('jimp');
const Jimp = (typeof self !== 'undefined') ? (self.Jimp || _Jimp) : _Jimp;

const B64_STRING = /^data:image\/\w+;base64,/;


async function loadImage(url) {
    // TODO if already is a Jimp image, return it

    let imgToLoad = url;
    if (B64_STRING.test(url)) {
        imgToLoad = imgToLoad.replace(B64_STRING, '');
        if (typeof Buffer !== 'undefined') {
            imgToLoad = Buffer.from(imgToLoad, 'base64');

        } else {
            let bytes = atob(imgToLoad);
            // create new ArrayBuffer from binary string
            imgToLoad = new Uint8Array(new ArrayBuffer(bytes.length));
            for (let i = 0; i < bytes.length; i++) {
                imgToLoad[i] = bytes.charCodeAt(i);
            }
        }
    }
    return await Jimp.read(imgToLoad);
}

module.exports = {
    loadImage,
    Jimp
};
