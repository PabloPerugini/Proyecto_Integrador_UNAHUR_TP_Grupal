# Tokens de color de Gradify

Cuatro capas, en este orden de importación (después de Bootstrap):

1. `brand.css` — identidad UNAHUR. Solo marca.
2. `primitives.css` — rampas OKLCH y valores crudos.
3. `semantic.css` — roles (`--color-*`, `--status-*`, `--graph-*`, `--gradient-*`) y mapeo de Bootstrap.
4. `components.css` — variables que se setean inline o varían por contexto.

**Regla dura:** ningún literal de color (`#hex`, `rgb()`, `hsl()`, `oklch()`) fuera de esta carpeta. El único consumidor que convierte tokens a hex es `src/utils/color.ts`, y lo hace en runtime para SVG y atributos nativos.

## Identidad UNAHUR

| Token | Valor | Uso |
|---|---|---|
| `--unahur-green` | `#238a42` | Logo, marca, acentos institucionales. No carga texto chico. |
| `--unahur-amber` | `#ffb020` | Acento institucional. |
| `--unahur-bio` | `#219ecf` | Instituto de Biotecnología. |
| `--unahur-tech` | `#f08100` | Instituto de Tecnología e Ingeniería. |
| `--unahur-health` | `#00a79f` | Instituto de Salud Comunitaria. |
| `--unahur-education` | `#ea4f51` | Instituto de Educación. |

El verde de **acción** es `--palette-brand-500` (`oklch(0.469 0.095 165.8)`, ≈ `#096b4e`). Botones, links y foco usan `--color-brand` / `--color-brand-solid`, nunca `--unahur-green`.

## Roles semánticos

| Token | Claro | Oscuro |
|---|---|---|
| `--color-bg` | gris app | casi negro |
| `--color-surface` / `-2` / `-3` | blanco a gris | tres pasos de superficie |
| `--color-text` / `-muted` / `-subtle` | tinta a gris | claro a gris |
| `--color-brand` | verde acción | verde claro para texto |
| `--color-brand-solid` | verde acción | verde acción (relleno) |
| `--color-brand-strong` | verde profundo | verde profundo (hover) |
| `--color-on-brand` | blanco | blanco |
| `--color-on-institute` | tinta | claro |
| `--color-border*` | gris | blanco translúcido |
| `--color-*-text` | tono profundo | tono claro |

Estados académicos: cada uno define `bg`, `border`, `text` y `solid`:

| Estado | Rampa |
|---|---|
| `Aprobada` | success |
| `Regular` | violet |
| `Cursando` | info |
| `Libre` | danger |
| `Disponible` | teal |
| `Bloqueada` | neutral |

## Gradientes

| Token | Uso permitido |
|---|---|
| `--gradient-brand` | Botón principal, marca de sidebar, CTA del splash. |
| `--gradient-surface` | Encabezados de página, KPI, cabecera del mapa. |
| `--gradient-app-glow` | Fondo de la app. |
| `--gradient-institute-*` | Portadas plenas y badges de instituto. |
| `--gradient-institute-*-soft` | Chips y botones suaves de instituto. |

Prohibido: gradientes en texto, chips de estado, filas de tabla, controles de formulario y cuerpos de modal. Sin gradientes animados ni `background-attachment: fixed`.

## Grafo

| Token | Señal |
|---|---|
| `--graph-bg` / `--graph-grid` | Canvas y grilla. |
| `--graph-edge` | Arista estructural. |
| `--graph-edge-pending` | Arista punteada a materia bloqueada. |
| `--graph-edge-fulfilled` | Arista con origen aprobado. |
| `--graph-path-requirements` | Modo «Requisitos para cursar» (ámbar). |
| `--graph-path-suggested` | Modo «Orden sugerido de cursada» (teal). |
| `--graph-selection` | Selección. |
| `--graph-unlock` | Desbloqueo reciente. |
| `--graph-dim-opacity` | Atenuado por interacción. |

Las siete señales de color del grafo se controlan a **3:1** sobre `--graph-bg` en ambos temas.

## Reglas de migración

1. Elegí el **rol** antes que el color: superficie, texto, estado, instituto o señal de grafo.
2. Usá el token semántico (`--color-*`, `--status-*`, `--graph-*`). Si no existe, agregá una primitiva en `primitives.css` y el rol en `semantic.css`; no escribas el literal en el componente.
3. La identidad UNAHUR se consume por `--unahur-*` o `instituteToken()`; nunca reemplaza un color de estado ni de acción.
4. En TSX, los estilos inline usan `var(--token)`. Solo SVG, `<canvas>` y `data:` URI pasan por `toHex(readToken(...))`.
5. Después de migrar, corré `npm run test:theme` y `npx tsc -b --force`. La guarda falla si aparece un literal fuera de `styles/tokens/` o `assets/`.

## Ejemplos

Correcto:

```css
.card { background: var(--color-surface); color: var(--color-text); }
.btn-primary { background: var(--color-brand-solid); }
.plan-node { background: var(--status-aprobada-bg); border-color: var(--status-aprobada-border); }
```

Incorrecto:

```css
.card { background: #fff; }
.btn-primary { background: #238a42; }
.plan-node { background: #d9f7e5; }
```

En TypeScript, para atributos SVG o `data:` URI:

```ts
const color = toHex(readToken('--status-aprobada-solid'));
```

Nunca pases `var(--...)` a un atributo SVG, a `new Image()` o a `<input type="color">`: no se resuelve fuera de CSS.
