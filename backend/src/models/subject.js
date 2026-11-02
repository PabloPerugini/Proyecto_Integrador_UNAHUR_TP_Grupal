const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la materia es obligatorio"],
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// No único: el mismo slug puede repetirse entre planes/carreras y se resuelve
// por nombre dentro de cada plan. El índice acelera las búsquedas por slug.
subjectSchema.index({ slug: 1 });

const Subject = mongoose.model("Subject", subjectSchema);

module.exports = Subject;