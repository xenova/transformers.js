
import json
import os
import shutil
from dataclasses import dataclass, field
from typing import Optional
from tqdm import tqdm

from transformers import (
    AutoConfig,
    AutoTokenizer,
    HfArgumentParser
)
from transformers.utils import cached_file

import onnx
from optimum.exporters.onnx import main_export
from optimum.exporters.tasks import TasksManager
from onnxruntime.quantization import (
    quantize_dynamic,
    QuantType
)


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
                f" {str(list(TasksManager._TASKS_TO_AUTOMODELS.keys()))}. For decoder models, use `xxx-with-past` to export the model using past key values in the decoder."
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
        default=True,
        metadata={
            "help": "Whether to quantize weights per channel"
        }
    )
    reduce_range: bool = field(
        default=True,
        metadata={
            "help": "Whether to quantize weights with 7-bits. It may improve the accuracy for some models running on non-VNNI machine, especially for per-channel mode"
        }
    )


def get_operators(model: onnx.ModelProto) -> set[str]:
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


def quantize(model_names_or_paths, conv_args: ConversionArguments):
    """
    Quantize the weights of the model from float32 to int8 to allow very efficient inference on modern CPU

    Uses unsigned ints for activation values, signed ints for weights, per
    https://onnxruntime.ai/docs/performance/quantization.html#data-type-selection
    it is faster on most CPU architectures
    Args:
        onnx_model_path: Path to location the exported ONNX model is stored
    Returns: The Path generated for the quantized
    """

    quant_config = dict(
        per_channel=conv_args.per_channel,
        reduce_range=conv_args.reduce_range,
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

            per_channel=conv_args.per_channel,
            reduce_range=conv_args.reduce_range,

            weight_type=weight_type,
            optimize_model=False,

            # TODO allow user to specify these
            # op_types_to_quantize=['MatMul', 'Add', 'Conv'],
            extra_options=dict(
                EnableSubgraph=True
            )
        )

        quant_config['per_model_config'][file_name_without_extension] = dict(
            op_types=list(op_types),
            weight_type=str(weight_type),
        )

    # Save quantization config
    with open(os.path.join(directory_path, 'quant_config.json'), 'w') as fp:
        json.dump(quant_config, fp, indent=4)


def copy_if_exists(model_path, file_name, destination):
    file = cached_file(model_path, file_name,
                       _raise_exceptions_for_missing_entries=False)
    if file is not None:
        shutil.copy(file, destination)


def main():

    parser = HfArgumentParser(
        (ConversionArguments, )
    )
    conv_args, = parser.parse_args_into_dataclasses()

    model_id = conv_args.model_id

    output_model_folder = os.path.join(conv_args.output_parent_dir, model_id)

    # Create output folder
    os.makedirs(output_model_folder, exist_ok=True)

    # Copy certain JSON files, which save_pretrained doesn't handle
    # copy_if_exists(model_id, 'tokenizer.json', output_model_folder)

    # copy_if_exists(model_id, 'preprocessor_config.json', output_model_folder)
    # copy_if_exists(model_id, 'generation_config.json', output_model_folder)

    # # Saving the model config
    config = AutoConfig.from_pretrained(model_id)
    # config.save_pretrained(output_model_folder)

    try:
        # Save tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        # tokenizer.save_pretrained(output_model_folder)

        # Handle special cases
        if config.model_type == 'marian':
            import json
            from .extra.marian import generate_tokenizer_json
            tokenizer_json = generate_tokenizer_json(model_id, tokenizer)

            with open(os.path.join(output_model_folder, 'tokenizer.json'), 'w', encoding='utf-8') as fp:
                json.dump(tokenizer_json, fp)

    except KeyError:
        pass  # No Tokenizer

    # Step 1. convert huggingface model to onnx
    main_export(
        model_name_or_path=model_id,
        output=output_model_folder,
        task=conv_args.task,
        opset=conv_args.opset,
        device=conv_args.device,
        do_validation=not conv_args.skip_validation,
    )

    # Step 2. (optional, recommended) quantize the converted model for fast inference and to reduce model size.
    if conv_args.quantize:
        quantize([
            os.path.join(output_model_folder, x)
            for x in os.listdir(output_model_folder)
            if x.endswith('.onnx') and not x.endswith('_quantized.onnx')
        ], conv_args)

    # Step 3. Move .onnx files to the 'onnx' subfolder
    os.makedirs(os.path.join(output_model_folder, 'onnx'), exist_ok=True)
    for file in os.listdir(output_model_folder):
        if file.endswith('.onnx') or file.endswith('.onnx_data'):
            shutil.move(os.path.join(output_model_folder, file),
                        os.path.join(output_model_folder, 'onnx', file))


if __name__ == '__main__':
    main()
