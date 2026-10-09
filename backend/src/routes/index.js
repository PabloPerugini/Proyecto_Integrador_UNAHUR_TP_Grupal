
const { Router } = require("express");

const careerRoutes = require("./career.routes");
const progressRoutes = require("./progress.routes");
const userRoutes = require("./user.routes");
const universityRoutes = require("./university.routes");
const planImportRoutes = require("./planImport.routes");
const academicUnitRoutes = require("./academicUnit.routes");

const studyPlanRoutes = require("./studyPlan.routes");
const planSubjectRoutes = require("./planSubject.routes");

const userStudyPlanRoutes = require("./userStudyPlan.routes");
const subjectProgressRoutes = require("./subjectProgress.routes");

const router = Router();

// Información general
router.get("/", (req, res) => {
  res.json({
    name: "UNAHUR TP API",
    status: "ok",
    docs: "/api-docs",
    health: "/health",
  });
});

// Salud del backend
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Rutas existentes
router.use("/careers", careerRoutes);
router.use("/progress", progressRoutes);
router.use("/users", userRoutes);
router.use("/universities", universityRoutes);
router.use("/academic-units", academicUnitRoutes);
router.use("/plan-imports", planImportRoutes);

// NUEVO: Materias de cada plan
router.use("/study-plans", planSubjectRoutes);

// NUEVO: Planes de estudio
router.use("/study-plans", studyPlanRoutes);

// Progreso académico nuevo: UserStudyPlan + SubjectProgress
router.use("/user-study-plans", subjectProgressRoutes);
router.use("/user-study-plans", userStudyPlanRoutes);

module.exports = router;
