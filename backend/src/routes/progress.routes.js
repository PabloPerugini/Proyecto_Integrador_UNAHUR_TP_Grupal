// Solo lectura de PDF de historia académica. El progreso real usa
// /user-study-plans/:id/progress, NO el modelo antiguo UserProgress.
const { Router } = require("express");
const { uploadSinglePdf } = require("../middlewares/upload");
const authUser = require("../middlewares/authUser");
const { parseHistory } = require("../controllers/progress.controllers");
const router = Router();
router.post("/parse-history", authUser, uploadSinglePdf, parseHistory);
module.exports = router;
