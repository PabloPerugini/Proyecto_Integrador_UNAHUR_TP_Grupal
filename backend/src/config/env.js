require("dotenv/config");

const PLACEHOLDER_SECRET = "dev-secret-change-me";

const missing = [];
if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");

if (missing.length > 0) {
  throw new Error(
    `Faltan variables de entorno requeridas: ${missing.join(", ")}. ` +
      "Copiá backend/.env.Ejemplo a backend/.env y completá los valores.",
  );
}

if (process.env.JWT_SECRET === PLACEHOLDER_SECRET) {
  throw new Error(
    'JWT_SECRET es el placeholder de ejemplo. Generá uno real con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
  );
}

if (process.env.JWT_SECRET.length < 16) {
  throw new Error("JWT_SECRET debe tener al menos 16 caracteres.");
}

module.exports = process.env;