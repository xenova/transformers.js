import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { Token } from './components/Token'


function App() {
  // Allow user to set tokenizer and text via URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tokenizerParam = urlParams.get('tokenizer');
  const textParam = urlParams.get('text');

  const [tokenIds, setTokenIds] = useState([])
  const [decodedTokens, setDecodedTokens] = useState([])
  const [margins, setMargins] = useState([])
  const [outputOption, setOutputOption] = useState('text');
  const [tokenizer, setTokenizer] = useState(tokenizerParam ?? 'Xenova/gpt-4');

  const textareaRef = useRef(null);
  const outputRef = useRef(null);

  // Create a reference to the worker object.
  const worker = useRef(null);

  // We use the `useEffect` hook to set up the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module'
      });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      setTokenIds(e.data.token_ids)
      setDecodedTokens(e.data.decoded)
      setMargins(e.data.margins)
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current.removeEventListener('message', onMessageReceived);
  }, []);

  const onInputChange = useCallback((e) => {
    const model_id = tokenizer;
    const text = e.target.value;

    if (text.length > 10000) {
      setOutputOption(null);
      console.log('User most likely pasted in a large body of text (> 10k chars), so we hide the output (until specifically requested by the user).')
    }
    worker.current.postMessage({ model_id, text });
  }, [tokenizer]);

  useEffect(() => {
    if (textParam) {
      onInputChange({ target: { value: textParam } });
    }
  }, [onInputChange, textParam]);

  const onTokenizerChange = useCallback((e) => {
    const model_id = e.target.value;
    setTokenizer(model_id);
    worker.current.postMessage({ model_id, text: textareaRef.current.value });
  }, []);
  return (
    <div className='w-full max-w-[720px] flex flex-col gap-4 items-center'>

      <div>
        <h1 className='text-5xl font-bold mb-2'>The Tokenizer Playground</h1>
        <h2 className='text-lg font-normal'>Experiment with different tokenizers (running <a className="text-gray-900 underline" href="https://github.com/xenova/transformers.js">locally</a> in your browser).</h2>
      </div>


      <div>
        <select value={tokenizer} onChange={onTokenizerChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2">
          <option value="Xenova/gpt-4">gpt-4 / gpt-3.5-turbo / text-embedding-ada-002</option>
          <option value="Xenova/text-davinci-003">text-davinci-003 / text-davinci-002</option>
          <option value="Xenova/gpt-3">gpt-3</option>
          <option value="Xenova/grok-1-tokenizer">Grok-1</option>
          <option value="Xenova/claude-tokenizer">Claude</option>
          <option value="Xenova/mistral-tokenizer">Mistral</option>
          <option value="Xenova/gemma-tokenizer">Gemma</option>
          <option value="Xenova/llama-tokenizer">LLaMA / Llama 2</option>
          <option value="Xenova/c4ai-command-r-v01-tokenizer">Cohere Command-R</option>
          <option value="Xenova/t5-small">T5</option>
          <option value="Xenova/bert-base-cased">bert-base-cased</option>
        </select>
      </div>


      <textarea
        ref={textareaRef}
        onChange={onInputChange}
        rows="8"
        className="font-mono text-lg block w-full p-2.5 text-gray-900 bg-gray-50 rounded-lg border border-gray-200"
        placeholder="Enter some text"
        defaultValue={textParam ?? textareaRef.current?.value ?? ''}
      ></textarea>

      <div className='flex justify-center gap-5'>
        <div className='flex flex-col'>
          <h2 className='font-semibold uppercase leading-4'>Tokens</h2>
          <h3 className='font-semibold text-3xl'>{tokenIds.length.toLocaleString()}</h3>
        </div>
        <div className='flex flex-col'>
          <h2 className='font-semibold uppercase leading-4'>Characters</h2>
          <h3 className='font-semibold text-3xl'>{(textareaRef.current?.value.length ?? 0).toLocaleString()}</h3>
        </div>
      </div>

      <div ref={outputRef} className='font-mono text-lg p-2.5 w-full bg-gray-100 rounded-lg border border-gray-200 whitespace-pre-wrap text-left h-[200px] overflow-y-auto'>
        {outputOption === 'text' ? (
          decodedTokens.map(
            (token, index) => <Token key={index} text={token} position={index} margin={margins[index]} />
          )
        ) : outputOption === 'token_ids' ? (
          `[${tokenIds.join(', ')}]`
        ) : null}
      </div>

      <div className="flex items-center gap-2 self-end">
        <div className="flex items-center">
          <input checked={outputOption === 'text'} onChange={() => setOutputOption('text')} id="output-radio-1" type="radio" value="" name="output-radio" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500" />
          <label htmlFor="output-radio-1" className="ml-1 text-sm font-medium text-gray-900 dark:text-gray-300">Text</label>
        </div>
        <div className="flex items-center">
          <input checked={outputOption === 'token_ids'} onChange={() => setOutputOption('token_ids')} id="output-radio-2" type="radio" value="" name="output-radio" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500" />
          <label htmlFor="output-radio-2" className="ml-1 text-sm font-medium text-gray-900 dark:text-gray-300">Token IDs</label>
        </div>
        <div className="flex items-center">
          <input checked={outputOption === null} onChange={() => setOutputOption(null)} id="output-radio-3" type="radio" value="" name="output-radio" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500" />
          <label htmlFor="output-radio-3" className="ml-1 text-sm font-medium text-gray-900 dark:text-gray-300">Hide</label>
        </div>
      </div>
    </div >
  )
}

export default App
