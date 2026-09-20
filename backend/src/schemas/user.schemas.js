const Joi = require("joi");

const userSchema = Joi.object({
  nickName: Joi.string().trim().required().messages({
    "string.empty": "NickName es obligatorio",
    "any.required": "NickName es obligatorio",
  }),
  firstName: Joi.string().trim().allow(""),
  lastName: Joi.string().trim().allow(""),
  email: Joi.string().email().required().messages({
    "string.email": "Email inválido",
    "string.empty": "Email es obligatorio",
    "any.required": "Email es obligatorio",
  }),
  password: Joi.string().min(4).required().messages({
    "string.min": "La contraseña debe tener al menos 4 caracteres",
  }),
});

const userUpdateSchema = Joi.object({
  nickName: Joi.string().trim(),
  firstName: Joi.string().trim().allow(""),
  lastName: Joi.string().trim().allow(""),
  email: Joi.string().email(),
  password: Joi.string().min(4),
}).min(1);

module.exports = { userSchema, userUpdateSchema };