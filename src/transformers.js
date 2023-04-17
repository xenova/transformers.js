
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
    AutoModelForTokenClassification,
    AutoModelForSeq2SeqLM,
    AutoModelForCausalLM,
    AutoModelForMaskedLM,
    AutoModelForQuestionAnswering,
    AutoModelForVision2Seq,
    AutoModelForImageClassification,
    AutoModelForObjectDetection,
} = require("./models.js");

const {
    AutoProcessor
} = require("./processors.js");
const {
    pipeline
} = require("./pipelines.js");
const { env } = require('./env.js');

const { Tensor } = require('./tensor_utils.js');

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
    AutoModelForTokenClassification,
    AutoModelForCausalLM,
    AutoModelForMaskedLM,
    AutoModelForQuestionAnswering,
    AutoModelForVision2Seq,
    AutoModelForImageClassification,
    AutoModelForObjectDetection,

    // Processors
    AutoProcessor,

    // other
    pipeline,
    Tensor,

    // environment variables
    env
};

// Allow global access to these variables
if (typeof self !== 'undefined') {
    // Used by web workers
    Object.assign(self, moduleExports);
}

// Used by other modules
module.exports = moduleExports
