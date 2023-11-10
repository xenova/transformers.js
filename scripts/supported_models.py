from .extra.marian import SUPPORTED_HELSINKI_NLP_MODELS


SUPPORTED_MODELS = {
    # NOTE: keys of `SUPPORTED_MODELS` are subsets of https://github.com/huggingface/optimum/blob/7f8e606689365931300ef5e6d3b20cb88771cb08/optimum/exporters/tasks.py#L281-L965
    'albert': [
        # Masked language modelling
        'albert-base-v2',
        'albert-large-v2',

        # Feature extraction
        'sentence-transformers/paraphrase-albert-small-v2',
        'sentence-transformers/paraphrase-albert-base-v2',
    ],
    'bart': [
        # Summarization
        'sshleifer/distilbart-xsum-12-1',
        'sshleifer/distilbart-xsum-6-6',
        'sshleifer/distilbart-xsum-12-3',
        'sshleifer/distilbart-xsum-9-6',
        'sshleifer/distilbart-xsum-12-6',
        'sshleifer/distilbart-cnn-12-3',
        'sshleifer/distilbart-cnn-12-6',
        'sshleifer/distilbart-cnn-6-6',
        'facebook/bart-large-cnn',
        'facebook/bart-large-xsum',

        # Zero-shot classification
        'facebook/bart-large-mnli',
    ],
    'beit': [
        # Image classification
        'microsoft/beit-base-patch16-224',
        'microsoft/beit-base-patch16-224-pt22k',
        'microsoft/beit-base-patch16-384',
        'microsoft/beit-base-patch16-224-pt22k-ft22k',
        'microsoft/beit-large-patch16-224',
        'microsoft/beit-large-patch16-224-pt22k',
        'microsoft/beit-large-patch16-512',
        'microsoft/beit-large-patch16-224-pt22k-ft22k',
        'microsoft/beit-large-patch16-384',
        'microsoft/dit-base-finetuned-rvlcdip',
        'microsoft/dit-large-finetuned-rvlcdip',
    ],
    'bert': [
        # Feature extraction
        'sentence-transformers/all-MiniLM-L6-v2',
        'sentence-transformers/all-MiniLM-L12-v2',
        'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
        'sentence-transformers/paraphrase-MiniLM-L6-v2',
        'sentence-transformers/paraphrase-MiniLM-L3-v2',
        'sentence-transformers/bert-base-nli-mean-tokens',
        'sentence-transformers/multi-qa-MiniLM-L6-cos-v1',
        'sentence-transformers/xlm-r-100langs-bert-base-nli-stsb-mean-tokens',
        'sentence-transformers/LaBSE',
        'deepset/sentence_bert',
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
        'BAAI/bge-small-en',
        'BAAI/bge-base-en',
        'BAAI/bge-large-en',
        'allenai/scibert_scivocab_uncased',
        'SpanBERT/spanbert-large-cased',
        'SpanBERT/spanbert-base-cased',
        'cambridgeltl/SapBERT-from-PubMedBERT-fulltext',
        'indobenchmark/indobert-base-p1',
        'GanjinZero/UMLSBert_ENG',
        'DeepPavlov/rubert-base-cased',
        'monologg/kobert',

        # Text classification
        'nlptown/bert-base-multilingual-uncased-sentiment',
        'ProsusAI/finbert',
        'unitary/toxic-bert',

        # Token classification
        'Davlan/bert-base-multilingual-cased-ner-hrl',
        'ckiplab/bert-base-chinese-ner',
        'ckiplab/bert-base-chinese-ws',
        'ckiplab/bert-base-chinese-pos',
        'dslim/bert-base-NER',
        'dslim/bert-base-NER-uncased',

        # Masked language modelling
        'bert-base-uncased',
        'bert-base-cased',
        'bert-base-multilingual-uncased',
        'bert-base-multilingual-cased',
        'bert-base-chinese',
        'emilyalsentzer/Bio_ClinicalBERT',
    ],
    'blenderbot': [
        # Text2text generation (TODO add conversational)
        'facebook/blenderbot-400M-distill',
        # 'facebook/blenderbot-1B-distill',
    ],
    'blenderbot-small': [
        # Text2text generation (TODO add conversational)
        # 'facebook/blenderbot-90M',  # DEPRECATED
        'facebook/blenderbot_small-90M',
    ],
    'bloom': [
        # Text generation
        'bigscience/bloom-560m',
        'bigscience/bloomz-560m',
    ],
    'camembert': [
        # Feature extraction
        'dangvantuan/sentence-camembert-large',

        # Token classification
        'Jean-Baptiste/camembert-ner',
        'Jean-Baptiste/camembert-ner-with-dates',
        'pythainlp/thainer-corpus-v2-base-model',
        'gilf/french-camembert-postag-model',

        # Masked language modelling
        'camembert-base',
        'airesearch/wangchanberta-base-att-spm-uncased',
    ],
    'clip': [
        # Zero-shot image classification and feature extraction
        # (with and without `--split_modalities`)
        'openai/clip-vit-base-patch16',
        'openai/clip-vit-base-patch32',
        'openai/clip-vit-large-patch14',
        'openai/clip-vit-large-patch14-336',
    ],
    'codegen': [
        # Text generation
        'Salesforce/codegen-350M-mono',
        'Salesforce/codegen-350M-multi',
        'Salesforce/codegen-350M-nl',
    ],
    'deberta': [
        # Zero-shot classification
        'cross-encoder/nli-deberta-base',
        'Narsil/deberta-large-mnli-zero-cls',
    ],
    'deberta-v2': [
        # Zero-shot classification
        'cross-encoder/nli-deberta-v3-xsmall',
        'cross-encoder/nli-deberta-v3-small',
        'cross-encoder/nli-deberta-v3-base',
        'cross-encoder/nli-deberta-v3-large',
        'MoritzLaurer/DeBERTa-v3-xsmall-mnli-fever-anli-ling-binary',
        'MoritzLaurer/DeBERTa-v3-base-mnli',
        'MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli',
        'MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli',
        'MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7',
        'sileod/deberta-v3-base-tasksource-nli',
        'sileod/deberta-v3-large-tasksource-nli',
    ],
    'deit': [
        # Image classification
        'facebook/deit-tiny-distilled-patch16-224',
        'facebook/deit-small-distilled-patch16-224',
        'facebook/deit-base-distilled-patch16-224',
        'facebook/deit-base-distilled-patch16-384',
    ],
    'detr': [
        # Object detection
        'facebook/detr-resnet-50',
        'facebook/detr-resnet-101',

        # Image segmentation
        'facebook/detr-resnet-50-panoptic',
    ],
    'distilbert': [
        # Feature extraction
        'sentence-transformers/multi-qa-distilbert-cos-v1',
        'sentence-transformers/distiluse-base-multilingual-cased-v1',
        'sentence-transformers/distiluse-base-multilingual-cased-v2',
        'sentence-transformers/distilbert-base-nli-mean-tokens',
        'sentence-transformers/distilbert-base-nli-stsb-mean-tokens',
        'sentence-transformers/msmarco-distilbert-base-v4',

        # Text classification
        'distilbert-base-uncased-finetuned-sst-2-english',

        # Question answering
        'distilbert-base-uncased-distilled-squad',
        'distilbert-base-cased-distilled-squad',

        # Zero-shot classification
        'typeform/distilbert-base-uncased-mnli',

        # Token classification
        'Davlan/distilbert-base-multilingual-cased-ner-hrl',

        # Masked language modelling
        'distilbert-base-uncased',
        'distilbert-base-cased',
    ],
    'donut': [  # NOTE: also a `vision-encoder-decoder`
        # Image-to-text
        'naver-clova-ix/donut-base-finetuned-cord-v2',
        'naver-clova-ix/donut-base-finetuned-zhtrainticket',

        # Document Question Answering
        'naver-clova-ix/donut-base-finetuned-docvqa',
    ],
    'falcon': [
        # Text generation
        'Rocketknight1/tiny-random-falcon-7b',
        'fxmarty/really-tiny-falcon-testing',
    ],
    'gpt_neo': [
        # Text generation
        'EleutherAI/gpt-neo-125M',
        'MBZUAI/LaMini-Neo-125M',
        # 'MBZUAI/LaMini-Neo-1.3B', # TODO add
        'iliemihai/gpt-neo-romanian-125m',
    ],
    'gpt_neox': [
        # Text generation
        'EleutherAI/pythia-14m',
        'EleutherAI/pythia-31m',
        'EleutherAI/pythia-70m',
        'EleutherAI/pythia-70m-deduped',
        'EleutherAI/pythia-160m',
        'EleutherAI/pythia-160m-deduped',
        'EleutherAI/pythia-410m',
        'EleutherAI/pythia-410m-deduped',
    ],
    'gpt2': [
        # Text generation
        'gpt2',
        'distilgpt2',
        'MBZUAI/LaMini-Cerebras-111M',
        'MBZUAI/LaMini-Cerebras-256M',
        'MBZUAI/LaMini-Cerebras-590M',
        # 'MBZUAI/LaMini-Cerebras-1.3B', # TODO add
        'MBZUAI/LaMini-GPT-124M',
        'MBZUAI/LaMini-GPT-774M',
        # 'MBZUAI/LaMini-GPT-1.5B', # TODO add
        'aisquared/dlite-v2-774m',
        'Locutusque/gpt2-large-conversational',
    ],
    'gpt_bigcode': [
        # Text generation
        'bigcode/tiny_starcoder_py',
        'abacaj/starcoderbase-1b-sft',
        # 'bigcode/starcoderbase-1b', # NOTE: This model is gated, so we ignore it when testing
    ],
    'gptj': [
        # Text generation
        'TabbyML/J-350M',
        'Milos/slovak-gpt-j-405M',
        'heegyu/kogpt-j-350m',
    ],
    'herbert': [
        # Feature extraction
        'allegro/herbert-base-cased',
        'allegro/herbert-large-cased',
    ],
    'llama': [
        # Text generation
        'Xenova/llama2.c-stories15M',
        'Xenova/llama2.c-stories42M',
        'Xenova/llama2.c-stories110M',
        'RajuKandasamy/tamillama_tiny_30m',
        'JackFram/llama-68m',
        'JackFram/llama-160m',
    ],
    'longt5': {
        # Text-to-text
        'text2text-generation': [
            'google/long-t5-local-base',
            'google/long-t5-tglobal-base',
            # 'google/long-t5-tglobal-xl', # too large
            # 'google/long-t5-tglobal-large', # too large
            # 'google/long-t5-local-large', # too large
        ],

        # Summarization
        'summarization': [
            'pszemraj/long-t5-tglobal-base-16384-book-summary',
        ],

        # Feature extraction
        'feature-extraction': [
            # NOTE: requires --task feature-extraction
            'voidful/long-t5-encodec-tglobal-base',
        ],
    },
    'm2m_100': [
        # Translation
        'facebook/nllb-200-distilled-600M',
        'facebook/m2m100_418M',
    ],
    'marian': [
        # Translation
        f'Helsinki-NLP/opus-mt-{x}'
        for x in SUPPORTED_HELSINKI_NLP_MODELS
    ],
    'mbart': [
        # Translation
        'facebook/mbart-large-50-many-to-many-mmt',
        'facebook/mbart-large-50-many-to-one-mmt',
        'facebook/mbart-large-50',
    ],
    'mistral': [
        # Text generation
        'echarlaix/tiny-random-mistral',
    ],
    'mobilebert': [
        # Zero-shot classification
        'typeform/mobilebert-uncased-mnli',

        # TODO:
        # https://github.com/huggingface/optimum/issues/1027
        # 'google/mobilebert-uncased',
    ],
    'mobilevit': [
        # Image classification
        'apple/mobilevit-small',
        'apple/mobilevit-x-small',
        'apple/mobilevit-xx-small',

        # TODO: Image segmentation
        # 'apple/deeplabv3-mobilevit-small',
        # 'apple/deeplabv3-mobilevit-x-small',
        # 'apple/deeplabv3-mobilevit-xx-small',
    ],
    'mpt': [
        # Text generation
        'efederici/ipt-350m',
    ],
    'mpnet': [
        # Feature extraction
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
    'opt': [
        # Text generation
        'facebook/opt-125m',
        'facebook/opt-350m',
        # (TODO conversational)
        'PygmalionAI/pygmalion-350m',
    ],
    'resnet': [
        # Image classification
        'microsoft/resnet-18',
        'microsoft/resnet-26',
        'microsoft/resnet-34',
        'microsoft/resnet-50',
        'microsoft/resnet-101',
        'microsoft/resnet-152',
    ],
    'roberta': [
        # Masked language modelling
        'roberta-base',
        'distilroberta-base',

        # Feature extraction
        'sentence-transformers/all-distilroberta-v1',
        'sentence-transformers/all-roberta-large-v1',

        # Text classification
        'roberta-large-mnli',

        # Token classification
        'julien-c/EsperBERTo-small-pos',
    ],
    # 'sam': [
    #     'facebook/sam-vit-base',
    #     'facebook/sam-vit-large',
    #     'facebook/sam-vit-huge',
    # ],
    'speecht5': [
        # Text-to-speech
        'microsoft/speecht5_tts',
    ],
    'squeezebert': [
        # Feature extraction
        'squeezebert/squeezebert-uncased',
        'squeezebert/squeezebert-mnli',
    ],
    'swin': [
        # Image classification
        'microsoft/swin-tiny-patch4-window7-224',
        'microsoft/swin-base-patch4-window7-224',
        'microsoft/swin-large-patch4-window12-384-in22k',
        'microsoft/swin-base-patch4-window7-224-in22k',
        'microsoft/swin-base-patch4-window12-384-in22k',
        'microsoft/swin-base-patch4-window12-384',
        'microsoft/swin-large-patch4-window7-224',
        'microsoft/swin-small-patch4-window7-224',
        'microsoft/swin-large-patch4-window7-224-in22k',
        'microsoft/swin-large-patch4-window12-384',
    ],
    'swin2sr': [
        # Image-to-image (Super-resolution)
        'caidas/swin2SR-classical-sr-x2-64',
        'caidas/swin2SR-realworld-sr-x4-64-bsrgan-psnr',
        'caidas/swin2SR-classical-sr-x4-64',
        'caidas/swin2SR-compressed-sr-x4-48',
        'caidas/swin2SR-lightweight-x2-64',

        # Feature extraction
        'hf-tiny-model-private/tiny-random-Swin2SRModel',
    ],
    't5': [
        # Text-to-text (Translation/Summarization)
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

        # Feature extraction
        'sentence-transformers/sentence-t5-large',
        'hkunlp/instructor-base',
        'hkunlp/instructor-large',
    ],
    'trocr': [  # NOTE: also a `vision-encoder-decoder`
        # Text-to-image
        'microsoft/trocr-small-printed',
        'microsoft/trocr-base-printed',
        'microsoft/trocr-small-handwritten',
        'microsoft/trocr-base-handwritten',
    ],
    'vision-encoder-decoder': [
        # Text-to-image
        'nlpconnect/vit-gpt2-image-captioning',
    ],
    'vit': [
        # Feature extraction
        'google/vit-base-patch16-224-in21k',
        'facebook/dino-vitb16',
        'facebook/dino-vits8',
        'facebook/dino-vitb8',
        'facebook/dino-vits16',

        # Image classification
        'google/vit-base-patch16-224',
    ],
    'wav2vec2': [
        # Feature extraction # NOTE: requires --task feature-extraction
        'facebook/mms-300m',
        'facebook/mms-1b',

        # Audio classification
        'alefiury/wav2vec2-large-xlsr-53-gender-recognition-librispeech',
        'superb/wav2vec2-base-superb-ks',
        'facebook/mms-lid-126',
        'facebook/mms-lid-256',
        'facebook/mms-lid-512',
        'facebook/mms-lid-1024',
        'facebook/mms-lid-2048',
        'facebook/mms-lid-4017',

        # Automatic speech recognition
        'jonatasgrosman/wav2vec2-large-xlsr-53-english',
        'facebook/wav2vec2-base-960h',
        'facebook/mms-1b-l1107',
        'facebook/mms-1b-all',
        'facebook/mms-1b-fl102',
    ],
    'wavlm': [
        # Feature extraction
        'microsoft/wavlm-base',
        'microsoft/wavlm-base-plus',
        'microsoft/wavlm-large',
    ],
    'whisper': [
        # Automatic speech recognition
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
        'NbAiLab/nb-whisper-tiny-beta',
        'NbAiLab/nb-whisper-base-beta',
        'NbAiLab/nb-whisper-small-beta',
        'NbAiLab/nb-whisper-medium-beta',
        'NbAiLab/nb-whisper-large-beta',
    ],
    'xlm': [
        'xlm-clm-ende-1024',
        'xlm-mlm-ende-1024',
        'xlm-clm-enfr-1024',
        'xlm-mlm-enfr-1024',
        'xlm-mlm-17-1280',
        'xlm-mlm-100-1280',
        'xlm-mlm-en-2048',
        'xlm-mlm-enro-1024',
        'xlm-mlm-tlm-xnli15-1024',
        'xlm-mlm-xnli15-1024',
    ],
    'xlm-roberta': [
        # Masked language modelling
        'xlm-roberta-base'
    ],
    'yolos': [
        # Object detection
        'hustvl/yolos-tiny',
        'hustvl/yolos-small',
        'hustvl/yolos-base',
        'hustvl/yolos-small-dwr',
        'hustvl/yolos-small-300',
    ]
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
