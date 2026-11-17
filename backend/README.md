# Backend - Proyecto Integrador UNAHUR

API REST hecha con Node.js + Express + MongoDB + Redis. Provee la carga y el parseo de planes de estudio (preview sin guardar + confirm con resolución de correlativas), grafo y sugerencias AR-3, y el progreso por usuario con auth JWT (roles USUARIO/ADMIN).

## Requisitos

- Node.js 22+
- MongoDB y Redis (los levanta el compose de la raíz) o Docker Compose

## Instalación y ejecución

```bash
npm install
cp .env.Ejemplo .env

# Opción 1: todo el proyecto con un comando (desde la raíz del repo)
docker compose up --build

# Opción 2: solo este servicio (necesitás Mongo y Redis corriendo)
npm run dev
```

Una vez iniciado:

- API en `http://localhost:3000`
- Documentación Swagger en `http://localhost:3000/api-docs` (OpenAPI 3.0.3, versión 2.1.0)

## Pruebas

```bash
npm test                  # 45 pruebas unitarias con node:test (9 archivos)
npm run test:jest         # 24 pruebas Jest
npm run validar           # cobertura + golden --check + salud + masiva + correlativas
npm run test:cobertura    # 56 PDFs: 46 en la referencia + 10 excluidos con motivo (sin API)
npm run test:planes       # E2E de los 29 planes (las 17 correlativas quedan SKIP)
npm run test:correlativas # E2E de los 17 pares de correlatividades (importa, parsea y limpia)
npm run test:salud        # control de correlativas de Salud + control negativo
npm run snapshot:planes -- --check   # regresión del parser: 46 golden, diff = 0
```

Los scripts masivos requieren API y corpus; `test:cobertura` y `snapshot:planes` solo
corpus. El corpus se busca en `files/UNAHUR-Oferta-Academica` (raíz), en la carpeta
histórica `../files/...` o en `PLANES_DIR`; en este workspace está en
`docs/files/UNAHUR-Oferta-Academica`.

## Estructura

```
src/
├── main.js            # Punto de entrada (inicia server + DB + cache)
├── app.js             # Configuración de Express (CORS, JSON, rutas, errores)
├── routes/            # Definición de rutas (index + por recurso)
├── controllers/       # Lógica de los endpoints (*.controllers.js)
├── models/            # Modelos Mongoose
├── middlewares/       # Validaciones y helpers por ruta
├── services/          # Lógica transversal (ej: cache.service)
└── config/            # Conexiones (mongo, redisClient)
tests/                 # Unitarios con node:test
tests-jest/            # Pruebas Jest (API con supertest)
scripts/               # Validaciones E2E, golden, seed y utilidades del corpus
```

## Reglas de estilo

- Mensajes de error en español, con formato `{ success: false, error: { message, details? } }`.
- Nombres de archivo: `recurso.controllers.js`, `recurso.routes.js`, modelos en minúscula singular (`career.js`).
- Auth JWT (Bearer + cookie `token`): mutaciones de catálogo solo ADMIN, planes e importaciones con dueño (`authStudyPlanOwnerOrAdmin` / `Viewer`).