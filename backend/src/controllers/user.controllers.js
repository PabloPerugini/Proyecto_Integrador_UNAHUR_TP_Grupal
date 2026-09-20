const User = require("../models/user");
const cacheService = require("../services/cache.service");
const {
  signToken,
  setAuthCookie,
  clearAuthCookie,
} = require("../middlewares/auth");

const createUser = async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    setAuthCookie(res, signToken(newUser._id));
    res.status(201).json(newUser);
  } catch (error) {
    const isDuplicate = error.code === 11000;
    res.status(isDuplicate ? 409 : 400).json({
      message: isDuplicate
        ? "Ya existe una cuenta con ese nickName o email"
        : "Error al crear el usuario",
      ...(isDuplicate ? {} : { error: error.message }),
    });
  }
};

const getUserByNickName = async (req, res) => {
  try {
    const { nickName } = req.params;
    const cacheKey = `user:${nickName}`;

    const cached = await cacheService.getCache(cacheKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    const profile = await User.findOne({ nickName }).select("-__v");
    if (!profile) return res.status(404).json({ message: "Usuario no encontrado" });

    await cacheService.setCache(cacheKey, profile, 300);
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el perfil" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { nickName } = req.params;
    const target = req.foundUser;
    if (target && String(target._id) !== String(req.userId)) {
      return res.status(403).json({ message: "Solo podés editar tu propio perfil" });
    }

    const updatedUser = await User.findOneAndUpdate({ nickName }, req.body, {
      returnDocument: "after",
      runValidators: true,
    });

    await cacheService.invalidateCache([`user:${nickName}`]);
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el usuario" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { nickName } = req.params;
    const target = req.foundUser;
    if (target && String(target._id) !== String(req.userId)) {
      return res.status(403).json({ message: "Solo podés eliminar tu propio perfil" });
    }

    await User.findOneAndDelete({ nickName });

    await cacheService.invalidateCache([`user:${nickName}`]);
    clearAuthCookie(res);
    res.status(200).json({ message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el usuario" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { nickName, password } = req.body;

    if (!nickName || !password) {
      return res.status(400).json({ message: "Nickname y contraseña son obligatorios" });
    }

    const user = await User.findOne({ nickName }).select("-__v");
    if (!user) return res.status(404).json({ message: "El usuario no existe" });

    const passwordOk = await user.comparePassword(password);
    if (!passwordOk) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    setAuthCookie(res, signToken(user._id));
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error al iniciar sesión" });
  }
};

const logoutUser = (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ message: "Sesión cerrada" });
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-__v");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la sesión" });
  }
};

module.exports = {
  createUser,
  getUserByNickName,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser,
  getMe,
};