'use client';

import { useCallback, useRef, useState } from 'react';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/constants';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSizeBytes?: number;
  onFilesSelected: (files: File[]) => void;
  label?: string;
}

export default function FileUpload({
  accept = ACCEPTED_IMAGE_TYPES.join(','),
  multiple = false,
  maxSizeBytes = MAX_IMAGE_SIZE_BYTES,
  onFilesSelected,
  label = 'Upload label image',
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const isImageFile = (file: File) => file.type.startsWith('image/');

  const validateAndSet = useCallback((files: FileList | null) => {
    if (!files) return;
    setError(null);
    const valid: File[] = [];
    const acceptedTypes = accept.split(',').map((t) => t.trim());

    for (const file of Array.from(files)) {
      if (!acceptedTypes.includes(file.type)) {
        setError(`"${file.name}" is not a supported format. Use JPEG or PNG.`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        setError(`"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: ${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB.`);
        continue;
      }
      valid.push(file);
    }

    if (valid.length > 0) {
      const updated = multiple ? [...selectedFiles, ...valid] : valid;
      setSelectedFiles(updated);
      onFilesSelected(updated);

      // Generate preview URLs for image files
      if (!multiple) {
        // Single mode: revoke old previews
        Object.values(previews).forEach(URL.revokeObjectURL);
        const newPreviews: Record<number, string> = {};
        valid.forEach((file, i) => {
          if (isImageFile(file)) newPreviews[i] = URL.createObjectURL(file);
        });
        setPreviews(newPreviews);
      } else {
        const offset = selectedFiles.length;
        const newPreviews = { ...previews };
        valid.forEach((file, i) => {
          if (isImageFile(file)) newPreviews[offset + i] = URL.createObjectURL(file);
        });
        setPreviews(newPreviews);
      }
    }
  }, [accept, maxSizeBytes, multiple, onFilesSelected, selectedFiles, previews]);

  const removeFile = (index: number) => {
    if (previews[index]) URL.revokeObjectURL(previews[index]);
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    onFilesSelected(updated);
    // Re-index previews
    const newPreviews: Record<number, string> = {};
    Object.entries(previews).forEach(([k, v]) => {
      const ki = Number(k);
      if (ki < index) newPreviews[ki] = v;
      else if (ki > index) newPreviews[ki - 1] = v;
    });
    setPreviews(newPreviews);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400 bg-white'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); validateAndSet(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        aria-label={label}
      >
        <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500 mt-1">JPEG or PNG only (max {(maxSizeBytes / 1024 / 1024).toFixed(1)}MB)</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => validateAndSet(e.target.files)}
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>
      )}

      {selectedFiles.length > 0 && !multiple && previews[0] && (
        <div className="mt-3 bg-gray-50 rounded-lg p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <img
                src={previews[0]}
                alt={`Preview of ${selectedFiles[0].name}`}
                className="max-h-[300px] w-auto rounded-lg border border-gray-200 object-contain"
              />
              <p className="text-sm text-gray-700 mt-2">{selectedFiles[0].name} ({(selectedFiles[0].size / 1024).toFixed(0)}KB)</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeFile(0); }}
              className="text-gray-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
              aria-label={`Remove ${selectedFiles[0].name}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {selectedFiles.length > 0 && (multiple || !previews[0]) && (
        <ul className="mt-3 space-y-2">
          {selectedFiles.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                {previews[i] && (
                  <img
                    src={previews[i]}
                    alt={`Preview of ${file.name}`}
                    className="h-12 w-12 object-cover rounded border border-gray-200 flex-shrink-0"
                  />
                )}
                <span className="text-gray-700 truncate">{file.name} ({(file.size / 1024).toFixed(0)}KB)</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="text-gray-400 hover:text-red-500 ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={`Remove ${file.name}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
