
const {
  confirmPlanImport,
} = require("../services/planImportConfirmationService");

const confirm = async (req, res) => {
  try {
    const result = await confirmPlanImport(
      req.user._id,
      req.body
    );

    return res.status(201).json(result);
  } catch (error) {
    console.error("Error confirmando importación:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "La importación contiene datos duplicados",
      });
    }

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode
          ? error.message
          : "No se pudo guardar el plan de estudios",
    });
  }
};

module.exports = {
  confirm,
};
