
const planSubjectService = require("../services/planSubjectService");
const mongoose = require("mongoose");

// Obtener todas las materias de un plan
const getPlanSubjects = async (req, res) => {
  try {
    const { studyPlanId } = req.params;

    const planSubjects =
      await planSubjectService.getPlanSubjects(studyPlanId);

    return res.status(200).json(planSubjects);

  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        message: "ID del plan inválido",
      });
    }

    return res.status(500).json({
      message: "Error al obtener las materias del plan",
    });
  }
};

// Obtener una materia específica de un plan
const getPlanSubjectById = async (req, res) => {
  try {
    const { studyPlanId, id } = req.params;

    const planSubject =
      await planSubjectService.findPlanSubjectById(
        studyPlanId,
        id
      );

    if (!planSubject) {
      return res.status(404).json({
        message: "Materia del plan no encontrada",
      });
    }

    return res.status(200).json(planSubject);

  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    return res.status(500).json({
      message: "Error al obtener la materia del plan",
    });
  }
};

// Agregar una materia al plan
const createPlanSubject = async (req, res) => {
  try {
    const { studyPlanId } = req.params;

    const planSubjectData = {
      ...req.body,
      studyPlan: studyPlanId,
    };

    const newPlanSubject =
      await planSubjectService.createPlanSubject(
        planSubjectData
      );

    return res.status(201).json({
      message: "Materia agregada al plan correctamente",
      planSubject: newPlanSubject,
    });

  } catch (error) {
    if (
      error instanceof mongoose.Error.CastError ||
      error instanceof mongoose.Error.ValidationError
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "La materia ya pertenece a este plan",
      });
    }

    return res.status(400).json({
      message: error.message,
    });
  }
};

// Actualizar una materia del plan
const updatePlanSubject = async (req, res) => {
  try {
    const { studyPlanId, id } = req.params;

    const updatedPlanSubject =
      await planSubjectService.updatePlanSubject(
        studyPlanId,
        id,
        req.body
      );

    if (!updatedPlanSubject) {
      return res.status(404).json({
        message: "Materia del plan no encontrada",
      });
    }

    return res.status(200).json({
      message: "Materia del plan actualizada correctamente",
      planSubject: updatedPlanSubject,
    });

  } catch (error) {
    if (
      error instanceof mongoose.Error.CastError ||
      error instanceof mongoose.Error.ValidationError
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Ya existe una materia con esos datos",
      });
    }

    return res.status(400).json({
      message: error.message,
    });
  }
};

// Eliminar una materia del plan
const deletePlanSubject = async (req, res) => {
  try {
    const { studyPlanId, id } = req.params;

    const deletedPlanSubject =
      await planSubjectService.deletePlanSubject(
        studyPlanId,
        id
      );

    if (!deletedPlanSubject) {
      return res.status(404).json({
        message: "Materia del plan no encontrada",
      });
    }

    return res.status(200).json({
      message: "Materia eliminada del plan correctamente",
    });

  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        message: error.message,
      });
    }

    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    return res.status(500).json({
      message: "Error interno al eliminar la materia",
    });
  }
};

module.exports = {
  getPlanSubjects,
  getPlanSubjectById,
  createPlanSubject,
  updatePlanSubject,
  deletePlanSubject,
};
