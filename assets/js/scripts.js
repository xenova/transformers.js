
// Scripts.js - handles link between DOM and worker

// Initialise worker
const worker = new Worker('./assets/js/worker.js', { type: 'module' });

// Define elements
const TASK_SELECTOR = document.getElementById('task');
const INPUT_TEXTBOX = document.getElementById('input-textbox');
const OUTPUT_TEXTBOX = document.getElementById('output-textbox');
const TEXT_GENERATION_TEXTBOX = document.getElementById('text-generation-textbox');
const LANGUAGE_FROM = document.getElementById('language-from');
const LANGUAGE_TO = document.getElementById('language-to');
const TASKS = document.getElementsByClassName('task-settings')
const PROGRESS = document.getElementById('progress');
const PROGRESS_BARS = document.getElementById('progress-bars');

const GENERATE_BUTTON = document.getElementById('generate');

// Parameters
const GENERATION_OPTIONS = document.getElementsByClassName('generation-option');

// Add event listeners
TASK_SELECTOR.addEventListener('input', (e) => {
	for (let element of TASKS) {
		if (element.getAttribute('task') === e.target.value) {
			element.style.display = 'block';
		} else {
			element.style.display = 'none';
		}
	}
});

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
			let value = parseValue(x.value, x.type);
			return [x.getAttribute('param-name'), value]
		}))
	};
	if (TASK_SELECTOR.value === 'translation') {

		data.languageFrom = LANGUAGE_FROM.value
		data.languageTo = LANGUAGE_TO.value
		data.text = INPUT_TEXTBOX.value
		data.elementIdToUpdate = 'output-textbox'

	} else if (TASK_SELECTOR.value === 'text-generation') {
		data.text = TEXT_GENERATION_TEXTBOX.value
		data.elementIdToUpdate = 'text-generation-textbox'
	} else {
		// throw error
		return
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
