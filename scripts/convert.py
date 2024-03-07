
import json
import os
import shutil
from dataclasses import dataclass, field
from typing import Optional, Set
from tqdm import tqdm

from transformers import (
    AutoConfig,
    AutoTokenizer,
    HfArgumentParser
)

import onnx
from optimum.exporters.onnx import main_export, export_models
from optimum.exporters.tasks import TasksManager
from onnxruntime.quantization import (
    quantize_dynamic,
    QuantType
)

DEFAULT_QUANTIZE_PARAMS = {
    'per_channel': True,
    'reduce_range': True,
}

MODEL_SPECIFIC_QUANTIZE_PARAMS = {
    # Decoder-only models
    'codegen': {
        'per_channel': False,
        'reduce_range': False,
    },
    'gpt2': {
        'per_channel': False,
        'reduce_range': False,
    },
    'gpt_bigcode': {
        'per_channel': False,
        'reduce_range': False,
    },
    'gptj': {
        'per_channel': False,
        'reduce_range': False,
    },
    'gpt-neo': {
        'per_channel': False,
        'reduce_range': False,
    },
    'gpt-neox': {
        'per_channel': False,
        'reduce_range': False,
    },
    'mpt': {
        'per_channel': False,
        'reduce_range': False,
    },
    'bloom': {
        'per_channel': False,
        'reduce_range': False,
    },
    'llama': {
        'per_channel': False,
        'reduce_range': False,
    },
    'opt': {
        'per_channel': False,
        'reduce_range': False,
    },
    'mistral': {
        'per_channel': False,
        'reduce_range': False,
    },
    'falcon': {
        'per_channel': False,
        'reduce_range': False,
    },
    'phi': {
        'per_channel': False,
        'reduce_range': False,
    },
    'qwen2': {
        'per_channel': False,
        'reduce_range': False,
    },
    'stablelm': {
        'per_channel': False,
        'reduce_range': False,
    },
    'starcoder2': {
        'per_channel': False,
        'reduce_range': False,
    },

    # Encoder-decoder models
    'whisper': {
        'per_channel': False,
        'reduce_range': False,
    },
    'vision-encoder-decoder': {
        'per_channel': False,
        'reduce_range': False,
    },

    # Encoder-only models
    'owlv2': {
        'per_channel': False,
        'reduce_range': False,
    },
    'wavlm': {
        'per_channel': False,
        'reduce_range': False,
    },
    'wav2vec2': {
        'per_channel': False,
        'reduce_range': False,
    },
    'unispeech': {
        'per_channel': False,
        'reduce_range': False,
    },
    'unispeech-sat': {
        'per_channel': False,
        'reduce_range': False,
    },
}

MODELS_WITHOUT_TOKENIZERS = [
    'wav2vec2',
    'wav2vec2-bert',
    'wavlm',
    'hubert',
    'unispeech',
    'unispeech-sat',
]


@dataclass
class ConversionArguments:
    """
    Arguments used for converting HuggingFace models to onnx.
    """

    model_id: str = field(
        metadata={
            "help": "Model identifier"
        }
    )
    tokenizer_id: str = field(
        default=None,
        metadata={
            "help": "Tokenizer identifier (if different to `model_id`)"
        }
    )
    quantize: bool = field(
        default=False,
        metadata={
            "help": "Whether to quantize the model."
        }
    )
    output_parent_dir: str = field(
        default='./models/',
        metadata={
            "help": "Path where the converted model will be saved to."
        }
    )

    task: Optional[str] = field(
        default='auto',
        metadata={
            "help": (
                "The task to export the model for. If not specified, the task will be auto-inferred based on the model. Available tasks depend on the model, but are among:"
                f" {str(TasksManager.get_all_tasks())}. For decoder models, use `xxx-with-past` to export the model using past key values in the decoder."
            )
        }
    )

    opset: int = field(
        default=None,
        metadata={
            "help": (
                "If specified, ONNX opset version to export the model with. Otherwise, the default opset will be used."
            )
        }
    )

    device: str = field(
        default='cpu',
        metadata={
            "help": 'The device to use to do the export.'
        }
    )
    skip_validation: bool = field(
        default=False,
        metadata={
            "help": "Whether to skip validation of the converted model"
        }
    )

    per_channel: bool = field(
        default=None,
        metadata={
            "help": "Whether to quantize weights per channel"
        }
    )
    reduce_range: bool = field(
        default=None,
        metadata={
            "help": "Whether to quantize weights with 7-bits. It may improve the accuracy for some models running on non-VNNI machine, especially for per-channel mode"
        }
    )

    output_attentions: bool = field(
        default=False,
        metadata={
            "help": "Whether to output attentions from the model. NOTE: This is only supported for whisper models right now."
        }
    )

    split_modalities: bool = field(
        default=False,
        metadata={
            "help": "Whether to split multimodal models. NOTE: This is only supported for CLIP models right now."
        }
    )

    trust_remote_code: bool = field(
        default=False,
        metadata={
            "help": "Allows to use custom code for the modeling hosted in the model repository. This option should only be set for repositories"
            "you trust and in which you have read the code, as it will execute on your local machine arbitrary code present in the model repository."
        }
    )

    custom_onnx_configs: str = field(
        default=None,
        metadata={
            "help": "Experimental usage: override the default ONNX config used for the given model. This argument may be useful for advanced users "
            "that desire a finer-grained control on the export."
        }
    )


def get_operators(model: onnx.ModelProto) -> Set[str]:
    operators = set()

    def traverse_graph(graph):
        for node in graph.node:
            operators.add(node.op_type)
            for attr in node.attribute:
                if attr.type == onnx.AttributeProto.GRAPH:
                    subgraph = attr.g
                    traverse_graph(subgraph)

    traverse_graph(model.graph)
    return operators


def quantize(model_names_or_paths, **quantize_kwargs):
    """
    Quantize the weights of the model from float32 to int8 to allow very efficient inference on modern CPU

    Uses unsigned ints for activation values, signed ints for weights, per
    https://onnxruntime.ai/docs/performance/quantization.html#data-type-selection
    it is faster on most CPU architectures
    Args:
        onnx_model_path: Path to location the exported ONNX model is stored
    Returns: The Path generated for the quantized
    """

    quantize_config = dict(
        **quantize_kwargs,
        per_model_config={}
    )

    for model in tqdm(model_names_or_paths, desc='Quantizing'):
        directory_path = os.path.dirname(model)
        file_name_without_extension = os.path.splitext(
            os.path.basename(model))[0]

        # NOTE:
        # As of 2023/04/20, the current latest version of onnxruntime-web is 1.14.0, and does not support INT8 weights for Conv layers.
        # For this reason, we choose model weight types to ensure compatibility with onnxruntime-web.
        #
        # As per docs, signed weight type (QInt8) is faster on most CPUs, so, we use that unless the model contains a Conv layer.
        # For more information, see:
        #  - https://github.com/microsoft/onnxruntime/issues/3130#issuecomment-1105200621
        #  - https://github.com/microsoft/onnxruntime/issues/2339

        loaded_model = onnx.load_model(model)
        op_types = get_operators(loaded_model)
        weight_type = QuantType.QUInt8 if 'Conv' in op_types else QuantType.QInt8

        quantize_dynamic(
            model_input=model,
            model_output=os.path.join(
                directory_path, f'{file_name_without_extension}_quantized.onnx'),

            weight_type=weight_type,
            optimize_model=False,

            # TODO allow user to specify these
            # op_types_to_quantize=['MatMul', 'Add', 'Conv'],
            extra_options=dict(
                EnableSubgraph=True
            ),
            **quantize_kwargs
        )

        quantize_config['per_model_config'][file_name_without_extension] = dict(
            op_types=list(op_types),
            weight_type=str(weight_type),
        )

    # Save quantization config
    with open(os.path.join(directory_path, 'quantize_config.json'), 'w') as fp:
        json.dump(quantize_config, fp, indent=4)


def main():

    parser = HfArgumentParser(
        (ConversionArguments, )
    )
    conv_args, = parser.parse_args_into_dataclasses()

    model_id = conv_args.model_id
    tokenizer_id = conv_args.tokenizer_id or model_id

    output_model_folder = os.path.join(conv_args.output_parent_dir, model_id)

    # Create output folder
    os.makedirs(output_model_folder, exist_ok=True)

    from_pretrained_kwargs = dict(
        trust_remote_code=conv_args.trust_remote_code,
    )

    # Saving the model config
    config = AutoConfig.from_pretrained(model_id, **from_pretrained_kwargs)

    custom_kwargs={}
    if conv_args.custom_onnx_configs is not None:
        if conv_args.task == 'auto':
            raise Exception('`--task` must be set when exporting with `--custom_onnx_configs`')
        custom_onnx_configs = json.loads(conv_args.custom_onnx_configs)

        for key in custom_onnx_configs:
            onnx_configs = TasksManager._SUPPORTED_MODEL_TYPE[custom_onnx_configs[key]]['onnx']
            mapping = onnx_configs[conv_args.task]
            custom_onnx_configs[key] = mapping.func(config, **mapping.keywords)

        custom_kwargs['custom_onnx_configs'] = custom_onnx_configs

    tokenizer = None
    try:
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(tokenizer_id, **from_pretrained_kwargs)

        # To avoid inserting all chat templates into tokenizers.js, we save the chat template
        # to the tokenizer_config.json file, and load it when the tokenizer is loaded.
        if getattr(tokenizer, 'chat_template', None) is None and \
            getattr(tokenizer, 'use_default_system_prompt', False):
            # No chat template specified, and we use the default
            setattr(tokenizer, 'chat_template', tokenizer.default_chat_template)

    except KeyError:
        pass  # No Tokenizer

    except Exception as e:
        if config.model_type not in MODELS_WITHOUT_TOKENIZERS:
            raise e

    core_export_kwargs = dict(
        opset=conv_args.opset,
        device=conv_args.device,
        trust_remote_code=conv_args.trust_remote_code,
        **custom_kwargs,
    )

    export_kwargs = dict(
        model_name_or_path=model_id,
        output=output_model_folder,
        task=conv_args.task,
        do_validation=not conv_args.skip_validation,
        library_name='transformers',
        **core_export_kwargs,
    )

    # Handle special cases
    if config.model_type == 'marian':
        from .extra.marian import generate_tokenizer_json
        tokenizer_json = generate_tokenizer_json(model_id, tokenizer)

        with open(os.path.join(output_model_folder, 'tokenizer.json'), 'w', encoding='utf-8') as fp:
            json.dump(tokenizer_json, fp, indent=4)

    elif config.model_type == 'esm':
        from .extra.esm import generate_fast_tokenizer
        fast_tokenizer = generate_fast_tokenizer(tokenizer)
        fast_tokenizer.save(os.path.join(output_model_folder, 'tokenizer.json'))

    elif config.model_type == 'whisper':
        if conv_args.output_attentions:
            from .extra.whisper import get_main_export_kwargs

            export_kwargs.update(
                **get_main_export_kwargs(config, "automatic-speech-recognition")
            )

    elif config.model_type in ('wav2vec2', 'wav2vec2-bert', 'hubert', 'unispeech' , 'unispeech-sat'):
        if tokenizer is not None:
            from .extra.wav2vec2 import generate_tokenizer_json
            tokenizer_json = generate_tokenizer_json(tokenizer)

            with open(os.path.join(output_model_folder, 'tokenizer.json'), 'w', encoding='utf-8') as fp:
                json.dump(tokenizer_json, fp, indent=4)
    
    elif config.model_type == 'vits':
        if tokenizer is not None:
            from .extra.vits import generate_tokenizer_json
            tokenizer_json = generate_tokenizer_json(tokenizer)

            with open(os.path.join(output_model_folder, 'tokenizer.json'), 'w', encoding='utf-8') as fp:
                json.dump(tokenizer_json, fp, indent=4)
    
    elif config.model_type == 'speecht5':
        # TODO allow user to specify vocoder path
        export_kwargs["model_kwargs"] = {"vocoder": "microsoft/speecht5_hifigan"}

        if tokenizer is not None:
            from .extra.speecht5 import generate_tokenizer_json
            tokenizer_json = generate_tokenizer_json(tokenizer)

            with open(os.path.join(output_model_folder, 'tokenizer.json'), 'w', encoding='utf-8') as fp:
                json.dump(tokenizer_json, fp, indent=4)

    elif config.model_type in ('owlvit', 'owlv2'):
        # Override default batch size to 1, needed because non-maximum suppression is performed for exporting.
        # For more information, see https://github.com/huggingface/optimum/blob/e3b7efb1257c011db907ef40ab340e795cc5684c/optimum/exporters/onnx/model_configs.py#L1028-L1032
        export_kwargs['batch_size'] = 1

    else:
        pass  # TODO

    # Step 1. convert huggingface model to onnx
    if not conv_args.split_modalities:
        main_export(**export_kwargs)
    else:
        custom_export_kwargs = dict(
            output_dir=output_model_folder,
            **core_export_kwargs,
        )

        if config.model_type == 'clip':
            # Handle special case for exporting text and vision models separately
            from .extra.clip import CLIPTextModelWithProjectionOnnxConfig, CLIPVisionModelWithProjectionOnnxConfig
            from transformers.models.clip import CLIPTextModelWithProjection, CLIPVisionModelWithProjection

            text_model = CLIPTextModelWithProjection.from_pretrained(model_id, **from_pretrained_kwargs)
            vision_model = CLIPVisionModelWithProjection.from_pretrained(model_id, **from_pretrained_kwargs)

            export_models(
                models_and_onnx_configs={
                    "text_model": (text_model, CLIPTextModelWithProjectionOnnxConfig(text_model.config)),
                    "vision_model": (vision_model, CLIPVisionModelWithProjectionOnnxConfig(vision_model.config)),
                },
                **custom_export_kwargs,
            )

        elif config.model_type == 'siglip':
            # Handle special case for exporting text and vision models separately
            from .extra.siglip import SiglipTextModelOnnxConfig, SiglipVisionModelOnnxConfig
            from transformers.models.siglip import SiglipTextModel, SiglipVisionModel

            text_model = SiglipTextModel.from_pretrained(model_id, **from_pretrained_kwargs)
            vision_model = SiglipVisionModel.from_pretrained(model_id, **from_pretrained_kwargs)

            export_models(
                models_and_onnx_configs={
                    "text_model": (text_model, SiglipTextModelOnnxConfig(text_model.config)),
                    "vision_model": (vision_model, SiglipVisionModelOnnxConfig(vision_model.config)),
                },
                **custom_export_kwargs,
            )

        # TODO: Enable once https://github.com/huggingface/optimum/pull/1552 is merged
        # elif config.model_type == 'clap':
        #     # Handle special case for exporting text and audio models separately
        #     from .extra.clap import ClapTextModelWithProjectionOnnxConfig, ClapAudioModelWithProjectionOnnxConfig
        #     from transformers.models.clap import ClapTextModelWithProjection, ClapAudioModelWithProjection

        #     text_model = ClapTextModelWithProjection.from_pretrained(model_id, **from_pretrained_kwargs)
        #     audio_model = ClapAudioModelWithProjection.from_pretrained(model_id, **from_pretrained_kwargs)

        #     export_models(
        #         models_and_onnx_configs={
        #             "text_model": (text_model, ClapTextModelWithProjectionOnnxConfig(text_model.config)),
        #             "audio_model": (audio_model, ClapAudioModelWithProjectionOnnxConfig(audio_model.config)),
        #         },
        #         **custom_export_kwargs,
        #     )

        else:
            raise Exception(f'Unable to export {config.model_type} model with `--split_modalities`.')


    # Step 2. (optional, recommended) quantize the converted model for fast inference and to reduce model size.
    if conv_args.quantize:
        # Update quantize config with model specific defaults
        quantize_config = MODEL_SPECIFIC_QUANTIZE_PARAMS.get(
            config.model_type, DEFAULT_QUANTIZE_PARAMS)

        # Update if user specified values
        if conv_args.per_channel is not None:
            quantize_config['per_channel'] = conv_args.per_channel

        if conv_args.reduce_range is not None:
            quantize_config['reduce_range'] = conv_args.reduce_range

        quantize([
            os.path.join(output_model_folder, x)
            for x in os.listdir(output_model_folder)
            if x.endswith('.onnx') and not x.endswith('_quantized.onnx')
        ], **quantize_config)

    # Step 3. Move .onnx files to the 'onnx' subfolder
    os.makedirs(os.path.join(output_model_folder, 'onnx'), exist_ok=True)
    for file in os.listdir(output_model_folder):
        if file.endswith(('.onnx', '.onnx_data')):
            shutil.move(os.path.join(output_model_folder, file),
                        os.path.join(output_model_folder, 'onnx', file))

    # Step 4. Update the generation config if necessary
    if config.model_type == 'whisper':
        from transformers import GenerationConfig
        from .extra.whisper import get_alignment_heads

        generation_config = GenerationConfig.from_pretrained(model_id, **from_pretrained_kwargs)
        generation_config.alignment_heads = get_alignment_heads(config)
        generation_config.save_pretrained(output_model_folder)


if __name__ == '__main__':
    main()
