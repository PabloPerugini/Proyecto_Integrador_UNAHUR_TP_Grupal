// Adaptador nueva arquitectura -> motores de grafo y sugerencias.
// Convierte PlanSubjects (prerequisites por ObjectId) al formato por códigos
// que esperan buildGraph/buildSugerencias, y el SubjectProgress del usuario
// al formato { subjectCode, status, nota }. Sin inscripción, progress = [].
const PlanSubject = require("../models/planSubject");
const UserStudyPlan = require("../models/userStudyPlan");
const SubjectProgress = require("../models/subjectProgress");
const StudyPlan = require("../models/studyPlan");
const { buildGraph } = require("./graph.service");
const { buildSugerencias } = require("./sugerencias.service");
const { uniqueSubjectCodes } = require("./codes.service");
const { ACTIVE_ENROLLMENT_FILTER } = require("./planVisibility");

const STATUS_ES = {
  APROBADA: "Aprobada",
  REGULARIZADA: "Regular",
  CURSANDO: "Cursando",
  PENDIENTE: "Pendiente",
};

// El nombre editado en el plan manda sobre el nombre del catálogo.
function subjectDisplayName(planSubject) {
  return (
    planSubject.nameOverride?.trim() ||
    planSubject.subject?.name?.trim() ||
    planSubject.code?.trim() ||
    "Materia sin nombre"
  );
}

async function loadPlanData(studyPlanId, userId) {
  const items = await PlanSubject.find({ studyPlan: studyPlanId })
    .populate("subject", "name")
    .lean();
  // Sin códigos únicos, dos 'ACA' repetidos generan dos nodos con el mismo id
  // y rompen el consumidor del grafo (React Flow exige ids únicos).
  const codeById = uniqueSubjectCodes(items.map((ps) => ({ _id: ps._id, code: ps.code })));
  const subjects = items.map((ps) => {
    const requirements = (ps.prerequisites || [])
      .map((p) => ({
        code: codeById.get(String(p.planSubject)),
        requiredStatus: p.requiredStatus || "REGULARIZADA",
      }))
      .filter((requirement) => requirement.code);
    return {
      planSubjectId: ps._id,
      code: codeById.get(String(ps._id)),
      name: subjectDisplayName(ps),
      year: ps.year ?? null,
      cuatrimestre: ps.period ?? null,
      duration: ps.duration || "CUATRIMESTRAL",
      credits: ps.credits ?? 0,
      kind: ps.kind || "Materia",
      optional: !!ps.optional,
      intermediate: !!ps.intermediate,
      requirements,
      // Compatibilidad con sugerencias.service.js (solo códigos).
      requires: requirements.map((requirement) => requirement.code),
    };
  });

  let progress = [];
  let userStudyPlanId = null;
  const enrollment = await UserStudyPlan.findOne({
    user: userId,
    studyPlan: studyPlanId,
    ...ACTIVE_ENROLLMENT_FILTER,
  });
  if (enrollment) {
    userStudyPlanId = enrollment._id;
    const rows = await SubjectProgress.find({
      userStudyPlan: enrollment._id,
    }).lean();
    progress = rows.map((r) => ({
      subjectCode: codeById.get(String(r.planSubject)) || String(r.planSubject),
      status: STATUS_ES[r.status] || "Pendiente",
      nota: r.grade ?? null,
      // sugerencias.service.js usa fecha/createdAt para actividad reciente y R5.
      fecha: r.academicDate ?? null,
      createdAt: r.createdAt ?? null,
    }));
  }
  return { subjects, progress, userStudyPlanId };
}

// Título, color e intermedia salen del plan y su carrera (fuente única).
async function loadPlanMeta(studyPlanId) {
  const plan = await StudyPlan.findById(studyPlanId)
    .populate({
      path: "career",
      select: "name color academicUnit",
      populate: { path: "academicUnit", select: "name color" },
    })
    .lean();

  if (!plan) return { title: "", color: null, intermediateTitle: null };

  const career = plan.career;
  const careerName = career?.name?.trim();
  return {
    title: careerName ? `${careerName} · ${plan.name}` : plan.name,
    color: career?.color || career?.academicUnit?.color || null,
    intermediateTitle: plan.intermediateTitle ?? null,
  };
}

async function getGraphData(studyPlanId, userId, { target = null } = {}) {
  const [planData, meta] = await Promise.all([
    loadPlanData(studyPlanId, userId),
    loadPlanMeta(studyPlanId),
  ]);
  return buildGraph({
    subjects: planData.subjects,
    progress: planData.progress,
    userStudyPlanId: planData.userStudyPlanId,
    target,
    ...meta,
  });
}

async function getSugerenciasData(studyPlanId, userId) {
  const { subjects, progress } = await loadPlanData(studyPlanId, userId);
  return buildSugerencias({ subjects, progress });
}

module.exports = {
  loadPlanData,
  getGraphData,
  getSugerenciasData,
  subjectDisplayName,
};
