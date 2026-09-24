const authAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Usuario no autenticado",
    });
  }

  if (req.user.rol !== "ADMIN") {
    return res.status(403).json({
      message: "Acceso denegado. Se requiere rol de administrador",
    });
  }

  next();
};

module.exports = authAdmin;