# Helper file to dynamically generate unit tests
# This is done by running the python Transformers library and comparing its outputs with ours.

import json
import os

from transformers import AutoTokenizer

MODELS_TO_TEST = {
    "albert": [
        "albert-base-v2",
        # "sentence-transformers/paraphrase-albert-small-v2",
    ],
    "bart": [
        "sshleifer/distilbart-cnn-6-6",
        "facebook/bart-large-cnn",
    ],
    "bert": [
        "bert-base-uncased",
        "bert-base-cased",
        "bert-base-multilingual-uncased",
        "bert-base-multilingual-cased",
        "sentence-transformers/all-MiniLM-L6-v2",
        "ckiplab/bert-base-chinese-ner",
    ],
    "clip": [
        "openai/clip-vit-base-patch16",
    ],
    "codegen": [
        "Salesforce/codegen-350M-mono",
        "Salesforce/codegen-350M-multi",
        "Salesforce/codegen-350M-nl",
    ],
    "distilbert": [
        "distilbert-base-uncased",
        "distilbert-base-cased",
        "Davlan/distilbert-base-multilingual-cased-ner-hrl",
    ],
    "gpt-neo": [
        "EleutherAI/gpt-neo-125M",
    ],
    "gpt2": [
        "gpt2",
        "distilgpt2",
    ],
    "llama": [
        "hf-internal-testing/llama-tokenizer",
    ],
    "m2m_100": [
        "facebook/nllb-200-distilled-600M",
    ],
    # TODO add back
    # "mobilebert": [
    #     "google/mobilebert-uncased",
    # ],
    "mt5": [
        "google/mt5-small",
    ],
    "roberta": [
        "roberta-base",
        "distilroberta-base",
        "roberta-large-mnli",

        "sentence-transformers/all-distilroberta-v1",
    ],
    "squeezebert": [
        "squeezebert/squeezebert-uncased",
        "squeezebert/squeezebert-mnli",
    ],
    "t5": [
        "t5-small",
        "t5-base",
        "google/t5-v1_1-small",
        "google/t5-v1_1-base",
        "google/flan-t5-small",
        "google/flan-t5-base",
    ],
    "vision-encoder-decoder": [
        "nlpconnect/vit-gpt2-image-captioning",
    ],
    "whisper": [
        "openai/whisper-tiny",
        "openai/whisper-tiny.en",
    ],
}

TOKENIZER_TEST_DATA = {
    "shared": [
        "hello world",
        "Hello World",
        "How are you doing?",
        "You should've done this",
        "A\n'll !!to?'d''d of, can't.",
        "def main():\n\tpass",
        "This\n\nis\na\ntest.",
        "let a = obj.toString();\ntoString();",
        'Hi  Hello',
        "trailing space   ",
        "   leading space",
        "生活的真谛是",
    ],
    "custom": {},
}


def generate_tokenizer_tests():

    results = {}

    for model_type, tokenizer_names in MODELS_TO_TEST.items():

        for tokenizer_name in tokenizer_names:
            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)

            tokenizer_results = []

            shared_texts = TOKENIZER_TEST_DATA["shared"]
            custom_texts = TOKENIZER_TEST_DATA["custom"].get(
                tokenizer_name, [])

            # Run tokenizer on test cases
            for text in shared_texts + custom_texts:
                # TODO: add with_pair option

                encoded = tokenizer(text).data
                decoded_with_special = tokenizer.decode(
                    encoded["input_ids"], skip_special_tokens=False)
                decoded_without_special = tokenizer.decode(
                    encoded["input_ids"], skip_special_tokens=True)

                tokenizer_results.append(dict(
                    input=text,
                    encoded=encoded,
                    decoded_with_special=decoded_with_special,
                    decoded_without_special=decoded_without_special,
                ))

            results[tokenizer_name] = tokenizer_results

    return results


def main():
    # TODO add option to cache generated data + force build tests

    data_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "data",
    )

    tokenizer_tests = generate_tokenizer_tests()

    with open(os.path.join(data_dir, "tokenizer_tests.json"), "w", encoding="utf-8") as fp:
        json.dump(tokenizer_tests, fp)


if __name__ == "__main__":
    main()
