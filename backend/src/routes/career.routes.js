const { Router } = require("express");
const { uploadSinglePdf } = require("../middlewares/upload");
const authUser = require("../middlewares/authUser");
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

router.post("/", authUser, createCareer);
router.get("/", getAllCareers);
router.get("/:id/subjects", getCareerSubjects);
router.get("/:id/graph", authUser, getGraph);
router.post("/:id/parse-official", uploadSinglePdf, parseOfficial);
router.post("/:id/parse-correlativas", uploadSinglePdf, parseCorrelativas);
router.post("/:id/correlativas", saveCorrelativas);
router.post("/:id/subjects", saveSubjects);
router.post("/:id/publish", publishCareer);
router.patch("/:id", authUser, updateCareer);
router.delete("/:id", deleteCareer);

module.exports = router;