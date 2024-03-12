import './style.css';
import { env, AutoModel, ones } from '@xenova/transformers';
import Chart from 'chart.js/auto';

// Throw an error if WebGPU is not supported
if (!navigator.gpu) {
  const err = 'WebGPU is not supported by this browser.';
  alert(err)
  throw Error(err);
}

// Proxy the WASM backend to prevent the UI from freezing
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/';
env.backends.onnx.wasm.numThreads = 1;

// Reference the elements that we will need
const ctx = document.getElementById('chart');
const batchSizes = document.getElementById('batch-sizes');
const xscale = document.getElementById('x-scale');
const yscale = document.getElementById('y-scale');
const sequenceLength = document.getElementById('sequence-length');
const status = document.getElementById('status');
const start = document.getElementById('start');
const stop = document.getElementById('stop');

// Benchmark settings
const NUM_WARMUP_STEPS = 3;
const QUANTIZED = false;
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

// Chart configuration
const config = {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'WASM',
      data: [],
      borderColor: 'red',
      backgroundColor: 'rgba(255, 0, 0, 0.5)',
    }, {
      label: 'WebGPU',
      data: [],
      borderColor: 'blue',
      backgroundColor: 'rgba(0, 0, 255, 0.5)',
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Batch size',
        },
        min: 1,
      },
      y: {
        title: {
          display: true,
          text: 'Time (ms)',
        },
      }
    }
  },
};

const toggleScale = (chart, axis, enabled) => {
  chart.options.scales[axis].type = enabled ? 'logarithmic' : 'linear';
  chart.update();
}

xscale.addEventListener('change', () => toggleScale(chart, 'x', xscale.checked));
yscale.addEventListener('change', () => toggleScale(chart, 'y', yscale.checked));

const chart = new Chart(ctx, config);

status.textContent = 'Loading model...';

let model_CPU;
try {
  model_CPU = await AutoModel.from_pretrained(MODEL_ID, {
    quantized: QUANTIZED,
    device: 'wasm',
  });
} catch (err) {
  status.textContent = err.message;
  alert(err.message)
  throw err;
}

let model_GPU;
try {
  model_GPU = await AutoModel.from_pretrained(MODEL_ID, {
    quantized: QUANTIZED,
    device: 'webgpu',
  });
} catch (err) {
  status.textContent = err.message;
  alert(err.message)
  throw err;
}

let adapterInfo;
try {
  // Shouldn't fail since the WebGPU model has loaded successfully
  const adapter = await navigator.gpu.requestAdapter();
  adapterInfo = await adapter.requestAdapterInfo();
} catch (err) {
  adapterInfo = {};
}

status.textContent = 'Ready';

let interrupted = false;
start.addEventListener('click', async () => {
  start.disabled = true;
  stop.disabled = false;
  interrupted = false;

  // Reset
  chart.data.labels = [];
  for (let i = 0; i < chart.data.datasets; ++i) {
    chart.data.datasets[i].data = [];
  }
  chart.update();

  const seqLength = parseInt(sequenceLength.value);

  status.textContent = 'Warming up...';

  const generateDummyInputs = (batch_size) => {

    const inputs = ones([batch_size, seqLength]);

    const model_inputs = {
      input_ids: inputs,
      attention_mask: inputs,
    }
    return model_inputs;
  }

  // Warm up: This is important for the WebGPU execution provider, which compiles the shaders on first load
  for (let i = 0; i < NUM_WARMUP_STEPS; ++i) {
    const model_inputs = generateDummyInputs(1);
    await model_CPU(model_inputs);
    await model_GPU(model_inputs);
  }

  status.textContent = 'Running benchmark...';

  const batch_sizes = batchSizes.value.split(',').map(x => parseInt(x)).filter(x => x);

  for (const batch_size of batch_sizes) {
    if (interrupted) break;

    const model_inputs = generateDummyInputs(batch_size);

    let wasmTime;
    { // Run WASM
      const start = performance.now();
      await model_CPU(model_inputs);
      const end = performance.now();
      wasmTime = end - start;
    }

    let webGPUTime;
    { // Run WebGPU
      const start = performance.now();
      await model_GPU(model_inputs);
      const end = performance.now();
      webGPUTime = end - start;
    }
    chart.data.labels.push(batch_size);
    chart.data.datasets[0].data.push(wasmTime);
    chart.data.datasets[1].data.push(webGPUTime);
    chart.update();
  }

  // Calculate max speedup:
  if (chart.data.labels.length === 0) return;

  const table = generateResultsTable(chart.data, seqLength);

  const speedup = chart.data.datasets[0].data.at(-1) / chart.data.datasets[1].data.at(-1);
  const roundedSpeedup = speedup.toFixed(2);
  const params = new URLSearchParams({
    title: `⚡ WebGPU Benchmark Results (${roundedSpeedup}x speedup)`,
    description: table.outerHTML,
  });

  const paramsStr = params.toString();
  status.innerHTML = `⚡ Done! WebGPU is <strong>${roundedSpeedup}x</strong> faster! <a href="https://huggingface.co/spaces/Xenova/webgpu-embedding-benchmark/discussions/new?${paramsStr}" target="_blank">Share results</a>`;
  start.disabled = false;
});
start.disabled = false;

stop.addEventListener('click', () => {
  status.textContent = 'Stopping...';
  interrupted = true;
  stop.disabled = true;
});

function generateResultsTable(data, sequence_length) {
  const datasets = data.datasets.map(d => d.data);
  const batch_sizes = data.labels;

  const container = document.createElement('div');

  const table = document.createElement('table');
  const thead = table.createTHead();
  const tbody = table.createTBody();

  // Add header row
  const headerRow = thead.insertRow();
  headerRow.insertCell().textContent = 'Batch Size';
  headerRow.insertCell().textContent = `WASM (ms)`;
  headerRow.insertCell().textContent = `WebGPU (ms)`;

  // Add data rows
  batch_sizes.forEach((batchSize, rowIndex) => {
    const row = tbody.insertRow();
    row.insertCell().textContent = batchSize;
    datasets.forEach(dataset => {
      row.insertCell().textContent = dataset[rowIndex].toFixed(2);
    });
  });

  container.appendChild(table);

  const createBulletPoint = (text) => {
    const li = document.createElement('li');
    li.textContent = text;
    return li;
  }

  // Add other information
  const info = document.createElement('ul');
  info.appendChild(createBulletPoint(`Model: ${MODEL_ID}`));
  info.appendChild(createBulletPoint(`Quantized: ${QUANTIZED}`));
  info.appendChild(createBulletPoint(`Sequence length: ${sequence_length}`));
  info.appendChild(createBulletPoint(`Browser: ${navigator.userAgent}`));
  info.appendChild(createBulletPoint(`GPU: vendor=${adapterInfo.vendor}, architecture=${adapterInfo.architecture}, device=${adapterInfo.device}, description=${adapterInfo.description}`));
  container.appendChild(info);

  return container;
}
