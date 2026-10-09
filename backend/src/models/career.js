const mongoose = require("mongoose");

const careerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la carrera es obligatorio"],
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: [true, "La universidad es obligatoria"],
    },

    academicUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicUnit",
      default: null,
    },

    color: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Career = mongoose.model("Career", careerSchema);

module.exports = Career;