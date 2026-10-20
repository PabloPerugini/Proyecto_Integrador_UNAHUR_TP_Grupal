# Gradify — Proyecto Integrador UNAHUR

Aplicación web para planificar carreras universitarias: se sube el PDF de un plan de estudios, se exploran las correlatividades entre materias y se hace seguimiento del avance académico.

Proyecto integrador de la materia **Programación - Informática (UNAHUR)**. El repositorio agrupa el **backend** (API REST) y el **frontend** (aplicación web).

## Funcionalidades

- Carga de planes de estudios a partir de un PDF.
- Visualización del plan en tablero y en grafo de correlatividades.
- Catálogo por instituto (Instituto → Carrera → Plan), con tecnicatura intermedia y articulación entre carreras.
- Seguimiento del progreso por materia con baja reversible de planes (quitar un plan conserva el avance).
- Panel de administración del catálogo, planes y materias (nombre por plan editable), con validaciones compartidas entre Registro y Mi cuenta.

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
| Backend  | Node.js 22+, Express, MongoDB (Mongoose), Redis           |
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
npm test                  # unitarios (32): matcher, anti-ciclos, RN04, AR-3, registro/roles, seguridad, intermedio
npm run validar           # todo: cobertura + golden --check + salud + masiva (necesita API + corpus)
npm run test:cobertura    # cada PDF de files/ está en la referencia o excluido con motivo (sin API)
npm run test:planes       # carga E2E de los 43 PDFs por la API real
npm run test:salud        # control de correlativas de Salud + control negativo
npm run snapshot:planes -- --check   # gate anti-regresiones del parser (diff = 0)
```

Los scripts E2E crean un usuario de prueba, lo respaldan por JWT y lo borran al final;
como `preview`/`confirm` exigen ADMIN (v2.3), lo promueven por DB (no hay endpoint de
auto-promoción). El corpus de PDFs (`files/UNAHUR-Oferta-Academica`, 43 PDF de referencia
en subcarpetas por carrera, ignorado por git) vive en la raíz del repo: sin él los scripts
masivos salen con mensaje claro (código 2). La referencia y `test:salud` resuelven cada
PDF por nombre de archivo, aunque el corpus se reordene. También se acepta la carpeta
histórica hermana `../files/UNAHUR-Oferta-Academica` o `PLANES_DIR` explícito.
`test:cobertura` cierra el corpus: todo PDF que no esté en la referencia debe estar en
`docs/testing/pdf-sin-referencia.json` con un motivo (si aparece uno sin clasificar,
falla con la ruta exacta).

## Integrantes

| Integrante | Email | GitHub |
| ---------- | ----- | ------ |
| Pablo Perugini | pablochristian.perugini@estudiantes.unahur.edu.ar | [@PabloPerugini](https://github.com/PabloPerugini) |
| Marcos | marcos241098@gmail.com | — |
| Joaquín Masgo Sandoval | joaomasgosandoval@gmail.com | — |
| Román Renaud | romanrenaud13@gmail.com | [@RomanRenaud](https://github.com/RomanRenaud) |
| Eliel Remonda | elieldario.remonda@estudiantes.unahur.edu.ar | — |
| Dylan Cotera | dylancotera@gmail.com | [@dylancotera](https://github.com/dylancotera) |
