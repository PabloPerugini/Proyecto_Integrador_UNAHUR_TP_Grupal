const { Router } = require("express");
const { uploadSinglePdf } = require("../middlewares/upload");
const authUser = require("../middlewares/authUser");
const { parseHistory, saveProgress, getProgress } = require("../controllers/progress.controllers");

const router = Router();

router.post("/parse-history", uploadSinglePdf, parseHistory);
router.post("/", authUser, saveProgress);
router.get("/me", authUser, getProgress);

module.exports = router;