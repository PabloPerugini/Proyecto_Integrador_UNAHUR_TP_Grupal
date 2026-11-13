import type { SubjectStatus } from '../types';

// Unifica la disponibilidad del grafo con el estado visual, incluso si llega
// un estado sin avance desactualizado. Los avances registrados se conservan.
export function resolveNodeStatus(status: string | undefined, available: boolean): SubjectStatus {
  if (status === 'Aprobada' || status === 'Regular' || status === 'Cursando' || status === 'Libre') return status;
  return available ? 'Disponible' : 'Bloqueada';
}

export const STATUS_COLOR: Record<SubjectStatus, string> = {
  Aprobada: 'var(--status-aprobada-bg)',
  Regular: 'var(--status-regular-bg)',
  Cursando: 'var(--status-cursando-bg)',
  Libre: 'var(--status-libre-bg)',
  Disponible: 'var(--status-disponible-bg)',
  Bloqueada: 'var(--status-bloqueada-bg)',
};

export const STATUS_BORDER: Record<SubjectStatus, string> = {
  Aprobada: 'var(--status-aprobada-border)',
  Regular: 'var(--status-regular-border)',
  Cursando: 'var(--status-cursando-border)',
  Libre: 'var(--status-libre-border)',
  Disponible: 'var(--status-disponible-border)',
  Bloqueada: 'var(--status-bloqueada-border)',
};

export const STATUS_LABEL: Record<SubjectStatus, string> = {
  Aprobada: 'Aprobada',
  Regular: 'Regular',
  Cursando: 'En curso',
  Libre: 'Libre',
  Disponible: 'Disponible',
  Bloqueada: 'Bloqueada',
};

export const STATUS_BADGE: Record<SubjectStatus, string> = {
  Aprobada: 'success',
  Regular: 'primary',
  Cursando: 'info',
  Libre: 'danger',
  Disponible: 'info',
  Bloqueada: 'secondary',
};

export function statusColor(status: string | undefined | null): string {
  return STATUS_COLOR[(status ?? 'Bloqueada') as keyof typeof STATUS_COLOR] ?? STATUS_COLOR.Bloqueada;
}

export function statusBorder(status: string | undefined | null): string {
  return STATUS_BORDER[(status ?? 'Bloqueada') as keyof typeof STATUS_BORDER] ?? STATUS_BORDER.Bloqueada;
}

export function statusLabel(status: string | undefined | null): string {
  return STATUS_LABEL[(status ?? 'Bloqueada') as keyof typeof STATUS_LABEL] ?? STATUS_LABEL.Bloqueada;
}
