// Gradientes con los colores oficiales de unahur.edu.ar por instituto
// (extraídos de las páginas de cada instituto en 2026).
// Biotecnología #219ecf · Tecnología e Ingeniería #f08100
// Salud Comunitaria #00a79f · Educación #ea4f51.

export const INSTITUTE_COLORS: Record<string, string> = {
  'Instituto de Biotecnología': '#219ecf',
  'Instituto de Tecnología e Ingeniería': '#f08100',
  'Instituto de Salud Comunitaria': '#00a79f',
  'Instituto de Educación': '#ea4f51',
};

export const DEFAULT_INSTITUTE_COLOR = '#6841df';

export function instituteColor(unitName?: string | null): string {
  if (unitName && INSTITUTE_COLORS[unitName]) {
    return INSTITUTE_COLORS[unitName];
  }
  return DEFAULT_INSTITUTE_COLOR;
}

export function instituteGradient(base: string): string {
  return `linear-gradient(135deg, ${base} 0%, color-mix(in srgb, ${base} 52%, #0b0f14) 100%)`;
}

// Tono diferenciado para la tecnicatura (misma identidad, más claro).
export function instituteGradientTec(base: string): string {
  return `linear-gradient(135deg, color-mix(in srgb, ${base} 68%, #ffffff) 0%, color-mix(in srgb, ${base} 72%, #0b0f14) 100%)`;
}
