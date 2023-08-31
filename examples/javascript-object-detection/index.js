import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.3';
env.allowLocalModels = false;
import { generateRandomColor, removeElements, getScaledCoordinates } from './utils.js'
const statusParagraph = document.getElementById("status");
const fileUploadElement = document.getElementById('file-upload');
const imageContainer = document.getElementById("image-container");

fileUploadElement.addEventListener('change', function(e) {
    const file = e.target.files[0];
    const fr = new FileReader();
    fr.onload = onFileReaderLoad;
    fr.readAsDataURL(file);
});

function onFileReaderLoad(e) {
    removeElements("bounding-box-label");
    removeElements("bounding-box");
    const base64String = e.target.result;
    const imageEl = document.createElement('img')
    imageEl.src = base64String;
    imageContainer.appendChild(imageEl);
    runModel(imageEl);
};

async function runModel(imageEl) {
    statusParagraph.textContent = "Loading model..."
    const detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
    statusParagraph.textContent = "Analysing ..."
    const output = await detector(imageEl.src, { threshold: 0.5 });
    statusParagraph.textContent = ""
    output.forEach(object => {
        renderBox(object, imageEl)
    })
}

function renderBox(data, imageEl) {
    const { box, label} = data;
    const {xmax, xmin, ymax, ymin } = getScaledCoordinates(box, imageEl)
    const color = generateRandomColor();

    // Calculate the width and height of the bounding box
    const boxWidth = xmax - xmin;
    const boxHeight = ymax - ymin;

    // Draw the box
    const boundingBoxElement = document.createElement("div");
    boundingBoxElement.className = "bounding-box";
    boundingBoxElement.style.border = `2px solid ${color}`
    boundingBoxElement.style.left = xmin + "px";
    boundingBoxElement.style.top = ymin + "px";
    boundingBoxElement.style.width = boxWidth + "px";
    boundingBoxElement.style.height = boxHeight + "px";
    imageContainer.appendChild(boundingBoxElement);

    // Draw the label
    let labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelSpan.className = "bounding-box-label";
    labelSpan.style.backgroundColor = color;
    labelSpan.style.left = xmin + "px";
    labelSpan.style.top = (ymin - 12) + "px";
    imageContainer.appendChild(labelSpan);
}
