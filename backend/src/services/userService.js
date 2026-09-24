const User = require("../models/user");

// Buscar usuario por email
const findUserByEmail = async (email) => {
  return User.findOne({ email });
};

// Buscar usuario por NickName
const findUserByNickName = async (nickName) => {
  return User.findOne({ nickName });
};

// Buscar usuario por ID
const findUserById = async (id) => {
  return User.findById(id);
};

// Obtener todos los usuarios
const getAllUsers = async () => {
  return User.find();
};

// Crear usuario
const createUser = async (userData) => {
  const emailExists = await findUserByEmail(userData.email);

  if (emailExists) {
    throw new Error("El email ya está registrado");
  }

  const nickNameExists = await findUserByNickName(userData.nickName);

  if (nickNameExists) {
    throw new Error("El NickName ya está registrado");
  }

  const newUser = await User.create({
    nickName: userData.nickName,
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email,
    password: userData.password,

    // Los usuarios creados desde el registro siempre son USUARIO
    rol: "USUARIO",
  });

  return newUser;
};

// Actualizar usuario
const updateUser = async (nickName, userData) => {
  const user = await findUserByNickName(nickName);

  if (!user) {
    return null;
  }

  // Si cambia el email, verificamos que no pertenezca a otro usuario
  if (userData.email && userData.email !== user.email) {
    const emailExists = await findUserByEmail(userData.email);

    if (emailExists) {
      throw new Error("El email ya está registrado");
    }
  }

  // Si cambia el NickName, verificamos que no pertenezca a otro usuario
  if (userData.nickName && userData.nickName !== user.nickName) {
    const nickNameExists = await findUserByNickName(userData.nickName);

    if (nickNameExists) {
      throw new Error("El NickName ya está registrado");
    }
  }

  // Campos que un usuario puede modificar
  const allowedFields = [
    "nickName",
    "firstName",
    "lastName",
    "email",
    "password",
  ];

  for (const field of allowedFields) {
    if (userData[field] !== undefined) {
      user[field] = userData[field];
    }
  }

  await user.save();

  return user;
};

// Eliminar usuario
const deleteUser = async (nickName) => {
  return User.findOneAndDelete({ nickName });
};

module.exports = {
  findUserByEmail,
  findUserByNickName,
  findUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
};