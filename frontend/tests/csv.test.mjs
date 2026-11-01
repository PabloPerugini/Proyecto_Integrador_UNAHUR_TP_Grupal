import test from 'node:test';
import assert from 'node:assert/strict';

import { csvCell, toCsv } from '../src/utils/csv.ts';

test('csvCell neutraliza fórmulas de hoja de cálculo', () => {
  for (const value of ['=1+1', '+123', '-10', '@correo']) {
    assert.equal(csvCell(value), `"'${value}"`);
  }
});

test('csvCell no toca texto normal y duplica comillas', () => {
  assert.equal(csvCell('Materia "especial"'), '"Materia ""especial"""');
  assert.equal(csvCell(2025), '"2025"');
});

test('toCsv arma filas separadas por punto y coma', () => {
  assert.equal(
    toCsv([['codigo', 'materia'], ['=A1', 'Análisis']]),
    '"codigo";"materia"\r\n"\'=A1";"Análisis"',
  );
});
