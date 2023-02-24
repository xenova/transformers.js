
// Scripts.js - handles link between DOM and worker

// Initialise worker
const worker = new Worker('./assets/js/worker.js', { type: 'module' });

// Define elements
const TASK_SELECTOR = document.getElementById('task');

// translation inputs
const LANGUAGE_FROM = document.getElementById('language-from');
const LANGUAGE_TO = document.getElementById('language-to');
const INPUT_TEXTBOX = document.getElementById('input-textbox');
const OUTPUT_TEXTBOX = document.getElementById('output-textbox');

// text generation inputs
const TEXT_GENERATION_TEXTBOX = document.getElementById('text-generation-textbox');

const TASKS = document.getElementsByClassName('task-settings')
const PROGRESS = document.getElementById('progress');
const PROGRESS_BARS = document.getElementById('progress-bars');

const GENERATE_BUTTON = document.getElementById('generate');

const MLM_INPUT_TEXTBOX = document.getElementById('mlm-input-textbox');
const MLM_OUTPUT_TEXTBOX = document.getElementById('mlm-output-textbox');

const TC_INPUT_TEXTBOX = document.getElementById('tc-input-textbox');
const TC_OUTPUT_CANVAS = document.getElementById('tc-canvas');


const QA_CONTEXT_TEXTBOX = document.getElementById('qa-context-textbox');
const QA_QUESTION_TEXTBOX = document.getElementById('qa-question-textbox');
const QA_ANSWER_TEXTBOX = document.getElementById('qa-answer-textbox');

const SUMMARIZATION_INPUT_TEXTBOX = document.getElementById('summarization-input-textbox');
const SUMMARIZATION_OUTPUT_TEXTBOX = document.getElementById('summarization-output-textbox');


// Parameters
const GENERATION_OPTIONS = document.getElementsByClassName('generation-option');

const CHARTS = {
	'tc-canvas': new Chart(TC_OUTPUT_CANVAS, {
		type: 'bar',
		data: {
			labels: ['5 stars', '4 stars', '3 stars', '2 stars', '1 star'],
			datasets: [{
				borderWidth: 1
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			indexAxis: 'y',
			scales: {
				y: {
					beginAtZero: true,
				},
				x: {
					min: 0,
					max: 1,
				}
			},
			plugins: {
				legend: {
					display: false
				},
			},
			layout: {
				padding: {
					bottom: -5,
				}
			},
		}
	})
}


function updateVisibility() {
	for (let element of TASKS) {
		if (element.getAttribute('task').split(',').includes(TASK_SELECTOR.value)) {
			element.style.display = 'block';
		} else {
			element.style.display = 'none';
		}
	}
}
updateVisibility();
// Add event listeners
TASK_SELECTOR.addEventListener('input', updateVisibility);

function parseValue(value, type) {
	switch (type) {
		case 'number':
			return Number(value);
		case 'bool':
			return value === 'true'
		default:
			return value
	}
}
GENERATE_BUTTON.addEventListener('click', (e) => {
	// Set and pass generation settings to web worker
	let data = {
		task: TASK_SELECTOR.value,
		generation: Object.fromEntries([...GENERATION_OPTIONS].map(x => {
			let value = parseValue(x.value, x.getAttribute('datatype'));
			return [x.getAttribute('param-name'), value]
		}))
	};
	switch (TASK_SELECTOR.value) {
		case 'translation':
			data.languageFrom = LANGUAGE_FROM.value
			data.languageTo = LANGUAGE_TO.value
			data.text = INPUT_TEXTBOX.value
			data.elementIdToUpdate = OUTPUT_TEXTBOX.id
			break;

		case 'text-generation':
			data.text = TEXT_GENERATION_TEXTBOX.value
			data.elementIdToUpdate = TEXT_GENERATION_TEXTBOX.id
			break;

		case 'masked-language-modelling':
			data.text = MLM_INPUT_TEXTBOX.value
			data.elementIdToUpdate = MLM_OUTPUT_TEXTBOX.id
			break;

		case 'sequence-classification':
			data.text = TC_INPUT_TEXTBOX.value
			data.elementIdToUpdate = TC_OUTPUT_CANVAS.id
			data.targetType = 'chart'
			break;

		case 'question-answering':
			data.context = QA_CONTEXT_TEXTBOX.value
			data.question = QA_QUESTION_TEXTBOX.value
			data.elementIdToUpdate = QA_ANSWER_TEXTBOX.id
			break;

		case 'summarization':
			data.text = SUMMARIZATION_INPUT_TEXTBOX.value
			data.elementIdToUpdate = SUMMARIZATION_OUTPUT_TEXTBOX.id
			break;
		default:
			return;
	}

	worker.postMessage(data);
});

// Handle result returned by the web worker

worker.addEventListener('message', (event) => {
	const message = event.data;

	switch (message.type) {
		case 'download': // for session creation

			if (message.data.status === 'initiate') {
				PROGRESS.style.display = 'block';

				// create progress bar
				PROGRESS_BARS.appendChild(htmlToElement(`
					<div class="progress w-100" model="${message.data.path}" file="${message.data.file}">
						<div class="progress-bar" role="progressbar"></div>
					</div>
				`));

			} else {
				let bar = PROGRESS_BARS.querySelector(`.progress[model="${message.data.path}"][file="${message.data.file}"]> .progress-bar`)

				switch (message.data.status) {
					case 'progress':
						// update existing bar
						bar.style.width = message.data.progress.toFixed(2) + '%';
						bar.textContent = `${message.data.file} (${formatBytes(message.data.loaded)} / ${formatBytes(message.data.total)})`;
						break;

					case 'loaded':
						// hide container
						PROGRESS.style.display = 'none';
						PROGRESS_BARS.innerHTML = '';

						break;
				}

			}

			break;
		case 'update': // for generation
			document.getElementById(message.target).value = message.data
			break;

		case 'complete':
			switch (message.targetType) {
				case 'chart':
					const chartToUpdate = CHARTS[message.target];

					// set data, ensuring labels align correctly
					chartToUpdate.data.datasets[0].data = chartToUpdate.data.labels.map(
						x => message.data.scores[message.data.label2id[x]]
					);
					chartToUpdate.update(); // update the chart
					break;
				default: // is text
					document.getElementById(message.target).value = message.data
					break;
			}
			break;
		default:
			break;
	}
});

// Utility functions

function htmlToElement(html) {
	// https://stackoverflow.com/a/35385518
	let template = document.createElement('template');
	html = html.trim(); // Never return a text node of whitespace as the result
	template.innerHTML = html;
	return template.content.firstChild;
}

function formatBytes(bytes, decimals = 0) {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "0 Bytes";
	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)), 10);
	const rounded = (bytes / Math.pow(1000, i)).toFixed(decimals);
	return rounded + " " + sizes[i];
}
