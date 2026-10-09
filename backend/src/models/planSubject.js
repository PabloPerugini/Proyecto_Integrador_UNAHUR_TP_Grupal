const mongoose = require("mongoose");

const planSubjectSchema = new mongoose.Schema(
  {
    studyPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyPlan",
      required: [true, "El plan de estudio es obligatorio"],
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "La materia es obligatoria"],
    },

    code: {
      type: String,
      default: "",
      trim: true,
    },

    kind: {
      type: String,
      enum: ["Materia", "ACA", "AU", "OTRA"],
      default: "Materia",
    },

    generic: {
      type: String,
      enum: ["CFC", "CFB", "CFP", "ACA", null],
      default: null,
    },

    year: {
      type: Number,
      default: null,
    },

    period: {
      type: Number,
      default: null,
    },

    duration: {
      type: String,
      enum: [
        "CUATRIMESTRAL",
        "SEMESTRAL",
        "ANUAL",
        "TRIMESTRAL",
        "OTRA",
      ],
      default: "CUATRIMESTRAL",
    },


    hours: {
      weekly: {
        type: Number,
        min: 0,
        default: null,
      },
      total: {
        type: Number,
        min: 0,
        default: null,
      },
      his: {
        type: Number,
        min: 0,
        default: null,
      },
      hit: {
        type: Number,
        min: 0,
        default: null,
      },
      hite: {
        type: Number,
        min: 0,
        default: null,
      },
      hip: {
        type: Number,
        min: 0,
        default: null,
      },
      htat: {
        type: Number,
        min: 0,
        default: null,
      },
      ht: {
        type: Number,
        min: 0,
        default: null,
      },
    },


    credits: {
      type: Number,
      default: 0,
    },

    optional: {
      type: Boolean,
      default: false,
    },

    intermediate: {
      type: Boolean,
      default: false,
    },

    prerequisites: [
        {
            planSubject: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "PlanSubject",
                required: true,
            },

            requiredStatus: {
                type: String,
                enum: ["REGULARIZADA", "APROBADA"],
                default: "APROBADA",
            },
        },
    ],
  },
  {
    timestamps: true,
  }
);

// Una materia no debería aparecer dos veces
// dentro del mismo plan
planSubjectSchema.index(
  {
    studyPlan: 1,
    subject: 1,
  },
  {
    unique: true,
  }
);

const PlanSubject = mongoose.model(
  "PlanSubject",
  planSubjectSchema
);

module.exports = PlanSubject;