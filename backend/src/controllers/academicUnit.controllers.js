const academicUnitService = require("../services/academicUnitService");

const createAcademicUnit = async(req, res) => {
    try {
        const newAcademicUnit =
            await academicUnitService.createAcademicUnit(req.body);
        
            return res.status(201).json({
                message: "Unidad academica creada correctamente",
                academicUnit: newAcademicUnit,
            })
    }   catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

const getAllAcademicUnits = async (req, res) => {
    try {
        const academicUnits =
            await academicUnitService.getAllAcademicUnits();
        return res.status(200).json(academicUnits);
    }   catch (error) {
        return res.status(500).json({
            message: "Error al obtener las unidades academicas",
        });
    }
};

const getAcademicUnitById = async (req, res) => {
    try {
        const {id} = req.params;

        const academicUnit =
            await academicUnitService.getAcademicUnitById(id);

        if (!academicUnit) {
            return res.status(404).json({
                message: "Unidad academica no encontrada",
            });
        }
        return res.status(200).json(academicUnit);
    } catch (error) {
        return res.status(500).json({
            message: "Error al obtener la unidad academica",
        });
    }
};

const updateAcademicUnit = async (req, res) => {
    try {
        const { id } = req.params;
        
        const updatedAcademicUnit =
            await academicUnitService.updatedAcademicUnit(
                id,
                req.body
            );
        if (!updatedAcademicUnit) {
            return res.status(404).json({
                message: "Unidad academica no encontrada",
            });
        }

        return res.status(200).json({
            message: "Unidad academica actualizada correctamente",
            academicUnit: updatedAcademicUnit,
        });
    }   catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
};

const deleteAcademicUnit = async (req, res) => {
    try {
        const {id} = req.params;

        const deletedAcademicUnit =
            await academicUnitService.deleteAcademicUnit(id);
        
        if (!deletedAcademicUnit) {
            return res.status(404).json({
                message: "Unidad academica no encontrada",
            });
        }

        return res.status(200).json({
            message: "Unidad academica eliminada correctamente",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error al eliminar la unidad academica",
        });
    }
};

module.exports = {
    createAcademicUnit,
    getAllAcademicUnits,
    getAcademicUnitById,
    updateAcademicUnit,
    deleteAcademicUnit,
};