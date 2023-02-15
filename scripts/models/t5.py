

from onnxruntime.quantization import quantize_dynamic, QuantType
from tqdm import tqdm
from transformers import (
    T5ForConditionalGeneration,
    MT5ForConditionalGeneration,
)
import torch
import functools
import operator
import os

import torch


class DecoderWithLMhead(torch.nn.Module):
    """ Creation of a class to combine the decoder and the lm head """

    def __init__(self, decoder, lm_head, config):
        super().__init__()
        self.decoder = decoder
        self.lm_head = lm_head
        self.config = config

    def forward(self, *inputs):

        input_ids, attention_mask, encoder_hidden_states = inputs[:3]

        list_pkv = inputs[3:]
        past_key_values = tuple(list_pkv[i: i + 4]
                                for i in range(0, len(list_pkv), 4))

        decoder_output = self.decoder(
            input_ids=input_ids,  # decoder_input_ids
            encoder_attention_mask=attention_mask,
            encoder_hidden_states=encoder_hidden_states,
            past_key_values=past_key_values,
        )

        lm_head_out = self.lm_head(
            decoder_output[0] * (self.config.d_model ** -0.5))

        return lm_head_out, decoder_output[1]


class T5Encoder(torch.nn.Module):
    """ Creation of a class to output only the last hidden state from the encoder """

    def __init__(self, encoder):
        super().__init__()
        self.encoder = encoder

    def forward(self, *input, **kwargs):
        return self.encoder(*input, **kwargs)[0]


class DecoderWithLMheadInitial(torch.nn.Module):
    """ Creation of a class to combine the decoder and the lm head """

    def __init__(self, decoder, lm_head, config):
        super().__init__()
        self.decoder = decoder
        self.lm_head = lm_head
        self.config = config

    def forward(self, input_ids, attention_mask, encoder_hidden_states):
        decoder_output = self.decoder(
            input_ids=input_ids,
            encoder_attention_mask=attention_mask,
            encoder_hidden_states=encoder_hidden_states,
        )

        return (
            self.lm_head(decoder_output[0] * (self.config.d_model ** -0.5)),
            decoder_output[1],
        )


def create_t5_encoder_decoder(pretrained_version):
    """Generates an encoder and a decoder model with a language model head from a pretrained huggingface model

    Args:
        pretrained_version (str): Name of a pretrained model, or path to a pretrained / finetuned version of T5

    Returns:
        simplified_encoder: pytorch t5 encoder with a wrapper to output only the hidden states
        decoder_with_lm_head: pytorch t5 decoder with a language modeling head
    """

    if 'mt5' in pretrained_version:
        model = MT5ForConditionalGeneration.from_pretrained(
            pretrained_version)
    else:
        model = T5ForConditionalGeneration.from_pretrained(
            pretrained_version)

    return turn_model_into_encoder_decoder(model)


def turn_model_into_encoder_decoder(model):
    encoder = model.encoder
    decoder = model.decoder
    lm_head = model.lm_head

    decoder_with_lm_head = DecoderWithLMhead(decoder, lm_head, model.config)
    simplified_encoder = T5Encoder(encoder)
    decoder_with_lm_head_init = DecoderWithLMheadInitial(
        decoder, lm_head, model.config)

    return simplified_encoder, decoder_with_lm_head, decoder_with_lm_head_init


def generate_onnx_representation(
    model_config,
    input_path,
    output_path,
    input_sequence_length=256,
    onnx_opset_version=12,  # no other opset versions are tested, change at your own risk
):
    """
    Exports a given huggingface pretrained model, or a given model and tokenizer, to onnx
    """

    (
        simplified_encoder,
        decoder_with_lm_head,
        decoder_with_lm_head_init,
    ) = create_t5_encoder_decoder(input_path)

    # model paths for enc, dec and dec_init
    encoder_path = os.path.join(output_path, 'encoder_model.onnx')
    decoder_path = os.path.join(output_path, 'decoder_model.onnx')
    init_decoder_path = os.path.join(
        output_path, 'decoder_with_past_model.onnx')

    # Though these are dummy inputs, ORT optimizations do reference these values,
    # so it is worth using values as close to production as possible
    batch_size = 1  # not configurable since only CPU
    enc_seq_length = input_sequence_length
    # a decoder sequence length is always one because it's just the last generated token
    dec_seq_length = 1
    input_ids = torch.ones(batch_size, enc_seq_length, dtype=torch.int64)
    attention_mask = torch.ones(batch_size, enc_seq_length, dtype=torch.int64)

    n_heads = model_config.num_heads
    d_kv = model_config.d_kv

    input_ids_dec = torch.ones(batch_size, dec_seq_length, dtype=torch.int64)
    attention_mask_dec = torch.ones(
        batch_size, dec_seq_length, dtype=torch.int64)
    enc_out = torch.ones(
        (batch_size, enc_seq_length, model_config.d_model), dtype=torch.float32
    )

    # self_attention_past_key_values = torch.ones(
    #     (model_config.num_decoder_layers, 2, batch_size, n_heads, seq_length_a, d_kv), dtype=torch.float32)
    # cross_attention_past_key_values = torch.ones(
    #     (model_config.num_decoder_layers, 2, batch_size, n_heads, seq_length_b, d_kv), dtype=torch.float32)

    sa = torch.ones(
        (batch_size, n_heads, dec_seq_length, d_kv), dtype=torch.float32
    )  # 1, 8, 1, 64
    ca = torch.ones(
        (batch_size, n_heads, enc_seq_length, d_kv), dtype=torch.float32
    )  # 1, 8, variable, 64
    t5_block = (sa, sa, ca, ca)
    past_key_values = (t5_block,) * model_config.num_decoder_layers

    flat_past_key_values = functools.reduce(
        operator.iconcat, past_key_values, [])

    decoder_all_inputs = tuple(
        [input_ids_dec, attention_mask_dec, enc_out] + flat_past_key_values
    )

    # Exports to ONNX
    with torch.no_grad():

        decoder_inputs = [
            "input_ids",
            "encoder_attention_mask",
            "encoder_hidden_states",
        ]

        pkv_input_names = ["pkv_{}".format(
            i) for i in range(len(flat_past_key_values))]

        decoder_input_names = decoder_inputs + pkv_input_names

        decoder_output_names = ["logits", "output_past_key_values"]

        dyn_axis_general = {0: "batch", 1: "sequence"}
        dyn_axis_pkv = {0: "batch", 2: "seq_length"}

        dyn_axis = {
            "input_ids": dyn_axis_general,
            "encoder_attention_mask": dyn_axis_general,
            "encoder_hidden_states": dyn_axis_general,
            "logits": dyn_axis_general,
            "output_past_key_values": dyn_axis_general,
        }

        dyn_pkv = {
            "pkv_{}".format(i): dyn_axis_pkv
            for i in range(len(flat_past_key_values))
        }

        dyn_axis_params = {**dyn_axis, **dyn_pkv}

        # decoder to utilize past key values:
        torch.onnx.export(
            decoder_with_lm_head,
            decoder_all_inputs,
            decoder_path,
            export_params=True,
            do_constant_folding=True,
            opset_version=onnx_opset_version,
            input_names=decoder_input_names,
            output_names=decoder_output_names,
            dynamic_axes=dyn_axis_params,
        )

        torch.onnx.export(
            simplified_encoder,
            args=(input_ids, attention_mask),
            f=encoder_path,
            export_params=True,
            opset_version=onnx_opset_version,
            do_constant_folding=True,
            input_names=["input_ids", "attention_mask"],
            output_names=["hidden_states"],
            dynamic_axes={
                "input_ids": dyn_axis_general,
                "attention_mask": dyn_axis_general,
                "hidden_states": dyn_axis_general,
            },
        )
        # initial decoder to produce past key values
        torch.onnx.export(
            decoder_with_lm_head_init,
            (input_ids_dec, attention_mask_dec, enc_out),
            init_decoder_path,
            export_params=True,
            opset_version=onnx_opset_version,
            input_names=[
                "input_ids",
                "encoder_attention_mask",
                "encoder_hidden_states",
            ],
            output_names=["logits", "past_key_values"],
            dynamic_axes={
                # batch_size, seq_length = input_shape
                "input_ids": dyn_axis_general,
                "encoder_attention_mask": dyn_axis_general,
                "encoder_hidden_states": dyn_axis_general,
                "logits": dyn_axis_general,
                "past_key_values": dyn_axis_general,
            },
        )

    return encoder_path, decoder_path, init_decoder_path


def quantize(models_name_or_path):
    """
    Quantize the weights of the model from float32 to in8 to allow very efficient inference on modern CPU

    Uses unsigned ints for activation values, signed ints for weights, per
    https://onnxruntime.ai/docs/performance/quantization.html#data-type-selection
    it is faster on most CPU architectures
    Args:
        onnx_model_path: Path to location the exported ONNX model is stored
    Returns: The Path generated for the quantized
    """

    quant_model_paths = []
    for model in tqdm(models_name_or_path, desc='Quantizing'):
        # model_name = os.path.splitext(os.path.basename(model))[0]
        # output_model_name = f"{model_name}-quantized.onnx"
        quantize_dynamic(
            model_input=model,
            model_output=model,
            per_channel=True,
            reduce_range=True,  # should be the same as per_channel
            activation_type=QuantType.QUInt8,
            weight_type=QuantType.QInt8,  # per docs, signed is faster on most CPUs
            optimize_model=False,
        )  # op_types_to_quantize=['MatMul', 'Relu', 'Add', 'Mul' ],
        # quant_model_paths.append(output_model_name)

    return tuple(quant_model_paths)
