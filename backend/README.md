# Backend - Proyecto Integrador UNAHUR

API REST hecha con Node.js + Express + MongoDB + Redis. Provee la autenticación de usuarios, la carga y el parseo de planes de estudio, y los datos de progreso que consume el frontend.

## Requisitos

- Node.js 20+
- MongoDB y Redis (local o vía Docker Compose)

## Instalación y ejecución

```bash
npm install
cp .env.Ejemplo .env

# Opción 1: con Docker Compose (sube app + Mongo + Redis)
docker compose up --build

# Opción 2: local (necesitás Mongo y Redis corriendo)
npm run dev
```

Una vez iniciado:

- API en `http://localhost:3000`
- Documentación Swagger en `http://localhost:3000/api-docs`

## Estructura

```
src/
├── main.js            # Punto de entrada (inicia server + DB + cache)
├── app.js             # Configuración de Express (CORS, JSON, rutas, errores)
├── routes/            # Definición de rutas (index + por recurso)
├── controllers/       # Lógica de los endpoints (*.controllers.js)
├── models/            # Modelos Mongoose
├── schemas/           # Esquemas Joi de validación
├── middlewares/       # Validaciones y helpers por ruta
├── services/          # Lógica transversal (ej: cache.service)
└── config/            # Conexiones (mongo, redisClient)
```

## Reglas de estilo

- Mensajes de error en español, con formato `{ message, error }` o `{ error }`.
- Nombres de archivo: `recurso.controllers.js`, `validateXxx.js`, `recurso.schemas.js`, modelos en minúscula singular (`user.js`).
- Cache en Redis con claves tipo `user:nickname`.