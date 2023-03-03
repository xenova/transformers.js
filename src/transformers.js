
import {
    AutoTokenizer,
    BertTokenizer,
    DistilBertTokenizer,
    T5Tokenizer,
    GPT2Tokenizer
} from "./tokenizers.js";
import {
    AutoModel,
    AutoModelForSequenceClassification,
    AutoModelForSeq2SeqLM,
    AutoModelForCausalLM,
    AutoModelForMaskedLM,
    AutoModelForQuestionAnswering,
    T5ForConditionalGeneration
} from "./models.js";
import {
    pipeline
} from "./pipelines.js";
import { env } from 'onnxruntime-web'


// Allow global access to these variables
self.AutoTokenizer = AutoTokenizer
self.BertTokenizer = BertTokenizer
self.DistilBertTokenizer = DistilBertTokenizer
self.T5Tokenizer = T5Tokenizer
self.GPT2Tokenizer = GPT2Tokenizer

self.AutoModel = AutoModel
self.AutoModelForSeq2SeqLM = AutoModelForSeq2SeqLM
self.AutoModelForSequenceClassification = AutoModelForSequenceClassification
self.AutoModelForCausalLM = AutoModelForCausalLM
self.AutoModelForMaskedLM = AutoModelForMaskedLM
self.AutoModelForQuestionAnswering = AutoModelForQuestionAnswering

self.T5ForConditionalGeneration = T5ForConditionalGeneration

self.pipeline = pipeline
self.env = env

export {
    // Tokenizers
    AutoTokenizer,
    BertTokenizer,
    DistilBertTokenizer,
    T5Tokenizer,
    GPT2Tokenizer,

    // Models
    AutoModel,
    AutoModelForSeq2SeqLM,
    AutoModelForSequenceClassification,
    AutoModelForCausalLM,
    AutoModelForMaskedLM,
    AutoModelForQuestionAnswering,
    T5ForConditionalGeneration,

    // other
    pipeline,

    // onnx runtime web env
    env
};