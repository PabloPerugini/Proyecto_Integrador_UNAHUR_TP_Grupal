const { Router } = require("express");
const {
  createUser,
  getAllUsers,
  getUserByNickName,
  updateUser,
  deleteUser,
  loginUser,
} = require("../controllers/user.controllers");
const validateUser = require("../middlewares/validateUser");
const validateUserExists = require("../middlewares/validateUserExists");

const router = Router();

router.post("/login", loginUser);
router.get("/", getAllUsers);
router.get("/:nickName", validateUserExists, getUserByNickName);
router.post("/", validateUser, createUser);
router.put("/:nickName", validateUserExists, updateUser);
router.delete("/:nickName", validateUserExists, deleteUser);

module.exports = router;