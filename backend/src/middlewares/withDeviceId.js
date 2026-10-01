// Identifica una sesión anónima: lee el header x-user-id generado por el
// navegador (o body.userId, por compatibilidad) y lo deja en req.userId.
// No hay login: es solo una clave local para separar el progreso por navegador.
// Sin identificador → 401 (el frontend lo envía siempre vía deviceHeaders,
// incluso en uploadPdf, así que no rompe UploadPlan).
const withDeviceId = (req, res, next) => {
  const userId =
    req.header("x-user-id") ||
    req.body?.userId ||
    null;
  if (!userId) {
    return res.status(401).json({ message: "Falta identificador de sesión (x-user-id)" });
  }
  req.userId = userId;
  next();
};

module.exports = withDeviceId;