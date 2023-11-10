'use client'

import Image from 'next/image'
import { blurHashToDataURL } from '../utils.js'

export function ImageGrid({ images, setCurrentImage }) {
    return (
        <div className="columns-2 gap-4 sm:columns-3 xl:columns-4 2xl:columns-5">
            {images && images.map(({ id, url, ar, blur }) => (
                <div
                    key={id}
                    href={`https://unsplash.com/photos/${id}`}
                    className='after:content group cursor-pointer relative mb-4 block w-full after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight'
                    onClick={() => {
                        setCurrentImage({ id, url, ar, blur });
                    }}
                >
                    <Image
                        alt=''
                        className="transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110"
                        style={{ transform: 'translate3d(0, 0, 0)' }}
                        placeholder="blur"
                        blurDataURL={blurHashToDataURL(blur)}
                        src={`https://images.unsplash.com/${url}?auto=format&fit=crop&w=480&q=80`}
                        width={480}
                        height={480 / ar}
                        unoptimized={true}
                    />
                </div>
            ))}
        </div>)
}