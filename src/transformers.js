
import { AutoTokenizer } from "./tokenizers.js";
import { AutoModel } from "./models.js";


// Allow global access to these variables
window.AutoTokenizer = AutoTokenizer
window.AutoModel = AutoModel

export { AutoTokenizer, AutoModel };