
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
    T5ForConditionalGeneration
} from "./models.js";


if (typeof window === 'undefined') {
    // We are running in a web worker

} else {
    // We are running in the main thread

    // First, we set the wasm path to point to the directory which contains this file.
    // https://stackoverflow.com/a/42594856
    let scriptPath = (() => {
        return new Error().stack.match(/([^ \n])*([a-z]*:\/\/\/?)*?[a-z0-9\/\\]*\.js/ig)[0]
    })();
    let scriptFolder = (new URL(scriptPath)).pathname;
    ort.env.wasm.wasmPaths = scriptFolder.substring(0, scriptFolder.lastIndexOf('/') + 1);
    console.log(`Set ort.env.wasm.wasmPaths to ${ort.env.wasm.wasmPaths}`);

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
    window.AutoModelForMaskedLM = AutoModelForMaskedLM

    window.T5ForConditionalGeneration = T5ForConditionalGeneration

}

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
    T5ForConditionalGeneration,

    // other
};