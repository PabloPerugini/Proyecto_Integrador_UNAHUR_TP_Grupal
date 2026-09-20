const User = require("../models/user");
const { sendInternalError } = require("../utils/http");

const validateUserExists = async (req, res, next) => {
  try {
    const { nickName } = req.params;
    const foundUser = await User.findOne({ nickName });

    if (!foundUser) {
      return res.status(404).json({ message: "El usuario no existe" });
    }

    req.foundUser = foundUser;
    next();
  } catch (error) {
    sendInternalError(res, error, "validateUserExists");
  }
};

module.exports = validateUserExists;