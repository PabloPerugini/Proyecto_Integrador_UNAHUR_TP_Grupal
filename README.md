# Gradify — Proyecto Integrador UNAHUR

Aplicación web para planificar carreras universitarias: se sube el PDF de un plan de estudios, se exploran las correlatividades entre materias y se hace seguimiento del avance académico.

Proyecto integrador de la materia **Programación - Informática (UNAHUR)**. El repositorio agrupa el **backend** (API REST) y el **frontend** (aplicación web).

## Funcionalidades

- Carga de planes de estudios a partir de un PDF.
- Visualización del plan en tablero y en grafo de correlatividades.
- Seguimiento del progreso por materia y por carrera.
- Panel de administración de planes y materias.

## Estructura del repositorio

```
.
├── CHANGELOG.md    # Mejoras técnicas por fecha
├── docs/
│   ├── requirements/  # BRD y FRD (requerimientos de negocio y funcionales)
│   └── adr/           # Registros de decisiones de arquitectura
├── backend/    # API REST (Node.js + Express + MongoDB + Redis)
└── frontend/   # Aplicación web (React + Vite + TypeScript)
```

Cada carpeta tiene su propio `README.md` con instrucciones de instalación y ejecución.

## Documentación

- [BRD — Documentación de Requerimientos de Negocio](./docs/requirements/BRD.md)
- [FRD — Documentación de Requerimientos Funcionales](./docs/requirements/FRD.md)
- [ADRs — Decisiones de arquitectura](./docs/adr/)
- [CHANGELOG — Mejoras por fecha](./CHANGELOG.md)

## Tecnologías

| Capa     | Stack                                                       |
| -------- | ----------------------------------------------------------- |
| Backend  | Node.js 20+, Express, MongoDB (Mongoose), Redis           |
| Frontend | React 19, TypeScript, Vite, React Router 7, Bootstrap 5     |

## Arranque rápido

```bash
# Backend (puerto 3000)
cd backend
npm install
cp .env.Ejemplo .env
npm run dev

# Frontend (puerto 5173)
cd frontend
npm install
npm run dev
```

- API: `http://localhost:3000`
- Documentación Swagger: `http://localhost:3000/api-docs`
- Frontend: `http://localhost:5173`

## Integrantes

| Integrante | Email | GitHub |
| ---------- | ----- | ------ |
| Pablo Perugini | pablochristian.perugini@estudiantes.unahur.edu.ar | [@PabloPerugini](https://github.com/PabloPerugini) |
| Marcos | marcos241098@gmail.com | — |
| Joaquín Masgo Sandoval | joaomasgosandoval@gmail.com | — |
| Román Renaud | romanrenaud13@gmail.com | [@RomanRenaud](https://github.com/RomanRenaud) |
| Eliel Remonda | elieldario.remonda@estudiantes.unahur.edu.ar | — |
| Dylan Cotera | dylancotera@gmail.com | [@dylancotera](https://github.com/dylancotera) |
