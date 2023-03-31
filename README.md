# Transformers.js

🤗 Run Hugging Face transformers in your browser! \
💡 Inspired by [praeclarum/transformers-js]

<div align="center">

![](https://user-images.githubusercontent.com/26504141/221056008-e906614e-e6f0-4e10-b0a8-7d5c99e955b4.gif)

<!-- prettier-ignore -->
[Playground](https://xenova.github.io/transformers.js/)
| [🤗 Hugging Face](https://huggingface.co/)
| [Official Python version](https://huggingface.co/docs/transformers/index)

</div>

🖥️ No need for server-side API calls \
🤖 Great for AI projects \
💻 Runs completely on-device

## Installation

![npm](https://img.shields.io/static/v1?style=for-the-badge&message=npm&color=CB3837&logo=npm&logoColor=FFFFFF&label=)
![jsDelivr](https://img.shields.io/static/v1?style=for-the-badge&message=jsDelivr&color=E84D3D&logo=jsDelivr&logoColor=FFFFFF&label=)

You can install this package locally using npm, or use an npm CDN like [UNPKG]
or [jsDelivr] to import it right from your browser.

```sh
npm install @xenova/transformers
```

We don't currently offer an ESM version, so you'll have to put up with the UMD
loader. 🤷‍♂️ You'll also need to **specifically request the
`dist/transformers.min.js` file** because the entry `main` in `package.json` is
set to the `src/transformers.js` for Node.js users.

```html
<script src="https://unpkg.com/@xenova/transformers@1.3.5/dist/transformers.min.js"></script>
```

ℹ This UMD build **will expose every export as a global function or variable**,
not under a namespace like `Transformers.*`. For instance, `pipeline()` is a
global. You can find the code that does this in [`transformers.js`].

## Usage

![Hugging Face](https://img.shields.io/static/v1?style=for-the-badge&message=Hugging+Face&color=EFEFEF&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAIKUExURQAAAAAA/0h//06J/5m////35f/eof/Whf/WiP/irf/89pa0/+fw//7elP/lrNvl/uLo///Wff7emtLf/1+f///dn//owTNm/+3x///KTv/Qa9Pi/v/qyf737f/jr//w2P/rx//38MbU///hof7mtOru/9vn///58Pz8///8+fb5/9fr///nt//JVf/JVv/qwX+q//L1///syv/gpv/eov/w1+Hu/+Hp///szv/eoP/hqf/uz+/1/4u5/wAz/wBI///MO//KGv/KE//KFP/JG//NRv/HFf/QGP/UH//TH//UHv/PFv/HG//IGv/THf3RH/7RHv/SHv/THvzQHv/RGv/JJf/OFf3SHnhqOZyGMv/XHfnOH25jO6mQL//YHv/KEf/LK7yfK9+5JP3RHsqpKc+tKP/VHf/NP//LIfXLINWyJvrRHvXMH9SxJ/7SHv/MMP/IJv/QGuq/IExIQmtWP19NQmddPfzOG//OG//FEv/LOv+3F/+7Df+2Cv+9DMuaK9RdR9FkRNuuJP+8C/+7C/+7JP/KUv++Cv/CE//BEv/DEP/QIP/SH//BD/+8B//PYf/IPf/EFP/KGf/PHP+/EP/JF//HFv/AEf/KGP/ADf/LSv/ORf/BCf/LGf/VIP/IFP+9Cf/KFv/LGP/AB//RU//QWP/KJ//JFv/IMv/IL//JGP/KKf/RXv///3XT1jsAAABAdFJOUwABDg0UY6/Q0KxeETbLxTIt490oCLWqBTn8+DVyZ4p/eG0Svbs9QFhZVVgavP39vAxRl8HGjTw8jcbBl1ILBQcAOC/yAAAAAWJLR0StIGLCHQAAAAd0SU1FB+cDHRU1GIn2T3MAAAD1SURBVBjTY2AAA0YmZgYkwMLKxs7BycUN4/PwOjg6Obu48vFD+AKCbu4enp5e3j5CwiC+iKivn39AYFBwYEiomDhQQEIyLDwiMio6JjYuXkoaKCCT4BeQmOSVnJKaFpIuCxSQy/DwyszKzsnNC/LLlwcKKBS4FRYVl5SWlVdUVikyMCgpV9fU1tU3NDY117a0qigxqLa1d3R2dnX39HZ0dvT1qzGoT+idOGnylKnTpk+eMXHmLA0Gzdlz5nrMm9++YOE8j0WLl2gxaOssXTZ1+QpdvZXLV61eo6/NwGBgaGRsYmpmbmFpZW1jC/GNnT2ItLcDkQBm1UV4ENL1+QAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMy0wMy0yOVQyMTo1MzoyNCswMDowMI8H+gUAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjMtMDMtMjlUMjE6NTM6MjQrMDA6MDD+WkK5AAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDIzLTAzLTI5VDIxOjUzOjI0KzAwOjAwqU9jZgAAAABJRU5ErkJggg==&logoColor=FFFFFF&label=)
![ONNX](https://img.shields.io/static/v1?style=for-the-badge&message=ONNX&color=005CED&logo=ONNX&logoColor=FFFFFF&label=)
![HTML5](https://img.shields.io/static/v1?style=for-the-badge&message=HTML5&color=E34F26&logo=HTML5&logoColor=FFFFFF&label=)
![Node.js](https://img.shields.io/static/v1?style=for-the-badge&message=Node.js&color=339933&logo=Node.js&logoColor=FFFFFF&label=)

⚠️ There are still lots of things from the original transformers Python package
that haven't been ported yet!

We currently support models, for a variety of tasks including: masked language
modelling, text classification, zero-shot classification, text-to-text
generation, translation, summarization, question answering, text generation,
automatic speech recognition, image classification, zero-shot image
classification, image-to-text, and object detection.

📚 Check out the [source code for the playground] for a more in-depth view of
what a real-world project might look like.

<table><td>

```py
from transformers import pipeline

pipe = pipeline("sentiment-analysis")
out = pipe("I love transformers!")
# [{ 'label': 'POSITIVE', 'score': 0.999806941 }]
```

<td>

```js
import { pipeline } from "@xenova/transformers";

const pipe = await pipeline("sentiment-analysis");
const out = await pipe("I love transformers!");
//=> [{ 'label': 'POSITIVE', 'score': 0.999817686 }]
```

</table>

It's super easy to translate from existing code!

In the same way as the Python library, you can use a different model by
providing its name as the second argument to the pipeline function.

```javascript
// Use a different model for sentiment-analysis
let pipe = await pipeline(
  "sentiment-analysis",
  "nlptown/bert-base-multilingual-uncased-sentiment"
);
```

### Quickstart models

❤️ [@xenova] has graciously pre-converted and hosted some models for you to use
with no fuss!

- [BERT](https://huggingface.co/docs/transformers/model_doc/bert)
- [ALBERT](https://huggingface.co/docs/transformers/model_doc/albert)
- [DistilBERT](https://huggingface.co/docs/transformers/model_doc/distilbert)
- [MobileBERT](https://huggingface.co/docs/transformers/model_doc/mobilebert)
- [SqueezeBERT](https://huggingface.co/docs/transformers/model_doc/squeezebert)
- [T5](https://huggingface.co/docs/transformers/model_doc/t5)
- [T5v1.1](https://huggingface.co/docs/transformers/model_doc/t5v1.1)
- [FLAN-T5](https://huggingface.co/docs/transformers/model_doc/flan-t5)
- [mT5](https://huggingface.co/docs/transformers/model_doc/mt5)
- [GPT2](https://huggingface.co/docs/transformers/model_doc/gpt2)
- [GPT Neo](https://huggingface.co/docs/transformers/model_doc/gpt_neo)
- [BART](https://huggingface.co/docs/transformers/model_doc/bart)
- [CodeGen](https://huggingface.co/docs/transformers/model_doc/codegen)
- [Whisper](https://huggingface.co/docs/transformers/model_doc/whisper)
- [CLIP](https://huggingface.co/docs/transformers/model_doc/clip)
- [Vision Transformer](https://huggingface.co/docs/transformers/model_doc/vit)
- [VisionEncoderDecoder](https://huggingface.co/docs/transformers/model_doc/vision-encoder-decoder)
- [DETR](https://huggingface.co/docs/transformers/model_doc/detr)

### Custom models

By default, Transformers.js uses [hosted models] and [precompiled WASM
binaries], which should work out-of-the-box. You can override this behaviour to
use your own models using the `env` export.

```javascript
import { env } from "@xenova/transformers";

// Use a different host for models.
// - `remoteURL` defaults to use the HuggingFace Hub
// - `localURL` defaults to '/models/onnx/quantized/'
env.remoteURL = "https://www.example.com/";
env.localURL = "/path/to/models/";

// Set whether to use remote or local models. Defaults to true.
//  - If true, use the path specified by `env.remoteURL`.
//  - If false, use the path specified by `env.localURL`.
env.remoteModels = false;

// Set parent path of .wasm files. Defaults to use a CDN.
env.onnx.wasm.wasmPaths = "/path/to/files/";
```

#### Convert PyTorch models to ONNX

We use [ONNX Runtime] to run the models in the browser, so you must first
convert your PyTorch model to ONNX. This can be done using our conversion
script. In general, the command will look something like this:

```sh
python ./scripts/convert.py --model_id <hf_model_id> --from_hub --quantize --task <task>
```

⚡ We recommend quantizing the model (`--quantize`) to reduce model size and
improve inference speeds at the expense of a slight decrease in accuracy. For
more information, run the help command: `python ./scripts/convert.py -h`.

For example, to use `bert-base-uncased` for masked language modelling, you can
use the command:

```sh
python ./scripts/convert.py --model_id bert-base-uncased --from_hub --quantize --task masked-lm
```

If you want to use a local model, remove the `--from_hub` flag from above and
place your PyTorch model in the `./models/pytorch/` folder. You can also choose
a different location by specifying the parent input folder with
`--input_parent_dir /path/to/parent_dir/` (without the model ID).

Alternatively, you can find some of the [models we have already converted]. For
example, to use `bert-base-uncased` for masked language modelling, you can use
the model found at [huggingface.co/Xenova/transformers.js/quantized].

### Using native Node.js bindings

This library uses `onnxruntime-web` as its default backend. However, if your
application runs with Node.js, you can install `onnxruntime-node` in your
project (using `npm install onnxruntime-node`) to obtain a massive boost in
performance (5x in some cases). The CPU execution provider is much faster than
WASM executor provider, most likely due to [microsoft/onnxruntime#10311].

<!-- prettier-ignore-start -->
[hosted models]: https://huggingface.co/Xenova/transformers.js/tree/main/quantized
[precompiled wasm binaries]: https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/
[praeclarum/transformers-js]: https://github.com/praeclarum/transformers-js#readme
[microsoft/onnxruntime#10311]: https://github.com/microsoft/onnxruntime/issues/10311
[@xenova]: https://github.com/xenova
[unpkg]: https://unpkg.com/
[jsdelivr]: https://esm.run/
[source code for the playground]: assets/js/worker.js
[onnx runtime]: https://onnxruntime.ai/
[models we have already converted]: https://huggingface.co/Xenova/transformers.js
[huggingface.co/Xenova/transformers.js/quantized]: https://huggingface.co/Xenova/transformers.js/tree/main/quantized/bert-base-uncased/masked-lm
[`transformers.js`]: src/transformers.js
<!-- prettier-ignore-end -->
