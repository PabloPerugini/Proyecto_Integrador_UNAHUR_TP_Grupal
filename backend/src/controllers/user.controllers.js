const User = require("../models/user");
const cacheService = require("../services/cache.service");
const {
  signToken,
  setAuthCookie,
  clearAuthCookie,
} = require("../middlewares/auth");
const { sendInternalError } = require("../utils/http");

const createUser = async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    setAuthCookie(res, signToken(newUser._id));
    res.status(201).json(newUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Ya existe una cuenta con ese nickName o email",
      });
    }
    sendInternalError(res, error, "createUser");
  }
};

const getUserByNickName = async (req, res) => {
  try {
    const { nickName } = req.params;
    const cacheKey = `user:${nickName}`;

    const cached = await cacheService.getCache(cacheKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    const profile = await User.findOne({ nickName }).select("-__v -email");
    if (!profile) return res.status(404).json({ message: "Usuario no encontrado" });

    await cacheService.setCache(cacheKey, profile, 300);
    res.status(200).json(profile);
  } catch (error) {
    sendInternalError(res, error, "getUserByNickName");
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
    sendInternalError(res, error, "updateUser");
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
    sendInternalError(res, error, "deleteUser");
  }
};

const loginUser = async (req, res) => {
  try {
    const { nickName, password } = req.body;

    if (!nickName || !password) {
      return res.status(400).json({ message: "Nickname y contraseña son obligatorios" });
    }

    const user = await User.findOne({ nickName }).select("-__v");
    const passwordOk = user ? await user.comparePassword(password) : false;
    if (!user || !passwordOk) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    setAuthCookie(res, signToken(user._id));
    res.status(200).json(user);
  } catch (error) {
    sendInternalError(res, error, "loginUser");
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
    sendInternalError(res, error, "getMe");
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