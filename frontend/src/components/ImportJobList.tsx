import type { ReactNode } from 'react';
import Spinner from 'react-bootstrap/Spinner';

type ImportJobStatus = 'creando' | 'parseando' | 'guardando' | 'listo' | 'error';

export interface ImportJob {
  id: string;
  file: string;
  status: ImportJobStatus;
  error?: string;
  careerName?: string;
  careerId?: string;
  count?: number;
}

const DEFAULT_LABELS: Record<'creando' | 'parseando' | 'guardando', string> = {
  creando: 'Creando…',
  parseando: 'Leyendo el PDF…',
  guardando: 'Guardando…',
};

const PROCESSING: ImportJobStatus[] = ['creando', 'parseando', 'guardando'];

interface ImportJobListProps {
  jobs: ImportJob[];
  labels?: Partial<Record<'creando' | 'parseando' | 'guardando', string>>;
  renderReady?: (job: ImportJob) => ReactNode;
}

export default function ImportJobList({ jobs, labels, renderReady }: ImportJobListProps) {
  if (!jobs.length) return null;
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  return (
    <ul className="dropzone-jobs list-unstyled mb-0 mt-3">
      {jobs.map((j) => (
        <li key={j.id} className="dropzone-job d-flex align-items-center gap-2 py-2">
          <span className="text-truncate">{j.file}</span>
          <span className="ms-auto small d-flex align-items-center gap-2 flex-wrap">
            {j.status === 'listo' && renderReady && renderReady(j)}
            {j.status === 'listo' && !renderReady && <span className="text-success">Listo</span>}
            {j.status === 'error' && <span className="text-danger">{j.error}</span>}
            {PROCESSING.includes(j.status) && (
              <span className="d-inline-flex align-items-center gap-2 text-muted">
                <Spinner size="sm" /> {mergedLabels[j.status as keyof typeof mergedLabels]}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}