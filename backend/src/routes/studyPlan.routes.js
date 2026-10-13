const express = require("express");

const authStudyPlanOwnerOrAdmin =
  require("../middlewares/authStudyPlanOwnerOrAdmin");
const authStudyPlanViewer =
  require("../middlewares/authStudyPlanViewer");
const studyPlanController = require("../controllers/studyPlan.controllers");
const authUser = require("../middlewares/authUser");
const authAdmin = require("../middlewares/authAdmin");

const router = express.Router();

router.get(
    "/",
    authUser,
    studyPlanController.getAllStudyPlans
);

router.get(
    "/:id",
    authUser,
    studyPlanController.getStudyPlanById
);

// Grafo de correlatividades (solo lectura: viewer).
router.get(
  "/:id/graph",
  authUser,
  authStudyPlanViewer,
  studyPlanController.getGraph
);

// Sugerencias de inscripción AR-3 (solo lectura: viewer).
router.get(
  "/:id/sugerencias",
  authUser,
  authStudyPlanViewer,
  studyPlanController.getSugerencias
);
// Tecnicatura intermedia como sub-plan virtual (solo lectura: viewer).
router.get(
  "/:id/intermediate",
  authUser,
  authStudyPlanViewer,
  studyPlanController.getIntermediate
);
// NOTA: al hacer POST, fijarse si se repite (evitar planes duplicados).
router.post(
    "/",
    authUser,
    authAdmin,
    studyPlanController.createStudyPlan
);

router.patch(
  "/:id",
  authUser,
  authStudyPlanOwnerOrAdmin,
  studyPlanController.updateStudyPlan
);

router.delete(
  "/:id",
  authUser,
  authStudyPlanOwnerOrAdmin,
  studyPlanController.deleteStudyPlan
);

module.exports = router;