
const mongoose = require("mongoose");

const planImportService = require("../services/planImportService");

const {
  preparePdfExtraction,
  completePdfExtraction,
  failPdfExtraction,
} = require("../services/pdfExtractionCacheService");

const { isPdfBuffer } = require("../middlewares/upload");

const {
  parseOfficialPlan,
} = require("../services/pdfParser.service");

const {
  extractPlanWithAI,
} = require("../services/aiExtract.service");

const { isConfigured } = require("../services/ai.service");

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

    // Ya existe una extracción reutilizable
    if (cache.action === "REUSE") {
      return res.status(200).json({
        ...cache.result,
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

    // 2. Ejecutar el parser tradicional
    let parsed;

    try {
      parsed = await parseOfficialPlan(
        req.file.buffer
      );
    } catch (error) {
      const parseError = new Error(
        "No se pudo leer el PDF. Verificá que contenga texto extraíble"
      );

      parseError.statusCode = 422;
      throw parseError;
    }

    // 3. Intentar IA si el parser no detectó materias
    let aiFallback = false;
    let aiProvider = null;

    if (
      (!Array.isArray(parsed.subjects) ||
        parsed.subjects.length === 0) &&
      isConfigured()
    ) {
      try {
        const careerHint = req.file.originalname
          .replace(/\.pdf$/i, "")
          .replace(/[_-]+/g, " ")
          .slice(0, 120);

        const aiResult = await extractPlanWithAI(
          req.file.buffer,
          {
            careerHint,
            expectedMin: null,
            expectedMax: null,
          }
        );

        parsed = aiResult;
        aiFallback = true;
        aiProvider = aiResult.provider || null;

      } catch (error) {
        console.error(
          "Falló la extracción con IA:",
          error.message
        );
      }
    }

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

    // 5. Preparar el resultado
    const result = {
      sourceKind: parsed.sourceKind,
      subjects: parsed.subjects,
      detectedCount: parsed.subjects.length,
      intermediateTitle: parsed.intermediateTitle ?? null,
      creditsFinal: parsed.creditsFinal ?? 0,
      creditsIntermediate:
        parsed.creditsIntermediate ?? 0,
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
