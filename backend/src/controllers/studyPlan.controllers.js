
const mongoose = require("mongoose");
const studyPlanService = require("../services/studyPlanService");

// Crear un plan de estudio
const createStudyPlan = async (req, res) => {
  try {
    const studyPlanData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const newStudyPlan =
      await studyPlanService.createStudyPlan(studyPlanData);

    return res.status(201).json({
      message: "Plan de estudio creado correctamente",
      studyPlan: newStudyPlan,
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Ya existe un plan con esos datos",
      });
    }

    return res.status(400).json({
      message: error.message,
    });
  }
};

// Obtener todos los planes accesibles
const getAllStudyPlans = async (req, res) => {
  try {
    const studyPlans =
      await studyPlanService.getAllStudyPlans(req.user);

    return res.status(200).json(studyPlans);

  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener los planes de estudio",
    });
  }
};

// Obtener un plan por ID
const getStudyPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "ID de plan inválido",
      });
    }

    const studyPlan =
      await studyPlanService.findStudyPlanById(
        id,
        req.user
      );

    if (!studyPlan) {
      return res.status(404).json({
        message: "Plan de estudio no encontrado",
      });
    }

    return res.status(200).json(studyPlan);

  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener el plan de estudio",
    });
  }
};

// Actualizar un plan de estudio
const updateStudyPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "ID de plan inválido",
      });
    }

    const updatedStudyPlan =
      await studyPlanService.updateStudyPlan(
        id,
        req.body
      );

    if (!updatedStudyPlan) {
      return res.status(404).json({
        message: "Plan de estudio no encontrado",
      });
    }

    return res.status(200).json({
      message: "Plan de estudio actualizado correctamente",
      studyPlan: updatedStudyPlan,
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Ya existe un plan con esos datos",
      });
    }

    return res.status(400).json({
      message: error.message,
    });
  }
};

// Eliminar un plan de estudio
const deleteStudyPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "ID de plan inválido",
      });
    }

    const deletedStudyPlan =
      await studyPlanService.deleteStudyPlan(id);

    if (!deletedStudyPlan) {
      return res.status(404).json({
        message: "Plan de estudio no encontrado",
      });
    }

    return res.status(200).json({
      message: "Plan de estudio eliminado correctamente",
    });

  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        message: error.message,
      });
    }

    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        message: "ID de plan inválido",
      });
    }

    return res.status(500).json({
      message: "Error interno al eliminar el plan",
    });
  }
};

module.exports = {
  createStudyPlan,
  getAllStudyPlans,
  getStudyPlanById,
  updateStudyPlan,
  deleteStudyPlan,
};
