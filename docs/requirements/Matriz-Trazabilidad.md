# Matriz de Trazabilidad — Requerimientos ↔ Verificación

**Proyecto:** Gradify — Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico

---

## Ficha técnica del documento

| Campo | Detalle |
| --------------------- | -------------------------------------------------------------------- |
| Institución           | Universidad Nacional de Hurlingham (UNAHUR)                          |
| Unidad Académica      | Facultad de Informática — Proyecto Integrador Programación           |
| Tipo de documento     | Matriz de trazabilidad — cruce BRD / FRD ↔ verificación existente    |
| Versión               | 2.0                                                                  |
| Fecha                 | 16 de noviembre de 2026                                              |
| Documentos de origen  | `BRD.md` v2.9 · `FRD.md` v3.1 · `Test-Plan.md` v3.1 · `Test-Cases.md` v3.0 |
| Sponsor Operación     | Secretaría Académica / Dirección de Carrera                          |
| Sponsor Organización  | UNAHUR                                                               |
| Integrantes           | Perugini, Pablo; Masgo Sandoval, Joaquín; Remonda, Eliel; Cotera, Dylan |
| Tutor                 | Prof. Alejandra Pinto                                                |
| Release               | Diciembre 2026                                                       |

---

## 1. Objetivo

Cruzar **cada requerimiento documentado** (BRD y FRD) con la **verificación que realmente
existe** en el repositorio, respondiendo tres preguntas:

1. ¿Qué requisito está **verificado** y con qué evidencia?
2. ¿Qué requisito está **definido pero sin ejecutar**?
3. ¿Qué requisito **no tiene ningún caso de prueba** o directamente no está implementado?

> [!IMPORTANT]
> Esta matriz no sustituye al [Plan de Pruebas](./Test-Plan.md) ni al
> [Documento de Seguimiento](./Test-Cases.md): los **usa como fuente** y agrega la columna de
> trazabilidad entre requisito y verificación. Cuando un hallazgo de esta matriz contradiga a
> otro documento, prima lo que esté verificado contra el código.

---

## 2. Leyenda de estados

| Estado | Significado |
| ------ | ----------- |
| ✅ | **Verificado y ejecutado**, con evidencia guardada en el repo. |
| 🟡 | Caso de prueba **definido** en Test-Plan, **pendiente** de ejecutar o de registrar resultado. |
| ⚠️ | Verificación **indirecta o parcial**: se cubre parte del requisito, no todo. |
| ❌ | **Sin caso de prueba definido.** |
| ⛔ | Requerimiento **no implementado** (pendiente de alcance) → no verificable. |

### Herramientas citadas

| Herramienta | Comando / ubicación | Qué cubre |
| ----------- | ------------------- | --------- |
| **Carga masiva** | `npm run test:planes` → `validaciones.js masiva` (motor `carga-masiva.test.js`) | Parseo de los **29 PDFs de plan** contra rangos esperados, título intermedio y fallback de IA; las 17 correlativas quedan `SKIP`. |
| **Correlatividades E2E** | `npm run test:correlativas` → `validaciones.js correlativas` (motor `verificar-correlativas.test.js`) | Importa el plan par, llama a `POST /study-plans/:id/parse-correlativas`, valida el matching y limpia el plan creado. |
| **Control de salud** | `npm run test:salud` → `validaciones.js salud` (motor `verificar-salud.test.js`) | Matching de correlativas, aristas, detección de ciclos, materias disponibles y control negativo. |
| **Cobertura de corpus** | `npm run test:cobertura` → `validaciones.js cobertura` (motor `check-cobertura.js`) | Los 56 PDFs están en la referencia (46, con golden) o excluidos con motivo (10) en `docs/testing/pdf-sin-referencia.json`; falla si aparece uno sin clasificar. |
| **Golden snapshot** | `npm run snapshot:planes` → `validaciones.js golden` (motor `golden-snapshot.js`) | Regresión del parser: `diff = 0` sobre los **46 JSON** (29 planes + 17 correlativas). |
| **Todo en uno** | `npm run validar` → `validaciones.js todo` | Cobertura, golden `--check`, salud, masiva y correlativas, con guard de corpus previo. |
| **Unitarios** | `npm test` → `node --test` (0 dependencias, 9 archivos) · `npm run test:jest` (24 tests) | `bestDbMatch`, whitelist/anti-ciclos/BUG-009, RN04, AR-3, registro/roles, CSRF `checkOrigin` + `tokenVersion`, intermedio (`pickIntermediateNames`, BUG-017), estrategia de extracción, nombres por plan y reglas de progreso (**45 tests**). |
| **Verificación estática** | `node --check` sobre `backend/src` | Sintaxis del backend. |
| **Frontend** | `npm run lint` · `npx tsc -b` · `npm run build` · `test:faq/status/graph/layout/subjects/color/theme` | Lint, tipos, build y suites unitarias. |
| **HTTP manual** | Postman / `pruebas.http` | Casos 1–19 del Test-Plan. |
| **Interfaz manual** | Navegador + DevTools | Casos 20–48 del Test-Plan. |
| **Seguimiento** | `docs/requirements/Test-Cases.md` | Registro BUG-001 … BUG-021 y resultados de corrida (corridas 5–12 documentadas). |

### Artefactos de evidencia

| Artefacto | Ubicación | Contenido |
| --------- | --------- | --------- |
| Informes de carga | `backend/scripts/informes/` (ignorados por git) | Corridas de `test:planes`, `test:correlativas` y `test:salud`; en la última corrida: masiva 28+1+0+0+17 y correlativas 11+6+0+0. |
| Baseline golden | `docs/testing/golden/` (46 JSON) | Salida esperada del parser por PDF: 29 planes + 17 correlativas. |
| Referencia de rangos | `docs/testing/planes-referencia.json` (46 entradas) | Rangos esperados por tipo, `hasIntermediate`, `pairCorrelativas`. |
| Corpus de PDFs | `docs/files/UNAHUR-Oferta-Academica/` o `files/UNAHUR-Oferta-Academica/` (**fuera del repo**, 56 PDF) | 46 de referencia + 10 excluidos con motivo; insumo de los scripts masivos (referencia, golden, salud y cobertura resuelven por nombre de archivo, §11.9). |

> [!WARNING]
> **El corpus de PDFs vive fuera del repositorio** (`docs/files/…` o `files/…`, ver
> `requireCorpus()` en `scripts/lib/`). En un clon limpio los scripts masivos **salen con
> mensaje claro (código 2)** en vez de fallar críptico; quedan como evidencia los informes
> y los 46 golden. Guardia cerrada el 30/09 (Fase 2.2). Ver §11.6.

---

## 3. Matriz — Reglas de negocio (BRD §3.1 · FRD §3.1)

### 3.1 Reglas del grafo y progreso académico (RN01–RN04)

| ID | Regla | Verificación que lo cubre | Herramienta | Estado |
| -- | ----- | ------------------------- | ----------- | ------ |
| RN01 | Estado inicial: materia **bloqueada** sin requisitos previos | `test:salud` verifica la regla de control *"aristas > 0 y disponibles < total"* (Test-Cases:109); Caso 11 (`availableNow` en `GET /:id/graph`); Caso 21 (colores en la UI) | `test:salud` ✅ indirecto · Casos 11 y 21 🟡 | ⚠️ |
| RN02 | Habilitación automática de materias sucesivas al marcar *Aprobada/Regular* | `test:salud` recalcula disponibles desde el historial; Caso 10 (desbloqueo); Caso 21 (hijos desbloqueados en pantalla) | `test:salud` ⚠️ · Casos 10 y 21 🟡 | ⚠️ |
| RN03 | Persistencia del cambio asociado a la inscripción del usuario | Caso 9 (`401` sin header) y Caso 10 (guardado); **ninguna verificación automatizada** de persistencia | Postman | 🟡 |
| RN04 | Una materia aprobada conserva su efecto sobre correlativas directas aunque un requisito anterior pierda estado | `tests/rn04.test.js` (3 tests: habilitación, M1 Libre/M2 aprobada/M3 disponible, estados intactos) + `graph.service.js` | `npm test` ✅ | ✅ |
| RN05 | Bloqueo del avance por correlativas: no se puede cursar/regularizar/aprobar sin correlativas cumplidas | `subjectProgressService.js` valida cada `prerequisite` (`400` con el detalle); pre-chequeo en Mi progreso; Caso 27 | API + front | ✅ (backend) · 🟡 (caso UI) |

### 3.2 Reglas de sugerencia de inscripción (R0–R6, C1–C6)

| ID | Regla | Estado de implementación | Estado de verificación |
| -- | ----- | ------------------------ | ---------------------- |
| R0–R6 / Msj0–Msj6 | Mensajes de encabezado, correlativas, límite, comunes, finales, orientación, cierre | ✅ Implementado (`GET /study-plans/:id/sugerencias` + `buildSugerencias` + sección en Mi progreso) | ✅ |
| C1–C4 (MATERIAS A) · C1–C6 (MATERIAS B) | Cómputo de conjuntos y fusión de condiciones | ✅ `tests/sugerencias.test.js` (4 tests: clases, fusión C5, orden B, ritmo x+1, comunes) | ✅ |
| ORDEN DE ESTADÍSTICAS | Mostrar MATERIAS B en orden decreciente | ✅ `materiasB` ordenado + test | ✅ |

> **3 grupos, todos ✅.** Implementados con la limitación honesta de que C4/C5/C6 no son
> observables en el modelo de progreso (rigen fusiones FRD). CS-03/04/05 pasan a ⚠️
> (backend verificado + smoke E2E; caso manual de UI pendiente).

---

## 4. Matriz — Historias de usuario (FRD §4.1)

| ID | Historia | Verificación que lo cubre | Herramienta | Estado |
| -- | -------- | ------------------------- | ----------- | ------ |
| AR-1 | Visualizar progreso académico en un grafo | Caso 11 (estructura del grafo: `nodes`, `edges`, `stats`); Caso 10 (estados); Caso 21 (colores) | Postman / navegador | 🟡 |
| AR-2 | Importar el plan en PDF y editar correlativas | **`test:planes` + `test:correlativas`** ejecutan el flujo sobre **46 documentos** (29 planes y 17 pares de correlatividades; Test-Cases, corrida 12); `saveCorrelativas` blindado y verificado (BUG-009) | `test:planes` + `test:correlativas` ✅ · Casos 3–8 🟡 | ✅ parcial |
| AR-3 | Recibir sugerencias automáticas de inscripción | `GET /study-plans/:id/sugerencias` (E2E 200) + sección en Mi progreso + 4 unitarios | `npm test` ✅ · smoke ✅ · caso UI 🟡 | ✅ parcial |
| US-02 | Grafo interactivo con colores por estado + banner de título intermedio | Caso 12 (`graph.intermediate`, banner) y Caso 21 (colores); `test:planes` valida `hasIntermediate` (`carga-masiva.test.js:235`) | `test:planes` ✅ parcial · Casos 12 y 21 🟡 | ⚠️ |
| US-03 | Clic en materia disponible cambia estado y desbloquea sucesoras | Caso 21 | navegador | 🟡 |
| US-04 | Explorar el catálogo por instituto y carrera | `withCounts` + `?unit` (estructura) + Home (Caso 24); búsqueda de carreras | Postman / navegador | 🟡 |
| US-05 | Título Intermedio con pestañas Licenciatura/Título Intermedio y aviso si está vacío | `GET /study-plans/:id/intermediate` (`closed`/`externalRequires`); **E2E v2.4**: sub-plan devuelve las materias marcadas y `closed`; avisos en Cargar plan/Editar plan cuando hay título sin materias (BUG-016); Caso 26 | E2E ✅ API · Caso 26 🟡 | ⚠️ |
| US-06 | Admin marca el Título Intermedio y articulación | **E2E v2.4**: `PATCH /study-plans/:id/subjects/intermediate` por año/todo (`matched`/`modified`), `400` con valor no booleano, `403/404` para ajenos; `PATCH /careers/:id` valida `continuesIn` (autorreferencia 400); UI `AdminCatalog`; Caso 25 | E2E ✅ API · Caso 25 🟡 | ⚠️ |
| US-07 | Promedio con notas | Cálculo en `MyProgress` (`average`); Caso 28 | navegador | 🟡 |
| US-08 | Admin gestiona usuarios y carreras archivadas | `GET/PATCH/DELETE /users` (ADMIN) + `includeArchived`; Catálogo → Carreras “Ver archivadas”; Caso 30; unit `seguridad` (roles) | `npm test` ✅ parcial · Caso 30 🟡 | ⚠️ |
| US-09 | Editar mi cuenta y cerrar sesión | `PATCH /users/:nickName` + `POST /users/logout` (invalida JWT); validaciones reutilizables compartidas con Registro (`userValidation.ts` + Joi); Caso 29; unit `seguridad` (`tokenVersion`) | `npm test` ✅ · Caso 29 🟡 | ⚠️ |
| US-10 | Identificar el tipo de carrera (licenciatura/tecnicatura/profesorado/ingeniería) | **E2E v2.4**: `POST /careers` con `careerType` (`201` + persistido en `GET /careers`), valor fuera del enum `400`, `careerType: null` lo limpia; chip 🎓 Tecnicatura en el Home (Caso 31) | E2E ✅ API · Caso 31 🟡 | ⚠️ |
| US-11 | Admin administra el catálogo completo (institutos con color, carreras, articulación) | **E2E v2.5 (14/14)**: `401` sin token; alta con `color` (hex validado; `400` inválido); `PATCH` nombre/color persistido; `withCounts` con `careerCount`; `409` al borrar instituto con carreras; editar/reasignar carrera (`academicUnit: null` y reasignar); borrados en orden carrera → instituto → universidad; UI en pestañas (Casos 25/30/36/37) | E2E ✅ API · UI 🟡 | ⚠️ |
| US-12 | Baja reversible: quitar plan sin perder progreso y reactivar al reinscribirse | `DELETE /user-study-plans/:id` archiva con `SubjectProgress` (`archivedAt`) y sin progreso borra; reinscripción reactiva (`addUserStudyPlan`); UI muestra *Quitar plan* solo en planes inscriptos (E2E de la corriente: pendiente) | Caso 39 | 🟡 |
| US-13 | Editar materias del plan: nombre visible por plan (`nameOverride`) y guardado en lote | `nameOverride` en modelo/servicio/front (`subjectName` prioriza el override); `saveSubjects` en lote (solo filas modificadas resaltadas, código obligatorio y sin duplicados); Caso 40 | Caso 40 | 🟡 |
| US-14 | Consultar ayuda FAQ sin depender de IA ni servicios externos | Datos `FAQS`; los chips reemplazan la respuesta activa y `faqSearch` ordena coincidencias, con secundarias plegadas. `npm run test:faq` (6/6); Caso 46: humo manual en navegador con sesión simulada, sin E2E contra backend ni dispositivo físico | Unitario + navegador (parcial) | ⚠️ |
| US-15 | Registrar actividades ACA y avanzar hacia los requisitos de créditos de ambos títulos | API `/user-study-plans/:id/aca-activities`; cálculo de 4 CRE por categoría para Título Intermedio, 10 por categoría para grado y 75 horas de interacción pedagógica; Caso 48 definido, pendiente de ejecución | Caso 48 | 🟡 |
| US-16 | Marcar materias como Libre sin invalidar avances dependientes ya registrados | `LIBRE` en progreso; nuevos avances siguen sujetos a correlativas; Caso 47 definido, pendiente de ejecución | Caso 47 | 🟡 |

## 5. Matriz — Criterios de bondad (FRD §4.2)

| # | Criterio | Verificación | Estado |
| - | -------- | ------------ | ------ |
| 1 | **MATERIAS BLOQUEADAS** — inhabilitadas sin correlativas cumplidas | Caso 11 + control de `test:salud` (Test-Cases:109) | ⚠️ |
| 2 | **MATERIAS DISPONIBLES** — habilitadas en el estado actual | `test:salud` con control negativo *"sin correlativas no hay bloqueo: 52/52 disponibles"* (Test-Cases:109) | ⚠️ |
| 3 | **GESTIÓN DE ESTADOS Y DINÁMICA DEL GRAFO** — desbloqueo en tiempo real | Caso 21 (UI) y Caso 10 (recálculo) | 🟡 |
| 4 | **MATERIAS A ⇒ MATERIAS B** (C1–C6) | Implementado + unitarios (`sugerencias.test.js`) | ✅ |
| 5 | **ORDEN DE ESTADÍSTICAS** decreciente | Implementado + unitario de orden | ✅ |
| 6 | **FUSIÓN DE CONDICIONES** (C1+C2 → C5) | Implementada + unitario de fusión C5 | ✅ |
| 7 | **CORRELATIVIDADES** — matching exacto/compacto/difuso/prefijo con `confidence` | **`test:correlativas`** (17 pares: 11 OK / 6 WARN; Biotecnología 41/41, Enfermería 39/39, Informática 45/45) y **`test:salud`**; Caso 8 manual 🟡 | ✅ |
| 8 | **TÍTULO INTERMEDIO** — `intermediateTitle`, `subject.intermediate`, banner de materias aprobadas sin créditos curriculares | `test:planes` valida `hasIntermediate` de la referencia (`carga-masiva.test.js:235`); **marcado en lote** `PATCH /subjects/intermediate` + aviso si está vacío (BUG-016) y **propuesta IA validada** con regresión unitaria (BUG-017); Casos 3 y 12 🟡 | ⚠️ |
| 9 | **MANEJO DE ERRORES** — JSON en español, `400/404/409/500`, UI sin romperse | Casos 17, 18, 19 (HTTP) y Caso 22 (`ErrorBoundary`) | 🟡 |
| 10 | **CORRELATIVAS BLOQUEANTES (RN05)** — no se avanza sin correlativas cumplidas | `subjectProgressService` (`400` con detalle) + pre-chequeo en Mi progreso; Caso 27 | ✅ backend · 🟡 UI |
| 11 | **TÍTULO INTERMEDIO** — sub-plan virtual con pestañas Licenciatura/Título Intermedio y aviso si está vacío | `GET /study-plans/:id/intermediate` + Caso 26 | ⚠️ |
| 12 | **ARTICULACIÓN** — `continuesIn` entre carreras | `PATCH /careers/:id` (valida IDs y autorreferencia) + Caso 25 | 🟡 |
| 13 | **PROMEDIO** | Cálculo en `MyProgress` + Caso 28 | 🟡 |
| 14 | **TIPO DE CARRERA** — `careerType` con chip 🎓 Tecnicatura | **E2E v2.4**: alta/listado con enum validado (`400` fuera del enum); modelos + Swagger; Caso 31 🟡 | ⚠️ |
| 15 | **MARCADO EN LOTE Y PROPUESTA IA DEL INTERMEDIO** — sin marcas silenciosas | **E2E v2.4** + `tests/intermedio.test.js` (6 tests): ACA fuera, mínimo 4, tramo ≤ 3 años; avisos en UI; descarte de propuestas inservibles | ⚠️ |
| 16 | **CORRELATIVAS REGULARIZADAS POR DEFECTO** — lo importado se avanza con regularizada | Verificación 5/5 en base scratch: `saveCorrelativas` graba `REGULARIZADA`; regularizada habilita cursar; exigir `APROBADA` bloquea; aprobada habilita (Caso 38) | ✅ |
| 17 | **CRÉDITOS ACA** — 10 CRE por categoría, 4 para Título Intermedio, 10 para grado y 75 horas pedagógicas | Utilidad de cálculo y endpoints `/user-study-plans/:id/aca-activities`; Caso 48 definido, pendiente de ejecución integral | 🟡 |
| 18 | **ESTADO LIBRE** — conserva el progreso dependiente existente, pero restringe nuevos avances | Reglas de progreso y prueba unitaria; Caso 47 definido, pendiente de ejecución integral | 🟡 |

## 6. Matriz — Requisitos de seguridad (FRD §4.3)

| # | Requisito | Verificación | Estado |
| - | --------- | ------------ | ------ |
| SEG-1 | **Con autenticación:** cuentas JWT con roles; catálogo público, mutaciones ADMIN, planes por dueño | E2E 12 pasos + `validar` | ✅ |
| SEG-2 | **JWT:** `401` sin token; `403`/`404` sin permiso (dueño o ADMIN) | E2E 12 pasos | ✅ |
| SEG-3 | **Subida de archivos:** solo PDF de hasta 10 MB, en memoria, con cota IA (`aiRateLimit`) | Controles negativos 400/400 + `test:salud` | ✅ |
| SEG-4 | **Errores:** JSON en español `400/401/404/409/500`, UI sin romperse | E2E + envelope middleware | ✅ |
| SEG-5 | **Datos personales:** `User` con hash `bcrypt`, `password` nunca expuesto en JSON | `toJSON` + E2E | ✅ |
| SEG-6 | **CSRF / sesión:** `checkOrigin` en mutaciones con cookie; logout invalida el JWT (`tokenVersion`) | `tests/seguridad.test.js` (checkOrigin + signToken) | ✅ |

---

## 7. Matriz — Pantallas (BRD §5 · FRD §5)

| Pantalla | Ruta | Verificación | Estado |
| -------- | ---- | ------------ | ------ |
| SC001 Inicio | `/` | Caso 20 (navegación) + Caso 24 (catálogo) + Caso 39 (quitar plan / reactivación) | 🟡 |
| SC002 Grafo | `/grafo/:id` | Casos 12 (Título Intermedio), 21 (estados), 23 (accesibilidad), 26 (pestañas Licenciatura/Título Intermedio), 47 (Libre) | 🟡 |
| SC003 Tablero | `/tablero/:id` | Caso 20 + Caso 26 (pestañas Licenciatura/Título Intermedio) | 🟡 |
| SC004 Mi progreso | `/progreso` | Casos 9, 10 (progreso), 23 (`aria-label`), 27 (RN05), 28 (promedio), 47 (Libre), 48 (ACA) | 🟡 |
| SC005 Cargar plan | `/cargar` | Casos 3–7 (carga) + **`test:planes`** en backend ✅; flujo de UI: Caso 20 | ⚠️ |
| SC006 Admin | `/admin/:id` | Casos 14 (alta/duplicados), 15 (publicar), 16 (editar/borrar), 25 (continuesIn), 26 (tecnicatura), 40 (edición de materias en lote) | 🟡 |
| SC007 Mi cuenta | `/cuenta` | Caso 29 (perfil/contraseña/logout) | 🟡 |
| SC008 Usuarios | `/admin/users` | Caso 30 (ADMIN: roles/baja) | 🟡 |
| SC009 Archivadas | Catálogo → Carreras (“Ver archivadas”) | Caso 30 (ADMIN: restaurar) | 🟡 |
| SC010 403/404 | `/403`, `*` | Caso 20 (wildcard 404, acceso denegado) | 🟡 |

**Total de pantallas verificadas end-to-end: 0 de 10.** La verificación automatizada llega
hasta la API; la capa de interfaz (Casos 20–23, 25–30) no tiene resultado registrado.

---

## 8. Matriz — Casos de estudio (BRD §3.2 · FRD §3.2)

| Caso | Descripción | Verificación | Estado |
| ---- | ----------- | ------------ | ------ |
| CS-01 | Estudiante de ingreso reciente | Casos 11 y 21 (bloqueo inicial + habilitación al aprobar) | 🟡 |
| CS-02 | Recorrido avanzado, camino crítico | Caso 11 (`criticalPath`, `topologicalOrder`); Caso 21 (badge crítico) | 🟡 |
| CS-03 | Alumno 1 — sugerencias | Reglas implementadas + smoke; caso manual UI pendiente | ⚠️ |
| CS-04 | Alumno 2 — sugerencias | Reglas implementadas + smoke; caso manual UI pendiente | ⚠️ |
| CS-05 | Alumno 3 — sugerencias | Reglas implementadas + smoke; caso manual UI pendiente | ⚠️ |
| CS-06 | Alumno explora catálogo por instituto | Caso 24 (Home Institutos→Carreras→Planes) | 🟡 |
| CS-07 | Alumno ve el Título Intermedio y articulación | Caso 26 (pestañas Licenciatura/Título Intermedio) + Caso 25 (Continúa en…) | 🟡 |

---

## 9. Trazabilidad de bugs (Test-Cases §Registro)

| Bug | Descripción corta | Estado | Qué lo verificó | Automatizado |
| --- | ----------------- | ------ | --------------- | ------------ |
| BUG-001 | Fila de totales importada como materia | Resuelto | `test:planes` + golden (`TAB_TOTAL_RE`) | ✅ |
| BUG-002 | Dialecto `Asignatura\|Campo\|Carga` → 0 materias | Resuelto | `test:planes` (23 detectadas) + **golden detectó la regresión de 6 planes sanos** | ✅ |
| BUG-003 | Dialecto con número pegado → 0 materias | Mitigado | `test:planes` → estado `OK-IA` (20 materias vía IA) | ✅ |
| BUG-004 | Correlativas 2 columnas sin números → 0/0 | Resuelto | Layout resuelto: `test:correlativas` → **32/38 determinístico**; IA lectora cubre el resto | ✅ |
| BUG-005 | Matching bajo con nombres envueltos | Mitigado | **Fix A 30/09** (triple gate: cierre `-` + nombre completo + banda): Obstetricia **23/35** y Nutrición **41/48** solo determinístico (`test:correlativas`, corrida 12) | ✅ |
| BUG-006 | 8 materias sin año (Ciberseguridad) | Resuelto | `test:planes` → 0 sin año + golden `diff = 0` | ✅ |
| BUG-007 | Typo en `pairCorrelativas` → SKIP | Resuelto | `test:correlativas` → Mantenimiento 27/31 | ✅ |
| BUG-008 | Groq 413 / Gemini 503-429 | Mitigado | Observado en corrida; **sin test automatizado** (depende de cuota externa) | ❌ |
| BUG-009 | `saveCorrelativas` persistía cualquier `requires` (ciclos, autorreferencias) | Resuelto | Regresión automática `npm test` (whitelist + anti-ciclos) | ✅ |
| BUG-010 | Scripts hablaban API pre-merge (`POST /careers` sin auth) → 401/FAIL | Resuelto 09/10 | Scripts reescritos a `preview`+JWT; matcher portado a `correlativas.service` | ✅ |
| BUG-011 | `confirm` guardaba 0 `prerequisites` (grafo sin aristas) | Resuelto 09/10 | Resolución en el confirm (exact+compact, anti-ciclos 400) | ✅ |
| BUG-012 | `DELETE` materia referenciada devolvía 500; plan imborrable por API | Resuelto 09/10 | 409 con mensaje real; borrado en cascada propia del plan | ✅ |
| BUG-013 | `rateLimitAi` sin cablear + 10 tests jest huérfanos | Resuelto 09/10 | `aiRateLimit` en `preview`; tests stale eliminados | ✅ |
| BUG-014 | Tecnicatura sin materias repetía la Licenciatura | Resuelto 14/10 | Subgrafo acotado + aviso en Grafo/Tablero/Progreso/Home | ✅ |
| BUG-015 | Validaciones duplicadas e índices únicos faltantes | Resuelto 14/10 | Índices únicos + validación en una capa + `visibleTo` | ✅ |
| BUG-016 | Tecnicatura intermedia vacía en silencio en 12 PDFs (sin aviso ni marcado masivo) | Resuelto 16/10 | Avisos en preview/PlanAdmin + `PATCH /subjects/intermediate` + propuesta IA; `test:planes` y E2E v2.4 | ✅ |
| BUG-017 | Propuesta IA del intermedio sin validación dura (ACA, tramos incoherentes) | Resuelto 16/10 | `pickIntermediateNames` + `tests/intermedio.test.js` (6 tests) + columna *Tec* en el preview | ✅ |
| BUG-018 | Extractos cacheados v2 no refrescaban la clasificación del intermedio | Resuelto 16/10 | `PARSER_VERSION` v3 (`fileHash + parserVersion`); E2E: segundo preview `cached:true` con el mismo resultado | ✅ |
| BUG-019 | Fallo transitorio de IA (429) congelado en la extracción cacheada: el preview reutilizado ya no reintentaba la clasificación del intermedio | Resuelto 16/10 | Camino `REUSE` reintenta (`tryClassifyIntermediate`) + `refreshPdfExtraction`; E2E: Diseño 0 → 18 marcadas sobre la caché | ✅ |
| BUG-020 | Typos históricos del controlador de institutos (`updatedAcademicUnit`/`getAcademicUnitById`, inexistentes en el servicio) → editar un instituto respondía `400` siempre | Resuelto 16/10 | E2E v2.5: `PATCH` color/rename `200` + `withCounts` coherente (Caso 36) | ✅ |
| BUG-021 | `PlanSubject.nameOverride` no se mostraba en las vistas de consulta aunque se persistía | Resuelto (06/11) | Pruebas unitarias frontend/backend; pendiente la verificación manual de los flujos completos | ✅ (unit) |

**Cobertura de regresión de bugs: 20/21 automatizados.** Falta BUG-008 (cuota externa, aceptado).

---

## 10. Estado global de cobertura

| Dimensión | Total | ✅ | 🟡 | ⚠️ | ❌ | ⛔ |
| --------- | ----- | -- | -- | -- | -- | -- |
| Reglas de negocio (RN01–RN05) | 5 | 2 | 1 | 2 | 0 | 0 |
| Reglas de sugerencia (R0–R6, C1–C6, orden) | 3 | 3 | 0 | 0 | 0 | 0 |
| Historias de usuario (AR/US) | 18 | 2 | 8 | 8 | 0 | 0 |
| Criterios de bondad | 18 | 5 | 7 | 6 | 0 | 0 |
| Requisitos de seguridad | 6 | 6 | 0 | 0 | 0 | 0 |
| Pantallas (SC) | 10 | 0 | 9 | 1 | 0 | 0 |
| Casos de estudio (CS) | 7 | 0 | 4 | 3 | 0 | 0 |
| **TOTAL** | **67** | **18** | **29** | **20** | **0** | **0** |

> De 67 puntos: **18 verificados**, **29 definidos pero sin ejecutar** (casi todos, casos
> manuales HTTP/UI), **20 parciales** y **0 pendientes**: no quedan requisitos sin
> implementar ni sin caso. **Ninguna pantalla está verificada end-to-end** (Casos 20–48).

---

## 11. Brechas de cobertura

### 11.1 Casos HTTP con corrida formal (cerrada 09/10)
Corrida completa 09/10: E2E 12/12 con JWT (register->login->me->careers->preview->confirm->subjects->graph->sugerencias->enroll->progress->cascada->delete) registrado en Test-Cases (Corrida 7).




### 11.2 Tests unitarios ✅ (actualizada 16/11/2026)
`npm test` (node:test, 0 dependencias): **45 tests en 9 archivos** (`bestDbMatch`,
whitelist/anti-ciclos/BUG-009, RN04, AR-3, registro/roles, CSRF, intermedio, estrategia
de extracción, nombres por plan y reglas de progreso). Jest suma **24/24**. El matching,
los ciclos y las reglas tienen casos aislados además de la verificación masiva/E2E.

### 11.3 RN04 ✅ (actualizada 15/11/2026)
`tests/rn04.test.js` (3 tests): los estados guardados se conservan y una materia
aprobada sigue habilitando sus correlativas directas, aunque un requisito anterior
pase a Libre. La disponibilidad se calcula por requisito directo.

### 11.4 La capa de interfaz no tiene resultados 🟠
Casos 20–23 (navegación, estados en grafo, `ErrorBoundary`, accesibilidad) y 24–48 (flujos v2.3–v3.0:
catálogo, articulación, tecnicatura, RN05, promedio, cuenta, admin, avisos, marcado en lote, IA,
tipo de carrera, caché, institutos con color, edición/archivado/borrado de carreras, correlativas
regularizadas, baja reversible, `nameOverride`, validaciones, FAQ, estado Libre y créditos ACA)
definidos en `Test-Plan.md` sin resultados de interfaz registrados; los flujos nuevos quedaron
verificados **por API** (E2E v2.4, 18 chequeos; E2E v2.5, 14 de administración + 5 de correlativas
en base scratch; corrida 12, 17 pares de correlatividades) y los manuales siguen pendientes.

### 11.5 Un bug sin regresión automatizada 🟢
Solo queda BUG-008 (cuota externa, aceptado). BUG-009 tiene regresión en `npm test`.

### 11.6 El corpus de PDFs está fuera del repositorio 🟡
`docs/files/UNAHUR-Oferta-Academica/` (o `files/UNAHUR-Oferta-Academica/`; **56 PDFs: 46 de
referencia + 10 excluidos con motivo**) no se commitea. En un clon limpio los scripts salen
con mensaje claro (código 2) gracias a `requireCorpus()` (Fase 2.2, `scripts/lib/` +
`validaciones.js todo`). Quedan como evidencia los informes y los 46 golden. Pendiente de
equipo: decidir el destino definitivo del corpus (§4 fila 6 del plan maestro).

### 11.7 Cifra de referencia 29 → 46 PDFs ✅ (actualizada 16/11/2026)
La referencia pasó de 29 planes a **46 PDFs de referencia** (29 planes + 17 correlativas) y **10 excluidos con motivo** (56 archivos totales); `Test-Plan.md` y `Test-Cases.md` quedaron alineados. La cifra histórica de 43 (30/09) correspondía a la referencia previa a separar las correlatividades.

### 11.8 Herramientas documentadas ✅ (actualizada 16/11/2026)
`README.md` (sección Validar y testear) + `Test-Plan.md` describen `test:planes`,
`test:correlativas`, `test:cobertura`, `test:salud`, `snapshot:planes`, `npm test`,
`test:jest` y `npm run validar`.

### 11.9 Rutas del corpus y harness E2E alineados 🟢 (cerrada 16/10)
El corpus se reordenó en subcarpetas por carrera y la referencia (`planes-referencia.json`), el
golden y `test:salud` apuntaban al layout viejo (44 “archivo no encontrado”; salud abortaba). Se
re-apuntaron **por nombre de archivo**: `planes-referencia.json` (46 entradas) y
`verificar-salud.test.js` (helper `findInPlanes` como respaldo). Además, `validar` corre con el
usuario de prueba **promovido a ADMIN por DB** (`preview`/`confirm` lo exigen desde v2.3) y `salud`
captura los timeouts por carrera en lugar de abortar (planes grandes con rescate IA: 300 s).
Golden **46/46** sin diferencias; salud OK con controles negativos 400/400; el par de Nutrición
se valida en `test:correlativas` porque el preview genérico de salud responde 422.

---

## 12. Inconsistencias documentales (todas cerradas el 30/09)

### 12.1 RN03 (actualizada 09/10: progreso por inscripcion con JWT)
FRD/BRD v2.2: RN03 con cuenta JWT e inscripcion al plan (era x-user-id anonimo).

### 12.2 4.3 Seguridad (actualizada 09/10: JWT con roles)
FRD:298/302 ahora dicen que el módulo `/users` existe sin UI consumidora (acuerdo
de equipo: no se borra, solo se documenta) + Swagger lo marca como legado.

### 12.3 Swagger v2.0 (09/10: ~30 paths de la arquitectura real)
`swagger.yaml` pasó de 9 a 16 paths (incl. `parse-correlativas`, `correlativas`,
`PATCH/DELETE /careers/{id}`, `sugerencias`, `/users/*` legado, `/` raíz).

**Estado actual (16/11/2026):** `backend/docs/swagger.yaml` declara OpenAPI 3.0.3 y versión **2.1.0**; el endpoint dedicado `POST /study-plans/:id/parse-correlativas` existe en las rutas y se usa en `test:correlativas`, pero **no figura en Swagger** (junto con `POST /study-plans/:id/correlativas`).

### 12.4 Fila BUG-009 ✅
Repegada a la tabla (sin líneas en blanco intermedias).

---

## 13. Recomendaciones priorizadas

| # | Recomendación | Estado | Prioridad |
| - | ------------- | ------ | --------- |
| 1 | **Ejecutar los casos HTTP 1–19** y registrar en Test-Cases | 🟠 smoke ejecutado (404/401/200 + sugerencias); falta registro caso por caso | 🟡 medio |
| 2 | **Regresión `saveCorrelativas`** (ciclo, inexistente, autorreferencia) | ✅ en `npm test` | 🟢 bajo |
| 3 | **FRD RN05** (correlativas bloquean el avance) | ✅ en `subjectProgressService` + unit `seguridad` | listo |
| 4 | **FRD SEG-6** (CSRF/sesión) | ✅ en `tests/seguridad.test.js` | 🟢 bajo |
| 5 | **Caso RN04** | ✅ `tests/rn04.test.js` (M1 Libre, M2 aprobada y M3 disponible) | 🟢 bajo |
| 6 | **Unitarios** (matching + ciclos + AR-3 + registro/roles + seguridad + intermedio + extracción + nombres + progreso) | ✅ `npm test`, **45 tests en 9 archivos**, 0 deps; Jest **24/24** | 🟢 bajo (era medio) |
| 7 | **Casos 20–48 de interfaz** | ⬜ pendiente (0/10 pantallas E2E); los flujos nuevos (bulk/IA/tipo de carrera/FAQ/Libre/ACA) quedaron verificados por API o unitarios | 🟡 medio |
| 8 | **Corrida integral del corpus (v3.1)** | ✅ corrida 12 (16/11): cobertura 56=46+10; golden 46/46; masiva 28+1+0+0+17; correlativas 11+6+0+0; informes en `backend/scripts/informes/` | 🟢 bajo |

> Los ítems 2–6 son **solo de documentación/unitarios** y pueden resolverse en la misma
> corrida de edición de `docs/requirements`.

---

## 14. Historial de Cambios

| Versión | Fecha | Autor | Descripción |
| ------- | ----- | ----- | ----------- |
| 1.0 | 28/09/2026 | Equipo | Primera matriz de trazabilidad: 37 puntos cruzados (BRD/FRD ↔ verificación), 11 brechas y 4 inconsistencias documentales detectadas. |
| 1.1 | 30/09/2026 | Equipo + agente | Cierre: AR-3 implementado (R0–R6/C1–C6), RN04 con test, 14 unitarios, Swagger 16 paths, FRD/29→43/BUG-009 corregidos, guard de corpus, Fix A medido (Obst 23/35, Nutr 41/48). Cobertura 12✅/15🟡/10⚠️/0❌/0⛔. Restan: registro HTTP 1–19 caso por caso y E2E de interfaz (0/6). |
| 1.2 | 09/10/2026 | Equipo + agente | Nueva arquitectura: JWT con roles; `graph`/`sugerencias` por plan; correlativas resueltas en confirm; borrado en cascada; E2E 12/12; `validar` todo OK (masiva 27+1+15+0); Swagger v2.0; BUG-010–013 cerrados. |
| 1.3 | 14/10/2026 | Equipo + agente | **v2.3**: catálogo por instituto (colores oficiales, `isArchived`, `withCounts`, filtros); Home Institutos→Carreras→Planes; **tecnicatura intermedia** (sub-plan virtual, pestañas Lic/Tec, avisos); **articulación** `continuesIn`; **RN05** correlativas bloqueantes (back + pre-chequeo); promedio/CSV en Mi progreso; **seguridad** (ADMIN en import/creación, `checkOrigin`, logout invalida JWT) + versionado liviano; pantallas Mi cuenta/Usuarios/Archivadas/403; **26 unitarios**. Cobertura 16✅/25🟡/12⚠️/0❌/0⛔ (53 puntos). |
| 1.4 | 16/10/2026 | Equipo + agente | **v2.4**: **tipo de carrera** (`careerType`, US-10); **marcado en lote** del intermedio + **avisos** + **propuesta IA revisable** con validación pura (BUG-016/017/018); caché v3; **E2E de las prestaciones nuevas por API** (13 chequeos); rutas del corpus re-apuntadas (§11.9); **32 unitarios**. Cobertura 14✅/25🟡/19⚠️/0❌/0⛔ (58 puntos). |
| 1.5 | 16/10/2026 | Equipo + agente | Verificación completa 16/10 (corrida 9): masiva 27+1+15+0, salud OK (negativos 400/400), E2E v2.4 18/18, `seed:planes` OK=29 local; BUG-019 y `modified` honesto en el bulk; §13 fila 8 cerrada. Cobertura 14✅/25🟡/19⚠️/0❌/0⛔ (58 puntos). |
| 1.6 | 19/10/2026 | Equipo + agente | Inicio limpio (sin *Ver materias/Qué puedo cursar/Mi avance*), filas de inscripciones con *Quitar plan* y **baja reversible** (`archivedAt` + reactivación); archivadas integradas a **Catálogo → Carreras** (SC009 deja de ser ruta `/admin/archivadas`). Docs referenciados en US-08/US-11/SC009 y Caso 30/37. |
| 1.7 | 20/10/2026 | Equipo + agente | **v2.6**: stories **US-12** (baja reversible) y **US-13** (`nameOverride` + guardado en lote con códigos únicos); Casos 39–40 definidos en Test-Plan (pendientes de corrida); validaciones reutilizables de cuenta/registro documentadas (US-09/SC000/SC007). Documentación: BRD 2.5 / FRD 2.6 / Test-Plan 2.6 / Test-Cases 2.5. Cobertura 15✅/27🟡/20⚠️/0❌/0⛔ (62 puntos). |
| 1.8 | 06/11/2026 | Equipo + agente | **v2.9**: documentada la FAQ conversacional local (US-14/SC011), Caso 46 y verificación automatizada del buscador `faqSearch` (6/6) más humo manual en navegador con sesión simulada; no se hizo E2E con backend ni prueba en dispositivo físico. Fuentes: BRD 2.7 / FRD 2.9 / Test-Plan 2.9 / Test-Cases 2.8. |
| 1.9 | 12/11/2026 | Equipo + agente | **v3.0**: US-15/US-16 documentan créditos por actividades ACA y estado Libre; Casos 47–48 definidos y pendientes; se retiran los créditos por materia de requisitos y se unifican las etiquetas de vista como “Título Intermedio”. Fuentes: BRD 2.8 / FRD 3.0 / Test-Plan 3.0 / Test-Cases 2.9. |
| 2.0 | 16/11/2026 | Equipo + agente | **v3.1**: cierre del corpus (**56 PDFs = 46 referencia + 10 excluidos**), golden **46/46**, `test:planes` (29 planes + 17 `SKIP`) y nuevo `test:correlativas` (**11 OK / 6 WARN**); `npm test` **45/45** y Jest **24/24**. Se actualizan conteos de la matriz (**67 puntos: 18✅/29🟡/20⚠️**), se agrega BUG-021 y se alinean Test-Plan 3.1 / Test-Cases 3.0. Fuentes: BRD 2.9 / FRD 3.1 / Test-Plan 3.1 / Test-Cases 3.0. |
