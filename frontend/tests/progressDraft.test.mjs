import test from 'node:test';
import assert from 'node:assert/strict';

import { parseGrades } from '../src/utils/progressDraft.ts';

test('parseGrades convierte notas válidas y deja vacías en null', () => {
  const grades = parseGrades([
    { id: 'a', name: 'Análisis', grade: '8' },
    { id: 'b', name: 'Álgebra', grade: '  ' },
    { id: 'c', name: 'Física', grade: '10' },
  ]);

  assert.deepEqual([...grades.entries()], [['a', 8], ['b', null], ['c', 10]]);
});

test('parseGrades valida todas las notas antes de devolver resultados', () => {
  assert.throws(
    () =>
      parseGrades([
        { id: 'a', name: 'Análisis', grade: '8' },
        { id: 'b', name: 'Álgebra', grade: '11' },
      ]),
    /La nota de Álgebra debe estar entre 0 y 10/,
  );
});

test('parseGrades rechaza notas no numéricas', () => {
  assert.throws(
    () => parseGrades([{ id: 'a', name: 'Análisis', grade: 'ocho' }]),
    /La nota de Análisis debe estar entre 0 y 10/,
  );
});
