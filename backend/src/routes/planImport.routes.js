
const express = require("express");

const planImportController = require(
  "../controllers/planImport.controllers"
);

const confirmationController = require(
  "../controllers/planImportConfirmation.controllers"
);

const authUser = require("../middlewares/authUser");

const {
  uploadSinglePdf,
} = require("../middlewares/upload");

const { aiRateLimit } = require("../middlewares/rateLimitAi");

const router = express.Router();

router.use(authUser);

// Leer un PDF sin guardar un StudyPlan (con cota de IA: el fallback
// consume créditos externos; redes privadas/LAN exentas por defecto).
router.post(
  "/preview",
  aiRateLimit,
  uploadSinglePdf,
  planImportController.previewPlanPdf
);

// Confirmar y guardar materias.
router.post(
  "/confirm",
  confirmationController.confirm
);

// Historial de importaciones.
router.get(
  "/",
  planImportController.getUserPlanImports
);

// Consultar una importación específica.
router.get(
  "/:importId",
  planImportController.getPlanImportById
);

module.exports = router;
