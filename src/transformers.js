
import { AutoTokenizer, T5Tokenizer } from "./tokenizers.js";
import { AutoModel } from "./models.js";


// Allow global access to these variables
window.AutoTokenizer = AutoTokenizer
window.T5Tokenizer = T5Tokenizer


window.AutoModel = AutoModel

export { AutoTokenizer, T5Tokenizer, AutoModel };