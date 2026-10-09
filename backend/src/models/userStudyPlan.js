const mongoose = require("mongoose");

const userStudyPlanSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "El usuario es obligatorio"],
        },
        studyPlan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StudyPlan",
            required: [true, "El plan de estudio es obligatorio"],
        },
    },
    {
        timestamps: true,
    }
);

userStudyPlanSchema.index(
    {
        user:1,
        studyPlan:1,
    },
    {
        unique: true,
    }
);

const UserStudyPlan = mongoose.model(
    "UserStudyPlan",
    userStudyPlanSchema
);

module.exports = UserStudyPlan;