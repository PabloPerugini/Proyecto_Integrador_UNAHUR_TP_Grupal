import test from 'node:test';
import assert from 'node:assert/strict';

import { planCardClasses, periodLabel, BLOCKED_FAINT_OPACITY } from '../src/utils/planCard.ts';
import { STATUS_TEXT_COLOR } from '../src/utils/status.ts';

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

test('el atenuado de bloqueadas mantiene contraste >= 4.5:1 sobre blanco', () => {
  const blend = (hex) => {
    const v = hex.replace('#', '');
    return [0, 2, 4].map(i =>
      Math.round(BLOCKED_FAINT_OPACITY * parseInt(v.slice(i, i + 2), 16) + (1 - BLOCKED_FAINT_OPACITY) * 255),
    );
  };
  const [r, g, b] = blend(STATUS_TEXT_COLOR);
  const channel = (c) => { const n = c / 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; };
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const ratio = 1.05 / (luminance + 0.05);
  assert.ok(ratio >= 4.5, `contraste ${ratio.toFixed(2)}:1`);
});
