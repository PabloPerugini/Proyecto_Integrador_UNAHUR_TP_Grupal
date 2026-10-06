const mongoose = require("mongoose");

// Única fuente de estados válidos (Fase 5 §11.7): el validador de
// progress.controllers usa esta misma lista.
const SUBJECT_STATUS = ["Aprobada", "Regular", "Cursando", "Pendiente"];

const userProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    careerId: { type: mongoose.Schema.Types.ObjectId, ref: "Career", required: true },
    subjectCode: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: SUBJECT_STATUS,
      default: "Pendiente",
    },
    nota: { type: Number, default: null },
    fecha: { type: Date, default: null },
    origen: { type: String, default: null },
    extraRequires: { type: [String], default: [] },
  },
  { timestamps: true },
);

userProgressSchema.index({ userId: 1, careerId: 1, subjectCode: 1 }, { unique: true });

const UserProgress = mongoose.model("UserProgress", userProgressSchema);
module.exports = UserProgress;
module.exports.SUBJECT_STATUS = SUBJECT_STATUS;