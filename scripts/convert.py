
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
    ]
}


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

    # 1. Load config
    model_config = AutoConfig.from_pretrained(input_model_folder)

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
    if model_config.model_type == 't5':
        from .models.t5 import generate_onnx_representation, quantize

        onnx_model_paths = generate_onnx_representation(
            model_config,
            input_model_folder,
            output_model_folder
        )

    else:  # Not T5 - use optimum

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

        else:

            export(
                model=model,
                config=onnx_config,
                output=Path(os.path.join(output_model_folder, 'model.onnx')),
                opset=conv_args.opset,
                input_shapes=input_shapes,
                device=conv_args.device,
            )

    # Step 2. (optional, recommended) quantize the converted model for fast inference and to reduce model size.
    if conv_args.quantize:
        quantize(onnx_model_paths)


if __name__ == '__main__':
    main()
