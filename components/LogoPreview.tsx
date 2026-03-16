"use client";

import { useState } from "react";

type LogoPreviewProps = {
  src: string;
  alt: string;
  className?: string;
};

export default function LogoPreview({
  src,
  alt,
  className = "w-8 h-8 rounded object-contain",
}: LogoPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <img src={src} alt={alt} className={className} />

      {isOpen && (
        <div className="absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 rounded-xl border border-zinc-700 bg-zinc-950 p-3 shadow-2xl">
          <img
            src={src}
            alt={alt}
            className="w-56 h-56 object-contain rounded"
          />
        </div>
      )}
    </div>
  );
}