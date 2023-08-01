import { downloadImage } from '../utils.js'
import Image from 'next/image'

export function Modal({ currentImage, setCurrentImage }) {
    return (
        <div
            className='fixed inset-0 z-30 backdrop-blur-2xl w-full h-full bg-black top-0 left-0 transition'
            style={{
                backgroundColor: `rgba(0, 0, 0, ${currentImage ? 0.8 : 0})`,
                opacity: currentImage ? 1 : 0,
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
                    src={currentImage.photo_image_url}
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

        </div>)
}