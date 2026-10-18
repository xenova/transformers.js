import { PreTrainedModel } from '../modeling_utils.js';
import { Qwen3VLForConditionalGeneration } from '../qwen3_vl/modeling_qwen3_vl.js';

// Multimodal Qwen3.5 (vision-language) — reuses the Qwen3-VL chain.
export class Qwen3_5ForConditionalGeneration extends Qwen3VLForConditionalGeneration {}
export class Qwen3_5ForCausalLM extends Qwen3_5ForConditionalGeneration {}

// Text-only hybrid decoder (`qwen3_5_text`): linear-attention layers (conv + recurrent
// state) interleaved with full-attention layers (KV cache). The hybrid cache is handled
// generically from the ONNX I/O names (see `getCacheNames` in configs.js and
// modeling_utils.js), so the model classes only extend `PreTrainedModel`.
export class Qwen3_5TextPreTrainedModel extends PreTrainedModel {}
export class Qwen3_5TextModel extends Qwen3_5TextPreTrainedModel {}
export class Qwen3_5TextForCausalLM extends Qwen3_5TextPreTrainedModel {}
