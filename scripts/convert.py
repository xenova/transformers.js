
import os
import shutil
from dataclasses import dataclass, field
from typing import Optional

from transformers import AutoTokenizer, HfArgumentParser
from transformers.utils import cached_file
from tqdm import tqdm

from optimum.utils import DEFAULT_DUMMY_SHAPES
from optimum.exporters.tasks import TasksManager
from optimum.exporters.onnx.utils import (
    get_decoder_models_for_export,
    get_encoder_decoder_models_for_export
)
from optimum.exporters.onnx.convert import export_models
from optimum.onnx.graph_transformations import merge_decoders
from optimum.onnxruntime.utils import (
    ONNX_WEIGHTS_NAME,
    ONNX_ENCODER_NAME,
    ONNX_DECODER_NAME,
    ONNX_DECODER_WITH_PAST_NAME,
    ONNX_DECODER_MERGED_NAME
)
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
    input_parent_dir: str = field(
        default='./models/pytorch/',
        metadata={
            "help": "Path where the original model will be loaded from."
        }
    )
    output_parent_dir: str = field(
        default='./models/onnx/',
        metadata={
            "help": "Path where the converted model will be saved to."
        }
    )

    task: Optional[str] = field(
        default='default',
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
    from_hub: bool = field(
        default=False,
        metadata={
            "help": "Whether to use local files, or from the HuggingFace Hub."
        }
    )
    merge_decoders: bool = field(
        default=True,
        metadata={
            "help": "Whether to fuse decoder ONNX model and decoder with past ONNX model into one ONNX model with if logic"
        }
    )
    overwrite: bool = field(
        default=False,
        metadata={
            "help": "Whether to overwriting existing models"
        }
    )


UNSIGNED_MODEL_TYPES = [
    'whisper',
    'vision-encoder-decoder',
    'vit',
    'clip',
    'detr',
    'squeezebert',
]


def quantize(models_name_or_path, model_type):
    """
    Quantize the weights of the model from float32 to int8 to allow very efficient inference on modern CPU

    Uses unsigned ints for activation values, signed ints for weights, per
    https://onnxruntime.ai/docs/performance/quantization.html#data-type-selection
    it is faster on most CPU architectures
    Args:
        onnx_model_path: Path to location the exported ONNX model is stored
    Returns: The Path generated for the quantized
    """

    # As per docs, signed weight type (QInt8) is faster on most CPUs
    # However, for some model types (e.g., whisper), we have to use
    # unsigned weight type (QUInt8). For more info:
    # https://github.com/microsoft/onnxruntime/issues/3130#issuecomment-1105200621

    if model_type in UNSIGNED_MODEL_TYPES:
        weight_type = QuantType.QUInt8
    else:
        # Default
        weight_type = QuantType.QInt8

    for model in tqdm(models_name_or_path, desc='Quantizing'):
        # model_name = os.path.splitext(os.path.basename(model))[0]
        quantize_dynamic(
            model_input=model,
            model_output=model,
            per_channel=True,
            reduce_range=True,  # should be the same as per_channel

            weight_type=weight_type,
            optimize_model=False,
        )  # op_types_to_quantize=['MatMul', 'Relu', 'Add', 'Mul' ],


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

    input_model_path = os.path.join(
        conv_args.input_parent_dir,
        conv_args.model_id
    )
    if conv_args.from_hub:
        model_path = conv_args.model_id
    else:
        model_path = input_model_path

    # Infer the task
    task = conv_args.task
    if task == "auto":
        try:
            task = TasksManager.infer_task_from_model(model_path)
        except KeyError as e:
            raise KeyError(
                f"The task could not be automatically inferred. Please provide the argument --task with the task from {', '.join(TasksManager.get_all_tasks())}. Detailed error: {e}"
            )

    output_model_folder = os.path.join(
        conv_args.output_parent_dir,
        'quantized' if conv_args.quantize else 'unquantized',
        conv_args.model_id,
        task
    )

    # get the shapes to be used to generate dummy inputs
    input_shapes = DEFAULT_DUMMY_SHAPES.copy()

    model = TasksManager.get_model_from_task(
        task, model_path,
        framework='pt',
    )

    onnx_config_constructor = TasksManager.get_exporter_config_constructor(
        model=model, exporter='onnx', task=task)
    onnx_config = onnx_config_constructor(model.config)

    # Ensure the requested opset is sufficient
    if conv_args.opset is None:
        conv_args.opset = onnx_config.DEFAULT_ONNX_OPSET
    elif conv_args.opset < onnx_config.DEFAULT_ONNX_OPSET:
        raise ValueError(
            f"Opset {conv_args.opset} is not sufficient to export {model.config.model_type}. "
            f"At least  {onnx_config.DEFAULT_ONNX_OPSET} is required."
        )

    # Create output folder
    os.makedirs(output_model_folder, exist_ok=True)

    # Copy certain JSON files, which save_pretrained doesn't handle
    copy_if_exists(model_path, 'tokenizer.json', output_model_folder)
    copy_if_exists(model_path, 'preprocessor_config.json', output_model_folder)

    if model.can_generate():
        copy_if_exists(model_path, 'generation_config.json',
                       output_model_folder)

    # Saving the model config
    model.config.save_pretrained(output_model_folder)

    try:
        # Save tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        tokenizer.save_pretrained(output_model_folder)

        # Handle special cases
        if model.config.model_type == 'marian':
            import json
            from .extra.marian import generate_tokenizer_json
            tokenizer_json = generate_tokenizer_json(model_path, tokenizer)

            with open(os.path.join(output_model_folder, 'tokenizer.json'), 'w', encoding='utf-8') as fp:
                json.dump(tokenizer_json, fp)
    except KeyError:
        pass  # No Tokenizer

    # Specify output paths
    OUTPUT_WEIGHTS_PATH = os.path.join(output_model_folder, ONNX_WEIGHTS_NAME)
    OUTPUT_ENCODER_PATH = os.path.join(output_model_folder, ONNX_ENCODER_NAME)
    OUTPUT_DECODER_PATH = os.path.join(output_model_folder, ONNX_DECODER_NAME)
    OUTPUT_DECODER_WITH_PAST_PATH = os.path.join(
        output_model_folder, ONNX_DECODER_WITH_PAST_NAME)
    OUTPUT_DECODER_MERGED_PATH = os.path.join(
        output_model_folder, ONNX_DECODER_MERGED_NAME)

    # Step 1. convert huggingface model to onnx
    if model.config.is_encoder_decoder and task.startswith("causal-lm"):
        raise ValueError(
            f"model.config.is_encoder_decoder is True and task is `{task}`, which are incompatible. If the task was auto-inferred, please fill a bug report"
            f"at https://github.com/huggingface/optimum, if --task was explicitely passed, make sure you selected the right task for the model,"
            f" referring to `optimum.exporters.tasks.TaskManager`'s `_TASKS_TO_AUTOMODELS`."
        )

    if (
        model.config.is_encoder_decoder
        and task.startswith(("seq2seq-lm", "speech2seq-lm", "vision2seq-lm", "default-with-past"))
    ):
        models_and_onnx_configs = get_encoder_decoder_models_for_export(
            model, onnx_config)
    elif task.startswith("causal-lm"):
        models_and_onnx_configs = get_decoder_models_for_export(
            model, onnx_config)
    else:
        models_and_onnx_configs = {"model": (model, onnx_config)}

    onnx_model_paths = [
        os.path.join(output_model_folder, f'{x}.onnx')
        for x in models_and_onnx_configs
    ]

    # Check if at least one model doesn't exist, or user requests to overwrite
    if any(
        not os.path.exists(x) for x in onnx_model_paths
    ) or conv_args.overwrite:
        _, onnx_outputs = export_models(
            models_and_onnx_configs=models_and_onnx_configs,
            opset=conv_args.opset,
            output_dir=output_model_folder,
            input_shapes=input_shapes,
            device=conv_args.device,
            # dtype="fp16" if fp16 is True else None, # TODO
        )

    # Step 2. (optional, recommended) quantize the converted model for fast inference and to reduce model size.
    if conv_args.quantize:
        quantize(onnx_model_paths, model.config.model_type)

    # Step 3. merge decoders.
    if conv_args.merge_decoders and (
        os.path.exists(OUTPUT_DECODER_PATH) and
        os.path.exists(OUTPUT_DECODER_WITH_PAST_PATH)
    ) and (not os.path.exists(OUTPUT_DECODER_MERGED_PATH) or conv_args.overwrite):
        print('Merging decoders')
        merge_decoders(
            OUTPUT_DECODER_PATH,
            OUTPUT_DECODER_WITH_PAST_PATH,
            save_path=OUTPUT_DECODER_MERGED_PATH,
            strict=False
        )


if __name__ == '__main__':
    main()
