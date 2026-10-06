const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

const swaggerDocument = YAML.load(path.join(__dirname, "../docs/swagger.yaml"));

// CORS whitelist: orígenes desde env, default solo el front local.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Origen no permitido por CORS"));
    },
  }),
);
app.use(helmet({ contentSecurityPolicy: false }));
// Rate-limit solo en auth (las rutas IA ya tienen aiRateLimit propio).
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use("/users/login", authRateLimit);
app.use("/users/register", authRateLimit);
app.use(express.json());

// Envelope progresivo de errores (Cuerpo B §3.1, fase 1: solo errores).
// Normaliza TODA respuesta con status >= 400 a
// { success: false, error: { message, details? }, ...camposExtra }
// conservando los campos propios (dropped, cycle, errors[]) para no romper
// consumidores. Los éxitos (2xx) no se tocan. El front lee el envelope con
// fallback al formato legado (api/client.ts).
app.use((req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = (body) => {
    if (
      res.statusCode >= 400 &&
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      !("success" in body)
    ) {
      const { message, error, errors, ...rest } = body;
      const details = error !== undefined ? error : errors;
      return origJson({
        success: false,
        error: {
          message: message || "Error en la solicitud",
          ...(details !== undefined ? { details } : {}),
        },
        ...rest,
      });
    }
    return origJson(body);
  };
  next();
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/", routes);

app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

app.use(errorHandler);

module.exports = app;