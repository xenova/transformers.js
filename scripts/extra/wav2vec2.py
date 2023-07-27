import json
from transformers.utils import cached_file


def generate_tokenizer_json(model_path):

    vocab_file = cached_file(model_path, 'vocab.json')
    with open(vocab_file) as fp:
        vocab = json.load(fp)

    tokenizer_json = {
        "version": "1.0",
        "truncation": None,
        "padding": None,
        "added_tokens": [],
        "normalizer": None,
        "pre_tokenizer": None,
        "post_processor": None,
        "decoder": {
            "type": "CTC",
            "pad_token": "<pad>",
            "word_delimiter_token": "|",
            "cleanup": True
        },
        "model": {
            "vocab": vocab
        }
    }

    return tokenizer_json
