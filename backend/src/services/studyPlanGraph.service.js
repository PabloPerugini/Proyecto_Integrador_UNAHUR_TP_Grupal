// Adaptador nueva arquitectura -> motores de grafo y sugerencias.
// Convierte PlanSubjects (prerequisites por ObjectId) al formato por códigos
// que esperan buildGraph/buildSugerencias, y el SubjectProgress del usuario
// al formato { subjectCode, status, nota }. Sin inscripción, progress = [].
const PlanSubject = require("../models/planSubject");
const UserStudyPlan = require("../models/userStudyPlan");
const SubjectProgress = require("../models/subjectProgress");
const { buildGraph } = require("./graph.service");
const { buildSugerencias } = require("./sugerencias.service");
const { uniqueSubjectCodes } = require("./codes.service");

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
  const subjects = items.map((ps) => ({
    code: codeById.get(String(ps._id)),
    name: subjectDisplayName(ps),
    year: ps.year ?? null,
    cuatrimestre: ps.period ?? null,
    duration: ps.duration || "CUATRIMESTRAL",
    credits: ps.credits ?? 0,
    kind: ps.kind || "Materia",
    optional: !!ps.optional,
    intermediate: !!ps.intermediate,
    requires: (ps.prerequisites || [])
      .map((p) => codeById.get(String(p.planSubject)))
      .filter(Boolean),
  }));

  let progress = [];
  const enrollment = await UserStudyPlan.findOne({
    user: userId,
    studyPlan: studyPlanId,
  });
  if (enrollment) {
    const rows = await SubjectProgress.find({
      userStudyPlan: enrollment._id,
    }).lean();
    progress = rows.map((r) => ({
      subjectCode: codeById.get(String(r.planSubject)) || String(r.planSubject),
      status: STATUS_ES[r.status] || "Pendiente",
      nota: r.grade ?? null,
    }));
  }
  return { subjects, progress };
}

async function getGraphData(studyPlanId, userId, title = "") {
  const { subjects, progress } = await loadPlanData(studyPlanId, userId);
  return buildGraph({ subjects, progress, title });
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
