# Helper file to dynamically generate unit tests
# This is done by running the python Transformers library and comparing its outputs with ours.

import json
import os

from transformers import AutoTokenizer, AutoConfig

from scripts.supported_models import SUPPORTED_MODELS

# List of tokenizers where the model isn't yet supported, but the tokenizer is
ADDITIONAL_TOKENIZERS_TO_TEST = {
    'RefinedWebModel': [
        'tiiuae/falcon-7b',
    ],
    "llama": [
        "hf-internal-testing/llama-tokenizer",
    ],
    'mpt': [
        'mosaicml/mpt-7b',
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
        "The company was founded in 2016.",
        "test $1 R2 #3 €4 £5 ¥6 ₣7 ₹8 ₱9 test",
        "I bought an apple for $1.00 at the store.",
    ],
    "custom": {
        "tiiuae/falcon-7b": [
            "12 and 123 and 1234", # Special case for splitting on 3 numbers
        ]
    },
}


def generate_tokenizer_tests():

    results = {}

    tokenizers_to_test = list(SUPPORTED_MODELS.items()) + list(ADDITIONAL_TOKENIZERS_TO_TEST.items())

    for model_type, tokenizer_names in tokenizers_to_test:
        print(f'Generating tests for {model_type}')
        for tokenizer_name in tokenizer_names:
            print('  -', tokenizer_name)

            try:
                # Load tokenizer
                tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
            except KeyError:
                # If a KeyError is raised from the AutoTokenizer, it means the model
                # does not use a tokenizer (e.g., vision models)
                continue 
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


def generate_config_tests():
    results = {}
    for model_type, config_names in SUPPORTED_MODELS.items():

        for config_name in config_names:
            # Load config
            config = AutoConfig.from_pretrained(config_name)

            results[config_name] = config.to_dict()

            # TODO: Remove after https://github.com/huggingface/transformers/issues/23876 fixed
            results[config_name].pop('torch_dtype', None)

    return results


def main():
    # TODO add option to cache generated data + force build tests

    data_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "data",
    )

    tokenizer_tests = generate_tokenizer_tests()
    with open(os.path.join(data_dir, "tokenizer_tests.json"), "w", encoding="utf-8") as fp:
        json.dump(tokenizer_tests, fp)

    config_tests = generate_config_tests()
    with open(os.path.join(data_dir, "config_tests.json"), "w", encoding="utf-8") as fp:
        json.dump(config_tests, fp)


if __name__ == "__main__":
    main()
