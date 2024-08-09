import { useEffect, useState, useRef } from 'react';

import Chat from './components/Chat';
import ArrowRightIcon from './components/icons/ArrowRightIcon';
import StopIcon from './components/icons/StopIcon';

const IS_AI_API_AVAILABLE = !!window.ai;
const STICKY_SCROLL_THRESHOLD = 120;


function App() {

  // Create a reference to the worker object.
  const worker = useRef(null);

  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Model loading and progress
  const [status, setStatus] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // Inputs and outputs
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [tps, setTps] = useState(null);
  const [numTokens, setNumTokens] = useState(null);

  function onEnter(message) {
    setMessages(prev => [
      ...prev,
      { role: 'user', content: message },
    ]);
    setTps(null);
    setIsRunning(true);
    setInput('');
  }

  useEffect(() => {
    resizeInput();
  }, [input]);

  function onInterrupt() {
    // NOTE: We do not set isRunning to false here because the worker
    // will send a 'complete' message when it is done.
    worker.current.postMessage({ type: 'interrupt' });
  }

  function resizeInput() {
    if (!textareaRef.current) return;

    const target = textareaRef.current;
    target.style.height = 'auto';
    const newHeight = Math.min(Math.max(target.scrollHeight, 24), 200);
    target.style.height = `${newHeight}px`;
  }

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
        case 'loading':
          // Model file start load: add a new progress item to the list.
          setStatus('loading');
          setLoadingMessage(e.data.data);
          break;

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setStatus('ready');
          break;

        case 'start': {
          // Start generation
          setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        }
          break;

        case 'update': {
          // Generation update: update the output text.
          // Parse messages
          const { output, tps, numTokens } = e.data;
          setTps(tps);
          setNumTokens(numTokens)
          setMessages(prev => {
            const cloned = [...prev];
            const last = cloned.at(-1);
            cloned[cloned.length - 1] = { ...last, content: last.content + output };
            return cloned;
          });
        }
          break;

        case 'complete':
          // Generation complete: re-enable the "Generate" button
          setIsRunning(false);
          break;

        case 'error':
          alert(e.data.data);
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);


    // Define a cleanup function for when the component is unmounted.
    return () => {
      worker.current.removeEventListener('message', onMessageReceived);
    };
  }, []);

  // Send the messages to the worker thread whenever the `messages` state changes.
  useEffect(() => {
    if (messages.filter(x => x.role === 'user').length === 0) {
      // No user messages yet: do nothing.
      return;
    }
    if (messages.at(-1).role === 'assistant') {
      // Do not update if the last message is from the assistant
      return;
    }
    setTps(null);
    worker.current.postMessage({ type: 'generate', data: messages });
  }, [messages, isRunning]);

  useEffect(() => {
    if (!chatContainerRef.current) return;
    if (isRunning) {
      const element = chatContainerRef.current;
      if (element.scrollHeight - element.scrollTop - element.clientHeight < STICKY_SCROLL_THRESHOLD) {
        element.scrollTop = element.scrollHeight;
      }
    }
  }, [messages, isRunning]);

  return (
    IS_AI_API_AVAILABLE
      ? (<div className="flex flex-col h-screen mx-auto items justify-end text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">

        {status === null && messages.length === 0 && (
          <div className="h-full overflow-auto scrollbar-thin flex justify-center items-center flex-col relative">
            <div className="flex flex-col items-center mb-1 max-w-[600px] text-center">
              <img src="logo.png" width="100%" height="auto" className="block max-w-[200px] m-2"></img>
              <h1 className="text-5xl font-bold mb-1">Built-in AI chat demo</h1>
              <h2 className="font-semibold">Run <a className="underline" href="https://deepmind.google/technologies/gemini/nano/" target="_blank" rel="noreferrer">Gemini Nano</a> locally in your browser with <a className="underline" href="https://huggingface.co/docs/transformers.js" target="_blank" rel="noreferrer">🤗 Transformers.js</a></h2>
            </div>

            <div className="flex flex-col items-center px-4">
              <div className="max-w-[608px] m-4">
                This demo uses Chrome&apos;s new <a href="https://developer.chrome.com/docs/ai/built-in" className="underline" target="_blank" rel="noreferrer">Built-in AI API</a> to run Gemini Nano, a 3.25 billion parameter LLM, locally in your browser. To use the model with Transformers.js, you can install our <a href="https://github.com/xenova/transformers.js/pull/840" className="underline" target="_blank" rel="noreferrer">experimental branch</a> from GitHub with:
                <span className="markdown"><pre><code className="language-javascript">
                  npm install xenova/transformers.js#chrome-built-in-ai
                </code></pre>
                </span>

                Followed by:
                <span className="font-mono">
                </span>

                <span className="markdown"><pre><code className="language-javascript">
                  import &#123; pipeline &#125; from &apos;@xenova/transformers&apos;;
                  <br />
                  const generator = await pipeline(&apos;text-generation&apos;, &apos;Xenova/gemini-nano&apos;);
                  <br />
                  const output = await generator(&apos;Tell me a joke!&apos;);
                </code></pre>
                </span>

                Since inference happens on-device, none of your conversations are sent to a server. You can even disconnect from the internet after the model has loaded. Try it out! 👇
              </div>

              <button
                className="border px-4 py-2 rounded-lg bg-blue-400 text-white hover:bg-blue-500 disabled:bg-blue-100 disabled:cursor-not-allowed select-none"
                onClick={() => {
                  worker.current.postMessage({ type: 'load' });
                  setStatus('loading');
                }}
                disabled={status !== null}
              >
                Load model
              </button>
            </div>
          </div>
        )}
        {status === 'loading' && (<>
          <div className="w-full max-w-[500px] text-left mx-auto p-4 bottom-0 mt-auto">
            <p className="text-center mb-1">{loadingMessage}</p>
          </div>
        </>)}

        {status === 'ready' && (<div
          ref={chatContainerRef}
          className="overflow-y-auto scrollbar-thin w-full flex flex-col items-center h-full"
        >
          <Chat messages={messages} />
          <p className="text-center text-sm min-h-6 text-gray-500 dark:text-gray-300">
            {tps && messages.length > 0 && (<>
              {!isRunning &&
                <span>Generated {numTokens} tokens in {(numTokens / tps).toFixed(2)} seconds&nbsp;&#40;</span>}
              {<>
                <span className="font-medium text-center mr-1 text-black dark:text-white">
                  {tps.toFixed(2)}
                </span>
                <span className="text-gray-500 dark:text-gray-300">tokens/second</span>
              </>}
              {!isRunning && <>
                <span className="mr-1">&#41;.</span>
                <span className="underline cursor-pointer" onClick={() => {
                  worker.current.postMessage({ type: 'reset' });
                  setMessages([]);
                }}>Reset</span>
              </>}
            </>)}
          </p>
        </div>)}

        <div className="mt-2 border dark:bg-gray-700 rounded-lg w-[600px] max-w-[80%] max-h-[200px] mx-auto relative mb-3 flex">
          <textarea
            ref={textareaRef}
            className="scrollbar-thin w-[550px] dark:bg-gray-700 px-3 py-4 rounded-lg bg-transparent border-none outline-none text-gray-800 disabled:text-gray-400 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 disabled:placeholder-gray-200 resize-none disabled:cursor-not-allowed"
            placeholder="Type your message..."
            type="text"
            rows={1}
            value={input}
            disabled={status !== 'ready'}
            title={status === 'ready' ? "Model is ready" : "Model not loaded yet"}
            onKeyDown={(e) => {
              if (input.length > 0 && !isRunning && (e.key === "Enter" && !e.shiftKey)) {
                e.preventDefault(); // Prevent default behavior of Enter key
                onEnter(input);
              }
            }}
            onInput={(e) => setInput(e.target.value)}
          />
          {isRunning
            ? (<div className="cursor-pointer" onClick={onInterrupt}>
              <StopIcon
                className="h-8 w-8 p-1 rounded-md text-gray-800 dark:text-gray-100 absolute right-3 bottom-3"
              />
            </div>)
            : input.length > 0
              ? (<div className="cursor-pointer" onClick={() => onEnter(input)}>
                <ArrowRightIcon
                  className={`h-8 w-8 p-1 bg-gray-800 dark:bg-gray-100 text-white dark:text-black rounded-md absolute right-3 bottom-3`}
                />
              </div>)
              : (<div>
                <ArrowRightIcon
                  className={`h-8 w-8 p-1 bg-gray-200 dark:bg-gray-600 text-gray-50 dark:text-gray-800 rounded-md absolute right-3 bottom-3`}
                />
              </div>)
          }
        </div>

        <p className="text-xs text-gray-400 text-center mb-3">
          Disclaimer: Generated content may be inaccurate or false.
        </p>
      </div>)
      : (
        <div className="fixed flex flex-col justify-center items-center w-screen h-screen text-lg">
          <p className="text-4xl mb-4 text-center">Your browser does not support <br /> the <a className="underline" href="https://developer.chrome.com/docs/ai/built-in" target="_blank" rel="noreferrer">built-in AI API</a> (<code>window.ai</code>)</p>
          <ul className="list-disc list-outside pl-8 max-w-[650px]">
            <li>Upgrade to Chrome (<a className="underline" href="https://www.google.com/chrome/dev/" target="_blank" rel="noreferrer">Dev</a> / <a className="underline" href="https://www.google.com/chrome/canary/" target="_blank" rel="noreferrer">Canary</a>) version 127 or higher.</li>
            <li>Enable the following experimental flags:
              <ul className="list-disc list-outside pl-8">
                <li>Set <code className="underline">chrome://flags/#prompt-api-for-gemini-nano</code> to &quot;Enabled&quot;</li>
                <li>Set <code className="underline">chrome://flags/#optimization-guide-on-device-model</code> to &quot;Enabled BypassPrefRequirement&quot;</li>
                <li>Go to <code className="underline">chrome://components</code> and click &quot;Check for Update&quot; on &quot;Optimization Guide On Device Model&quot;</li>
              </ul>
            </li>
          </ul>
          <span className="text-base mt-2">Learn more <a className="underline" href="https://developer.chrome.com/docs/ai/built-in" target="_blank" rel="noreferrer">here</a>.</span>
        </div>
      )
  )
}

export default App
