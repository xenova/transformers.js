# Support exporting vision and text models separately:
# Adapted from https://github.com/huggingface/optimum/issues/1186#issuecomment-1637641760

from optimum.exporters.onnx.model_configs import CLIPTextOnnxConfig, ViTOnnxConfig
from typing import Dict


class CLIPVisionOnnxConfig(ViTOnnxConfig):
    pass


class CLIPTextModelWithProjectionOnnxConfig(CLIPTextOnnxConfig):
    @property
    def outputs(self) -> Dict[str, Dict[int, str]]:
        return {
            "text_embeds": {0: "batch_size"},
        }


class CLIPVisionModelWithProjectionOnnxConfig(CLIPVisionOnnxConfig):
    @property
    def outputs(self) -> Dict[str, Dict[int, str]]:
        return {
            "image_embeds": {0: "batch_size"},
        }
