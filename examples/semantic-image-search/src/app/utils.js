
import { decode } from "blurhash"

const SIZE = 32;

export function blurHashToDataURL(hash) {
    if (!hash) return undefined

    const pixels = decode(hash, SIZE, SIZE)

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;

    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(SIZE, SIZE);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL();
}

function downloadData(url, filename) {

    // Create an anchor element with the data URL as the href attribute
    const downloadLink = document.createElement('a');
    downloadLink.href = url;

    // Set the download attribute to specify the desired filename for the downloaded image
    downloadLink.download = filename;

    // Trigger the download
    downloadLink.click();

    // Clean up: remove the anchor element from the DOM
    downloadLink.remove();
}

export function downloadImage(url, filename) {
    fetch(url, {
        headers: new Headers({
            Origin: location.origin,
        }),
        mode: 'cors',
    })
        .then((response) => response.blob())
        .then((blob) => {
            let blobUrl = window.URL.createObjectURL(blob)
            downloadData(blobUrl, filename)
        })
        .catch((e) => console.error(e))
}
