const express = require("express");

const planSubjectController = require("../controllers/planSubject.controllers");
const authUser = require("../middlewares/authUser");
const authStudyPlanOwnerOrAdmin = require("../middlewares/authStudyPlanOwnerOrAdmin");
const authStudyPlanViewer = require("../middlewares/authStudyPlanViewer");
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

module.exports = router;