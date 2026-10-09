# Plan de Pruebas

**Proyecto:** Gradify — Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico
**Versión:** 2.2
**Fecha:** 09/10/2026
**Sponsor Organización:** Universidad Nacional de Hurlingham (UNAHUR) — Licenciatura en Informática
**Autor:** Equipo del proyecto integrador
**Tutor:** Prof. Alejandra Pinto
**Release:** Septiembre 2026

---

## Objetivo del Testing

Garantizar que la aplicación web (React) y su API REST (Node/Express + MongoDB + Redis) funcionen correctamente para: carga de planes de estudios en PDF (plan, correlativas e historial), detección de materias y correlatividades, visualización en grafo/tablero, seguimiento del progreso académico y manejo de errores.

## Alcance del Testing

- Pruebas de funcionamiento de los endpoints de la API (`/careers`, `/progress`, `/health`) y de la documentación en `/api-docs`.
- Validación de la carga de PDF: plan oficial, PDF de correlativas y archivo con estructura inesperada; descarte de filas de totales y de títulos de sección.
- Verificación del **matching clásico** de correlativas (exacto, compacto, difuso y por prefijo) y del nivel de confianza devuelto (`exact` | `compact` | `fuzzy` | `null`).
- Verificación del **título intermedio**: detección en el PDF, `creditsIntermediate` / `intermediateTitle`, materias marcadas `intermediate` y banner de progreso en el grafo.
- Verificación de la identificación del progreso (JWT: `401` sin token; `403`/`404` sin permiso del dueño o ADMIN).
- Verificación del manejo centralizado de errores (`400` IDs/validaciones/archivos, `404` inexistente, `500` genérico) y de que el proceso no se cae.
- Verificación de planes extensos y de formatos inesperados.
- Verificación de la interfaz: navegación entre layouts, estados de materia, camino crítico, accesibilidad básica y comportamiento de `ErrorBoundary`.

## Herramientas para el Testing

### Pruebas individuales
**Descripción:** se utiliza **`pruebas.http`** (12 pasos: register → login → preview → confirm → subjects → graph → sugerencias → enroll → progress → cascada) como herramienta complementaria durante el desarrollo de la API: enviar solicitudes HTTP (con Bearer JWT y multipart) y revisar las respuestas de forma interactiva. También se usa el navegador con DevTools para las vistas del frontend.

**Funcionalidades principales:**
- Envío de solicitudes HTTP con y sin JWT.
- Visualización de respuestas JSON de forma estructurada.
- Pruebas manuales exploratorias de los flujos de la aplicación (subir PDF, explorar grafo, marcar progreso).

### Verificación estática y de compilación
**Descripción:** chequeo de sintaxis del backend con `node --check` sobre `src/` y verificación del frontend con las herramientas del proyecto (`eslint`, `tsc -b` y `vite build`). Se ejecutan antes de cada entrega. Suite de unitarios: **`npm test`** (`node --test tests/`, 0 dependencias, 14 tests: `bestDbMatch`, whitelist/anti-ciclos/BUG-009, RN04, AR-3).

**Funcionalidades principales:**
- Detectar errores de sintaxis en el backend sin necesidad de levantar el entorno.
- Detectar errores de tipos y de lint en el frontend.
- Confirmar que el build de producción se completa.

### Pruebas masivas
**Descripción:** script reutilizable **`npm run test:planes`** (motor `carga-masiva.test.js` con usuario JWT propio) que ejecuta pruebas masivas sobre la API real: recorre los 43 PDFs de `files/UNAHUR-Oferta-Academica` por el mismo camino que la UI (`preview` sin persistir), compara contra la tabla de referencia `docs/testing/planes-referencia.json` (tipo Licenciatura/Tecnicatura/Ingeniería con rangos esperados) y vuelca un informe en `backend/scripts/informes/`.

**Funcionalidades principales:**
- Usuario de prueba propio por corrida (se borra al final; el preview no persiste nada).
- Estados por PDF: `OK` (parser), `OK-IA` (rescatado por el fallback de IA), `WARN` (observaciones: sin año, créditos 0, correlativas vía IA), `FAIL`, `SKIP` (`STRICT_IA=1` vuelve FAIL la falta de IA).
- Análisis automático de respuestas para detectar errores o anomalías.

## Casos de Prueba

1. **Salud y documentación**
   - Caso 1: **Salud.** `GET /health` → `200` con `{ "status": "ok" }` y `GET /` → `200` con el índice de la API.
   - Caso 2: **Swagger.** Abrir `/api-docs` y verificar que el documento carga y que los paths listados son los reales (v2.0: users, careers, plan-imports, study-plans, user-study-plans, universities, academic-units).

2. **Cuentas y catálogo**
   - Caso 2 bis: **Registro/login.** `POST /users/register` (nickName, firstName, lastName, email, password min 6) → `201`; duplicado → `409`; `POST /users/login` → `200` con JWT; credenciales mal → `401`.

3. **Carga de planes de estudio**
   - Caso 3: **Preview del plan oficial.** `POST /plan-imports/preview` (JWT, PDF en `file`) → `200` con `subjects`, `detectedCount`, `sourceKind`, `correlativasTexto`, `aiFallback`.
   - Caso 4: **Sin archivo.** La misma petición sin `file` → `400` con mensaje claro.
   - Caso 5: **Fila de totales.** Con un plan que cierre con una fila de totales ("TOTAL…"/"TÍTULO: …"), verificar que **no** se importe como materia.
   - Caso 6: **PDF escaneado o ilegible.** Enviar un PDF sin texto → `422` y el servidor sigue operativo.
   - Caso 7: **No-PDF.** Enviar un archivo que no es PDF → `400`; superar los 10 MB → `400` por tamaño.
   - Caso 7 bis: **Confirm.** `POST /plan-imports/confirm` (`fileHash`, `careerId`, `name`, `fileName`, `subjects`) → `201` con `saved`, `prerequisitesResolved`, `prerequisitesReview`; ciclo → `400` sin guardar; repetido → `409`.
   - Caso 8: **PDF de correlativas.** `preview` informa `correlativasTexto` por materia; el matching a `prerequisites` lo resuelve el confirm (solo exact+compact; lo dudoso a revisión).
   - Caso 8 bis: **Carga masiva + fallback IA.** `npm run test:planes` sobre los 43 PDFs: verifica `detectedCount` dentro del rango de `docs/testing/planes-referencia.json`; si el parser devuelve 0 y hay IA configurada, la respuesta trae `aiFallback: true` + `provider`.

4. **Progreso académico**
   - Caso 9: **Sin identificación.** Rutas protegidas sin JWT → `401`; plan ajeno sin permiso → `403`/`404`.
   - Caso 10: **Marcar progreso.** `PUT /user-study-plans/:id/progress/:subjectId` (APROBADA/REGULARIZADA/CURSANDO/PENDIENTE + nota) y verificar recálculo de disponibles y créditos.

5. **Grafo de correlatividades**
   - Caso 11: **Estructura.** `GET /study-plans/:id/graph` → `nodes`, `edges`, `availableNow`, `criticalPath`, `hasCycle`, `topologicalOrder` y `stats`.
   - Caso 12: **Título intermedio.** En un plan con título intermedio, verificar `graph.intermediate` y el banner; sin título, que no se muestre.
   - Caso 13: **IDs inválidos.** `GET /study-plans/abc` → `400`; ID inexistente → `404`.

6. **Administración de planes**
   - Caso 14: **Alta y duplicados.** `POST /study-plans` sin `name` → `400`; confirmar dos veces el mismo PDF → `409`.
   - Caso 15: **Publicación.** `PATCH /study-plans/:id` (`status: "published"`); `GET /study-plans` lista propios (ADMIN ve todos).
   - Caso 16: **Edición y borrado.** `PATCH` materia (incluye `prerequisites` con anti-ciclos); `DELETE` materia referenciada o con progreso → `409`; `DELETE /study-plans/:id` → `200` con `removed:{subjects,enrollments,progress,imports}` (409 con otros inscriptos no-ADMIN).

6. **Manejo de errores**
   - Caso 17: **JSON inválido.** `POST /careers` con cuerpo mal formado → `400` "JSON inválido en el cuerpo de la solicitud".
   - Caso 18: **Validaciones de Mongoose.** Enviar datos inválidos (p. ej. sin `code` en una materia) → `400` con los mensajes de validación.
   - Caso 19: **Error interno.** Provocar un error inesperado → `500` con mensaje genérico, el detalle queda registrado en el servidor y el proceso sigue vivo.

7. **Interfaz**
   - Caso 20: **Navegación.** Recorrer `/` → `/cargar` → `/admin` → `/grafo` → `/tablero` → `/progreso` → una ruta inexistente (404), verificando que cada una renderiza dentro de su layout (usuario o administrador).
   - Caso 21: **Estados en el grafo.** Cambiar el estado de una materia habilitada y verificar el cambio de color, el desbloqueo de las sucesoras y la actualización de la barra de progreso y del camino crítico.
   - Caso 22: **Errores en la interfaz.** Detener el backend y realizar una acción → mensaje "No se pudo conectar con el servidor" sin que la pantalla se rompa (`ErrorBoundary`).
   - Caso 23: **Accesibilidad.** Verificar que los selectores y campos de *Mi progreso* y *Admin* tengan `aria-label` descriptivos, que la zona de arrastre sea operable por teclado (`role="button"`), que los loaders usen `role="status"`, que los mensajes usen `role="alert"` y que las barras de progreso expongan `role="progressbar"`.

## Plan de Ejecución

1. Configurar un entorno de prueba (backend en puerto 3000, frontend en puerto 5173, MongoDB y Redis locales).
2. Preparar los casos de prueba y los PDFs de muestra (plan oficial, PDF de correlativas, plan con fila de totales, PDF escaneado, plan extenso).
3. Ejecutar cada caso de prueba sobre los endpoints y flujos relevantes.
4. Registrar los resultados en el [Documento de Seguimiento de Testing](./Test-Cases.md), incluyendo errores o comportamientos inesperados.
5. Repetir las pruebas tras cada corrección para confirmar estabilidad y consistencia.

## Resultados de la Última Ejecución (09/10/2026, nueva arquitectura)

- **Backend:** `npm test` 14/14 (matcher recuperado a `correlativas.service` + RN04 + AR-3) · `snapshot --check` SIN DIFERENCIAS · `validar` todo OK (`test:salud` OK con controles negativos 400/400 · `test:planes` OK=27+OK-IA=1+WARN=15+FAIL=0 sobre `files/` local con auth JWT).
- **Frontend:** `npm run lint` 0 errores; `npx tsc --noEmit` limpio (**con `strict: true`**).
- **E2E por API (flujo completo con usuario temporal, luego borrado):** register → login → `/users/me` → `GET /careers` (40) → `preview` (52/oficial) → `confirm` (52 guardadas, `prerequisitesResolved`) → subjects → `/graph` (nodos/aristas) → `/sugerencias` → enroll → progress APROBADA → DELETE plan en cascada (`removed:{subjects,enrollments,progress,imports}`) → DELETE usuario. 12/12 OK, DB restaurada.
- **Casos HTTP:** `pruebas.http` reescrito al flujo real (12 pasos con Bearer + multipart + confirm).
- **Unitarios:** `npm test` — 14 tests (matcher, anti-ciclos/BUG-009, RN04, AR-3), 0 dependencias. Tests jest huérfanos de `src/` eliminados (probaban código pre-merge).

## Plan de Pruebas Adicionales (Opcionales)

**Prueba de calidad a gran escala:** ejecutar múltiples cargas de distintos planes (varias carreras y formatos) para garantizar que la importación y el matching de correlativas mantengan un alto nivel de calidad bajo una carga significativa.
