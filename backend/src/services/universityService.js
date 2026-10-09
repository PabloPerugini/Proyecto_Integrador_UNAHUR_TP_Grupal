
const University = require("../models/university");

const getAllUniversities = async () => {
  return University.find().sort({ name: 1 });
};

const createUniversity = async (data) => {
  const name = String(data.name || "").trim();
  const description = String(data.description || "").trim();

  if (name.length < 2 || name.length > 150) {
    const error = new Error(
      "El nombre debe tener entre 2 y 150 caracteres"
    );
    error.statusCode = 400;
    throw error;
  }

  // Escapar caracteres especiales para la búsqueda.
  const escapedName = name.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  // Comprobar que no esté registrada.
  const existing = await University.findOne({
    name: {
      $regex: `^${escapedName}$`,
      $options: "i",
    },
  });

  if (existing) {
    const error = new Error(
      "Esta universidad ya está registrada"
    );
    error.statusCode = 409;
    throw error;
  }

  return University.create({
    name,
    description,
  });
};

module.exports = {
  getAllUniversities,
  createUniversity,
};
