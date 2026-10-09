
const StudyPlan = require("../models/studyPlan");
const Career = require("../models/career");
const PlanSubject = require("../models/planSubject");
const UserStudyPlan = require("../models/userStudyPlan");
const PlanImport = require("../models/planImport");

// Obtener todos los planes accesibles
const getAllStudyPlans = async (user) => {
  if (user.rol === "ADMIN") {
    return StudyPlan.find()
      .populate("career")
      .populate("createdBy");
  }

  return StudyPlan.find({
    $or: [
      {
        createdBy: null,
        status: "published",
      },
      {
        createdBy: user._id,
      },
    ],
  })
    .populate("career")
    .populate("createdBy");
};

// Obtener un plan por ID
const findStudyPlanById = async (id, user) => {
  if (user.rol === "ADMIN") {
    return StudyPlan.findById(id)
      .populate("career")
      .populate("createdBy");
  }

  return StudyPlan.findOne({
    _id: id,
    $or: [
      {
        createdBy: null,
        status: "published",
      },
      {
        createdBy: user._id,
      },
    ],
  })
    .populate("career")
    .populate("createdBy");
};

// Crear un plan personal
const createStudyPlan = async (studyPlanData) => {
  const careerExists = await Career.findById(
    studyPlanData.career
  );

  if (!careerExists) {
    throw new Error("La carrera no existe");
  }

  if (!studyPlanData.createdBy) {
    throw new Error(
      "El usuario creador del plan es obligatorio"
    );
  }

  return StudyPlan.create({
    name: studyPlanData.name,
    career: studyPlanData.career,
    resolution: studyPlanData.resolution,
    durationYears: studyPlanData.durationYears,
    creditsFinal: studyPlanData.creditsFinal,
    creditsIntermediate: studyPlanData.creditsIntermediate,
    intermediateTitle: studyPlanData.intermediateTitle,
    status: studyPlanData.status || "draft",
    createdBy: studyPlanData.createdBy,
  });
};

// Actualizar un plan
const updateStudyPlan = async (id, studyPlanData) => {
  if (
    Object.prototype.hasOwnProperty.call(
      studyPlanData,
      "createdBy"
    )
  ) {
    throw new Error(
      "No se puede modificar el propietario del plan"
    );
  }

  const allowedFields = [
    "name",
    "career",
    "resolution",
    "durationYears",
    "creditsFinal",
    "creditsIntermediate",
    "intermediateTitle",
    "status",
  ];

  const updateData = {};

  for (const field of allowedFields) {
    if (studyPlanData[field] !== undefined) {
      updateData[field] = studyPlanData[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error(
      "No se enviaron campos válidos para actualizar"
    );
  }

  if (updateData.career !== undefined) {
    const careerExists = await Career.findById(
      updateData.career
    );

    if (!careerExists) {
      throw new Error("La carrera no existe");
    }
  }

  return StudyPlan.findByIdAndUpdate(
    id,
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("career")
    .populate("createdBy");
};

// Crear un error de conflicto
const createConflictError = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

// Eliminar un plan de estudios
const deleteStudyPlan = async (id) => {
  const studyPlan = await StudyPlan.findById(id);

  if (!studyPlan) return null;

  // Comprobar relaciones existentes
  const [
    hasSubjects,
    hasUsers,
    hasImports,
  ] = await Promise.all([
    PlanSubject.exists({ studyPlan: id }),
    UserStudyPlan.exists({ studyPlan: id }),
    PlanImport.exists({ studyPlan: id }),
  ]);

  // Evitar eliminar planes con materias
  if (hasSubjects) {
    throw createConflictError(
      "No se puede eliminar el plan porque contiene materias"
    );
  }

  // Evitar eliminar planes utilizados por estudiantes
  if (hasUsers) {
    throw createConflictError(
      "No se puede eliminar el plan porque hay estudiantes utilizándolo"
    );
  }

  // Evitar eliminar planes asociados a importaciones
  if (hasImports) {
    throw createConflictError(
      "No se puede eliminar el plan porque tiene importaciones asociadas"
    );
  }

  return StudyPlan.findByIdAndDelete(id);
};

module.exports = {
  getAllStudyPlans,
  findStudyPlanById,
  createStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
};
