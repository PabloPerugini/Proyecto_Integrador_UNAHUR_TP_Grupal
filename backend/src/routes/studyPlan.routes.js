const express = require("express");

const authStudyPlanOwnerOrAdmin =
  require("../middlewares/authStudyPlanOwnerOrAdmin");
const studyPlanController = require("../controllers/studyPlan.controllers");
const authUser = require("../middlewares/authUser");

const router = express.Router();

router.get(
    "/",
    authUser,
    studyPlanController.getAllStudyPlans
);

router.get(
    "/:id",
    authUser,
    studyPlanController.getStudyPlanById
);
//NOTA AL HACER POST FIAJRSE SI SE REPITE
router.post(
    "/",
    authUser,
    studyPlanController.createStudyPlan
);

router.patch(
  "/:id",
  authUser,
  authStudyPlanOwnerOrAdmin,
  studyPlanController.updateStudyPlan
);

router.delete(
  "/:id",
  authUser,
  authStudyPlanOwnerOrAdmin,
  studyPlanController.deleteStudyPlan
);

module.exports = router;