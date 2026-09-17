const { Router } = require("express");
const { uploadSinglePdf } = require("../middlewares/upload");
const withDeviceId = require("../middlewares/withDeviceId");
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
  deleteCareer,
  updateCareer,
} = require("../controllers/career.controllers");

const router = Router();

router.post("/", createCareer);
router.get("/", getAllCareers);
router.get("/:id/subjects", getCareerSubjects);
router.get("/:id/graph", withDeviceId, getGraph);
router.post("/:id/parse-official", uploadSinglePdf, parseOfficial);
router.post("/:id/parse-correlativas", uploadSinglePdf, parseCorrelativas);
router.post("/:id/correlativas", saveCorrelativas);
router.post("/:id/subjects", saveSubjects);
router.post("/:id/publish", publishCareer);
router.patch("/:id", updateCareer);
router.delete("/:id", deleteCareer);

module.exports = router;