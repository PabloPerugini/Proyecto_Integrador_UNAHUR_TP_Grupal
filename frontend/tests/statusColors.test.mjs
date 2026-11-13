import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STATUS_BORDER, STATUS_COLOR, statusBorder, statusColor } from '../src/utils/status.ts';

test('statusColor devuelve tokens, no hex', () => {
  assert.equal(statusColor('Aprobada'), 'var(--status-aprobada-bg)');
  assert.equal(statusColor('Libre'), 'var(--status-libre-bg)');
  assert.equal(statusColor(undefined), 'var(--status-bloqueada-bg)');
});

test('statusBorder cubre los seis estados', () => {
  assert.equal(statusBorder('Regular'), 'var(--status-regular-border)');
  assert.deepEqual(Object.keys(STATUS_COLOR).sort(), ['Aprobada', 'Bloqueada', 'Cursando', 'Disponible', 'Libre', 'Regular']);
  assert.deepEqual(Object.keys(STATUS_BORDER).sort(), Object.keys(STATUS_COLOR).sort());
});

test('los SVG de estado usan currentColor y no traen literales', () => {
  const dir = fileURLToPath(new URL('../src/assets/subject-status/', import.meta.url));
  const files = readdirSync(dir).filter((file) => file.endsWith('.svg'));
  assert.equal(files.length, 6);
  for (const file of files) {
    const svg = readFileSync(new URL(`../src/assets/subject-status/${file}`, import.meta.url), 'utf8');
    assert.match(svg, /fill="none"/, file);
    assert.match(svg, /stroke="currentColor"/, file);
    assert.doesNotMatch(svg, /#[0-9a-f]{3,8}\b/i, file);
  }
});
