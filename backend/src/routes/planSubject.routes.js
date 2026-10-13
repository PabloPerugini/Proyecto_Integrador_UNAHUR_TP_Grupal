const express = require("express");

const planSubjectController = require("../controllers/planSubject.controllers");
const authUser = require("../middlewares/authUser");
const authStudyPlanOwnerOrAdmin = require("../middlewares/authStudyPlanOwnerOrAdmin");
const authStudyPlanViewer = require("../middlewares/authStudyPlanViewer");
const {
  uploadSinglePdf,
} = require("../middlewares/upload");
const router = express.Router();

// Ver materias de un plan
router.get(
  "/:studyPlanId/subjects",
  authUser,
  authStudyPlanViewer,
  planSubjectController.getPlanSubjects
);

router.get(
  "/:studyPlanId/subjects/:id",
  authUser,
  authStudyPlanViewer,
  planSubjectController.getPlanSubjectById
);
// Agregar materia al plan
router.post(
  "/:studyPlanId/subjects",
  authUser,
  authStudyPlanOwnerOrAdmin,
  planSubjectController.createPlanSubject
);

// Actualizar materia del plan
router.patch(
  "/:studyPlanId/subjects/:id",
  authUser,
  authStudyPlanOwnerOrAdmin,
  planSubjectController.updatePlanSubject
);

// Eliminar materia del plan
router.delete(
  "/:studyPlanId/subjects/:id",
  authUser,
  authStudyPlanOwnerOrAdmin,
  planSubjectController.deletePlanSubject
);

// Parsea un PDF de correlativas contra las materias del plan (sin guardar).
router.post(
  "/:studyPlanId/parse-correlativas",
  authUser,
  authStudyPlanOwnerOrAdmin,
  uploadSinglePdf,
  planSubjectController.parseCorrelativasPlan
);

// Guarda correlativas del plan (whitelist + anti-ciclos; requires: [] limpia).
router.post(
  "/:studyPlanId/correlativas",
  authUser,
  authStudyPlanOwnerOrAdmin,
  planSubjectController.saveCorrelativasPlan
);

module.exports = router;