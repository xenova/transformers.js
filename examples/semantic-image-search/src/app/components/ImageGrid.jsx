import Image from 'next/image'
import { blurHashToDataURL } from '../utils.js'

export function ImageGrid({ images, setCurrentImage }) {
    return (
        <div className="columns-2 gap-4 sm:columns-3 xl:columns-4 2xl:columns-5">
            {images && images.map(({
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
        </div>)
}