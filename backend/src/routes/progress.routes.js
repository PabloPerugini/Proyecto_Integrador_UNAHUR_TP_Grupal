const { Router } = require("express");
const { uploadSinglePdf } = require("../middlewares/upload");
const { requireAuth } = require("../middlewares/auth");
const { parseHistory, saveProgress, getProgress } = require("../controllers/progress.controllers");

const router = Router();

router.post("/parse-history", requireAuth, uploadSinglePdf, parseHistory);
router.post("/", requireAuth, saveProgress);
router.get("/me", requireAuth, getProgress);

module.exports = router;