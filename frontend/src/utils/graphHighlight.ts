import type { GraphEdge } from '../types';

export const HIGHLIGHT_COLOR = '#0D9488';

export function getDirectSuccessorCodes(edges: readonly GraphEdge[], selectedCode: string | null): Set<string> {
  return new Set(edges
    .filter(edge => selectedCode !== null && edge.source === selectedCode && edge.target !== selectedCode)
    .map(edge => edge.target));
}

// Conserva la geometría y los huecos del SVG. En íconos de trazo se tiñe el
// stroke y se mantiene el fondo decorativo; en íconos sólidos se tiñe el fill.
export function tintStatusSvg(svg: string, color: string): string {
  const visiblePaint = (value: string) => !['none', 'transparent'].includes(value.trim().toLowerCase());
  const hasStroke = [...svg.matchAll(/\bstroke\s*=\s*(["'])(.*?)\1/gi)]
    .some(([, , value]) => visiblePaint(value));
  const attribute = hasStroke ? 'stroke' : 'fill';
  const safeColor = color.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/</g, '&lt;');
  const tinted = svg.replace(new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'gi'), (match, quote, value) =>
    visiblePaint(value) ? `${attribute}=${quote}${safeColor}${quote}` : match);
  // Un SVG sin fill explícito usa negro por defecto.
  return !hasStroke && !/<svg\b[^>]*\bfill\s*=/i.test(tinted)
    ? tinted.replace(/<svg\b/i, `<svg fill="${safeColor}"`)
    : tinted;
}
