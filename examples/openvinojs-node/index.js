main();

async function main() {
  const { pipeline } = await import('../../src/transformers.js');
  const modelPath = 'chgk13/decicoder-1b-openvino-int8';

  const generation = await pipeline(
    'text-generation',
    modelPath,
    { 'model_file_name': ['openvino_model.xml', 'openvino_model.bin'] },
  );

  console.time('Output time:');
  const out = await generation('def fib(n):', {
    'max_new_tokens': 100,
    'callback_function': x => {
      console.log({
        output: generation.tokenizer.decode(x[0]['output_token_ids'])
      });
    }
  });
  console.timeEnd('Output time:');

  console.log(out);
}
