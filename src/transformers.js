
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
    T5ForConditionalGeneration
} from "./models.js";


// Allow global access to these variables
window.AutoTokenizer = AutoTokenizer
window.BertTokenizer = BertTokenizer
window.DistilBertTokenizer = DistilBertTokenizer
window.T5Tokenizer = T5Tokenizer
window.GPT2Tokenizer = GPT2Tokenizer

window.AutoModel = AutoModel
window.AutoModelForSeq2SeqLM = AutoModelForSeq2SeqLM
window.AutoModelForSequenceClassification = AutoModelForSequenceClassification
window.AutoModelForCausalLM = AutoModelForCausalLM

window.T5ForConditionalGeneration = T5ForConditionalGeneration

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
    T5ForConditionalGeneration
};