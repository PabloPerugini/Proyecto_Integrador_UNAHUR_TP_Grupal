
const StudyPlan = require("../models/studyPlan");
const Career = require("../models/career");
const PlanSubject = require("../models/planSubject");
const UserStudyPlan = require("../models/userStudyPlan");
const SubjectProgress = require("../models/subjectProgress");
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

// Eliminar un plan de estudios con cascada propia:
// borra inscripciones, progreso, materias e importaciones del plan.
// Si hay inscriptos distintos del solicitante y no es ADMIN -> 409.
const deleteStudyPlan = async (id, user) => {
  const studyPlan = await StudyPlan.findById(id);

  if (!studyPlan) return null;

  const enrollments = await UserStudyPlan.find({ studyPlan: id }).select("user");
  const otherEnrollments = enrollments.filter(
    (e) => String(e.user) !== String(user?._id),
  );
  if (otherEnrollments.length && user?.rol !== "ADMIN") {
    throw createConflictError(
      "No se puede eliminar el plan porque hay otros estudiantes utilizándolo",
    );
  }

  const subjectIds = (
    await PlanSubject.find({ studyPlan: id }).select("_id")
  ).map((s) => s._id);

  const [progress, removedEnrollments, subjects, imports] = await Promise.all([
    subjectIds.length
      ? SubjectProgress.deleteMany({ planSubject: { $in: subjectIds } })
      : { deletedCount: 0 },
    UserStudyPlan.deleteMany({ studyPlan: id }),
    PlanSubject.deleteMany({ studyPlan: id }),
    PlanImport.deleteMany({ studyPlan: id }),
  ]);

  await StudyPlan.findByIdAndDelete(id);

  return {
    deleted: true,
    removed: {
      subjects: subjects.deletedCount,
      enrollments: removedEnrollments.deletedCount,
      progress: progress.deletedCount,
      imports: imports.deletedCount,
    },
  };
};

module.exports = {
  getAllStudyPlans,
  findStudyPlanById,
  createStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
};
