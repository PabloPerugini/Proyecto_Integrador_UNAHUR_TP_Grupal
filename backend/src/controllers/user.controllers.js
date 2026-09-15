const User = require("../models/user");
const cacheService = require("../services/cache.service");

const createUser = async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: "Error al crear el usuario", error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los usuarios", error: error.message });
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
    res.status(500).json({ message: "Error al obtener el perfil", error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { nickName } = req.params;
    const updatedUser = await User.findOneAndUpdate({ nickName }, req.body, {
      returnDocument: "after",
      runValidators: true,
    });

    await cacheService.invalidateCache([`user:${nickName}`]);
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el usuario", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { nickName } = req.params;
    await User.findOneAndDelete({ nickName });

    await cacheService.invalidateCache([`user:${nickName}`]);
    res.status(200).json({ message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el usuario", error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { nickName, password } = req.body;

    if (!nickName || !password) {
      return res.status(400).json({ error: "Nickname y contraseña son obligatorios" });
    }

    const user = await User.findOne({ nickName }).select("-__v");
    if (!user) return res.status(404).json({ error: "El usuario no existe" });

    const passwordOk = await user.comparePassword(password);
    if (!passwordOk) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error al iniciar sesión", error: error.message });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserByNickName,
  updateUser,
  deleteUser,
  loginUser,
};