const mongoose = require("mongoose");
const AcaActivity = require("../models/acaActivity");
const UserStudyPlan = require("../models/userStudyPlan");

const CATEGORIES = new Set(["UC", "EF", "INSTITUTO"]);

function respondError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: "Error al gestionar las actividades ACA" });
}

async function findEnrollment(userId, enrollmentId) {
  if (!mongoose.isValidObjectId(enrollmentId)) {
    const error = new Error("ID de inscripción inválido");
    error.statusCode = 400;
    throw error;
  }

  const enrollment = await UserStudyPlan.findOne({
    _id: enrollmentId,
    user: userId,
  });
  if (!enrollment) {
    const error = new Error("El usuario no tiene acceso a este plan");
    error.statusCode = 403;
    throw error;
  }
  return enrollment;
}

function normalizeActivity(body = {}) {
  const title = String(body.title ?? "").trim();
  const credits = Number(body.credits);
  const interactionHours = Number(body.interactionHours ?? 0);

  if (!title || title.length > 150) {
    throw Object.assign(new Error("El nombre de la actividad es obligatorio (máximo 150 caracteres)"), { statusCode: 400 });
  }
  if (!CATEGORIES.has(body.category)) {
    throw Object.assign(new Error("La categoría ACA no es válida"), { statusCode: 400 });
  }
  if (!Number.isFinite(credits) || credits <= 0) {
    throw Object.assign(new Error("Los CRE deben ser mayores que cero"), { statusCode: 400 });
  }
  if (Math.abs(credits * 100 - Math.round(credits * 100)) > 1e-8) {
    throw Object.assign(new Error("Los CRE admiten hasta dos decimales"), { statusCode: 400 });
  }
  if (!Number.isFinite(interactionHours) || interactionHours < 0) {
    throw Object.assign(new Error("Las horas de interacción pedagógica deben ser cero o mayores"), { statusCode: 400 });
  }
  if (Math.abs(interactionHours * 100 - Math.round(interactionHours * 100)) > 1e-8) {
    throw Object.assign(new Error("Las horas admiten hasta dos decimales"), { statusCode: 400 });
  }

  return { title, category: body.category, credits, interactionHours };
}

const getAcaActivities = async (req, res) => {
  try {
    await findEnrollment(req.user._id, req.params.userStudyPlanId);
    const activities = await AcaActivity.find({
      userStudyPlan: req.params.userStudyPlanId,
    }).sort({ createdAt: 1 });
    return res.status(200).json({ activities });
  } catch (error) {
    return respondError(res, error);
  }
};

const createAcaActivity = async (req, res) => {
  try {
    await findEnrollment(req.user._id, req.params.userStudyPlanId);
    const activity = await AcaActivity.create({
      userStudyPlan: req.params.userStudyPlanId,
      ...normalizeActivity(req.body),
    });
    return res.status(201).json({ activity });
  } catch (error) {
    return respondError(res, error);
  }
};

const deleteAcaActivity = async (req, res) => {
  try {
    await findEnrollment(req.user._id, req.params.userStudyPlanId);
    if (!mongoose.isValidObjectId(req.params.activityId)) {
      return res.status(400).json({ message: "ID de actividad inválido" });
    }

    const activity = await AcaActivity.findOneAndDelete({
      _id: req.params.activityId,
      userStudyPlan: req.params.userStudyPlanId,
    });
    if (!activity) {
      return res.status(404).json({ message: "La actividad ACA no existe" });
    }
    return res.status(200).json({ message: "Actividad ACA eliminada" });
  } catch (error) {
    return respondError(res, error);
  }
};

module.exports = { getAcaActivities, createAcaActivity, deleteAcaActivity };
