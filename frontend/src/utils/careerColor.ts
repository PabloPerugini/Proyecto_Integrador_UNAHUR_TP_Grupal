import type { Career } from '../types';

const INSTITUTE_COLORS: Record<string, string> = {
  biotecnologia: '#219ecf',
  'tecnologia e ingenieria': '#f08100',
  'salud comunitaria': '#00a79f',
  educacion: '#ef7a70',
};

const FALLBACK_COLORS = [
  '#219ecf',
  '#f08100',
  '#00a79f',
  '#ef7a70',
  '#609e2f',
  '#8b5cf6',
  '#ea4f51',
  '#0089cd',
];

function normalizeName(value: string | undefined): string {
  return (
    (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  );
}

function hashString(value: string): number {
  let hash = 0;
  for (const ch of value) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return hash;
}

export function deriveCareerColor(institute: string | undefined, name: string | undefined): string {
  const inst = normalizeName(institute);
  if (INSTITUTE_COLORS[inst]) return INSTITUTE_COLORS[inst];
  const key = inst || normalizeName(name);
  return FALLBACK_COLORS[hashString(key) % FALLBACK_COLORS.length];
}

export function getCareerColor(career: Pick<Career, 'color' | 'institute' | 'name'> | null | undefined): string {
  if (career?.color) return career.color;
  return deriveCareerColor(career?.institute, career?.name);
}