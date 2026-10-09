
const express = require("express");

const universityController = require(
  "../controllers/university.controllers"
);

const authUser = require("../middlewares/authUser");
const authAdmin = require("../middlewares/authAdmin");

const router = express.Router();

// Consultar universidades existentes.
router.get(
  "/",
  universityController.getAllUniversities
);

// Solamente administradores pueden crearlas.
router.post(
  "/",
  authUser,
  authAdmin,
  universityController.createUniversity
);

module.exports = router;
