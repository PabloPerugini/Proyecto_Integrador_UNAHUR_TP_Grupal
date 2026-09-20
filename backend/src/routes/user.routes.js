const { Router } = require("express");
const {
  createUser,
  getUserByNickName,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser,
  getMe,
} = require("../controllers/user.controllers");
const validate = require("../middlewares/validateUser");
const validateUserExists = require("../middlewares/validateUserExists");
const { requireAuth } = require("../middlewares/auth");
const { userSchema, userUpdateSchema } = require("../schemas/user.schemas");

const router = Router();

router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/", validate(userSchema), createUser);
router.get("/me", requireAuth, getMe);
router.get("/:nickName", validateUserExists, getUserByNickName);
router.put("/:nickName", requireAuth, validateUserExists, validate(userUpdateSchema), updateUser);
router.delete("/:nickName", requireAuth, validateUserExists, deleteUser);

module.exports = router;