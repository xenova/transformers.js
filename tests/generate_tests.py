# Helper file to dynamically generate unit tests
# This is done by running the python Transformers library and comparing its outputs with ours.

import json
import os
from itertools import product

from transformers import AutoTokenizer, AutoConfig
import numpy as np

from scripts.supported_models import SUPPORTED_MODELS

# List of tokenizers where the model isn't yet supported, but the tokenizer is
ADDITIONAL_TOKENIZERS_TO_TEST = {
    'falcon': [
        'tiiuae/falcon-7b',
    ],
    "llama": [
        'hf-internal-testing/llama-tokenizer',  # Special tokens: normalized=true
        'Xenova/llama2-tokenizer',  # Special tokens: normalized=false
        'Xenova/llama2-chat-tokenizer',  # Special tokens: normalized=false
        'hf-internal-testing/llama-code-tokenizer',

        # TODO: add back when llama tests are fixed
        # 'Xenova/llama3-tokenizer-new',  # PostProcessor type: Sequence
    ],
    'mpt': [
        'mosaicml/mpt-7b',
    ],
    't5': [
        # TODO: Add back when https://github.com/huggingface/transformers/issues/26318 is fixed
        # 'Xenova/t5-tokenizer-new',
    ],
    'bert': [
        # Uses `Whitespace` pretokenizer
        'Xenova/jina-embeddings-v2-base-zh-tokenizer',
    ],
    'qwen2': [
        # Uses a pretokenizer regex which is not compatible with JavaScript.
        'Qwen/Qwen1.5-0.5B-Chat',
    ],
    'gemma': [
        'Xenova/gemma-tokenizer',
    ],
}

MODELS_TO_IGNORE = [
    # TODO: remove when https://github.com/huggingface/tokenizers/issues/251 is fixed
    'xlm',

    # TODO: remove when https://github.com/huggingface/transformers/issues/26018 is fixed
    'marian',

    # TODO: remove when https://github.com/huggingface/transformers/issues/26547 is fixed
    'speecht5',

    # TODO: remove when https://github.com/huggingface/transformers/pull/26522 is merged
    'siglip',

    # TODO: remove when https://github.com/huggingface/transformers/issues/28164 is fixed
    'roformer',

    # TODO: remove when https://github.com/huggingface/transformers/issues/28173 is fixed. Issues include:
    # - decoding with `skip_special_tokens=True`.
    # - interspersing the pad token is broken.
    'vits',
]

TOKENIZERS_TO_IGNORE = [
    # TODO: remove when https://github.com/huggingface/transformers/pull/25478 is merged
    'facebook/m2m100_418M',

    # TODO: remove when https://github.com/huggingface/transformers/issues/28096 is addressed
    'RajuKandasamy/tamillama_tiny_30m',
]

MAX_TESTS = {
    'marian': 10,
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
        "you…  ",
        "\u0079\u006F\u0075\u2026\u00A0\u00A0",
        "\u0079\u006F\u0075\u2026\u00A0\u00A0\u0079\u006F\u0075\u2026\u00A0\u00A0",
        "▁This ▁is ▁a ▁test ▁.",
        "weird \uFF5E edge \uFF5E case",

        # SentencePiece-specific test cases
        "<s>\n",
        " </s> test </s> ",
        "</s>test</s>",

        # Control characters
        "1\u00002\uFFFD3",
    ],
    "custom_by_model_type": {
        "llama": [
            # Additional test-cases for the Llama tokenizer, adapted from
            # https://github.com/belladoreai/llama-tokenizer-js/blob/master/llama-tokenizer.js#L381-L452
            "grabbed",
            " grabbed",
            "           grabbed",
            "\n",
            " \n",
            "	tabs				out here",
            "\n\t\n",
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
            "end of time.[6]",
        ],

        "vits": [
            "abcdefghijklmnopqrstuvwxyz01234567890",
            # Special treatment of characters in certain language
            "ț ţ",
        ],

        "qwen2": [
            "i'm i'M i've i've i'Ve i'vE i'VE",
        ],
    },
    "custom": {
        "facebook/blenderbot_small-90M": [
            # Test special tokens
            "__start__hello world__end__",
            # The original (python) tokenizer simply joins by spaces (regardless of special tokens or not)
            "__start__ hey __end__"  # --> ... --> "__start__ hey __end__"
            "__start__hey __end__"  # --> ... --> "__start__ hey __end__"
        ],
        "tiiuae/falcon-7b": [
            "12 and 123 and 1234",  # Special case for splitting on 3 numbers
        ],
        "InstaDeepAI/nucleotide-transformer-500m-human-ref": [
            # Actual protein sequences
            "ATTCCGATTCCGATTCCG",
            "ATTTCTCTCTCTCTCTGAGATCGATCGATCGAT",

            # Special tokens
            "<unk><pad><mask><cls><eos><bos>",
        ],

        "distil-whisper/distil-small.en": [
            "   <|startoftranscript|> <|en|>   ",  # Tests lstrip+rstrip
        ],

        "Xenova/t5-tokenizer-new": [
            # Tests the new T5 tokenizer, which uses a different prepend_scheme for its pre_tokenizer:
            # tokenizer._tokenizer.pre_tokenizer = Metaspace(add_prefix_space = True, replacement = "▁", prepend_scheme = "first")
            # See https://github.com/huggingface/transformers/pull/26678 for more information.
            #  - Old (incorrect): ['▁Hey', '▁', '</s>', '▁', '.', '▁how', '▁are', '▁you']
            #  - New (correct):   ['▁Hey', '▁', '</s>', '.', '▁how', '▁are', '▁you']
            "Hey </s>. how are you",
        ],
    },
}

TOKENIZER_TEXT_PAIR_TEST_DATA = [
    {
        'text': 'a',
        'text_pair': 'b'
    },
    {
        'text': 'a b',
        'text_pair': 'c d e'
    },
    {
        'text': ['a b c', 'd'],
        'text_pair': ['e f', 'g h'],
    },
    {
        'text': ['a', 'b c', 'd e f'],
        'text_pair': ['g h i', 'j k', 'l'],
    }
]

CHAT_MESSAGES_EXAMPLES = {
    'basic': [
        {"role": "user", "content": "Hello, how are you?"},
        {"role": "assistant", "content": "I'm doing great. How can I help you today?"},
        {"role": "user", "content": "I'd like to show off how chat templating works!"},
    ],

    'system': [
        {"role": "system", "content": "You are a friendly chatbot who always responds in the style of a pirate"},
        {"role": "user", "content": "How many helicopters can a human eat in one sitting?"},
    ],

    'system + assistant': [
        {"role": "system", "content": "You are a friendly chatbot who always responds in the style of a pirate"},
        {"role": "user", "content": "Hello, how are you?"},
        {"role": "assistant", "content": "I'm doing great. How can I help you today?"},
        {"role": "user", "content": "I'd like to show off how chat templating works!"},
    ],
}

TOKENIZERS_WITH_CHAT_TEMPLATES = {
    # https://huggingface.co/docs/transformers/main/en/chat_templating
    'Xenova/blenderbot-400M-distill': [
        'basic',
    ],

    'Xenova/mistral-tokenizer-v1': [
        'basic',
    ],

    'HuggingFaceH4/zephyr-7b-beta': [
        'system',
    ],

    'Xenova/llama-tokenizer': [
        'basic',
        'system',
        'system + assistant',
    ],
    'Xenova/llama2-tokenizer': [
        'basic',
        'system',
        'system + assistant',
    ],
    'Xenova/llama2-chat-tokenizer': [
        'basic',
        'system',
        'system + assistant',
    ],
}


FLATTENED_SUPPORTED_MODELS = [
    (model_type, [
        model for task_models in tasks.values() for model in task_models
    ]) for model_type, tasks in SUPPORTED_MODELS.items()
]


def generate_tokenizer_tests():

    tokenization_results = {}

    tokenizers_to_test = FLATTENED_SUPPORTED_MODELS + \
        list(ADDITIONAL_TOKENIZERS_TO_TEST.items())

    for model_type, tokenizer_names in tokenizers_to_test:
        if model_type in MODELS_TO_IGNORE:
            continue
        if model_type in MAX_TESTS:
            tokenizer_names = tokenizer_names[:MAX_TESTS[model_type]]

        custom_by_model_type_texts = TOKENIZER_TEST_DATA["custom_by_model_type"].get(
            model_type, [])

        print(f'Generating tests for {model_type}')
        for tokenizer_name in tokenizer_names:
            if tokenizer_name in TOKENIZERS_TO_IGNORE:
                continue

            print('  -', tokenizer_name)

            try:
                # Load tokenizer
                if model_type == 'llama':
                    # As of 17/12/2023, there are a few issues with the Llama tokenizers in transformers.
                    # (1) Encoding with fast tokenizer adds whitespace after special tokens:
                    #   - https://github.com/huggingface/transformers/issues/25881
                    #   - https://github.com/huggingface/transformers/issues/26318
                    #   - https://github.com/huggingface/transformers/issues/26455
                    #   - https://github.com/huggingface/transformers/issues/27544
                    # (2) Decoding with slow tokenizer adds whitespace after special tokens:
                    #   - https://github.com/huggingface/transformers/issues/25073
                    #
                    # So for now, we mix and match the tokenizers:
                    # i.e., use the fast tokenizer for encoding, and the slow tokenizer for decoding.
                    # TODO: remove when the above issues are fixed:
                    tokenizer = AutoTokenizer.from_pretrained(
                        tokenizer_name,
                        use_fast=False,
                    )
                    decoder_tokenizer = AutoTokenizer.from_pretrained(
                        tokenizer_name,
                        use_fast=True,
                    )

                else:
                    decoder_tokenizer = tokenizer = AutoTokenizer.from_pretrained(
                        tokenizer_name)

            except (KeyError, EnvironmentError):
                # If a KeyError/EnvironmentError is raised from the AutoTokenizer, it
                # means the model does not use a tokenizer (e.g., vision models)
                continue

            try:
                # Disable dropout, if the model allows it
                tokenizer.backend_tokenizer.model.dropout = 0
            except AttributeError:
                pass

            tokenizer_results = []

            for data in TOKENIZER_TEXT_PAIR_TEST_DATA:
                try:
                    output = tokenizer(**data).data
                except Exception:
                    # Ignore testing tokenizers which fail in the python library
                    continue
                tokenizer_results.append(dict(
                    input=data,
                    output=output,
                ))

            shared_texts = TOKENIZER_TEST_DATA["shared"]
            custom_texts = TOKENIZER_TEST_DATA["custom"].get(
                tokenizer_name, [])

            # Run tokenizer on test cases
            for text in shared_texts + custom_texts + custom_by_model_type_texts:
                try:
                    encoded = tokenizer(text).data
                except Exception:
                    # Ignore testing tokenizers which fail in the python library
                    continue

                decoded_with_special = decoder_tokenizer.decode(
                    encoded["input_ids"], skip_special_tokens=False)
                decoded_without_special = decoder_tokenizer.decode(
                    encoded["input_ids"], skip_special_tokens=True)

                tokenizer_results.append(dict(
                    input=text,
                    encoded=encoded,
                    decoded_with_special=decoded_with_special,
                    decoded_without_special=decoded_without_special,
                ))

            if tokenizer_results:
                tokenization_results[tokenizer_name] = tokenizer_results

    template_results = {}

    for tokenizer_id in TOKENIZERS_WITH_CHAT_TEMPLATES:
        print(f'Generating chat templates for {tokenizer_id}')
        tokenizer = AutoTokenizer.from_pretrained(
            tokenizer_id,

            # TODO: Remove once https://github.com/huggingface/transformers/pull/26678 is fixed
            use_fast='llama' not in tokenizer_id,
        )
        tokenizer_results = []
        for key in TOKENIZERS_WITH_CHAT_TEMPLATES[tokenizer_id]:
            messages = CHAT_MESSAGES_EXAMPLES[key]

            for add_generation_prompt, tokenize in product([True, False], [True, False]):
                tokenizer_results.append(dict(
                    messages=messages,
                    add_generation_prompt=add_generation_prompt,
                    tokenize=tokenize,
                    target=tokenizer.apply_chat_template(
                        messages,
                        add_generation_prompt=add_generation_prompt,
                        tokenize=tokenize,
                    ),
                ))

        template_results[tokenizer_id] = tokenizer_results

    return dict(
        tokenization=tokenization_results,
        templates=template_results,
    )


def generate_config_tests():
    results = {}
    for model_type, config_names in FLATTENED_SUPPORTED_MODELS:
        print(f'Generating tests for {model_type}')

        for config_name in config_names:
            print('  -', config_name)
            try:
                # Load config
                config = AutoConfig.from_pretrained(config_name)
            except Exception:
                # Something went wrong, skip this config
                continue
            results[config_name] = config.to_dict()

            # TODO: Remove after https://github.com/huggingface/transformers/issues/23876 fixed
            results[config_name].pop('torch_dtype', None)

    return results


ARRAY_SIZES = sorted(set([2 ** i for i in range(1, 10)])
                     | set([3 ** i for i in range(1, 8)])
                     | set([5 ** i for i in range(1, 6)])
                     | set([7 ** i for i in range(1, 4)]))


def serialize_complex_array(arr):
    return [float(x) for y in arr for x in [y.real, y.imag]]


def serialize_real_array(arr):
    return arr.tolist()


def generate_fft_tests():
    np.random.seed(0)
    tests = {}
    for complex in [False, True]:
        serialize_fn = serialize_complex_array if complex else serialize_real_array
        for size in ARRAY_SIZES:
            arr = np.random.randn(size).astype(
                np.complex64 if complex else np.float64)
            if complex:
                arr += np.random.randn(size) * 1j
            tests[f"fft_{size}_{'complex' if complex else 'real'}"] = {
                "complex": complex,
                "input": serialize_fn(arr),
                "output": serialize_complex_array(np.fft.fft(arr)),
            }
    return tests


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

    fft_tests = generate_fft_tests()
    with open(os.path.join(data_dir, "fft_tests.json"), "w", encoding="utf-8") as fp:
        json.dump(fft_tests, fp)


if __name__ == "__main__":
    main()
