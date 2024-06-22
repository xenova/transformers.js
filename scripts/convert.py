
import json
import os
import shutil
from dataclasses import dataclass, field
from typing import Optional, Set
from tqdm import tqdm
from enum import Enum

from transformers import (
    AutoConfig,
    AutoTokenizer,
    HfArgumentParser
)

import onnx
import onnxslim
from optimum.exporters.onnx import main_export, export_models
from optimum.onnx.graph_transformations import check_and_save_model
from optimum.exporters.tasks import TasksManager
from onnxruntime.quantization import (
    quantize_dynamic,
    QuantType
)
from onnxruntime.quantization.matmul_4bits_quantizer import MatMul4BitsQuantizer
from onnxruntime.quantization.matmul_bnb4_quantizer import MatMulBnb4Quantizer
from onnxconverter_common import float16


NO_PER_CHANNEL_REDUCE_RANGE_MODELS = {
    # Decoder-only models
    'codegen',
    'gpt2',
    'gpt_bigcode',
    'gptj',
    'gpt-neo',
    'gpt-neox',
    'mpt',
    'bloom',
    'llama',
    'gemma',
    'opt',
    'mistral',
    'falcon',
    'phi',
    'phi3',
    'qwen2',
    'stablelm',
    'starcoder2',
    'openelm',
    'gemma',

    # Encoder-decoder models
    'whisper',
    'vision-encoder-decoder',

    # Encoder-only models
    'owlv2',
    'wavlm',
    'wav2vec2',
    'unispeech',
    'unispeech-sat',
}

MODELS_WITHOUT_TOKENIZERS = [
    'wav2vec2',
    'wav2vec2-bert',
    'wavlm',
    'hubert',
    'unispeech',
    'unispeech-sat',
]


class QuantMode(Enum):
    # F32 = 'fp32'
    FP16 = 'fp16'
    Q8 = 'q8'
    QI8 = 'int8'
    QU8 = 'uint8'
    Q4 = 'q4'
    BNB4 = 'bnb4'


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
    quantize_mode: QuantMode = field(
        default=None,
        metadata={
            "help": f"Quantization mode to use. Options are: {', '.join([x.value for x in QuantMode])}"
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

    variant: Optional[str] = field(
        default='default',
        metadata={
            "help": "The variant of the ONNX export to use."
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
    block_size: int = field(
        default=None,
        metadata={
            "help": "Block size for blockwise quantization. Note: bnb.nn.Linear4bit only uses block_size=64"
        }
    )
    quant_type: int = field(
        default=MatMulBnb4Quantizer.NF4,
        metadata={
            "help": "Quantization data type. 0: FP4, 1: NF4",
            "choices": [MatMulBnb4Quantizer.FP4, MatMulBnb4Quantizer.NF4],
        }
    )
    symmetric: bool = field(
        default=True,
        metadata={
            "help": "Indicate whether to quantize the model symmetrically"
        }
    )
    accuracy_level: int = field(
        default=None,
        metadata={
            "help": "Accuracy level of the 4-bit quantized MatMul computation. "
            "Refer to the MatMulNBits contrib op's 'accuracy_level' attribute for details "
            "(https://github.com/microsoft/onnxruntime/blob/main/docs/ContribOperators.md#commicrosoftmatmulnbits)."
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
    skip_onnxslim: bool = field(
        default=False,
        metadata={
            "help": "Whether or not to skip onnxslim."
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


def quantize(
    mode, model_names_or_paths, *,

        # 8-bit quantization
        per_channel: bool = True,
        reduce_range: bool = True,

        # 4-bit quantization
        block_size: int | None = None,

        # MatMul4BitsQuantizer
        is_symmetric: bool = True,
        accuracy_level: int | None = None,

        # MatMulBnb4Quantizer
        quant_type: int | None = None,
):
    """
    Quantize the weights of the model (e.g., from float32 to int8) to allow for more efficient inference.
    """

    quantize_config = {}

    directory_path = os.path.dirname(model_names_or_paths[0])

    outputs = []
    for model in tqdm(model_names_or_paths, desc='Quantizing'):
        file_name_without_extension = os.path.splitext(
            os.path.basename(model)
        )[0]

        loaded_model = onnx.load_model(model)
        suffix = 'quantized' if mode == QuantMode.Q8 else mode.value
        save_path = os.path.join(
            directory_path,
            f'{file_name_without_extension}_{suffix}.onnx',
        )

        quantize_kwargs = {}

        if mode in (QuantMode.Q8, QuantMode.QI8, QuantMode.QU8):
            quantize_kwargs.update(
                per_channel=per_channel,
                reduce_range=reduce_range,
            )

            op_types = get_operators(loaded_model)
            if mode == QuantMode.Q8:
                # NOTE:
                # As of 2024/03/18, the current latest version of onnxruntime-web is 1.17.1, and does not support INT8 weights for Conv layers.
                # If you attempt to run a model with INT8 weights for Conv layers, you will get an error like:
                # `Can't create a session. ERROR_CODE: 9, ERROR_MESSAGE: Could not find an implementation for ConvInteger(10) node with name '/.../Conv_quant'`
                #
                # For this reason, we choose model weight types to ensure compatibility with onnxruntime-web.
                #
                # As per docs, signed weight type (QInt8) is faster on most CPUs, so, we use that unless the model contains a Conv layer.
                # For more information, see:
                #  - https://github.com/microsoft/onnxruntime/issues/3130#issuecomment-1105200621
                #  - https://github.com/microsoft/onnxruntime/issues/2339
                weight_type = QuantType.QUInt8 if 'Conv' in op_types else QuantType.QInt8

            elif mode == QuantMode.QI8:
                weight_type = QuantType.QInt8

            else:  # mode == QuantMode.QU8:
                weight_type = QuantType.QUInt8

            del loaded_model

            # Uses unsigned ints for activation values, signed ints for weights, per
            # https://onnxruntime.ai/docs/performance/quantization.html#data-type-selection
            # it is faster on most CPU architectures
            quantize_dynamic(
                model_input=model,
                model_output=save_path,
                weight_type=weight_type,

                # TODO allow user to specify these
                # op_types_to_quantize=['MatMul', 'Add', 'Conv'],
                extra_options=dict(
                    EnableSubgraph=True
                ),

                **quantize_kwargs,
            )

            if 'per_model_config' not in quantize_config:
                quantize_config['per_model_config'] = {}

            quantize_config['per_model_config'][file_name_without_extension] = dict(
                op_types=sorted(list(op_types)),
                weight_type=str(weight_type),
            )

        elif mode == QuantMode.Q4:
            block_size = block_size if block_size is not None else 32
            quantize_kwargs.update(
                block_size=block_size,
                is_symmetric=is_symmetric,
                accuracy_level=accuracy_level,
            )
            quantizer = MatMul4BitsQuantizer(
                model=loaded_model,
                **quantize_kwargs,
            )
            quantizer.process()
            check_and_save_model(quantizer.model.model, save_path)
            del quantizer

        elif mode == QuantMode.BNB4:
            block_size = block_size if block_size is not None else 64
            quant_type = quant_type if quant_type is not None else MatMulBnb4Quantizer.NF4
            quantize_kwargs.update(
                block_size=block_size,
                quant_type=quant_type,
            )

            quantizer = MatMulBnb4Quantizer(
                model=loaded_model,
                **quantize_kwargs,
            )
            quantizer.process()
            check_and_save_model(quantizer.model.model, save_path)
            del quantizer

        elif mode == QuantMode.FP16:
            # TODO: https://github.com/huggingface/optimum/blob/02c6ed5f413384d543bcf83a3a9094be2c0429a5/optimum/onnx/graph_transformations.py#L138
            try:
                model_fp16 = float16.convert_float_to_float16(
                    loaded_model,
                    keep_io_types=True,
                )
                onnx.save(model_fp16, save_path)
            except Exception:
                # Most likely due to size threshold exceeded (2GB)
                model_fp16 = float16.convert_float_to_float16(
                    loaded_model,
                    keep_io_types=True,
                    disable_shape_infer=True,
                )

                onnx.save(model_fp16, save_path,
                          save_as_external_data=True,
                          convert_attribute=False,
                          location=os.path.basename(save_path) + '_data',
                          all_tensors_to_one_file=True,
                          size_threshold=10_000_000,
                          )
                outputs.append(save_path + '_data')

        else:
            raise ValueError(f'Invalid quantization mode: {mode}')

        quantize_config.update(quantize_kwargs)
        outputs.append(save_path)

    return quantize_config, outputs


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

    custom_kwargs = {}
    if conv_args.custom_onnx_configs is not None:
        if conv_args.task == 'auto':
            raise Exception(
                '`--task` must be set when exporting with `--custom_onnx_configs`')
        custom_onnx_configs = json.loads(conv_args.custom_onnx_configs)

        for key in custom_onnx_configs:
            onnx_configs = TasksManager._SUPPORTED_MODEL_TYPE[custom_onnx_configs[key]]['onnx']
            mapping = onnx_configs[conv_args.task]
            new_kwargs = {}
            if conv_args.task.startswith('text-generation'):
                new_kwargs['use_past_in_inputs'] = True

            custom_onnx_configs[key] = mapping.func(
                config, **mapping.keywords, **new_kwargs)

        custom_kwargs['custom_onnx_configs'] = custom_onnx_configs

    tokenizer = None
    try:
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(
            tokenizer_id, **from_pretrained_kwargs)

        # To avoid inserting all chat templates into tokenizers.js, we save the chat template
        # to the tokenizer_config.json file, and load it when the tokenizer is loaded.
        if getattr(tokenizer, 'chat_template', None) is None and \
                getattr(tokenizer, 'use_default_system_prompt', False):
            # No chat template specified, and we use the default
            setattr(tokenizer, 'chat_template',
                    tokenizer.default_chat_template)

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
        _variant=conv_args.variant,
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
        fast_tokenizer.save(os.path.join(
            output_model_folder, 'tokenizer.json'))

    elif config.model_type == 'whisper':
        if conv_args.output_attentions:
            from .extra.whisper import get_main_export_kwargs

            export_kwargs.update(
                **get_main_export_kwargs(config, "automatic-speech-recognition")
            )

    elif config.model_type in ('wav2vec2', 'wav2vec2-bert', 'hubert', 'unispeech', 'unispeech-sat'):
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
        export_kwargs["model_kwargs"] = {
            "vocoder": "microsoft/speecht5_hifigan"}

        if tokenizer is not None:
            from .extra.speecht5 import generate_tokenizer_json
            tokenizer_json = generate_tokenizer_json(tokenizer)

            with open(os.path.join(output_model_folder, 'tokenizer.json'), 'w', encoding='utf-8') as fp:
                json.dump(tokenizer_json, fp, indent=4)

    elif config.model_type in ('owlvit', 'owlv2'):
        # Override default batch size to 1, needed because non-maximum suppression is performed for exporting.
        # For more information, see https://github.com/huggingface/optimum/blob/e3b7efb1257c011db907ef40ab340e795cc5684c/optimum/exporters/onnx/model_configs.py#L1028-L1032
        export_kwargs['batch_size'] = 1

    elif config.model_type == 'openelm':
        from .extra.openelm import OpenElmOnnxConfig

        config = AutoConfig.from_pretrained(
            model_id, trust_remote_code=conv_args.trust_remote_code)

        onnx_config = OpenElmOnnxConfig(
            config=config,
            task="text-generation",
            use_past=True,
            use_past_in_inputs=True,
        )

        custom_onnx_configs = {
            "model": onnx_config,
        }

        export_kwargs['task'] = "text-generation-with-past"
        export_kwargs['custom_onnx_configs'] = custom_onnx_configs

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

            text_model = CLIPTextModelWithProjection.from_pretrained(
                model_id, **from_pretrained_kwargs)
            vision_model = CLIPVisionModelWithProjection.from_pretrained(
                model_id, **from_pretrained_kwargs)

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

            text_model = SiglipTextModel.from_pretrained(
                model_id, **from_pretrained_kwargs)
            vision_model = SiglipVisionModel.from_pretrained(
                model_id, **from_pretrained_kwargs)

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
            raise Exception(
                f'Unable to export {config.model_type} model with `--split_modalities`.')

    os.makedirs(os.path.join(output_model_folder, 'onnx'), exist_ok=True)

    if not conv_args.skip_onnxslim:
        onnx_models = [os.path.join(output_model_folder, x)
                    for x in os.listdir(output_model_folder) if x.endswith('.onnx')]

        for model in onnx_models:
            onnxslim.slim(model, model)

    # Step 2. (optional, recommended) quantize the converted model for fast inference and to reduce model size.
    if conv_args.quantize:
        # Update quantize config with model specific defaults
        use_per_channel_reduce_range = config.model_type in NO_PER_CHANNEL_REDUCE_RANGE_MODELS

        quantize_config = {}

        # Update with user-specified values
        if conv_args.per_channel is not None:
            quantize_config['per_channel'] = conv_args.per_channel
        elif use_per_channel_reduce_range:
            quantize_config['per_channel'] = False

        if conv_args.reduce_range is not None:
            quantize_config['reduce_range'] = conv_args.reduce_range
        elif use_per_channel_reduce_range:
            quantize_config['reduce_range'] = False

        quantize_config['block_size'] = conv_args.block_size
        quantize_config['quant_type'] = conv_args.quant_type
        quantize_config['is_symmetric'] = conv_args.symmetric
        quantize_config['accuracy_level'] = conv_args.accuracy_level

        final_quantize_configs = {}
        quantize_modes = [x.value for x in QuantMode] \
            if conv_args.quantize_mode is None else [conv_args.quantize_mode]
        for quantize_mode in quantize_modes:
            try:
                final_quantize_config, quantized_paths = quantize(QuantMode(quantize_mode), [
                    os.path.join(output_model_folder, x)
                    for x in os.listdir(output_model_folder)
                    if x.endswith('.onnx')
                ], **quantize_config)

                final_quantize_configs[quantize_mode] = final_quantize_config

                for path in quantized_paths:
                    file_name = os.path.basename(path)
                    shutil.move(path,
                                os.path.join(output_model_folder, 'onnx', file_name))
            except Exception as e:
                print(
                    f'Failed to quantize model with mode {quantize_mode}: {e}')

        # Save quantization config
        with open(os.path.join(output_model_folder, 'quantize_config.json'), 'w') as fp:
            json.dump(final_quantize_configs, fp, indent=4)

    # Step 3. Move .onnx files to the 'onnx' subfolder
    for file in os.listdir(output_model_folder):
        if file.endswith(('.onnx', '.onnx_data')):
            shutil.move(os.path.join(output_model_folder, file),
                        os.path.join(output_model_folder, 'onnx', file))

    # Step 4. Update the generation config if necessary
    if config.model_type == 'whisper':
        from transformers import GenerationConfig
        from .extra.whisper import get_alignment_heads

        generation_config = GenerationConfig.from_pretrained(
            model_id, **from_pretrained_kwargs)
        generation_config.alignment_heads = get_alignment_heads(config)
        generation_config.save_pretrained(output_model_folder)


if __name__ == '__main__':
    main()
