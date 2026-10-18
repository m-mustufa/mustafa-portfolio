"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type GalleryImage = {
  src: string;
  alt: string;
  label: string;
};

export function GigGallery({ images }: { images: GalleryImage[] }) {
  const [activeImage, setActiveImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const selected = images[activeImage];
  const show = (offset: number) => {
    setActiveImage((current) => (current + offset + images.length) % images.length);
  };
  const closeLightbox = () => {
    setIsLightboxOpen(false);
    window.requestAnimationFrame(() => openButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!isLightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") show(-1);
      if (event.key === "ArrowRight") show(1);
    };

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isLightboxOpen]);

  return (
    <div className="gig-gallery">
      <figure className="gig-cover">
        <button
          aria-label={`Open ${selected.label} image in lightbox`}
          className="gallery-open"
          onClick={() => setIsLightboxOpen(true)}
          ref={openButtonRef}
          type="button"
        >
          <Image
            alt={selected.alt}
            height={630}
            priority={activeImage === 0}
            sizes="(max-width: 900px) 100vw, 760px"
            src={selected.src}
            width={1200}
          />
        </button>
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
      {isLightboxOpen && (
        <div
          aria-label="Project image preview"
          aria-modal="true"
          className="gallery-lightbox"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeLightbox();
          }}
          role="dialog"
        >
          <button aria-label="Close image preview" className="lightbox-close" onClick={closeLightbox} ref={closeButtonRef} type="button">×</button>
          <button aria-label="Previous image" className="lightbox-arrow lightbox-arrow-left" onClick={() => show(-1)} type="button">‹</button>
          <figure>
            <Image
              alt={selected.alt}
              height={900}
              priority
              sizes="95vw"
              src={selected.src}
              width={1600}
            />
            <figcaption>{selected.label}</figcaption>
          </figure>
          <button aria-label="Next image" className="lightbox-arrow lightbox-arrow-right" onClick={() => show(1)} type="button">›</button>
        </div>
      )}
    </div>
  );
}
