# Gradify — Proyecto Integrador UNAHUR

Aplicación web para planificar carreras universitarias: se sube el PDF de un plan de estudios, se exploran las correlatividades entre materias y se hace seguimiento del avance académico.

Proyecto integrador de la materia **Programación - Informática (UNAHUR)**. El repositorio agrupa el **backend** (API REST) y el **frontend** (aplicación web).

## Funcionalidades

- Carga de planes de estudios a partir de un PDF.
- Visualización del plan en tablero y en grafo de correlatividades.
- Catálogo por instituto (Instituto → Carrera → Plan), con tecnicatura intermedia y articulación entre carreras.
- Seguimiento del progreso por materia con baja reversible de planes (quitar un plan conserva el avance).
- Panel de administración del catálogo, universidades, planes y materias, con validaciones para altas y bajas protegidas.
- Interfaz adaptable a escritorio, tablet y móvil; las vistas principales de grafo, tablero y progreso ajustan su presentación al ancho disponible.
- Ayuda de preguntas frecuentes en formato conversacional guiado: sugerencias y búsqueda local sobre respuestas disponibles, sin IA ni envío de consultas a servicios externos.

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
npm test                  # 45 pruebas unitarias
npm run test:jest         # 24 pruebas Jest
npm run validar           # todo: cobertura + golden --check + salud + masiva + correlativas (necesita API + corpus)
npm run test:cobertura    # 56 PDFs: 46 en la referencia + 10 excluidos con motivo (sin API)
npm run test:planes       # carga E2E de los 29 planes por la API real (las 17 correlativas quedan SKIP)
npm run test:correlativas # E2E de correlatividades: importa los 17 planes pares, parsea y limpia
npm run test:salud        # control de correlativas de Salud + control negativo
npm run snapshot:planes -- --check   # gate anti-regresiones del parser (46 golden, diff = 0)
```

Los scripts E2E crean un usuario de prueba, lo respaldan por JWT y lo borran al final;
como `preview`/`confirm` exigen ADMIN (v2.3), lo promueven por DB (no hay endpoint de
auto-promoción). `test:correlativas` crea un plan personal en borrador por cada par,
llama a `POST /study-plans/:id/parse-correlativas` y lo elimina en `finally`.
El corpus de PDFs vive fuera de git (patrón `files/`): en este workspace está en
`docs/files/UNAHUR-Oferta-Academica` (56 PDF: 46 de referencia y 10 excluidos con motivo).
Los scripts lo buscan por defecto en `files/UNAHUR-Oferta-Academica` en la raíz, aceptan
la carpeta histórica hermana `../files/UNAHUR-Oferta-Academica` y respetan `PLANES_DIR`
explícito. Sin corpus, los scripts masivos salen con mensaje claro (código 2). La
referencia, el golden y `test:salud` resuelven cada PDF por nombre de archivo, aunque el
corpus se reordene. `test:cobertura` cierra el corpus: todo PDF que no esté en la
referencia debe estar en `docs/testing/pdf-sin-referencia.json` con un motivo (si aparece
uno sin clasificar, falla con la ruta exacta).

Para validar el frontend, ejecutar `npm run build`, `npm run lint` y los tests `npm run test:faq`, `test:status`, `test:graph`, `test:layout`, `test:subjects`, `test:color` y `test:theme` desde `frontend/`.

## Integrantes

| Integrante | Email | GitHub |
| ---------- | ----- | ------ |
| Pablo Perugini | pablochristian.perugini@estudiantes.unahur.edu.ar | [@PabloPerugini](https://github.com/PabloPerugini) |
| Joaquín Masgo Sandoval | joaomasgosandoval@gmail.com | — |
| Eliel Remonda | elieldario.remonda@estudiantes.unahur.edu.ar | — |
| Dylan Cotera | dylancotera@gmail.com | [@dylancotera](https://github.com/dylancotera) |
