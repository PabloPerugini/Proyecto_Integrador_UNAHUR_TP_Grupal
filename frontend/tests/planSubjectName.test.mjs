import test from 'node:test';
import assert from 'node:assert/strict';
import { planSubjectName } from '../src/utils/planSubjectName.ts';

test('prioriza el nombre visible del plan sobre el nombre del catálogo', () => {
  assert.equal(planSubjectName({
    nameOverride: '  Nombre corregido  ',
    subject: { name: 'Nombre del catálogo' },
    code: 'MAT-01',
  }), 'Nombre corregido');
});

test('usa el nombre del catálogo si el override está vacío', () => {
  assert.equal(planSubjectName({
    nameOverride: '  ',
    subject: { name: 'Nombre del catálogo' },
    code: 'MAT-01',
  }), 'Nombre del catálogo');
});

test('usa el código si no hay override ni materia poblada', () => {
  assert.equal(planSubjectName({ nameOverride: null, subject: null, code: ' MAT-01 ' }), 'MAT-01');
});

test('usa el nombre de respaldo si faltan los demás valores', () => {
  assert.equal(planSubjectName({}), 'Materia sin nombre');
});
