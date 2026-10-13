const express = require("express");

const careerController = require("../controllers/career.controllers");
const authUser = require("../middlewares/authUser");
const authAdmin = require("../middlewares/authAdmin");
const { optionalAuth } = require("../middlewares/auth");

const router = express.Router();

router.get(
  "/",
  optionalAuth,
  careerController.getAllCareers
);

router.get(
  "/:id",
  optionalAuth,
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