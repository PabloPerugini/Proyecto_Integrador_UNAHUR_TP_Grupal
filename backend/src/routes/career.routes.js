const express = require("express");

const careerController = require("../controllers/career.controllers");
const authUser = require("../middlewares/authUser");
const authAdmin = require("../middlewares/authAdmin");

const router = express.Router();

router.get(
  "/",
  careerController.getAllCareers
);

router.get(
  "/:id",
  careerController.getCareerById
);

router.post(
  "/",
  authUser,
  authAdmin,
  careerController.createCareer
)

router.patch(
  "/:id",
  authUser,
  authAdmin,
  careerController.updateCareer
)

router.delete(
  "/:id",
  authUser,
  authAdmin,
  careerController.deleteCareer
);

module.exports = router;