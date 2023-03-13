# Transformers.js
![https://www.npmjs.com/package/@xenova/transformers](https://img.shields.io/npm/v/@xenova/transformers) ![https://www.npmjs.com/package/@xenova/transformers](https://img.shields.io/npm/dw/@xenova/transformers)
![https://github.com/xenova/transformers.js/blob/main/LICENSE](https://img.shields.io/github/license/xenova/transformers.js)

Run 🤗 Transformers in your browser! We currently support [BERT](https://huggingface.co/docs/transformers/model_doc/bert), [ALBERT](https://huggingface.co/docs/transformers/model_doc/albert), [DistilBERT](https://huggingface.co/docs/transformers/model_doc/distilbert), [T5](https://huggingface.co/docs/transformers/model_doc/t5), [T5v1.1](https://huggingface.co/docs/transformers/model_doc/t5v1.1), [FLAN-T5](https://huggingface.co/docs/transformers/model_doc/flan-t5), [GPT2](https://huggingface.co/docs/transformers/model_doc/gpt2), [BART](https://huggingface.co/docs/transformers/model_doc/bart), [CodeGen](https://huggingface.co/docs/transformers/model_doc/codegen), [Whisper](https://huggingface.co/docs/transformers/model_doc/whisper), [Vision Transformer](https://huggingface.co/docs/transformers/model_doc/vit), and [VisionEncoderDecoder](https://huggingface.co/docs/transformers/model_doc/vision-encoder-decoder) models, for a variety of tasks including: masked language modelling, text classification, text-to-text generation, translation, summarization, question answering, text generation, automatic speech recognition, image classification, and image-to-text.

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
<th width="450px"><b>Python (original)</b></th>
<th width="450px"><b>Javascript (ours)</b></th>
</tr>
<tr>
<td>

```python
from transformers import pipeline

# Allocate a pipeline for sentiment-analysis
classifier = pipeline('sentiment-analysis')

output = classifier('I love transformers!')
# [{'label': 'POSITIVE', 'score': 0.9998069405555725}]
```

</td>
<td>

```javascript
import { pipeline } from "@xenova/transformers";

// Allocate a pipeline for sentiment-analysis
let classifier = await pipeline('sentiment-analysis');

let output = await classifier('I love transformers!');
// [{label: 'POSITIVE', score: 0.9998176857266375}]
```

</td>
</tr>
</table>


In the same way as the Python library, you can use a different model by providing its name as the second argument to the pipeline function. For example:
```javascript
// Use a different model for sentiment-analysis
let classifier = await pipeline('sentiment-analysis', 'nlptown/bert-base-multilingual-uncased-sentiment');
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

## Usage

### Convert your PyTorch models to ONNX
We use [ONNX Runtime](https://onnxruntime.ai/) to run the models in the browser, so you must first convert your PyTorch model to ONNX (which can be done using our conversion script). In general, the command will look something like this:
```
python ./scripts/convert.py --model_id <hf_model_id> --from_hub --quantize --task <task>
```

For example, to use `bert-base-uncased` for masked language modelling, you can use the command:
```
python ./scripts/convert.py --model_id bert-base-uncased --from_hub --quantize --task masked-lm
```

If you want to use a local model, remove the `--from_hub` flag from above and place your PyTorch model in the `./models/pytorch/` folder. You can also choose a different location by specifying the parent input folder with `--input_parent_dir /path/to/parent_dir/` (note: without the model id). 


Alternatively, you can find some of the models we have already converted [here](https://huggingface.co/Xenova/transformers.js). For example, to use `bert-base-uncased` for masked language modelling, you can use the model found at [https://huggingface.co/Xenova/transformers.js/tree/main/quantized/bert-base-uncased/masked-lm](https://huggingface.co/Xenova/transformers.js/tree/main/quantized/bert-base-uncased/masked-lm).

*Note:* We recommend quantizing the model (`--quantize`) to reduce model size and improve inference speeds (at the expense of a slight decrease in accuracy). For more information, run the help command: `python ./scripts/convert.py -h`.


### Options
*Coming soon...*


## Examples
*Coming soon... In the meantime, check out the source code for the demo [here](https://github.com/xenova/transformers.js/blob/main/assets/js/worker.js).*

## Credit
Inspired by https://github.com/praeclarum/transformers-js


