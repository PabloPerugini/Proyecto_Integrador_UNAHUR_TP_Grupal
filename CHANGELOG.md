# Changelog del Proyecto

**Proyecto:** Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico (UNAHUR — TP Integrador Academia)

El registro histórico de requisitos/alcance por versión se mantiene en [BRD.md](docs/requirements/BRD.md#1-historial-de-cambios) y [FRD.md](docs/requirements/FRD.md#1-historial-de-cambios). Este archivo rastrea las mejoras técnicas por fecha.

---

## [1.2] — 2026-09-20

### Documentación (IA + lector de PDF)
- **BRD.md** y **FRD.md** pasan a **v1.2**: restricciones y dependencias del lector de PDF (soporte del formato columnar compacto de Informática y fila de totales no importada), dependencias de IA y criterios de bondad. Se deja constancia de que, **al día de la fecha, la IA se usa en la carga de PDFs** (matching semántico de correlativas por embeddings, local y sin API); el chat del orientador (historia US-04) queda como **endpoint backend disponible, con UI planeada** en SC002.
- **Reorganización de docs**: `BRD.md`/`FRD.md` → `docs/requirements/`; nuevos **ADRs** en `docs/adr/` (ADR-0001 auth por cookie JWT sin roles; ADR-0002 IA en carga de PDFs, chat planeado). Links actualizados en `README.md` y `CHANGELOG.md`.

---

## [1.1] — 2026-09-20

### IA — orientador académico
- **Nuevo** `backend/src/services/ai.service.js`: chat multi-proveedor con **fallback en cascada** (Groq → Gemini → Ollama), modelo/configurable por env (`GROQ_API_KEY`, `GEMINI_API_KEY`, `OLLAMA_URL`), timeout de 30 s por proveedor y **caché en Redis por 7 días**.
- **Nuevo** `backend/src/services/embeddings.service.js`: embeddings **locales** con `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2`), similitud coseno y umbral mínimo configurable (`EMBEDDINGS_MIN_SIMILARITY`, default 0.8).
- **Nuevo** `POST /careers/:id/chat` (requiere auth): orientador académico que conoce el plan real de la carrera (código | materia | año | créditos | requiere); `400` sin prompt, `503` si no hay proveedor configurado, respuesta cacheada por hash sha256 del prompt. Devuelve `{ reply, provider, ms, cached, careerId, subjects }`.
- **Matching semántico de correlativas:** `enrichSemantic` en `career.controllers.js` usa embeddings para casar materias que el matching clásico (exacto, compacto, Levenshtein, prefijo) no pudo resolver por sinonimia.
- Nuevas dependencias: `@xenova/transformers`.
- > **Uso real al cierre del día:** el chat quedó como endpoint backend (documentado en swagger) **sin interfaz en el frontend**. En la práctica la IA hoy se usa en la **carga de PDFs**: el matching semántico (`enrichSemantic`) resuelve correlativas que el algoritmo clásico no casa.

### Lector de PDF — ingesta de planes (+584 líneas en `pdfParser.service.js`)
- **Fila de totales corregida:** líneas de cierre "TÍTULO: … / TÍTULO DE GRADO: …" con sumas de horas/créditos ya no se parsean como materias (eliminaba materias fantasma OF02x con 1903 créditos y créditos fake de +300/+142 en Electromovilidad y Metalurgia).
- **Nuevo formato "plan columnar compacto":** una fila = una materia (p. ej. "1 Matemática para informática I") con 4 columnas de horas + créditos + correlativas numéricas + equivalencias/nombre anterior. Soporta los planes "para comunicar"/"para web" de **Informática** (IA, Ciberseguridad, Videojuegos, Hojas de cálculo de Google).
- **Escaneo de cabecera mejorado:** en páginas donde la tabla arranca arriba sin leyenda, se sigue subiendo para capturar las etiquetas de horas/total en vez de cortar al primer dato.
- **Trayectos/áreas de formación:** mapeo `TRAJECTORY_GENERIC` al campo `generic` (solo códigos existentes en el enum; el resto queda como trayecto textual) y detección de tokens de trayecto dentro de las filas.
- **Modelo `Subject`:** nuevo campo `trayecto` (texto libre) manteniendo `generic` como enum.
- Las rutas `parse-official`, `parse-correlativas` y `parse-history` ahora requieren autenticación.

### Seguridad y autenticación (backend + frontend)
- Sesión por **token JWT en cookie `httpOnly`** (`SameSite: Lax`, `Secure` en producción) mediante cookie-parser.
- Registro con **auto-login**; login/logout/`GET /users/me`; logout limpia la cookie.
- Contraseñas con **hash bcrypt** (10 rondas) — `backend/src/models/user.js`.
- Rutas autenticadas devuelven **401** ante cookie ausente/inválida/expirada; el frontend cierra sesión y redirige al login.
- Eliminación del endpoint público **`GET /users`** (exponía datos personales, PII).
- **Sin distinción de roles**: un único perfil autenticado puede gestionar carreras y su propio progreso (403 al editar/eliminar un perfil ajeno).

### Frontend (calidad 2026)
- Sesión en `AuthContext` basada en cookies (estado `loading/authed/guest`); `ProtectedRoute`/`AuthShell` con estado de carga.
- `api/client.ts` reescrito (credenciales siempre incluidas, evento `auth:unauthorized`, errores amigables).
- `TypeScript strict` habilitado y reglas ESLint `react-hooks/set-state-in-effect` + `react-refresh/only-export-components` en `error`.
- Eliminación de código muerto/campos obsoletos en `types`, refactor de efectos en `PlanAdmin`/`PlanGraph`/`useCareers`.
- Divisiones de contexto en módulos `*ContextValue.ts` (compatibilidad HMR) + hook `useCareerSelection`.

### Documentación
- `backend/docs/swagger.yaml` reescrito a **v2.0** alineado con la API real (auth por cookie, `/chat`, parse-correlativas, sin `birthdate`, sin `GET /users`). Validado como OpenAPI 3.0 y servido en `/api-docs`.
- **BRD.md** y **FRD.md** actualizados a **v1.1**: nota de decisión de diseño (roles), requisitos de seguridad (§4.3 FRD), ajuste de US-01 y SC001.
- **Nuevo** `CHANGELOG.md`: registro de mejoras por fecha.

### Verificación
- `npm run lint` limpio; `tsc -b` y `vite build` OK; smoke tests de autenticación (registro → me → logout → 401) y de rutas protegidas (401 sin cookie).
- **Pendiente de verificar una vez configuradas las keys de IA (GROQ/GEMINI/OLLAMA):** `POST /careers/:id/chat` y el enriquecimiento semántico de correlativas.

---

## [1.0] — 2026-09-10

- Versión inicial del proyecto: alcance definido y documentación de inicio (BRD/FRD v1.0).