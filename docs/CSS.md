# Estilos del frontend

Todo el CSS global vive en `frontend/src/styles/` y se importa una sola vez
desde `main.tsx`:

```tsx
import 'bootstrap/dist/css/bootstrap.min.css'
import '@xyflow/react/dist/style.css'
import './styles/index.css'
```

El orden importa: Bootstrap y `@xyflow/react` primero, Gradify después. Así las
reglas propias ganan en igual especificidad sin recurrir a `!important`.

## Partials

`src/styles/index.css` es el único punto de entrada. No contiene reglas: solo
importa los partials en este orden.

| Orden | Archivo                    | Responsabilidad                                          |
| ----- | -------------------------- | -------------------------------------------------------- |
| 1     | `tokens.css`               | Variables de diseño y tema oscuro.                       |
| 2     | `base.css`                 | Normalización, tipografía, fondo y scrollbars.           |
| 3     | `bootstrap-overrides.css`  | Ajustes sobre botones, forms, cards, tablas y toasts.    |
| 4     | `layout.css`               | Shell del dashboard, sidebar, topbar mobile y auth.      |
| 5     | `components.css`           | Tarjetas, chips, tabs, stat cards, progress y toggle.    |
| 6     | `pages.css`                | Dropzone de PDFs, select buscable y tablero del grafo.   |
| 7     | `responsive.css`           | Media queries generales por breakpoint.                  |
| 8     | `splash.css`               | Pantalla de inicio y su animación.                       |

Si agregás un partial nuevo, importalo en `index.css` en el orden que
corresponda y documentalo en esta tabla.

## Tokens

Los colores, sombras y radios se definen en `tokens.css` con prefijo
`--gradify-*`. El tema oscuro redefine los mismos nombres bajo
`[data-bs-theme="dark"]`; los componentes no cambian.

Tokens principales:

- Marca: `--gradify-brand`, `--gradify-brand-2`, `--gradify-brand-rgb`,
  `--gradify-accent`.
- Superficies: `--gradify-app-bg`, `--gradify-surface`, `--gradify-surface-2`,
  `--gradify-surface-3`, `--gradify-border`.
- Texto: `--gradify-text`, `--gradify-text-muted`.
- Sombras: `--gradify-shadow-sm`, `--gradify-shadow`, `--gradify-shadow-lg`.
- Radios: `--gradify-radius`, `--gradify-radius-sm`, `--gradify-radius-xs`.
- Estados: `--gradify-success-rgb`, `--gradify-success-text`,
  `--gradify-warn-rgb`, `--gradify-warn-text`.

Reglas:

- No escribir colores hex/rgba sueltos en componentes: usar un token. Si falta
  uno semántico, agregarlo en `tokens.css` para claro y oscuro.
- Para opacidades usar el token RGB:
  `rgba(var(--gradify-brand-rgb), 0.12)`.
- No duplicar reglas de tema oscuro por componente; alcanza con redefinir el
  token.

## Convenciones

- Nombres tipo BEM: `bloque__elemento--modificador`
  (`career-card__cover-badge--published`).
- Una clase nueva de componente va en `components.css`; una específica de
  pantalla, en `pages.css`.
- Los breakpoints generales van en `responsive.css`. Un breakpoint atado a un
  solo componente puede quedar junto a ese componente.
- No usar `<style>` ni `style={{...}}` para reglas reutilizables; el estilo
  inline solo se justifica para valores calculados en runtime.
- No crear CSS por componente salvo que sea verdaderamente aislado; el estilo
  global se centraliza acá.

## Verificación

```bash
cd frontend
npm run lint          # 0 errores (los warnings preexistentes no bloquean)
npm run build         # compila y genera dist/
npm run test:order    # orden de las reglas del CSS compilado
npm run test:contrast # contraste de tokens principales
```

`test:order` y `test:contrast` son gates livianos: si cambia el orden de los
partials o un token de color, conviene correrlos antes de commitear.
