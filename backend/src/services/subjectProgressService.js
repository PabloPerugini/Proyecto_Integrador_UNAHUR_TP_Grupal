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
    });
    
    if (!planSubject) {
        throw new Error("La materia no pertence a este plan");
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