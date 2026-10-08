const jwt = require("jsonwebtoken");
const userService = require("../services/userService");
const { userSchema, userUpdateSchema } = require("../schemas/user.schemas");

const createUser = async (req, res) => {
  try {
    const {error, value} = userSchema.validate(req.body, {
      abortEarly:false,
    });

    if (error) {
      return res.status(400).json({
        message: "Datos invalidos",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const newUser = await userService.createUser(value);

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
      value,
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

    // Generamos el token (unificado: `id` legado + `sub` estándar).
    const token = jwt.sign(
      {
        id: user._id,
        sub: String(user._id),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

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

const logoutUser = (req, res) => {
  try {
    const { clearAuthCookie } = require("../middlewares/auth");
    if (typeof res.clearCookie === "function") clearAuthCookie(res);
  } catch {
    // Sin cookie-parser: responde igual.
  }
  return res.status(200).json({ message: "Sesión cerrada" });
};

const getMe = async (req, res) => {
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