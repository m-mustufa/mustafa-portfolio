"use client";

import Image from "next/image";
import { useState } from "react";

type GalleryImage = {
  src: string;
  alt: string;
  label: string;
};

export function GigGallery({ images }: { images: GalleryImage[] }) {
  const [activeImage, setActiveImage] = useState(0);
  const selected = images[activeImage];
  const show = (offset: number) => {
    setActiveImage((current) => (current + offset + images.length) % images.length);
  };

  return (
    <div className="gig-gallery">
      <figure className="gig-cover">
        <Image
          alt={selected.alt}
          height={630}
          priority={activeImage === 0}
          sizes="(max-width: 900px) 100vw, 760px"
          src={selected.src}
          width={1200}
        />
        <button aria-label="Previous project image" className="gallery-arrow gallery-arrow-left" onClick={() => show(-1)} type="button">‹</button>
        <button aria-label="Next project image" className="gallery-arrow gallery-arrow-right" onClick={() => show(1)} type="button">›</button>
      </figure>
      <div className="gallery-thumbnails" aria-label="Project image gallery">
        {images.map((image, index) => (
          <button
            aria-label={`Show ${image.label}`}
            aria-pressed={activeImage === index}
            className={activeImage === index ? "is-active" : ""}
            key={image.src}
            onClick={() => setActiveImage(index)}
            type="button"
          >
            <Image alt="" height={72} src={image.src} width={128} />
            <span>{image.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
