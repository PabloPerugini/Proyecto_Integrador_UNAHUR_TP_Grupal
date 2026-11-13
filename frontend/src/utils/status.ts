import type { SubjectStatus } from '../types';

// Unifica la disponibilidad del grafo con el estado visual, incluso si llega
// un estado sin avance desactualizado. Los avances registrados se conservan.
export function resolveNodeStatus(status: string | undefined, available: boolean): SubjectStatus {
  if (status === 'Aprobada' || status === 'Regular' || status === 'Cursando') return status;
  return available ? 'Disponible' : 'Bloqueada';
}

export const STATUS_COLOR: Record<SubjectStatus, string> = {
  Aprobada: '#D9F7E5',
  Regular: '#E9E1FF',
  Cursando: '#DCEAFF',
  Disponible: '#DCEAFF',
  Bloqueada: '#E1E5EA',
};

export const STATUS_LABEL: Record<SubjectStatus, string> = {
  Aprobada: 'Aprobada',
  Regular: 'Regular',
  Cursando: 'En curso',
  Disponible: 'Disponible',
  Bloqueada: 'Bloqueada',
};

export const STATUS_BADGE: Record<SubjectStatus, string> = {
  Aprobada: 'success',
  Regular: 'primary',
  Cursando: 'info',
  Disponible: 'info',
  Bloqueada: 'secondary',
};

export function statusColor(status: string | undefined | null): string {
  return STATUS_COLOR[(status ?? 'Bloqueada') as keyof typeof STATUS_COLOR] ?? STATUS_COLOR.Bloqueada;
}

export function statusLabel(status: string | undefined | null): string {
  return STATUS_LABEL[(status ?? 'Bloqueada') as keyof typeof STATUS_LABEL] ?? STATUS_LABEL.Bloqueada;
}
