import test from 'node:test';
import assert from 'node:assert/strict';

import { BLOCKED_FAINT_OPACITY } from '../src/utils/planCard.ts';
import { contrast, blendOver, parseCssRules, readStylesheet, declaration } from './colorUtils.mjs';

// El look del grafo define los colores en styles/graph.css; estos tests leen
// esa hoja y defienden el contraste real que se renderiza (≥ 4.5:1).

const rules = parseCssRules(readStylesheet('graph.css'));

function bodyOf(describe) {
  const rule = rules.find(r => describe(r.selector));
  assert.ok(rule, `regla no encontrada: ${describe}`);
  return rule.body;
}

function hexOf(body, prop) {
  const value = declaration(body, prop);
  assert.ok(value && /^#[0-9a-fA-F]{6}$/.test(value), `se esperaba un hex en "${prop}" y llegó: ${value}`);
  return value;
}

const stateBackgrounds = ['aprobada', 'regular', 'cursando', 'disponible', 'bloqueada'].map(status => ({
  status,
  background: hexOf(bodyOf(sel => sel === `.plan-node--status-${status}`), 'background'),
}));

test('el texto base de la tarjeta mantiene contraste >= 4.5:1 sobre blanco', () => {
  const color = hexOf(bodyOf(sel => sel === '.plan-node'), 'color');
  const ratio = contrast(color, '#ffffff');
  assert.ok(ratio >= 4.5, `contraste ${ratio.toFixed(2)}:1 entre ${color} y #ffffff`);
});

test('el subtítulo de la tarjeta mantiene contraste >= 4.5:1 sobre cada fondo de estado', () => {
  const subtitle = hexOf(bodyOf(sel => sel === '.plan-node__period, .plan-node__meta'), 'color');
  for (const { status, background } of stateBackgrounds) {
    const ratio = contrast(subtitle, background);
    assert.ok(ratio >= 4.5, `${status}: contraste ${ratio.toFixed(2)}:1 entre ${subtitle} y ${background}`);
  }
});

test('la materia bloqueada atenuada (75%) conserva >= 4.5:1 en texto y subtítulo', () => {
  const blockedBody = bodyOf(sel => sel === '.plan-node--status-bloqueada');
  // Si la regla de estado no fija color, la tarjeta usa el color base.
  const blockedColor = declaration(blockedBody, 'color')
    ?? hexOf(bodyOf(sel => sel === '.plan-node'), 'color');
  const cardBlend = blendOver(blockedColor, BLOCKED_FAINT_OPACITY);
  const cardRatio = contrast(cardBlend, '#ffffff');
  assert.ok(cardRatio >= 4.5, `texto: ${cardRatio.toFixed(2)}:1 entre ${cardBlend} y #ffffff`);

  const subtitleBody = bodyOf(sel => sel.includes('.plan-node--status-bloqueada .plan-node__period'));
  const declared = declaration(subtitleBody, 'color');
  const subtitleColor = declared === 'inherit' ? blockedColor : declared;
  const subtitleBlend = blendOver(subtitleColor, BLOCKED_FAINT_OPACITY);
  const subtitleRatio = contrast(subtitleBlend, '#ffffff');
  assert.ok(subtitleRatio >= 4.5, `subtítulo: ${subtitleRatio.toFixed(2)}:1 entre ${subtitleBlend} y #ffffff`);
});

test('el conteo por cuatrimestre mantiene contraste >= 4.5:1 sobre su panel', () => {
  const color = hexOf(bodyOf(sel => sel === '.plan-semester-count'), 'color');
  // Panel: gradiente #eaf1f9 -> #eef3f8 sobre #f8fbff; se usa el extremo más oscuro.
  const ratio = contrast(color, '#eaf1f9');
  assert.ok(ratio >= 4.5, `contraste ${ratio.toFixed(2)}:1 entre ${color} y #eaf1f9`);
});

test('el subtítulo del encabezado mantiene contraste >= 4.5:1 sobre su fondo', () => {
  const color = hexOf(bodyOf(sel => sel === '.plan-map-heading__subtitle'), 'color');
  // Encabezado: gradiente #f2f7fe -> #f8fbff; se usa el extremo más oscuro.
  const ratio = contrast(color, '#f2f7fe');
  assert.ok(ratio >= 4.5, `contraste ${ratio.toFixed(2)}:1 entre ${color} y #f2f7fe`);
});
