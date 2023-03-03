
const {
    AutoTokenizer,
    BertTokenizer,
    DistilBertTokenizer,
    T5Tokenizer,
    GPT2Tokenizer
} = require("./tokenizers.js");
const {
    AutoModel,
    AutoModelForSequenceClassification,
    AutoModelForSeq2SeqLM,
    AutoModelForCausalLM,
    AutoModelForMaskedLM,
    AutoModelForQuestionAnswering,
    T5ForConditionalGeneration
} = require("./models.js");
const {
    pipeline
} = require("./pipelines.js");
const { env } = require('onnxruntime-web');

const moduleExports = {
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

// Allow global access to these variables
if (typeof self !== 'undefined') {
    // Used by web workers
    Object.assign(self, moduleExports);
}

// Used by other modules
module.exports = moduleExports