const express = require("express");
const authUser = require("../middlewares/authUser");
const acaActivityController = require("../controllers/acaActivity.controllers");

const router = express.Router();
router.use(authUser);

router.get(
  "/:userStudyPlanId/aca-activities",
  acaActivityController.getAcaActivities,
);
router.post(
  "/:userStudyPlanId/aca-activities",
  acaActivityController.createAcaActivity,
);
router.delete(
  "/:userStudyPlanId/aca-activities/:activityId",
  acaActivityController.deleteAcaActivity,
);

module.exports = router;
