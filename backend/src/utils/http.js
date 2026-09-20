function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sendInternalError(res, error, context) {
  console.error(`[${context}]`, error);
  const status = error.status || (error.name === "CastError" ? 400 : 500);
  const message = status >= 500 ? "Error interno del servidor" : error.message;
  res.status(status).json({ message });
}

module.exports = { httpError, sendInternalError };