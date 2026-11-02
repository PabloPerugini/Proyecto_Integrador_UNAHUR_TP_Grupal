import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NICKNAME_MIN_LENGTH,
  validateName,
  validateNickname,
} from '../src/utils/userValidation.ts';

test('validateName acepta los mismos nombres que el backend (sin regex de solo letras)', () => {
  assert.equal(validateName('Ana 2', 'nombre'), '');
  assert.equal(validateName('María-José', 'nombre'), '');
  assert.equal(validateName('O’Connor', 'nombre'), '');
});

test('validateName mantiene el mínimo y máximo de 2 a 50', () => {
  assert.match(validateName('A', 'nombre'), /al menos 2/);
  assert.match(validateName('x'.repeat(51), 'nombre'), /50/);
});

test('validateNickname solo exige que no esté vacío', () => {
  assert.equal(NICKNAME_MIN_LENGTH, 1);
  assert.equal(validateNickname('a'), '');
  assert.equal(validateNickname('   '), 'El nickname es obligatorio.');
});
