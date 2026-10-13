require("./config/env");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
let limiterGeneral;
let limiterLogin;
let limiterRegister;
try {
  ({ limiterGeneral, limiterLogin, limiterRegister } = require("./config/limits"));
} catch {
  limiterGeneral = rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 });
  limiterLogin = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });
  limiterRegister = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
}

const app = express();

const fs = require("fs");
const swaggerFile = path.join(__dirname, "../docs/swagger.yaml");
const swaggerDocument = fs.existsSync(swaggerFile)
  ? YAML.load(swaggerFile)
  : { openapi: "3.0.0", info: { title: "Gradify API", version: "1.0.0" }, paths: {} };

// CORS: whitelist desde env + credentials para cookies JWT (integración auth-cookie-ia).
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // Origen no listado: se deniega CORS sin error (el navegador
      // bloquea igual, pero evitamos el 500 y el ruido en logs).
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }),
);
app.use(helmet({ contentSecurityPolicy: false }));

app.use(limiterGeneral);
// Rate-limit en auth (compat: limiterLogin centralizado + ref.antiguo).
app.use("/users/login", limiterLogin);
app.use("/users/register", limiterRegister);
app.use(express.json());
app.use(cookieParser());

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