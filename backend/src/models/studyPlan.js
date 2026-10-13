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

        // Versionado liviano F4: año del plan y vigencia.
        planYear: {
            type: Number,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
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

studyPlanSchema.index({ name: 1, career: 1 }, { unique: true });

const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);

module.exports = StudyPlan;