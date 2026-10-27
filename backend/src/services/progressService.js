const UserProgress = require("../models/userprogress");
const { SUBJECT_STATUS } = require("../models/userprogress");
const Subject = require("../models/subject");

// Guarda (upsert) las entradas de progreso de una carrera para un usuario.
// Devuelve cuántas se insertaron o modificaron.
const saveEntries = async (userId, careerId, entries) => {
  const ops = entries.map((entry) => {
    const fecha = entry.fecha ? new Date(entry.fecha) : null;
    const set = {
      userId,
      careerId,
      subjectCode: entry.subjectCode,
      status: entry.status,
      nota: entry.nota ?? null,
      fecha: fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
      origen: entry.origen ?? null,
      extraRequires: Array.isArray(entry.extraRequires)
        ? entry.extraRequires.map(String)
        : [],
    };

    return {
      updateOne: {
        filter: { userId, careerId, subjectCode: entry.subjectCode },
        update: { $set: set },
        upsert: true,
      },
    };
  });

  const result = await UserProgress.bulkWrite(ops, { ordered: false });
  return result.upsertedCount + result.modifiedCount;
};

// Resumen de créditos de una carrera: total del plan y aprobados por el
// usuario. Sin careerId no hay resumen (el endpoint lo usa para "todas").
const buildSummary = async (careerId, userId) => {
  if (!careerId) return null;

  const [subjects, progress] = await Promise.all([
    Subject.find({ careerId }).select("code credits"),
    UserProgress.find({ careerId, userId }).select("subjectCode status credits"),
  ]);

  const byCode = new Map(subjects.map((subject) => [subject.code, subject]));
  const creditsTotal = subjects.reduce(
    (total, subject) => total + (subject.credits || 0),
    0,
  );

  let creditsAprobados = 0;
  let aprobadas = 0;

  for (const entry of progress) {
    if (entry.status !== "Aprobada") continue;
    aprobadas += 1;
    const subject = byCode.get(entry.subjectCode);
    creditsAprobados += subject ? subject.credits || 0 : 0;
  }

  return {
    creditsTotal,
    creditsAprobados,
    aprobadas,
    total: subjects.length,
  };
};

// Entradas del usuario (opcionalmente filtradas por carrera) + resumen.
const getUserProgress = async (userId, careerId) => {
  const filter = { userId };
  if (careerId) filter.careerId = careerId;

  const entries = await UserProgress.find(filter)
    .select("-__v")
    .sort({ subjectCode: 1 });

  const summary = await buildSummary(filter.careerId, userId);

  return { entries, summary };
};

module.exports = {
  SUBJECT_STATUS,
  saveEntries,
  getUserProgress,
};
