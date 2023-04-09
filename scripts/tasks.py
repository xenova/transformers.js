from .extra.marian import SUPPORTED_HELSINKI_NLP_MODELS

SUPPORTED_TASKS = {
    # map tasks to automodels
    'default': 'AutoModel',
    'masked-lm': 'AutoModelForMaskedLM',
    'causal-lm': 'AutoModelForCausalLM',
    'seq2seq-lm': 'AutoModelForSeq2SeqLM',
    'sequence-classification': 'AutoModelForSequenceClassification',
    'token-classification': 'AutoModelForTokenClassification',
    # 'multiple-choice': 'AutoModelForMultipleChoice',
    'object-detection': 'AutoModelForObjectDetection',
    'question-answering': 'AutoModelForQuestionAnswering',
    'image-classification': 'AutoModelForImageClassification',
    # 'image-segmentation': 'AutoModelForImageSegmentation',
    # 'masked-im': 'AutoModelForMaskedImageModeling',
    # 'semantic-segmentation': 'AutoModelForSemanticSegmentation',
    'speech2seq-lm': 'AutoModelForSpeechSeq2Seq',
    # 'audio-classification': 'AutoModelForAudioClassification',
    # 'audio-frame-classification': 'AutoModelForAudioFrameClassification',
    # 'audio-ctc': 'AutoModelForCTC',
    # 'audio-xvector': 'AutoModelForAudioXVector',
    'vision2seq-lm': 'AutoModelForVision2Seq',
    # 'stable-diffusion': 'StableDiffusionPipeline',
    'zero-shot-image-classification': 'AutoModelForZeroShotImageClassification',
    'zero-shot-object-detection': 'AutoModelForZeroShotObjectDetection',
}

SUPPORTED_MODELS = {
    'albert': {
        'albert-base-v2': [
            'default',
            'masked-lm',
        ],
        'albert-large-v2': [
            'default',
            'masked-lm',
        ],
        'sentence-transformers/paraphrase-albert-small-v2': [
            'default',
        ],
        'sentence-transformers/paraphrase-albert-base-v2': [
            'default',
        ],
    },
    'bart': {
        'sshleifer/distilbart-cnn-6-6': [
            'seq2seq-lm-with-past'
        ],
        'facebook/bart-large-cnn': [
            'seq2seq-lm-with-past'
        ],
        'facebook/bart-large-mnli': [
            'default',
            'sequence-classification',
        ],
    },
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


        'Davlan/bert-base-multilingual-cased-ner-hrl': [
            # 'default',
            'token-classification',
        ],
        'ckiplab/bert-base-chinese-ner': [
            # 'default',
            'token-classification',
        ],
        'ckiplab/bert-base-chinese-ws': [
            # 'default',
            'token-classification',
        ],
        'ckiplab/bert-base-chinese-pos': [
            # 'default',
            'token-classification',
        ],
        'dslim/bert-base-NER': [
            # 'default',
            'token-classification',
        ],
        'dslim/bert-base-NER-uncased': [
            # 'default',
            'token-classification',
        ],
    },
    'blenderbot-small': {
        'facebook/blenderbot_small-90M': [
            'default',
            'causal-lm-with-past',
            'seq2seq-lm-with-past',
        ]
    },
    'clip': {
        'openai/clip-vit-base-patch16': [
            'default'
        ],
        'openai/clip-vit-base-patch32': [
            'default'
        ],
    },
    'codegen': {
        'Salesforce/codegen-350M-mono': [
            'default',
            'causal-lm-with-past',
        ],
        'Salesforce/codegen-350M-multi': [
            'default',
            'causal-lm-with-past',
        ],
        'Salesforce/codegen-350M-nl': [
            'default',
            'causal-lm-with-past',
        ],
    },
    'detr': {
        'facebook/detr-resnet-50': [
            'default',
            'object-detection',
            # 'image-segmentation',
        ],
        'facebook/detr-resnet-101': [
            'default',
            'object-detection',
            # 'image-segmentation',
        ],

        'facebook/detr-resnet-50-panoptic': [
            'image-segmentation',
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
        ],
        'typeform/distilbert-base-uncased-mnli': [
            'default',
            'sequence-classification',
        ],

        'Davlan/distilbert-base-multilingual-cased-ner-hrl': [
            # 'default',
            'token-classification',
        ],
    },
    'gpt-neo': {
        'EleutherAI/gpt-neo-125M': [
            'default',
            'causal-lm-with-past',
        ],
    },
    'gpt2': {
        'gpt2': [
            'default',
            'causal-lm-with-past',
        ],
        'distilgpt2': [
            'default',
            'causal-lm-with-past',
            'sequence-classification',
            'token-classification',
        ]
    },
    'marian': {
        f'Helsinki-NLP/opus-mt-{x}': [
            'default',
            'seq2seq-lm-with-past',
        ]
        for x in SUPPORTED_HELSINKI_NLP_MODELS
    },
    'mobilebert': {
        'google/mobilebert-uncased': [
            'default',
            'masked-lm',
        ],
        'typeform/mobilebert-uncased-mnli': [
            'default',
            'sequence-classification',
        ],
    },
    'mt5': {
        'google/mt5-small': [
            'default',
            # 'seq2seq-lm-with-past',
        ]
    },
    'roberta': {
        'xlm-roberta-base': [
            'default',
            'masked-lm',
        ], 'roberta-base': [
            'default',
            'masked-lm',
        ],
        'distilroberta-base': [
            'default',
            'masked-lm',
        ],
        'sentence-transformers/all-distilroberta-v1': [
            'default'
        ],
        'roberta-large-mnli': [
            'default',
            'sequence-classification',
        ]
    },
    'squeezebert': {
        'squeezebert/squeezebert-uncased': [
            'default',
            'masked-lm',
        ],
        'squeezebert/squeezebert-mnli': [
            'default',
            'sequence-classification',
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
    'vision-encoder-decoder': {
        'nlpconnect/vit-gpt2-image-captioning': [
            # 'vision2seq-lm',
            'vision2seq-lm-with-past',
        ]
    },
    'vit': {
        'google/vit-base-patch16-224-in21k': [
            'default'
        ],
        'google/vit-base-patch16-224': [
            'default',
            'image-classification'
        ]
    },
    'whisper': {
        'openai/whisper-tiny': [
            'default',
            'speech2seq-lm-with-past'
        ],
        'openai/whisper-tiny.en': [
            'default',
            'speech2seq-lm-with-past'
        ],
        'openai/whisper-base': [
            'default',
            'speech2seq-lm-with-past'
        ],
        'openai/whisper-base.en': [
            'default',
            'speech2seq-lm-with-past'
        ],
        'openai/whisper-small': [
            'default',
            'speech2seq-lm-with-past'
        ],
        'openai/whisper-small.en': [
            'default',
            'speech2seq-lm-with-past'
        ],
    },
}


def main():
    for model_type, model_ids in SUPPORTED_MODELS.items():
        print(f'# {model_type:=^80}')
        for model_id, tasks in model_ids.items():
            for task in tasks:
                print(
                    f'python -m scripts.convert --model_id {model_id} --from_hub --quantize --task {task}')
        print()


if __name__ == '__main__':
    main()
