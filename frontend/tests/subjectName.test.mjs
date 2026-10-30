import test from 'node:test';
import assert from 'node:assert/strict';

import { subjectName } from '../src/utils/subjectName.ts';

test('subjectName prioriza nameOverride sobre el nombre de la materia', () => {
  assert.equal(
    subjectName({
      nameOverride: 'Nombre editado',
      subject: { name: 'Nombre base' },
      code: 'MAT001',
    }),
    'Nombre editado',
  );
});

test('subjectName ignora un nameOverride vacío o con espacios', () => {
  assert.equal(
    subjectName({
      nameOverride: '   ',
      subject: { name: 'Nombre base' },
      code: 'MAT001',
    }),
    'Nombre base',
  );
});

test('subjectName usa el nombre de la materia sin nameOverride', () => {
  assert.equal(
    subjectName({ subject: { name: 'Nombre base' }, code: 'MAT001' }),
    'Nombre base',
  );
});

test('subjectName cae al código si no hay nombre', () => {
  assert.equal(subjectName({ code: 'MAT001' }), 'MAT001');
});

test('subjectName devuelve el texto por defecto sin datos', () => {
  assert.equal(subjectName({}), 'Materia sin nombre');
});
