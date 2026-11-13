import { useRef, useState } from 'react';
import type { DragEvent, ChangeEvent } from 'react';

interface PdfDropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  text?: string;
  hint?: string;
  multiple?: boolean;
}

interface PickedFile {
  name: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Solo PDF (el backend rechaza el resto con firma %PDF-): sin rama de imágenes.
export default function PdfDropzone({ onFiles, disabled, text, hint, multiple = false }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [picked, setPicked] = useState<PickedFile[]>([]);

  const acceptFiles = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list).filter((f) => {
      const n = f.name.toLowerCase();
      return f.type === 'application/pdf' || n.endsWith('.pdf');
    });
    if (!files.length) return;
    // Vista previa liviana: nombre + tamaño de lo último soltado/elegido.
    setPicked(files.map((f) => ({ name: f.name, size: f.size })));
    onFiles(files);
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
      tabIndex={disabled ? -1 : 0}
      aria-label="Subir PDF del plan de estudios"
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
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
        accept="application/pdf,.pdf"
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

      {picked.length > 0 && (
        <ul className="dropzone__files">
          {picked.map((file, index) => (
            <li key={`${file.name}-${index}`} className="dropzone__file">
              <span className="dropzone__file-check" aria-hidden="true">✓</span>
              <span className="dropzone__file-name" title={file.name}>{file.name}</span>
              <span className="dropzone__file-size">{formatSize(file.size)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
