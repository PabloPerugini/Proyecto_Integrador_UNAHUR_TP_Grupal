import { useRef, useState } from 'react';
import type { DragEvent, ChangeEvent } from 'react';

interface PdfDropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  accept?: string;
  text?: string;
  hint?: string;
  multiple?: boolean;
}

export default function PdfDropzone({ onFiles, disabled, accept = 'application/pdf', text, hint, multiple = false }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const acceptFiles = (list: FileList | null) => {
    if (!list) return;
    const norm = accept.toLowerCase();
    const wantsPdf = norm.includes('pdf');
    const wantsImage = norm.includes('image');
    const files = Array.from(list).filter((f) => {
      const n = f.name.toLowerCase();
      if (wantsPdf && (f.type === 'application/pdf' || n.endsWith('.pdf'))) return true;
      if (wantsImage && (f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/.test(n))) return true;
      return false;
    });
    if (files.length) onFiles(files);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    acceptFiles(e.dataTransfer.files);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    acceptFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div
      className={`dropzone${drag ? ' dropzone--drag' : ''}${disabled ? ' dropzone--disabled' : ''}`}
      role="button"
      aria-label="Subir PDF del plan de estudios"
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={handleChange}
      />

      <span className="dropzone__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 8l5-5 5 5" />
          <path d="M12 3v12" />
        </svg>
      </span>
      <p className="dropzone__text">{text ?? 'Arrastrá el PDF del plan de estudios acá'}</p>
      <p className="dropzone__hint">
        {hint ?? (multiple ? 'o hacé clic para elegir tus archivos · se admiten varios PDF' : 'o hacé clic para elegir el PDF')}
      </p>
    </div>
  );
}