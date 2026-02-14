'use client';

import { useState, useRef, useEffect } from 'react';

interface ImageViewerProps {
  src: string;
  alt: string;
}

export default function ImageViewer({ src, alt }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalZoom, setModalZoom] = useState(1);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modalOpen && !dialog.open) {
      dialog.showModal();
      setModalZoom(1);
    } else if (!modalOpen && dialog.open) {
      dialog.close();
    }
  }, [modalOpen]);

  return (
    <>
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
        <div
          className="overflow-auto border border-gray-200 rounded-lg bg-gray-100 max-h-[500px] cursor-pointer"
          onClick={() => setModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setModalOpen(true); }}
          aria-label="Click to view full size"
          title="Click to view full size"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            className="transition-transform"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-center">Click image to view full size</p>
      </div>

      {/* Full-size modal */}
      <dialog
        ref={dialogRef}
        className="rounded-xl shadow-2xl border-0 p-0 backdrop:bg-black/70 max-w-[90vw] max-h-[90vh] w-auto"
        onClose={() => setModalOpen(false)}
      >
        <div className="relative">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 backdrop-blur px-4 py-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalZoom((z) => Math.max(0.25, z - 0.25))}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                aria-label="Zoom out"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
              </button>
              <span className="text-sm text-gray-600 min-w-[50px] text-center">{Math.round(modalZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setModalZoom((z) => Math.min(4, z + 0.25))}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                aria-label="Zoom in"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <button
                type="button"
                onClick={() => setModalZoom(1)}
                className="text-sm text-indigo-600 hover:text-indigo-800 min-h-[36px] flex items-center px-2"
              >
                Fit
              </button>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-auto max-h-[calc(90vh-52px)] bg-gray-100 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              style={{ transform: `scale(${modalZoom})`, transformOrigin: 'top left' }}
              className="transition-transform max-w-none"
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
