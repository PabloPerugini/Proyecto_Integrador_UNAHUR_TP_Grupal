import test from 'node:test';
import assert from 'node:assert/strict';
import { matchHistorySubject } from '../src/utils/progressHistoryMatch.ts';

const subject = (code, name) => ({
  _id: code,
  code,
  subject: { name },
});
const getName = value => value.subject.name;

test('matches numeric codes regardless of leading zeroes', () => {
  const target = subject('4', 'Cultura Digital');
  assert.equal(matchHistorySubject({ code: '004', name: 'Otro nombre' }, [target], getName), target);
});

test('matches names ignoring accents and punctuation', () => {
  const target = subject('SA_007', 'Introducción a Lógica');
  assert.equal(matchHistorySubject({ name: 'INTRODUCCION A LOGICA.' }, [target], getName), target);
});

test('matches Roman numerals and optional Spanish articles', () => {
  const targets = [
    subject('OF002', 'Matemática para Informática 1'),
    subject('OF003', 'Organización de las Computadoras 1'),
    subject('OF016', 'Programación con Objetos 2'),
  ];
  assert.equal(matchHistorySubject({ code: '788', name: 'Matemática para informática I' }, targets, getName), targets[0]);
  assert.equal(matchHistorySubject({ code: '790', name: 'Organización de computadoras I' }, targets, getName), targets[1]);
  assert.equal(matchHistorySubject({ code: '765', name: 'Programación con objetos II' }, targets, getName), targets[2]);
});

test('does not choose between ambiguous matches', () => {
  assert.equal(
    matchHistorySubject({ code: '004' }, [subject('004', 'Una'), subject('4', 'Otra')], getName),
    null,
  );
});
