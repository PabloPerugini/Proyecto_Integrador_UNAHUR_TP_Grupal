# Matriz de Trazabilidad — Requerimientos ↔ Verificación

**Proyecto:** Gradify — Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico

---

## Ficha técnica del documento

| Campo | Detalle |
| --------------------- | -------------------------------------------------------------------- |
| Institución           | Universidad Nacional de Hurlingham (UNAHUR)                          |
| Unidad Académica      | Facultad de Informática — Proyecto Integrador Programación           |
| Tipo de documento     | Matriz de trazabilidad — cruce BRD / FRD ↔ verificación existente    |
| Versión               | 1.2                                                                  |
| Fecha                 | 09 de octubre de 2026                                              |
| Documentos de origen  | `BRD.md` v2.1 · `FRD.md` v2.1 · `Test-Plan.md` v2.1 · `Test-Cases.md` v2.1 |
| Sponsor Operación     | Secretaría Académica / Dirección de Carrera                          |
| Sponsor Organización  | UNAHUR                                                               |
| Integrantes           | Perugini, Pablo; Acuña, Marcos; Masgo Sandoval, Joaquín; Renaud, Román; Remonda, Eliel; Cotera, Dylan |
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
| **Carga masiva** | `npm run test:planes` → `validaciones.js masiva` (motor `carga-masiva.test.js`) | Parseo de los PDFs del corpus contra rangos esperados, título intermedio, par de correlativas, fallback de IA. |
| **Control de salud** | `npm run test:salud` → `validaciones.js salud` (motor `verificar-salud.test.js`) | Matching de correlativas, aristas, detección de ciclos, materias disponibles. |
| **Golden snapshot** | `npm run snapshot:planes` → `validaciones.js golden` (motor `golden-snapshot.js`) | Regresión del parser: `diff = 0` sobre los planes sanos. |
| **Todo en uno** | `npm run validar` → `validaciones.js todo` | Golden `--check` + salud + masiva, con guard de corpus previo. |
| **Unitarios** | `npm test` → `node --test tests/` (0 dependencias) | `bestDbMatch`, whitelist/anti-ciclos/BUG-009, RN04, AR-3 (14 tests). |
| **Verificación estática** | `node --check` sobre `backend/src` | Sintaxis del backend. |
| **Frontend** | `npm run lint` · `npx tsc -b` · `npm run build` | Lint, tipos y build de producción. |
| **HTTP manual** | Postman | Casos 1–19 del Test-Plan. |
| **Interfaz manual** | Navegador + DevTools | Casos 20–23 del Test-Plan. |
| **Seguimiento** | `docs/requirements/Test-Cases.md` | Registro BUG-001 … BUG-009 y resultados de corrida. |

### Artefactos de evidencia

| Artefacto | Ubicación | Contenido |
| --------- | --------- | --------- |
| Informes de carga | `backend/scripts/informes/` (13 archivos, ignorados por git) | Corridas `test:planes` (incl. corrida 6 del 30/09: OK=34+OK-IA=1+WARN=8+FAIL=0), controles de salud (Obst 23/35, Nutr 41/48), backup de `requires`, tabla de correlativas reales. |
| Baseline golden | `docs/testing/golden/` (43 JSON) | Salida esperada del parser por PDF. |
| Referencia de rangos | `docs/testing/planes-referencia.json` (43 entradas) | Rangos esperados por tipo, `hasIntermediate`, `pairCorrelativas`. |
| Corpus de PDFs | `../files/UNAHUR-Oferta-Academica/` (**fuera del repo**, 43 PDF) | Insumo de los 3 scripts masivos. |

> [!WARNING]
> **El corpus de PDFs vive fuera del repositorio** (`../files/…`, ver `requireCorpus()` en
> `scripts/lib/`). En un clon limpio los tres scripts masivos **salen con mensaje claro
> (código 2)** en vez de fallar críptico; quedan como evidencia los informes y los golden.
> Guardia cerrada el 30/09 (Fase 2.2). Ver §11.6.

---

## 3. Matriz — Reglas de negocio (BRD §3.1 · FRD §3.1)

### 3.1 Reglas del grafo y progreso académico (RN01–RN04)

| ID | Regla | Verificación que lo cubre | Herramienta | Estado |
| -- | ----- | ------------------------- | ----------- | ------ |
| RN01 | Estado inicial: materia **bloqueada** sin requisitos previos | `test:salud` verifica la regla de control *"aristas > 0 y disponibles < total"* (Test-Cases:109); Caso 11 (`availableNow` en `GET /:id/graph`); Caso 21 (colores en la UI) | `test:salud` ✅ indirecto · Casos 11 y 21 🟡 | ⚠️ |
| RN02 | Habilitación automática de materias sucesivas al marcar *Aprobada/Regular* | `test:salud` recalcula disponibles desde el historial; Caso 10 (desbloqueo + créditos); Caso 21 (hijos desbloqueados en pantalla) | `test:salud` ⚠️ · Casos 10 y 21 🟡 | ⚠️ |
| RN03 | Persistencia del cambio asociado a la inscripción del usuario | Caso 9 (`401` sin header) y Caso 10 (guardado); **ninguna verificación automatizada** de persistencia | Postman | 🟡 |
| RN04 | Desmarcado: dependientes sin sustento pierden disponibilidad (el estado guardado se conserva) | `tests/rn04.test.js` (3 tests: habilitación, pérdida de sustento, stats intactos) + `graph.service.js` (aprobación efectiva transitiva) | `npm test` ✅ | ✅ |

### 3.2 Reglas de sugerencia de inscripción (R0–R6, C1–C6)

| ID | Regla | Estado de implementación | Estado de verificación |
| -- | ----- | ------------------------ | ---------------------- |
| R0–R6 / Msj0–Msj6 | Mensajes de encabezado, correlativas, límite, comunes, finales, orientación, cierre | ✅ Implementado 30/09 (`GET /careers/:id/sugerencias` + `buildSugerencias` + sección en Mi progreso) | ✅ |
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
| AR-2 | Importar el plan en PDF y editar correlativas | **`test:planes`** ejecuta crear carrera → `parse-official` → `saveSubjects` → `parse-correlativas` sobre **43 documentos** (Test-Cases:59-107); `saveCorrelativas` blindado y verificado (BUG-009) | `test:planes` ✅ · Casos 3–8 🟡 | ✅ parcial |
| AR-3 | Recibir sugerencias automáticas de inscripción | `GET /study-plans/:id/sugerencias` (E2E 200) + sección en Mi progreso + 4 unitarios | `npm test` ✅ · smoke ✅ · caso UI 🟡 | ✅ parcial |
| US-02 | Grafo interactivo con colores por estado + banner de título intermedio | Caso 12 (`graph.intermediate`, banner) y Caso 21 (colores); `test:planes` valida `hasIntermediate` (`carga-masiva.test.js:235`) | `test:planes` ✅ parcial · Casos 12 y 21 🟡 | ⚠️ |
| US-03 | Clic en materia disponible cambia estado y desbloquea sucesoras | Caso 21 | navegador | 🟡 |

---

## 5. Matriz — Criterios de bondad (FRD §4.2)

| # | Criterio | Verificación | Estado |
| - | -------- | ------------ | ------ |
| 1 | **MATERIAS BLOQUEADAS** — inhabilitadas sin correlativas cumplidas | Caso 11 + control de `test:salud` (Test-Cases:109) | ⚠️ |
| 2 | **MATERIAS DISPONIBLES** — habilitadas en el estado actual | `test:salud` con control negativo *"sin correlativas no hay bloqueo: 52/52 disponibles"* (Test-Cases:109) | ⚠️ |
| 3 | **GESTIÓN DE ESTADOS Y DINÁMICA DEL GRAFO** — desbloqueo en tiempo real | Caso 21 (UI) y Caso 10 (recálculo) | 🟡 |
| 4 | **MATERIAS A ⇒ MATERIAS B** (C1–C6) | Implementado + unitarios (`sugerencias.test.js`) | ✅ |
| 5 | **ORDEN DE ESTADÍSTICAS** decreciente | Implementado + unitario de orden | ✅ |
| 6 | **FUSIÓN DE CONDICIONES** (C1+C2 → C5) | Implementada + unitario de fusión C5 | ✅ |
| 7 | **CORRELATIVIDADES** — matching exacto/compacto/difuso/prefijo con `confidence` | **`test:planes`** (ej. Biotecnología 41/41, Enfermería 39/39) y **`test:salud`** (Test-Cases:107-109); Caso 8 manual 🟡 | ✅ |
| 8 | **TÍTULO INTERMEDIO** — `creditsIntermediate`, `intermediateTitle`, `subject.intermediate`, banner | `test:planes` valida `hasIntermediate` de la referencia (`carga-masiva.test.js:235`); Caso 3 (respuesta) y Caso 12 (banner) 🟡 | ⚠️ |
| 9 | **MANEJO DE ERRORES** — JSON en español, `400/404/409/500`, UI sin romperse | Casos 17, 18, 19 (HTTP) y Caso 22 (`ErrorBoundary`) | 🟡 |

---

## 6. Matriz — Requisitos de seguridad (FRD §4.3)

| # | Requisito | Verificación | Estado |
| - | --------- | ------------ | ------ |
| SEG-1 | **Con autenticación:** cuentas JWT con roles; catálogo público, mutaciones ADMIN, planes por dueño | E2E 12 pasos + `validar` | ✅ |
| SEG-2 | **JWT:** `401` sin token; `403`/`404` sin permiso (dueño o ADMIN) | E2E 12 pasos | ✅ |
| SEG-3 | **Subida de archivos:** solo PDF de hasta 10 MB, en memoria, con cota IA (`aiRateLimit`) | Controles negativos 400/400 + `test:salud` | ✅ |
| SEG-4 | **Errores:** JSON en español `400/401/404/409/500`, UI sin romperse | E2E + envelope middleware | ✅ |
| SEG-5 | **Datos personales:** `User` con hash `bcrypt`, `password` nunca expuesto en JSON | `toJSON` + E2E | ✅ |

---

## 7. Matriz — Pantallas (BRD §5 · FRD §5)

| Pantalla | Ruta | Verificación | Estado |
| -------- | ---- | ------------ | ------ |
| SC001 Inicio | `/` | Caso 20 (navegación) | 🟡 |
| SC002 Grafo | `/grafo/:id` | Casos 12 (banner), 21 (estados), 23 (accesibilidad) | 🟡 |
| SC003 Tablero | `/tablero/:id` | Caso 20 | 🟡 |
| SC004 Mi progreso | `/progreso` | Casos 9, 10 (progreso), 23 (`aria-label`) | 🟡 |
| SC005 Cargar plan | `/cargar` | Casos 3–7 (carga) + **`test:planes`** en backend ✅; flujo de UI: Caso 20 | ⚠️ |
| SC006 Admin | `/admin/:id` | Casos 14 (alta/duplicados), 15 (publicar), 16 (editar/borrar) | 🟡 |

**Total de pantallas verificadas end-to-end: 0 de 6.** La verificación automatizada llega
hasta la API; la capa de interfaz (Casos 20–23) no tiene resultado registrado.

---

## 8. Matriz — Casos de estudio (BRD §3.2 · FRD §3.2)

| Caso | Descripción | Verificación | Estado |
| ---- | ----------- | ------------ | ------ |
| CS-01 | Estudiante de ingreso reciente | Casos 11 y 21 (bloqueo inicial + habilitación al aprobar) | 🟡 |
| CS-02 | Recorrido avanzado, camino crítico | Caso 11 (`criticalPath`, `topologicalOrder`); Caso 21 (badge crítico) | 🟡 |
| CS-03 | Alumno 1 — sugerencias | Reglas implementadas + smoke; caso manual UI pendiente | ⚠️ |
| CS-04 | Alumno 2 — sugerencias | Reglas implementadas + smoke; caso manual UI pendiente | ⚠️ |
| CS-05 | Alumno 3 — sugerencias | Reglas implementadas + smoke; caso manual UI pendiente | ⚠️ |

---

## 9. Trazabilidad de bugs (Test-Cases §Registro)

| Bug | Descripción corta | Estado | Qué lo verificó | Automatizado |
| --- | ----------------- | ------ | --------------- | ------------ |
| BUG-001 | Fila de totales importada como materia | Resuelto | `test:planes` + golden (`TAB_TOTAL_RE`) | ✅ |
| BUG-002 | Dialecto `Asignatura\|Campo\|Carga` → 0 materias | Resuelto | `test:planes` (23 detectadas) + **golden detectó la regresión de 6 planes sanos** | ✅ |
| BUG-003 | Dialecto con número pegado → 0 materias | Mitigado | `test:planes` → estado `OK-IA` (20 materias vía IA) | ✅ |
| BUG-004 | Correlativas 2 columnas sin números → 0/0 | Resuelto el layout: `test:planes` → **32/38 determinístico** (corrida 6); IA lectora cubre el resto | ✅ |
| BUG-005 | Matching bajo con nombres envueltos | **Fix A 30/09** (triple gate: cierre `-` + nombre completo + banda): Obstetricia **23/35**, Nutrición **41/48** solo determinístico (`test:salud` corrida 30/09) | ✅ |
| BUG-006 | 8 materias sin año (Ciberseguridad) | Resuelto | `test:planes` → 0 sin año + golden `diff = 0` | ✅ |
| BUG-007 | Typo en `pairCorrelativas` → SKIP | Resuelto | `test:planes` → Mantenimiento 27/31 (corrida 6) | ✅ |
| BUG-008 | Groq 413 / Gemini 503-429 | Mitigado | Observado en corrida; **sin test automatizado** (depende de cuota externa) | ❌ |
| BUG-009 | `saveCorrelativas` persistía cualquier `requires` (ciclos, autorreferencias) | Resuelto | Regresión automática `npm test` (whitelist + anti-ciclos) | ✅ |

**Cobertura de regresión de bugs: 8/9 automatizados.** Falta BUG-008 (cuota externa, aceptado).

---

## 10. Estado global de cobertura

| Dimensión | Total | ✅ | 🟡 | ⚠️ | ❌ | ⛔ |
| --------- | ----- | -- | -- | -- | -- | -- |
| Reglas de negocio (RN01–RN04) | 4 | 1 | 1 | 2 | 0 | 0 |
| Reglas de sugerencia (R0–R6, C1–C6, orden) | 3 | 3 | 0 | 0 | 0 | 0 |
| Historias de usuario (AR/US) | 5 | 2 | 2 | 1 | 0 | 0 |
| Criterios de bondad | 9 | 4 | 2 | 3 | 0 | 0 |
| Requisitos de seguridad | 5 | 2 | 3 | 0 | 0 | 0 |
| Pantallas (SC) | 6 | 0 | 5 | 1 | 0 | 0 |
| Casos de estudio (CS) | 5 | 0 | 2 | 3 | 0 | 0 |
| **TOTAL** | **37** | **12** | **15** | **10** | **0** | **0** |

> De 37 puntos: **12 verificados**, **15 definidos pero sin ejecutar** (casi todos, casos
> manuales HTTP/UI), **10 parciales** y **0 pendientes**: no quedan requisitos sin
> implementar ni sin caso. **Ninguna pantalla está verificada end-to-end** (Casos 20–23).

---

## 11. Brechas de cobertura

### 11.1 Casos HTTP con corrida formal (cerrada 09/10)
Corrida completa 09/10: E2E 12/12 con JWT (register->login->me->careers->preview->confirm->subjects->graph->sugerencias->enroll->progress->cascada->delete) registrado en Test-Cases (Corrida 7).




### 11.2 Tests unitarios ✅ (cerrada 30/09)
`npm test` (node:test, 0 dependencias, 14 tests): `bestDbMatch`, whitelist/anti-ciclos/
BUG-009, RN04 y AR-3. El matching, los ciclos y las reglas ahora tienen casos
aislados además de la verificación masiva/E2E.

### 11.3 RN04 ✅ (cerrada 30/09)
`tests/rn04.test.js` (3 tests) + aprobación efectiva transitiva en `graph.service.js`:
desmarcar quita sustento a dependientes sin destruir el estado guardado. `test:salud`
repite números idénticos (sin regresión).

### 11.4 La capa de interfaz no tiene resultados 🟠
Casos 20–23 (navegación, estados en grafo, `ErrorBoundary`, accesibilidad) definidos en
`Test-Plan.md:88-92` sin ningún resultado registrado en Test-Cases.

### 11.5 Un bug sin regresión automatizada 🟢
Solo queda BUG-008 (cuota externa, aceptado). BUG-009 tiene regresión en `npm test`.

### 11.6 El corpus de PDFs está fuera del repositorio 🟡
`../files/UNAHUR-Oferta-Academica/` (43 PDF) no se commitea. En un clon limpio los
scripts salen con mensaje claro (código 2) gracias a `requireCorpus()` (Fase 2.2,
`scripts/lib/` + `validaciones.js todo`). Quedan como evidencia los informes y los
golden. Pendiente de equipo: decidir destino del corpus (§4 fila 6 del plan maestro).

### 11.7 Cifra 29 → 43 PDFs ✅ (cerrada 30/09)
Corregida en `Test-Plan.md:47,67` y `Test-Cases.md:59`.

### 11.8 Herramientas documentadas ✅ (cerrada 30/09)
`README.md` (sección Validar y testear) + `Test-Plan.md` describen `test:planes`,
`test:salud`, `snapshot:planes`, `npm test` y `npm run validar`.

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

### 12.4 Fila BUG-009 ✅
Repegada a la tabla (sin líneas en blanco intermedias).

---

## 13. Recomendaciones priorizadas

| # | Acción | Estado 30/09 | Esfuerzo |
| - | ------ | ------------- | -------- |
| 1 | **Ejecutar los casos HTTP 1–19** y registrar en Test-Cases | 🟠 smoke ejecutado (404/401/200 + sugerencias); falta registro caso por caso | 🟡 medio |
| 2 | **Regresión `saveCorrelativas`** (ciclo, inexistente, autorreferencia) | ✅ en `npm test` | 🟢 bajo |
| 3 | **FRD RN03** con JWT e inscripcion | E2E 12/12 (cerrada 09/10) | listo |
| 4 | **FRD SEG-1/SEG-5** (módulo existe, sin UI) | ✅ | 🟢 bajo |
| 5 | **29 → 43 PDFs** | ✅ | 🟢 bajo |
| 6 | **Repegar BUG-009** | ✅ | 🟢 bajo |
| 7 | **Guard de corpus** en scripts | ✅ `requireCorpus()` + `validaciones` | 🟢 bajo |
| 8 | **Casos 20–23 de interfaz** | ⬜ pendiente (0/6 pantallas E2E) | 🟡 medio |
| 9 | **Caso RN04** | ✅ `tests/rn04.test.js` (más implementación de sustento transitivo) | 🟢 bajo |
| 10 | **Unitarios** (matching + ciclos) | ✅ `npm test`, 14 tests, 0 deps | 🟢 bajo (era medio) |
| 11 | **Documentar herramientas** (FRD/Test-Plan/README) | ✅ | 🟢 bajo |
| 12 | **Swagger completo** | ✅ 16 paths | 🟡 medio |

> Los ítems 3–6, 7, 9 y 11 son **solo de documentación** y pueden resolverse en la misma
> corrida de edición de `docs/requirements`.

---

## 14. Historial de Cambios

| Versión | Fecha | Autor | Descripción |
| ------- | ----- | ----- | ----------- |
| 1.0 | 28/09/2026 | Equipo | Primera matriz de trazabilidad: 37 puntos cruzados (BRD/FRD ↔ verificación), 11 brechas y 4 inconsistencias documentales detectadas. |
| 1.1 | 30/09/2026 | Equipo + agente | Cierre: AR-3 implementado (R0–R6/C1–C6), RN04 con test, 14 unitarios, Swagger 16 paths, FRD/29→43/BUG-009 corregidos, guard de corpus, Fix A medido (Obst 23/35, Nutr 41/48). Cobertura 12✅/15🟡/10⚠️/0❌/0⛔. Restan: registro HTTP 1–19 caso por caso y E2E de interfaz (0/6). |
| 1.2 | 09/10/2026 | Equipo + agente | Nueva arquitectura: JWT con roles; `graph`/`sugerencias` por plan; correlativas resueltas en confirm; borrado en cascada; E2E 12/12; `validar` todo OK (masiva 27+1+15+0); Swagger v2.0; BUG-010–013 cerrados. |
