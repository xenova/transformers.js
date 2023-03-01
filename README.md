# Transformers.js

Run 🤗 Transformers in your browser! We currently support [BERT](https://huggingface.co/docs/transformers/model_doc/bert), [DistilBERT](https://huggingface.co/docs/transformers/model_doc/distilbert), [T5](https://huggingface.co/docs/transformers/model_doc/t5), [GPT2](https://huggingface.co/docs/transformers/model_doc/gpt2), and [BART](https://huggingface.co/docs/transformers/model_doc/bart) models, for a variety of tasks including: masked language modelling, text classification, translation, summarization, question answering, and text generation.

![teaser](https://user-images.githubusercontent.com/26504141/221056008-e906614e-e6f0-4e10-b0a8-7d5c99e955b4.gif)



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


