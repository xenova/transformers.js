# Transformers.js


[![npm](https://img.shields.io/npm/v/@xenova/transformers)](https://www.npmjs.com/package/@xenova/transformers)
[![downloads](https://img.shields.io/npm/dw/@xenova/transformers)](https://www.npmjs.com/package/@xenova/transformers)
[![license](https://img.shields.io/github/license/xenova/transformers.js)](https://github.com/xenova/transformers.js/blob/main/LICENSE)


Run 🤗 Transformers in your browser! We currently support [BERT](https://huggingface.co/docs/transformers/model_doc/bert), [ALBERT](https://huggingface.co/docs/transformers/model_doc/albert), [DistilBERT](https://huggingface.co/docs/transformers/model_doc/distilbert), [MobileBERT](https://huggingface.co/docs/transformers/model_doc/mobilebert), [SqueezeBERT](https://huggingface.co/docs/transformers/model_doc/squeezebert), [T5](https://huggingface.co/docs/transformers/model_doc/t5), [T5v1.1](https://huggingface.co/docs/transformers/model_doc/t5v1.1), [FLAN-T5](https://huggingface.co/docs/transformers/model_doc/flan-t5), [mT5](https://huggingface.co/docs/transformers/model_doc/mt5), [BART](https://huggingface.co/docs/transformers/model_doc/bart), [MarianMT](https://huggingface.co/docs/transformers/model_doc/marian), [GPT2](https://huggingface.co/docs/transformers/model_doc/gpt2), [GPT Neo](https://huggingface.co/docs/transformers/model_doc/gpt_neo), [CodeGen](https://huggingface.co/docs/transformers/model_doc/codegen), [Whisper](https://huggingface.co/docs/transformers/model_doc/whisper), [CLIP](https://huggingface.co/docs/transformers/model_doc/clip), [Vision Transformer](https://huggingface.co/docs/transformers/model_doc/vit), [VisionEncoderDecoder](https://huggingface.co/docs/transformers/model_doc/vision-encoder-decoder), and [DETR](https://huggingface.co/docs/transformers/model_doc/detr) models, for a variety of tasks including: masked language modelling, text classification, token classification, zero-shot classification, text-to-text generation, translation, summarization, question answering, text generation, automatic speech recognition, image classification, zero-shot image classification, image-to-text, image segmentation, and object detection.

![teaser](https://user-images.githubusercontent.com/26504141/221056008-e906614e-e6f0-4e10-b0a8-7d5c99e955b4.gif)

Check out our demo at [https://xenova.github.io/transformers.js/](https://xenova.github.io/transformers.js/). As you'll see, everything runs inside the browser!

## Getting Started

### Installation
If you use [npm](https://www.npmjs.com/package/@xenova/transformers), you can install it using:
```bash
npm i @xenova/transformers
```

Alternatively, you can use it in a `<script>` tag from a CDN, for example:
```html
<!-- Using jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js"></script>

<!-- or UNPKG -->
<script src="https://www.unpkg.com/@xenova/transformers/dist/transformers.min.js"></script>
```

### Basic example
It's super easy to translate from existing code!

<table>
<tr>
<th width="440px"><b>Python (original)</b></th>
<th width="440px"><b>Javascript (ours)</b></th>
</tr>
<tr>
<td>

```python
from transformers import pipeline

# Allocate a pipeline for sentiment-analysis
pipe = pipeline('sentiment-analysis')

out = pipe('I love transformers!')
# [{'label': 'POSITIVE', 'score': 0.999806941}]
```

</td>
<td>

```javascript
import { pipeline } from "@xenova/transformers";

// Allocate a pipeline for sentiment-analysis
let pipe = await pipeline('sentiment-analysis');

let out = await pipe('I love transformers!');
// [{'label': 'POSITIVE', 'score': 0.999817686}]
```

</td>
</tr>
</table>


In the same way as the Python library, you can use a different model by providing its name as the second argument to the pipeline function. For example:
```javascript
// Use a different model for sentiment-analysis
let pipe = await pipeline('sentiment-analysis', 'nlptown/bert-base-multilingual-uncased-sentiment');
```


### Custom setup
By default, Transformers.js uses [hosted models](https://huggingface.co/Xenova/transformers.js/tree/main/quantized) and [precompiled WASM binaries](https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/), which should work out-of-the-box. You can override this behaviour as follows:
```javascript
import { env } from "@xenova/transformers";

// Use a different host for models.
// - `remoteURL` defaults to use the HuggingFace Hub
// - `localURL` defaults to '/models/onnx/quantized/'
env.remoteURL = 'https://www.example.com/';
env.localURL = '/path/to/models/';

// Set whether to use remote or local models. Defaults to true.
//  - If true, use the path specified by `env.remoteURL`.
//  - If false, use the path specified by `env.localURL`.
env.remoteModels = false;

// Set parent path of .wasm files. Defaults to use a CDN.
env.onnx.wasm.wasmPaths = '/path/to/files/';
```

#### Node.js

This library uses `onnxruntime-web` as its default backend. However, if your application runs with Node.js, you can install `onnxruntime-node` in your project (using `npm i onnxruntime-node`) to obtain a massive boost in performance (>5x in some cases). The CPU execution provider is much faster than WASM executor provider, most likely due to [this issue](https://github.com/microsoft/onnxruntime/issues/10311).


## Usage

### Convert your PyTorch models to ONNX
We use [ONNX Runtime](https://onnxruntime.ai/) to run the models in the browser, so you must first convert your PyTorch model to ONNX (which can be done using our conversion script). In general, the command will look something like this:
```
python -m scripts.convert --model_id <hf_model_id> --from_hub --quantize --task <task>
```

For example, to use `bert-base-uncased` for masked language modelling, you can use the command:
```
python -m scripts.convert --model_id bert-base-uncased --from_hub --quantize --task masked-lm
```

If you want to use a local model, remove the `--from_hub` flag from above and place your PyTorch model in the `./models/pytorch/` folder. You can also choose a different location by specifying the parent input folder with `--input_parent_dir /path/to/parent_dir/` (note: without the model id). 


Alternatively, you can find some of the models we have already converted [here](https://huggingface.co/Xenova/transformers.js). For example, to use `bert-base-uncased` for masked language modelling, you can use the model found at [https://huggingface.co/Xenova/transformers.js/tree/main/quantized/bert-base-uncased/masked-lm](https://huggingface.co/Xenova/transformers.js/tree/main/quantized/bert-base-uncased/masked-lm).

*Note:* We recommend quantizing the model (`--quantize`) to reduce model size and improve inference speeds (at the expense of a slight decrease in accuracy). For more information, run the help command: `python -m scripts.convert -h`.


### Options
*Coming soon...*


## Examples
*Coming soon... In the meantime, check out the source code for the demo [here](https://github.com/xenova/transformers.js/blob/main/assets/js/worker.js).*

## Credit
Inspired by https://github.com/praeclarum/transformers-js


