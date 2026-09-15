const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    careerId: { type: mongoose.Schema.Types.ObjectId, ref: "Career", required: true },
    subjectCode: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Aprobada", "Regular", "Cursando", "Pendiente"],
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