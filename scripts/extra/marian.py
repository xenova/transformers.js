import json
from transformers.utils import cached_file

# NOTE: In total, there are 1440 models available on the HuggingFace hub (https://huggingface.co/Helsinki-NLP).
# We have converted some of these (listed below). If you don't see your model here, feel free to convert it yourself
# and make a pull request to this repo.

SUPPORTED_HELSINKI_NLP_MODELS = [
    'en-es', 'es-en',            # English <-> Spanish
    'en-fr', 'fr-en',            # English <-> French
    'en-hi', 'hi-en',            # English <-> Hindi
    'en-de', 'de-en',            # English <-> German
    'en-ru', 'ru-en',            # English <-> Russian
    'en-it', 'it-en',            # English <-> Italian
    'en-ar', 'ar-en',            # English <-> Arabic
    'en-zh', 'zh-en',            # English <-> Chinese
    'en-sv', 'sv-en',            # English <-> Swedish
    'en-mul', 'mul-en',          # English <-> Multilingual
    'en-nl', 'nl-en',            # English <-> Dutch
    'en-fi', 'fi-en',            # English <-> Finnish
    'en-jap', 'jap-en',          # English <-> Japanese
    'en-cs', 'cs-en',            # English <-> Czech
    'en-vi', 'vi-en',            # English <-> Vietnamese
    'en-xh', 'xh-en',            # English <-> Xhosa
    'en-hu', 'hu-en',            # English <-> Hungarian
    'en-da', 'da-en',            # English <-> Danish
    'en-id', 'id-en',            # English <-> Indonesia
    'en-uk', 'uk-en',            # English <-> Ukranian
    'en-af', 'af-en',            # English <-> Afrikaans
    'en-ROMANCE', 'ROMANCE-en',  # English <-> ROMANCE
    'de-es', 'es-de',            # German <-> Spanish
    'fr-es', 'es-fr',            # French <-> Spanish
    'fr-de', 'de-fr',            # French <-> German
    'es-it', 'it-es',            # Spanish <-> Italian
    'es-ru', 'ru-es',            # Spanish <-> Russian
    'fr-ru', 'ru-fr',            # French <-> Russian
    'fr-ro', 'ro-fr',            # French <-> Romanian
    'uk-ru', 'ru-uk',            # Ukranian <-> Russian

    'it-fr',                     # Italian --> French
    'en-ro',                     # English --> Romanian
    'pl-en',                     # Poland --> English
    'tr-en',                     # Turkey --> English
    'ko-en',                     # Korean --> English
    'bat-en',                    # Baltic --> English
    'et-en',                     # Estonian --> English
    'fi-de',                     # Finnish --> German
    'gem-gem',                   # Germanic <-> Germanic
    'gmw-gmw',                   # West Germanic <-> West Germanic
    'da-de',                     # Danish <-> German
    'ja-en',                     # Japanese --> English
    'nl-fr',                     # Netherlands --> French
    'no-de',                     # Norwegian --> German
    'tc-big-tr-en',              # Turkish --> English
    'th-en',                     # Thai --> English
    'en-cs',                     # English --> Czech
]


def generate_tokenizer_json(model_path, tokenizer):
    # Marian models use two separate tokenizers for source and target languages.
    # So, we merge them into a single tokenizer.

    vocab_file = cached_file(model_path, 'vocab.json')
    with open(vocab_file) as fp:
        vocab = json.load(fp)

    added_tokens = [
        dict(
            id=vocab.get(x),
            special=True,
            content=x,
            single_word=False,
            lstrip=False,
            rstrip=False,
            normalized=False
        )
        for x in tokenizer.all_special_tokens
    ]

    tokenizer_json = {
        'version': '1.0',
        'truncation': None,
        'padding': None,
        'added_tokens': added_tokens,
        'normalizer': {
            'type': 'Precompiled',
            'precompiled_charsmap': None  # TODO add this
        },
        'pre_tokenizer': {
            'type': 'Sequence',
            'pretokenizers': [
                {
                    'type': 'WhitespaceSplit'
                },
                {
                    'type': 'Metaspace',
                    'replacement': '\u2581',
                    'add_prefix_space': True
                }
            ]
        },
        'post_processor': {
            'type': 'TemplateProcessing', 'single': [
                {'Sequence': {'id': 'A', 'type_id': 0}},
                {'SpecialToken': {'id': tokenizer.eos_token, 'type_id': 0}}
            ],
            'pair': [
                {'Sequence': {'id': 'A', 'type_id': 0}},
                {'SpecialToken': {'id': tokenizer.eos_token, 'type_id': 0}},
                {'Sequence': {'id': 'B', 'type_id': 0}},
                {'SpecialToken': {'id': tokenizer.eos_token, 'type_id': 0}}
            ],
            'special_tokens': {
                tokenizer.eos_token: {
                    'id': tokenizer.eos_token,
                    'ids': [tokenizer.eos_token_id],
                    'tokens': [tokenizer.eos_token]
                }
            }
        },
        'decoder': {
            'type': 'Metaspace',
            'replacement': '\u2581',
            'add_prefix_space': True
        },
        'model': {
            'type': 'Unigram',
            'unk_id': 2,
        }
    }

    # NOTE: Must have sentencepiece installed
    spm_source = tokenizer.spm_source
    spm_target = tokenizer.spm_target

    src_vocab_dict = {
        spm_source.IdToPiece(i): spm_source.GetScore(i)
        for i in range(spm_source.GetPieceSize())
    }
    tgt_vocab_dict = {
        spm_target.IdToPiece(i): spm_target.GetScore(i)
        for i in range(spm_target.GetPieceSize())
    }

    tokenizer_json['model']['vocab'] = [
        [
            k,
            0.0 if k in tokenizer.all_special_tokens else max(
                src_vocab_dict.get(k, -100), tgt_vocab_dict.get(k, -100))
        ]
        for k in vocab
    ]

    return tokenizer_json
