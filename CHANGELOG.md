# Changelog del Proyecto

**Proyecto:** Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico (UNAHUR — TP Integrador Academia)

El registro histórico de requisitos/alcance por versión se mantiene en [BRD.md](docs/requirements/BRD.md#1-historial-de-cambios) y [FRD.md](docs/requirements/FRD.md#1-historial-de-cambios). Este archivo rastrea las mejoras técnicas por fecha y solo registra lo que existe en la aplicación.

---

## [1.17] — 2026-10-09

### Nueva arquitectura operativa + docs v2.2
- **Correlativas resueltas:** matcher pre-merge portado a `src/services/correlativas.service.js` + resolución en el `confirm` (exact/compact, anti-ciclos 400): 15/19 en plan de prueba, grafo con aristas. `npm test` 14/14.
- **Endpoints nuevos:** `GET /study-plans/:id/graph` y `/study-plans/:id/sugerencias` (viewer) sobre los motores `graph`/`sugerencias`.
- **Borrado en cascada:** `DELETE /study-plans/:id` borra inscripciones+progreso+materias+importaciones propias (409 con otros inscriptos no-ADMIN); `DELETE` materia referenciada 500→409.
- **Scripts E2E con JWT** (`lib/testAuth.js`, retry 429, `STRICT_IA`, `resolvePlanesDir` con `files/` local preferido): `validar` todo OK (masiva 27+1+15+0, salud OK).
- **Infra:** `compose.yaml` único de 4 servicios (backend nodemon + frontend HMR + mongo:27018 + redis), `.dockerignore` en frontend, `mongo_data` preservado.
- **Limpieza:** 9 archivos muertos fuera (dup `pdf.js`, `withDeviceId`, 10 tests jest stale, `CareersTable`, `subjectMappers`, `messages`, `useAdminActions`, shim `useCareerSelection`) + `jest`/`supertest` fuera de devDeps; `aiRateLimit` cableado al preview; `.opencode` y menciones fuera.
- **Docs:** Swagger v2.0 (~30 paths), BRD/FRD/Test-Plan/Test-Cases/Matriz v2.2/1.2, `pruebas.http` (12 pasos), READMEs, `Gradify_Documentacion.md` v1.2.
- **Verificado E2E 12/12** con usuario temporal (register→…→cascada→delete), DB restaurada. BUG-010–013 cerrados.

## [1.16] — 2026-09-30

### Relevamiento total: duplicados, innecesarios y buenas prácticas (local, sin push)
- **Eliminado:** `invalidateCache` y `findUserById` (solo definición+export), `_aiIndex`, rama de imágenes de `PdfDropzone` (PDF-only, como el backend), `.chip--dot` sin usos, `loadtest/*.log`, `frontend/dist` (regenerable).
- **Convertido en señal:** `parsed._aiNote` ahora vuelve como `aiNote` en `parse-official` (era asignación muerta).
- **Unificado:** `useAdminActions` (publish/confirmRemove/CONFIRM_DELETE de UploadPlan+PlanAdmin), 5.ª copia de carreras → `useCareers` en PlanGraph, `HistoryJob` → `ImportJob`, `makeJobId` compartido, `yearLabel` en tablero, `SUBJECT_STATUS` única fuente (modelo ↔ controlador), `PARSE_DEBUG/PARSE_PAGE` documentados (página 17 hardcodeada → env).
- **Decidido no tocar (con motivo):** props opcionales de componentes (API legítima), doble estado de selección en MyProgress (draft intencional), catch por carrera en Home (resiliencia) + regla ESLint documentada, campos write-only (requiere migración), envelope a nivel fuente (el middleware runtime ya cubre el 100%), contexto global de carreras (el remount refetchea; sin bug real).
- **Gates:** `npm test` 14/14 · `snapshot --check` SIN DIFERENCIAS · `tsc`+`lint`+`build` verdes · backend 200.

## [1.15] — 2026-09-30

### Matriz v1.1 + RN04 + verificación de testing (todo local, sin push)
- **RN04 implementado de verdad:** la auditoría mostró que no existía cascada en ningún lado. Aprobación *efectiva* transitiva en `graph.service.js` (punto fijo; el estado guardado no se toca) + `tests/rn04.test.js` (3 tests). `test:salud` repite números idénticos.
- **Matriz v1.1:** AR-3/C1–C6/orden/fusión a ✅, RN04 a ✅, SEG-1/5 a ✅ documentado, BUG-004/005/007/009 actualizados (regresión 8/9, solo falta BUG-008), brechas 11.2/11.3/11.5/11.6/11.7/11.8 cerradas, inconsistencias §12 cerradas. **Cobertura: 12✅/15🟡/10⚠️/0❌/0⛔** (era 2/15/9/1/10).
- **Verificación testing:** `npm test` 14/14 · `snapshot --check` SIN DIFERENCIAS · `test:salud` idéntico · `test:planes` corrida 6 (34+1+8+0+0) · frontend `tsc`+`lint`+`build` verdes · smoke envelope/AR-3 200+401.
- Restan: registro HTTP 1–19 caso por caso y E2E de interfaz (0/6 pantallas).

## [1.14] — 2026-09-30

### Plan maestro: Fase 2 + envelope + Swagger + strict + AR-3 + corrida masiva (todo local, sin push)
- **Fase 2 completa:** `scripts/validaciones.js` (entrada única `masiva|salud|golden|todo|--help`, falla rápido) + `scripts/lib/requireCorpus.js` compartido por los 4 scripts + `npm run validar`. Desviación documentada: los motores no se borran (reescribir 30KB de E2E probado = riesgo sin valor).
- **Envelope progresivo de errores (§3.1, fase 1):** un middleware en `app.js` normaliza todo status ≥400 a `{ success:false, error:{ message, details? } }` conservando campos propios (`dropped`, `cycle`); 2xx intactos. `api/client.ts` lee el envelope con fallback legado. Smoke: 404/401 con envelope, `/careers` plano.
- **Swagger 9 → 16 paths:** `/`, `parse-correlativas`, `correlativas`, `PATCH/DELETE /careers/{id}`, `sugerencias`, `/users/*` como legado sin UI.
- **`strict: true` en `tsconfig.app.json`: compiló a la primera, 0 errores**; lint + build verdes.
- **`careerColor`:** el backend es la única fuente (UploadPlan ya no envía color; espejo documentado en el front).
- **PlanGraph (§11.3):** `nodeBorder` + `StatusBadges` + `toPlanNodeData` compartidos (nodo Flow y tarjeta del tablero); `strict` exigió spread en el borde ReactFlow. tsc+lint+build verdes.
- **AR-3 (Fase 6.1):** `GET /careers/:id/sugerencias` (C1–C6 con fusiones FRD, B decreciente, disponibles/camino crítico, finales, comunes, ritmo x+1, mensajes R0–R6) + sección en *Mi progreso* + 4 unitarios. Smoke 200 + 401. FRD §3.1.2/3.2 y Test-Cases BUG-005 actualizados.
- **Unitarios 11/11** (matcher, ciclos, BUG-009, AR-3).
- **Corrida masiva (corrida 6, 43 docs, backend local sin Redis): OK=34 + OK-IA=1 (Tec.IA vía gemini) + WARN=8 + FAIL=0 + SKIP=0.** Correlativas determinísticas: Obstetricia 23/35 (era 6/35), Nutrición 41/48 (era 17/48), Diseño 32/38 (era 0/0), Mant.Hospitalario 14/19 (era 6/20), Mantenimiento 27/31. IA lectora: 8 exactas en Obstetricia vía groq (failover Gemini 503→Groq verificado en vivo, con `usage` en log).

## [1.13] — 2026-09-30

### Fix A parser (nombres envueltos) + Fases 1/1B.B/2.2/3/5.2 del plan maestro (todo local, sin push)
- **Fix A (`pdfParser.service.js`, rama genérica numerada, solo modo below):** las anclas son solo el número y el nombre llega en fragmentos que envuelven por arriba (cabeza del sujeto de abajo) o por abajo (cola del de arriba). Redirige al ancla de abajo solo si: (1) el ancla de arriba absorbió su `-` de cierre (x>=250), (2) su nombre en orden de lectura está completo (`TWOCOL_TAIL_RE`: "Genética Humana" sí, "Organización de sistemas de" no), (3) el fragmento trae banda de nombre (x<250). Causa raíz diagnosticada con coordenadas: Obstetricia mezcla convenciones below/above en un mismo doc.
- **Medido:** Obstetricia 35 nombres (5 fusiones → limpios: "Genética Humana", "Introducción a la Obstetricia", "Cultura y alfabetización digital en la universidad", "Introducción a la Nutrición"); Mant. Hospitalario 19 (10 fusiones → limpios, verificado contra los 21 del plan: "Organización de sistemas de salud", "Física", etc.); Nutrición 48 sin cambios. Golden: diff solo en esos 2 WARN (delta=0 en ambos), **0 sanos tocados**, baseline regenerada → `snapshot --check` SIN DIFERENCIAS.
- **Fase 1 seguridad:** 500 sin `err.message`, CORS whitelist (`CORS_ORIGIN`), `withDeviceId` sin query + 401, `helmet` + rate-limit en `/users/login|register`, `exit(1)` en `uncaughtException`.
- **Fase 1B.B IA:** JSON nativo (Groq `response_format`, Gemini `responseMimeType`), `ProviderError` con `Retry-After` + backoff, `usage` en log, caché `v2` (prompt+modelo+carrera). Solo Gemini+Groq (se retiró Ollama).
- **Fase 2.2:** `requireCorpus()` en los 4 scripts (sale 2 con mensaje si falta `../files/`).
- **Fase 3:** `npm test` (node:test, 0 deps nuevas): `bestDbMatch`, `cleanRequiresList` (BUG-009), `findCycle` — 7/7. `parseJsonStrict` unificado en `services/aiJson.js`; N+1 de `GET /careers` → 1 query; borrados `*.tmp.js` y `tmp-debug-corr.js`.
- **Gates:** `node --check` OK · `npm test` 7/7 · `snapshot --check` SIN DIFERENCIAS · frontend `tsc`+`lint` limpios.
- **E2E `test:salud` (30/09, backend local sin Redis):** Kinesiología 41/41 = · Enfermería 39/39 = · **Obstetricia 6/35 → 23/35** · **Nutrición 17/48 → 41/48** (solo matching determinístico; el resto va a IA lectora + revisión) · control negativo 0/52 sin falsos positivos · limpieza OK.
- **Consejeros:** los 3 denegados por el guardián (contexto 900%, sin alternativas permitidas); se ejecutó con invariantes §1 como árbitro.

## [1.12] — 2026-09-25

### Auditoría total (crítico) + corrida 5
- **Blindajes aplicados y verificados en servidor fresco:** `saveSubjects` filtra requires a códigos existentes y sin autorreferencia (responde `droppedRequires`); `upload` verifica firma `%PDF-` además de mimetype (rechazo 400 antes de parsear o llamar APIs externas); `updateUser` valida con Joi parcial y duplicados concurrentes responden 409.
- **No aplicado a propósito:** auth obligatoria en carreras y rate-limit de login (rompen los flujos actuales del frontend sin token; requiere acuerdo del equipo). `.env` nunca se commiteó (verificado en git); rotar las keys igual porque circularon fuera del repo.
- **Corrida 5 (43 documentos):** OK=34 + OK-IA=1 + WARN=8 + FAIL=0 + SKIP=0, con 14 PDFs nuevos del Instituto de Educación.

---

## [1.11] — 2026-09-24

### Fixes del parser con red golden
- **Snapshot golden** (`npm run snapshot:planes`, `docs/testing/golden/*.json` con nombres+año+cuatrimestre por PDF): cada fix se aprueba solo con diff=0 en los archivos sanos.
- Año retroactivo en subtotales de cierre (BUG-006 resuelto: Ciberseguridad 0 sin año).
- `"Cuatr."` como duración C (Mant. Hospitalario 0→21 nativo).
- Filtro de prosa resolutiva + encabezado "Actividad Curricular" en correlativas (Mantenimiento 26/33→26/32 sin junk; Mant. Hospitalario con 9 sugerencias IA exactas verificadas E2E).
- Dialecto Asignatura|Campo|Carga nativo (Agroecológica 0→23); el gate intermedio rompió 6 planes con mismo vocabulario y la red golden lo detectó antes de entregar: gate final solo sin columna código ni duración.
- Pendientes: correlativas Diseño sin números, anclas número+Campo (Agroecológica), nombres envueltos Obst/Nutr; Tec IA queda en IA.

---

## [1.10] — 2026-09-24

### IA solo lectora en correlativas (no inventa)
- Cambio de diseño: la IA **solo extrae pares literales del PDF** (`aiCorrelativas.service.js`: `{subject, requires, evidence}` tal cual figuran, con cita del fragmento) y **no recibe la lista oficial**. La resolución a códigos la hace el matcher determinístico en servidor (`bestDbMatch`): solo exact+compact van a `aiSuggested` (aplicables), fuzzy/prefix a `aiReview` (lectura) y lo no resuelto a `aiUnresolved`. Ningún código puede originarse en texto de la IA.
- Respuesta de `parse-correlativas` con `aiCoverage` (pares extraídos vs total del parser) para detectar omisiones.
- Frontend: el botón aplica solo sugerencias exactas; la lista de revisión muestra evidencia por par.

---

## [1.9] — 2026-09-24

### Integración del auth JWT de compañeros (`64db282`)
- Se descargó `origin/develop` (fast-forward) con la parte de usuarios y autenticación JWT (registro, login, middlewares `authUser`/`authAdmin`/`authOwnerOrAdmin`, modelo y servicio de usuario).
- Faltantes del commit reparados para que el backend arranque: agregada dependencia `bcryptjs`, creado `src/middlewares/validateUser.js` (Joi, esquema propio del commit) y montadas las rutas en `src/routes/index.js` como `/users`.
- Verificado: registro 201, validación 400, login 200 con token, `GET /users` 401 sin token y 403 sin admin, owner puede ver/borrar lo suyo, `GET /careers` sigue público (sin regresión). El modelo ya excluye `password` del JSON.

---

## [1.8] — 2026-09-24

### IA en correlativas + blindaje de guardado
- **Fallback de IA en `POST /careers/:id/parse-correlativas`** (`backend/src/services/aiCorrelativas.service.js`): si el matching determinístico queda bajo (`matched/total < 0,7` o `total` 0) y hay IA configurada, propone el mapeo en el campo separado `aiSuggested` (resuelto solo contra códigos reales; lo desconocido va a `aiUnresolved`). Medido: Nutrición 43, Obstetricia 34 y Diseño Industrial 12 sugerencias. El guardado sigue manual.
- **Blindaje de `POST /careers/:id/correlativas`** (BUG-009): whitelist de códigos por carrera, descarte de autorreferencias (ambos listados en `dropped`) y rechazo 400 del lote si crea un ciclo, sin guardar nada.
- **Frontend (Editar plan):** aviso cuando hay sugerencias IA + botón "Aplicar sugerencias de IA (N)" como acción explícita de revisión; el flash de guardado informa descartes del servidor.
- **Script:** la fase de correlativas registra `aiSuggested` sin guardarlos; los planes OK-IA ahora habilitan su correlativa par (antes quedaba SKIP).

---

## [1.7] — 2026-09-24

### Carga masiva de planes + fallback de IA
- **Test masivo reutilizable `npm run test:planes`** (`backend/scripts/carga-masiva.test.js` + inspector `backend/scripts/inspect-pdf.js`): recorre los 29 PDFs de `files/UNAHUR-Oferta-Academica` por la API real, compara contra la tabla de referencia `docs/testing/planes-referencia.json` (tipo Licenciatura/Tecnicatura/Ingeniería con rangos esperados) y genera informe en `backend/scripts/informes/`. Las carreras de prueba usan prefijo `[TEST-<fecha>]`, se aborta el caso si el backend responde `reused: true` y todo se borra por `_id` al final.
- **Fallback de IA en `POST /careers/:id/parse-official`** (portado de `feature/auth-cookie-ia`, limitado a carga de PDFs): si el parser devuelve 0 materias o queda fuera del rango de referencia y hay proveedor configurado, `backend/src/services/aiExtract.service.js` extrae las materias con IA (solo páginas con pinta de tabla, máx. 40 mil caracteres; Gemini primero, reintento ante 429/5xx) con validación dura de esquema y rango. La respuesta incluye `aiFallback`/`aiProvider` y el frontend avisa que hay que revisar antes de publicar.
- **`backend/src/services/ai.service.js`**: orquestador Groq → Gemini → Ollama con timeout de 60 s, cache en Redis (best-effort) y mensajes de error con el detalle por proveedor. Claves documentadas en `backend/.env.Ejemplo`.
- **Resultado sobre los 29 PDFs:** 20 OK por parser + 2 OK-IA + 7 WARN con observaciones + 0 FAIL + 0 SKIP. Detalle y bugs BUG-002…BUG-008 en `docs/requirements/Test-Cases.md`.

### Verificación
- Backend: `node --check` sobre servicios/controladores/scripts nuevos y modificados → OK.
- Frontend: `npx tsc -b` sin errores; `npm run lint` sin errores.

---

## [1.6] — 2026-09-24

### Documentación alineada con la implementación
- `CHANGELOG.md` y `docs/requirements/` (BRD, FRD, Test-Plan y Test-Cases) reescritos para describir la aplicación tal como está hoy. Se retira todo lo que **no corresponde** al código actual: autenticación por cookie, usuarios y roles, recuperación de contraseña, IA (chat orientador, orquestador multiproveedor, embeddings/matching semántico, `GET /ai/status`), compartir/exportar imagen, selector `?degree=`, CI con tests (`npm test`, Vitest) y Docker Compose.
- Se eliminan los ADR `0001-auth-por-cookie-jwt` y `0002-ia-solo-carga-de-pdfs`, que documentaban decisiones que ya no rigen.
- BRD y FRD pasan a **v2.0**; Test-Plan y Test-Cases a **v2.0**.

### Verificación
- Backend: `node --check` → 20/20 archivos OK. Frontend: `npm run lint` sin errores, `npx tsc -b` sin errores y `npm run build` OK (330 ms).

---

## [1.5] — 2026-09-23

### Manejo de errores centralizado (backend y frontend)
- **Nuevo `backend/src/middlewares/errorHandler.js`** + **`backend/src/utils/AppError.js`**, montados al final de `app.js`: traducen cualquier error a JSON con el código correcto — `MulterError` (PDF > 10 MB o error de archivo) → `400`, `AppError` → su status, JSON mal formado → `400`, `CastError` de ObjectId → `400`, validación de Mongoose → `400`, clave duplicada `11000` → `409` y, por defecto, `500` con mensaje genérico (el detalle se imprime en el servidor).
- **`backend/src/main.js`:** handlers de `unhandledRejection` y `uncaughtException` para que un error inesperado no tire el proceso sin registrar nada.
- **Frontend:** nuevo `components/ErrorBoundary.tsx` que envuelve las rutas en `App.tsx`; `api/client.ts` convierte la respuesta de error en un mensaje legible y avisa si el backend no responde; `PlanGraph` muestra el error sin romper la vista.

---

## [1.4] — 2026-09-17

### Arquitectura de interfaces: layouts separados
- Nuevos `layouts/UserLayout.tsx` y `layouts/AdminLayout.tsx` con sidebars propios (`UserSidebar`, `AdminSidebar`) sobre una base común (`SidebarBase`).
- `App.tsx` agrupa las rutas: `/`, `/progreso`, `/grafo/:id?` y `/tablero/:id?` bajo el layout de usuario; `/cargar` y `/admin/:id?` bajo el de administración.

---

## [1.3] — 2026-09-17

### Fin de la autenticación: acceso sin cuenta
- Se elimina el módulo de usuarios: modelo `user.js`, `user.routes.js`, schemas, middlewares de sesión (`authUser`, `validateUser`, `validateUserExists`), las páginas `Login`/`Register`, `AuthContext`, `useAuth`, `ProtectedRoute` y `FormField`.
- El progreso pasa a identificarse con el header **`x-user-id`** (`middlewares/withDeviceId.js`): `api/client.ts` genera una clave local por navegador (clave `gradify-device-id` en `localStorage`) y la envía en cada petición; `/progress` responde `401` si falta.
- `backend/docs/swagger.yaml` queda en **v1.0.0** con las rutas reales (`/careers`, `/progress`, `/health`) y sin endpoints de usuarios.

---

## [1.2] — 2026-09-16

### Documentación
- `README.md` actualizado con la descripción del proyecto y la tabla de integrantes.
- Se retira la mención a la colección de Postman.

---

## [1.1] — 2026-09-15

### Versión inicial del código
- **Backend** (Express 5 + MongoDB + Redis): rutas `/careers` (crear, listar, materias, grafo, parseo de PDF, correlativas, publicación, editar, borrar) y `/progress` (parseo de historial, guardar, consultar), más `/health` y documentación Swagger en `/api-docs`.
- **Frontend** (React 19 + Vite + TypeScript + React Flow): inicio, carga de planes, grafo de correlatividades, tablero, mi progreso y panel de edición.
- **Lector de PDF** (`services/pdfParser.service.js`): lectura por coordenadas con `pdfjs-dist`, detección de tablas de planes de SIU-Guaraní, detección de la sección del **título intermedio** y descarte de filas de totales y encabezados.
- **Grafo** (`services/graph.service.js`): estados, materias disponibles, camino crítico, orden topológico, detección de ciclos y estadísticas; **título intermedio** con sus créditos (`career.creditsIntermediate`, `subject.intermediate`, `graph.intermediate` + `IntermediateBanner` en el grafo).
- Caché en Redis (`services/cache.service.js`) best-effort: si Redis no está disponible, la API sigue funcionando sin caché.

---

## [1.0] — 2026-09-10

- Versión inicial del proyecto: alcance definido y documentación de inicio (BRD/FRD v1.0).
