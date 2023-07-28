import { useState, useRef, useEffect } from "react";

import Editor from "@monaco-editor/react";

import './App.css'


const MODELS = [
  'Xenova/tiny_starcoder_py',
  'Xenova/codegen-350M-mono',
  // 'Xenova/starcoderbase-1b',
]
function App() {
  // Editor setup
  const monaco = useRef(null);
  const [monacoReady, setMonacoReady] = useState(false);
  const [language, setLanguage] = useState('python');

  // Model loading
  const [ready, setReady] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState([]);

  // Inputs and outputs
  const [model, setModel] = useState(MODELS[0]); // 
  const [maxNewTokens, setMaxNewTokens] = useState(50);
  const [code, setCode] = useState('\ndef fib(n):\n    """Calculates the nth Fibonacci number"""\n');

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
      switch (e.data.status) {
        case 'initiate':
          // Model file start load: add a new progress item to the list.
          setReady(false);
          setProgressItems(prev => [...prev, e.data]);
          break;

        case 'progress':
          // Model file progress: update one of the progress items.
          setProgressItems(
            prev => prev.map(item => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress }
              }
              return item;
            })
          );
          break;

        case 'done':
          // Model file loaded: remove the progress item from the list.
          setProgressItems(
            prev => prev.filter(item => item.file !== e.data.file)
          );
          break;

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setReady(true);
          break;

        case 'update':
          // Generation update: update the output text.
          setCode(e.data.output);
          break;

        case 'complete':
          // Generation complete: re-enable the "Translate" button
          setDisabled(false);
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current.removeEventListener('message', onMessageReceived);
  });


  useEffect(() => {
    const m = monaco.current;
    if (!m) return;

    let actionRegistration = m.addAction({
      id: "generate",
      label: "Generate",
      // keybindings: [m.KeyMod.CtrlCmd | m.KeyCode.KEY_V],
      contextMenuGroupId: "0_custom",
      run: () => {
        const val = m.getValue();
        if (!val) return;

        worker.current.postMessage({
          model,
          text: val,
          max_new_tokens: maxNewTokens,
        });
      }
    });

    // Define a cleanup function for when the component is unmounted.
    return () => actionRegistration.dispose();
  }, [monacoReady, model, maxNewTokens]);

  // Function to handle changes to the range slider
  const handleSliderChange = (event) => {
    const newValue = parseInt(event.target.value);
    setMaxNewTokens(newValue);
  };

  return (
    <div className="flex h-screen w-screen">
      <div>
        <Editor
          width="calc(100vw - 300px)"
          language={language}
          value={code}
          theme="vs-dark"
          onMount={m => {
            monaco.current = m;
            setMonacoReady(true);
          }}
          options={{
            fontSize: 24
          }}
        />
      </div>
      <div className="flex-grow sidebar p-4 flex flex-col">

        <label className="pt-3">Model:</label>
        <select value={model} onChange={e => setModel(e.target.value)} className="p-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg">
          {MODELS.map((value, i) => {
            return <option key={i} value={value}>{value}</option>
          })}
        </select>

        <div className="pt-3 flex justify-between">
          <label>Max new tokens:</label>
          <label>{maxNewTokens}</label>
        </div>
        <input
          type="range"
          min="1"
          max="512"
          value={maxNewTokens}
          onChange={handleSliderChange}
        />

        <div className="flex-grow"></div>

        <div className="text-center">
          Made with&nbsp; <a className="text-white font-medium underline underline-offset-1" href="https://github.com/xenova/transformers.js">🤗 Transformers.js</a>
        </div>
      </div>
    </div>
  );
}

export default App;
