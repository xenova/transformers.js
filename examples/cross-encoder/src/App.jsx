import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

const PLACEHOLDER_TEXTS = [
  "'To Kill a Mockingbird' is a novel by Harper Lee published in 1960. It was immediately successful, winning the Pulitzer Prize, and has become a classic of modern American literature.",
  "The novel 'Moby-Dick' was written by Herman Melville and first published in 1851. It is considered a masterpiece of American literature and deals with complex themes of obsession, revenge, and the conflict between good and evil.",
  "Harper Lee, an American novelist widely known for her novel 'To Kill a Mockingbird', was born in 1926 in Monroeville, Alabama. She received the Pulitzer Prize for Fiction in 1961.",
  "Jane Austen was an English novelist known primarily for her six major novels, which interpret, critique and comment upon the British landed gentry at the end of the 18th century.",
  "The 'Harry Potter' series, which consists of seven fantasy novels written by British author J.K. Rowling, is among the most popular and critically acclaimed books of the modern era.",
  "'The Great Gatsby', a novel written by American author F. Scott Fitzgerald, was published in 1925. The story is set in the Jazz Age and follows the life of millionaire Jay Gatsby and his pursuit of Daisy Buchanan."
].sort(() => Math.random() - 0.5);

function App() {
  const [status, setStatus] = useState('idle');

  const [query, setQuery] = useState(`Who wrote 'To Kill a Mockingbird'?`);
  const [documents, setDocuments] = useState(PLACEHOLDER_TEXTS.join('\n'));

  const [results, setResults] = useState([]);

  // Create a reference to the worker object.
  const worker = useRef(null);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module'
      });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      const status = e.data.status;
      if (e.data.file?.endsWith('.onnx')) {
        if (status === 'initiate') {
          setStatus('loading');
        } else if (status === 'done') {
          setStatus('ready');
        }
      } else if (status === 'complete') {
        setResults(e.data.output);
        setStatus('idle');
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current.removeEventListener('message', onMessageReceived);
  }, []);

  const run = useCallback(() => {
    setStatus('processing');
    worker.current.postMessage({
      query,
      documents,
    });
  }, [query, documents])

  const busy = status !== 'idle';

  return (
    <div className='flex flex-col h-full'>
      <h1 className='text-2xl md:text-4xl font-bold text-center mb-1'>Reranking w/ The Crispy mixedbread Rerank Models</h1>
      <p className='text-lg md:text-xl font-medium text-center mb-2'>Powered by <a href='https://huggingface.co/mixedbread-ai/mxbai-rerank-xsmall-v1' target='_blank' rel='noreferrer'>mxbai-rerank-xsmall-v1</a> and <a href='http://huggingface.co/docs/transformers.js' target='_blank' rel='noreferrer'>🤗 Transformers.js</a></p>
      <div className='flex-grow flex flex-wrap p-4'>
        <div className='flex flex-col items-center gap-y-1 w-full md:w-1/2'>
          <label className='text-lg font-medium'>Query</label>
          <textarea
            placeholder='Enter query.'
            className='border w-full p-1 resize-none overflow-hidden h-10'
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setResults([]);
            }}
          ></textarea>
          <label className='text-lg font-medium mt-1'>Documents</label>
          <textarea
            placeholder='Enter documents to compare with the query. One sentence per line.'
            className='border w-full p-1 h-full resize-none'
            value={documents}
            onChange={e => {
              setDocuments(e.target.value);
              setResults([]);
            }}
          ></textarea>

          <button
            className='border py-1 px-2 bg-green-400 rounded text-white text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed'
            disabled={busy}
            onClick={run}>{
              !busy
                ? 'Rerank'
                : status === 'loading'
                  ? 'Model loading...'
                  : 'Processing'
            }</button>
        </div>
        <div className='flex flex-col items-center w-full md:w-1/2 gap-y-1'>
          {results.length > 0 && (<>
            <div className='w-full flex flex-col gap-y-1'>
              <label className='text-lg font-medium text-center'>Results</label>
              <div className='flex flex-col gap-y-1'>
                {results.map((result, i) => (
                  <div key={i} className='flex gap-x-2 border mx-2 p-1'>
                    <span className='font-bold'>{result.score.toFixed(3)}</span>
                    <span>{result.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </>)
          }
        </div>
      </div>
    </div>
  )
}

export default App
