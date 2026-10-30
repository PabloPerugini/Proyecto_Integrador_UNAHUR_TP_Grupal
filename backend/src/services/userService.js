const User = require("../models/user");

// Solo se consulta con texto: evita que un objeto ({ $ne: null }) llegue
// como filtro de Mongoose desde un body no validado.
const isText = (value) => typeof value === "string" && value.length > 0;

// Buscar usuario por email
const findUserByEmail = async (email) => {
  if (!isText(email)) return null;
  return User.findOne({ email });
};

// Buscar usuario por NickName
const findUserByNickName = async (nickName) => {
  if (!isText(nickName)) return null;
  return User.findOne({ nickName });
};

// Obtener todos los usuarios
const getAllUsers = async () => {
  return User.find();
};

// Colisión de email/nickName: unicity. El controlador la mapea a 409.
const conflictError = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

// Crear usuario
const createUser = async (userData) => {
  const emailExists = await findUserByEmail(userData.email);

  if (emailExists) {
    throw conflictError("El email ya está registrado");
  }

  const nickNameExists = await findUserByNickName(userData.nickName);

  if (nickNameExists) {
    throw conflictError("El NickName ya está registrado");
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
      throw conflictError("El email ya está registrado");
    }
  }

  // Si cambia el NickName, verificamos que no pertenezca a otro usuario
  if (userData.nickName && userData.nickName !== user.nickName) {
    const nickNameExists = await findUserByNickName(userData.nickName);

    if (nickNameExists) {
      throw conflictError("El NickName ya está registrado");
    }
  }

  // Campos que un usuario puede modificar
  const allowedFields = [
    "nickName",
    "firstName",
    "lastName",
    "email",
    "password",
    // rol solo llega hasta acá validado por el controller (solo ADMIN).
    "rol",
  ];

  const passwordChanged = userData.password !== undefined;

  for (const field of allowedFields) {
    if (userData[field] !== undefined) {
      user[field] = userData[field];
    }
  }

  // Cambiar la contraseña invalida los JWT emitidos con la versión anterior.
  if (passwordChanged) {
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  }

  await user.save();

  return user;
};

// Eliminar usuario
const deleteUser = async (nickName) => {
  return User.findOneAndDelete({ nickName });
};

// Invalidar el JWT vigente de un usuario (logout): sube tokenVersion.
const bumpTokenVersion = async (userId) => {
  if (!userId) return null;
  return User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
};

module.exports = {
  findUserByEmail,
  findUserByNickName,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  bumpTokenVersion,
};