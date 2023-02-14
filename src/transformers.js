
import { PreTrainedTokenizer } from "./tokenizers.js";
import { PreTrainedModel } from "./models.js";


// Allow global access to these variables
window.PreTrainedTokenizer = PreTrainedTokenizer
window.PreTrainedModel = PreTrainedModel

export { PreTrainedTokenizer, PreTrainedModel};