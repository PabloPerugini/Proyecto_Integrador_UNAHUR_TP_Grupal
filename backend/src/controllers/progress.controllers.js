const progressService = require("../services/progressService");
const { parseAcademicHistory } = require("../services/pdfParser.service");
const AppError = require("../utils/AppError");

const { SUBJECT_STATUS: VALID_STATUS } = progressService;

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

    const saved = await progressService.saveEntries(
      req.userId,
      careerId,
      entries,
    );
    res.status(200).json({ saved });
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

    const { entries, summary } = await progressService.getUserProgress(
      req.userId,
      req.query.careerId,
    );
    res.status(200).json({ entries, summary });
  } catch (error) {
    next(error);
  }
};

module.exports = { parseHistory, saveProgress, getProgress };
