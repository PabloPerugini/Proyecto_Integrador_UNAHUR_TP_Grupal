
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

const authAdmin = require("../middlewares/authAdmin");

// Vista previa y confirmación: solo ADMIN (cuestan IA y crean planes).
router.post(
  "/preview",
  authAdmin,
  aiRateLimit,
  uploadSinglePdf,
  planImportController.previewPlanPdf
);

// Confirmar y guardar materias.
router.post(
  "/confirm",
  authAdmin,
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
