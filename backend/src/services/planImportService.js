const PlanImport = require("../models/planImport");
const StudyPlan = require("../models/studyPlan");

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

const createPlanImport = async (userId, importData) => {
  return PlanImport.create({
    user: userId,
    fileName: importData.fileName,
    fileHash: importData.fileHash || null,
    processingMethod: importData.processingMethod || "PARSER",
    status: "PENDIENTE",
  });
};

const startPlanImport = async (importId) => {
  return PlanImport.findOneAndUpdate(
    { _id: importId, status: "PENDIENTE" },
    { $set: { status: "PROCESANDO", errorMessage: null } },
    { new: true, runValidators: true }
  );
};
const completePlanImport = async (importId, studyPlanId) => {
  const planImport = await PlanImport.findById(importId);

  if (!planImport) {
    throw new Error("La importación no existe");
  }

  const studyPlan = await StudyPlan.findOne({
    _id: studyPlanId,
    createdBy: planImport.user,
  });

  if (!studyPlan) {
    throw new Error("El plan generado no pertenece al usuario");
  }

  return PlanImport.findOneAndUpdate(
    { _id: importId, status: "PROCESANDO" },
    {
      $set: {
        status: "COMPLETADA",
        studyPlan: studyPlanId,
        errorMessage: null,
      },
    },
    { new: true, runValidators: true }
  );
};

// Registrar un error de importación
const failPlanImport = async (importId, errorMessage) => {
  return PlanImport.findOneAndUpdate(
    {
      _id: importId,
      status: { $in: ["PENDIENTE", "PROCESANDO"] },
    },
    {
      $set: {
        status: "ERROR",
        errorMessage: errorMessage,
      },
    },
    { new: true, runValidators: true }
  );
};

module.exports = {
  getUserPlanImports,
  getPlanImportById,
  createPlanImport,
  startPlanImport,
  completePlanImport,
  failPlanImport,
};