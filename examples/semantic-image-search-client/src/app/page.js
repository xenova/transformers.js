'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Modal } from './components/Modal';
import { SearchBar } from './components/SearchBar';
import { ImageGrid } from './components/ImageGrid';

export default function Home() {

  // Application state
  const [ready, setReady] = useState(null);
  const [images, setImages] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);

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
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'initiate':
          setReady(false);
          break;
        case 'ready':
          setReady(true);
          break;
        case 'complete':
          setImages(e.data.output);
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current.removeEventListener('message', onMessageReceived);
  });

  const search = useCallback((text) => {
    if (worker.current) {
      worker.current.postMessage({ text });
    }
  }, []);

  return (
    <main className="mx-auto max-w-[1960px] p-4 relative">
      <Modal currentImage={currentImage} setCurrentImage={setCurrentImage} />
      <SearchBar search={search} />
      {ready === false && (
        <div className="z-10 fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-white text-2xl font-bold">Loading model and database...</div>
        </div>
      )}
      <ImageGrid images={images} setCurrentImage={setCurrentImage} />
    </main>
  )
}
