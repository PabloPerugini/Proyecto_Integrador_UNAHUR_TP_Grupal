
const express = require("express");

const userStudyPlanController = require("../controllers/userStudyPlan.controllers");
const authUser = require("../middlewares/authUser");

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authUser);

// Obtener mis planes
router.get(
  "/",
  userStudyPlanController.getUserStudyPlans
);

// Agregar un plan a mi cuenta
router.post(
  "/",
  userStudyPlanController.addUserStudyPlan
);

// Quitar un plan de mi cuenta
router.delete(
  "/:studyPlanId",
  userStudyPlanController.removeUserStudyPlan
);

module.exports = router;
