const mongoose = require ("mongoose");

const studyPlanSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "El nombre del plan de estudio es obligatorio"],
            trim: true,
        },

        career: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Career",
            required: [true, "la carrera es obligatoria"],
        },
        resolution: {
            type: String,
            default: "",
            trim: true,
        },

        durationYears: {
            type: Number,
            default: 0,
        },

        creditsFinal: {
            type: Number,
            default: 0,
        },

        creditsIntermediate: {
            type: Number,
            default: 0,
        },

        intermediateTitle: {
            type: String,
            default: null,
            trim: true,
        },

        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);

module.exports = StudyPlan;