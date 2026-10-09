
const mongoose = require("mongoose");

const pdfExtractionCacheSchema = new mongoose.Schema(
  {
    fileHash: {
      type: String,
      required: true,
      lowercase: true,
      match: /^[a-f0-9]{64}$/,
    },

    parserVersion: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["PROCESANDO", "COMPLETADA", "ERROR"],
      default: "PROCESANDO",
    },

    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

pdfExtractionCacheSchema.index(
  { fileHash: 1, parserVersion: 1 },
  { unique: true }
);

const PdfExtractionCache = mongoose.model(
  "PdfExtractionCache",
  pdfExtractionCacheSchema
);

module.exports = PdfExtractionCache;
