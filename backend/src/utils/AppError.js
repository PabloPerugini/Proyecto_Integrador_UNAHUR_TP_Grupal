// Error con código HTTP explícito. Los controladores lo lanzan para los casos
// de validación/negocio conocidos y el middleware central lo traduce a la
// respuesta correspondiente.
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = AppError;