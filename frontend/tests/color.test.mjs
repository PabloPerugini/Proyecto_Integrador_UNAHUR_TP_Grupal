import test from 'node:test';
import assert from 'node:assert/strict';
import {
  contrastRatio,
  contrastText,
  parseCssColor,
  readToken,
  toHex,
} from '../src/utils/color.ts';

test('parseCssColor entiende hex, rgb y oklch', () => {
  assert.deepEqual(parseCssColor('#0A6B4E'), { r: 10, g: 107, b: 78, a: 1 });
  assert.deepEqual(parseCssColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseCssColor('rgb(10 107 78 / 0.5)'), { r: 10, g: 107, b: 78, a: 0.5 });
  assert.deepEqual(parseCssColor('white'), { r: 255, g: 255, b: 255, a: 1 });
  const oklch = parseCssColor('oklch(0.469 0.095 165.8)');
  assert.ok(oklch);
  assert.ok(Math.abs(oklch.r - 10) <= 2 && Math.abs(oklch.g - 107) <= 2 && Math.abs(oklch.b - 78) <= 2);
});

test('parseCssColor rechaza lo que no entiende', () => {
  assert.equal(parseCssColor('nope'), null);
  assert.equal(parseCssColor(''), null);
});

test('toHex normaliza y convierte oklch', () => {
  assert.equal(toHex('#0A6B4E'), '#0a6b4e');
  assert.equal(toHex('oklch(1 0 0)'), '#ffffff');
  assert.equal(toHex('oklch(0 0 0)'), '#000000');
  assert.equal(toHex('nope'), null);
});

test('contrastRatio coincide con WCAG', () => {
  assert.ok(Math.abs(contrastRatio('#0a6b4e', '#ffffff') - 6.51) < 0.02);
  assert.ok(Math.abs(contrastRatio('#238a42', '#ffffff') - 4.39) < 0.02);
});

test('contrastText elige el color que contrasta', () => {
  assert.equal(contrastText('#f08100', { light: '#ffffff', dark: '#10161f' }), '#10161f');
  assert.equal(contrastText('#0a6b4e', { light: '#ffffff', dark: '#10161f' }), '#ffffff');
});

test('readToken no rompe fuera del navegador', () => {
  assert.equal(typeof readToken('--color-bg'), 'string');
});
