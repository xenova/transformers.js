# from .extra.marian import SUPPORTED_HELSINKI_NLP_MODELS

SUPPORTED_MODELS = {
    'albert': [
        'albert-base-v2',
        'albert-large-v2',
        'sentence-transformers/paraphrase-albert-small-v2',
        'sentence-transformers/paraphrase-albert-base-v2',
    ],

    'bart': [
        'sshleifer/distilbart-cnn-6-6',
        'facebook/bart-large-cnn',
        'facebook/bart-large-mnli',
    ],
    'bert': [
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

        'allenai/scibert_scivocab_uncased',
        'ProsusAI/finbert',
        'emilyalsentzer/Bio_ClinicalBERT',
        'SpanBERT/spanbert-large-cased',
        'SpanBERT/spanbert-base-cased',

        'deepset/sentence_bert',

        'cambridgeltl/SapBERT-from-PubMedBERT-fulltext',
        'indobenchmark/indobert-base-p1',
        'GanjinZero/UMLSBert_ENG',
        'DeepPavlov/rubert-base-cased',
        'monologg/kobert',

        'intfloat/e5-small',
        'intfloat/e5-small-v2',
        'intfloat/e5-base',
        'intfloat/e5-base-v2',
        'intfloat/e5-large',
        'intfloat/e5-large-v2',
        'intfloat/multilingual-e5-base',

        'thenlper/gte-small',
        'thenlper/gte-base',
        'thenlper/gte-large',

        'unitary/toxic-bert',
    ],
    # TODO:
    # 'bloom':[
    #     'bigscience/bloom-560m',
    #     'bigscience/bloomz-560m',
    # ],
    # TODO:
    # 'blenderbot-small': [
    #     'facebook/blenderbot_small-90M',
    # ],
    'clip': [
        'openai/clip-vit-base-patch16',
        'openai/clip-vit-base-patch32',
    ],
    'codegen': [
        'Salesforce/codegen-350M-mono',
        'Salesforce/codegen-350M-multi',
        'Salesforce/codegen-350M-nl',
    ],
    'deberta': [
        'cross-encoder/nli-deberta-base',
        'Narsil/deberta-large-mnli-zero-cls',
    ],
    'deberta-v2': [
        'cross-encoder/nli-deberta-v3-xsmall',
        'cross-encoder/nli-deberta-v3-small',
        'cross-encoder/nli-deberta-v3-base',
        'cross-encoder/nli-deberta-v3-large',
        'MoritzLaurer/DeBERTa-v3-xsmall-mnli-fever-anli-ling-binary',
        'MoritzLaurer/DeBERTa-v3-base-mnli',
        'MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli',
        'MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli',
        'MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7',
        'navteca/nli-deberta-v3-xsmall',
        'sileod/deberta-v3-base-tasksource-nli',
        'sileod/deberta-v3-large-tasksource-nli',
    ],
    'detr': [
        'facebook/detr-resnet-50',
        'facebook/detr-resnet-101',
        'facebook/detr-resnet-50-panoptic',
    ],
    'distilbert': [
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
    ],
    'gpt-neo': [
        'EleutherAI/gpt-neo-125M',
        'MBZUAI/LaMini-Neo-125M',
    ],
    'gpt2': [
        'gpt2',
        'distilgpt2',
        'MBZUAI/LaMini-Cerebras-256M',
        'MBZUAI/LaMini-Cerebras-590M',
        'MBZUAI/LaMini-GPT-124M',
    ],
    'gpt_bigcode': [
        # See branch: https://github.com/huggingface/optimum/tree/xenova-bigcode-testing
        'bigcode/tiny_starcoder_py',
        # 'bigcode/starcoderbase-1b', # NOTE: This model is gated, so we ignore it when testing
    ],
    'm2m_100': [
        'facebook/nllb-200-distilled-600M',
        'facebook/m2m100_418M',
    ],
    # TODO:
    # 'marian': [
    #     f'Helsinki-NLP/opus-mt-{x}'
    #     for x in SUPPORTED_HELSINKI_NLP_MODELS
    # ],
    'mobilebert': [
        'typeform/mobilebert-uncased-mnli',

        # TODO:
        # https://github.com/huggingface/optimum/issues/1027
        # 'google/mobilebert-uncased',
    ],
    'mobilevit': [
        'apple/mobilevit-small',
        'apple/mobilevit-x-small',
        'apple/mobilevit-xx-small',

        'apple/deeplabv3-mobilevit-small',
        'apple/deeplabv3-mobilevit-x-small',
        'apple/deeplabv3-mobilevit-xx-small',
    ],
    'mpnet': [
        'sentence-transformers/all-mpnet-base-v2',
        'sentence-transformers/nli-mpnet-base-v2',
        'sentence-transformers/paraphrase-mpnet-base-v2',
        'sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
        'sentence-transformers/multi-qa-mpnet-base-cos-v1',
        'sentence-transformers/multi-qa-mpnet-base-dot-v1',
    ],
    'mt5': [
        'google/mt5-small',
        'google/mt5-base',
    ],
    'roberta': [
        'xlm-roberta-base',
        'roberta-base',
        'distilroberta-base',
        'roberta-large-mnli',

        'sentence-transformers/all-distilroberta-v1',
        'sentence-transformers/all-roberta-large-v1',
        'julien-c/EsperBERTo-small-pos',
    ],
    'sam': [
        'facebook/sam-vit-base',
        'facebook/sam-vit-large',
        'facebook/sam-vit-huge',
    ],
    'squeezebert': [
        'squeezebert/squeezebert-uncased',
        'squeezebert/squeezebert-mnli',
    ],
    't5': [
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

        'sentence-transformers/sentence-t5-large',
        'hkunlp/instructor-base',
        'hkunlp/instructor-large',
        # 'hkunlp/instructor-xl', # TODO
    ],
    'vision-encoder-decoder': [
        'nlpconnect/vit-gpt2-image-captioning',
    ],
    'vit': [
        'google/vit-base-patch16-224-in21k',
        'google/vit-base-patch16-224',
        'facebook/dino-vitb16',
        'facebook/dino-vits8',
        'facebook/dino-vitb8',
        'facebook/dino-vits16',
    ],
    'wav2vec2': [
        # feature extraction # NOTE: requires --task feature-extraction
        'facebook/mms-300m',
        'facebook/mms-1b',

        # audio classification
        'alefiury/wav2vec2-large-xlsr-53-gender-recognition-librispeech',
        'superb/wav2vec2-base-superb-ks',
        'facebook/mms-lid-126',
        'facebook/mms-lid-256',
        'facebook/mms-lid-512',
        'facebook/mms-lid-1024',
        'facebook/mms-lid-2048',
        'facebook/mms-lid-4017',

        # speech recognition
        'jonatasgrosman/wav2vec2-large-xlsr-53-english',
        'facebook/wav2vec2-base-960h',
        'facebook/mms-1b-l1107',
        'facebook/mms-1b-all',
        'facebook/mms-1b-fl102',
    ],
    'whisper': [
        'openai/whisper-tiny',
        'openai/whisper-tiny.en',
        'openai/whisper-base',
        'openai/whisper-base.en',
        'openai/whisper-small',
        'openai/whisper-small.en',
        'openai/whisper-medium',
        'openai/whisper-medium.en',
        'openai/whisper-large',
        'openai/whisper-large-v2',
    ],
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
