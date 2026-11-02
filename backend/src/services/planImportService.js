const PlanImport = require("../models/planImport");

// Solo lectura: el historial de importaciones del usuario. La creación y el
// cierre de importaciones los maneja el flujo de preview/confirm.
const getUserPlanImports = async (userId) => {
    return PlanImport.find({ user: userId})
        .populate("studyPlan")
        .sort({ createdAt: -1});
};

const getPlanImportById = async (userId, importId) => {
  return PlanImport.findOne({
    _id: importId,
    user: userId,
  }).populate("studyPlan");
};

module.exports = {
  getUserPlanImports,
  getPlanImportById,
};
