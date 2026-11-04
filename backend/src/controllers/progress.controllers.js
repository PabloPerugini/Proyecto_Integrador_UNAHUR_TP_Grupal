const { parseAcademicHistory } = require("../services/pdfParser.service");
const AppError = require("../utils/AppError");

// POST /progress/parse-history (multipart, campo "file")
// El progreso real usa /user-study-plans/:id/progress, NO el modelo
// antiguo UserProgress. UserProgress y sus funciones saveProgress /
// getProgress se eliminaron por código muerto.
const parseHistory = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Enviá el PDF en el campo 'file'" });
    }
    let parsed;
    try {
      parsed = await parseAcademicHistory(req.file.buffer);
    } catch {
      throw new AppError(
        400,
        "No se pudo leer el PDF. Asegurate de que sea un PDF con texto (no escaneado).",
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

module.exports = { parseHistory };
