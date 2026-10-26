import type { SubjectStatus } from '../types';

// Unifica la disponibilidad del grafo con el estado visual, incluso si llega
// un estado sin avance desactualizado. Los avances registrados se conservan.
export function resolveNodeStatus(status: string | undefined, available: boolean): SubjectStatus {
  if (status === 'Aprobada' || status === 'Regular' || status === 'Cursando') return status;
  return available ? 'Disponible' : 'Bloqueada';
}

export const STATUS_COLOR: Record<SubjectStatus, string> = {
  Aprobada: '#eefdf0',
  Regular: '#F5F3FF',
  Cursando: '#e5f0fe',
  Disponible: '#eff6ff',
  Bloqueada: '#edf0f4',
};

// Los fondos de estado son claros: el texto debe ser oscuro para mantener
// contraste suficiente en las tarjetas del grafo y del tablero.
export const STATUS_TEXT_COLOR = '#23395d';

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
