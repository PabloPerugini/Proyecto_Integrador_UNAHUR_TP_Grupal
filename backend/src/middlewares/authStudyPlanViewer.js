
const StudyPlan = require("../models/studyPlan");
const { planVisibilityFilter } = require("../services/planVisibility");

const authStudyPlanViewer = async (req, res, next) => {
  try {
    const studyPlanId =
      req.params.studyPlanId || req.params.id;

    // ADMIN consulta sin filtro; el resto solo ve oficiales publicados,
    // propios y planes vigentes.
    const studyPlan = await StudyPlan.findOne({
      _id: studyPlanId,
      ...planVisibilityFilter(req.user),
    }).select("_id");

    if (!studyPlan) {
      return res.status(404).json({
        message: "Plan de estudio no encontrado",
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      message: "Error al verificar permisos del plan",
    });
  }
};

module.exports = authStudyPlanViewer;
