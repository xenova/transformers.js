
def generate_tokenizer_json(tokenizer):

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
            "vocab": tokenizer.vocab
        }
    }

    return tokenizer_json
