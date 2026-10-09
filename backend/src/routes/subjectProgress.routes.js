const express = require("express");

const subjectProgressController = require("../controllers/subjectProgress.controllers");
const authUser = require("../middlewares/authUser");

const router = express.Router();

router.use(authUser);

router.get(
    "/:userStudyPlanId/progress",
    subjectProgressController.getSubjectProgress
);

router.put(
    "/:userStudyPlanId/progress/:planSubjectId",
    subjectProgressController.saveSubjectProgress
);

module.exports = router;