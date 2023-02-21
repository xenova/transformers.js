
import os
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path

from transformers import AutoConfig
from transformers import AutoTokenizer, HfArgumentParser

from optimum.utils import DEFAULT_DUMMY_SHAPES
from optimum.exporters.tasks import TasksManager
from optimum.exporters.onnx.utils import (
    get_decoder_models_for_export,
    get_encoder_decoder_models_for_export
)
from optimum.exporters.onnx.convert import (
    export,
    export_models
)
from onnxruntime.quantization import quantize_dynamic, QuantType
from tqdm import tqdm


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
            "help": 'The device to use to do the export. Defaults to "cpu".'
        }
    )


SUPPORTED_TASKS = {
    # map tasks to automodels
    "default": "AutoModel",
    "masked-lm": "AutoModelForMaskedLM",
    "sequence-classification": "AutoModelForSequenceClassification",
    "multiple-choice": "AutoModelForMultipleChoice",
    "token-classification": "AutoModelForTokenClassification",
    "question-answering": "AutoModelForQuestionAnswering",
}

SUPPORTED_MODELS = {
    'bert': [
        "default",
        "masked-lm",
        "sequence-classification",
        "multiple-choice",
        "token-classification",
        "question-answering"
    ],
    'distilbert': [
        "default",
        "masked-lm",
        "sequence-classification",
        "multiple-choice",
        "token-classification",
        "question-answering",
    ],
    't5': [
        "default",
        "default-with-past",
        "seq2seq-lm",
        "seq2seq-lm-with-past",
    ],
    'gpt2': [
        "default",
        "default-with-past",
        "causal-lm",
        "causal-lm-with-past",
        "sequence-classification",
        "token-classification",
    ]
}


def quantize(models_name_or_path):
    """
    Quantize the weights of the model from float32 to int8 to allow very efficient inference on modern CPU

    Uses unsigned ints for activation values, signed ints for weights, per
    https://onnxruntime.ai/docs/performance/quantization.html#data-type-selection
    it is faster on most CPU architectures
    Args:
        onnx_model_path: Path to location the exported ONNX model is stored
    Returns: The Path generated for the quantized
    """

    for model in tqdm(models_name_or_path, desc='Quantizing'):
        # model_name = os.path.splitext(os.path.basename(model))[0]
        quantize_dynamic(
            model_input=model,
            model_output=model,
            per_channel=True,
            reduce_range=True,  # should be the same as per_channel
            activation_type=QuantType.QUInt8,
            weight_type=QuantType.QInt8,  # per docs, signed is faster on most CPUs
            optimize_model=False,
        )  # op_types_to_quantize=['MatMul', 'Relu', 'Add', 'Mul' ],


def main():

    # Helper script to fix inconsistencies between optimum exporter and other exporters.
    # T5 uses similar approach to fastT5 (https://github.com/Ki6an/fastT5)
    parser = HfArgumentParser(
        (ConversionArguments, )
    )
    conv_args, = parser.parse_args_into_dataclasses()

    input_model_folder = os.path.join(
        conv_args.input_parent_dir, conv_args.model_id)
    output_model_folder = os.path.join(
        conv_args.output_parent_dir, conv_args.model_id)

    # Infer the task
    task = conv_args.task
    if task == "auto":
        try:
            task = TasksManager.infer_task_from_model(input_model_folder)
        except KeyError as e:
            raise KeyError(
                f"The task could not be automatically inferred. Please provide the argument --task with the task from {', '.join(TasksManager.get_all_tasks())}. Detailed error: {e}"
            )

    # get the shapes to be used to generate dummy inputs
    input_shapes = DEFAULT_DUMMY_SHAPES

    model = TasksManager.get_model_from_task(
        task, input_model_folder
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

    # Saving the model config
    model.config.save_pretrained(output_model_folder)

    # 2. Save tokenizer
    tokenizer = AutoTokenizer.from_pretrained(input_model_folder)
    tokenizer.save_pretrained(output_model_folder)

    # Create output folder
    os.makedirs(output_model_folder, exist_ok=True)

    onnx_model_paths = []

    # Step 1. convert huggingface model to onnx
    if model.config.is_encoder_decoder or task.startswith("causal-lm"):
        if model.config.is_encoder_decoder and task.startswith("causal-lm"):
            raise ValueError(
                f"model.config.is_encoder_decoder is True and task is `{task}`, which are incompatible. If the task was auto-inferred, please fill a bug report"
                f"at https://github.com/huggingface/optimum, if --task was explicitely passed, make sure you selected the right task for the model,"
                f" referring to `optimum.exporters.tasks.TaskManager`'s `_TASKS_TO_AUTOMODELS`."
            )
        if model.config.is_encoder_decoder:
            models_and_onnx_configs = get_encoder_decoder_models_for_export(
                model,
                onnx_config
            )
        else:
            models_and_onnx_configs = get_decoder_models_for_export(
                model,
                onnx_config
            )

        export_models(
            models_and_onnx_configs=models_and_onnx_configs,
            opset=conv_args.opset,
            output_dir=output_model_folder,
            input_shapes=input_shapes,
            device=conv_args.device,
        )
        onnx_model_paths = [
            os.path.join(output_model_folder, f'{x}.onnx')
            for x in models_and_onnx_configs
        ]

    else:
        output_path = Path(os.path.join(output_model_folder, 'model.onnx'))
        export(
            model=model,
            config=onnx_config,
            output=output_path,
            opset=conv_args.opset,
            input_shapes=input_shapes,
            device=conv_args.device,
        )
        onnx_model_paths.append(output_path)

    # Step 2. (optional, recommended) quantize the converted model for fast inference and to reduce model size.
    if conv_args.quantize:
        quantize(onnx_model_paths)


if __name__ == '__main__':
    main()
