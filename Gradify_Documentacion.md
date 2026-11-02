# Gradify - Documentación del Usuario

Versión: 2026-10-30 | Revisión: D1/D2/P0-P3 completados

## B.2 — Plan oficial y carga
- En `/cargar`, checkbox **Plan oficial** (por defecto desmarcado), solo visible para admin (`rol === 'ADMIN'`).
- `POST /study-plans` crea planes oficiales (`createdBy: null`, `published`); ignora el body y devuelve el plan creado.
- Backfill D1: dry-run por defecto (`node backend/scripts/publicar-planes-admin.js`); `--apply` solo con IDs confirmados; sin update masivo.

## B.4 — Regresión de estados de progreso
- `MyProgress` resuelve estados con `resolveProgressStatuses` (helper compartido); avisa la efectiva cuando una cursada/aprobada perdió sustento.
- `PlanGraph` muestra `progressLoadFailed` si el backend no puede cargar el progreso.
- `parseGrades` valida todas las notas antes del primer PUT.

## B.6 — Clic derecho / accesibilidad
- `SubjectStatusAction` soporta `Shift+Enter`, `Supr` y clic derecho para revertir (`Aprobada → cursando`, `Cursando → sin cursar`); ARIA `aria-label`, `aria-keyshortcuts`, `title` actualizado.
- `SearchSelect`: `useId` + `aria-controls` / `aria-activedescendant` / `role="listbox"`; `id` opcional para asociar `label`.
- `PlanAdmin`, `UploadPlan`: `controlId` y `aria-label` en inputs de tablas (código, año, período, créditos, optativa, intermedia).

## D2 — Backend como fuente de verdad
- `GET /study-plans/:id/graph?target=CODE` devuelve `status`/`savedStatus`, `effectiveStatus`, `planSubjectId`, `criticalPath*` con costos por duración (ANUAL/OTRA = 2), `targetPath`, stats efectivas, `intermediate` y título/color/`userStudyPlanId` del plan.
- `computeTargetPath` puro con DFS y ciclos rotos; target inexistente devuelve cadena vacía; sin target, `null`.
- Frontend consume y dibuja (`getPlanGraph` → `graphMapper`) sin recalcular estados ni caminos.

## B.15 — Validación alineada con Joi
- `NICKNAME_MIN_LENGTH = 1`; sin regex de solo letras (`NAME_REGEX` eliminado); nombres 2-50 según Joi backend.
- `validateName` acepta apóstrofos, espacios, guiones; `validateNickname` exige solo que no esté vacío.

## Historial de versiones
- 2026-10-30: Tareas 0-15 cerradas (`120cba9` → `e60c0b4`), rama `fix/revision-2026-10-30`; Task 16 (P3 refactors) iniciado; C1 (ARCHITECTURE.md), C2 (CSS.md), C3 (este archivo), C4 (README) actualizados.
