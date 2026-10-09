
const mongoose = require("mongoose");

const planImportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El usuario es obligatorio"],
    },

    fileName: {
      type: String,
      required: [true, "El nombre del archivo es obligatorio"],
      trim: true,
    },

    fileHash: {
      type: String,
      default: null,
    },

    processingMethod: {
      type: String,
      enum: ["PARSER", "IA", "HIBRIDO"],
      default: "PARSER",
    },

    status: {
      type: String,
      enum: [
        "PENDIENTE",
        "PROCESANDO",
        "COMPLETADA",
        "ERROR",
      ],
      default: "PENDIENTE",
    },

    studyPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyPlan",
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

const PlanImport = mongoose.model(
  "PlanImport",
  planImportSchema
);

module.exports = PlanImport;
