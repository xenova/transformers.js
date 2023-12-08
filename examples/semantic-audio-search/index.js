
import Scatterplot from 'deepscatter';
import { getCachedJSON } from './utils';

// Start loading metadata and positions asynchronously as soon as possible.
let metadata = {};
getCachedJSON('https://huggingface.co/datasets/Xenova/MusicBenchEmbedded/resolve/main/metadata.json')
    .then((data) => {
        metadata = data;
    })
    .catch((e) => console.error(e));

let positions = {};
getCachedJSON('https://huggingface.co/datasets/Xenova/MusicBenchEmbedded/resolve/main/positions.json')
    .then((data) => {
        positions = data;
    })
    .catch((e) => console.error(e));

const scatterplot = new Scatterplot('#deepscatter');
window.scatterplot = scatterplot; // For debugging

// Initial call
scatterplot.plotAPI({
    source_url: 'https://huggingface.co/datasets/Xenova/MusicBenchEmbedded/resolve/main/atlas',
    max_points: 52768, // a full cap.
    alpha: 35, // Target saturation for the full page.
    zoom_balance: 0.5, // Rate at which points increase size. https://observablehq.com/@bmschmidt/zoom-strategies-for-huge-scatterplots-with-three-js
    point_size: 3, // Default point size before application of size scaling
    background_color: 'transparent',
    encoding: {
        // TODO Add colours
        x: {
            field: 'x',
            transform: 'literal',
        },
        y: {
            field: 'y',
            transform: 'literal',
        },
        jitter_radius: {
            method: 'uniform',
            constant: 5,
        },
    },
    tooltip_opacity: 1,
    duration: 4000, // For slow initial transition
}).then(_ => scatterplot.plotAPI({
    encoding: {
        jitter_radius: {
            method: 'uniform',
            constant: 0,
        },
    },
}));

// Custom hover function
scatterplot.tooltip_html = (datum) => {
    const item = metadata[datum.ix];
    if (!item) return 'Loading...';
    const location = item.location;

    setTimeout(() => {
        // Slight hack to append the audio element after the text
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
            tooltip.innerHTML = `
            ${item.main_caption}
            <br>
            <audio id="tooltip-audio" controls src="https://huggingface.co/datasets/Xenova/MusicBenchEmbedded/resolve/main/audio/${location}"></audio>
            `;
        }
    }, 0);
    return item.main_caption;
};

// Make references to DOM elements
const OVERLAY = document.getElementById('overlay');
const INPUT_ELEMENT = document.getElementById('query');
const SEARCH_BUTTON = document.getElementById('search');

// Set up worker
const worker = new Worker(new URL('./worker.js', import.meta.url), {
    type: 'module'
});
worker.addEventListener('message', (e) => {
    switch (e.data.status) {
        case 'initiate':
            OVERLAY.innerText = 'Loading model and embeddings database...';
            OVERLAY.style.display = 'flex';
            OVERLAY.style.pointerEvents = 'all';
            break;
        case 'ready':
            OVERLAY.style.display = 'none';
            OVERLAY.style.pointerEvents = 'none';
            break;
        case 'complete':
            // Output is an array of [score, index] pairs. Get top item
            const index = e.data.output[0][1];
            const position = positions[index];

            if (position) { // Just in case the position hasn't loaded yet (this should never happen)
                // Zoom to result
                scatterplot.plotAPI({
                    zoom: {
                        bbox: {
                            x: [position[0] - 0.5, position[0] + 0.5],
                            y: [position[1] - 0.5, position[1] + 0.5]
                        }
                    },
                    duration: 2000,
                })
            }
            break;
    }
});

const search = () => {
    worker.postMessage({
        status: 'search',
        query: INPUT_ELEMENT.value,
    });
};

// Set up event listeners
INPUT_ELEMENT.addEventListener('keypress', (event) => {
    if (event.keyCode === 13) search();
});
SEARCH_BUTTON.addEventListener('click', search);
