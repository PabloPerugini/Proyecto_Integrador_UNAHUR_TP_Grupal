# Plan de trabajo — Gradify, entrega final

**Proyecto:** Gradify — Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico  
**Rama:** `fix/revision-2026-10-30`  
**Fecha:** 2026-11-03  
**Estado:** propuesto, pendiente de aprobación  
**Alcance:** cerrar código, infraestructura, documentación y materiales de defensa sin hacer push ni merge.

---

## 1. Objetivo

Llegar a la defensa con:

1. La app funcionando en desarrollo y producción con Docker.
2. Los bugs críticos corregidos y cubiertos por tests.
3. El código muerto eliminado.
4. Dependencias y runtime actualizados sin romper nada.
5. FAQ estática, sin IA.
6. Documentación verificable: arquitectura, matriz de trazabilidad, README, Docker y Postman.
7. Informe, presentación, guion, video y checklist de demo.
8. Un QA final con evidencia, no con afirmaciones.

**Criterio de terminado:** cada afirmación de la entrega se puede mostrar en código, en un test o en una ejecución real.

---

## 2. Estado de partida verificado

| Ítem | Estado real |
|---|---|
| Rama actual | `fix/revision-2026-10-30` |
| Archivos eliminados en git | **12**, no 14 |
| Archivos modificados | `docs/requirements/BRD.md`, `docs/requirements/Test-Cases.md` |
| Archivo nuevo | `docs/requirements/modelo-datos-gradify-v2.drawio` |
| Docker | Docker Desktop instalado, **daemon detenido** |
| Node del host | `v26.12.1` |
| Backend | `engines.node >=22`, Mongo 6 y Redis 7 en `compose.yaml` |
| Bug crítico | `AdminCatalog.tsx:910-915`: DELETE sin `await`, UI optimista y error silenciado |
| Guarda backend | `universityService.deleteUniversity` solo valida carreras y no incluye archivadas |
| `UserProgress` | Solo lo usan `saveProgress` y `getProgress`, que no tienen ruta montada |
| Tests backend Node | **46/46 pasan** (2026-11-03) |
| Tests backend Jest | **116/116 pasan** en 33 suites |
| Tests frontend | **44/44 pasan** |
| Lint backend | 0 errores, 14 warnings preexistentes |
| Lint frontend | Limpio |
| Build frontend | Correcto con Vite 8.2.2 |
| `npm audit --omit=dev` backend | 10 vulnerabilidades: 1 crítica, 4 altas, 5 moderadas |
| `npm audit --omit=dev` frontend | 0 vulnerabilidades |

### Corrección de conteo

Los “14 archivos” eran **12 eliminados + 2 modificados**. Los 12 eliminados se van a commitear como limpieza. Los 2 modificados se commitean aparte. `ARCHITECTURE.md` y `Matriz-Trazabilidad.md` no se restauran tal como estaban: se regeneran corregidos en la Fase 8.

---

## 3. Decisiones cerradas

1. **Archivos obsoletos:** se eliminan. No se restauran.
2. **`UserProgress`:** se borra. Es código muerto, no se migra.
3. **Docker:** autorizado reconstruir y reiniciar. Se verifica desarrollo y producción.
4. **Postman:** va en `docs/requirements/postman/`.
5. **TP:** informe, presentación, video y demo en vivo.
6. **FAQ:** 100 % estática, sin IA, sin endpoints nuevos.
7. **Dependencias:** primero se actualizan y prueban en el host; después se meten en Docker.
8. **Git:** un cambio por commit. Sin push ni merge.
9. **Refactors grandes:** no se divide `AdminCatalog.tsx` en esta etapa. Solo se corrige el handler de borrado.

---

## 4. Fases

### Fase 0 — Línea base y entorno

**Duración estimada:** 30–45 min.  
**No genera commit.**

- [ ] Iniciar Docker Desktop y esperar el daemon. **Pendiente: el daemon está detenido.**
- [ ] Verificar `docker compose ps` y `docker --version`.
- [x] Ejecutar los tests actuales y anotar los números reales:
  - [x] Backend Node: `cd backend && npm test` → 46/46.
  - [x] Backend Jest: `cd backend && npm run test:jest` → 116/116.
  - [x] Frontend: `cd frontend && npm test` → 44/44.
  - [x] Lint backend y frontend → 0 errores; 14 warnings en backend.
  - [x] Build frontend → correcto con Vite 8.2.2.
- [ ] Guardar la salida en `docs/TP/qa/linea-base.txt` (sin secretos).
- [ ] Confirmar que `backend/.env` existe y que no se va a tocar.
- [ ] Revisar que no haya procesos usando los puertos 3000, 5173, 27018 y 6380.

**Salida:** números de referencia y entorno listo.

---

### Fase 1 — Limpieza y requisitos

**Duración estimada:** 30 min.  
**Riesgo:** bajo.

- [ ] Commit 1: eliminar los 12 archivos obsoletos.
  - `.vscode/extensions.json`
  - `CAMBIOS.md`
  - `Gradify_Documentacion.md` (la copia vieja del repo; el documento externo se conserva)
  - `docs/ARCHITECTURE.md` (se regenera en Fase 8)
  - `docs/AUDITORIA-2026-10-30.md`
  - `docs/CSS.md`
  - `docs/propuestas/README.md`
  - `docs/propuestas/ui-ux-20261019.html`
  - `docs/propuestas/ui.css`
  - `docs/propuestas/ui.js`
  - `docs/requirements/Matriz-Trazabilidad.md` (se regenera en Fase 8)
  - `pruebas.http`
- [ ] Commit 2: actualizar `BRD.md`, `Test-Cases.md` y agregar el `.drawio`.
  - Corregir la fecha de `Test-Cases.md` a `2026-11-03`.
  - Revisar que la versión 2.6 no afirme nada que el código no haga.
  - Incluir `docs/requirements/modelo-datos-gradify-v2.drawio`.

**Commits:**

```text
chore: eliminar material obsoleto
docs: actualizar requisitos y modelo de datos a v2.6
```

**Aceptación:** `git status` limpio salvo lo que corresponda a la fase siguiente.

---

### Fase 2 — Corrección crítica: baja de universidades

**Duración estimada:** 2–3 h.  
**Riesgo:** alto si se toca sin tests.  
**Método:** TDD.

#### Backend

- [ ] Agregar test que falle para `deleteUniversity`:
  - [ ] 409 si hay carreras activas.
  - [ ] 409 si hay carreras **archivadas** (usar `includeArchived: true`).
  - [ ] 409 si hay institutos (`AcademicUnit`).
  - [ ] 404 si la universidad no existe.
  - [ ] 200 y borrado si no hay dependencias.
- [ ] Implementar en `backend/src/services/universityService.js`:
  - [ ] Importar `AcademicUnit`.
  - [ ] Validar `Career.exists({ university: id }).setOptions({ includeArchived: true })`.
  - [ ] Validar `AcademicUnit.exists({ university: id })`.
  - [ ] Crear errores de dominio con `statusCode = 409` y mensaje claro.
  - [ ] Borrar solo después de las dos guardas.
- [ ] Verificar que el controller devuelva 409 con el mensaje de dominio y 500 genérico ante errores internos.

#### Frontend

- [ ] Extraer `removeUniversity(university)` en `frontend/src/components/AdminCatalog.tsx`.
- [ ] Confirmar con `window.confirm`.
- [ ] `await request(...)` antes de tocar el estado.
- [ ] `setWorking(true)` y `finally { setWorking(false) }`.
- [ ] Actualizar la tabla **solo si el backend responde 2xx**.
- [ ] En error, `notify('danger', err.message)` y no borrar la fila.
- [ ] Limpiar `careerUniversityId`, `unitUniversityId`, `editUnitUniversityId` y `editCareerUniversityId` si apuntan a la universidad borrada.
- [ ] Agregar `aria-label` contextual: `Eliminar universidad ${university.name}`.
- [ ] Deshabilitar el botón mientras `working` es verdadero.

#### Tests y verificación

- [ ] Service tests en `backend/tests-jest/universityService.test.js` o archivo nuevo.
- [ ] Controller tests para 200, 409 y 404.
- [ ] 403 cubierto por `authAdmin.test.js`.
- [ ] Lint backend y frontend.
- [ ] Suite completa.
- [ ] Prueba manual: intentar borrar una universidad con carrera y ver el 409 en pantalla.

**Commit:**

```text
fix: validar y confirmar baja de universidades
```

**Aceptación:** el botón nunca muestra éxito si el backend falla; no se puede borrar una universidad con institutos o carreras, incluidas las archivadas.

---

### Fase 3 — Eliminar `UserProgress` muerto

**Duración estimada:** 45 min.  
**Riesgo:** bajo.

- [ ] Eliminar `backend/src/services/progressService.js`.
- [ ] Eliminar `backend/src/models/userprogress.js`.
- [ ] En `backend/src/controllers/progress.controllers.js`:
  - [ ] Quitar el import de `progressService`.
  - [ ] Quitar `saveProgress` y `getProgress`.
  - [ ] Dejar solo `parseHistory`.
  - [ ] Exportar solo `parseHistory`.
- [ ] Actualizar el comentario de `backend/src/routes/progress.routes.js`.
- [ ] Reescribir `backend/tests-jest/progressControllerErrors.test.js` para conservar solo el test de `parseHistory`.
- [ ] Buscar referencias residuales a `UserProgress`, `saveProgress`, `getProgress` y `progressService`.
- [ ] Ejecutar tests y lint.

**Commit:**

```text
refactor: eliminar progreso legado sin uso
```

**Aceptación:** no quedan imports ni tests apuntando al modelo eliminado; `/progress/parse-history` sigue funcionando.

---

### Fase 4 — Dependencias del backend

**Duración estimada:** 1–2 h.  
**Riesgo:** medio.

- [ ] Ejecutar `npm audit fix` **sin `--force`**.
- [ ] Verificar `npm audit --omit=dev` en 0.
- [ ] Reemplazar `yamljs` por `js-yaml` en `backend/src/app.js`.
  - [ ] `npm uninstall yamljs`
  - [ ] `npm install js-yaml`
  - [ ] Cambiar `YAML.load(swaggerFile)` por `yaml.load(fs.readFileSync(swaggerFile, "utf8"))`.
  - [ ] Verificar `/api-docs` y el arranque.
- [ ] Probar subida de PDF, preview y confirm si `multer` cambió de versión.
- [ ] Ejecutar tests Node, Jest y lint.
- [ ] Si una actualización rompe, pinear la versión anterior y documentar el riesgo.

**Commit:**

```text
fix(deps): actualizar dependencias vulnerables del backend
refactor: reemplazar yamljs por js-yaml
```

**Aceptación:** tests verdes, `/api-docs` responde y `npm audit --omit=dev` no reporta vulnerabilidades.

---

### Fase 5 — Dependencias y runtime del frontend

**Duración estimada:** 1–2 h.  
**Riesgo:** medio.

- [ ] Ejecutar `npm audit fix` sin `--force`.
- [ ] Actualizar `@types/node` a 26.
- [ ] Alinear Node 26:
  - [ ] Crear `.nvmrc` con `26`.
  - [ ] Cambiar `engines.node` a `>=26` en backend y frontend.
  - [ ] Probar si los tests siguen pasando sin `--experimental-strip-types`.
  - [ ] Si pasan, quitar el flag; si no, dejarlo y documentarlo.
- [ ] Ejecutar `tsc -b`, lint, tests y build a un directorio temporal.
- [ ] Si Vite 8.3.5 rompe, volver a 8.2.2 y documentar.
- [ ] Verificar que el build de producción no incluya source maps ni secretos.

**Commit:**

```text
fix(deps): actualizar dependencias del frontend
chore: alinear runtime y tipos con Node 26
```

**Aceptación:** build y tests verdes; `npm audit --omit=dev` en 0.

---

### Fase 6 — FAQ estática, sin IA

**Duración estimada:** 2–3 h.  
**Riesgo:** bajo.

**Archivos nuevos:**

```text
frontend/src/data/faq.ts
frontend/src/utils/faqSearch.ts
frontend/src/pages/Help.tsx
frontend/tests/faqSearch.test.mjs
```

- [ ] Cargar 12–15 preguntas en `faq.ts` con:
  - [ ] `id`, `category`, `question`, `answer`, `tags`, `link` opcional.
  - [ ] Categorías: importar plan, correlatividades, progreso, bajas, admin, cuenta.
- [ ] Implementar `faqSearch.ts`:
  - [ ] Normalizar mayúsculas, acentos y espacios.
  - [ ] Buscar en pregunta, respuesta y tags.
  - [ ] Ordenar por coincidencia.
  - [ ] Devolver todas si la consulta está vacía.
- [ ] Crear `Help.tsx`:
  - [ ] Buscador con `aria-label`.
  - [ ] Chips de preguntas sugeridas.
  - [ ] Acordeón accesible con `aria-expanded`.
  - [ ] Mensaje de “sin resultados”.
  - [ ] Enlaces a las pantallas correspondientes.
- [ ] Agregar la ruta `/ayuda` en `App.tsx` dentro del shell protegido.
- [ ] Agregar “Ayuda” en `AppSidebar.tsx`.
- [ ] Agregar el test al script `test` de `frontend/package.json`.
- [ ] Ejecutar tests, lint y build.

**Commit:**

```text
feat: agregar ayuda estática con buscador
```

**Aceptación:** la FAQ funciona sin backend, sin red y sin IA; el buscador encuentra por acento, mayúscula y tag.

---

### Fase 7 — Docker de producción, Mongo 8 y Redis 8

**Duración estimada:** 4–6 h.  
**Riesgo:** alto.  
**Requisito:** Fase 0 con Docker funcionando.

#### Artefactos

- [ ] `backend/Dockerfile.prod`: Node 26 Alpine, `npm ci --omit=dev`, usuario no root, `NODE_ENV=production`.
- [ ] `frontend/Dockerfile.prod`: build con Node 26 y runtime Nginx.
- [ ] `frontend/nginx.conf`: SPA fallback y proxy `/api` al backend.
- [ ] `compose.prod.yaml`: backend, frontend, Mongo 8, Redis 8, healthchecks, límites, logs rotados, redes internas.
- [ ] `.env.example` raíz con placeholders.
- [ ] `.env` raíz real, ignorado por git.
- [ ] `docs/DOCKER.md`.

#### Seguridad de producción

- [ ] Mongo con usuario y contraseña.
- [ ] Redis con `requirepass`.
- [ ] Backend con `read_only: true`, `tmpfs` para lo necesario y `no-new-privileges`.
- [ ] Puertos solo en loopback o detrás de Nginx.
- [ ] CORS y `TRUST_PROXY` configurados para el proxy.
- [ ] Sin secretos en imágenes ni en el repo.

#### Migración a Mongo 8

- [ ] `mongodump` del volumen actual `mongo_data`.
- [ ] Crear volumen nuevo `mongo8_data`.
- [ ] Arrancar `mongo:8.0` con el volumen nuevo.
- [ ] `mongorestore`.
- [ ] Comparar conteos e índices contra el dump.
- [ ] Dejar `mongo_data` intacto para rollback.
- [ ] Si Mongo 8 no arranca por AVX, usar `mongo:7.0` y repetir el runbook.

#### Verificación

- [ ] Desarrollo: `docker compose up --build`, 4 servicios healthy.
- [ ] Producción: `docker compose -f compose.prod.yaml up -d --build`.
- [ ] `/health` responde.
- [ ] Login con cookie funciona.
- [ ] Swagger responde si `API_DOCS_ENABLED=true`.
- [ ] Prueba negativa: sin cookie o con rol USER, 401/403.
- [ ] Borrar universidad con carrera devuelve 409.
- [ ] SPA fallback: recargar `/ayuda` y `/progreso` no da 404.
- [ ] Rate limit de login responde 429 tras el límite.

#### CI

- [ ] `.github/workflows/ci.yml` con:
  - [ ] Backend: `npm ci`, lint, tests Node, Jest.
  - [ ] Frontend: `npm ci`, lint, tests, build.
  - [ ] Docker: build de ambas imágenes.
  - [ ] Opcional: Newman contra servicios.

**Commits:**

```text
build: agregar imágenes de producción
build: migrar a Mongo 8 y Redis 8
ci: agregar workflow de calidad
docs: documentar Docker y operación
```

**Aceptación:** desarrollo y producción levantan; login, Swagger, 409 y SPA fallback funcionan; el volumen viejo sigue intacto.

---

### Fase 8 — Documentación verificable, Postman y E2E

**Duración estimada:** 4–6 h.  
**Riesgo:** medio.

#### Documentos

- [ ] Regenerar `docs/ARCHITECTURE.md`:
  - [ ] Contexto, componentes y capas.
  - [ ] Flujo de autenticación con cookie.
  - [ ] Modelo de datos real.
  - [ ] Endpoints principales.
  - [ ] Redis, IA de PDFs y cache.
  - [ ] Docker de desarrollo y producción.
- [ ] Regenerar `docs/requirements/Matriz-Trazabilidad.md`:
  - [ ] Requerimiento del BRD/FRD.
  - [ ] Archivo que lo implementa.
  - [ ] Test que lo prueba.
  - [ ] Estado: implementado, parcial o pendiente.
- [ ] Actualizar `README.md` y `backend/README.md`:
  - [ ] Instalación, dev, prod y tests.
  - [ ] Variables de entorno reales.
  - [ ] Enlaces a Swagger, Postman, Docker y TP.
- [ ] Actualizar `Test-Cases.md` con los números reales de la Fase 0 y los tests nuevos.
- [ ] Crear `docs/FAQ.md` con preguntas de usuario.

#### Postman

```text
docs/requirements/postman/
├── Gradify.postman_collection.json
├── Gradify.local.postman_environment.json
└── README.md
```

- [ ] Health.
- [ ] Registro y login con cookie.
- [ ] Universidades: GET, POST, PATCH, DELETE 200 y 409.
- [ ] Carreras, institutos y planes.
- [ ] Grafo y progreso.
- [ ] Tests `pm.test` por request.
- [ ] Variables: `baseUrl`, `adminEmail`, `adminPassword`, IDs creados.
- [ ] Correr `newman run` contra Docker y dejar la salida en `docs/TP/qa/newman.txt`.
- [ ] Si no se puede ejecutar, marcarla como “validada sintácticamente, no ejecutada”.

**Commits:**

```text
docs: regenerar arquitectura y matriz de trazabilidad
docs: actualizar README y documentación de API
test: agregar colección Postman verificada
```

**Aceptación:** cada afirmación de los documentos tiene evidencia; Newman termina con 0 fallos.

---

### Fase 9 — Materiales del TP y QA final

**Duración estimada:** 6–10 h, incluida la grabación.

```text
docs/TP/
├── PLAN-DE-TRABAJO.md
├── informe-final.md
├── presentacion.md
├── guion-demo.md
├── checklist-demo.md
├── enlaces.md
├── preguntas-frecuentes-defensa.md
└── qa/
```

- [ ] Informe final desde el documento externo actualizado y el `.drawio`.
- [ ] Presentación de 12–15 slides con las 10 secciones de la guía.
- [ ] Guion de demo de 3 minutos con tiempos.
- [ ] Checklist pre-demo, durante y plan B.
- [ ] 15 preguntas probables de la mesa con respuestas.
- [ ] Video de 3 minutos:
  - [ ] Grabar con OBS en segmentos.
  - [ ] Editar en Clipchamp.
  - [ ] Subtítulos en español.
  - [ ] Subir a YouTube no listado y a OneDrive.
  - [ ] Enlazar en `enlaces.md`.
- [ ] Ensayo completo de 10–12 minutos + 5 de preguntas.
- [ ] QA final:
  - [ ] Tests y lint.
  - [ ] Docker dev y prod.
  - [ ] Postman.
  - [ ] Enlaces del informe y la presentación.
  - [ ] Video reproducible en otra máquina.
  - [ ] `git status` limpio.
- [ ] Informe de QA en `docs/TP/qa/reporte-final.md`.

**Commits:**

```text
docs: agregar informe y presentación final
docs: agregar guion y checklist de demo
```

**Aceptación:** la presentación entra en 15 minutos, todos los integrantes tienen una parte y los números coinciden con `Test-Cases.md`.

---

## 5. Puertas de calidad

Después de **cada** fase con código:

- [ ] `cd backend && npm run lint`
- [ ] `cd backend && npm test`
- [ ] `cd backend && npm run test:jest`
- [ ] `cd frontend && npm run lint`
- [ ] `cd frontend && npm test`
- [ ] `cd frontend && npm run build`
- [ ] `npm audit --omit=dev` en backend y frontend
- [ ] `git diff` revisado antes de commitear

Después de Docker:

- [ ] `docker compose ps` con 4 servicios healthy en desarrollo.
- [ ] `docker compose -f compose.prod.yaml ps` con servicios healthy.
- [ ] Login con cookie, Swagger, 403/401, 409 y SPA fallback.
- [ ] Conteos e índices de Mongo iguales al dump.
- [ ] Volumen `mongo_data` viejo intacto.

Antes de la defensa:

- [ ] `newman run` con 0 fallos.
- [ ] Video probado en otra máquina.
- [ ] Enlaces del informe y la presentación probados.
- [ ] `git status` limpio.
- [ ] Ningún secreto en el repo.

---

## 6. Riesgos y planes B

| Riesgo | Control | Plan B |
|---|---|---|
| Docker daemon detenido | Iniciar Docker Desktop en Fase 0 | Demo en desarrollo con Vite |
| Mongo 8 no arranca por AVX | `docker run --rm mongo:8.0 mongod --version` | `mongo:7.0` con el mismo dump/restore |
| Redis 8 falla | Healthcheck y E2E de caché | `redis:7-alpine` |
| `@types/node` 26 rompe tipos | Commit aparte + `tsc -b` | Volver a 24; no afecta runtime |
| Vite 8.3.5 rompe build | Build a temporal | Pin 8.2.2 y documentar |
| `multer` 2.5 rompe upload | Probar preview y confirm | Pin 2.3.0 y documentar el audit |
| Auth de producción rompe login | Prueba negativa + cookie + CORS | Demo en desarrollo |
| La importación de PDF tarda | Tener un plan cargado | Mostrar el resultado y usar un clip del upload |
| Se acaba el tiempo | Fases 0–3 primero | Entregar FAQ y video como opcionales documentados |

---

## 7. Qué no se hace en esta etapa

- No se implementa IA para la FAQ.
- No se agrega una base vectorial.
- No se divide `AdminCatalog.tsx` ni se hace un refactor masivo de componentes.
- No se restauran los documentos viejos tal como estaban.
- No se hace push ni merge.
- No se promete cobertura del 80 % si no se mide.
- No se agregan dependencias nuevas sin justificarlo.

---

## 8. Primeros commits

```text
1. chore: eliminar material obsoleto
2. docs: actualizar requisitos y modelo de datos a v2.6
3. fix: validar y confirmar baja de universidades
4. refactor: eliminar progreso legado sin uso
```

---

## 9. Próxima acción

1. Aprobar este plan.
2. Ejecutar la Fase 0: iniciar Docker y correr la línea base.
3. Arrancar la Fase 1 con el commit de limpieza.

**No se toca código de producción hasta tener la línea base de tests.**
