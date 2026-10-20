# Documento de Seguimiento de Testing

**Proyecto:** Gradify — Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico
**Versión:** 2.5
**Fecha:** 2026-10-20
**Sponsor Organización:** Universidad Nacional de Hurlingham (UNAHUR) — Licenciatura en Informática
**Autor:** Equipo del proyecto integrador
**Tutor:** Prof. Alejandra Pinto
**Release:** Septiembre 2026

---

## Objetivo

El Documento de Seguimiento de Testing tiene como objetivo principal registrar y hacer seguimiento de los bugs encontrados durante el desarrollo y las pruebas de la aplicación. Proporciona una visión general de los problemas identificados, su estado actual y las acciones tomadas para resolverlos.

La metodología de prueba se describe en el [Plan de Pruebas](./Test-Plan.md).

> [!NOTE]
> El registro cubre solo los bugs de la **implementación actual**. Los hallazgos correspondientes a funcionalidades que ya no forman parte de la aplicación (autenticación, roles, recuperación de contraseña, chat con IA, matching por embeddings, Docker Compose, suites de tests) se retiraron en la versión 2.0 de este documento.

## Formato del Documento

El Documento de Seguimiento se organiza en forma de tabla, con las siguientes columnas:

1. **ID del Bug:** identificador único para cada bug encontrado.
2. **Descripción:** descripción breve del problema.
3. **Pasos para Reproducir:** pasos detallados para reproducir el bug.
4. **Prioridad:** alta, media o baja.
5. **Estado:** abierto, en proceso, resuelto o cerrado.
6. **Responsable:** miembro del equipo responsable.
7. **Fecha de Creación:** fecha de identificación inicial del bug.
8. **Fecha de Resolución:** fecha de resolución (si corresponde).
9. **Notas/Comentarios:** información adicional sobre el bug o su resolución.

## Seguimiento y Gestión de Bugs

- El documento se actualizará regularmente a medida que se identifiquen, resuelvan o avancen los bugs.
- Se dará retroalimentación sobre el estado de los bugs durante las reuniones de seguimiento del proyecto.
- Se realizarán pruebas adicionales para verificar que los bugs resueltos no hayan reintroducido problemas.

## Registro de Bugs

| ID | Descripción | Pasos para Reproducir | Prioridad | Estado | Responsable | Fecha de Creación | Fecha de Resolución | Comentarios |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | El lector importaba la fila de totales de cierre ("TÍTULO: ..." / "TOTAL ...") como una materia. | 1. Subir un PDF de plan con fila de totales al final.<br>2. Revisar las materias importadas. | Alta | Resuelto | Equipo | 2026-09-10 | 2026-09-15 | El parser descarta las filas de totales y los títulos de sección (`TAB_TOTAL_RE`) antes de emitir materias, y solo considera fila con datos cuando trae números reales. |
| BUG-002 | El parser no reconoce el dialecto `Asignatura\|Campo\|Carga\|Correlatividad` sin columna D ni duración C/A (Tec. Producción Agroecológica, Tec. Mantenimiento Hospitalario): devuelve 0 materias. | 1. `npm run test:planes` con esos PDFs.<br>2. Ver `detectedCount: 0`. | Media | Resuelto | Equipo | 2026-09-24 | 2026-09-24 | Agroecológica nativa (23, anclas número+Campo con gate que respeta columna Código/duración ajenas); Mant. Hospitalario nativo por "Cuatr.". En el camino el gate rompió 6 planes sanos (mismo vocabulario de encabezado) y la red golden lo detectó: gate final solo sin código ni duración. |
| BUG-003 | El dialecto `Nro\|Materia\|Hs\|Créditos\|Correlativas\|Equivalencia` con el número pegado al nombre (Tec. en Inteligencia Artificial) devuelve 0 materias. | 1. Subir `planes-carreras-informatica-para-web-ia.pdf`.<br>2. Ver `detectedCount: 0`. | Media | Mitigado | Equipo | 2026-09-24 | 2026-09-24 | Rescatado por fallback IA (20 materias, OK-IA). Además se corrigió la referencia: no es un PDF combinado, es el plan de la Tec. en IA. |
| BUG-004 | El PDF de correlativas de Diseño Industrial (layout de 2 columnas sin números de fila) devuelve 0/0 y `POST correlativas` con arreglo vacío responde 400. | 1. Cargar el plan de Diseño Industrial.<br>2. `POST /careers/:id/parse-correlativas` con el RCS-028_25. | Media | Mitigado | Equipo | 2026-09-24 | 2026-09-24 | La IA extrae pares literales del PDF (sin inventar códigos) y el matcher determinístico los resuelve: solo exact+compact a `aiSuggested` para aplicar en Editar plan; el guardado sigue manual y blindado. |
| BUG-005 | Matching bajo de correlativas con nombres envueltos en varias líneas (Obstetricia 6/35, Nutrición 17/48). | 1. Cargar el plan y luego su PDF de correlativas.<br>2. Ver `matchedCount/total < 0,7`. | Media | Mitigado | Equipo | 2026-09-24 | 2026-09-30 | Fix A (30/09): el parser redirige fragmentos al ancla correcta (cierre `-` + nombre completo + banda) → Obstetricia 23/35 y Nutrición 41/48 solo determinístico (E2E `test:salud`). La IA lectora cubre el resto con evidencia; ningún código proviene de la IA. |
| BUG-006 | Lic. en Ciberseguridad: 8 materias quedan sin año asignado. | 1. `npm run test:planes`.<br>2. Ver aviso `materias sin año` en el informe. | Baja | Resuelto | Equipo | 2026-09-24 | 2026-09-24 | Los subtotales "TOTAL PRIMER AÑO" vienen al cierre: el parser ahora asigna el año retroactivo (`fillRetroactiveYear`). Verificado E2E: 0 sin año, golden diff=0 en el resto. |
| BUG-007 | El script masivo marcaba SKIP la correlativa de Mantenimiento por un typo en la ruta par de `planes-referencia.json`. | 1. `npm run test:planes`.<br>2. Ver `SKIP: sin plan par`. | Baja | Resuelto | Equipo | 2026-09-24 | 2026-09-24 | Corregida la ruta en la referencia; ahora matchea 26/33. |
| BUG-008 | Groq responde 413 ante extracciones de ~25 mil caracteres y Gemini 503/429 intermitente (modelo saturado / cuota gratuita). | 1. Subir un plan de dialecto no soportado con IA configurada.<br>2. Ver `aiFallback: false` y el log `[parse-official]`. | Media | Mitigado | Equipo | 2026-09-24 | 2026-09-24 | Se envían solo las páginas con pinta de tabla (máx. 40 mil caracteres), se prueba Gemini primero en extracción y se reintento una vez ante 429/5xx. Con las keys gratuitas saturadas (~15 llamadas/hora) el fallback puede fallar en forma transitoria: reintentar más tarde. |
| BUG-009 | `POST /careers/:id/correlativas` persistía cualquier código en `requires` sin validar (un código inventado por IA o a mano rompía el grafo) y aceptaba ciclos y autorreferencias. | 1. Guardar `requires` con un código inexistente o un ciclo A→B→A.<br>2. Ver el grafo resultante. | Alta | Resuelto | Equipo | 2026-09-24 | 2026-09-24 | `saveCorrelativas` valida en servidor: descarta códigos inexistentes y autorreferencias (los lista en `dropped`) y rechaza con 400 el lote si crea un ciclo, sin guardar nada. Regresión automática en `npm test` (Fase 3: whitelist + anti-ciclos + BUG-009). |
## Resultados de la Carga Masiva de Planes (2026-09-24)

Corrida `npm run test:planes` sobre los 43 PDFs de `files/UNAHUR-Oferta-Academica`, contra la API real y con limpieza total de carreras `[TEST]` (cero huérfanas al final). Referencia de rangos por tipo en `docs/testing/planes-referencia.json`. Estados: OK (parser), OK-IA (rescatado por IA), WARN (cierra con observaciones), FAIL, SKIP.

| PDF | Tipo | Detectadas | Estado | Detalle |
| --- | --- | --- | --- | --- |
| Ingenieria-Agronomica-EXP.-764-2024.pdf | ingeniería | 59 | OK | 59 persistidas |
| Tecnicatura-Produccion-Agroecologica-Periurbana.pdf | tecnicatura | 23 | WARN | Nativo (dialecto Asignatura\|Campo\|Carga); créditos 0 porque la tabla no trae (1 nombre con cola de ruido) |
| Licenciatura-en-Biotecnologia.pdf | licenciatura | 48 | OK | matching 41/41 correlativas |
| Plan-correlatividades-Biotecnologia | correlativas | 41/41 | OK | — |
| Licenciatura-en-Gestion-Ambiental.pdf | licenciatura | 50 | OK | — |
| Licenciatura-en-Tecnologia-de-los-Alimentos.pdf | licenciatura | 46 | OK | — |
| Tec.-Universitaria-en-Viverismo.pdf | tecnicatura | 25 | OK | — |
| Licenciatura-en-Desarrollo-Agrario.pdf | licenciatura | 41 | OK | — |
| Licenciatura-en-Kinesiologia-y-Fisiatria.pdf | licenciatura | 47 | OK | matching 41/41 correlativas |
| Plan-correlatividades-Kinesiologia | correlativas | 41/41 | OK | — |
| Licenciatura-en-Obstetricia.pdf | licenciatura | 39 | OK | matching 6/35 correlativas (BUG-005) |
| Plan-correlatividades-Obstetricia | correlativas | 6/35 | WARN | matching bajo; IA lectora: 27 exactas + 1 a revisión, cobertura 30/35 vía groq (no guardadas) |
| RCS-385 Plan Licenciatura-en-Enfermeria | licenciatura | 41 | OK | matching 39/39 (anexo RCS-246) |
| RCS-246 Modificación correlatividad Enfermería | correlativas | 39/39 | OK | anexo tabular |
| Licenciatura-en-Nutricion.pdf | licenciatura | 52 | OK | matching 17/48 correlativas (BUG-005) |
| Plan-correlatividades-Nutricion | correlativas | 17/48 | WARN | matching bajo; IA lectora: 13 exactas (1ª medición) / 11 exactas (corrida 5, cobertura 22/48) |
| Ingenieria-en-Energia-Electrica.pdf | ingeniería | 45 | OK | — |
| Ingenieria-Metalurgica.pdf | ingeniería | 49 | OK | — |
| lic-en-ciberseguridad-2026.pdf | licenciatura | 33 | OK | año retroactivo en subtotales (era BUG-006) |
| lic-en-desarrollo-de-videojuegos-2026.pdf | licenciatura | 32 | OK | — |
| lic-informatica-2026.pdf | licenciatura | 46 | OK | — |
| Licenciatura-en-Diseno-Industrial | licenciatura | 37 | OK | correlativas 0/0 (BUG-004) |
| RCS-028_25 correlatividades Diseño | correlativas | 0/0 | WARN | layout sin números; IA lectora pendiente de medición (cuota 429 en corrida 4) |
| Lic-en-Gestion-del-Mantenimiento | licenciatura | 40 | OK | matching 26/32 correlativas |
| RCS-029_25 correlatividades Mantenimiento | correlativas | 26/32 | WARN | prosa resolutiva eliminada (era 26/33 con junk); resto nombres envueltos |
| planes-carreras-informatica-para-web-ia.pdf | tecnicatura (IA) | 0→20 | OK-IA | Es la Tec. en Inteligencia Artificial, dialecto con equivalencias (BUG-003) |
| Tec.-Univ.-en-Electromovilidad.pdf | tecnicatura | 21 | OK | — |
| Tecnicatura-Mantenimiento-hospitalario-1.pdf | tecnicatura | 0→21 | OK | Dialecto con Régimen "Cuatr." ahora nativo (era IA) |
| Plan-correlatividades-Mant.-Hospitalario | correlativas | 6/20 | WARN | matching bajo; IA lectora: 9 exactas aplicables (verificado E2E) |
| Licenciatura-en-Educacion-Presencial-_-A-Distancia.pdf | licenciatura | 19 | OK | CCC 2 años, sin correlativas en web |
| RCS.-008-...-Profesorado-Universitario-de-Chino.pdf | profesorado | 41 | OK | 240 créditos; sin correlativas en web |
| RCS.-431-2024-Profesorado-Universitario-de-Biologia_removed.pdf | profesorado | 41 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-de-Biologia.pdf | correlativas | 37/39 | WARN | 37 matcheadas |
| PLAN-PROFESORADO-UNIVERSITARIO-DE-EDUCACION-FISICA.docx_removed.pdf | profesorado | 44 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-en-Educacion-Fisica-1.pdf | correlativas | 39/39 | OK | — |
| RCS-384-2024-Profesorado-Universitario-de-Ingles_removed.pdf | profesorado | 36 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-de-Ingles.pdf | correlativas | 33/33 | OK | — |
| CS-429-2024-Profesorado-Letras.pdf | profesorado | 39 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-de-Letras-1.pdf | correlativas | 37/38 | WARN | 37 matcheadas |
| RCS-383-2024-Profesorado-Universitario-de-Matematica-2_removed.pdf | profesorado | 37 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-de-Matematica-1.pdf | correlativas | 35/35 | OK | — |
| PLAN-PROFESORADO-UNIVERSITARIO-DE-GEOGRAFIA.docx_removed.pdf | profesorado | 39 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-de-Geografia.pdf | correlativas | 37/37 | OK | — |

**Resumen final (corrida 5, 43 documentos):** OK=34 + OK-IA=1 (Tec. IA 20) + WARN=8 + FAIL=0 + SKIP=0. Instituto de Educación: 8 planes OK + 6 correlativas (4 perfectas, Biología 37/39, Letras 37/38). Informes de cada corrida en `backend/scripts/informes/`.

**Control de Salud (`npm run test:salud`, informe en `backend/scripts/informes/control-salud-*.md`):** Kinesiología 41/41 (20 aristas), Enfermería 39/39 (31 aristas), Obstetricia 6/35 (0 aristas: las 6 reconocidas no tienen prerequisitos), Nutrición 17/48 (7 aristas); ningún ciclo. **Control negativo** (plan sin correlativas): `requires: []` en todo, 0 aristas, `hasCycle: false` y *todas* disponibles (52/52) — sin correlativas no hay bloqueo. Regla de control: aristas > 0 y disponibles < total ⇒ las correlativas se tomaron bien.

## Corrida 6 (30/09/2026, post Fix A + envelope + RN04)

`npm run test:planes` (vía `validaciones.js masiva`) y `npm run test:salud` sobre API real (backend local sin Redis, tolerado por caché en memoria), con limpieza total `[TEST]`.

**Planes: OK=34 + OK-IA=1 (Tec. IA 20 vía gemini) + WARN=8 + FAIL=0 + SKIP=0** — idénticos conteos a corrida 5.

**Correlativas determinísticas (Fix A):** Obstetricia **23/35** (era 6/35), Nutrición **41/48** (era 17/48), Diseño **32/38** (era 0/0), Mant. Hospitalario **14/19** (era 6/20), Mantenimiento 27/31. Resto igual (Kinesiología 41/41, Enfermería 39/39). IA lectora: 8 exactas en Obstetricia vía groq (failover Gemini 503 → Groq verificado en vivo).

**Salud:** mismos números con RN04 activo (sin regresión); negativo 0/52.

## Corrida 7 (09/10/2026, nueva arquitectura: JWT + planes por usuario)

Scripts E2E reescritos a la API nueva (`lib/testAuth.js`: usuario propio + Bearer + retry 429; flujo `preview` sin persistir). Corpus en `files/` local (ignorado por git), con fallback a `../files` y `PLANES_DIR`.

**Planes (`test:planes`, 43 PDFs): OK=27 + OK-IA=1 + WARN=15 + FAIL=0 + SKIP=0.** Los WARN son correlativas vía IA o sin `correlativasTexto` (el matching a `prerequisites` llega con el endpoint futuro, se reporta no se exige; `STRICT_IA=1` lo vuelve FAIL para auditoría).

**Salud (`test:salud`):** Kinesiología 47, Obstetricia 39, Enfermería 41, Nutrición 52 (determinístico, sin IA) + correlativas 200 (Kine 36/Obst 35/Enf 34vía IA salvo Enfermería 34 determinística, Nutri 10). **Controles negativos:** preview sin archivo → 400, buffer no-PDF → 400.

**E2E de usuario (12 pasos, temporal borrado):** register → login → `me` → careers(40) → preview(52/oficial) → confirm(52, 15 resueltas) → subjects → `graph`(nodos/aristas) → `sugerencias` → enroll → progress APROBADA → DELETE cascada (`removed:{subjects,enrollments,progress,imports}`) → DELETE usuario. 12/12 OK.

| ID | Descripción | Estado | Comentarios |
| --- | --- | --- | --- |
| BUG-010 | Scripts `salud`/`masiva` y `unitarios` hablaban la API pre-merge (`POST /careers` sin auth, `parse-official`, `grafo`) → 401/FAIL. | Resuelto 09/10 | Scripts reescritos a `preview`+JWT; matcher portado a `correlativas.service` y test re-apuntado (14/14). |
| BUG-011 | El `confirm` guardaba 0 `prerequisites` (grafo sin aristas) aunque el preview trae `correlativasTexto`. | Resuelto 09/10 | Resolución en el confirm (exact+compact, anti-ciclos 400): 15/19 en plan de prueba. |
| BUG-012 | `DELETE` materia referenciada devolvía 500 (guarda existía pero caía en el 500 genérico); plan con materias/importaciones imborrable por API. | Resuelto 09/10 | 409 con mensaje real; borrado en cascada propia del plan (409 solo con otros inscriptos no-ADMIN). |
| BUG-013 | `rateLimitAi` sin cablear (gasto IA sin cota) + 10 tests jest huérfanos (nunca corrieron, probaban código viejo). | Resuelto 09/10 | `aiRateLimit` en `preview` (privadas exentas); tests stale eliminados + `jest`/`supertest` fuera de devDeps (runner único `node --test`). |
| BUG-014 | El ámbito de vista en Grafo/Tablero/Progreso no se acotaba a lo elegido y una **tecnicatura sin materias marcadas repetía la Licenciatura** (mostraba el plan completo como si fuera el sub-plan). | Resuelto 14/10 | El subgrafo/lista se acota al ámbito elegido y, con tecnicatura vacía, se muestra un **aviso** en vez del canvas completo (Grafo, Tablero, Progreso y Home). |
| BUG-015 | Validaciones duplicadas en capas y ausencia de índices únicos permitían datos de catálogo repetidos (carreras/planes/materias). | Resuelto 14/10 | Índices únicos (`Career{name,academicUnit}`, `StudyPlan{name,career}`, `PlanSubject{studyPlan,subject}`, `AcademicUnit{name,university}`, `User.nickName/email`), validación en una sola capa y helper `visibleTo` para el acceso por rol. |
| BUG-016 | La tecnicatura intermedia quedaba **vacía en silencio**: 12 PDFs del corpus declaran `intermediateTitle` pero su subconjunto no está tabulado (solo lo traen la sección "Estructura del título del intermedio" de algunos planes, como Lic. en Informática). El preview mostraba el título con 0 materias marcadas y 0 créditos, sin aviso, y la única salida era marcar materia por materia desde *Editar plan*. | Resuelto 16/10 | Tres piezas: (a) **avisos** en el preview y en *Editar plan* cuando hay título intermedio y ninguna materia marcada; (b) **marcado en lote** `PATCH /study-plans/:id/subjects/intermediate` (`{intermediate, ids?, year?, period?}`) con barra "Marcar/Desmarcar" por año o todo el plan; (c) **propuesta de IA revisable** en el preview (ver BUG-017). Verificado sobre el corpus: Diseño Industrial 18 materias (1º–2º, 109 créditos), Nutrición 21 (110), Kinesiología 20 (100), Obstetricia 16 (94) — valores coherentes con los 120 créditos reales de Lic. en Informática. |
| BUG-017 | La primera versión de la propuesta de IA del intermedio aceptaba cualquier nombre de la lista: en Ciberseguridad propuso `ACTIVIDADES CURRICULARES ACREDITABLES (ACA)` como única materia y en Obstetricia un tramo de materias de 1º a 4º año; el ADMIN no podía ver ni corregir la propuesta antes de guardar (el preview no mostraba el flag). | Resuelto 16/10 | Prompt reescrito (tramo = ciclo inicial completo, prohibido incluir ACA, lista vacía si no hay certeza) + **validación pura** `pickIntermediateNames` (solo nombres exactos del plan, filas ACA fuera, mínimo 4 materias, tramo ≤ 3 años lectivos) con regresión en `npm test` (`tests/intermedio.test.js`, 6 casos). La propuesta se muestra en la **columna *Tec*** del preview para que el ADMIN la revise o la descarte. |
| BUG-018 | Las extracciones ya cacheadas (v2) seguían devolviendo 0 materias del intermedio aunque el código nuevo ya clasificaba: subir el mismo PDF devolvía la respuesta vieja sin refrescar. | Resuelto 16/10 | `PARSER_VERSION` v2 → **v3** en `pdfExtractionCacheService` (la clave de caché es `fileHash + parserVersion`): las extracciones anteriores dejan de reutilizarse y el primer re-upload vuelve a parsear y clasificar. |
| BUG-019 | Un fallo transitorio de la IA (429/cuota) durante el preview quedaba congelado en la extracción cacheada: el preview reutilizado (`cached: true`) ya no reintentaba la clasificación del intermedio y el plan quedaba sin marcar de forma permanente. | Resuelto 16/10 | El camino `REUSE` del preview ahora reintenta la clasificación si el extracto tiene título intermedio sin marcar (`tryClassifyIntermediate`), propaga el `aiProvider` y **refresca la caché** (`refreshPdfExtraction`, que actualiza un extracto `COMPLETADA`). Verificado en E2E v2.4: Diseño Industrial pasó de 0 a **18 marcadas / 109 créditos** sobre la caché existente y el segundo preview mantuvo `cached: true` con el mismo resultado. |
| BUG-020 | El controlador de institutos (`academicUnit.controllers`) llamaba `academicUnitService.updatedAcademicUnit` y `getAcademicUnitById`, nombres **inexistentes** en el servicio (los reales son `updateAcademicUnit`/`findAcademicUnitById`): editar un instituto por API respondía `400` siempre (`TypeError` capturado) y el detalle por id, `500`. | Resuelto 16/10 | Se corrigieron ambos nombres; verificado en E2E v2.5: `PATCH /academic-units/:id` de color y nombre → `200` persistido y `withCounts` coherente (14/14). |

## Corrida 8 (14/10/2026, v2.3: institutos, tecnicatura, articulación y correlativas bloqueantes)

Verificación de los cambios posteriores a la corrida 7 (catálogo curado por instituto, tecnicatura intermedia, articulación, Mi cuenta/Usuarios/Archivadas y RN05).

**Unitarios (`npm test`): 26/26** en 5 archivos (`unitarios`, `sugerencias`, `rn04`, `registro`, `seguridad`) — incluye RN04, AR-3, registro/roles y **CSRF `checkOrigin` + invalidación por `tokenVersion`**. Golden `--check` sin diferencias (43 JSON). Frontend `tsc -b` + `lint` verdes.

| Área | Qué se verificó | Estado |
| ---- | --------------- | ------ |
| Catálogo | `withCounts` (`careerCount`), filtro `?unit`, `includeArchived` solo ADMIN | ✅ (estructura + unit) |
| Articulación | `continuesIn` valida IDs y rechaza autorreferencia; se muestra "Continúa en …" | ✅ |
| Tecnicatura intermedia | `GET /study-plans/:id/intermediate` (`closed`/`externalRequires`); pestañas Lic/Tec; aviso si está vacía | ✅ |
| Correlativas (RN05) | El backend rechaza avanzar sin correlativas (`400`); el front pre-chequea | ✅ |
| Promedio / CSV | Promedio de aprobadas con nota + export CSV | ✅ |
| Seguridad | `checkOrigin` CSRF; logout invalida JWT; import/creación solo ADMIN | ✅ (unit `seguridad`) |
| Admin | Usuarios (rol/baja) y Archivadas en Catálogo → Carreras (restaurar) | ✅ (estructura) |

> Corridas masivas (`test:planes`/`test:salud`) requieren API + corpus `files/`; su último registro es la corrida 9 (16/10) y **siguen vigentes**: la v2.5 no tocó el parser.

## Corrida 9 (16/10/2026, v2.4: tipo de carrera, intermedio y propuesta IA)

Verificación de la tanda v2.4 (tipo de carrera, marcado en lote + avisos + propuesta IA revisable, caché v3) sobre entorno local sin Redis (Mongo 27017). Para verificar **la app** con los archivos del corpus se sembró el catálogo con `seed:planes` → **OK=29** (universidad + 4 institutos + 29 carreras + 29 planes oficiales publicados; usuario de prueba borrado al final).

**Unitarios (`npm test`): 32/32** en 6 archivos — se suma `tests/intermedio.test.js` (6 casos de la validación pura `pickIntermediateNames`: ACA fuera, mínimo 4, tramo ≤ 3 años, nombres exactos del plan; BUG-017). Golden `--check` **43/43 sin diferencias**. Frontend `tsc -b` + `lint` + `vite build` verdes.

**Masiva (`test:planes`, 43 PDFs): OK=27 + OK-IA=1 + WARN=15 + FAIL=0 + SKIP=0.** El informe agrega las columnas del intermedio: **21 títulos declarados · 14 con materias marcadas (13 IA + 1 parser) · 7 sin marcar por cuota agotada en ese momento** (Gemini 429 + TPM 8000 de Groq compartido con los rescates de correlativas). Los WARN son los esperados de correlativas (sin `correlativasTexto` o sin endpoint de matching; `STRICT_IA=1` los vuelve FAIL para auditoría).

**Salud (`test:salud`): todo OK** — Kinesiología 47/35, Obstetricia 39/33, Enfermería 41/34, Nutrición 52/20 — + controles negativos 400/400.

**E2E v2.4 (18/18):** `careerType` 201 / 400 fuera del enum / persistido; import Electromovilidad (preview 21 → confirm → años [1,2,3]); bulk `year=1` `{matched:5, modified:5}` y desmarcar todo `{matched:21, modified:5}` (**`modified` cuenta solo lo que cambia**); no booleano → 400; `GET /intermediate` 5 materias `closed=true`; Diseño Industrial: `intermediateClassified=true`, 18 marcadas, 109 créditos, segundo preview `cached=true` con el mismo resultado; correlativas de Obstetricia (33 filas); usuario común y ajeno → 403.

> **Cuota IA:** los 7 planes sin marcar quedan como "pendiente de propuesta" — la app avisa y el ADMIN marca (a mano o en lote); con cuota disponible el preview vuelve a clasificar y refresca la caché (**BUG-019**). No se inventan datos en ningún camino.

**Harness (`seed:planes`):** al revisar los planes sembrados se detectó que el seed no propagaba `intermediateTitle`/`creditsIntermediate` al `confirm` (el flujo del frontend sí lo hace): corregido en la misma corrida y completados los 21 planes con título desde la caché de extracción; Diseño Industrial se re-sembró ya con su clasificación (18 materias / 109 créditos). La app local queda con **15 tecnicaturas con materias marcadas** y 6 planes con el **aviso** de "título sin materias" (pendientes de cuota/revisión: Gestión Ambiental, Tecnología de los Alimentos, Ciberseguridad, Gestión del Mantenimiento, Inglés y Letras).

---

## Corrida 10 (16/10/2026, v2.5: panel ADMIN completo y correlativas regularizadas)

Verificación de la tanda v2.5 sobre el **stack Docker** (API :3000, Mongo :27018), sin tocar el parser ni el corpus: golden/masiva/salud de la corrida 9 siguen vigentes. Usuario temporal ADMIN creado por API y promovido por DB; **todo se limpió al final**: la base quedó idéntica al inicio (2 usuarios, 1 universidad, 4 institutos, 63 carreras).

**E2E admin (script temporal, borrado tras la corrida): 14/14** — `POST /academic-units` sin token → `401`; alta de universidad e instituto con `color: "#12ab34"` (`201`); color inválido `"rojo"` → `400`; `PATCH` de color (`#ff8800`) y de nombre → `200` persistidos; carrera creada en ese instituto; `GET /academic-units?withCounts=1` con `color` y `careerCount=1`; `DELETE` instituto con carreras → `409`; editar carrera (`careerType: Tecnicatura` + `academicUnit: null`) y reasignar instituto → `200`; borrados carrera → instituto → universidad → `200`.

**Correlativas (script temporal, base scratch `unahur-tp-scratch-v25`, borrada al final): 5/5** — `saveCorrelativas` graba `requiredStatus: "REGULARIZADA"` por defecto; con la correlativa **regularizada** el avance se habilita (pedido "regularizada me tendría que habilitar la correlativa" ✓); tras forzar `APROBADA`, regularizada **no alcanza** y aprobada sí.

**Unitarios (`npm test`): 32/32.** Frontend `tsc -b` + `eslint` verdes (la tanda sumó `SearchSelect` sin dependencias nuevas y corrigió el `popperConfig` de los menús ⋮).

**BUG-020 (nuevo):** el controlador de institutos llamaba `updatedAcademicUnit`/`getAcademicUnitById` (nombres inexistentes) → editar un instituto respondía `400` siempre; resuelto y cubierto por el E2E (`PATCH` color/rename `200`).

> Pendiente UI: pestañas del panel, toasts, dropzone y colores persistidos quedaron verificados **por API** (y con `tsc`/`lint` verdes); los casos manuales de navegador (20–23, 25–38) siguen sin resultado registrado.

---

## Corrida 11 (20/10/2026, v2.6: inicio limpio, baja reversible, edición de materias y validaciones) — pendiente

Registro anticipado de las dos tandas posteriores a la corrida 10 (CHANGELOG 1.22–1.24):

- **19/10 (1.22/1.23):** Home limpio (sin *Ver materias/Qué puedo cursar/Mi avance*), filas de inscripciones con *Quitar plan*, `DELETE /user-study-plans/:id` **reversible** (`archivedAt` + reactivación conservando progreso) y archivadas integradas a Catálogo → Carreras. Verificado en esa entrega con `npm test` 32/32, `tsc`/`lint`/`build` verdes y E2E Docker de alta → progreso → baja → reinscripción (progreso conservado); **no hay registro de casos del Test-Plan**.
- **20/10 (1.24, Casos 39–42):** edición de materias con `nameOverride` + guardado en lote (filas modificadas, código obligatorio y sin duplicados) y validaciones reutilizables Registro/Mi cuenta (front `userValidation.ts` + backend Joi). **Pendiente de corrida**: no hay resultados registrados aún.

| Caso | Qué verifica | Estado |
| ---- | ------------ | ------ |
| 39 | Quitar plan archiva (`404` si ya no existe); reinscripción reactiva con progreso conservado | 🟡 pendiente de ejecutar |
| 40 | `nameOverride` persiste y prevalece; lote solo con filas modificadas; código duplicado bloquea | 🟡 pendiente de ejecutar |
| 41 | Registro/Mi cuenta validan por campo (2–50, email ≤ 254, contraseña 6–72, nick ≥ 3) y el backend lo replica | 🟡 pendiente de ejecutar |
| 42 | Home sin *Ver materias/Qué puedo cursar/Mi avance*; detalle necesario solo en Mi progreso/grafo | 🟡 pendiente de ejecutar |

---

## Registro histórico

| Corrida | Fecha | Foco | Resultado |
| ------- | ----- | ---- | --------- |
| 5 | 24/09/2026 | Carga masiva | OK=34 + OK-IA=1 + WARN=8 + FAIL=0 + SKIP=0 |
| 6 | 30/09/2026 | Fix A + envelope + RN04 | Idénticos a 5; Obstetricia 23/35, Nutrición 41/48 |
| 7 | 09/10/2026 | Nueva arquitectura (JWT + planes por usuario) | Masiva 27+1+15+0; E2E 12/12 |
| 8 | 14/10/2026 | v2.3 (institutos, tecnicatura, articulación, RN05) | `npm test` 26/26; golden sin diferencias; front verde |
| 9 | 16/10/2026 | v2.4 (tipo de carrera, intermedio, IA revisable) | `npm test` 32/32; golden 43/43; masiva 27+1+15+0; salud OK; E2E v2.4 18/18 |
| 10 | 16/10/2026 | v2.5 (panel admin completo, correlativas regularizadas) | `npm test` 32/32; E2E admin 14/14; correlativas scratch 5/5; front `tsc`+`lint` verdes |
