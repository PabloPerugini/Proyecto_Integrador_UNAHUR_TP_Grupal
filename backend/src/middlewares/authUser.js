
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user");

// ==========================================
// MODO PRUEBA
// ==========================================

// true = acceso automático en desarrollo
// false = autenticación JWT normal
const MODO_PRUEBA = true;

const DEMO_NICKNAME = "gradify_demo";
const DEMO_EMAIL = "gradify-demo@local.invalid";

// ==========================================
// USUARIO DE PRUEBA
// ==========================================

const obtenerUsuarioPrueba = async () => {
  let user = await User.findOne({
    nickName: DEMO_NICKNAME,
    email: DEMO_EMAIL,
  });

  if (!user) {
    try {
      user = await User.create({
        nickName: DEMO_NICKNAME,
        firstName: "Usuario",
        lastName: "Prueba",
        email: DEMO_EMAIL,
        password: crypto.randomBytes(32).toString("hex"),
        rol: "ADMIN",
      });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      user = await User.findOne({
        nickName: DEMO_NICKNAME,
        email: DEMO_EMAIL,
      });
    }
  }

  if (!user) {
    throw new Error(
      "No se pudo obtener el usuario de prueba"
    );
  }

  // Si se creó anteriormente como USUARIO,
  // actualizarlo a ADMIN.
  if (user.rol !== "ADMIN") {
    user.rol = "ADMIN";
    await user.save();
  }

  return user;
};

// ==========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ==========================================

const authUser = async (req, res, next) => {

  // ========================================
  // ACCESO AUTOMÁTICO EN DESARROLLO
  // ========================================

  if (
    MODO_PRUEBA &&
    process.env.NODE_ENV === "development"
  ) {
    try {
      const user = await obtenerUsuarioPrueba();

      req.user = user;

      return next();
    } catch (error) {
      console.error("Error en modo prueba:", error);

      return res.status(500).json({
        message: "Error al iniciar el usuario de pruebas",
      });
    }
  }

  // ========================================
  // AUTENTICACIÓN JWT ORIGINAL
  // ========================================

  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
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

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado",
    });
  }
};

module.exports = authUser;
