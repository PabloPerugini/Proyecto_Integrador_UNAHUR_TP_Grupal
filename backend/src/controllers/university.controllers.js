const universityService = require("../services/universityService");

const createUniversity = async (req, res) => {
    try {
        const newUniversity = await universityService.createUniversity(req.body);

        return res.status(201).json({
            message: "Universidad creada correctamente",
            university: newUniversity,
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
};

const getAllUniversities = async (req, res) => {
    try {
        const universities = await universityService.getAllUniversities();

        return res.status(200).json(universities);
    } catch (error) {
        return res.status(500).json({
            message: "Error al obtener las universidades",
        });
    }
};

const getUniversityById = async (req, res) => {
    try {
        const {id} = req.params;

        const university = await universityService.findUniversityById(id);

        if (!university) {
            return res.status(404).json({
                message: "Universidad no encontrada",
            });
        }

        return res.status(200).json(university);
    } catch (error) {
        return res.status(500).json({
            message: "Error al obtener la universidad",
        });
    }
};

const updateUniversity = async (req, res) => {
    try {
        const {id} = req.params;

        const updateUniversity = await universityService.updateUniversity(
            id,
            req.body
        );

        if (!updateUniversity) {
            return res.status(404).json({
                message: "Universidad no encontrada"
            });
        }

        return res.status(200).json({
            message: "Universidad actualizada correctamente",
            university: updateUniversity,
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
};

const deleteUniversity = async (req, res) => {
    try {
        const {id} = req.params;

        const deletedUniversity = await universityService.deleteUniversity(id);

        if (!deletedUniversity) {
            return res.status(404).json({
                message: "Universidad no encontrada",
            });
        }

        return res.status(200).json({
            message: "Universidad eliminada correctamente",
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Error al eliminar la universidad",
        });
    };
}


module.exports = {
  createUniversity,
  getAllUniversities,
  getUniversityById,
  updateUniversity,
  deleteUniversity,
};