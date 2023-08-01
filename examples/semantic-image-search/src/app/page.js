'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { blurHashToDataURL, downloadImage } from './utils.js'

export default function Home() {

  // Keep track of the result and the model loading status.
  const [result, setResult] = useState(null);
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
    setResult(json);
  };

  return (
    <main className="mx-auto max-w-[1960px] p-4 relative">
      <div
        className='fixed inset-0 z-30 backdrop-blur-2xl w-full h-full bg-black top-0 left-0 transition'
        style={{
          backgroundColor: `rgba(0, 0, 0, ${currentImage ? 0.8 : 0})`,
          opacity: currentImage ? 1 : 0,
          // transition: 'opacity 0.2s ease-in-out',
          pointerEvents: currentImage ? 'auto' : 'none',
        }}

      >

        {currentImage && <>
          <Image
            alt={currentImage.photo_description || currentImage.ai_description || ""}
            className="transform rounded-lg transition will-change-auto"
            style={
              { transform: 'translate3d(0, 0, 0)', }
            }
            layout={'fill'}
            objectFit={'contain'}
            src={`${currentImage.photo_image_url}`}
            unoptimized={true}
          />
          <div
            className='absolute top-0 left-0 flex items-center gap-2 p-3 text-white'
          >
            <button
              onClick={() => setCurrentImage(null)}
              className="rounded-full bg-black/50 p-2 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div className="absolute top-0 right-0 flex items-center gap-2 p-3 text-white">
            <a
              href={currentImage.photo_url}
              className="rounded-full bg-black/50 p-2 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white"
              target="_blank" title="View on Unsplash"
              rel="noreferrer">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path>
              </svg>
            </a>
            <button
              onClick={() => downloadImage(currentImage.photo_image_url, `${currentImage.photo_id}.png`)}
              className="rounded-full bg-black/50 p-2 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white" title="Download">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3">
                </path>
              </svg>
            </button>
          </div>
        </>
        }

      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const text = formData.get('text');
          search(text);
        }}
        className='relative mb-2'
      >
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
          </svg>
        </div>
        <input
          type="search"
          name="text"
          id="default-search"
          className="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Search for images..."
          required
        />
        <button
          type="submit"
          className="text-white absolute right-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          Search
        </button>
      </form>
      <div className="columns-2 gap-4 sm:columns-3 xl:columns-4 2xl:columns-5">
        {result && result.map(({
          photo_id,
          photo_url,
          photo_image_url,
          photo_aspect_ratio,
          photo_width,
          photo_height,
          blur_hash,
          photo_description,
          ai_description,
          similarity,
        }) => (
          <div
            key={photo_id}
            href={photo_url}
            className='after:content group cursor-pointer relative mb-4 block w-full after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight'
            onClick={() => {
              setCurrentImage({
                photo_id,
                photo_url,
                photo_image_url,
                photo_aspect_ratio,
                photo_width,
                photo_height,
                blur_hash,
                photo_description,
                ai_description,
                similarity,
              });
            }}
          >
            <Image
              alt={photo_description || ai_description || ""}
              className="transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110"
              style={{ transform: 'translate3d(0, 0, 0)' }}
              placeholder="blur"
              blurDataURL={blurHashToDataURL(blur_hash)}
              src={`${photo_image_url}?auto=format&fit=crop&w=480&q=80`}
              width={480}
              height={480 / photo_aspect_ratio}
              unoptimized={true}
            />
          </div>
        ))}
      </div>
    </main>
  )
}
