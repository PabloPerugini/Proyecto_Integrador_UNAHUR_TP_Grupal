
const StudyPlan = require("../models/studyPlan");

const authStudyPlanViewer = async (req, res, next) => {
  try {
    const studyPlanId =
      req.params.studyPlanId || req.params.id;

    const studyPlan = await StudyPlan.findById(studyPlanId);

    if (!studyPlan) {
      return res.status(404).json({
        message: "Plan de estudio no encontrado",
      });
    }

    // ADMIN puede ver cualquier plan
    if (req.user.rol === "ADMIN") {
      return next();
    }

    // Plan oficial: solamente visible si está publicado
    if (!studyPlan.createdBy) {
      if (studyPlan.status === "published") {
        return next();
      }

      return res.status(404).json({
        message: "Plan de estudio no encontrado",
      });
    }

    // Plan privado: solamente puede verlo su propietario
    const isOwner =
      studyPlan.createdBy.toString() ===
      req.user._id.toString();

    if (!isOwner) {
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
