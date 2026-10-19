# Plan de Pruebas

**Proyecto:** Gradify — Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico
**Versión:** 2.4
**Fecha:** 16/10/2026
**Sponsor Organización:** Universidad Nacional de Hurlingham (UNAHUR) — Licenciatura en Informática
**Autor:** Equipo del proyecto integrador
**Tutor:** Prof. Alejandra Pinto
**Release:** Septiembre 2026

---

## Objetivo del Testing

Garantizar que la aplicación web (React) y su API REST (Node/Express + MongoDB + Redis) funcionen correctamente para: carga de planes de estudios en PDF (plan, correlativas e historial), detección de materias y correlatividades, visualización en grafo/tablero, seguimiento del progreso académico y manejo de errores.

## Alcance del Testing

- Pruebas de funcionamiento de los endpoints de la API (`/users`, `/careers`, `/universities`, `/academic-units`, `/plan-imports`, `/study-plans`, `/user-study-plans`, `/progress`, `/health`) y de la documentación en `/api-docs`.
- Validación de la carga de PDF: plan oficial, PDF de correlativas y archivo con estructura inesperada; descarte de filas de totales y de títulos de sección.
- Verificación del **matching clásico** de correlativas (exacto, compacto, difuso y por prefijo) y del nivel de confianza devuelto (`exact` | `compact` | `fuzzy` | `null`).
- Verificación del **título intermedio / tecnicatura**: detección en el PDF, `creditsIntermediate` / `intermediateTitle`, materias marcadas `intermediate`, sub-plan virtual (`/study-plans/:id/intermediate`) y pestañas Lic/Tec.
- Verificación del **catálogo por instituto** (colores, `withCounts`, filtros `?unit`/`includeArchived`) y de la **articulación** entre carreras.
- Verificación del **bloqueo del avance por correlativas** (RN05): el backend rechaza avanzar sin correlativas cumplidas.
- Verificación de la identificación del progreso (JWT: `401` sin token; `403`/`404` sin permiso del dueño o ADMIN).
- Verificación del manejo centralizado de errores (`400` IDs/validaciones/archivos, `404` inexistente, `409` duplicados, `500` genérico) y de que el proceso no se cae.
- Verificación de planes extensos y de formatos inesperados.
- Verificación de la interfaz: navegación (AppShell, roles, 403/404), estados de materia, camino crítico, pestañas Lic/Tec, promedio/CSV, accesibilidad básica y comportamiento de `ErrorBoundary`.

## Herramientas para el Testing

### Pruebas individuales
**Descripción:** se utiliza **`pruebas.http`** (15 pasos: register → login → preview → confirm → subjects → graph → sugerencias → enroll → progress → cascada → marcado en lote de tecnicatura → sub-plan intermedio) como herramienta complementaria durante el desarrollo de la API: enviar solicitudes HTTP (con Bearer JWT y multipart) y revisar las respuestas de forma interactiva. También se usa el navegador con DevTools para las vistas del frontend.

**Funcionalidades principales:**
- Envío de solicitudes HTTP con y sin JWT.
- Visualización de respuestas JSON de forma estructurada.
- Pruebas manuales exploratorias de los flujos de la aplicación (subir PDF, explorar grafo, marcar progreso).

### Verificación estática y de compilación
**Descripción:** chequeo de sintaxis del backend con `node --check` sobre `src/` y verificación del frontend con las herramientas del proyecto (`eslint`, `tsc -b` y `vite build`). Se ejecutan antes de cada entrega. Suite de unitarios: **`npm test`** (`node --test`, 0 dependencias, **32 tests** en 6 archivos: `unitarios`, `sugerencias`, `rn04`, `registro`, `seguridad`, `intermedio`).

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

8. **Catálogo, tecnicatura y administración (v2.3)**
   - Caso 24: **Catálogo por instituto.** `GET /academic-units?withCounts=1` devuelve `careerCount`; `GET /careers?unit=<id>` filtra por instituto; `GET /careers?includeArchived=1` solo devuelve archivadas a un ADMIN.
   - Caso 25: **Articulación.** `PATCH /careers/:id` con `continuesIn` valida IDs existentes y rechaza la autorreferencia (`400`); el catálogo muestra "Continúa en …".
   - Caso 26: **Tecnicatura intermedia.** `GET /study-plans/:id/intermediate` devuelve `subjects`, `closed` y `externalRequires`; un plan sin título intermedio → `404`. En Grafo/Tablero/Progreso, la pestaña Tecnicatura acota la vista y avisa si no hay materias marcadas.
   - Caso 27: **Bloqueo por correlativas (RN05).** `PUT /user-study-plans/:id/progress/:subjectId` en una materia con correlativa pendiente → `400` con el detalle; volver a `PENDIENTE` → `200`.
   - Caso 28: **Promedio y CSV.** En *Mi progreso*, con notas cargadas se muestra el promedio de aprobadas y "Exportar CSV" descarga el estado por materia.
   - Caso 29: **Mi cuenta / logout.** `PATCH /users/:nickName` actualiza el perfil; `POST /users/logout` invalida el JWT (`tokenVersion++`) y el token previo deja de servir (`401`).
   - Caso 30: **Admin de usuarios y archivadas.** `GET /users` y `PATCH /users/:nickName` (rol) solo ADMIN; Admin Archivadas lista `isArchived` y permite restaurarlas.

9. **Tecnicatura en lote, tipo de carrera e IA acotada (v2.4)**
   - Caso 31: **Aviso de tecnicatura incompleta.** Subir un plan que declara título intermedio pero cuyo PDF no tabula el subconjunto (p. ej. Lic. en Nutrición) → el preview devuelve `intermediateTitle` con 0 materias marcadas y muestra el aviso; en *Editar plan* el aviso persiste hasta marcar materias.
   - Caso 32: **Marcado en lote.** `PATCH /study-plans/:id/subjects/intermediate` con `{intermediate: true}` → `{matched, modified}` con todo el plan; con `{intermediate: true, year: 1}` → solo ese año; con `ids` → solo esas materias; `intermediate` no booleano → `400`; en *Editar plan*, la barra "Marcar/Desmarcar + alcance" refleja el contador de marcadas.
   - Caso 33: **Propuesta de IA revisable.** Con IA configurada y un plan con título intermedio sin materias marcadas (p. ej. Diseño Industrial), el preview devuelve `intermediateClassified: true` con el subconjunto propuesto y `creditsIntermediate` recalculado; la columna *Tec* permite corregirlo antes de guardar. Una propuesta incoherente (1–3 materias, filas ACA o tramo > 3 años) se descarta sin marcar nada (`names: []`).
   - Caso 34: **Tipo de carrera.** `POST /careers` con `careerType: "Tecnicatura"` → `201`; valor fuera del enum → `400`; `PATCH` con `careerType: null` lo limpia; en el Home la carrera muestra el chip **🎓 Tecnicatura**.
   - Caso 35: **Caché de extractos v3.** Subir dos veces el mismo PDF: la segunda responde `cached: true` con el mismo resultado (incluida la clasificación del intermedio); las extracciones v2 dejan de reutilizarse.

10. **Panel admin completo y correlativas regularizadas (v2.5)**
   - Caso 36: **Institutos: editar, color y borrar.** `PATCH /academic-units/:id` con `{name}` o `{color: "#ff8800"}` → `200` persistido (visible en `GET /academic-units?withCounts=1`); color no hex (`"rojo"`) → `400`; `DELETE` con carreras asignadas o subunidades → `409` con mensaje; sin dependencias → `200`. En la pestaña *Institutos*, el swatch de color autoguarda (debounce) y Editar/Eliminar operan con confirmación.
   - Caso 37: **Carreras: editar, archivar y borrar.** `PATCH /careers/:id` actualiza nombre/tipo/universidad/instituto (quitar el instituto → `academicUnit: null`); *Archivar* la oculta del catálogo (restaurable desde *Carreras archivadas*); `DELETE` sin planes → `200` y con planes → `409`.
   - Caso 38: **Correlativas regularizadas por defecto.** El confirm del plan y `saveCorrelativas` guardan `requiredStatus: "REGULARIZADA"` cuando no se indica otro: una correlativa regularizada **habilita** avanzar; exigir `APROBADA` bloquea hasta aprobar. En *Editar plan*, las correlativas nuevas se agregan con ese default, el select prioriza "Alcanza regularizada" y el control por plan aplica el requisito a todas las correlativas.

## Plan de Ejecución

1. Configurar un entorno de prueba (backend en puerto 3000, frontend en puerto 5173, MongoDB y Redis locales).
2. Preparar los casos de prueba y los PDFs de muestra (plan oficial, PDF de correlativas, plan con fila de totales, PDF escaneado, plan extenso).
3. Ejecutar cada caso de prueba sobre los endpoints y flujos relevantes.
4. Registrar los resultados en el [Documento de Seguimiento de Testing](./Test-Cases.md), incluyendo errores o comportamientos inesperados.
5. Repetir las pruebas tras cada corrección para confirmar estabilidad y consistencia.

## Resultados de la Última Ejecución (16/10/2026, v2.5)

Verificación de la tanda v2.5 (panel ADMIN: institutos con color y CRUD con guardas, edición/archivado/borrado de carreras, articulación buscable; correlativas importadas `REGULARIZADA` por defecto) sobre el **stack Docker** (API :3000, Mongo :27018). Sin cambios de parser: golden/masiva/salud no se re-ejecutan y siguen vigentes los de la corrida 9.

- **Backend unitarios:** `npm test` **32/32** (la tanda no cambió ni sumó unitarios).
- **E2E admin por API (14/14):** `401` sin token en `POST /academic-units`; alta de universidad e instituto con `color: "#12ab34"`; color inválido → `400`; `PATCH` color (`#ff8800`) y nombre → `200`; carrera creada en el instituto → `GET /academic-units?withCounts=1` con `color` y `careerCount=1`; `DELETE` instituto con carreras → `409`; editar carrera (`careerType` + quitar/poner instituto) → `200`; borrados carrera → instituto → universidad → `200`. Usuario temporal y datos de prueba eliminados; la base quedó idéntica (2 usuarios, 1 universidad, 4 institutos, 63 carreras).
- **Correlativas en base scratch (5/5):** `saveCorrelativas` graba `requiredStatus: "REGULARIZADA"`; una correlativa regularizada **habilita** el avance; al exigir `APROBADA`, regularizada no alcanza; aprobada sí habilita.
- **Frontend:** `tsc -b` (strict) + `eslint` sin errores.

## Resultados de la Ejecución v2.4 (16/10/2026)

Entorno local sin Redis (Mongo 27017); para verificar **la app** además de la carga se sembró el catálogo desde el corpus con `seed:planes` (**OK=29**: universidad + 4 institutos + 29 carreras + 29 planes oficiales; usuario de prueba borrado).

- **Backend unitarios:** `npm test` **32/32** en 6 archivos (`unitarios`, `sugerencias`, `rn04`, `registro`, `seguridad`, `intermedio`): se suma la validación pura de la propuesta de intermedio (`tests/intermedio.test.js`, 6 casos: ACA fuera, mínimo 4, tramo ≤ 3 años, nombres exactos del plan; BUG-017).
- **Golden:** `snapshot:planes -- --check` sobre 43 JSON → **43/43 SIN DIFERENCIAS**.
- **Masiva (`test:planes`, 43 PDFs): OK=27 + OK-IA=1 + WARN=15 + FAIL=0 + SKIP=0** (idéntica a la corrida 7; los WARN son correlativas sin `correlativasTexto`/sin endpoint de matching, ya documentados). El informe agrega columnas de intermedio: **21 planes declaran título intermedio · 14 con materias marcadas** (13 vía IA + 1 tabulada por el parser) **· 7 sin marcar por cuota de IA agotada en el momento de esa corrida** (Gemini 429 + TPM 8000 de Groq compartido con los rescates de correlativas). En todos los casos la app **avisa y no marca nada**: el ADMIN marca a mano o en lote, y el reintento de clasificación al reutilizar un extracto quedó implementado (BUG-019).
- **Salud (`test:salud`): todo OK** — Kinesiología 47/35, Obstetricia 39/33, Enfermería 41/34, Nutrición 52/20 (origen por carrera: ia/ia/oficial/ia) + **controles negativos 400/400**.
- **E2E v2.4 por API (18 chequeos): 18/18** — `careerType` (201 / 400 fuera del enum / persistido en `/careers`), import de una tecnicatura (Electromovilidad: preview 21 → confirm → años [1,2,3]), marcado en lote (`year=1` → `matched=5 modified=5`; desmarcar → `matched=21 modified=5`; valor no booleano → 400), `GET /intermediate` (5 materias, `closed=true`), clasificación IA de Diseño Industrial (18 marcadas, 109 créditos, `classified=true`), segundo preview `cached=true` con el mismo resultado, correlativas de Obstetricia (33 filas) y permisos (usuario común/ajeno → 403).
- **Frontend:** `tsc -b` (strict), `eslint` y `vite build` sin errores.

## Resultados de la Ejecución Anterior (14/10/2026, v2.3)

- **Backend unitarios:** `npm test` **26/26** en 5 archivos (`unitarios`, `sugerencias`, `rn04`, `registro`, `seguridad`): matcher, anti-ciclos/BUG-009, RN04, AR-3, registro/roles y CSRF (`checkOrigin`) + invalidación por `tokenVersion`.
- **Golden:** `snapshot:planes -- --check` sobre 43 JSON (`diff = 0` en los planes sanos).
- **E2E:** `validar` (masiva + salud + controles negativos) y `pruebas.http` reescrito al flujo real (13 pasos con cookie/Bearer y multipart).
- **Frontend:** `tsc -b` (strict) + `lint` sin errores; `vite build` OK.
- **Nuevas prestaciones verificadas por unitarios/estructura:** correlativas que bloquean el avance (RN05 en backend + pre-chequeo en Mi progreso), tecnicatura intermedia (`/study-plans/:id/intermediate`), catálogo por instituto + articulación `continuesIn`, `checkOrigin`/logout, y admin de usuarios/archivadas.

## Resultados de la Ejecución Histórica (09/10/2026, nueva arquitectura)

- **Backend:** `npm test` 14/14 (matcher recuperado a `correlativas.service` + RN04 + AR-3) · `snapshot --check` SIN DIFERENCIAS · `validar` todo OK (`test:salud` OK con controles negativos 400/400 · `test:planes` OK=27+OK-IA=1+WARN=15+FAIL=0 sobre `files/` local con auth JWT).
- **Frontend:** `npm run lint` 0 errores; `npx tsc --noEmit` limpio (**con `strict: true`**).
- **E2E por API (flujo completo con usuario temporal, luego borrado):** register → login → `/users/me` → `GET /careers` (40) → `preview` (52/oficial) → `confirm` (52 guardadas, `prerequisitesResolved`) → subjects → `/graph` (nodos/aristas) → `/sugerencias` → enroll → progress APROBADA → DELETE plan en cascada (`removed:{subjects,enrollments,progress,imports}`) → DELETE usuario. 12/12 OK, DB restaurada.
- **Casos HTTP:** `pruebas.http` reescrito al flujo real (12 pasos con Bearer + multipart + confirm).
- **Unitarios:** `npm test` — 14 tests (matcher, anti-ciclos/BUG-009, RN04, AR-3), 0 dependencias. Tests jest huérfanos de `src/` eliminados (probaban código pre-merge).

## Plan de Pruebas Adicionales (Opcionales)

**Prueba de calidad a gran escala:** ejecutar múltiples cargas de distintos planes (varias carreras y formatos) para garantizar que la importación y el matching de correlativas mantengan un alto nivel de calidad bajo una carga significativa.
