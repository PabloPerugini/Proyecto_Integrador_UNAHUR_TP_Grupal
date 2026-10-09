
const userStudyPlanService = require("../services/userStudyPlanService");

// Manejar errores del Service
const handleError = (res, error, defaultMessage) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      message: "Ya agregaste este plan de estudio",
    });
  }

  console.error(error);

  return res.status(500).json({
    message: defaultMessage,
  });
};

// Obtener los planes del usuario
const getUserStudyPlans = async (req, res) => {
  try {
    const userId = req.user._id;

    const plans =
      await userStudyPlanService.getUserStudyPlans(userId);

    return res.status(200).json(plans);

  } catch (error) {
    return handleError(
      res,
      error,
      "Error al obtener los planes del usuario"
    );
  }
};

// Agregar un plan
const addUserStudyPlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const { studyPlanId } = req.body;

    if (!studyPlanId) {
      return res.status(400).json({
        message: "El ID del plan es obligatorio",
      });
    }

    const newUserStudyPlan =
      await userStudyPlanService.addUserStudyPlan(
        userId,
        studyPlanId
      );

    return res.status(201).json({
      message: "Plan agregado correctamente",
      userStudyPlan: newUserStudyPlan,
    });

  } catch (error) {
    return handleError(
      res,
      error,
      "Error al agregar el plan"
    );
  }
};

// Quitar un plan
const removeUserStudyPlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const { studyPlanId } = req.params;

    const deletedUserStudyPlan =
      await userStudyPlanService.removeUserStudyPlan(
        userId,
        studyPlanId
      );

    if (!deletedUserStudyPlan) {
      return res.status(404).json({
        message: "El usuario no tiene agregado ese plan",
      });
    }

    return res.status(200).json({
      message: "Plan quitado correctamente",
    });

  } catch (error) {
    return handleError(
      res,
      error,
      "Error al quitar el plan"
    );
  }
};

module.exports = {
  getUserStudyPlans,
  addUserStudyPlan,
  removeUserStudyPlan,
};
