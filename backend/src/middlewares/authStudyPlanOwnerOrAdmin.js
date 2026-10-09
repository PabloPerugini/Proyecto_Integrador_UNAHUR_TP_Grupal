
const StudyPlan = require("../models/studyPlan");

const authStudyPlanOwnerOrAdmin = async (req, res, next) => {
  try {
    const studyPlanId =
      req.params.studyPlanId || req.params.id;

    const studyPlan = await StudyPlan.findById(studyPlanId);

    if (!studyPlan) {
      return res.status(404).json({
        message: "Plan de estudio no encontrado",
      });
    }

    // ADMIN puede modificar cualquier plan existente
    if (req.user.rol === "ADMIN") {
      return next();
    }

    // Los usuarios normales no pueden modificar planes oficiales
    if (!studyPlan.createdBy) {
      return res.status(403).json({
        message: "No tenés permisos para modificar este plan",
      });
    }

    // Comprobar que sea el propietario
    const isOwner =
      studyPlan.createdBy.toString() ===
      req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({
        message: "No tenés permisos para modificar este plan",
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      message: "Error al verificar permisos del plan",
    });
  }
};

module.exports = authStudyPlanOwnerOrAdmin;
