
const crypto = require("crypto");
const PdfExtractionCache = require("../models/pdfExtractionCache");

// Cambiar cuando se modifique la lógica de extracción.
// v3: clasificación del título intermedio (nombre sin materias marcadas).
// v4: primera versión con caché por parserVersion.
// v5: parser v7d (E1/E4/E5, NFC, merge de nombres partidos, duración Bimestral).
const PARSER_VERSION = "v5";

// Un proceso que muere deja el registro en PROCESANDO para siempre. Pasado
// este tiempo el lock se considera vencido y otra petición puede reclamarlo.
const PROCESSING_LOCK_MS =
  Number(process.env.PDF_EXTRACTION_LOCK_MS) || 10 * 60 * 1000;

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

// Un lock viejo (o sin fecha) ya no representa un proceso vivo.
const isStaleProcessing = (entry, now = Date.now()) => {
  if (entry?.status !== "PROCESANDO") return false;

  const updated = entry.updatedAt
    ? new Date(entry.updatedAt).getTime()
    : NaN;

  return !Number.isFinite(updated) || now - updated > PROCESSING_LOCK_MS;
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
    // Lock vencido: reclamarlo de forma atómica antes de reprocesar. Si otro
    // request lo reclamó primero, se vuelve a evaluar el registro actual.
    if (isStaleProcessing(existing)) {
      const staleFilter = { ...filter, status: "PROCESANDO" };
      const updated = existing.updatedAt
        ? new Date(existing.updatedAt).getTime()
        : NaN;

      if (Number.isFinite(updated)) {
        staleFilter.updatedAt = {
          $lt: new Date(Date.now() - PROCESSING_LOCK_MS),
        };
      }

      const claimed = await PdfExtractionCache.findOneAndUpdate(
        staleFilter,
        {
          $set: {
            status: "PROCESANDO",
            result: null,
            errorMessage: null,
          },
        },
        { new: true }
      );

      if (claimed) {
        return { action: "PARSE", fileHash };
      }

      const current = await PdfExtractionCache.findOne(filter);
      if (!current) {
        throw new Error("No se encontró la extracción");
      }

      return getCacheState(current, fileHash);
    }

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

// Refrescar el resultado de una extracción COMPLETADA (p. ej. tras reintentar
// la clasificación del título intermedio sobre un extracto de caché).
const refreshPdfExtraction = async (fileHash, result) => {
  if (
    !result ||
    !Array.isArray(result.subjects) ||
    result.subjects.length === 0
  ) {
    throw new Error("La extracción no contiene materias válidas");
  }

  return PdfExtractionCache.findOneAndUpdate(
    {
      fileHash,
      parserVersion: PARSER_VERSION,
      status: "COMPLETADA",
    },
    { $set: { result } },
    { new: true, runValidators: true }
  );
};

module.exports = {
  getFileHash,
  preparePdfExtraction,
  completePdfExtraction,
  failPdfExtraction,
  refreshPdfExtraction,
};
