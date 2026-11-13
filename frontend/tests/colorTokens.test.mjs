import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio } from '../src/utils/color.ts';

const TOKEN_FILES = ['brand.css', 'primitives.css', 'semantic.css', 'components.css'];
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const TOKENS = fileURLToPath(new URL('../src/styles/tokens/', import.meta.url));
const DARK_SELECTOR = '[data-bs-theme="dark"]';
const PENDING = new Set();

function readTokenCss() {
  return TOKEN_FILES.map((f) => readFileSync(join(TOKENS, f), 'utf8')).join('\n');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blockVars(css, selector) {
  const map = new Map();
  const block = new RegExp(escapeRegExp(selector) + '\\s*\\{([^}]*)\\}', 'g');
  for (const [, body] of css.matchAll(block)) {
    for (const [, name, value] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      map.set(name, value.trim());
    }
  }
  return map;
}

function themeVars(css) {
  const light = blockVars(css, ':root');
  const dark = new Map(light);
  for (const [name, value] of blockVars(css, DARK_SELECTOR)) dark.set(name, value);
  return { light, dark };
}

function resolve(value, vars, depth = 0) {
  if (depth > 12) throw new Error(`var() circular: ${value}`);
  return value.replace(/var\(--([\w-]+)\)/g, (_, name) => {
    if (!vars.has(name)) throw new Error(`Token inexistente: --${name}`);
    return resolve(vars.get(name), vars, depth + 1);
  });
}

function colorOf(vars, name) {
  return resolve(`var(--${name})`, vars);
}

test('todos los tokens referenciados existen en ambos temas', () => {
  const { light, dark } = themeVars(readTokenCss());
  for (const vars of [light, dark]) {
    for (const value of vars.values()) resolve(value, vars);
    assert.ok(vars.has('color-bg') && vars.has('color-text'));
  }
});

test('pares base cumplen AA en claro y oscuro', () => {
  const { light, dark } = themeVars(readTokenCss());
  const pairs = [
    ['color-text', 'color-bg', 4.5],
    ['color-text-muted', 'color-bg', 4.5],
    ['color-on-brand', 'color-brand-solid', 4.5],
    ['color-brand', 'color-brand-soft', 4.5],
    ['color-success-text', 'color-success-soft', 4.5],
    ['color-warning-text', 'color-warning-soft', 4.5],
    ['color-danger-text', 'color-danger-soft', 4.5],
    ['color-info-text', 'color-info-soft', 4.5],
    ['status-aprobada-text', 'status-aprobada-bg', 4.5],
    ['status-regular-text', 'status-regular-bg', 4.5],
    ['status-cursando-text', 'status-cursando-bg', 4.5],
    ['status-libre-text', 'status-libre-bg', 4.5],
    ['status-disponible-text', 'status-disponible-bg', 4.5],
    ['status-bloqueada-text', 'status-bloqueada-bg', 4.5],
  ];
  for (const [theme, vars] of Object.entries({ light, dark })) {
    for (const [fg, bg, min] of pairs) {
      const ratio = contrastRatio(colorOf(vars, fg), colorOf(vars, bg));
      assert.ok(ratio >= min, `${theme}: ${fg}/${bg} = ${ratio.toFixed(2)}`);
    }
  }
});

test('señales del grafo cumplen 3:1 en claro y oscuro', () => {
  const { light, dark } = themeVars(readTokenCss());
  const signals = [
    'graph-edge', 'graph-edge-pending', 'graph-edge-fulfilled',
    'graph-path-requirements', 'graph-path-suggested',
    'graph-selection', 'graph-unlock',
  ];
  for (const [theme, vars] of Object.entries({ light, dark })) {
    const bg = colorOf(vars, 'graph-bg');
    for (const signal of signals) {
      const ratio = contrastRatio(colorOf(vars, signal), bg);
      assert.ok(ratio >= 3, `${theme}: ${signal}/graph-bg = ${ratio.toFixed(2)}`);
    }
  }
});

test('cada estado define bg, border, text y solid en ambos temas', () => {
  const { light, dark } = themeVars(readTokenCss());
  const statuses = ['aprobada', 'regular', 'cursando', 'libre', 'disponible', 'bloqueada'];
  const roles = ['bg', 'border', 'text', 'solid'];
  for (const [theme, vars] of Object.entries({ light, dark })) {
    for (const status of statuses) {
      for (const role of roles) {
        const name = `status-${status}-${role}`;
        assert.ok(vars.has(name), `${theme}: falta --${name}`);
      }
    }
  }
});

test('presupuesto de selectores dark', () => {
  let count = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(css|ts|tsx)$/.test(entry.name)) {
        count += (readFileSync(path, 'utf8').match(/\[data-bs-theme=["']dark["']\]/g) ?? []).length;
      }
    }
  };
  walk(SRC);
  assert.ok(count <= 6, `selectores dark: ${count}`);
});

test('no hay literales fuera de tokens', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const path = full.slice(SRC.length).replaceAll('\\', '/');
      if (entry.isDirectory()) {
        if (path.includes('/styles/tokens') || path.startsWith('styles/tokens')) continue;
        walk(full);
      } else if (/\.(css|ts|tsx)$/.test(entry.name) && !PENDING.has(path)) {
        const text = readFileSync(full, 'utf8');
        if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/i.test(text)) offenders.push(path);
      }
    }
  };
  walk(SRC);
  assert.deepEqual(offenders, []);
});
