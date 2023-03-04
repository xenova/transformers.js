
SUPPORTED_TASKS = {
    # map tasks to automodels
    'default': 'AutoModel',
    'masked-lm': 'AutoModelForMaskedLM',
    'sequence-classification': 'AutoModelForSequenceClassification',
    'multiple-choice': 'AutoModelForMultipleChoice',
    'token-classification': 'AutoModelForTokenClassification',
    'question-answering': 'AutoModelForQuestionAnswering',
}

SUPPORTED_MODELS = {
    'bert': {
        'bert-base-uncased': [
            'default',
            'masked-lm',
        ],
        'bert-base-cased': [
            'default',
            'masked-lm',
        ],
        'bert-base-multilingual-uncased': [
            'default',
            'masked-lm',
        ],
        'bert-base-multilingual-cased': [
            'default',
            'masked-lm',
        ],
        'nlptown/bert-base-multilingual-uncased-sentiment': [
            'sequence-classification',
        ],
        'sentence-transformers/all-MiniLM-L6-v2': [
            'default',
        ],
        'sentence-transformers/all-MiniLM-L12-v2': [
            'default',
        ],
    },
    'distilbert': {
        'distilbert-base-uncased': [
            'default',
            'masked-lm',
        ],
        'distilbert-base-cased': [
            'default',
            'masked-lm',
        ],
        'distilbert-base-uncased-distilled-squad': [
            'default',
            'question-answering'
        ],
        'distilbert-base-cased-distilled-squad': [
            'default',
            'question-answering'
        ],
        'distilbert-base-uncased-finetuned-sst-2-english': [
            'sequence-classification',
        ]
    },
    'gpt2': {
        'distilgpt2': [
            'default',
            'causal-lm-with-past',
            'sequence-classification',
            'token-classification',
        ]
    },
    't5': {
        't5-small': [
            'default',
            'seq2seq-lm-with-past',
        ],
        't5-base': [
            'default',
            'seq2seq-lm-with-past',
        ],
        'google/t5-v1_1-small': [
            'default',
            'seq2seq-lm-with-past',
        ],
        'google/t5-v1_1-base': [
            'default',
            'seq2seq-lm-with-past',
        ],
        'google/flan-t5-small': [
            'default',
            'seq2seq-lm-with-past',
        ],
        'google/flan-t5-base': [
            'default',
            'seq2seq-lm-with-past',
        ]
    },
    'bart': {
        'sshleifer/distilbart-cnn-6-6': [
            'seq2seq-lm-with-past'
        ]
    },
    'roberta': {
        'roberta-base': [
            'default',
            'masked-lm',
        ],
        'distilroberta-base': [
            'default',
            'masked-lm',
        ],
        'sentence-transformers/all-distilroberta-v1': [
            'default'
        ]
    }
}

SUPPORTED_MODELS_AND_TASKS = {
    'bert': [
        'default',
        'masked-lm',
        'sequence-classification',
        'multiple-choice',
        'token-classification',
        'question-answering'
    ],
    'distilbert': [
        'default',
        'masked-lm',
        'sequence-classification',
        'multiple-choice',
        'token-classification',
        'question-answering',
    ],
    't5': [
        'default',  # only encoder needed
        # 'default-with-past',
        # 'seq2seq-lm',
        'seq2seq-lm-with-past',
    ],
    'gpt2': [
        'default',
        # 'default-with-past',
        # 'causal-lm',
        'causal-lm-with-past',
        'sequence-classification',
        'token-classification',
    ],
    'bart': [
        'default',
        # 'default-with-past',
        # 'causal-lm',
        'causal-lm-with-past',
        # 'seq2seq-lm',
        'seq2seq-lm-with-past',
        'sequence-classification',
        'question-answering',
    ],
    'roberta': [
        'default',
        'masked-lm',
        # 'causal-lm',
        'sequence-classification',
        'multiple-choice',
        'token-classification',
        'question-answering',
    ]
}


def main():
    for model_type, model_ids in SUPPORTED_MODELS.items():
        for model_id, tasks in model_ids.items():
            for task in tasks:
                print(
                    f'python ./scripts/convert.py --model_id {model_id} --from_hub --quantize --task {task}')
        print()


if __name__ == '__main__':
    main()
