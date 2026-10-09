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
- Documentación Swagger en `http://localhost:3000/api-docs` (v2.0, ~30 paths)

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
```

## Reglas de estilo

- Mensajes de error en español, con formato `{ success: false, error: { message, details? } }`.
- Nombres de archivo: `recurso.controllers.js`, `recurso.routes.js`, modelos en minúscula singular (`career.js`).
- Auth JWT (Bearer + cookie `token`): mutaciones de catálogo solo ADMIN, planes e importaciones con dueño (`authStudyPlanOwnerOrAdmin` / `Viewer`).