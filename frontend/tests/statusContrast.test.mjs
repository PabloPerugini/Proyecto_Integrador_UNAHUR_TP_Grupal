import test from 'node:test';
import assert from 'node:assert/strict';

import { STATUS_COLOR, STATUS_TEXT_COLOR } from '../src/utils/status.ts';

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test('cada estado del tablero tiene texto con contraste legible sobre su fondo', () => {
  for (const [status, background] of Object.entries(STATUS_COLOR)) {
    const ratio = contrast(background, STATUS_TEXT_COLOR);
    assert.ok(
      ratio >= 4.5,
      `${status}: contraste ${ratio.toFixed(2)}:1 entre ${background} y ${STATUS_TEXT_COLOR}`,
    );
  }
});
