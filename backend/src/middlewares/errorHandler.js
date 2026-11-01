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
    // El mensaje de un AppError es explícito y apto para el usuario; los
    // detalles internos nunca se serializan.
    return res.status(err.status).json({ message: err.message });
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
    return res.status(400).json({ message: "ID inválido" });
  }

  // Falla de validación del esquema de Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  // Índice único duplicado
  if (err && err.code === 11000) {
    return res.status(409).json({ message: "Ya existe un registro con esos datos" });
  }

  // Errores con status propio (body-parser, límites de tamaño, etc.):
  // se conserva el código, pero nunca el mensaje crudo.
  const status = err.status || err.statusCode;

  if (status === 413) {
    return res.status(413).json({
      message: "El cuerpo de la solicitud es demasiado grande",
    });
  }

  if (status >= 400 && status < 500) {
    return res.status(status).json({ message: "Error en la solicitud" });
  }

  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
};

module.exports = errorHandler;