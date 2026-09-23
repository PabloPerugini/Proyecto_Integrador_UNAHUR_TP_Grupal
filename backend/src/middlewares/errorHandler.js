const mongoose = require("mongoose");
const multer = require("multer");
const AppError = require("../utils/AppError");

// Middleware central de errores: traduce cualquier error a una respuesta JSON
// con el código HTTP correcto. Express 5 reenvía acá las promesas rechazadas
// de los controladores async automáticamente.
const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "El PDF supera el tamaño máximo permitido (10 MB)"
        : `Error al procesar el archivo subido: ${err.message}`;
    return res.status(400).json({ message });
  }

  if (err instanceof AppError) {
    return res
      .status(err.status)
      .json({ message: err.message, ...(err.details ? { error: err.details } : {}) });
  }

  if (err && err.message === "Solo se aceptan archivos PDF") {
    return res.status(400).json({ message: err.message });
  }

  // JSON mal formado en el body (express.json)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "JSON inválido en el cuerpo de la solicitud" });
  }

  // ID de Mongo inválido (p. ej. /careers/abc)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: "ID inválido", error: err.message });
  }

  // Falla de validación del esquema de Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: "Datos inválidos", error: messages.join("; ") });
  }

  // Índice único duplicado
  if (err && err.code === 11000) {
    return res.status(409).json({ message: "Ya existe un registro con esos datos" });
  }

  console.error(err);
  res.status(500).json({ message: "Error interno del servidor", error: err.message });
};

module.exports = errorHandler;