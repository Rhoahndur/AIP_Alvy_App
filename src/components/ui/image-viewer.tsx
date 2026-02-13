'use client';

import { useState } from 'react';

interface ImageViewerProps {
  src: string;
  alt: string;
}

export default function ImageViewer({ src, alt }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          aria-label="Zoom out"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
        </button>
        <span className="text-sm text-gray-600 min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          aria-label="Zoom in"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="text-sm text-indigo-600 hover:text-indigo-800 ml-2 min-h-[44px] flex items-center px-2"
        >
          Reset
        </button>
      </div>
      <div className="overflow-auto border border-gray-200 rounded-lg bg-gray-100 max-h-[500px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          className="transition-transform"
        />
      </div>
    </div>
  );
}
