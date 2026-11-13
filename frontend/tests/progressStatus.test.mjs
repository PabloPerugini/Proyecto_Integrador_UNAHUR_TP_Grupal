import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProgressStatuses } from '../src/utils/progressStatus.ts';

const subjects = [
  { _id: 'a', prerequisites: [] },
  { _id: 'b', prerequisites: [{ planSubject: 'a', requiredStatus: 'REGULARIZADA' }] },
  { _id: 'c', prerequisites: [{ planSubject: 'b', requiredStatus: 'APROBADA' }] },
];

test('calcula disponibilidad a partir de las correlativas', () => {
  const statuses = resolveProgressStatuses(subjects, new Map());
  assert.equal(statuses.get('a'), 'DISPONIBLE');
  assert.equal(statuses.get('b'), 'BLOQUEADA');
});

test('respeta el nivel requerido y propaga progreso sustentado', () => {
  const statuses = resolveProgressStatuses(subjects, new Map([
    ['a', 'REGULARIZADA'],
    ['b', 'APROBADA'],
  ]));
  assert.equal(statuses.get('a'), 'REGULARIZADA');
  assert.equal(statuses.get('b'), 'APROBADA');
  assert.equal(statuses.get('c'), 'DISPONIBLE');
});

test('preserva correlativas con avance cuando la materia pierde regularidad', () => {
  const statuses = resolveProgressStatuses(subjects, new Map([
    ['a', 'LIBRE'],
    ['b', 'APROBADA'],
    ['c', 'REGULARIZADA'],
  ]));
  assert.equal(statuses.get('a'), 'LIBRE');
  assert.equal(statuses.get('b'), 'APROBADA');
  assert.equal(statuses.get('c'), 'REGULARIZADA');
});

test('mantiene bloqueado el nuevo avance que depende de una materia libre', () => {
  const statuses = resolveProgressStatuses(subjects, new Map([
    ['a', 'LIBRE'],
  ]));
  assert.equal(statuses.get('b'), 'BLOQUEADA');
});
