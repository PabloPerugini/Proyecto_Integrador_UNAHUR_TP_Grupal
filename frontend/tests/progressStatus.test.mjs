import test from 'node:test';
import assert from 'node:assert/strict';

import { previousProgressStatus, resolveProgressStatuses } from '../src/utils/progressStatus.ts';

const subject = (id, prerequisites = []) => ({ _id: id, prerequisites });
const saved = entries => new Map(entries);

test('una aprobada habilita la siguiente y una pendiente queda disponible', () => {
  const subjects = [subject('a'), subject('b', [{ planSubject: 'a', requiredStatus: 'APROBADA' }])];
  const states = resolveProgressStatuses(subjects, saved([['a', 'APROBADA'], ['b', 'PENDIENTE']]));

  assert.equal(states.get('a'), 'APROBADA');
  assert.equal(states.get('b'), 'DISPONIBLE');
});

test('una regularizada sustenta solo requisitos REGULARIZADA', () => {
  const regular = subject('a');
  const flexible = subject('b', [{ planSubject: 'a', requiredStatus: 'REGULARIZADA' }]);
  const strict = subject('c', [{ planSubject: 'a', requiredStatus: 'APROBADA' }]);
  const states = resolveProgressStatuses(
    [regular, flexible, strict],
    saved([['a', 'REGULARIZADA'], ['b', 'PENDIENTE'], ['c', 'PENDIENTE']]),
  );

  assert.equal(states.get('a'), 'REGULARIZADA');
  assert.equal(states.get('b'), 'DISPONIBLE');
  assert.equal(states.get('c'), 'BLOQUEADA');
});

test('una aprobada sin correlativas aprobadas queda bloqueada', () => {
  const subjects = [subject('a'), subject('b', [{ planSubject: 'a', requiredStatus: 'APROBADA' }])];
  const states = resolveProgressStatuses(subjects, saved([['a', 'PENDIENTE'], ['b', 'APROBADA']]));

  assert.equal(states.get('b'), 'BLOQUEADA');
});

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
