const UserProgress = require("../models/userprogress");
const Subject = require("../models/subject");
const { parseAcademicHistory } = require("../services/pdfParser.service");
const { sendInternalError } = require("../utils/http");
const { isPdfBuffer } = require("../utils/pdf");

// POST /progress/parse-history (multipart, campo "file")
const parseHistory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Enviá el PDF en el campo 'file'" });
    }
    if (!isPdfBuffer(req.file.buffer)) {
      return res.status(400).json({ message: "El archivo no es un PDF válido" });
    }
    const parsed = await parseAcademicHistory(req.file.buffer);
    res.status(200).json({
      sourceKind: parsed.sourceKind,
      careerHint: parsed.careerHint,
      subjects: parsed.subjects,
      detectedCount: parsed.subjects.length,
    });
  } catch (error) {
    sendInternalError(res, error, "parseHistory");
  }
};

const VALID_STATUS = ["Aprobada", "Regular", "Cursando", "Pendiente"];

// POST /progress  { careerId, entries: [{subjectCode,status,nota,fecha,origen,extraRequires}] }
const saveProgress = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Falta la sesión del usuario" });
    }
    const { careerId } = req.body;
    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    if (!careerId || !entries.length) {
      return res.status(400).json({ message: "Enviá careerId y un arreglo de entradas" });
    }

    const ops = entries.map((e) => {
      const status = VALID_STATUS.includes(e.status) ? e.status : "Pendiente";
      const fecha = e.fecha ? new Date(e.fecha) : null;
      const set = {
        userId: req.userId,
        careerId,
        subjectCode: e.subjectCode,
        status,
        nota: e.nota ?? null,
        fecha: fecha && !isNaN(fecha.getTime()) ? fecha : null,
        origen: e.origen ?? null,
        extraRequires: Array.isArray(e.extraRequires) ? e.extraRequires.map(String) : [],
      };
      return {
        updateOne: {
          filter: { userId: req.userId, careerId, subjectCode: e.subjectCode },
          update: { $set: set },
          upsert: true,
        },
      };
    });

    const result = await UserProgress.bulkWrite(ops, { ordered: false });
    res.status(200).json({ saved: result.upsertedCount + result.modifiedCount });
  } catch (error) {
    sendInternalError(res, error, "saveProgress");
  }
};

// GET /progress/me?careerId=
const getProgress = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Falta la sesión del usuario" });
    }
    const filter = { userId: req.userId };
    if (req.query.careerId) filter.careerId = req.query.careerId;

    const entries = await UserProgress.find(filter).select("-__v").sort({ subjectCode: 1 });

    const summary = await buildSummary(filter.careerId, req.userId);
    res.status(200).json({ entries, summary });
  } catch (error) {
    sendInternalError(res, error, "getProgress");
  }
};

async function buildSummary(careerId, userId) {
  if (!careerId) return null;
  const [subjects, progress] = await Promise.all([
    Subject.find({ careerId }).select("code credits"),
    UserProgress.find({ careerId, userId }).select("subjectCode status credits"),
  ]);
  const byCode = new Map(subjects.map((s) => [s.code, s]));
  const creditsTotal = subjects.reduce((a, s) => a + (s.credits || 0), 0);
  let creditsAprobados = 0;
  let aprobadas = 0;
  for (const p of progress) {
    if (p.status === "Aprobada") {
      aprobadas++;
      const s = byCode.get(p.subjectCode);
      creditsAprobados += s ? s.credits || 0 : 0;
    }
  }
  return { creditsTotal, creditsAprobados, aprobadas, total: subjects.length };
}

module.exports = { parseHistory, saveProgress, getProgress };