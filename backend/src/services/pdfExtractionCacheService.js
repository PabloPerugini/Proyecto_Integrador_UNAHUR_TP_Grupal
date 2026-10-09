
const crypto = require("crypto");
const PdfExtractionCache = require("../models/pdfExtractionCache");

// Cambiar cuando se modifique la lógica de extracción
const PARSER_VERSION = "v2";

// Calcular la huella digital del PDF
const getFileHash = (buffer) => {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 5 ||
    buffer.subarray(0, 5).toString("latin1") !== "%PDF-"
  ) {
    throw new Error("El archivo no tiene una firma PDF válida");
  }

  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
};

// Interpretar una entrada ya existente
const getCacheState = (entry, fileHash) => {
  if (
    entry.status === "COMPLETADA" &&
    Array.isArray(entry.result?.subjects) &&
    entry.result.subjects.length > 0
  ) {
    return {
      action: "REUSE",
      fileHash,
      result: entry.result,
    };
  }

  if (entry.status === "PROCESANDO") {
    return {
      action: "WAIT",
      fileHash,
    };
  }

  return {
    action: "RETRY",
    fileHash,
  };
};

// Comprobar si el PDF necesita procesamiento
const preparePdfExtraction = async (buffer) => {
  const fileHash = getFileHash(buffer);

  const filter = {
    fileHash,
    parserVersion: PARSER_VERSION,
  };

  const existing = await PdfExtractionCache.findOne(filter);

  if (existing) {
    // Si falló anteriormente, permitir un nuevo intento
    if (existing.status === "ERROR") {
      const retry = await PdfExtractionCache.findOneAndUpdate(
        { ...filter, status: "ERROR" },
        {
          $set: {
            status: "PROCESANDO",
            result: null,
            errorMessage: null,
          },
        },
        { new: true }
      );

      if (retry) {
        return { action: "PARSE", fileHash };
      }

      // Otra petición pudo iniciar el reintento
      const current = await PdfExtractionCache.findOne(filter);
      if (!current) {
        throw new Error("No se encontró la extracción");
      }

      return getCacheState(current, fileHash);
    }

    return getCacheState(existing, fileHash);
  }

  // Reservar el procesamiento de un PDF nuevo
  try {
    await PdfExtractionCache.create({
      ...filter,
      status: "PROCESANDO",
    });

    return { action: "PARSE", fileHash };
  } catch (error) {
    // Otra petición pudo registrar el mismo PDF
    if (error.code !== 11000) {
      throw error;
    }

    const current = await PdfExtractionCache.findOne(filter);

    if (!current) {
      throw error;
    }

    return getCacheState(current, fileHash);
  }
};

// Guardar una extracción exitosa
const completePdfExtraction = async (fileHash, result) => {
  if (
    !result ||
    !Array.isArray(result.subjects) ||
    result.subjects.length === 0
  ) {
    throw new Error("La extracción no contiene materias válidas");
  }

  const completed = await PdfExtractionCache.findOneAndUpdate(
    {
      fileHash,
      parserVersion: PARSER_VERSION,
      status: "PROCESANDO",
    },
    {
      $set: {
        status: "COMPLETADA",
        result,
        errorMessage: null,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!completed) {
    throw new Error("No hay una extracción en proceso");
  }

  return completed;
};

// Registrar un procesamiento fallido
const failPdfExtraction = async (fileHash, errorMessage) => {
  return PdfExtractionCache.findOneAndUpdate(
    {
      fileHash,
      parserVersion: PARSER_VERSION,
      status: "PROCESANDO",
    },
    {
      $set: {
        status: "ERROR",
        errorMessage: String(errorMessage).slice(0, 500),
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );
};

module.exports = {
  getFileHash,
  preparePdfExtraction,
  completePdfExtraction,
  failPdfExtraction,
};
