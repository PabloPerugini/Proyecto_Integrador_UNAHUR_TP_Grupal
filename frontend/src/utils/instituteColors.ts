// Identidad UNAHUR por instituto. Los colores viven en los tokens de tema;
// este módulo solo mapea nombres y resuelve superficies con contraste.
import { contrastText, readToken, toHex } from './color.ts';

export type InstituteKey = 'bio' | 'tech' | 'health' | 'education';

export interface InstituteSurface {
  background: string;
  color: string;
}

// El verde de identidad institucional. No es el verde de acción.
export const DEFAULT_INSTITUTE_COLOR = 'var(--unahur-green)';

const INSTITUTE_KEYS: Record<string, InstituteKey> = {
  'Instituto de Biotecnología': 'bio',
  'Instituto de Tecnología e Ingeniería': 'tech',
  'Instituto de Salud Comunitaria': 'health',
  'Instituto de Educación': 'education',
};

export function instituteKey(unitName?: string | null): InstituteKey | null {
  if (!unitName) return null;
  return INSTITUTE_KEYS[unitName] ?? null;
}

// El color guardado en la DB (unidad académica) tiene prioridad sobre
// el token oficial por nombre.
export function instituteToken(
  unitName?: string | null,
  dbColor?: string | null,
): string {
  if (dbColor) return dbColor;
  const key = instituteKey(unitName);
  return key ? `var(--unahur-${key})` : DEFAULT_INSTITUTE_COLOR;
}

export function instituteSurface(
  unitName?: string | null,
  dbColor?: string | null,
  variant: 'cover' | 'soft' = 'cover',
): InstituteSurface {
  if (dbColor) {
    return { background: dbColor, color: contrastText(dbColor) };
  }

  const key = instituteKey(unitName);
  if (key) {
    const suffix = variant === 'soft' ? '-soft' : '';
    return {
      background: `var(--gradient-institute-${key}${suffix})`,
      color: 'var(--color-on-institute)',
    };
  }

  return variant === 'soft'
    ? { background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }
    : { background: 'var(--gradient-brand)', color: 'var(--color-on-brand)' };
}

// Hex para inputs nativos (type="color"), que no aceptan var().
// Fuera del navegador no hay tokens y devuelve ''.
export function instituteHex(
  unitName?: string | null,
  dbColor?: string | null,
): string {
  if (dbColor) return dbColor;
  const key = instituteKey(unitName);
  const token = key ? `--unahur-${key}` : '--unahur-green';
  return toHex(readToken(token)) ?? '';
}
