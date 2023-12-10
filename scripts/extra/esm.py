from transformers.convert_slow_tokenizer import Converter
from tokenizers import Tokenizer, decoders, pre_tokenizers, processors
from tokenizers.models import WordPiece

class EsmConverter(Converter):
    def converted(self) -> Tokenizer:
        vocab = self.original_tokenizer.vocab
        tokenizer = Tokenizer(WordPiece(vocab, continuing_subword_prefix='', max_input_chars_per_word=int(1e10), unk_token=str(self.original_tokenizer.unk_token)))

        tokenizer.pre_tokenizer = pre_tokenizers.BertPreTokenizer()
        
        cls = str(self.original_tokenizer.cls_token)
        cls_token_id = self.original_tokenizer.cls_token_id
        sep = str(self.original_tokenizer.eos_token)  # No sep token in ESM vocabulary
        sep_token_id = self.original_tokenizer.eos_token_id

        if sep_token_id is None:
          tokenizer.post_processor = processors.TemplateProcessing(
              single=f"{cls}:0 $A:0",
              special_tokens=[
                  (cls, cls_token_id),
              ],
          )
        else:
          tokenizer.post_processor = processors.TemplateProcessing(
              single=f"{cls}:0 $A:0 {sep}:0",
              special_tokens=[
                  (cls, cls_token_id),
                  (sep, sep_token_id),
              ],
          )
        tokenizer.decoder = decoders.WordPiece(prefix="")

        tokenizer.add_special_tokens([
           x for x in vocab.keys()
           if x[0] == '<' and x[-1] == '>'
        ])

        return tokenizer

def generate_fast_tokenizer(tokenizer):
    tokenizer.vocab = tokenizer._token_to_id
    return EsmConverter(tokenizer).converted()
