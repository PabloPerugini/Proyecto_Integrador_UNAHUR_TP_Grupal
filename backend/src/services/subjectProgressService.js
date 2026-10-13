const SubjectProgress = require("../models/subjectProgress");
const UserStudyPlan = require("../models/userStudyPlan");
const PlanSubject = require("../models/planSubject");

const validateUserStudyPlan = async (userId, userStudyPlanId) => {
    const userStudyPlan = await UserStudyPlan.findOne({
        _id: userStudyPlanId,
        user: userId,
    });

    if (!userStudyPlan) {
        throw new Error("El usuario no tiene acceso a este plan");
    }
    
    return userStudyPlan;
};

const getSubjectProgress = async (userId, userStudyPlanId) => {
    await validateUserStudyPlan(userId, userStudyPlanId);

    return SubjectProgress.find({
        userStudyPlan: userStudyPlanId,
    }).populate("planSubject");
};

const saveSubjectProgress = async (
    userId,
    userStudyPlanId,
    planSubjectId,
    progressData
) => {
    const userStudyPlan = await validateUserStudyPlan(
        userId,
        userStudyPlanId
    );

    const planSubject = await PlanSubject.findOne({
        _id: planSubjectId,
        studyPlan: userStudyPlan.studyPlan,
    }).populate("prerequisites.planSubject", "code name");

    if (!planSubject) {
        throw new Error("La materia no pertence a este plan");
    }

    // Regla de correlativas: para avanzar (cursar/regularizar/aprobar) hay que
    // tener cada prerequisite en el estado requerido. Volver a PENDIENTE
    // siempre está permitido.
    const nextStatus = progressData.status;
    if (nextStatus !== undefined && nextStatus !== "PENDIENTE") {
        const states = new Map(
            (
                await SubjectProgress.find({
                    userStudyPlan: userStudyPlanId,
                }).select("planSubject status")
            ).map((p) => [String(p.planSubject), p.status]),
        );

        const missing = [];
        for (const prereq of planSubject.prerequisites || []) {
            const ref = prereq.planSubject;
            const refId = ref && typeof ref === "object" ? String(ref._id) : String(ref);
            const state = states.get(refId) || "PENDIENTE";
            const ok =
                prereq.requiredStatus === "APROBADA"
                    ? state === "APROBADA"
                    : state === "REGULARIZADA" || state === "APROBADA";
            if (!ok) {
                const label =
                    ref && typeof ref === "object" && ref.code
                        ? `${ref.code}`
                        : "la correlativa";
                missing.push(
                    `${label} (${prereq.requiredStatus === "APROBADA" ? "aprobada" : "regularizada"})`,
                );
            }
        }

        if (missing.length > 0) {
            throw new Error(
                `No podés avanzar ${planSubject.code || "la materia"} sin ${missing.join(", ")}`,
            );
        }
    }


    const updateData = {};

    if (progressData.status !== undefined) {
    updateData.status = progressData.status;
    }

    if (progressData.grade !== undefined) {
    updateData.grade = progressData.grade;
    }

    if (progressData.academicDate !== undefined) {
    updateData.academicDate = progressData.academicDate;
    }

    if (progressData.origin !== undefined) {
    updateData.origin = progressData.origin;
    }


    return SubjectProgress.findOneAndUpdate(
        {
            userStudyPlan: userStudyPlanId,
            planSubject: planSubjectId,
        },
        {
            $set: updateData,
        },
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
        }
    );
};

module.exports = {
  getSubjectProgress,
  saveSubjectProgress,
};