
const universityService = require(
  "../services/universityService"
);

// Obtener todas las universidades.
const getAllUniversities = async (req, res) => {
  try {
    const universities =
      await universityService.getAllUniversities();

    return res.status(200).json(universities);
  } catch (error) {
    console.error(
      "Error obteniendo universidades:",
      error
    );

    return res.status(500).json({
      message: "No se pudieron obtener las universidades",
    });
  }
};

// Crear universidad.
const createUniversity = async (req, res) => {
  try {
    const university =
      await universityService.createUniversity({
        name: req.body.name,
        description: req.body.description,
      });

    return res.status(201).json(university);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "La universidad ya está registrada",
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Error creando universidad:",
      error
    );

    return res.status(500).json({
      message: "No se pudo crear la universidad",
    });
  }
};

module.exports = {
  getAllUniversities,
  createUniversity,
};
