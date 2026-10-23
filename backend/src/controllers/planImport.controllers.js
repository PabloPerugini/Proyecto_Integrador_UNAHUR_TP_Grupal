
const mongoose = require("mongoose");

const planImportService = require("../services/planImportService");

const {
  preparePdfExtraction,
  completePdfExtraction,
  failPdfExtraction,
  refreshPdfExtraction,
} = require("../services/pdfExtractionCacheService");

const { isPdfBuffer } = require("../middlewares/upload");

const {
  classifyIntermediateWithAI,
} = require("../services/aiExtract.service");

const { isConfigured } = require("../services/ai.service");

const { extractPlan } = require("../services/planExtraction.strategy");

// Obtener las importaciones del usuario
const getUserPlanImports = async (req, res) => {
  try {
    const imports =
      await planImportService.getUserPlanImports(
        req.user._id
      );

    return res.status(200).json(imports);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener las importaciones",
    });
  }
};

// Obtener una importación específica
const getPlanImportById = async (req, res) => {
  try {
    const { importId } = req.params;

    if (!mongoose.isValidObjectId(importId)) {
      return res.status(400).json({
        message: "ID de importación inválido",
      });
    }

    const planImport =
      await planImportService.getPlanImportById(
        req.user._id,
        importId
      );

    if (!planImport) {
      return res.status(404).json({
        message: "Importación no encontrada",
      });
    }

    return res.status(200).json(planImport);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener la importación",
    });
  }
};

// Clasificar con IA el subconjunto del título intermedio (solo propone: se
// valida contra la lista real de materias y el admin lo revisa). Devuelve
// { classified, provider }. Se usa al parsear y al reutilizar un extracto
// cacheado que no la trae (fallo transitorio de IA: BUG-019).
const tryClassifyIntermediate = async (parsed, originalname) => {
  if (
    !parsed.intermediateTitle ||
    !Array.isArray(parsed.subjects) ||
    parsed.subjects.some((s) => s && s.intermediate === true) ||
    parsed.intermediateClassified ||
    !isConfigured()
  ) {
    return { classified: false, provider: null };
  }

  try {
    const careerHint = String(originalname || "")
      .replace(/\.pdf$/i, "")
      .replace(/[_-]+/g, " ")
      .slice(0, 120);

    const { names, provider, rejected } =
      await classifyIntermediateWithAI(parsed.subjects, {
        intermediateTitle: parsed.intermediateTitle,
        careerHint,
      });

    if (rejected) {
      console.warn(
        `Propuesta de intermedio descartada (${rejected} materias): el admin lo marca a mano`
      );
    }

    if (!names.length) {
      return { classified: false, provider: null };
    }

    const wanted = new Set(names.map((n) => n.trim().toLowerCase()));
    for (const subject of parsed.subjects) {
      if (
        subject &&
        typeof subject.name === "string" &&
        wanted.has(subject.name.trim().toLowerCase())
      ) {
        subject.intermediate = true;
      }
    }

    parsed.creditsIntermediate = parsed.subjects
      .filter((s) => s && s.intermediate && s.kind !== "ACA")
      .reduce((acc, s) => acc + (s.credits || 0), 0);
    parsed.intermediateClassified = true;

    return { classified: true, provider: provider || null };
  } catch (error) {
    console.error(
      "No se pudo clasificar el título intermedio con IA:",
      error.message
    );
    return { classified: false, provider: null };
  }
};

// Analizar un PDF de plan oficial
const previewPlanPdf = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Enviá un PDF en el campo 'file'",
    });
  }

  if (!isPdfBuffer(req.file.buffer)) {
    return res.status(400).json({
      message: "El archivo no es un PDF válido",
    });
  }

  let fileHash = null;
  let processing = false;

  try {
    // 1. Comprobar si ya procesamos este PDF
    const cache = await preparePdfExtraction(
      req.file.buffer
    );

    fileHash = cache.fileHash;

    // Ya existe una extracción reutilizable. Si quedó sin clasificar el
    // título intermedio (p. ej. por un 429 transitorio de la IA), se
    // reintenta acá y se refresca el extracto guardado (BUG-019).
    if (cache.action === "REUSE") {
      const result = { ...cache.result };
      const cls = await tryClassifyIntermediate(
        result,
        req.file.originalname
      );

      if (cls.classified) {
        if (!result.aiProvider) result.aiProvider = cls.provider;
        await refreshPdfExtraction(fileHash, result);
      }

      return res.status(200).json({
        ...result,
        cached: true,
        fileHash,
      });
    }

    // Otro usuario está procesando el mismo PDF
    if (cache.action === "WAIT") {
      return res.status(202).json({
        message: "Este PDF ya se está procesando",
        status: "PROCESANDO",
        fileHash,
      });
    }

    // Entrada que necesita recuperación
    if (cache.action === "RETRY") {
      return res.status(409).json({
        message: "La extracción guardada necesita revisión",
      });
    }

    if (cache.action !== "PARSE") {
      throw new Error("Estado de caché desconocido");
    }

    processing = true;

    // 2 y 3. Extracción del plan: parser determinístico primero y, si no
    // detectó materias, IA como fallback. La elección vive en el contexto
    // de estrategias (planExtraction.strategy.js); el controller solo
    // consume el resultado (parsed/aiFallback/aiProvider igual que antes).
    const extraction = await extractPlan(req.file.buffer, {
      originalname: req.file.originalname,
    });

    const parsed = extraction.parsed;
    const aiFallback = extraction.aiFallback;
    let aiProvider = extraction.aiProvider;

    // 4. Comprobar que obtuvimos materias
    if (
      !Array.isArray(parsed.subjects) ||
      parsed.subjects.length === 0
    ) {
      const error = new Error(
        "No se pudieron detectar materias en el PDF"
      );

      error.statusCode = 422;
      throw error;
    }

    // 4.b Si el plan declara un título intermedio pero el parser no marcó
    // ninguna materia (PDFs sin la sección formal del intermedio), se pide la
    // propuesta a la IA. Solo lee: se valida contra la lista real (BUG-017).
    let intermediateClassified = false;

    const cls = await tryClassifyIntermediate(
      parsed,
      req.file.originalname
    );

    if (cls.classified) {
      intermediateClassified = true;
      if (!aiProvider) aiProvider = cls.provider;
    }

    // 5. Preparar el resultado
    const result = {
      sourceKind: parsed.sourceKind,
      subjects: parsed.subjects,
      detectedCount: parsed.subjects.length,
      intermediateTitle: parsed.intermediateTitle ?? null,
      creditsFinal: parsed.creditsFinal ?? 0,
      creditsIntermediate:
        parsed.creditsIntermediate ?? 0,
      intermediateClassified,
      aiFallback,
      aiProvider,
    };

    // 6. Guardar la extracción en MongoDB
    await completePdfExtraction(
      fileHash,
      result
    );

    processing = false;

    return res.status(200).json({
      ...result,
      cached: false,
      fileHash,
    });

  } catch (error) {
    // Registrar el error si reservamos el procesamiento
    if (processing && fileHash) {
      try {
        await failPdfExtraction(
          fileHash,
          error.message
        );
      } catch (cacheError) {
        console.error(
          "Error al registrar fallo de extracción:",
          cacheError
        );
      }
    }

    console.error("Error al analizar PDF:", error);

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode === 422
          ? error.message
          : "Error interno al analizar el PDF",
    });
  }
};

module.exports = {
  getUserPlanImports,
  getPlanImportById,
  previewPlanPdf,
};
