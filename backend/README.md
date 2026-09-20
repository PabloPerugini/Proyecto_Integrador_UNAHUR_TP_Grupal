# Backend - Proyecto Integrador UNAHUR

API REST hecha con Node.js + Express + MongoDB + Redis. Provee la carga y el parseo de planes de estudio, y los datos de progreso que consume el frontend.

## Requisitos

- Node.js 20+
- MongoDB y Redis (local o vía Docker Compose)

## Instalación y ejecución

```bash
npm install
cp .env.Ejemplo .env   # generar un JWT_SECRET (ver .env.Ejemplo)
```

> Nota: el registro y el login exigen una cookie JWT firmada; sin `JWT_SECRET` configurado la API no arranca (fail-fast).

```bash
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
├── main.js            # Punto de entrada (server + DB + cache + graceful shutdown)
├── app.js             # Configuración de Express (helmet, CORS, rate limit, rutas, errores)
├── config/            # Conexiones y entorno (env, mongo, redisClient, limits)
├── routes/            # Definición de rutas (index + por recurso)
├── controllers/       # Lógica de los endpoints (*.controllers.js)
├── models/            # Modelos Mongoose
├── middlewares/       # Auth (cookies JWT), uploads y validaciones por ruta
├── schemas/           # Esquemas Joi de validación
├── services/          # Lógica transversal (cache, PDFs, IA, embeddings, grafos)
└── utils/             # Helpers (errores, firma PDF, color de carreras)
```

## Autenticación

- Sesión por **cookie `httpOnly`** con token JWT (`SameSite: Lax`, `Secure` en producción), expira a los 7 días.
- Contraseñas con **hash bcrypt**. Sin distinción de roles; cada usuario gestiona sus carreras y su progreso (escrituras de carreras restringidas al dueño via `ownerId`).
- Endpoints: `POST /users/register` (auto-login), `POST /users/login`, `POST /users/logout`, `GET /users/me`.

## Reglas de estilo

- Mensajes de error en español, con formato `{ message }`; los detalles internos solo se registran en el server (`console.error`), nunca se devuelven al cliente.
- Nombres de archivo: `recurso.controllers.js`, `recurso.routes.js`, modelos en minúscula singular (`career.js`).
- Las rutas que mutan recursos devuelven `{ message }` y códigos HTTP semánticos (400/401/403/404/409).