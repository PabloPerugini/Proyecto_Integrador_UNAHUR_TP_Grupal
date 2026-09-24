# Changelog del Proyecto

**Proyecto:** Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico (UNAHUR — TP Integrador Academia)

El registro histórico de requisitos/alcance por versión se mantiene en [BRD.md](docs/requirements/BRD.md#1-historial-de-cambios) y [FRD.md](docs/requirements/FRD.md#1-historial-de-cambios). Este archivo rastrea las mejoras técnicas por fecha y solo registra lo que existe en la aplicación.

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
