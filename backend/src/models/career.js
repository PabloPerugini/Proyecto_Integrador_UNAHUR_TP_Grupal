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

    // Curaduría F0: las archivadas se ocultan en lecturas normales.
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Oculta archivadas salvo opt-in explícito { includeArchived: true }.
careerSchema.pre(/^find/, function () {
  if (!this.getOptions().includeArchived) {
    this.where({ isArchived: { $ne: true } });
  }
});

// Evita carreras duplicadas por instituto.
careerSchema.index({ name: 1, academicUnit: 1 }, { unique: true });

const Career = mongoose.model("Career", careerSchema);

module.exports = Career;