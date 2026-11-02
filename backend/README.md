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

# Lint
npm run lint
```

Una vez iniciado:

- API en `http://localhost:3000`
- Documentación Swagger en `http://localhost:3000/api-docs` (v2.1, ~30 paths). En producción queda apagada por defecto: `API_DOCS_ENABLED=true` la habilita y `API_DOCS_ENABLED=false` la fuerza apagada en cualquier entorno.

### Variables nuevas

- `TRUST_PROXY`: activa la confianza en proxy inverso para leer la IP real del cliente; usado por rate limiting (`config/limits.js`).
- `PARSE_DEBUG`: habilita los logs del parser de PDF (inspección de correlatividades).

## Estructura

```
src/
├── main.js            # Punto de entrada (inicia server + DB + cache)
├── app.js             # Configuración de Express (CORS, JSON, rutas, errores)
├── routes/            # Definición de rutas (index + por recurso)
├── controllers/       # Lógica de los endpoints (*.controllers.js)
├── models/            # Modelos Mongoose
├── middlewares/       # Validaciones y helpers por ruta
├── services/          # Lógica transversal; pdf/ separa los parsers por documento
└── config/            # Conexiones (mongo, redisClient)
```

## Reglas de estilo

- Mensajes de error en español, con formato `{ success: false, error: { message, details? } }`.
- Nombres de archivo: `recurso.controllers.js`, `recurso.routes.js`, modelos en minúscula singular (`career.js`).
- Auth JWT (Bearer + cookie `token`): mutaciones de catálogo solo ADMIN, planes e importaciones con dueño (`authStudyPlanOwnerOrAdmin` / `Viewer`).