const userService = require("../services/userService");
const User = require("../models/user");
const { signToken, getUserId } = require("../middlewares/auth");
const { userUpdateSchema } = require("../schemas/user.schemas");

const createUser = async (req, res) => {
  try {
    // El cuerpo ya viene validado por el middleware validarUser
    // (fuente única: userSchema). Acá solo se aplican reglas de negocio.
    const newUser = await userService.createUser(req.body);

    return res.status(201).json({
      message: "Usuario creado correctamente",
      user: newUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email o NickName ya registrado",
      });
    }
    return res.status(400).json({
      message: error.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener los usuarios",
    });
  }
};

const getUserByNickName = async (req, res) => {
  try {
    const {nickName} = req.params;

    const user = await userService.findUserByNickName(nickName);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener el usuario",
    });
  }
}

const updateUser = async (req, res) => {
  try {
    const { nickName } = req.params;

    // Campos que permitimos modificar
    const allowedFields = [
      "nickName",
      "firstName",
      "lastName",
      "email",
      "password",
    ];

    // El rol solo lo cambia un ADMIN (gestión de usuarios).
    if (req.body.rol !== undefined) {
      if (!req.user || req.user.rol !== "ADMIN") {
        return res.status(403).json({
          message: "Solo un administrador puede cambiar roles",
        });
      }
      if (!["USUARIO", "ADMIN"].includes(req.body.rol)) {
        return res.status(400).json({
          message: "Rol inválido",
        });
      }
    }

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Valida formato (campos opcionales) sin exigir los demás.
    const { error, value } = userUpdateSchema.validate(updateData, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        message: "Datos inválidos",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const updatedUser = await userService.updateUser(
      nickName,
      {
        ...value,
        // rol ya validado arriba (solo ADMIN); el schema lo elimina.
        ...(req.body.rol !== undefined ? { rol: req.body.rol } : {}),
      },
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      message: "Usuario actualizado correctamente",
      user: updatedUser,
    });
  } catch (error) {
    // Colisión concurrente de email/nickName: 409 en vez del crudo de Mongo.
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email o NickName ya registrado",
      });
    }
    return res.status(400).json({
      message: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const {nickName} = req.params;

    const deletedUser = await userService.deleteUser(nickName);

    if (!deletedUser) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      message: "Usuario eliminado correctamente",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al eliminar el usuario",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { nickName, password } = req.body;

    if (!nickName || !password) {
      return res.status(400).json({
        message: "NickName y contraseña son obligatorios",
      });
    }

    const user = await userService.findUserByNickName(nickName);

    if (!user) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    const passwordOk = await user.comparePassword(password);

    if (!passwordOk) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    // Token único: mismo firmador y TTL que la cookie (7d).
    const token = signToken(user._id, user.tokenVersion ?? 0);

    // Integración auth-cookie-ia: espeja el JWT en cookie httpOnly
    // (el header Bearer sigue siendo la vía principal).
    try {
      const { setAuthCookie } = require("../middlewares/auth");
      if (typeof res.cookie === "function") setAuthCookie(res, token);
    } catch {
      // Sin JWT_SECRET o sin cookie-parser: no rompe el login.
    }

    return res.status(200).json({
      message: "Inicio de sesión correcto",
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al iniciar sesión",
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    // Invalida el JWT vigente (bump de versión) además de borrar la cookie.
    const userId = getUserId(req);
    if (userId) {
      await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
    }
    const { clearAuthCookie } = require("../middlewares/auth");
    if (typeof res.clearCookie === "function") clearAuthCookie(res);
  } catch {
    // Sin cookie-parser: responde igual.
  }
  return res.status(200).json({ message: "Sesión cerrada" });
};

const getMe = async (req, res) => {
  // Integración auth-cookie-ia: caché best-effort del perfil (TTL 60s).
  const userId = req.userId || (req.user && req.user._id);
  if (userId) {
    try {
      const { getCache, setCache } = require("../services/cache.service");
      const hit = await getCache(`me:${userId}`);
      if (hit) return res.status(200).json(JSON.parse(hit));
      if (req.user) {
        setCache(`me:${userId}`, req.user, 60).catch(() => {});
        return res.status(200).json(req.user);
      }
    } catch {
      // Sin caché: sigue con la vía directa.
    }
  }
  if (req.user) return res.status(200).json(req.user);
  if (req.userId) return res.status(200).json({ _id: req.userId });
  return res.status(401).json({ message: "No estás autenticado" });
};

module.exports = {
  createUser,
  getAllUsers,
  getUserByNickName,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser,
  getMe,
};