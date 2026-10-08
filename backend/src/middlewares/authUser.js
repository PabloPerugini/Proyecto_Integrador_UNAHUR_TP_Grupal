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
    // Integración auth-cookie-ia: acepta Bearer header (legado develop)
    // o cookie httpOnly `token` (rama feature/auth-cookie-ia).
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        message: "No autorizado. Token requerido",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Compat: develop firma { id }, rama cookie firma { sub }.
    const userId = decoded.id || decoded.sub;
    if (!userId) {
      return res.status(401).json({
        message: "Token inválido o expirado",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        message: "Usuario no encontrado",
      });
    }

    req.user = user;
    req.userId = String(user._id);

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado",
    });
  }
};

module.exports = authUser;