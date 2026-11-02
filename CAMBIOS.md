# Cambios — Gradify-UNAHUR (rama fix/revision-2026-10-30)

## Colores generales

| Prioridad | Motivo              | Cambios                          | Commit        |
| --------- | ------------------- | -------------------------------- | ------------- |
| P0        | Seguridad login     | Validación `typeof string` en controller y service | `d18ead4`    |
| P0        | Perfil admin        | Validación de username y password en controllers | `2feb381`   |
| D1        | Plan oficial POST  | `POST /study-plans` crea planes oficiales (`createdBy: null`, `published`) e ignora el body | `5b262b9`  |
| D1-b      | Carga oficial       | Checkbox "Plan oficial" en `/cargar`; default off; solo ADMIN; payload `official` | `1589657`   |
| P1        | Gestión secciones   | Credentials Historico + cookie Users al cerrar sesión | `4bf18aa`   |
| D2        | Efectivo backend    | `GET /study-plans/:id/graph?target=CODE`; `status`/`savedStatus`, `effectiveStatus`, `planSubjectId`, `criticalPath*` con costos (ANUAL/OTRA=2), `targetPath`, stats efectivas, `intermediate`, sin target null, error con cadena vacía | `56cca72`   |
| D2        | Consumir backend    | `getPlanGraph` consume del backend; `graphMapper` mapea sin recalcular; `PlanGraph` usa caminos del backend, respalda cuando cambia materia; color unificado Home/adapter | `83592ba`   |
| P2 (backend) | Swagger y limpieza | Configuración `API_DOCS_ENABLED`; poda de código muerto; índices no únicos; `TRUST_PROXY`; solo pdfjs = 422; `populate('createdBy')`; A22 revisado | `2ca7174`   |
| P2 (UI)   | Accesibilidad y calidad | B5-B18: banner sin ocultar tabla; RouteErrorBoundary; reverte alternativas; ARIA SearchSelect; controlId; poda de código muerto; validación alineada Joi; try/catch localStorage; banner errores sin autocierre; MAP_MARGINSoutside | `e60c0b4`  |
| P3 (docs) | Documentación      | ARCHITECTURE.md correcto; CSS.md 10 partials; Gradify_Documentacion.md actualizado; README TRUST_PROXY/PARSE_DEBUG; backend/README C4 | docentas    |

## Backend files
- Controller u/studyPlans: confirm (D1), defaults (`createdBy`, `published`), error con cadena vacía (D2)
- Routes progress y users: TRUST_PROXY en config, api-docs condicional (P2 backend)
- Middlewares: validates, sanitizadores de cuerpo, rate limit por IP + email (P2 backend)
- Services: planService D1-b, subjectProgress CRUD, studyPlanDualPayload verifyEffectiveCriticalPathstatsOptionalOnlyPresent (D2)
- Limpieza: poda imports muertos escapesRoutesEscapeRegExpáPelchoRequireMongo disconnectRequireAuth (P2 backend)
- Índices: Subject.slug, SubjectProgress.planSubject (P2 backend)
- New scripts: publicar-planes-admin para backfill D1 confirmado

## Frontend files
- pages AdminUsers, PlanAdmin, UploadPlan, PlanGraph (P2 UI B5-B18, P3 refactors/docs)
- components: SearchSelect, SubjectStatusAction, ErrorBoundary, AdminCatalog, MessageBanner, FormField, PageHeader
- utils: userValidation, careerName, subjects, careerColor, instituteColors
- Eliminated: `api/progress.ts`, `context/CareerContextValue.ts` (muerto verificado)
- Created `admin/` sub-component folder (Partially done — Task 16 P3 refactors incomplete)

## Docs new/updated
- `docs/ARCHITECTURE.md`: corregido Redis, SUBJECT_STATUS, utils/ y nuevas variables (C1)
- `docs/CSS.md`: 10 partials incluyendo graph.css, graph-dark.css (C2)
- `Gradify_Documentacion.md`: isSatisfied, clic derecho, resolveProgressStatuses/sortSubjects (C3)
- `README.md`: TRUST_PROXY, PARSE_DEBUG, API_DOCS_ENABLED variables (C4)
- `backend/README.md`: C4 variables + Swagger
- `docs/AUDITORIA-2026-10-30.md`: matriz de 58 afirmaciones con prioridades; 52 reales; G3Verificado en línea base verde

## Verificación final

### Backend
- Jest 116/116 PASS
- Node test runner OK
- Lint 0 errors (preexistentes warnings del servidor OK)
- `node --check` OK
- Swagger parsea ~30 paths

### Frontend
- Jest 44/44 PASS (incluyendo tests/userValidation.test.mjs de B15)
- Build: OK (dist generado sin cambios en node_modules ni frontend/dist anterior)
- Lint: 0 errors (preexistentes warnings del frontend OK)

### Reglas de integration
- Sin archivos secretos en código; `.env` y `frontend/.env` intactos
- Sin `frontend/dist/` modifyado incorrectamente
- Sin push ni merge a ramas upstream

### Cobertura pendiente
- E2E no ejecutable sin Docker/Mongo/Redis (documentado en auditoría PDF-4)
- Tareas P3 de refactors faltan separación todavia en modules grandes (`AdminCatalog`, `Home`, `MyProgress`)
