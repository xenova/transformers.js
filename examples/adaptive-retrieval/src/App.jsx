import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

const PLACEHOLDER_TEXTS = [
  "A panda is a large black-and-white bear native to China.",
  "The typical life span of a panda is 20 years in the wild.",
  "A panda's diet consists almost entirely of bamboo.",
  "Ailuropoda melanoleuca is a bear species endemic to China.",
  "I love pandas so much!",
  "Bamboo is a fast-growing, woody grass.",
  "My favorite movie is Kung Fu Panda.",
  "I love the color blue.",
  "Once upon a time, in a land far, far away...",
  "Hello world.",
  "This is an example sentence.",
].sort(() => Math.random() - 0.5);

function normalize(embedding) {
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}

function dot(a, b) {
  return a.reduce((acc, val, i) => acc + val * b[i], 0);
}

function App() {
  const [status, setStatus] = useState('idle');

  const [source, setSource] = useState('What is a panda?');
  const [text, setText] = useState(PLACEHOLDER_TEXTS.join('\n'));

  const [dimensions, setDimensions] = useState(768);

  const [embeddings, setEmbeddings] = useState([]);
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
      if (status === 'initiate') {
        setStatus('loading');
      } else if (status === 'ready') {
        setStatus('ready');
      } else if (status === 'complete') {
        const embeddings = e.data.embeddings;
        setDimensions(embeddings[0].length);
        setEmbeddings(embeddings);
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
      source,
      text,
    });
  }, [source, text])

  useEffect(() => {
    if (embeddings.length === 0) return;
    const slicedEmbeddings = embeddings.map(x => normalize(x.slice(0, dimensions)));

    const sourceEmbedding = slicedEmbeddings[0];
    const sentenceEmbeddings = slicedEmbeddings.slice(1);

    // Compute the cosine similarity between the source sentence and the other sentences.
    // NOTE: Since vectors are normalized, we use the dot product.
    const similarities = sentenceEmbeddings.map((embedding) => dot(sourceEmbedding, embedding));

    setResults(text.trim().split('\n').map((sentence, i) => ({
      sentence,
      similarity: similarities[i]
    })).sort((a, b) => b.similarity - a.similarity));
  }, [text, embeddings, dimensions])

  const busy = status !== 'idle';

  return (
    <div className='flex flex-col h-full'>
      <h1 className='text-2xl md:text-4xl font-bold text-center mb-1'>Adaptive Retrieval w/ Matryoshka Embeddings</h1>
      <p className='text-lg md:text-xl font-medium text-center mb-2'>Powered by <a href='https://huggingface.co/nomic-ai/nomic-embed-text-v1.5'>Nomic Embed v1.5</a> and <a href='http://huggingface.co/docs/transformers.js'>🤗 Transformers.js</a></p>
      <div className='flex-grow flex flex-wrap p-4'>
        <div className='flex flex-col items-center gap-y-1 w-full md:w-1/2'>
          <label className='text-lg font-medium'>Query</label>
          <textarea
            placeholder='Enter source sentence.'
            className='border w-full p-1 resize-none overflow-hidden h-10'
            value={source}
            onChange={e => {
              setSource(e.target.value);
              setResults([]);
              setEmbeddings([]);
            }}
          ></textarea>
          <label className='text-lg font-medium mt-1'>Text</label>
          <textarea
            placeholder='Enter sentences to compare with the source sentence. One sentence per line.'
            className='border w-full p-1 h-full resize-none'
            value={text}
            onChange={e => {
              setText(e.target.value);
              setResults([]);
              setEmbeddings([]);
            }}
          ></textarea>

          <button
            className='border py-1 px-2 bg-blue-400 rounded text-white text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed'
            disabled={busy}
            onClick={run}>{
              !busy
                ? (embeddings.length === 0 ? 'Compute Embeddings' : 'Recompute Embeddings')
                : status === 'loading'
                  ? 'Model loading...'
                  : 'Processing'
            }</button>
        </div>
        <div className='flex flex-col items-center w-full md:w-1/2 gap-y-1'>
          {embeddings.length > 0 && (<>
              <label className='text-lg font-medium'>Dimensions</label>
              <input
                type="range"
                min="64"
                max="768"
                step="1"
                value={dimensions}
                onChange={e => {
                  setDimensions(e.target.value);
                }}
                className="w-[98%] h-[10px]"
              />
              <p className="font-bold text-sm">{dimensions}</p>
              <div className='w-full flex flex-col gap-y-1'>
                <label className='text-lg font-medium text-center mt-1'>Results</label>
                <div className='flex flex-col gap-y-1'>
                  {results.map((result, i) => (
                    <div key={i} className='flex gap-x-2 border mx-2 p-1'>
                      <span className='font-bold'>{result.similarity.toFixed(3)}</span>
                      <span>{result.sentence}</span>
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
