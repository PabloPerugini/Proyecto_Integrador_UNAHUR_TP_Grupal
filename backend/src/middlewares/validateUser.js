const { userSchema } = require("../schemas/user.schemas");

// Valida el cuerpo del registro contra el esquema Joi del proyecto.
const validateUser = (req, res, next) => {
  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      message: "Datos de usuario inválidos",
      errors: error.details.map((d) => d.message),
    });
  }
  req.body = value;
  next();
};

module.exports = validateUser;
