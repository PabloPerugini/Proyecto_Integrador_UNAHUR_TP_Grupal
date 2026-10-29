import test from 'node:test';
import assert from 'node:assert/strict';

import { planCardClasses, periodLabel, blockedFaintApplies } from '../src/utils/planCard.ts';

const base = { status: 'Aprobada', critical: false, optimal: false, highlightedNext: false, selectedSubject: false };

test('estado base -> clases de tarjeta', () => {
  assert.equal(planCardClasses(base), 'plan-node plan-node--status-aprobada');
});

test('cada estado aporta su clase', () => {
  for (const status of ['Aprobada', 'Regular', 'Cursando', 'Disponible', 'Bloqueada']) {
    assert.ok(planCardClasses({ ...base, status }).includes(`plan-node--status-${status.toLowerCase()}`));
  }
});

test('en curso suma plan-node--in-progress', () => {
  assert.ok(planCardClasses({ ...base, status: 'Cursando' }).includes('plan-node--in-progress'));
  assert.ok(!planCardClasses(base).includes('plan-node--in-progress'));
});

test('estados activos suman sus clases sin perder la de estado', () => {
  for (const extra of [
    ['highlightedNext', 'plan-node--highlighted-next'],
    ['newlyUnlocked', 'plan-node--unlocked'],
    ['selectedSubject', 'plan-node--selected'],
    ['critical', 'plan-node--critical'],
    ['optimal', 'plan-node--optimal'],
  ]) {
    const classes = planCardClasses({ ...base, [extra[0]]: true });
    assert.ok(classes.includes(extra[1]), `${extra[1]} ausente en "${classes}"`);
    assert.ok(classes.includes('plan-node--status-aprobada'));
  }
});

test('periodLabel cubre anual, cuatrimestres y sin período', () => {
  assert.equal(periodLabel({ duration: 'A', cuatrimestre: 1 }), 'Anual');
  assert.equal(periodLabel({ duration: 'TF', cuatrimestre: null }), 'Anual');
  assert.equal(periodLabel({ cuatrimestre: 1 }), '1° cuatri');
  assert.equal(periodLabel({ cuatrimestre: 2 }), '2° cuatri');
  assert.equal(periodLabel({ cuatrimestre: null }), 'Cuatrimestral');
});

test('el atenuado de bloqueadas no aplica a las tarjetas destacadas de camino', () => {
  assert.equal(blockedFaintApplies({ blocked: true, critical: false, optimal: false }), true);
  assert.equal(blockedFaintApplies({ blocked: true, critical: true, optimal: false }), false);
  assert.equal(blockedFaintApplies({ blocked: true, critical: false, optimal: true }), false);
  assert.equal(blockedFaintApplies({ blocked: false, critical: false, optimal: false }), false);
});
