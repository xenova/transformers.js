from optimum.exporters.onnx.model_configs import WhisperOnnxConfig

from optimum.exporters.onnx.base import ConfigBehavior
from typing import Dict


class CustomWhisperOnnxConfig(WhisperOnnxConfig):
    @property
    def outputs(self) -> Dict[str, Dict[int, str]]:
        common_outputs = super().outputs

        if self._behavior is ConfigBehavior.ENCODER:
            for i in range(self._config.encoder_layers):
                common_outputs[f"encoder_attentions.{i}"] = {0: "batch_size"}
        elif self._behavior is ConfigBehavior.DECODER:
            for i in range(self._config.decoder_layers):
                common_outputs[f"decoder_attentions.{i}"] = {
                    0: "batch_size", 3: "decoder_sequence_length"}
            for i in range(self._config.decoder_layers):
                common_outputs[f"cross_attentions.{i}"] = {
                    0: "batch_size", 3: "cross_attention_length"}

        return common_outputs

    @property
    def torch_to_onnx_output_map(self):
        if self._behavior is ConfigBehavior.ENCODER:
            # The encoder export uses WhisperEncoder that returns the key "attentions"
            return {"attentions": "encoder_attentions"}
        else:
            return {}


def get_main_export_kwargs(config, task):

    custom_config = CustomWhisperOnnxConfig(config=config, task=task)

    custom_onnx_configs = dict(
        encoder_model=custom_config.with_behavior("encoder"),
        decoder_model=custom_config.with_behavior("decoder", use_past=False),
        decoder_with_past_model=custom_config.with_behavior(
            "decoder", use_past=True),
    )

    return dict(
        model_kwargs={"output_attentions": True},
        custom_onnx_configs=custom_onnx_configs,
    )
