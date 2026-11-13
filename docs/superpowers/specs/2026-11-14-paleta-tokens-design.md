# Gradify — Sistema de color unificado con identidad UNAHUR

- **Fecha:** 2026-11-14
- **Estado:** implementado
- **Alcance:** `frontend/` (CSS y TSX). Sin cambios de lógica, datos ni backend.

---

## 1. Intención

La app ya tiene una identidad reconocible —verde UNAHUR, ámbar y los colores de los cuatro institutos—, pero el color está disperso: **238 valores distintos en 432 usos** entre CSS y TSX, **68 declaraciones de modo oscuro** escritas a mano y **dos paletas oscuras incompatibles** (el shell usa gris `#0d1016`; el mapa usa azul `#101923`). Cada pantalla nueva inventa colores, el oscuro se parchea componente por componente y un mismo estado académico se lee distinto según dónde aparezca.

La intención es separar dos cosas que hoy están mezcladas:

1. **Identidad UNAHUR**: la marca institucional (verde, ámbar, colores de instituto). Estable, visible, con reglas de uso propias.
2. **Color funcional**: estados, alertas, foco, superficies. Derivado de tokens semánticos, con una sola implementación para claro y oscuro.

No es un rediseño. Es poner orden sin perder la cara de la app.

## 2. Objetivos

1. Una única fuente de verdad de color en CSS; **cero literales** fuera de `src/styles/tokens/` y de los SVG de `src/assets/`.
2. **Identidad UNAHUR declarada aparte**, con roles y usos explícitos, sin contaminar los colores de estado.
3. Claro y oscuro desde el mismo set semántico; **≤ 6 selectores `[data-bs-theme="dark"]`** (hoy 68).
4. Estados académicos legibles y distinguibles en ambos temas, con contraste **WCAG AA**.
5. TypeScript consume tokens (no duplica hex); SVG y canvas resuelven el token en runtime.
6. Guard y tests que impidan volver a dispersar colores.
7. Gradientes usados solo como superficie de jerarquía (héroes, encabezados, botón principal, estado vacío), nunca detrás de texto chico ni en estados.
8. Grafo con jerarquía de señales clara: estado, modo, interacción y desbloqueo no compiten por el mismo tono.

### No objetivos

Layout, tipografía, espaciado, animaciones, componentes nuevos, reemplazo de Bootstrap, lógica de negocio, backend y nombres internos (`critical` / `optimal`, `careerType`, `tab === 'tec'`).

### Anti-objetivos (fallo aunque compile)

- Cambiar el verde por un azul o violeta genérico de plantilla.
- Tokens que solo funcionen en modo claro.
- 200 tokens de componente (sobre-ingeniería).
- Perder la distinción entre estados o entre institutos.
- Duplicar la paleta en TypeScript y en CSS.
- Texto con gradiente, gradientes animados o gradientes detrás de chips de estado.
- Más de dos acentos compitiendo dentro del grafo.

## 3. Restricciones

- React 19 + Vite + Bootstrap 5.3; el tema se aplica con `data-bs-theme` en `<html>`.
- Bootstrap se importa antes que `index.css`; los overrides deben ir después.
- Tests con `node --experimental-strip-types --test`; archivos de código < 300 líneas.
- Los SVG de estado se sirven como `data:image/svg+xml` dentro de `<img>`: **`var()` no resuelve ahí**.
- `color-scheme: light dark` en `:root` es incorrecto cuando el tema es explícito.
- La app ya usa `color-mix()`, así que OKLCH es viable en los navegadores objetivo.

## 4. Estado actual (evidencia)

| Hallazgo | Dato |
|---|---|
| Literales de color | 238 únicos / 432 usos en `src/**/*.{css,ts,tsx}` |
| Tokens existentes | 24 `--gradify-*` en claro, 18 en oscuro; cubren solo el shell |
| Bloques dark | 68 declaraciones `[data-bs-theme="dark"]` (index.css + AcademicMap.css) |
| Dos oscuros | Shell `#0d1016` / `#151922` / `#98a1b3` vs mapa `#101923` / `#2b394b` / `#9dacc0` |
| Estados | `STATUS_COLOR` es una sola paleta pastel para ambos temas; `Disponible` y `Cursando` comparten `#DCEAFF` |
| Instituto | `instituteColors.ts` con 4 colores oficiales + default `#238a42` |
| PlanGraph | 39 literales; constantes `OPTIMAL_NODE_BACKGROUND`, `UNLOCK_COLOR`, `EDGE_COLORS`, `GRAPH_BACKGROUND` |
| Íconos de estado | `SubjectStatusIcon` arma un data URI; `tintStatusSvg` tiñe solo stroke **o** fill, por eso `libre.svg` conserva su fondo |
| Mapa | Islas con 5 tints claros y 5 dark propios |

## 5. Enfoques considerados

- **A. Migración total (elegida).** Cuatro capas de tokens + reemplazo de los 432 usos + guard + contraste. Deja un sistema único y auditable. Diff grande pero mecánico; el riesgo es visual y se cubre con revisión por fases y pantalla.
- **B. Tokens + migración por etapas.** Misma arquitectura, con `AcademicMap.css` en una segunda pasada. Menos riesgo inicial, pero conviven dos sistemas y el oscuro sigue partido hasta terminar.
- **C. Unificación mínima.** Solo estados, choque de oscuros y documentación. Rápido, pero los literales siguen dispersos y el problema vuelve en la próxima pantalla.

Se eligió **A** porque el pedido es uniformidad estructural, no un arreglo puntual. La ejecución se hace en fases dentro del mismo cambio para controlar el riesgo.

## 6. Arquitectura

### 6.1 Capas

1. **Identidad UNAHUR** (`--unahur-*`): verde institucional, ámbar y los cuatro colores de instituto. Valores oficiales, con reglas de uso. Es la capa de marca.
2. **Primitivas** (`--palette-*`): rampas OKLCH neutrales y funcionales (éxito, advertencia, peligro, info, violeta, teal, grafito). Único lugar donde viven literales de color, junto con `brand.css`.
3. **Semánticas** (`--color-*`, `--status-*`, `--graph-*`, `--shadow-*`): roles. Claro en `:root`, oscuro en `[data-bs-theme="dark"]`.
4. **Componente** (`--plan-*`, `--map-*`): solo excepciones con al menos dos usos; el resto deriva de semánticas.

La identidad es una capa **paralela**, no un primitivo más: un color de instituto nunca se usa para "éxito" ni un estado para representar una carrera.

### 6.2 Archivos

```
frontend/src/styles/tokens/brand.css        Identidad UNAHUR (única fuente de los institucionales)
frontend/src/styles/tokens/primitives.css   Rampas funcionales OKLCH + triplete RGB de marca
frontend/src/styles/tokens/semantic.css     Roles claro/oscuro + mapeo de Bootstrap
frontend/src/styles/tokens/components.css   Excepciones de plan y mapa
frontend/src/styles/tokens/README.md        Referencia de tokens y reglas de uso
frontend/src/utils/color.ts                 Parseo, OKLCH→sRGB, contraste, lectura de tokens
```

Orden de importación en `main.tsx`:

```
bootstrap.min.css → brand.css → primitives.css → semantic.css → components.css → index.css
```

Así los overrides ganan por orden a igual especificidad. `index.css` deja de declarar colores base y se queda con estructura y componentes.

### 6.3 Nomenclatura

| Grupo | Tokens |
|---|---|
| UNAHUR | `--unahur-green`, `--unahur-green-strong`, `--unahur-amber`, `--unahur-bio`, `--unahur-tech`, `--unahur-health`, `--unahur-education` |
| Primitivas | `--palette-neutral-{0..1000}`, `--palette-brand-{50..950}`, `--palette-success-*`, `--palette-warning-*`, `--palette-danger-*`, `--palette-info-*`, `--palette-violet-*`, `--palette-teal-*` |
| Superficie | `--color-bg`, `--color-surface`, `--color-surface-2`, `--color-surface-3` |
| Texto | `--color-text`, `--color-text-muted`, `--color-text-subtle`, `--color-on-brand` |
| Bordes | `--color-border`, `--color-border-strong`, `--color-border-subtle` |
| Marca | `--color-brand`, `--color-brand-strong`, `--color-brand-soft`, `--color-accent`, `--color-accent-soft`, `--color-focus` |
| Feedback | `--color-{success,warning,danger,info}` + `-soft` |
| Estados | `--status-{aprobada,regular,cursando,libre,disponible,bloqueada}-{bg,border,text,solid}` |
| Grafo | `--graph-bg`, `--graph-grid`, `--graph-edge`, `--graph-edge-pending`, `--graph-edge-fulfilled`, `--graph-path-requirements`, `--graph-path-suggested`, `--graph-selection`, `--graph-unlock`, `--graph-dim-opacity` |
| Gradientes | `--gradient-brand`, `--gradient-surface`, `--gradient-app-glow`, `--gradient-institute-{bio,tech,health,education}` |
| Sombras | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |

Renombre directo, **sin alias**: `--gradify-brand` → `--color-brand`, `--gradify-app-bg` → `--color-bg`, etc. Son alrededor de 55 usos y los alias perpetúan la ambigüedad.

### 6.4 Identidad UNAHUR (capa separada)

Valores de partida, tomados de la identidad ya documentada en `instituteColors.ts` y del verde institucional que usa la app:

| Rol | Token | Valor |
|---|---|---|
| Verde institucional | `--unahur-green` | `#238a42` |
| Verde profundo | `--unahur-green-strong` | `#0a6b4e` |
| Ámbar institucional | `--unahur-amber` | `#ffb020` |
| Biotecnología | `--unahur-bio` | `#219ecf` |
| Tecnología e Ingeniería | `--unahur-tech` | `#f08100` |
| Salud Comunitaria | `--unahur-health` | `#00a79f` |
| Educación | `--unahur-education` | `#ea4f51` |

**Roles de acción** (separados de la identidad, porque el verde institucional no pasa AA con texto blanco):

| Rol | Token | Valor | Uso |
|---|---|---|---|
| Acción | `--color-brand` | `#0a6b4e` | Botones, links, foco y `--bs-primary` |
| Acción fuerte | `--color-brand-strong` | `#07523b` | Hover y active |
| Sobre acción | `--color-on-brand` | `#ffffff` | Texto e íconos sobre acción |
| Tinta | `--color-ink` | `#10161f` | Texto sobre superficies plenas de instituto |
| Sobre instituto (claro) | `--color-on-institute` | `#10161f` | Portadas plenas en modo claro |
| Sobre instituto (oscuro) | `--color-on-institute` | `#f1f5ff` | Portadas profundas en modo oscuro |

`#238a42` queda como **identidad**, no como color de texto ni detrás de texto chico: logo, íconos, líneas de acento y superficies grandes sin texto. `#0a6b4e` es el verde de acción y es el que usan botones, enlaces y anillo de foco.

Reglas de uso:

- **Dónde sí:** logo, encabezado de carrera, badge/chip de instituto, islas del mapa, acentos de marca y estados vacíos institucionales.
- **Dónde no:** éxito, error, advertencia, foco, estados académicos. Esos usan la capa funcional.
- **Claro:** acento en texto/borde y tinte de fondo al 10–14 %.
- **Oscuro:** L +10–15 % y tinte al 18–22 %, para que no vibren sobre fondo oscuro.
- **Fondo pleno en claro:** gradiente del instituto + `--color-on-institute` (tinta). Es el único caso de color pleno con texto.
- **Fondo pleno en oscuro:** gradiente mezclado 35–55 % con `--color-surface`, texto `--color-on-institute` claro.
- **Color de DB:** `contrastText()` elige entre `--color-on-brand` y `--color-ink` según el ratio real; nunca se asume blanco. Si el color viene vacío o inválido, cae al mapa por nombre y, en última instancia, al verde institucional. El valor de la DB no se reescribe.

Verificación pendiente en implementación: muestrear las páginas oficiales de cada instituto antes de congelar los hex. El archivo actual los documenta como extraídos en 2026; el plan incluye confirmarlos.

### 6.5 Tema claro/oscuro

- `:root { color-scheme: light; }` y `[data-bs-theme="dark"] { color-scheme: dark; }`.
- El oscuro **solo** redefine tokens semánticos; no hay reglas de color por componente salvo excepciones estructurales (el logo, que cambia de asset).
- `ThemeProvider` actualiza `<meta name="theme-color">` al cambiar de tema leyendo `--color-bg` con `readToken()` y convirtiéndolo con `toHex()`; sin literales en TS.
- El modo automático del sistema queda fuera de alcance; se mantiene el toggle manual actual.

### 6.6 Bootstrap

En `semantic.css` se mapean las variables que Bootstrap consume, después de su importación:

`--bs-body-bg`, `--bs-body-color`, `--bs-secondary-bg`, `--bs-tertiary-bg`, `--bs-border-color`, `--bs-secondary-color`, `--bs-emphasis-color`, `--bs-primary`, `--bs-primary-rgb`, `--bs-link-color`, `--bs-link-hover-color`, `--bs-focus-ring-color`, `--bs-success`, `--bs-warning`, `--bs-danger`, `--bs-info`, `--bs-tooltip-bg`, `--bs-tooltip-color`, `--bs-card-bg`, `--bs-card-cap-bg`.

`--bs-primary-rgb` se alimenta de `--palette-brand-rgb` con triplete separado por comas, porque Bootstrap lo interpola en `rgba(var(--bs-primary-rgb), α)`. Los overrides actuales de `.btn-primary`, `.btn-outline-primary`, `.form-control`, `.card` y `.chip` se conservan, apuntando a tokens.

### 6.7 Estados académicos

| Estado | Claro (bg / texto) | Oscuro (bg / texto) | Rol |
|---|---|---|---|
| Aprobada | verde suave / verde profundo | verde profundo / verde claro | completado |
| Regular | violeta suave / violeta profundo | violeta profundo / violeta claro | cursada pendiente de final |
| Cursando | azul suave / azul profundo | azul profundo / azul claro | en curso |
| Libre | rojo suave / rojo profundo | rojo profundo / rojo claro | no habilitada por asistencia |
| Disponible | teal suave / teal profundo | teal profundo / teal claro | habilitada para inscribirse |
| Bloqueada | gris suave / gris profundo | gris profundo / gris claro | falta correlativa |

**Cambio deliberado:** `Disponible` deja de compartir el azul de `Cursando` y pasa a teal. Hoy son indistinguibles en el grafo; el teal mantiene la lectura "podés avanzar" sin confundirse con "estás cursando". El texto de leyenda y los badges no cambian.

Violeta y teal son rampas propias (`--palette-violet-*` y `--palette-teal-*`): `Regular` no reutiliza la rampa de info y `Disponible` no reutiliza la de éxito. El teal de `Disponible`, el de highlight y el de "Orden sugerido" comparten familia pero usan pasos distintos para no confundirse entre sí.

Cada estado define `bg`, `border`, `text` y `solid`. El `solid` es el que se usa en íconos y líneas; el `bg` en tarjetas y nodos. Todos los pares texto/fondo apuntan a AA (4.5:1); bordes e íconos a 3:1.

### 6.8 TypeScript y runtime

- `statusColor()` devuelve `var(--status-…-bg)`, que funciona en estilos inline de React.
- `SubjectStatusIcon` **siempre** tiñe el SVG: resuelve `--status-…-solid` con `readToken()`, lo convierte a hex con `oklchToHex()` y arma el data URI. Para que el teñido sea uniforme, los seis SVG se normalizan a trazo único (`stroke`), incluido `libre.svg`.
- Los props de React Flow que exigen un color literal (fondo del canvas, `stroke` de aristas, `markerColor`) se resuelven con `readToken()` en render y se recalculan al cambiar de tema. La lista exacta queda en el plan.
- `readToken(nombre)` lee `getComputedStyle(document.documentElement)` y cachea por tema; `ThemeProvider` invalida la caché al togglear.
- Contrato de instituto, separado por consumidor:
  - `instituteToken(unitName, dbColor)` devuelve un string CSS (`var(--unahur-*)` para los conocidos, color de DB tal cual) para gradientes y estilos.
  - `instituteHex(unitName, dbColor)` resuelve el token a hex con `readToken()`/`toHex()` para `<input type="color">` y APIs nativas. `AdminCatalog` usa esta variante.
  - `instituteGradient(unitName, dbColor)` devuelve `var(--gradient-institute-*)` para los conocidos; para un color de DB compone `color-mix()` y `contrastText()`.
  - Los literales que llegan desde la base no cuentan para el guard: el escaneo es sobre código fuente, no sobre datos en runtime.
- `contrastText(bg)` compara el contraste real contra `--color-on-brand` y `--color-ink` (ambos resueltos con `readToken`) y devuelve el que gana; no contiene hex.
- `color.ts` expone `parseCssColor`, `oklchToSrgb`, `toHex`, `contrastRatio`, `contrastText` y `readToken`, con tests unitarios.

### 6.9 Reglas de migración

1. Cada literal se reemplaza por el token semántico más cercano.
2. Si no existe rol, se agrega token semántico solo si se usa en ≥ 2 lugares; si es único, va a `components.css`.
3. `rgba(var(--gradify-brand-rgb), α)` → `color-mix(in srgb, var(--color-brand) α%, transparent)`.
4. Un bloque dark se elimina cuando el swap semántico ya lo cubre.
5. Gradientes con hex → `color-mix()` sobre tokens.
6. Los colores de instituto solo pueden aparecer en `brand.css`; en el resto se consumen por token.
7. Los SVG de estado quedan sin color propio; se tiñen en runtime.

### 6.10 Guardrails y tests

`frontend/tests/colorTokens.test.mjs`, ejecutado por `npm run test:theme`:

1. **Sin literales:** falla si aparece `#hex`, `rgb(`, `hsl(` u `oklch(` en `src/**/*.{css,ts,tsx}` fuera de `src/styles/tokens/` y `src/assets/`.
2. **Integridad:** todo `var(--…)` referenciado existe en claro y oscuro.
3. **Estados completos:** 6 estados × 4 roles × 2 temas.
4. **Contraste:** pares declarados (texto/fondo, texto muted/fondo, los 6 estados, bordes e íconos) ≥ AA, resolviendo cadenas de `var()` y alfa.
5. **Presupuesto de dark:** ≤ 6 selectores `[data-bs-theme="dark"]` en todo `src`.

`README.md` de tokens documenta la tabla, el uso correcto de la identidad y las reglas de migración.

### 6.11 Gradientes

Los gradientes son **superficie**, no decoración: sirven para jerarquizar un bloque grande o reforzar marca. Se definen como tokens de imagen para que claro y oscuro cambien juntos.

| Token | Composición | Uso |
|---|---|---|
| `--gradient-brand` | `135deg`, `--color-brand` → `--color-brand-strong` | Botón principal, marca de la sidebar, CTA del splash |
| `--gradient-surface` | `160deg`, `--color-surface` → `--color-surface-2` | Encabezados de página, tarjetas KPI, cabecera del mapa |
| `--gradient-app-glow` | Radial superior izquierdo, marca al 5–8 % → transparente 60 % | Fondo de la app |
| `--gradient-institute-*` | `135deg`; claro: instituto 78 % → instituto pleno; oscuro: instituto 35 % → 55 % sobre superficie | Banda de carrera, badge de instituto, cabecera de isla |

Reglas:

- Máximo dos paradas útiles más transparencia; nada de arcoíris.
- **Prohibido** en texto, nodos de estado, chips, filas de tabla, controles de formulario y cuerpos de modal.
- El texto sobre un gradiente debe usar `--color-on-brand`, `--color-text` o `--color-on-institute` según la superficie, y verificarse AA en la parada más clara y en la más oscura.
- En oscuro los gradientes de marca y superficie bajan de croma (mezcla 12–18 % con superficie) para que no brillen; los de instituto usan la mezcla 35–55 % ya definida.
- Sin gradientes animados y sin `background-attachment: fixed` (rompe en mobile).
- Los gradientes de instituto solo viven en `brand.css`/`components.css` y se consumen por token.

### 6.12 Grafo y mapa

Hoy el grafo tiene señales que compiten: cinco colores de borde por estado más tres especiales, dos ámbares casi iguales para los dos modos (`#fd7e14` en aristas y `#d9870b` en nodos), selección y "Cursando" en el mismo azul, canvas oscuro azul marino y cinco islas con tonos distintos. Además, los nodos conservan fondos pastel en modo oscuro y el texto está fijo en `#23395d`.

**Jerarquía de señales** — cada capa tiene un solo trabajo:

| Señal | Token | Dónde |
|---|---|---|
| Estado | `--status-*-{bg,border,text}` | Relleno y borde base del nodo, tema-aware |
| Modo "Requisitos para cursar" | `--graph-path-requirements` (ámbar) | Aristas del recorrido + anillo del nodo |
| Modo "Orden sugerido de cursada" | `--graph-path-suggested` (teal) | Aristas del recorrido + anillo del nodo |
| Selección | `--graph-selection` (azul) | Anillo exterior con offset, solo interacción |
| Desbloqueo reciente | `--graph-unlock` (verde) | Glow temporal de 5 s |
| Estructura | `--graph-edge` | Aristas sin estado |
| Progreso | `--graph-edge-fulfilled` | Aristas cuyo origen está aprobado |
| Pendiente | `--graph-edge-pending` | Aristas punteadas hacia materias bloqueadas |

Decisiones concretas:

- **Los dos modos dejan de compartir el ámbar.** Requisitos queda ámbar (atención: "esto te falta"); Orden sugerido pasa a teal (guía: "seguí este camino"). Así se distinguen de un vistazo y el ámbar no significa dos cosas.
- El nodo conserva el color de estado en ambos modos; el modo se expresa en el **borde/anillo y las aristas**, no en el relleno. Se elimina `OPTIMAL_NODE_BACKGROUND`.
- El texto del nodo usa `--color-text`; el fondo, `--status-*-bg`. En oscuro los nodos son tintes profundos con texto claro, no pasteles sobre canvas negro.
- Grosores: 2 px de estado, 4 px de recorrido, 2 px de selección con offset 2. Las aristas: 1.25 px estructurales, 3 px de recorrido.
- El canvas usa la misma temperatura que el shell: `--color-surface-2` en claro y `--color-surface` en oscuro; la grilla sale de `--color-border-subtle`.
- Atenuado: `--graph-dim-opacity` (0.32 claro / 0.4 oscuro), en lugar del valor fijo.
- **Islas de cuatrimestre:** una sola familia tonal, derivada del instituto de la carrera. Cada isla varía entre 4 % y 9 % de mezcla en claro y 8–14 % en oscuro, con borde al 12–16 %. La mezcla se controla con `--map-island-mix` (6 % claro / 12 % oscuro) dentro de una única regla, así que **no hay selectores dark por isla**. Se eliminan los cinco tonos (azul, verde, violeta, cian, ámbar) que competían con los estados. Sin instituto, cae al verde UNAHUR.
- La cabecera del mapa usa `--gradient-surface` con una línea de acento del instituto; no lleva fondo pleno de color.
- La leyenda incluye los seis estados y los tres roles de arista. Los badges de modo mantienen su texto y toman el color del modo.
- Accesibilidad: el estado nunca se comunica solo por tono (ícono, etiqueta y borde acompañan); el anillo de foco es visible en ambos temas; los pares texto/fondo de los nodos cumplen AA.

## 7. Fases

1. **Base:** crear los cuatro archivos de tokens, los gradientes, el orden de importación, el mapeo de Bootstrap, `color-scheme` y `theme-color`. Sin cambio visual intencional; verificar.
2. **Shell y páginas:** migrar `index.css` por secciones (base, sidebar, páginas, ACA, tablas/progreso, FAQ/Splash), aplicar `--gradient-surface` en encabezados y KPI, y borrar los dark que el swap cubra.
3. **Mapa y grafo:** migrar `AcademicMap.css`, rediseñar las señales de `PlanGraph.tsx`, migrar `status.ts`, `graphHighlight.ts`, `instituteColors.ts` y normalizar los SVG.
4. **Cierre:** `color.ts`, tests, README, limpieza de literales y QA visual completo.

Cada fase cierra con `npx tsc -b --force`, tests de frontend y revisión visual en ambos temas. El trabajo se consolida con `git commit --amend --no-edit` en el commit WIP actual; no se pushea sin confirmación.

## 8. Criterios de aceptación

- Guard en verde: 0 literales fuera de `styles/tokens/` y `assets/`.
- ≤ 6 selectores dark en `src`.
- `npx tsc -b --force` limpio.
- Frontend: los 46 tests actuales + los nuevos de tema, todos en verde.
- Backend: 45/45 (sin cambios, se corre igual).
- Revisión visual en claro y oscuro de: Splash/Home, Login, MyProgress, PlanGraph (mapa, grafo y los tres modos), FAQ y Admin.
- Los seis estados se distinguen entre sí y cumplen AA.
- Botones, links y foco usan `--color-brand` y pasan AA; el verde institucional no carga texto chico.
- Las portadas plenas usan `--color-on-institute` y pasan AA en ambos temas, también con colores de DB.
- Los dos modos del grafo se distinguen por tono (ámbar vs teal) sin leer la etiqueta.
- El canvas y los nodos oscuros comparten la temperatura del shell; no queda ningún pastel sobre fondo negro.
- Cada gradiente se usa solo en las superficies declaradas y su texto cumple AA en ambas paradas.
- Sin cambios de layout, copy ni lógica.

## 9. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Deriva visual por reemplazos masivos | Anclas de tono actuales, revisión por fase y capturas antes/después |
| OKLCH dentro de data URI SVG | Conversión a hex en el borde + test de `oklchToHex` |
| Costo de `getComputedStyle` en el grafo | Caché por tema, invalidada en el toggle |
| Sobre-tokenización | Regla de ≥ 2 usos o rol semántico claro |
| Commit WIP con cambios amplios | `git status` antes del amend; no push sin confirmación |

## 10. Decisiones del builder

- Primitivas en OKLCH; hex solo en el borde de SVG.
- Sin alias de `--gradify-*`; renombre directo.
- `Disponible` pasa a teal para separarse de `Cursando`.
- Cuatro archivos de tokens por la regla de < 300 líneas.
- SVG de estado normalizados a trazo único y teñidos siempre.
- Gate WCAG AA; APCA queda documentado como evolución futura.
- La identidad UNAHUR es capa propia, no primitivas funcionales.
- Requisitos en ámbar y Orden sugerido en teal; el modo no cambia el relleno de estado.
- Canvas del grafo con la temperatura del shell, no azul marino.
- Islas de cuatrimestre en una sola familia tonal derivada del instituto, sin dark por isla.
- Verde de identidad `#238a42` y verde de acción `#0a6b4e`; el texto sobre instituto usa tinta, no blanco.
- `instituteToken()` / `instituteHex()` / `instituteGradient()` separados por consumidor; la DB se resuelve con `contrastText()`.

## 11. Fuera de alcance

Tipografía, escala de espaciado, movimiento, layout, tema automático del sistema, normalización de colores de la base de datos y cualquier cambio de backend.
