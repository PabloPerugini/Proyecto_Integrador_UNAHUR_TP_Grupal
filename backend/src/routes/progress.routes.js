const { Router } = require("express");
const { uploadSinglePdf } = require("../middlewares/upload");
const withDeviceId = require("../middlewares/withDeviceId");
const { parseHistory, saveProgress, getProgress } = require("../controllers/progress.controllers");

const router = Router();

router.post("/parse-history", uploadSinglePdf, parseHistory);
router.post("/", withDeviceId, saveProgress);
router.get("/me", withDeviceId, getProgress);

module.exports = router;