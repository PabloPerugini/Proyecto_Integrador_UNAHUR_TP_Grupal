import test from 'node:test';
import assert from 'node:assert/strict';

import { previousProgressStatus } from '../src/utils/progressStatus.ts';

test('retroceder una materia cursando la deja pendiente', () => {
  assert.equal(previousProgressStatus('Cursando'), 'PENDIENTE');
});

test('retroceder una materia aprobada la deja cursando', () => {
  assert.equal(previousProgressStatus('Aprobada'), 'CURSANDO');
});

test('los estados sin retroceso registrable devuelven null', () => {
  for (const status of ['Regular', 'Disponible', 'Bloqueada', undefined]) {
    assert.equal(previousProgressStatus(status), null);
  }
});
