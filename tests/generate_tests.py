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

TOKENIZERS_TO_IGNORE = [
    # TODO: remove when https://github.com/huggingface/transformers/pull/25478 is merged
    'facebook/m2m100_418M',
]

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
        "you…  ",
        "\u0079\u006F\u0075\u2026\u00A0\u00A0",
        "\u0079\u006F\u0075\u2026\u00A0\u00A0\u0079\u006F\u0075\u2026\u00A0\u00A0",
        "▁This ▁is ▁a ▁test ▁.",
        "weird \uFF5E edge \uFF5E case",
    ],
    "custom": {
        "tiiuae/falcon-7b": [
            "12 and 123 and 1234",  # Special case for splitting on 3 numbers
        ],
        "hf-internal-testing/llama-tokenizer": [
            # Additional test-cases for the Llama tokenizer, adapted from
            # https://github.com/belladoreai/llama-tokenizer-js/blob/master/llama-tokenizer.js#L381-L452
            "grabbed",
            " grabbed",
            "           grabbed",
            "\n",
            " \n",
            "	tabs				out here",
            "ax\n####\nboo",
            "镇",
            "🦙",
            "🦙Ꙋ",
            "Ꙋ🦙",
            "The llama (/ˈlɑːmə/; 🦙Spanish pronunciation: [ˈʎama]) (Lama glama) is a domesticated South American " \
            "camelid, widely used as a meat and pack animal by Andean cultures since the Pre-Columbian era. Llamas " \
            "are social animals and live with others as a herd. Their wool is soft and contains only a small " \
            "amount of lanolin.[2] Llamas can learn simple tasks after a few repetitions. When using a pack, they " \
            "can carry about 25 to 30% of their body weight for 8 to 13 km (5–8 miles).[3] The name llama (in the " \
            "past also spelled \"lama\" or \"glama\") was adopted by European settlers from native Peruvians.[4] " \
            "The ancestors of llamas are thought to have originated from the Great Plains of North America about " \
            "40 million years ago, and subsequently migrated to South America about three million years ago during " \
            "the Great American Interchange. By the end of the last ice age (10,000–12,000 years ago), camelids were " \
            "extinct in North America.[3] As of 2007, there were over seven million llamas and alpacas in South " \
            "America and over 158,000 llamas and 100,000Ꙋ🦙 alpacas, descended from progenitors imported late in " \
            "the 20th century, in the United States and Canada.[5] In Aymara mythology, llamas are important beings. " \
            "The Heavenly Llama is said to drink water from the ocean and urinates as it rains.[6] According to " \
            "Aymara eschatology, llamas will return to the water springs and lagoons where they come from at the " \
            "end of time.[6]"
        ]
    },
}


def generate_tokenizer_tests():

    results = {}

    tokenizers_to_test = list(SUPPORTED_MODELS.items()) + \
        list(ADDITIONAL_TOKENIZERS_TO_TEST.items())

    for model_type, tokenizer_names in tokenizers_to_test:
        print(f'Generating tests for {model_type}')
        for tokenizer_name in tokenizer_names:
            if tokenizer_name in TOKENIZERS_TO_IGNORE:
                continue

            print('  -', tokenizer_name)

            try:
                # Load tokenizer
                tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
            except (KeyError, EnvironmentError):
                # If a KeyError/EnvironmentError is raised from the AutoTokenizer, it
                # means the model does not use a tokenizer (e.g., vision models)
                continue

            tokenizer_results = []

            shared_texts = TOKENIZER_TEST_DATA["shared"]
            custom_texts = TOKENIZER_TEST_DATA["custom"].get(
                tokenizer_name, [])

            # Run tokenizer on test cases
            for text in shared_texts + custom_texts:
                # TODO: add with_pair option
                try:
                    encoded = tokenizer(text).data
                except Exception:
                    # Ignore testing tokenizers which fail in the python library
                    continue

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

            if tokenizer_results:
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
