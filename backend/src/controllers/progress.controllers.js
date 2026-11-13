const UserProgress = require("../models/userprogress");
const { SUBJECT_STATUS } = require("../models/userprogress");
const { parseAcademicHistory } = require("../services/pdfParser.service");
const AppError = require("../utils/AppError");

// POST /progress/parse-history (multipart, campo "file")
const parseHistory = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Enviá el PDF en el campo 'file'" });
    }
    let parsed;
    try {
      parsed = await parseAcademicHistory(req.file.buffer);
    } catch (error) {
      throw new AppError(
        400,
        "No se pudo leer el PDF. Asegurate de que sea un PDF con texto (no escaneado).",
        error.message,
      );
    }
    res.status(200).json({
      sourceKind: parsed.sourceKind,
      careerHint: parsed.careerHint,
      subjects: parsed.subjects,
      detectedCount: parsed.subjects.length,
    });
  } catch (error) {
    next(error);
  }
};

const VALID_STATUS = SUBJECT_STATUS;

// POST /progress  { careerId, entries: [{subjectCode,status,nota,fecha,origen,extraRequires}] }
const saveProgress = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Falta identificar al usuario (x-user-id)" });
    }
    const { careerId } = req.body;
    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    if (!careerId || !entries.length) {
      return res.status(400).json({ message: "Enviá careerId y un arreglo de entradas" });
    }
    const invalid = entries.find((e) => !e.subjectCode || !VALID_STATUS.includes(e.status));
    if (invalid) {
      return res.status(400).json({
        message: "Cada entrada debe tener subjectCode y un estado válido",
        error: `subjectCode=${invalid.subjectCode ?? "(vacío)"} status=${invalid.status ?? "(vacío)"}`,
      });
    }

    const ops = entries.map((e) => {
      const fecha = e.fecha ? new Date(e.fecha) : null;
      const set = {
        userId: req.userId,
        careerId,
        subjectCode: e.subjectCode,
        status: e.status,
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
    next(error);
  }
};

// GET /progress/me?careerId=
const getProgress = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Falta identificar al usuario (x-user-id)" });
    }
    const filter = { userId: req.userId };
    if (req.query.careerId) filter.careerId = req.query.careerId;

    const entries = await UserProgress.find(filter).select("-__v").sort({ subjectCode: 1 });

    const summary = await buildSummary(filter.careerId, req.userId);
    res.status(200).json({ entries, summary });
  } catch (error) {
    next(error);
  }
};

async function buildSummary(careerId, userId) {
  if (!careerId) return null;
  const [total, aprobadas] = await Promise.all([
    UserProgress.countDocuments({ careerId, userId }),
    UserProgress.countDocuments({ careerId, userId, status: "Aprobada" }),
  ]);
  return { aprobadas, total };
}

module.exports = { parseHistory, saveProgress, getProgress };