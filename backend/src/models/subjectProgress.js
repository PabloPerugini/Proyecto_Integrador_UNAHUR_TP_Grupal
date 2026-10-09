const mongoose = require("mongoose");

const subjectProgressSchema = new mongoose.Schema(
    {
        userStudyPlan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserStudyPlan",
            required: [true, "El plan del usuario es obligatorio"],
        },
        planSubject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PlanSubject",
            required: [true, "La materia del plan es obligatoria"],
        },

        
        academicDate: {
            type: Date,
            default: null,
        },

        origin: {
            type: String,
            trim: true,
            default: null,
        },


        status: {
            type: String,
            enum: [
                "PENDIENTE",
                "CURSANDO",
                "REGULARIZADA",
                "APROBADA",
            ],
            default: "PENDIENTE",
        },
        grade: {
            type: Number,
            min: 0,
            max: 10,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

subjectProgressSchema.index(
    {userStudyPlan:1, planSubject:1},
    {unique:true}
);

const SubjectProgress = mongoose.model(
    "SubjectProgress",
    subjectProgressSchema
);

module.exports = SubjectProgress;