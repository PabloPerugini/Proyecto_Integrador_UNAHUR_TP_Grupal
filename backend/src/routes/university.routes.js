const express = require("express");

const universityController = require("../controllers/university.controllers");
const authUser = require("../middlewares/authUser");
const authAdmin = require("../middlewares/authAdmin");

const router = express.Router();

router.get(
    "/",
    universityController.getAllUniversities
);

router.get(
    "/:id",
    universityController.getUniversityById
);

router.post(
    "/",
    authUser,
    authAdmin,
    universityController.createUniversity
);

router.patch(
    "/:id",
    authUser,
    authAdmin,
    universityController.updateUniversity
);

router.delete(
    "/:id",
    authUser,
    authAdmin,
    universityController.deleteUniversity
);

module.exports = router;