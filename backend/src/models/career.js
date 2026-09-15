const mongoose = require("mongoose");

const careerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Nombre de la carrera es obligatorio"],
      trim: true,
    },
    institute: { type: String, default: "", trim: true },
    color: { type: String, default: "", trim: true },
    planResolution: { type: String, default: "", trim: true },
    ruleCode: { type: String, default: "", trim: true },
    durationYears: { type: Number, default: 0 },
    creditsFinal: { type: Number, default: 0 },
    creditsIntermediate: { type: Number, default: 0 },
    intermediateTitle: { type: String, default: null, trim: true },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subjectCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Career = mongoose.model("Career", careerSchema);
module.exports = Career;