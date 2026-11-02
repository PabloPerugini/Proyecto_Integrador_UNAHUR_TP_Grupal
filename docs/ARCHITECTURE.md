# Arquitectura de Gradify-UNAHUR

## Resumen
Gradify-UNAHUR es una plataforma web full-stack que permite a los estudiantes universitarios registrar materias, gestionar sus progresos académicos, visualizar rutas de estudio y explorar programas de diferentes carreras.

## Tecnologías principales

### Backend (Node.js/Express)

#### Servicio de Autenticación
- **Archivo:** `backend/src/services/authService.ts`
- **Descripción:** Gestiona el registro, inicio de sesión, cierre de sesión y recuperación de contraseña.
- **Patrón:** Singleton con decorador que añade manejo de logs y control de tasa.

#### Servicio de Universidades
- **Archivo:** `backend/src/services/universityService.ts`
- **Descripción:** CRUD de universidades, indexado por nombre, normalización de slugs.

#### Servicio de Carreras
- **Archivo:** `backend/src/services/careerService.ts`
- **Descripción:** Creación, actualización y búsqueda de carreras con verificación de pertenencia a unidades académicas.

#### Servicio de Planes de Estudio
- **Archivo:** `backend/src/services/studyPlanService.ts`
- **Descripción:** Crea planes oficiales desde POST `/study-plans`, ignora el body, devuelve plan con estado `published` y `createdBy: null`.

#### Servicio de Sujeto de Progreso
- **Archivo:** `backend/src/services/subjectProgressService.ts`
- **Descripción:** Registra cada materia tomada por un usuario: carga plana de materias (ParseHistory), carga incremental (SubmitProgress), apagado/atraso de progreso, visualización de progreso personal, cierre de materias.

#### Manejo de Sesión y Cookies
- **Archivo:** `backend/src/utils/session.ts`
- **Descripción:** Genera ID de sesión aleatorios, signos de vida con expiración, renovación automática al cada 30 minutos, eliminación segura al cerrar sesión.

#### Correo Electrónico
- **Archivo:** `backend/src/utils/email.ts`
- **Descripción:** Envía correo para restablecimiento de contraseña, apoyo transaccional (confirmaciones, notificaciones).

#### Manejo de Errores
- **Archivo:** `backend/src/middleware/errorHandler.ts`
- **Descripción:** Error 400 con cuerpo detallado (mensaje, path, query), 401 para autenticación fallida, 403 para autorización, 404 para no encontrado, 413 para payload grande (>1MB), 429 para rate limiting, 500 genérico con mensaje seguro.

#### Rate Limiting
- **Archivo:** `backend/src/middleware/rateLimit.ts`
- **Descripción:** Limiter de 5/min por usuario, 15/min por IP, 30/min por email de recuperación, reset al vencer cookie de sesión, proteger rutas críticas (`/login`, `/register`, `/users/me`, `/progress`, `/study-plans`).

#### Sanitización de Cuerpos
- **Archivo:** `backend/src/middleware/bodySanitizer.ts`
- **Descripción:** Revisa todos los cuerpos entrantes: strings vacíos → null, strings solo espacios → null, removes leading/trailing whitespace, en arrays: filtra vacíos, en strings: limítate a caracteres permitidos por regex.

#### Normalización y Validación
- **Archivo:** `backend/src/utils/normalize.ts`
- **Descripción:** Normaliza nombres de entidades (institutos, carreras, materias) para indexación y búsqueda.

#### Utility de Tarjetas
- **Archivo:** `backend/src/utils/card.ts`
- **Descripción:** Calcula y provee la información de la tarjeta para planes de estudio (color de carrera, título, número de materias, años, créditos, si es publicado/borrador).

#### utilidades de camino
- **Archivo:** `backend/src/utils/path.ts`
- **Descripción:** Resolver ciclos en grafos, realizar búsqueda en profundidad (DFS) para camino efectivo, calcula camino crítico, costos de arco entre ANUAL/OTRA (2), materias bloqueadas, datos efectivos.

### Servidor Express

#### Rutas (API)
- `src/routes/auth.ts`, `src/routes/users.ts`, `src/routes/careers.ts`, `src/routes/academicUnits.ts`, `src/routes/studyPlans.ts`, `src/routes/progress.ts`

#### Configuración
- `src/config/index.ts`: variables de entorno, limits, API_DOCS_ENABLED, TRUST_PROXY, baseUrl
- `src/config/limits.ts`: limits de bodySize, rate limiting, timeout, custom headers
- `src/config/cors.ts`: mismo origin, frontends, credenciales permitidos, métodos,

#### Base de Datos
- **Driver:** MongoDB (Mongoose) en Atlas
- **Modelos:** `University`, `AcademicUnit`, `Career`, `Subject`, `StudyPlan`, `User`, `UserStudyPlan`, `SubjectProgress`

### Frontend (React + TypeScript)

#### Contexto y Estado
- `src/context/ThemeContext.tsx`: proveedor de tema oscuro/claro con preferencia localStorage
- `src/context/CareerContext.tsx`: carrera seleccionada actualmente (para navegación)
- `src/context/AuthContext.tsx`: usuario autenticado, tokens, proveedor con renovación automática

#### API
- `src/api/index.ts`: cliente centralizado con interceptores, endpoint base de VITE_API_URL, decodificación automática de JSON.

#### Componentes (página única)
- `src/pages/AdminUsers.tsx`: listado de usuarios, paginación, búsqueda, eliminación, sin ocultar tabla (B5), formulario de cambio de password (B7).

#### Componentes de UI (sin estado)
- `src/components/PageHeader.tsx`, `src/components/PageLoader.tsx`, `src/components/PageSuspense.tsx`, `src/components/ErrorBoundary.tsx`
- `src/components/MessageBanner.tsx`, `src/components/FormField.tsx`, `src/components/AdminCatalog.tsx`

#### Componentes de Plan y Progreso
- `src/pages/PlanGraph.tsx`: grafo react-flow para visualización efectiva y camino óptimo (D2), plan de estudio completo.
- `src/pages/PlanAdmin.tsx`: administrador de planes (crear/editar), `src/pages/UploadPlan.tsx`: cargador de PDF para parseo de correlatividades (ParsePDF).
- `src/pages/Home.tsx`: inicio principal, selector de instituto/carrera/plan.
- `src/pages/MyProgress.tsx`: progreso personal de materias, avanzar/revertir, errores y notificaciones centrados en user flow (B3).
- `src/pages/Account.tsx`: editar perfil, cambiar password, vista de progreso (integración del backend como fuente de verdad D2).

#### Servicios
- `src/services/subjectProgress.ts`: actualiza progreso en backend para registro incremental, manejo de conflictos optimista, throttling de requests.
- `src/services/planGraph.ts`: obtiene grafo efectivo desde backend con target, mapea a estado react-flow.

#### Utilitarios
- `src/utils/subjects.ts`: helpers de subjects: normalización, titleCase, instituteColor, etc.
- `src/utils/careerName.ts`: parseo inteligente de nombres de carreras con instituteFromCareer.
- `src/utils/userValidation.ts`: validación alineada con Joi (B15).

#### Test / Lint / Build
- `frontend/package.json`: scripts `test`, `lint`, `build`.
- `frontend/eslint.config.js`, `frontend/tsconfig.json`.

## Técnicas y Patrones

### Experiencia de Usuario (UX)
- Navegación del flujo de tableros paso a paso (Instituto → Carrera → Plan), con sesión y progreso persistido.
- Visualización del grafo del plan: materias como nodos, correlatividades como aristas; puede navegar por caminos, marcar progreso y ver camino efectivo (D2) con colores semánticos.
- Edición en línea de colores de institutos (vista en tabla con selector de color por fila).
- Administración central: institutos, universidades, carreras, articulación.
- Panel de progreso personal: visualización de progreso individual, avanzar/revertir materias, seguimiento de correlativas.

### Arquitectura de Software
- Arquitectura basada en servicios: backend como monolito MVC (modelos, servicios, rutas), con middlewares, rate limiting y error handling centralizado.
- Arquitectura de frontend: estructura React clásica con componentes sin estado, Context para tema y auth, gestión de estado por componente con hooks personalizados.
- Nombres de archivos convencionales: camelCase para funciones, PascalCase para componentes, snake_case para utilidades.
- Calidad del código: componentes <300 líneas, reglas TypeScript estrictas, TDD, linting, ESLint, commits convencionales, PR <400 líneas.

### Escalabilidad y Rendimiento
- Rate limiting: por usuario, IP y email.
- Carga perezosa de detalles de materias y tecnicaturas.
- Grafo efectivo: algoritmo DFS con costo ponderado y ciclos rotos.
- Sin Redis, sin cache, sin optimización compleja.

### Seguridad y Confiabilidad
- Campos de contraseña en base de datos cifrados con Argon2id (bcrypt con pepper).
- Tokens JWT con refresh, cookie HttpOnly + SameSite Strict.
- Validación de entrada: Yup en backend (schema por ruta), Zod en frontend (validación en tiempo real).
- Validación idempotente y safe-repeat para acciones del usuario.
- Envío seguro de correos (sin exposición de claves).

### Resiliencia
- Timeouts y fallbacks en todas las llamadas a la API.
- Manejo robusto de errores con mensajes seguros para usuarios.
- Manejo de errores en API: mensajes personalizados por endpoint, límites de tamaño de payload.
- Paginación y búsqueda para listados pesados (usuarios, carreras).

## Documentación

### Documentación Técnica
- `docs/ARCHITECTURE.md`: esta arquitectura, tecnologías, patrones, nombres de archivos.
- `docs/CSS.md`: apunte de CSS, 10 partials incluidos (`index.css`, `graph.css`, `graph-dark.css`, etc.).
- `Gradify_Documentacion.md`: guía de usuario, casos de uso, pasos a paso, dashboards.

### Documentación para Desarrolladores
- `README.md`: instalación local, inicio rápido, estructura del repositorio, scripts.
- `backend/README.md`: cómo levantar backend, claves .env.
- `frontend/README.md` (si existe): despliegue, CI/CD, testing.

### Auditoría de Calidad
- `docs/AUDITORIA-2026-10-30.md`: matriz de afirmaciones, prioridades A1-A22, B1-B24, C1-C4, estado por tarea.
- `CAMBIOS.md`: informe final por afirmación, archivos tocados, decisiones.
- `docs/requirements/Gradify-UNAHUR.drawio.pdf`: diagrama de flujo del sistema (si está en .gitkeep).

## Proceso y Flujo de Trabajo

### Proyecto Inicial
1. Clonar repositorio
2. `cd backend` → `npm install` → `cp .env.example .env` → editar variables de entorno (JWT_SECRET, DB_URL, etc.)
3. `cd ../frontend` → `npm install` → editar `VITE_API_URL` en `frontend/src/vite-env.d.ts`
4. `npm run build` (backend) y `npm run build` (frontend) para asegurar calidad del código
5. `npm run test` en ambos lados

### Ciclo de Desarrollo
- Utilizar ramas funcionales con nombres de feature: `feature/<nombre>`, squash-and-merge.
- Commits convencionales: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- PRs restringidos: al menos 1 revisor, solo código revisado, approvals automáticas para dependientes.

### Construcción
- `npm run build` (frontend) → `vite build` → entrega estática.
- `npm run build` (backend) → `tsc -b` + `node --check` → `nest build` (si existe).

### Pruebas
- `npm run lint` (ESLint, TypeScript strict).
- `npm run test` → test runner Node (Jest) para backend, test runner Node (--test) para frontend, test coverage >80%.

### Despliegue
- Backend: `docker build -f Dockerfile.backend .` → push a AWS ECR / Render / Railway / Railway Postgres + Redis.
- Frontend: `docker build -f Dockerfile.frontend .` → push a AWS S3 + CloudFront.

### Inspección y Monitoreo
- Backend: `/health`, `/metrics` (si implementado), `/api-docs` si `API_DOCS_ENABLED=true`.
- Frontend: logs de React, Chrome DevTools, netlify/Vercel analytics.

## Tareas Prioritarias

### P0: Fundamentos
- Autenticación, rate limiting, manejo de errores, Swagger.

### P1: Datos y Correlativas
- parseo histórico de PDF, registro incremental, historial de progreso, inscripción en planes, tarjetas de planes con estado.

### P2: Visibilidad y UI
- Control centralizado de visibilidad, limpieza de código muerto, corrección de UI accesibilidad y calidad (B5-B24).

### P3: Refactors y Documentación
- Extraer solo lo indicado, manteniendo comportamiento y rutas (B20-B23).
- Unificar `loadProgress` (B24).
- Documentación (C1-C4).

### P4: Optimización y Despliegue
- Separación de código, lazy loading, dependencias, compilación de Node a binario.
- CI/CD, autoscaling, planes de respaldo.

### P5: Monitor y Alertas
- Métricas, alertas, sondas, SLOs.

## Agradecimientos
- Gracias a los contribuidores, a la comunidad open-source, a la Universidad Nacional de Hurlingham por la colaboración y financiamiento.
- Para soporte técnico: consultar `docs/ARCHITECTURE.md` o el README.