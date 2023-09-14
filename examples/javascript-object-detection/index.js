import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0';

// Since we will download the model from the Hugging Face Hub, we can skip the local model check
env.allowLocalModels = false;

const statusParagraph = document.getElementById('status');
const fileUploadElement = document.getElementById('file-upload');
const imageContainer = document.getElementById('image-container');

// Start loading the model on page load
statusParagraph.textContent = 'Loading model...';
const detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
statusParagraph.textContent = 'Ready';

fileUploadElement.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const fr = new FileReader();
    fr.onload = (e) => {
        imageContainer.innerHTML = '';
        const image = document.createElement('img');
        image.src = e.target.result;
        imageContainer.appendChild(image);
        runModel(image);
    };
    fr.readAsDataURL(file);
});

async function runModel(img) {
    statusParagraph.textContent = 'Analysing...';
    const output = await detector(img.src, {
        threshold: 0.5,
        percentage: true,
    });
    statusParagraph.textContent = '';
    output.forEach(renderBox)
}

function renderBox({ box, label }) {
    const { xmax, xmin, ymax, ymin } = box;

    // Generate a random color for the box
    const color = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, 0);

    // Draw the box
    const boundingBoxElement = document.createElement('div');
    boundingBoxElement.className = 'bounding-box';
    Object.assign(boundingBoxElement.style, {
        borderColor: color,
        left: 100 * xmin + '%',
        top: 100 * ymin + '%',
        width: 100 * (xmax - xmin) + '%',
        height: 100 * (ymax - ymin) + '%',
    })

    // Draw label
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelSpan.className = 'bounding-box-label';
    labelSpan.style.backgroundColor = color;

    boundingBoxElement.appendChild(labelSpan);
    imageContainer.appendChild(boundingBoxElement);
}
