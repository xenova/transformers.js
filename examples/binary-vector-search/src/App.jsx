import { useState, useRef, useEffect, useCallback } from 'react'
// import './App.css'

const placeholder_texts = [
  'hello',
  'hi',
  'banana'
];

function App() {

  const [status, setStatus] = useState('idle');
  const [embeddings, setEmbeddings] = useState([]);
  const [texts, setTexts] = useState(placeholder_texts);

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
        setEmbeddings(embeddings);
        setStatus('idle');
      } else if (status === 'progress') {
        console.log(e.data.progress);
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
      texts,
    });
  }, [texts])


  const handleTextChange = useCallback((index) => (e) => {
    setTexts((prevTexts) => prevTexts.map((text, i) => (i === index ? e.target.value : text)));
  }, []);

  function hamming_distance(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        throw new Error("Typed arrays must have the same length");
    }

    let distance = 0;

    // Iterate over each byte in the typed arrays
    for (let i = 0; i < arr1.length; ++i) {
        // XOR the bytes to find differing bits
        let xorResult = arr1[i] ^ arr2[i];

        // Count set bits in the XOR result using Brian Kernighan's Algorithm
        while (xorResult) {
            ++distance;
            xorResult &= xorResult - 1;
        }
    }

    return distance;
}

  // Generate similarity info dynamically from embeddings
  const generateSimilarityInfo = () => {
    let similarityInfo = [];
    const pairs = [[0, 1], [0, 2], [1, 2]];
    for (const [i, j] of pairs) {
        const distance = hamming_distance(embeddings[i], embeddings[j]);
        similarityInfo.push(`${texts[i]} <-> ${texts[j]} | ${distance}`);
    }
    // MESSAGE TO CHATGPT the current approach is not what i want since it outputs the brackets and the quotation marks
    // we need it to be something like each lien is separated by newline 
    // like in raw html we would done &#10; but that doesnt work here since its being called by function
    return similarityInfo.join('\n');
  };


  const busy = status !== 'idle';

  return (
    <div className="flex flex-row justify-center items-center w-screen h-screen px-4">
      
      <div className="w-screen max-w-screen-xl">
      <div className="text-xl font-bold flex flex-row justify-center items-center mb-4">
        Transformers.js binary embedddings
      </div>
      <div className="flex flex-col items-center justify-center">
        {texts.map((text, index) => (
          <textarea
            key={index}
            className="w-full p-2 mb-4 border border-gray-300 rounded"
            rows={1}
            value={text}
            onChange={handleTextChange(index)}
          />
        ))}
      </div>
      <button
        className='border py-1 px-2 bg-slate-900 rounded text-white text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed'
        disabled={busy}
        onClick={run}>{
          !busy
            ? (embeddings.length === 0 ? 'Compute Embeddings' : 'Recompute Embeddings')
            : status === 'loading'
              ? 'Model loading...'
              : 'Processing'
        }</button>

      {embeddings.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Embeddings:</h2>
            
            <div className="flex flex-col gap-4">
            {embeddings.map((embedding, index) => (
              <div className="w-full">
                <h1 className="text-sm font-bold">{texts[index]}</h1>
                <textarea
                key={index}
                className="w-full"
                value={JSON.stringify(embedding, null)}
              >
              </textarea>
              </div>
            ))}
            </div>

            <div className="">
              <h2 className="text-xl font-bold mb-4">Similarity:</h2>
              <div class="relative overflow-auto">
                <pre class="bg-gray-900 text-white font-mono text-xs p-4 rounded">
                  <code>
                    {generateSimilarityInfo()}
                 </code>
                </pre>
                <div class="absolute right-0 top-0">
                  <button class="bg-gray-800 text-gray-300 hover:text-white border border-gray-700 rounded p-1 m-2 text-xs flex items-center justify-center" aria-label="Copy" tabindex="0">
                    copy
                  </button>
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
    </div>
  )
}

export default App
