const express = require("express");

const academicUnitController = require("../controllers/academicUnit.controllers");
const authUser = require("../middlewares/authUser");
const authAdmin = require("../middlewares/authAdmin");

const router = express.Router();

router.get(
    "/",
    academicUnitController.getAllAcademicUnits
);

router.get(
    "/:id",
    academicUnitController.getAcademicUnitById
);

router.post(
    "/",
    authUser,
    authAdmin,
    academicUnitController.createAcademicUnit
);

router.patch(
    "/:id",
    authUser,
    authAdmin,
    academicUnitController.updateAcademicUnit
);


router.delete(
    "/:id",
    authUser,
    authAdmin,
    academicUnitController.deleteAcademicUnit
);

module.exports = router;