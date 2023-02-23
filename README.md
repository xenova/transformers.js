# Transformers.js

Run 🤗 Transformers in your browser! We currently support [BERT](https://huggingface.co/docs/transformers/model_doc/bert), [DistilBERT](https://huggingface.co/docs/transformers/model_doc/distilbert), [T5](https://huggingface.co/docs/transformers/model_doc/t5) and [GPT2](https://huggingface.co/docs/transformers/model_doc/gpt2) models, for a variety of tasks including: feature extraction, masked language modelling, text classification, translation, summarization, and text generation.


https://user-images.githubusercontent.com/26504141/221052598-4f775c33-1064-47ff-a8b0-e9371f2a9319.mp4


## Getting Started

It's super easy to translate from existing code!


Python (original):
```python
from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM
)

path = './models/pytorch/t5-small'
tokenizer = AutoTokenizer.from_pretrained(path)
model = AutoModelForSeq2SeqLM.from_pretrained(path)

text = 'translate English to French: Hello, how are you?'
input_ids = tokenizer(text, return_tensors='pt').input_ids

output_token_ids = model.generate(input_ids)
output_text = tokenizer.decode(output_token_ids[0], True)
print(output_text) # "Bonjour, comment allez-vous?"
```

Javascript (ours):
```javascript
import {
    AutoTokenizer,
    AutoModelForSeq2SeqLM
} from "transformers.js";

let path = './models/onnx/t5-small';
let tokenizer = await AutoTokenizer.from_pretrained(path);
let model = await AutoModelForSeq2SeqLM.from_pretrained(path);

let text = 'translate English to French: Hello, how are you?';
let input_ids = tokenizer(text).input_ids;

let output_token_ids = await model.generate(input_ids);
let output_text = tokenizer.decode(output_token_ids[0], true);
console.log(output_text); // "Bonjour, comment allez-vous?"
```



## Demo
Check out our demo at [https://xenova.github.io/transformers.js/](https://xenova.github.io/transformers.js/). As you'll see, everything runs inside the browser!

## Usage

### Convert your PyTorch models to ONNX
We use [ONNX Runtime](https://onnxruntime.ai/) to run the models in the browser, so you must first convert your PyTorch model to ONNX (which can be done using our conversion script). For the following examples, we assume your PyTorch models are located in the ./models/pytorch/ folder. To choose a different location, specify the parent input folder with `--input_parent_dir /path/to/parent_dir/` (note: without the model id).

Here are some of the models we have already converted (along with the command used).
1. [t5-small](https://huggingface.co/Xenova/t5-small_onnx-quantized) for translation/summarization.
    ```
    python -m scripts.convert --quantize --model_id t5-small --task seq2seq-lm-with-past
    ```

2. [distilgpt2](https://huggingface.co/Xenova/distilgpt2_onnx-quantized) for text generation.
    ```
    python -m scripts.convert --quantize --model_id distilgpt2 --task causal-lm-with-past
    ```

3. [bert-base-uncased](https://huggingface.co/Xenova/bert-base-uncased_onnx-quantized) for masked language modelling.
    ```
    python -m scripts.convert --quantize --model_id bert-base-uncased --task masked-lm
    ```

4. [bert-base-cased](https://huggingface.co/Xenova/bert-base-cased_onnx-quantized) for masked language modelling.
    ```
    python -m scripts.convert --quantize --model_id bert-base-cased --task masked-lm
    ```

5. [bert-base-multilingual-uncased](https://huggingface.co/Xenova/bert-base-multilingual-uncased-sentiment_onnx-quantized) for sequence classification (i.e., sentiment analysis).
    ```
    python -m scripts.convert --quantize --model_id bert-base-multilingual-uncased --task sequence-classification
    ```

Note: We recommend quantizing the model (`--quantize`) to reduce model size and improve inference speeds (at the expense of a slight decrease in accuracy).


### Options
*Coming soon...*


## Examples
*Coming soon... In the meantime, check out the source code for the demo [here](https://github.com/xenova/transformers.js/blob/main/assets/js/worker.js).*

## Credit
Inspired by https://github.com/praeclarum/transformers-js


