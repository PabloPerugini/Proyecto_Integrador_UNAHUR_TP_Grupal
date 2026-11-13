
const StudyPlan = require("../models/studyPlan");
const Career = require("../models/career");
const PlanSubject = require("../models/planSubject");
const UserStudyPlan = require("../models/userStudyPlan");
const SubjectProgress = require("../models/subjectProgress");
const AcaActivity = require("../models/acaActivity");
const PlanImport = require("../models/planImport");

// Carreras con unidad populada (para colores por instituto en el front).
const populateCareer = {
  path: "career",
  populate: { path: "academicUnit", select: "name" },
};

// Visibilidad: ADMIN ve todo; el resto ve oficiales publicados + propios.
// (También filtra isActive salvo admin; ver F4.)
const visibleTo = (user) =>
  user.rol === "ADMIN"
    ? {}
    : {
        isActive: { $ne: false },
        $or: [
          {
            createdBy: null,
            status: "published",
          },
          {
            createdBy: user._id,
          },
        ],
      };

// Obtener todos los planes accesibles (filtro F1 ?career=).
const getAllStudyPlans = async (user, { career } = {}) => {
  const careerFilter = career ? { career } : {};

  return StudyPlan.find({ ...careerFilter, ...visibleTo(user) })
    .populate(populateCareer)
    .populate("createdBy");
};

// Obtener un plan por ID
const findStudyPlanById = async (id, user) => {
  return StudyPlan.findOne({ _id: id, ...visibleTo(user) })
    .populate(populateCareer)
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
    "intermediateTitle",
    "status",
    "planYear",
    "isActive",
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

  const [progress, removedEnrollments, subjects, imports, acaActivities] = await Promise.all([
    subjectIds.length
      ? SubjectProgress.deleteMany({ planSubject: { $in: subjectIds } })
      : { deletedCount: 0 },
    UserStudyPlan.deleteMany({ studyPlan: id }),
    PlanSubject.deleteMany({ studyPlan: id }),
    PlanImport.deleteMany({ studyPlan: id }),
    enrollments.length
      ? AcaActivity.deleteMany({ userStudyPlan: { $in: enrollments.map((e) => e._id) } })
      : { deletedCount: 0 },
  ]);

  await StudyPlan.findByIdAndDelete(id);

  return {
    deleted: true,
    removed: {
      subjects: subjects.deletedCount,
      enrollments: removedEnrollments.deletedCount,
      progress: progress.deletedCount,
      imports: imports.deletedCount,
      acaActivities: acaActivities.deletedCount,
    },
  };
};

// Título intermedio como sub-plan virtual cerrado.
// Respeta la misma visibilidad que findStudyPlanById.
const getIntermediateView = async (id, user) => {
  const plan = await findStudyPlanById(id, user);

  if (!plan || !plan.intermediateTitle) return null;

  const all = await PlanSubject.find({ studyPlan: id })
    .populate("prerequisites.planSubject", "code name")
    .lean();

  const byId = new Map(
    all.map((s) => [String(s._id), s.code]),
  );

  const reqCodes = (subject) =>
    (subject.prerequisites || [])
      .map((p) => {
        const ref = p.planSubject;
        if (ref && typeof ref === "object") return ref.code;
        return byId.get(String(ref)) || null;
      })
      .filter(Boolean);

  const interCodes = new Set(
    all.filter((s) => s.intermediate).map((s) => s.code),
  );

  const subjects = all
    .filter((s) => s.intermediate)
    .map((s) => {
      const reqs = reqCodes(s);
      return {
        code: s.code,
        name: s.name,
        year: s.year ?? null,
        requires: reqs.filter((c) => interCodes.has(c)),
        externalRequires: reqs.filter((c) => !interCodes.has(c)),
      };
    });

  return {
    planId: String(plan._id),
    planName: plan.name,
    intermediateTitle: plan.intermediateTitle,
    closed: subjects.every((s) => s.externalRequires.length === 0),
    total: subjects.length,
    subjects,
  };
};

module.exports = {
  getAllStudyPlans,
  findStudyPlanById,
  createStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
  getIntermediateView,
};
