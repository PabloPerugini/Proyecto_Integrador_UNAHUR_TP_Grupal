const express = require("express");

const userController = require("../controllers/user.controllers");

const validarUser = require("../middlewares/validateUser");
const authUser = require("../middlewares/authUser");
const authAdmin = require("../middlewares/authAdmin");
const authOwnerOrAdmin = require("../middlewares/authOwnerOrAdmin");

const router = express.Router();

router.post(
  "/register",
  validarUser,
  userController.createUser
);

router.post(
  "/login",
  userController.loginUser
);

router.get(
  "/",
  authUser,
  authAdmin,
  userController.getAllUsers
);

router.get(
  "/:nickName",
  authUser,
  authOwnerOrAdmin,
  userController.getUserByNickName
);

router.patch(
  "/:nickName",
  authUser,
  authOwnerOrAdmin,
  userController.updateUser
);

router.delete(
  "/:nickName",
  authUser,
  authOwnerOrAdmin,
  userController.deleteUser
);

module.exports = router;