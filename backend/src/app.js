require("./config/env");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const routes = require("./routes");
const { limiterGeneral, limiterLogin } = require("./config/limits");

const app = express();

const swaggerDocument = YAML.load(path.join(__dirname, "../docs/swagger.yaml"));

const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(helmet());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  }),
);

app.use(limiterGeneral);
app.use("/users/login", limiterLogin);
app.use("/users/register", limiterLogin);
app.use(express.json());
app.use(cookieParser());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/", routes);

app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "El PDF supera el tamaño máximo permitido (10 MB)"
        : `Error al procesar el archivo subido: ${err.message}`;
    return res.status(400).json({ message });
  }
  if (err && err.message === "Solo se aceptan archivos PDF") {
    return res.status(400).json({ message: err.message });
  }
  if (err && err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err && err.name === "CastError") {
    return res.status(400).json({ message: "ID inválido" });
  }
  if (err && (err.isJoi || err.name === "ValidationError")) {
    const detail = err.details && err.details[0] ? err.details[0].message : "Datos inválidos";
    return res.status(400).json({ message: detail });
  }
  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
});

module.exports = app;