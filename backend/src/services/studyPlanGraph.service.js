// Adaptador nueva arquitectura -> motores de grafo y sugerencias.
// Convierte PlanSubjects (prerequisites por ObjectId) al formato por códigos
// que esperan buildGraph/buildSugerencias, y el SubjectProgress del usuario
// al formato { subjectCode, status, nota }. Sin inscripción, progress = [].
const PlanSubject = require("../models/planSubject");
const UserStudyPlan = require("../models/userStudyPlan");
const SubjectProgress = require("../models/subjectProgress");
const { buildGraph } = require("./graph.service");
const { buildSugerencias } = require("./sugerencias.service");

const STATUS_ES = {
  APROBADA: "Aprobada",
  REGULARIZADA: "Regular",
  CURSANDO: "Cursando",
  PENDIENTE: "Pendiente",
};

async function loadPlanData(studyPlanId, userId) {
  const items = await PlanSubject.find({ studyPlan: studyPlanId })
    .populate("subject", "name")
    .lean();
  const codeById = new Map(
    items.map((ps) => [String(ps._id), ps.code?.trim() || String(ps._id).slice(-8)]),
  );
  const subjects = items.map((ps) => ({
    code: codeById.get(String(ps._id)),
    name: ps.subject?.name?.trim() || ps.code?.trim() || "Materia sin nombre",
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

module.exports = { loadPlanData, getGraphData, getSugerenciasData };
