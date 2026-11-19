const Joi = require("joi");

const NAME_PATTERN = /^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u;

const userSchema = Joi.object({
  nickName: Joi.string()
    .trim()
    .min(3)
    .required()
    .messages({
      "string.empty": "Nickname es obligatorio",
      "any.required": "Nickname es obligatorio",
      "string.min": "El nickname debe tener al menos 3 caracteres",
    }),

  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(NAME_PATTERN)
    .required()
    .messages({
      "string.empty": "El nombre es obligatorio",
      "any.required": "El nombre es obligatorio",
      "string.pattern.base":
        "El nombre solo puede contener letras, espacios, guiones o apóstrofes",
    }),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(NAME_PATTERN)
    .required()
    .messages({
      "string.empty": "El apellido es obligatorio",
      "any.required": "El apellido es obligatorio",
      "string.pattern.base":
        "El apellido solo puede contener letras, espacios, guiones o apóstrofes",
    }),
  
  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .max(254)
    .required()
    .messages({
      "string.email": "Email inválido",
      "string.empty": "Email es obligatorio",
      "any.required": "Email es obligatorio",
    }),

  password: Joi.string()
    .min(6)
    .max(72)
    .required()
    .messages({
      "string.min": "La contraseña debe tener al menos 6 caracteres",
      "string.empty": "La contraseña es obligatoria",
      "any.required": "La contraseña es obligatoria",
    }),  
});

const userUpdateSchema = userSchema.fork(
  ["nickName", "firstName", "lastName", "email", "password"],
  (field) => field.optional(),
);

module.exports = { userSchema, userUpdateSchema };