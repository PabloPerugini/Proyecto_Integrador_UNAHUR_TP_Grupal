const Joi = require("joi");

const userSchema = Joi.object({
  nickName: Joi.string()
    .trim()
    .required()
    .messages({
      "string.empty": "Nickname es obligatorio",
      "any.required": "Nickname es obligatorio",
    }),

  firstName: Joi.string()
    .trim()
    .required()
    .messages({
      "string.empty": "El nombre es obligatorio",
      "any.required": "El nombre es obligatorio",
    }),
  
  lastName: Joi.string()
    .trim()
    .required()
    .messages({
      "string.empty": "El apellido es obligatorio",
      "any.required": "El apellido es obligatorio",
    }),
  
  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .required()
    .messages({
      "string.email": "Email inválido",
      "string.empty": "Email es obligatorio",
      "any.required": "Email es obligatorio",
    }),

  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min": "La contraseña debe tener al menos 6 caracteres",
      "string.empty": "La contraseña es obligatoria",
      "any.required": "La contraseña es obligatoria",
    }),  
});

module.exports = { userSchema };