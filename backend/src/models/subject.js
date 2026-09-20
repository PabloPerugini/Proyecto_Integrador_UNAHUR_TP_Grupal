const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    careerId: { type: mongoose.Schema.Types.ObjectId, ref: "Career", required: true },
    code: { type: String, required: [true, "Código es obligatorio"], trim: true },
    name: { type: String, required: [true, "Nombre es obligatorio"], trim: true },
    slug: { type: String, trim: true, lowercase: true },
    year: { type: Number, default: null },
    cuatrimestre: { type: Number, default: null },
    duration: { type: String, enum: ["C", "A", "TF"], default: "C" },
    hours: {
      his: { type: Number, default: 0 },
      hit: { type: Number, default: 0 },
      hite: { type: Number, default: 0 },
      hip: { type: Number, default: 0 },
      htat: { type: Number, default: 0 },
      ht: { type: Number, default: 0 },
    },
    credits: { type: Number, default: 0 },
    kind: { type: String, enum: ["Materia", "ACA", "AU", "OTRA"], default: "Materia" },
    generic: { type: String, enum: ["CFC", "CFB", "CFP", "ACA", null], default: null },
    trayecto: { type: String, default: null, trim: true },
    optional: { type: Boolean, default: false },
    intermediate: { type: Boolean, default: false },
    requires: { type: [String], default: [] },
  },
  { timestamps: true },
);

subjectSchema.index({ careerId: 1, code: 1 });
subjectSchema.index({ careerId: 1, slug: 1 });

const Subject = mongoose.model("Subject", subjectSchema);
module.exports = Subject;