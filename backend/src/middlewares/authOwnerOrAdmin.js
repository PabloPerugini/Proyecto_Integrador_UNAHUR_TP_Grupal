const authOwnerOrAdmin = (req, res, next) => {
  const { nickName } = req.params;

  const isOwner = req.user.nickName === nickName;
  const isAdmin = req.user.rol === "ADMIN";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      message: "No tenés permisos para realizar esta acción",
    });
  }

  next();
};

module.exports = authOwnerOrAdmin;