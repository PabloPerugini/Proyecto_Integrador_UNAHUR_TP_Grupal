
const mongoose = require("mongoose");

const UserStudyPlan = require("../models/userStudyPlan");
const StudyPlan = require("../models/studyPlan");
const SubjectProgress = require("../models/subjectProgress");

// Crear un error con código HTTP
const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Obtener los planes del usuario
const getUserStudyPlans = async (userId) => {
  const plans = await UserStudyPlan.find({
    user: userId,
    archivedAt: null,
  })
    .populate({
      path: "studyPlan",
      match: {
        $or: [
          { createdBy: userId },
          {
            createdBy: null,
            status: "published",
          },
        ],
      },
    })
    .sort({ createdAt: -1 });

  return plans.filter((plan) => plan.studyPlan !== null);
};

// Agregar un plan a la cuenta
const addUserStudyPlan = async (userId, studyPlanId) => {
  if (!mongoose.isValidObjectId(studyPlanId)) {
    throw createError(400, "ID de plan inválido");
  }

  const studyPlan = await StudyPlan.findOne({
    _id: studyPlanId,
    $or: [
      { createdBy: userId },
      {
        createdBy: null,
        status: "published",
      },
    ],
  });

  if (!studyPlan) {
    throw createError(
      404,
      "El plan no existe o no está disponible"
    );
  }

  const alreadyExists = await UserStudyPlan.findOne({
    user: userId,
    studyPlan: studyPlanId,
  });

  if (alreadyExists) {
    // Si estaba archivado, se reactiva conservando el progreso.
    if (alreadyExists.archivedAt) {
      alreadyExists.archivedAt = null;
      await alreadyExists.save();
      return alreadyExists;
    }

    throw createError(
      409,
      "Ya agregaste este plan de estudio"
    );
  }

  return UserStudyPlan.create({
    user: userId,
    studyPlan: studyPlanId,
  });
};

// Quitar un plan de la cuenta
const removeUserStudyPlan = async (userId, studyPlanId) => {
  if (!mongoose.isValidObjectId(studyPlanId)) {
    throw createError(400, "ID de plan inválido");
  }

  const userStudyPlan = await UserStudyPlan.findOne({
    user: userId,
    studyPlan: studyPlanId,
  });

  if (!userStudyPlan) {
    return null;
  }

  // Si hay progreso, la baja es reversible: se archiva y se conserva
  // el avance por si la persona vuelve a inscribirse al mismo plan.
  const hasProgress = await SubjectProgress.exists({
    userStudyPlan: userStudyPlan._id,
  });

  if (hasProgress) {
    userStudyPlan.archivedAt = new Date();
    await userStudyPlan.save();
    return userStudyPlan;
  }

  return UserStudyPlan.findOneAndDelete({
    _id: userStudyPlan._id,
    user: userId,
  });
};

module.exports = {
  getUserStudyPlans,
  addUserStudyPlan,
  removeUserStudyPlan,
};
