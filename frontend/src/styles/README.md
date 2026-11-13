# Colores del mapa de materias

La fuente única de la paleta es [academicMapPalette.css](./academicMapPalette.css). Para cambiar colores del mapa, editá sus variables CSS: no hace falta tocar componentes ni archivos TypeScript. La parametrización conserva la paleta actual; podés ajustar su intensidad desde este archivo.

## Qué variable cambiar

| Grupo | Qué controla |
| --- | --- |
| `--map-status-{estado}-bg` | Relleno del nodo. |
| `--map-status-{estado}-border` | Borde del nodo. |
| `--map-status-{estado}-icon` | Color del ícono de estado. |
| `--map-node-text`, `--map-node-muted` | Texto principal y secundario de los nodos. |
| `--map-legend-*` | Colores de la leyenda y sus contadores. |
| `--map-path-*`, `--map-edge-critical`, `--map-edge-optimal` | Nodos, botones y conexiones resaltadas por las rutas. |
| `--map-edge-normal`, `--map-edge-fulfilled` | Flechas normales y flechas con requisito cumplido, incluida su punta. |
| `--map-selection-*` | Materia seleccionada. |
| `--map-next-*` | Materias sucesoras resaltadas. |
| `--map-canvas-*` | Fondo y puntos del mapa. |
| `--map-detail-*` | Panel de detalle de una materia. |

En los estados, reemplazá `{estado}` por `approved` (aprobada), `regular` (regularizada), `in-progress` (cursando), `available` (disponible) o `locked` (bloqueada). Los demás grupos del archivo tienen comentarios para identificar encabezados, cuatrimestres, controles y vista por islas.

Por ejemplo, para suavizar el verde de **Aprobada**, editá estas tres variables dentro de `:root`:

```css
--map-status-approved-bg: #E5F0E9;
--map-status-approved-border: #4C8060;
--map-status-approved-icon: var(--map-status-approved-border);
```

Una referencia `var(...)` reutiliza otro color: las variables de leyenda comparten las de estado donde sus colores coinciden. Si querés diferenciarlos, asigná un valor propio a la variable correspondiente. Los íconos son SVG inline y usan `currentColor`, por lo que también responden a esta paleta sin editar los archivos SVG.

## Tema oscuro y revisión visual

El bloque `[data-bs-theme="dark"]` reúne los ajustes del tema oscuro por separado. Las variables que no redefine conservan el valor de `:root`; revisá ambos bloques al cambiar una paleta.

Después de editar, revisá en la página:

1. Los cinco estados: relleno, borde, ícono y legibilidad del nombre.
2. La selección de una materia, sus sucesoras y ambos modos de ruta.
3. Las flechas normales y con requisito cumplido: línea y punta deben coincidir.
4. La leyenda, el selector de estado y la nota final en el detalle.
5. Los temas claro y oscuro, también en pantalla completa.
