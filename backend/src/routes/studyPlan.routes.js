const express = require("express");

const authStudyPlanOwnerOrAdmin =
  require("../middlewares/authStudyPlanOwnerOrAdmin");
const authStudyPlanViewer =
  require("../middlewares/authStudyPlanViewer");
const studyPlanController = require("../controllers/studyPlan.controllers");
const authUser = require("../middlewares/authUser");

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
//NOTA AL HACER POST FIAJRSE SI SE REPITE
router.post(
    "/",
    authUser,
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