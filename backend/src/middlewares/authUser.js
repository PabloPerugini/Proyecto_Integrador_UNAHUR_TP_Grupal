const jwt = require("jsonwebtoken");
const User = require("../models/user");

// IMPORTANTEEEEE:
// Este middleware usa process.env.JWT_SECRET para verificar los tokens.
// deben tener en su archivo .env algo como:
//
// JWT_SECRET=una_clave_secreta
//
// El archivo .env NO debe subirse a GitHub, igual ya esta en el git ignore

const authUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No autorizado. Token requerido",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "Usuario no encontrado",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado",
    });
  }
};

module.exports = authUser;