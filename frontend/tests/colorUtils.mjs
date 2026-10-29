import { readFileSync } from 'node:fs';

// Utilidades compartidas de los tests de contraste: parseo liviano de CSS y
// aritmética WCAG (luminancia, ratio, mezcla por opacidad).

export function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Color `hex` mezclado con opacidad `alpha` sobre un fondo (blanco por defecto). */
export function blendOver(hex, alpha, backdrop = '#ffffff') {
  const channels = (value) => [0, 2, 4].map(i => parseInt(value.replace('#', '').slice(i, i + 2), 16));
  const [fr, fg, fb] = channels(hex);
  const [br, bg, bb] = channels(backdrop);
  const mix = (f, b) => Math.round(alpha * f + (1 - alpha) * b);
  return `#${[mix(fr, br), mix(fg, bg), mix(fb, bb)].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Lee un parcial de src/styles (relativo a tests/). */
export function readStylesheet(name) {
  return readFileSync(new URL(`../src/styles/${name}`, import.meta.url), 'utf8');
}

/**
 * Reglas "selector { cuerpo }" de un CSS, sin comentarios ni reglas del
 * tema oscuro (esas se validan por separado).
 */
export function parseCssRules(text) {
  const rules = [];
  const source = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(source))) {
    const selector = match[1].trim().replace(/\s+/g, ' ');
    if (selector.includes('data-bs-theme')) continue;
    rules.push({ selector, body: match[2] });
  }
  return rules;
}

/** Valor de una declaración (`background`, `color`, …) o null. */
export function declaration(body, prop) {
  const match = body.match(new RegExp(`(?:^|[;\\s])${prop}:\\s*([^;]+);?`));
  return match ? match[1].trim() : null;
}
