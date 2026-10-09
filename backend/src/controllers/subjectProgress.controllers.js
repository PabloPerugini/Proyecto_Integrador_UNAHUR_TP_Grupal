const subjectProgressService = require("../services/subjectProgressService");

const getSubjectProgress = async (req, res) => {
    try {
        const userId = req.user._id;
        const {userStudyPlanId} = req.params;

        const progress = await subjectProgressService.getSubjectProgress(
            userId,
            userStudyPlanId
        );
        return res.status(200).json(progress);
    } catch (error) {
        if (error.message === "El usuario no tiene acceso a este plan") {
            return res.status(403).json({
                message: error.message,
            });
        }
        return res.status(500).json({
            message: "Error al obtener el progreso",
        });
    }
};

const saveSubjectProgress = async (req, res) => {
    try {
        const userId = req.user._id;
        const {userStudyPlanId, planSubjectId} = req.params;

        const progressData = req.body;

        const progress = await subjectProgressService.saveSubjectProgress(
            userId,
            userStudyPlanId,
            planSubjectId,
            progressData
        );
        return res.status(200).json({
            message: "Progreso guardado correctamente",
            progress,
        });
    } catch (error) {
        if (error.message === "El usuario no tiene acceso a este plan") {
            return res.status(403).json({
                message: error.message,
            });
        }
        return res.status(400).json({
            message: error.message,
        });
    }
};
module.exports = { getSubjectProgress, saveSubjectProgress };
