const { Router } = require("express");
const { uploadSinglePdf } = require("../middlewares/upload");
const { requireAuth, optionalAuth } = require("../middlewares/auth");
const { limiterParse, limiterChat } = require("../config/limits");
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
  chatCareer,
} = require("../controllers/career.controllers");

const router = Router();

router.get("/", getAllCareers);
router.get("/:id/subjects", getCareerSubjects);
router.get("/:id/graph", optionalAuth, getGraph);

router.post("/", requireAuth, createCareer);
router.post("/:id/parse-official", requireAuth, limiterParse, uploadSinglePdf, parseOfficial);
router.post("/:id/parse-correlativas", requireAuth, limiterParse, uploadSinglePdf, parseCorrelativas);
router.post("/:id/correlativas", requireAuth, saveCorrelativas);
router.post("/:id/subjects", requireAuth, saveSubjects);
router.post("/:id/publish", requireAuth, publishCareer);
router.post("/:id/chat", requireAuth, limiterChat, chatCareer);
router.patch("/:id", requireAuth, updateCareer);
router.delete("/:id", requireAuth, deleteCareer);

module.exports = router;