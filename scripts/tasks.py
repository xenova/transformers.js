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
    'image-segmentation': 'AutoModelForImageSegmentation',
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
        'albert-base-v2',
        'albert-large-v2',
        'sentence-transformers/paraphrase-albert-small-v2',
        'sentence-transformers/paraphrase-albert-base-v2',
    },

    'bart': {
        'sshleifer/distilbart-cnn-6-6',
        'facebook/bart-large-cnn',
        'facebook/bart-large-mnli',
    },
    'bert': {
        'bert-base-uncased',
        'bert-base-cased',
        'bert-base-multilingual-uncased',
        'bert-base-multilingual-cased',
        'nlptown/bert-base-multilingual-uncased-sentiment',
        'Davlan/bert-base-multilingual-cased-ner-hrl',

        'sentence-transformers/all-MiniLM-L6-v2',
        'sentence-transformers/all-MiniLM-L12-v2',
        'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
        'sentence-transformers/paraphrase-MiniLM-L6-v2',
        'sentence-transformers/paraphrase-MiniLM-L3-v2',
        'sentence-transformers/bert-base-nli-mean-tokens',
        'sentence-transformers/multi-qa-MiniLM-L6-cos-v1',
        'sentence-transformers/multi-qa-distilbert-cos-v1',
        'sentence-transformers/xlm-r-100langs-bert-base-nli-stsb-mean-tokens',
        # 'sentence-transformers/LaBSE', TODO

        'ckiplab/bert-base-chinese-ner',
        'ckiplab/bert-base-chinese-ws',
        'ckiplab/bert-base-chinese-pos',
        'dslim/bert-base-NER',
        'dslim/bert-base-NER-uncased',
    },
    # TODO:
    # 'blenderbot-small': {
    #     'facebook/blenderbot_small-90M',
    # },
    'clip': {
        'openai/clip-vit-base-patch16',
        'openai/clip-vit-base-patch32',
    },
    'codegen': {
        'Salesforce/codegen-350M-mono',
        'Salesforce/codegen-350M-multi',
        'Salesforce/codegen-350M-nl',
    },
    'detr': {
        'facebook/detr-resnet-50',
        'facebook/detr-resnet-101',
        'facebook/detr-resnet-50-panoptic',
    },
    'distilbert': {
        'distilbert-base-uncased',
        'distilbert-base-cased',
        'distilbert-base-uncased-distilled-squad',
        'distilbert-base-cased-distilled-squad',
        'distilbert-base-uncased-finetuned-sst-2-english',
        'typeform/distilbert-base-uncased-mnli',
        'Davlan/distilbert-base-multilingual-cased-ner-hrl',

        'sentence-transformers/distiluse-base-multilingual-cased-v1',
        'sentence-transformers/distiluse-base-multilingual-cased-v2',
        'sentence-transformers/distilbert-base-nli-mean-tokens',
        'sentence-transformers/distilbert-base-nli-stsb-mean-tokens',
        'sentence-transformers/msmarco-distilbert-base-v4',
    },
    'gpt-neo': {
        'EleutherAI/gpt-neo-125M',
        'MBZUAI/LaMini-Neo-125M',
    },
    'gpt2': {
        'gpt2',
        'distilgpt2',
        'MBZUAI/LaMini-Cerebras-256M',
        'MBZUAI/LaMini-Cerebras-590M',
    },
    # TODO:
    # 'marian': {
    #     f'Helsinki-NLP/opus-mt-{x}'
    #     for x in SUPPORTED_HELSINKI_NLP_MODELS
    # },
    'mobilebert': {
        'typeform/mobilebert-uncased-mnli',

        # TODO:
        # https://github.com/huggingface/optimum/issues/1027
        # 'google/mobilebert-uncased',
    },
    'mpnet': {
        'sentence-transformers/all-mpnet-base-v2',
        'sentence-transformers/nli-mpnet-base-v2',
        'sentence-transformers/paraphrase-mpnet-base-v2',
        'sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
        'sentence-transformers/multi-qa-mpnet-base-cos-v1',
        'sentence-transformers/multi-qa-mpnet-base-dot-v1',
    },
    'mt5': {
        'google/mt5-small',
        'google/mt5-base',
    },
    'roberta': {
        'xlm-roberta-base',
        'roberta-base',
        'distilroberta-base',
        'roberta-large-mnli',

        'sentence-transformers/all-distilroberta-v1',
        'sentence-transformers/all-roberta-large-v1',
    },
    'sam': {
        'facebook/sam-vit-base',
        'facebook/sam-vit-large',
        'facebook/sam-vit-huge',
    },
    'squeezebert': {
        'squeezebert/squeezebert-uncased',
        'squeezebert/squeezebert-mnli',
    },
    't5': {
        't5-small',
        't5-base',
        'google/t5-v1_1-small',
        'google/t5-v1_1-base',
        'google/flan-t5-small',
        'google/flan-t5-base',

        'MBZUAI/LaMini-Flan-T5-77M',
        'MBZUAI/LaMini-Flan-T5-248M',
        'MBZUAI/LaMini-Flan-T5-783M',

        'MBZUAI/LaMini-T5-61M',
        'MBZUAI/LaMini-T5-223M',
        'MBZUAI/LaMini-T5-738M',
    },
    'vision-encoder-decoder': {
        'nlpconnect/vit-gpt2-image-captioning',
    },
    'vit': {
        'google/vit-base-patch16-224-in21k',
        'google/vit-base-patch16-224',
    },
    'whisper': {
        'openai/whisper-tiny',
        'openai/whisper-tiny.en',
        'openai/whisper-base',
        'openai/whisper-base.en',
        'openai/whisper-small',
        'openai/whisper-small.en',
    },
}


def main():
    for model_type, model_ids in SUPPORTED_MODELS.items():
        print(f'# {model_type:=^80}')
        for model_id in model_ids:
            print(
                f'python -m scripts.convert --quantize --model_id {model_id}')
        print()


if __name__ == '__main__':
    main()
