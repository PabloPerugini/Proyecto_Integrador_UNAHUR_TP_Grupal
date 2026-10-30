# Auditoría Gradify — 30/10/2026

## Resumen ejecutivo

Se auditaron en solo lectura los cuatro documentos de correcciones y se contrastaron con el código real del repositorio en `1ffa9c0`.

- Afirmaciones relevadas: **58**.
- Afirmaciones únicas después de deduplicar: **55**.
- Confirmadas como problemas reales: **52**.
- Parciales o mal formuladas: **2** (`C1`, `PDF-5`).
- Ya resueltas en el código: **1** (`A20`).
- Verificadas sin cambios pendientes: **1** (`G3`).

Prioridades acordadas:

| Prioridad | Cantidad | Alcance |
|---|---:|---|
| P0 | 5 | `nameOverride`, A1, A2, A3, B1 |
| P1 | 18 | A4-A10, A12, A14, A16, A21; B2, B3, B4, B6, B7, B10, B12 |
| P2 | 21 | A11, A13, A15, A17-A19, A22; B5, B8, B9, B11, B13-B18; C1-C4 |
| P3 | 10 | A20, B19-B24, PDF-1, PDF-2 |

## Método

1. Leer el prompt de 50 ítems, el documento de Gemini y el PDF de auditoría.
2. Deduplicar por archivo/función afectada.
3. Abrir cada archivo citado y verificar el comportamiento real.
4. Ejecutar la línea base: backend 45/45, Jest 24/24, frontend 17/17, build OK, lint 0 errores.
5. No modificar código durante la auditoría.

## Matriz de afirmaciones

La columna **Fuente** indica el documento de origen. **Resultado** es el estado en el código real al 30/10/2026.

| ID | Fuente | Afirmación | Resultado | Prioridad | Evidencia / nota |
|---|---|---|---|---|---|
| G1 | Gemini 1 / PDF 1 | `nameOverride` no se prioriza al mostrar materias | Real | P0 | `studyPlanGraph.service.js` usa `subject.name`; `subjectName()` no lee `nameOverride` |
| A1 | Prompt A1 | El camino crítico entra en bucle con ciclos | Real | P0 | `graph.service.js` recorre `criticalPath` sin `Set` de visitados |
| A2 | Prompt A2 | Inyección NoSQL en login | Real | P0 | `findUserByNickName` recibe el body sin validar tipo |
| A3 | Prompt A3 | Las correlativas pisan `requiredStatus: APROBADA` | Real | P0 | `planCorrelativas.service.js` y `planImportConfirmationService.js` fuerzan `REGULARIZADA` |
| B1 | Prompt B1 | Revertir “Cursando” envía `DISPONIBLE` | Real | P0 | `PlanGraph.tsx` envía `DISPONIBLE`; el modelo solo acepta `PENDIENTE`, `CURSANDO`, `REGULARIZADA`, `APROBADA` |
| A4 | Prompt A4 | Rate limit de IA usa `x-user-id` del cliente | Real | P1 | `rateLimitAi.js` usa header; el front manda un ID aleatorio |
| A5 | Prompt A5 | Lock de extracción de PDF sin expiración | Real | P1 | Un `PROCESANDO` viejo responde 202 indefinidamente |
| A6 | Prompt A6 | Visibilidad de planes inconsistente | Real | P1 | Listado, viewer, inscripción y progreso usan filtros distintos |
| A7 | Prompt A7 | Sugerencias AR-3 sin fechas reales | Real | P1 | `loadPlanData` no mapea `createdAt`/fecha; R5 nunca se activa |
| A8 | Prompt A8 | Cambiar contraseña no invalida sesiones | Real | P1 | `userService` no sube `tokenVersion` al cambiar password |
| A9 | Prompt A9 | Borrados sin cascada ni atomicidad | Real | P1 | Usuario deja `UserStudyPlan`, `SubjectProgress`, `PlanImport` y planes privados |
| A10 | Prompt A10 | `bulkSetIntermediate` puede tocar todo el plan | Real | P1 | Con `ids` inválido cae al `else` sin filtro |
| A11 | Prompt A11 | Faltan índices en `Subject.slug` y `SubjectProgress.planSubject` | Real | P2 | Búsquedas por slug y `exists` sin índice |
| A12 | Prompt A12 | Errores filtran detalles y `err.status` se ignora | Real | P1 | `career.controllers` devuelve `error.message`; `errorHandler` no respeta `err.status` |
| A13 | Prompt A13 | Universidades sin lista blanca | Real | P2 | `findByIdAndUpdate` con body crudo |
| A14 | Prompt A14 | Logout no revoca Bearer | Real | P1 | `auth.js` solo lee cookie; logout solo sube `tokenVersion` con cookie |
| A15 | Prompt A15 | Código muerto y duplicado | Real | P2 | `planImportService.js` sigue existiendo; `requireAuth`, `disconnectMongo`, limiters y helpers duplicados |
| A16 | Prompt A16 | `/users/me` con caché vieja | Real | P1 | Caché no se invalida al actualizar usuario |
| A17 | Prompt A17 | Comentarios obsoletos | Real | P2 | `rateLimitAi.js`, `aiJson.js` y `correlativas.service.js` |
| A18 | Prompt A18 | Errores del extractor clasificados como 422 | Real | P2 | Cualquier excepción se convierte en “No se pudo leer el PDF” |
| A19 | Prompt A19 | Datos y endpoints expuestos | Real | P2 | Email hardcodeado, password literal, `/api-docs` público, `populate("createdBy")` completo |
| A20 | Prompt A20 | Lógica de correlativas mezclada en el controller | Ya resuelto | P3 | `planSubject.controllers.js` delega en `planCorrelativas.service.js` |
| A21 | Prompt A21 | Hook `pre(/^find/)` afecta borrados de carrera | Real | P1 | Puede convertir un borrado válido en 404 |
| A22 | Prompt A22 | Swagger incompleto | Real | P2 | Falta `parse-correlativas` y cambios de visibilidad/validación |
| B2 | Prompt B2 | Avance inconsistente entre “Mi progreso” y grafo | Real | P1 | `MyProgress` cuenta estados crudos; el grafo usa `resolveProgressStatuses` |
| B3 | Prompt B3 | Fallos de carga de progreso ocultos | Real | P1 | `catch` devuelve `[]` sin aviso |
| B4 | Prompt B4 | Errores falsos después de una operación exitosa | Real | P1 | `loadCareers`/`reload` dentro del mismo `try` |
| B5 | Prompt B5 | Un error oculta la tabla de usuarios | Real | P2 | `AdminUsers` reemplaza la vista por el error |
| B6 | Prompt B6 | Guardados a medias | Real | P1 | Validación dentro del `for`, después de otros PUT |
| B7 | Prompt B7 | Home sin manejo de errores ni cancelación | Real | P1 | `onEnroll` sin `catch`; requests sin `AbortController` |
| B8 | Prompt B8 | `ErrorBoundary` no se recupera al navegar | Real | P2 | Envuelve todo `Routes` sin `key` por ruta |
| B9 | Prompt B9 | Accesibilidad incompleta | Real | P2 | Revertir solo con clic derecho; faltan `aria-controls`, `role="option"`, `controlId` y `aria-label` |
| B10 | Prompt B10 | Lógica del grafo duplicada en el frontend | Real | P1 | `studyPaths.ts`, stats del subgrafo y color repetido |
| B11 | Prompt B11 | Articulación pierde cambios | Real | P2 | `useEffect` depende de `careers` y resetea `articChecked` |
| B12 | Prompt B12 | CSV injection en “Mi progreso” | Real | P1 | Celdas exportadas sin neutralizar `=`, `+`, `-`, `@` |
| B13 | Prompt B13 | Código muerto en frontend | Real | P2 | `CareerContextValue`, `careersApi.publish`, exports y props sin uso |
| B14 | Prompt B14 | Formato roto en `studyPlans.ts` | Real | P2 | `},  updateSubject:` en la misma línea |
| B15 | Prompt B15 | Validación frontend distinta del backend | Real | P2 | Regex de nombres y mínimo de nickname no coinciden con Joi |
| B16 | Prompt B16 | `localStorage` sin try/catch | Real | P2 | `ThemeContext` puede romper en modo restringido |
| B17 | Prompt B17 | Errores de `MessageBanner` se autocierran | Real | P2 | 6 segundos para errores |
| B18 | Prompt B18 | Warnings de ESLint | Real | P2 | `exhaustive-deps` por `MAP_MARGINS` y `eslint-disable` de refs |
| B19 | Prompt B19 | Estilos inline (opcional) | Real | P3 | 29 `style={{...}}` en `PlanGraph.tsx` |
| B20 | Prompt B20 | `AdminCatalog.tsx` demasiado grande | Real | P3 | 1431 líneas, 38 `useState`, 4 pestañas |
| B21 | Prompt B21 | `PlanGraph.tsx` demasiado grande | Real | P3 | 1181 líneas; hooks y `DetailPanel` extraíbles |
| B22 | Prompt B22 | `UploadPlan.tsx` demasiado grande | Real | P3 | 882 líneas; `usePlanImport` y `PreviewCard` |
| B23 | Prompt B23 | `Home.tsx` demasiado grande | Real | P3 | 826 líneas; tarjetas y hook de navegación |
| B24 | Prompt B24 | `loadProgress` duplicado en `MyProgress` | Real | P3 | Dos bloques equivalentes |
| C1 | Prompt C1 | `ARCHITECTURE.md` desactualizado | Parcial | P2 | Redis/rate limit y `utils/` son incorrectos; la afirmación sobre `SUBJECT_STATUS` también está mal formulada |
| C2 | Prompt C2 | `CSS.md` dice 8 partials y hay 10 | Real | P2 | `index.css` importa 10, incluidos `graph.css` y `graph-dark.css` |
| C3 | Prompt C3 | `Gradify_Documentacion.md` desactualizado | Real | P2 | `isSatisfied`, clic derecho y `resolveProgressStatuses`/`sortSubjects` |
| C4 | Prompt C4 | README sin variables nuevas | Real | P2 | `TRUST_PROXY`, `PARSE_DEBUG` |
| G2 | Gemini 2 | Actualizar CSS y versión de Swagger | Real | P2 | `docs/CSS.md` y `backend/README.md` |
| G3 | Gemini 3 | Verificar lint, tsc y tests | Verificado | — | Línea base verde: 45/45, 24/24, 17/17, build OK, lint 0 errores |
| PDF-1 | PDF 3.1 | CSP de Helmet desactivada | Real | P2 | Revisar política CSP para frontend y Swagger |
| PDF-2 | PDF 4 | Faltan E2E de interfaz y flujos completos | Real | P3 | No hay E2E de navegación; la línea base no ejecuta Mongo/Redis |
| PDF-3 | PDF 3.2 | `limiterChat`/`limiterParse` sin rutas | Real | P2 | Definidos y no usados; eliminar o conectar |
| PDF-4 | PDF 3.3 | Docker Compose de producción usa HMR/nodemon | Real | P3 | `compose.yaml` está orientado a desarrollo |
| PDF-5 | PDF 1.5 / E | Importación PDF con WARN y revisión humana | Parcial | P2 | Hay parser modular y snapshots, pero faltan métricas de calidad y reanudación |

## Hallazgos que cambian la formulación original

- El prompt asume que el ZIP de correcciones ya está aplicado. **No es así**: `nameOverride` sigue roto, `progressService.js` y `userprogress.js` existen y A20 ya está resuelto.
- El prompt dice React 18; el repositorio usa **React 19**.
- B20 apunta a `pages/AdminCatalog.tsx`; el archivo real está en `components/AdminCatalog.tsx`.
- C1 se equivoca al afirmar que `models/` exporta `SUBJECT_STATUS`; el problema real es que la documentación lo describe mal.
- El ZIP de correcciones contiene fixes reales (A1, `nameOverride`, visibilidad, cascada), pero su `LEEME` declara 5 archivos y difiere en 10; además no arregla A3. Se descartó como parche.

## Decisión de alcance

Se corregirá desde cero en la rama `fix/revision-2026-10-30`, sin aplicar el ZIP. El orden es:

`Fase 0` → `P0` → `D1` → `D1-b` → `P1` → `D2` → `P2` → `P3` → verificación final.

El detalle de ejecución, tests y commits vive en el plan de trabajo de la sesión. El estado final de cada ítem se registra en `CAMBIOS.md`.
