# We compare outputs with the python library
import json
import os

from transformers import AutoTokenizer

TEST_DATA = {
    "albert": [
        "albert-base-v2",
        # "sentence-transformers/paraphrase-albert-small-v2"
    ],
    "bart": [
        "sshleifer/distilbart-cnn-6-6",
        "facebook/bart-large-cnn"
    ],
    "bert": [
        "bert-base-uncased",
        "bert-base-cased",
        "bert-base-multilingual-uncased",
        "bert-base-multilingual-cased",
        "sentence-transformers/all-MiniLM-L6-v2",
        "ckiplab/bert-base-chinese-ner"
    ],
    "clip": [
        "openai/clip-vit-base-patch16"
    ],
    "codegen": [
        "Salesforce/codegen-350M-mono",
        "Salesforce/codegen-350M-multi",
        "Salesforce/codegen-350M-nl"
    ],
    "distilbert": [
        "distilbert-base-uncased",
        "distilbert-base-cased",
        "Davlan/distilbert-base-multilingual-cased-ner-hrl"
    ],
    "gpt-neo": [
        "EleutherAI/gpt-neo-125M"
    ],
    "gpt2": [
        "gpt2",
        "distilgpt2"
    ],
    "marian": [
        "Helsinki-NLP/opus-mt-en-jap",
        "Helsinki-NLP/opus-mt-jap-en"
    ],
    "mobilebert": [
        "google/mobilebert-uncased"
    ],
    "mt5": [
        "google/mt5-small"
    ],
    "roberta": [
        "roberta-base",
        "distilroberta-base",
        "roberta-large-mnli",
        "sentence-transformers/all-distilroberta-v1"
    ],
    "squeezebert": [
        "squeezebert/squeezebert-uncased",
        "squeezebert/squeezebert-mnli"
    ],
    "t5": [
        "t5-small",
        "t5-base",
        "google/t5-v1_1-small",
        "google/t5-v1_1-base",
        "google/flan-t5-small",
        "google/flan-t5-base"
    ],
    "vision-encoder-decoder": [
        "nlpconnect/vit-gpt2-image-captioning"
    ],
    "whisper": [
        "openai/whisper-tiny",
        "openai/whisper-tiny.en"
    ]
}

texts_data = {
    "shared": [
        "hello world",
        "Hello World",
        "How are you doing?",
        "You should've done this",
        "A\n'll !!to?'d''d of, can't.",
        "def main():\n\tpass",
        "This\n\nis\na\ntest."
    ],
    "custom": {
    }
}


def main():

    results = {}

    for model_type, tokenizer_names in TEST_DATA.items():

        for tokenizer_name in tokenizer_names:
            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
            print(f'{tokenizer=}')

            tokenizer_results = []

            shared_texts = texts_data['shared']
            custom_texts = texts_data['custom'].get(tokenizer_name, [])

            # Run tokenizer on test cases
            for text in shared_texts + custom_texts:
                tokens = tokenizer(text).data
                tokenizer_results.append({
                    'input': text,
                    'target': tokens
                })
                print(f'{tokens=}')

            results[tokenizer_name] = tokenizer_results

    results_file = os.path.join(os.path.dirname(
        os.path.abspath(__file__)), 'tests.json')
    with open(results_file, 'w') as fp:
        json.dump(results, fp)


if __name__ == '__main__':
    main()
