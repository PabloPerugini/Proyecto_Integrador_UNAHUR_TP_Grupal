# Sistema de color unificado con identidad UNAHUR — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los 432 colores dispersos por un sistema de tokens en cuatro capas, con identidad UNAHUR separada, tema claro/oscuro único, gradientes de superficie y un grafo con jerarquía de señales clara.

**Architecture:** Cuatro archivos de tokens (`brand`, `primitives`, `semantic`, `components`) importados después de Bootstrap; los componentes consumen roles semánticos y nunca literales. TypeScript resuelve tokens en runtime solo donde el navegador no puede (`data:` URI, props de React Flow). Un test de tokens parsea el CSS y bloquea literales, referencias rotas y pares con contraste insuficiente.

**Tech Stack:** React 19, Vite, Bootstrap 5.3, TypeScript strict, Node 22 (`--experimental-strip-types --test`), `@xyflow/react`.

**Spec:** `docs/superpowers/specs/2026-11-14-paleta-tokens-design.md`

## Global Constraints

- Sin dependencias nuevas. Todo con CSS, TypeScript y Node 22.
- Sin cambios de backend, datos, layout, copy ni lógica de negocio.
- No cambiar identificadores internos: `critical` / `optimal`, `careerType: "Tecnicatura"`, `tab === 'tec'`, ids de FAQ.
- Español rioplatense en cualquier texto visible que se toque.
- Cero literales de color (`#hex`, `rgb(`, `rgba(`, `hsl(`, `oklch(`) fuera de `frontend/src/styles/tokens/` y `frontend/src/assets/`.
- Todo par texto/fondo ≥ 4.5:1; bordes e íconos ≥ 3:1. Gate WCAG AA.
- ≤ 6 selectores `[data-bs-theme="dark"]` en `frontend/src`.
- Archivos nuevos < 300 líneas.
- **Git:** un solo commit WIP. No hacer commits por tarea: cada tarea cierra con verificación y, al final, `git commit --amend --no-edit`. No push.
- Comandos, desde `frontend/`: `npx tsc -b --force`, `node --experimental-strip-types --test tests/`. Backend, desde `backend/`: `npm test`.

## Review Focus

1. Íconos de estado dentro de `data:image/svg+xml`: deben salir con el color del tema, no negros ni con el fondo viejo.
2. Color de instituto que llega desde la DB (hex arbitrario) en una portada plena: el texto tiene que seguir legible; nunca asumir blanco.
3. Modo oscuro del grafo: nodos, texto, aristas e islas visibles, sin pasteles sobre negro ni líneas invisibles.
4. Componentes de Bootstrap (botones, forms, tooltips, tablas) heredando los tokens: sin estados ilegibles.
5. Gradientes detrás de texto en portadas y KPI: contraste en ambas paradas, sin texto chico sobre color pleno.

---

### Task 1: Motor de color y contraste

**Files:**
- Create: `frontend/src/utils/color.ts`
- Create: `frontend/tests/color.test.mjs`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: nada.
- Produces: `parseCssColor(input: string): Rgba | null`, `oklchToSrgb(l: number, c: number, h: number): { r: number; g: number; b: number }`, `toHex(input: string): string | null`, `relativeLuminance(color: string): number`, `contrastRatio(a: string, b: string): number`, `contrastText(bg: string, options?: { light?: string; dark?: string }): string`, `readToken(name: string): string`, `clearTokenCache(): void`. `Rgba = { r: number; g: number; b: number; a: number }` con r/g/b 0–255 y a 0–1.

- [ ] **Step 1: Escribir el test que falla**

```js
// frontend/tests/color.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  contrastRatio,
  contrastText,
  parseCssColor,
  readToken,
  toHex,
} from '../src/utils/color.ts';

test('parseCssColor entiende hex, rgb y oklch', () => {
  assert.deepEqual(parseCssColor('#0A6B4E'), { r: 10, g: 107, b: 78, a: 1 });
  assert.deepEqual(parseCssColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseCssColor('rgb(10 107 78 / 0.5)'), { r: 10, g: 107, b: 78, a: 0.5 });
  assert.deepEqual(parseCssColor('white'), { r: 255, g: 255, b: 255, a: 1 });
  const oklch = parseCssColor('oklch(0.469 0.095 165.8)');
  assert.ok(oklch);
  assert.ok(Math.abs(oklch.r - 10) <= 2 && Math.abs(oklch.g - 107) <= 2 && Math.abs(oklch.b - 78) <= 2);
});

test('parseCssColor rechaza lo que no entiende', () => {
  assert.equal(parseCssColor('nope'), null);
  assert.equal(parseCssColor(''), null);
});

test('toHex normaliza y convierte oklch', () => {
  assert.equal(toHex('#0A6B4E'), '#0a6b4e');
  assert.equal(toHex('oklch(1 0 0)'), '#ffffff');
  assert.equal(toHex('oklch(0 0 0)'), '#000000');
  assert.equal(toHex('nope'), null);
});

test('contrastRatio coincide con WCAG', () => {
  assert.ok(Math.abs(contrastRatio('#0a6b4e', '#ffffff') - 6.51) < 0.02);
  assert.ok(Math.abs(contrastRatio('#238a42', '#ffffff') - 4.39) < 0.02);
});

test('contrastText elige el color que contrasta', () => {
  assert.equal(contrastText('#f08100', { light: '#ffffff', dark: '#10161f' }), '#10161f');
  assert.equal(contrastText('#0a6b4e', { light: '#ffffff', dark: '#10161f' }), '#ffffff');
});

test('readToken no rompe fuera del navegador', () => {
  assert.equal(typeof readToken('--color-bg'), 'string');
});
```

- [ ] **Step 2: Correr y ver el fallo**

Run: `node --experimental-strip-types --test tests/color.test.mjs`
Expected: FAIL con `Cannot find module .../src/utils/color.ts`.

- [ ] **Step 3: Implementar `color.ts`**

Reglas de implementación:
- Hex de 3, 6 y 8 dígitos; `rgb()` / `rgba()` con comas o espacios; `oklch()` con L 0–1 o porcentaje y alfa opcional; nombres `white`, `black`, `transparent`.
- `oklchToSrgb` usa las matrices OKLab → LMS → lineal sRGB, clamp 0–1 y transferencia sRGB. `parseCssColor` reutiliza esa conversión.
- `relativeLuminance` usa los coeficientes WCAG (0.2126, 0.7152, 0.0722) sobre canales lineales.
- `contrastText` compara contra `options.light`/`options.dark`; si no vienen y hay `document`, usa `readToken('--color-on-brand')` y `readToken('--color-ink')`; sin DOM usa `'white'` y `'black'`. Devuelve el de mayor ratio.
- `readToken` normaliza el nombre a `--kebab-case`, lee `getComputedStyle(document.documentElement)`, cachea por tema (`document.documentElement.dataset.bsTheme ?? 'light'`) y devuelve `''` sin DOM. `clearTokenCache()` vacía la caché.

- [ ] **Step 4: Verificar que pasa**

Run: `node --experimental-strip-types --test tests/color.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Agregar script y verificar TypeScript**

En `package.json`, agregar `"test:color": "node --experimental-strip-types --test tests/color.test.mjs"`. Run: `npx tsc -b --force`. Expected: sin errores.

---

### Task 2: Tokens y tema base

**Files:**
- Create: `frontend/src/styles/tokens/brand.css`
- Create: `frontend/src/styles/tokens/primitives.css`
- Create: `frontend/src/styles/tokens/semantic.css`
- Create: `frontend/src/styles/tokens/components.css`
- Create: `frontend/src/styles/tokens/README.md`
- Create: `frontend/tests/colorTokens.test.mjs`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/index.css:1-51` (quitar definiciones viejas) y renombrar `--gradify-*` de color en todo el archivo
- Modify: `frontend/src/context/ThemeContext.tsx`
- Modify: `frontend/index.html`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: `parseCssColor`, `contrastRatio` de Task 1.
- Produces: tokens `--unahur-*`, `--palette-*`, `--color-*`, `--status-*`, `--graph-*`, `--gradient-*`, `--shadow-*`; map de `--bs-*`; `clearTokenCache` usado por `ThemeContext`.

- [ ] **Step 1: Escribir el test de tokens que falla**

```js
// frontend/tests/colorTokens.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { contrastRatio } from '../src/utils/color.ts';

const TOKEN_FILES = ['brand.css', 'primitives.css', 'semantic.css', 'components.css'];
const PENDING = new Set([
  'src/index.css', 'src/pages/Faq.css', 'src/components/SplashScreen.css',
  'src/components/AcademicMap.css', 'src/components/AcademicMapCanvas.tsx',
  'src/pages/PlanGraph.tsx', 'src/pages/Home.tsx', 'src/pages/MyProgress.tsx',
  'src/components/AdminCatalog.tsx', 'src/utils/status.ts',
  'src/utils/graphHighlight.ts', 'src/utils/instituteColors.ts',
  'src/api/planGraphAdapter.ts',
]);

function readTokenCss() {
  return TOKEN_FILES.map((f) => readFileSync(join('src/styles/tokens', f), 'utf8')).join('\n');
}
function varsOf(css) {
  const map = new Map();
  for (const [, name, value] of css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) map.set(name, value.trim());
  return map;
}
function resolve(value, vars, depth = 0) {
  if (depth > 12) throw new Error(`var() circular: ${value}`);
  return value.replace(/var\(--([\w-]+)\)/g, (_, name) => {
    if (!vars.has(name)) throw new Error(`Token inexistente: --${name}`);
    return resolve(vars.get(name), vars, depth + 1);
  });
}

test('todos los tokens referenciados existen', () => {
  const vars = varsOf(readTokenCss());
  for (const value of vars.values()) resolve(value, vars);
  assert.ok(vars.has('color-bg') && vars.has('color-text'));
});

test('pares base cumplen AA', () => {
  const vars = varsOf(readTokenCss());
  const color = (name) => resolve(`var(--${name})`, vars);
  const pairs = [
    ['color-text', 'color-bg', 4.5],
    ['color-text-muted', 'color-bg', 4.5],
    ['color-on-brand', 'color-brand-solid', 4.5],
    ['status-aprobada-text', 'status-aprobada-bg', 4.5],
    ['status-libre-text', 'status-libre-bg', 4.5],
  ];
  for (const [fg, bg, min] of pairs) {
    const ratio = contrastRatio(color(fg), color(bg));
    assert.ok(ratio >= min, `${fg}/${bg} = ${ratio.toFixed(2)}`);
  }
});

test('no hay literales fuera de tokens', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name).replaceAll('\\', '/');
      if (entry.isDirectory()) {
        if (path.includes('/styles/tokens')) continue;
        walk(path);
      } else if (/\.(css|ts|tsx)$/.test(entry.name) && !PENDING.has(path)) {
        const text = readFileSync(path, 'utf8');
        if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/i.test(text)) offenders.push(path);
      }
    }
  };
  walk('src');
  assert.deepEqual(offenders, []);
});
```

- [ ] **Step 2: Correr y ver el fallo**

Run: `node --experimental-strip-types --test tests/colorTokens.test.mjs`
Expected: FAIL con `ENOENT ... brand.css`.

- [ ] **Step 3: Crear `brand.css` con la identidad UNAHUR**

Valores exactos: `--unahur-green: #238a42`, `--unahur-amber: #ffb020`, `--unahur-bio: #219ecf`, `--unahur-tech: #f08100`, `--unahur-health: #00a79f`, `--unahur-education: #ea4f51`.

`brand.css` contiene **solo identidad**. El verde de acción `#0a6b4e` no vive acá: es el ancla de la rampa `--palette-brand-*` en `primitives.css` (`oklch(0.469 0.095 165.8)`). No crear `--unahur-green-strong`.

- [ ] **Step 4: Crear `primitives.css`**

Rampas OKLCH de cinco pasos (`100`, `300`, `500`, `700`, `900`) para `brand`, `neutral`, `success`, `warning`, `danger`, `info`, `violet`, `teal`, más `--palette-ink`. Anclas verificadas:

| Rampa | H | C | L base |
|---|---|---|---|
| brand | 165.8 | 0.095 | 0.469 |
| success | 149.2 | 0.170 | 0.627 |
| warning | 65.0 | 0.150 | 0.550 (texto) / 0.813 (relleno) |
| danger | 21.2 | 0.202 | 0.592 |
| info | 261.0 | 0.220 | 0.522 |
| violet | 292.1 | 0.230 | 0.513 |
| teal | 188.8 | 0.114 | 0.657 |
| neutral | 264.0 | 0.019 | superficies: 0.977 / 0.968 / 0.920 / 0.214 / 0.173 |

`--palette-ink: oklch(0.199 0.020 258.3)`. `--palette-brand-rgb: 10, 107, 78`. Los pasos 100/300/700/900 se derivan bajando o subiendo L en pasos de 0.10–0.16 manteniendo H y ajustando C para no salir de gamut.

- [ ] **Step 5: Crear `semantic.css`**

Mapear roles claro en `:root` y oscuro en `[data-bs-theme="dark"]`:

`--color-bg`, `--color-surface`, `--color-surface-2`, `--color-surface-3`, `--color-surface-glass`, `--color-border`, `--color-border-strong`, `--color-border-subtle`, `--color-text`, `--color-text-muted`, `--color-text-subtle`, `--color-brand`, `--color-brand-solid`, `--color-brand-strong`, `--color-brand-soft`, `--color-on-brand`, `--color-ink`, `--color-on-institute`, `--color-accent`, `--color-accent-soft`, `--color-focus`, `--color-success`, `--color-warning`, `--color-danger`, `--color-danger-strong`, `--color-info` y sus `-soft`.

Estados, cada uno con `bg`, `border`, `text`, `solid`: `--status-{aprobada,regular,cursando,libre,disponible,bloqueada}-*`.

Grafo: `--graph-bg`, `--graph-grid`, `--graph-edge`, `--graph-edge-pending`, `--graph-edge-fulfilled`, `--graph-path-requirements`, `--graph-path-suggested`, `--graph-selection`, `--graph-unlock`, `--graph-dim-opacity`.

Gradientes: `--gradient-brand`, `--gradient-surface`, `--gradient-app-glow`, `--gradient-institute-{bio,tech,health,education}` y sus `-soft`.

Sombras: `--shadow-sm`, `--shadow-md`, `--shadow-lg`. Mapa de Bootstrap: `--bs-body-bg`, `--bs-body-color`, `--bs-secondary-bg`, `--bs-tertiary-bg`, `--bs-border-color`, `--bs-secondary-color`, `--bs-emphasis-color`, `--bs-primary`, `--bs-primary-rgb`, `--bs-link-color`, `--bs-link-hover-color`, `--bs-focus-ring-color`, `--bs-success`, `--bs-warning`, `--bs-danger`, `--bs-info`, `--bs-tooltip-bg`, `--bs-tooltip-color`, `--bs-card-bg`, `--bs-card-cap-bg`.

En claro, `--color-brand` y `--color-brand-solid` son `--palette-brand-500`; en oscuro, `--color-brand` es `--palette-brand-300` (texto/enlace) y `--color-brand-solid` es `--palette-brand-500` (relleno). `--color-on-brand` siempre blanco.

- [ ] **Step 6: Crear `components.css` y el README**

`components.css`: solo `--plan-highlight-color`, `--map-island-color`, `--map-island-base`, `--map-island-step`, `--map-island-mix`. `README.md`: tabla de tokens, reglas de identidad y la regla "ningún literal fuera de esta carpeta".

- [ ] **Step 7: Importar en orden y renombrar**

`main.tsx`: `bootstrap.min.css` → `brand.css` → `primitives.css` → `semantic.css` → `components.css` → `index.css`.

En `index.css`, borrar el bloque `:root` de colores y el bloque dark de colores (líneas 1–51), conservando radios.

**No hagas un rename ciego de `--gradify-brand`**: hoy se usa para identidad y para acción indistintamente. Clasificá cada aparición:

| Uso viejo | Token nuevo |
|---|---|
| `--gradify-brand` como fondo de botón/acción | `--color-brand-solid` |
| `--gradify-brand` como texto, ícono, borde o foco de acción | `--color-brand` |
| `--gradify-brand` como identidad (logo, marca de sidebar, acento decorativo) | `--unahur-green` |
| `--gradify-brand-2` como hover/active de acción | `--color-brand-strong` |
| `--gradify-brand-2` como texto de énfasis | `--color-brand` |
| `rgba(var(--gradify-brand-rgb), α)` | `color-mix(in srgb, var(--color-brand-solid) α%, transparent)`; si el uso era identidad (glow del logo, marca), usar `--unahur-green` |
| `--gradify-sidebar-active` | `--color-brand` |
| `--gradify-sidebar-danger` / `-hover` | `--color-danger` / `--color-danger-strong` |

El resto es rename directo: `--gradify-accent` → `--color-accent`, `--gradify-app-bg` → `--color-bg`, `--gradify-surface` → `--color-surface`, `--gradify-surface-2` → `--color-surface-2`, `--gradify-surface-3` → `--color-surface-3`, `--gradify-border` → `--color-border`, `--gradify-text` → `--color-text`, `--gradify-text-muted` → `--color-text-muted`, `--gradify-glass` → `--color-surface-glass`, `--gradify-shadow-sm` → `--shadow-sm`, `--gradify-shadow` → `--shadow-md`, `--gradify-shadow-lg` → `--shadow-lg`. Mantener `--gradify-radius*`.

- [ ] **Step 8: Tema y meta**

`ThemeContext.tsx`: importar `clearTokenCache` y llamarlo dentro del efecto que aplica el tema; actualizar `<meta name="theme-color">` con `toHex(readToken('--color-bg'))`. Si `toHex` devuelve `null`, no tocar el meta (nunca escribir un hex de fallback en TS). `index.html`: `theme-color` inicial `#f3f4f9`.

- [ ] **Step 9: Verificar**

Run: `node --experimental-strip-types --test tests/colorTokens.test.mjs` → PASS (3 tests).
Run: `npx tsc -b --force` → sin errores.
Abrir la app: botón primario y links en verde de acción; `data-bs-theme="dark"` cambia superficies; ningún texto invisible.

---

### Task 3a: Migrar shell y navegación (`index.css` 1–602)

**Files:**
- Modify: `frontend/src/index.css:1-602`
- Test: `frontend/tests/colorTokens.test.mjs` (sin cambios de código; sigue con `index.css` en `PENDING`)

**Interfaces:**
- Consumes: tokens de Task 2.
- Produces: `index.css` sin literales en el rango 1–602.

- [ ] **Step 1: Reemplazar literales por roles**

Reglas: fondo de app → `--color-bg`; tarjetas/superficies → `--color-surface*`; bordes → `--color-border*`; texto → `--color-text*`; marca → `--color-brand*`; peligro → `--color-danger*`; éxito → `--color-success*`; aviso → `--color-warning*`; info → `--color-info*`; blanco como texto → `--color-on-brand`; blanco como superficie → `--color-surface`; `rgba(var(--palette-brand-rgb), α)` → `color-mix(in srgb, var(--color-brand) α%, transparent)`.

- [ ] **Step 2: Borrar dark blocks cubiertos**

Eliminar los `[data-bs-theme="dark"]` de este rango cuando el swap semántico ya resuelva el color. Conservar solo reglas estructurales (por ejemplo, un asset distinto), no colores.

- [ ] **Step 3: Aplicar gradientes de marca**

`.btn-gradify` y la marca de la sidebar usan `--gradient-brand`; el fondo del body usa `--gradient-app-glow`. No tocar textos ni chips.

- [ ] **Step 4: Verificar el rango**

Run (PowerShell, desde `frontend/`):
`Select-String -Path src\index.css -Pattern '#[0-9a-f]{3,8}|rgba?\(|oklch\(' | Where-Object { $_.LineNumber -le 602 }`
Expected: sin resultados.

- [ ] **Step 5: Verificación visual**

Claro y oscuro: login, sidebar, top bar mobile, toasts y layout. Ningún borde o texto invisible; el foco se ve.

---

### Task 3b: Migrar páginas y dashboard (`index.css` 603–1582)

**Files:**
- Modify: `frontend/src/index.css:603-1582`
- Test: `frontend/tests/colorTokens.test.mjs`

**Interfaces:**
- Consumes: tokens de Task 2.
- Produces: rango 603–1582 sin literales.

- [ ] **Step 1: Migrar colores**

Mismas reglas que Task 3a. Para estados académicos en tarjetas/filas usar `--status-*`; para el anillo de progreso, `--color-brand` y `--color-surface-3`; para chips, `--color-success-soft` / `--color-warning-soft` / `--color-danger-soft` con su texto.

- [ ] **Step 2: Gradientes de superficie**

Aplicar `--gradient-surface` en encabezados de sección y tarjetas KPI. No usarlo en filas de tabla, chips ni formularios.

- [ ] **Step 3: Borrar dark blocks cubiertos**

Igual que Task 3a.

- [ ] **Step 4: Verificar el rango**

`Select-String -Path src\index.css -Pattern '#[0-9a-f]{3,8}|rgba?\(|oklch\(' | Where-Object { $_.LineNumber -ge 603 -and $_.LineNumber -le 1582 }`
Expected: sin resultados.

- [ ] **Step 5: Verificación visual**

Claro y oscuro: Home (carreras, planes inscriptos, tabs), tarjetas de estadísticas, anillo de progreso, toggle de tema, dropzone de PDF y selector buscable.

---

### Task 3c: Migrar grafo shell, progreso, FAQ y splash (`index.css` 1583–final + CSS externos)

**Files:**
- Modify: `frontend/src/index.css:1583-2981`
- Modify: `frontend/src/pages/Faq.css`
- Modify: `frontend/src/components/SplashScreen.css`
- Test: `frontend/tests/colorTokens.test.mjs` (quitar `src/index.css`, `src/pages/Faq.css` y `src/components/SplashScreen.css` de `PENDING`)

**Interfaces:**
- Consumes: tokens de Task 2.
- Produces: los tres archivos sin literales.

- [ ] **Step 1: Migrar `index.css` restante**

Secciones: grafo/tablero (shell de la página), responsive, progreso compacto, administración de usuarios, perfil, dropdown de cuenta y página de progreso. Usar `--graph-*` solo para lo que sea canvas/aristas; el resto es semántico.

- [ ] **Step 2: Migrar `Faq.css` y `SplashScreen.css`**

Reemplazar `rgba()` y hex por tokens. El splash conserva sus radiales con `--color-brand` y `--color-info`; nada de literales.

- [ ] **Step 3: Quitar los archivos de `PENDING`**

Editar el set del test. Run: `node --experimental-strip-types --test tests/colorTokens.test.mjs` → PASS.

- [ ] **Step 4: Verificar archivos completos**

`Select-String -Path src\index.css,src\pages\Faq.css,src\components\SplashScreen.css -Pattern '#[0-9a-f]{3,8}|rgba?\(|oklch\('`
Expected: sin resultados.

- [ ] **Step 5: Verificación visual**

Claro y oscuro: FAQ, splash, página de progreso, administración y perfil.

---

### Task 4: Mapa académico

**Files:**
- Modify: `frontend/src/components/AcademicMap.css`
- Modify: `frontend/src/components/AcademicMapCanvas.tsx:106-123`
- Test: `frontend/tests/colorTokens.test.mjs`

**Interfaces:**
- Consumes: `--unahur-*`, `--map-island-*`, `--gradient-surface`, `readToken` de Task 1.
- Produces: mapa sin literales y sin selectores dark propios; `markerEnd.color` resuelto con `readToken('--graph-edge')`.

- [ ] **Step 1: Agregar el test de presupuesto dark (falla primero)**

```js
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
  walk('src');
  assert.ok(count <= 6, `selectores dark: ${count}`);
});
```
Run: `node --experimental-strip-types --test tests/colorTokens.test.mjs`. Si el conteo ya quedó en ≤ 6 tras Task 3, el test pasa; si falla, quedan selectores dark por eliminar. El presupuesto se cumple igual al cerrar la tarea.

- [ ] **Step 2: Migrar tokens locales del mapa**

Reemplazar `--academic-map-*` por `--color-*` / `--graph-*`. El canvas usa `--graph-bg` y `--graph-grid`; la cabecera, `--gradient-surface`; los controles, `--color-surface` y `--color-border`.

- [ ] **Step 3: Islas mono-tono**

Una sola regla:
```css
.academic-island {
  --island-fill: color-mix(in oklab, var(--map-island-color) var(--map-island-mix), var(--color-surface-2));
  --island-border: color-mix(in oklab, var(--map-island-color) calc(var(--map-island-mix) * 2), var(--color-border));
}
```
`--map-island-color` se setea inline desde React con `instituteToken(...)`. `--map-island-base` es 6% en claro y 12% en el bloque dark global; cada clase `--0..4` solo define `--map-island-step` (0%, 1%, 2%, 3%, 4%) y `--map-island-mix: calc(var(--map-island-base) + var(--map-island-step))`. Sin selectores dark por isla.

- [ ] **Step 4: Resolver el marker**

En `AcademicMapCanvas.tsx`, importar `readToken` y usar `readToken('--graph-edge')` como fallback del `markerEnd.color` (es un atributo SVG, no acepta `var()` con seguridad).

- [ ] **Step 5: Quitar `PENDING` y verificar**

Quitar `AcademicMap.css` y `AcademicMapCanvas.tsx` del set. Run: `node --experimental-strip-types --test tests/colorTokens.test.mjs` → PASS, incluido el presupuesto dark. `npx tsc -b --force` → sin errores.

- [ ] **Step 6: Verificación visual**

Claro y oscuro: mapa de correlatividades, islas, cabecera, leyenda y controles. Las islas se distinguen entre sí sin parecer un arcoíris.

---

### Task 5: Identidad UNAHUR en TypeScript

**Files:**
- Modify: `frontend/src/utils/instituteColors.ts`
- Modify: `frontend/src/utils/careerColor.ts`
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/pages/MyProgress.tsx`
- Modify: `frontend/src/components/AdminCatalog.tsx`
- Modify: `frontend/src/api/planGraphAdapter.ts:61`
- Create: `frontend/tests/instituteColors.test.mjs`

**Interfaces:**
- Consumes: `contrastText`, `toHex`, `readToken` de Task 1; tokens `--unahur-*`, `--gradient-institute-*`.
- Produces: `instituteToken(unitName?, dbColor?): string`, `instituteHex(unitName?, dbColor?): string` (vacío si no hay DOM), `instituteSurface(unitName?, dbColor?, variant?: 'cover' | 'soft'): { background: string; color: string }`, `instituteKey(unitName?): InstituteKey | null`, `DEFAULT_INSTITUTE_COLOR = 'var(--unahur-green)'`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
// frontend/tests/instituteColors.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { instituteSurface, instituteToken } from '../src/utils/instituteColors.ts';

test('los institutos conocidos devuelven su token', () => {
  assert.equal(instituteToken('Instituto de Biotecnología'), 'var(--unahur-bio)');
  assert.equal(instituteToken('Instituto de Tecnología e Ingeniería'), 'var(--unahur-tech)');
  assert.equal(instituteToken('Instituto de Salud Comunitaria'), 'var(--unahur-health)');
  assert.equal(instituteToken('Instituto de Educación'), 'var(--unahur-education)');
});

test('la DB gana y el desconocido cae al verde', () => {
  assert.equal(instituteToken('Instituto de Biotecnología', '#123456'), '#123456');
  assert.equal(instituteToken('Otro instituto'), 'var(--unahur-green)');
});

test('la portada conocida usa gradiente y tinta', () => {
  assert.deepEqual(instituteSurface('Instituto de Biotecnología'), {
    background: 'var(--gradient-institute-bio)',
    color: 'var(--color-on-institute)',
  });
});

test('la portada de DB usa fondo plano y texto contrastado', () => {
  const surface = instituteSurface(null, '#f08100');
  assert.equal(surface.background, '#f08100');
  assert.equal(surface.color, 'black');
});

test('el instituto desconocido cae al gradiente de marca', () => {
  assert.deepEqual(instituteSurface('Otro instituto'), {
    background: 'var(--gradient-brand)',
    color: 'var(--color-on-brand)',
  });
});
```

- [ ] **Step 2: Correr y ver el fallo**

Run: `node --experimental-strip-types --test tests/instituteColors.test.mjs`
Expected: FAIL con `instituteToken is not a function`.

- [ ] **Step 3: Implementar el contrato**

`instituteKey` mapea los cuatro nombres a `bio|tech|health|education`. `instituteToken` devuelve el color de DB si existe; si no, `var(--unahur-${key})`; si no, `DEFAULT_INSTITUTE_COLOR`. `instituteSurface`:
- Conocido + `cover`: `{ background: 'var(--gradient-institute-' + key + ')', color: 'var(--color-on-institute)' }`.
- Conocido + `soft`: igual con `--gradient-institute-{key}-soft`.
- DB: `{ background: dbColor, color: contrastText(dbColor) }` (sin gradiente).
- Fallback (sin instituto conocido ni color de DB) + `cover`: `{ background: 'var(--gradient-brand)', color: 'var(--color-on-brand)' }`. El verde de identidad con tinta no llega a AA, así que la portada cae al gradiente de acción con blanco.
- Fallback + `soft`: `{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }`.

`instituteHex` resuelve el token con `toHex`: color de DB directo, o `toHex(readToken('--unahur-' + key))`; fallback `toHex(readToken('--unahur-green'))`. Sin DOM devuelve `''` (solo ocurre en tests; en el navegador los tokens siempre están).

- [ ] **Step 4: Actualizar llamadores**

- `careerColor.ts`: `instituteColor` → `instituteToken`; `DEFAULT_INSTITUTE_COLOR` se importa igual.
- `Home.tsx`: importar `instituteSurface`; `careerCoverColor` se reemplaza por `careerCoverSurface(career)` que llama `instituteSurface(unitNameOfCareer(career), career.color ?? unitColorOfCareer(career))`. Las portadas usan `style={careerCoverSurface(career)}`. El chip de título intermedio usa `instituteSurface(..., 'soft')` y aplica `background` y `color`; se elimina `color: '#fff'`. El fallback de `planColor` usa `instituteToken(null)`.
- `MyProgress.tsx`: reemplazar `baseColor` por `instituteSurface(unitName, unitColor, 'soft')`; el botón de Título Intermedio aplica `background` y `color`.
- `AdminCatalog.tsx`: importar `instituteHex`; `useState(() => unit.color ?? instituteHex(unit.name))`, el efecto igual, y `DEFAULT_UNIT_COLOR` se elimina: `useState(() => instituteHex())` y `setUnitColor(instituteHex())`. El input usa `value={color}`; en el navegador `instituteHex()` siempre devuelve un hex y `color` nunca queda vacío.
- `planGraphAdapter.ts`: fallback `instituteToken(null)`.

- [ ] **Step 5: Verificar**

Run: `node --experimental-strip-types --test tests/instituteColors.test.mjs` → PASS (5 tests). `npx tsc -b --force` → sin errores.
Quitar `Home.tsx`, `MyProgress.tsx`, `AdminCatalog.tsx` e `instituteColors.ts` de `PENDING`; `node --experimental-strip-types --test tests/colorTokens.test.mjs` → PASS.

- [ ] **Step 6: Verificación visual**

Claro y oscuro: portadas de instituto y carrera, chip de título intermedio, botón de Título Intermedio en MyProgress y selector de color en Admin. El texto de las portadas se lee; el input de color recibe un hex válido.

---

### Task 6: Grafo y estados

**Files:**
- Modify: `frontend/src/pages/PlanGraph.tsx`
- Modify: `frontend/src/utils/status.ts`
- Modify: `frontend/src/utils/graphHighlight.ts`
- Modify: `frontend/src/components/SubjectStatusIcon.tsx`
- Modify: `frontend/src/assets/subject-status/*.svg`
- Test: `frontend/tests/statusColors.test.mjs`
- Test: `frontend/tests/graphHighlight.test.mjs` (existente)

**Interfaces:**
- Consumes: `readToken`, `toHex` de Task 1; `--status-*`, `--graph-*`, `--color-text`.
- Produces: `STATUS_COLOR` y `STATUS_BORDER` con valores `var(--status-*)`; `statusColor` y `statusBorder`; `SubjectStatusIcon` siempre teñido.

- [ ] **Step 1: Escribir los tests que fallan**

```js
// frontend/tests/statusColors.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { STATUS_BORDER, STATUS_COLOR, statusBorder, statusColor } from '../src/utils/status.ts';

test('statusColor devuelve tokens, no hex', () => {
  assert.equal(statusColor('Aprobada'), 'var(--status-aprobada-bg)');
  assert.equal(statusColor('Libre'), 'var(--status-libre-bg)');
  assert.equal(statusColor(undefined), 'var(--status-bloqueada-bg)');
});

test('statusBorder cubre los seis estados', () => {
  assert.equal(statusBorder('Regular'), 'var(--status-regular-border)');
  assert.deepEqual(Object.keys(STATUS_COLOR).sort(), ['Aprobada', 'Bloqueada', 'Cursando', 'Disponible', 'Libre', 'Regular']);
  assert.deepEqual(Object.keys(STATUS_BORDER).sort(), Object.keys(STATUS_COLOR).sort());
});
```

- [ ] **Step 2: Correr y ver el fallo**

Run: `node --experimental-strip-types --test tests/statusColors.test.mjs`
Expected: FAIL con `STATUS_BORDER` indefinido.

- [ ] **Step 3: Migrar `status.ts`**

`STATUS_COLOR` y `STATUS_BORDER` con `var(--status-{clave}-{bg|border})`; helper `statusBorder`; `STATUS_LABEL` y `STATUS_BADGE` no cambian.

- [ ] **Step 4: Rediseñar las señales de `PlanGraph.tsx`**

- Eliminar `OPTIMAL_NODE_BACKGROUND`, `OPTIMAL_NODE_BORDER`, `IN_PROGRESS_COLOR`, `UNLOCK_COLOR`, `GRAPH_BACKGROUND`, `EDGE_COLORS` y `STATUS_NODE_BORDER_COLORS`.
- Mapa de modos (ojo con los nombres internos invertidos): `d.optimal` = Requisitos → `var(--graph-path-requirements)`; `d.critical` = Orden sugerido → `var(--graph-path-suggested)`.
- `nodeBorder`: 2 px de estado (`statusBorder`), 4 px para el modo activo, 2 px de selección con `var(--graph-selection)`, 4 px para `newlyUnlocked` con `var(--graph-unlock)`. Prioridad: unlock > selección > modo > estado.
- `PlanNode`: fondo siempre `statusColor(d.status)`; texto `var(--color-text)`; se elimina el fondo ámbar y el `#CCFBF1`. El badge de orden sigue usando `criticalOrder`.
- Aristas: `var(--graph-edge)`, `var(--graph-edge-fulfilled)`, `var(--graph-edge-pending)`; los caminos de modo usan los tokens de modo. Anchos 1.25 / 3.
- `Background`: usar `readToken('--graph-bg')` y `readToken('--graph-grid')` (el componente escribe atributos SVG).
- `markerEnd.color`: siempre un color resuelto, nunca `var(...)`: `readToken('--graph-edge')` o `readToken('--graph-path-requirements' | '--graph-path-suggested')`.
- `graphHighlight.ts`: `HIGHLIGHT_COLOR = 'var(--graph-path-suggested)'`; el consumidor que lo pasa a `SubjectStatusIcon` debe resolverlo a hex (ver Step 5).
- `useTheme()` se mantiene solo para forzar el recálculo de `readToken` al cambiar de tema.
- Eliminar la lógica `theme === 'dark' ? '#4ade80' : '#00963f'`: el token ya cambia.
- Eliminar `'#075ce5'` del tinte de selección: usar `var(--graph-selection)` y resolverlo al pasarlo al ícono.

- [ ] **Step 5: Íconos de estado**

Normalizar los seis SVG a `fill="none"` + `stroke="currentColor"`, incluido `libre.svg` (quitarle el fondo `#fff1f0`). En `SubjectStatusIcon`, resolver siempre el color base con `toHex(readToken(\`--status-${clave}-solid\`))` y pasarlo a `tintStatusSvg`; si `highlightColor` viene, gana. `highlightColor` puede llegar como token (`var(--graph-selection)`); resolvelo con `toHex(readToken(token))` dentro del componente antes de armar el `data:` URI. Fallback `'black'` si `toHex` devuelve `null`.

- [ ] **Step 6: Verificar**

Run: `node --experimental-strip-types --test tests/statusColors.test.mjs` → PASS.
Run: `node --experimental-strip-types --test tests/graphHighlight.test.mjs` → PASS.
Quitar `PlanGraph.tsx`, `status.ts`, `graphHighlight.ts` y `planGraphAdapter.ts` de `PENDING`; `node --experimental-strip-types --test tests/colorTokens.test.mjs` → PASS.
`npx tsc -b --force` → sin errores.

- [ ] **Step 7: Verificación visual**

Claro y oscuro, con los tres modos: mapa, grafo y tablero. Requisitos en ámbar y Orden sugerido en teal; nodos con su estado; aristas visibles; íconos con color correcto; ningún pastel sobre negro.

---

### Task 7: Cierre, documentación y commit

**Files:**
- Modify: `frontend/tests/colorTokens.test.mjs` (`PENDING` vacío)
- Modify: `frontend/src/styles/tokens/README.md`
- Modify: `frontend/index.html`
- Modify: `docs/superpowers/specs/2026-11-14-paleta-tokens-design.md` (estado: implementado)
- Git: commit WIP

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: guard definitivo, documentación y commit único.

- [ ] **Step 1: Vaciar `PENDING`**

Dejar `const PENDING = new Set();`. Run: `node --experimental-strip-types --test tests/colorTokens.test.mjs` → PASS. Si aparece un archivo, migrarlo; no agregarlo a `PENDING`.

- [ ] **Step 2: Completar el README**

Tabla de tokens con rol y uso, reglas de identidad UNAHUR, estados, gradientes permitidos y la prohibición de literales. Incluir ejemplos correctos e incorrectos.

- [ ] **Step 3: Ajustar `index.html`**

`theme-color` inicial `#f3f4f9`; el runtime lo actualiza. Verificar que no queden hex en `src/` fuera de tokens.

- [ ] **Step 4: Suite completa**

Desde `frontend/`:
`npx tsc -b --force` → sin errores.
`node --experimental-strip-types --test tests/` → todos los tests en verde (los 46 actuales + `color`, `colorTokens`, `instituteColors`, `statusColors`).
Desde `backend/`: `npm test` → 45/45.

- [ ] **Step 5: QA visual final**

Claro y oscuro: Splash/Home, Login, MyProgress, PlanGraph (mapa, grafo, tres modos), FAQ, Admin, perfil. Revisar foco, hover, disabled, tooltips y tablas.

- [ ] **Step 6: Commit único**

```bash
git status --short
git add -A
git commit --amend --no-edit
git log --oneline -1
```
Expected: árbol limpio, commit WIP actualizado, sin push.

---

## Self-Review

- **Cobertura del spec:** identidad UNAHUR (Tasks 2, 4, 5), primitivas y semánticas (Task 2), estados (Tasks 2, 3b, 6), grafo (Tasks 4, 6), gradientes (Tasks 2, 3a, 3b, 4), TS/runtime (Tasks 1, 5, 6), guard y contraste (Tasks 1, 2, 7), migración y fases (Tasks 3a–6). Sin huecos.
- **Tipos y nombres:** `instituteToken` / `instituteHex` / `instituteSurface` se usan igual en Tasks 5; `statusColor` / `statusBorder` en Task 6; `readToken` / `toHex` en Tasks 1, 4, 5, 6.
- **Review Focus:** cada punto tiene verificación en la tarea que lo posee (SVG en Task 6, DB en Task 5, oscuro del grafo en Task 6, Bootstrap en Tasks 2/3, gradientes en Tasks 3b/4). Los que no se pueden unit-testear quedan con QA visual explícito.
- **Proporción:** el plan define archivos, interfaces, valores ancla y tests; no transcribe los 432 reemplazos.
