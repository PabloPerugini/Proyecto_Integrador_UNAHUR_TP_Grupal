import type { SubjectStatus } from '../types';

export const STATUS_COLOR: Record<SubjectStatus, string> = {
  Aprobada: '#198754',
  Regular: '#0d6efd',
  Cursando: '#0dcaf0',
  Pendiente: '#6c757d',
};

export const STATUS_LABEL: Record<SubjectStatus, string> = {
  Aprobada: 'Aprobada',
  Regular: 'Regular',
  Cursando: 'En curso',
  Pendiente: 'Pendiente',
};

export const STATUS_BADGE: Record<SubjectStatus, string> = {
  Aprobada: 'success',
  Regular: 'primary',
  Cursando: 'info',
  Pendiente: 'secondary',
};

export function statusColor(status: string | undefined | null): string {
  return STATUS_COLOR[(status ?? 'Pendiente') as keyof typeof STATUS_COLOR] ?? STATUS_COLOR.Pendiente;
}

export function statusLabel(status: string | undefined | null): string {
  return STATUS_LABEL[(status ?? 'Pendiente') as keyof typeof STATUS_LABEL] ?? (status ?? 'Pendiente');
}