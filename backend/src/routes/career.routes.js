const { Router } = require("express");
const { uploadSinglePdf } = require("../middlewares/upload");
const withDeviceId = require("../middlewares/withDeviceId");
const { aiRateLimit } = require("../middlewares/rateLimitAi");
const {
  createCareer,
  getAllCareers,
  getCareerSubjects,
  parseOfficial,
  saveSubjects,
  parseCorrelativas,
  saveCorrelativas,
  publishCareer,
  getGraph,
  getSugerencias,
  deleteCareer,
  updateCareer,
} = require("../controllers/career.controllers");

const router = Router();

router.post("/", createCareer);
router.get("/", getAllCareers);
router.get("/:id/subjects", getCareerSubjects);
router.get("/:id/graph", withDeviceId, getGraph);
router.get("/:id/sugerencias", withDeviceId, getSugerencias);
// Solo las 2 rutas que pueden gastar créditos de IA externa llevan aiRateLimit:
// el resto del CRUD no toca proveedores (ver 1.7 del plan de mejoras).
router.post("/:id/parse-official", aiRateLimit, uploadSinglePdf, parseOfficial);
router.post("/:id/parse-correlativas", aiRateLimit, uploadSinglePdf, parseCorrelativas);
router.post("/:id/correlativas", saveCorrelativas);
router.post("/:id/subjects", saveSubjects);
router.post("/:id/publish", publishCareer);
router.patch("/:id", updateCareer);
router.delete("/:id", deleteCareer);

module.exports = router;