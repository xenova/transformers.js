
def generate_tokenizer_json(tokenizer):

    tokenizer_json = {
        "version": "1.0",
        "truncation": None,
        "padding": None,
        "added_tokens": [
            {
                "id": v,
                "content": k,
                "single_word": False,
                "lstrip": False,
                "rstrip": False,
                "normalized": False,
                "special": True
            }
            for k, v in tokenizer.vocab.items()
            if k.startswith('<') and k.endswith('>')
        ],
        "normalizer": {
            "type": "Replace",
            "pattern": {
                "String": " "
            },
            "content": "|"
        },
        "pre_tokenizer": {
            "type": "Split",
            "pattern": {
                "Regex": ""
            },
            "behavior": "Isolated",
            "invert": False
        },
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
