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

const Subject = mongoose.model("Subject", subjectSchema);

module.exports = Subject;