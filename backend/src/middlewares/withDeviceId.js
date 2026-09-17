// Identifica una sesión anónima: lee el header x-user-id generado por el
// navegador (o body/query userId, por compatibilidad) y lo deja en req.userId.
// No hay login: es solo una clave local para separar el progreso por navegador.
const withDeviceId = (req, res, next) => {
  req.userId =
    req.header("x-user-id") ||
    req.body?.userId ||
    req.query?.userId ||
    null;
  next();
};

module.exports = withDeviceId;