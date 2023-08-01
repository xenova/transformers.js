'use client'

import { useState } from 'react'
import { Modal } from './components/Modal';
import { SearchBar } from './components/SearchBar';
import { ImageGrid } from './components/ImageGrid';

export default function Home() {

  // Application state
  const [images, setImages] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);

  const search = async (text) => {
    if (!text) return;

    const params = new URLSearchParams();
    params.append('text', text);
    params.append('threshold', 0.1);
    params.append('limit', 100);

    // Make a request to the /classify route on the server.
    const result = await fetch(`/search?${params.toString()}`);

    const json = await result.json();
    setImages(json);
  };

  return (
    <main className="mx-auto max-w-[1960px] p-4 relative">
      <Modal currentImage={currentImage} setCurrentImage={setCurrentImage} />
      <SearchBar search={search} />
      <ImageGrid images={images} setCurrentImage={setCurrentImage} />
    </main>
  )
}
