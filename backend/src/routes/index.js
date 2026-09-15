const { Router } = require("express");
const userRoutes = require("./user.routes");
const careerRoutes = require("./career.routes");
const progressRoutes = require("./progress.routes");

const router = Router();

router.get("/", (req, res) => {
  res.json({
    name: "UNAHUR TP API",
    status: "ok",
    docs: "/api-docs",
    health: "/health",
  });
});

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/users", userRoutes);
router.use("/careers", careerRoutes);
router.use("/progress", progressRoutes);

module.exports = router;