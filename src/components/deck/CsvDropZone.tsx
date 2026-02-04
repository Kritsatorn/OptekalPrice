'use client';

import { useCallback, useRef, useState } from 'react';

interface CsvDropZoneProps {
  onFiles: (files: FileList | File[]) => void;
}

export default function CsvDropZone({ onFiles }: CsvDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        onFiles(e.dataTransfer.files);
      }
    },
    [onFiles],
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        glass-card rounded-card p-8 cursor-pointer transition-all
        border-2 border-dashed
        ${isDragging
          ? 'border-[var(--accent-success)] bg-[var(--accent-success)]/5'
          : 'border-divider hover:border-t-muted'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <svg
          className="w-8 h-8 text-t-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-[13px] text-t-body font-medium">
          Drop CardCrew CSV files here or click to browse
        </p>
        <p className="text-[11px] text-t-muted">
          Import multiple buyer exports to aggregate
        </p>
      </div>
    </div>
  );
}
