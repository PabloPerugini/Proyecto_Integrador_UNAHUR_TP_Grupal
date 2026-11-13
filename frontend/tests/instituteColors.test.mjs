import test from 'node:test';
import assert from 'node:assert/strict';
import { instituteSurface, instituteToken } from '../src/utils/instituteColors.ts';

test('los institutos conocidos devuelven su token', () => {
  assert.equal(instituteToken('Instituto de Biotecnología'), 'var(--unahur-bio)');
  assert.equal(instituteToken('Instituto de Tecnología e Ingeniería'), 'var(--unahur-tech)');
  assert.equal(instituteToken('Instituto de Salud Comunitaria'), 'var(--unahur-health)');
  assert.equal(instituteToken('Instituto de Educación'), 'var(--unahur-education)');
});

test('la DB gana y el desconocido cae al verde', () => {
  assert.equal(instituteToken('Instituto de Biotecnología', '#123456'), '#123456');
  assert.equal(instituteToken('Otro instituto'), 'var(--unahur-green)');
});

test('la portada conocida usa gradiente y tinta', () => {
  assert.deepEqual(instituteSurface('Instituto de Biotecnología'), {
    background: 'var(--gradient-institute-bio)',
    color: 'var(--color-on-institute)',
  });
});

test('la portada de DB usa fondo plano y texto contrastado', () => {
  const surface = instituteSurface(null, '#f08100');
  assert.equal(surface.background, '#f08100');
  assert.equal(surface.color, 'black');
});

test('el instituto desconocido cae al gradiente de marca', () => {
  assert.deepEqual(instituteSurface('Otro instituto'), {
    background: 'var(--gradient-brand)',
    color: 'var(--color-on-brand)',
  });
});
