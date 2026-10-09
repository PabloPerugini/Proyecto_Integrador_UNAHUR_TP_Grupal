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
├── backend/    # API REST (Node.js + Express + MongoDB + Redis)
└── frontend/   # Aplicación web (React + Vite + TypeScript)
```

Cada carpeta tiene su propio `README.md` con instrucciones de instalación y ejecución.

## Tecnologías

| Capa     | Stack                                                       |
| -------- | ----------------------------------------------------------- |
| Backend  | Node.js 20+, Express, MongoDB (Mongoose), Redis           |
| Frontend | React 19, TypeScript, Vite, React Router 7, Bootstrap 5     |

## Arranque rápido



**Importante:** Docker debe estar abierto y ejecutándose antes de levantar el proyecto

### Iniciar el proyecto

Desde la carpeta raíz del proyecto:

```bash
# Crear el archivo de variables de entorno del backend
cp backend/.env.Ejemplo backend/.env

# Levantar todos los servicios con Docker
docker compose up --build
```

- API: `http://localhost:3000`
- Documentación Swagger: `http://localhost:3000/api-docs`
- Frontend: `http://localhost:5173`

### Validar y testear (backend)

```bash
cd backend
npm test                  # unitarios: matcher, anti-ciclos, BUG-009, AR-3
npm run validar           # todo: golden --check + salud + masiva (necesita API + corpus)
npm run test:planes       # carga E2E de los 43 PDFs por la API real
npm run test:salud        # control de correlativas de Salud + control negativo
npm run snapshot:planes -- --check   # gate anti-regresiones del parser (diff = 0)
```

El corpus de PDFs (`files/UNAHUR-Oferta-Academica`, 43 archivos, ignorado
por git) vive en la raíz del repo: sin él los scripts masivos salen con
mensaje claro (código 2). También se acepta la carpeta histórica hermana
`../files/UNAHUR-Oferta-Academica` o `PLANES_DIR` explícito.

## Integrantes

| Integrante | Email | GitHub |
| ---------- | ----- | ------ |
| Pablo Perugini | pablochristian.perugini@estudiantes.unahur.edu.ar | [@PabloPerugini](https://github.com/PabloPerugini) |
| Marcos | marcos241098@gmail.com | — |
| Joaquín Masgo Sandoval | joaomasgosandoval@gmail.com | — |
| Román Renaud | romanrenaud13@gmail.com | [@RomanRenaud](https://github.com/RomanRenaud) |
| Eliel Remonda | elieldario.remonda@estudiantes.unahur.edu.ar | — |
| Dylan Cotera | dylancotera@gmail.com | [@dylancotera](https://github.com/dylancotera) |
