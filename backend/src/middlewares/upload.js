const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    if (isPdf) return cb(null, true);
    cb(new Error("Solo se aceptan archivos PDF"));
  },
});

module.exports = {
  uploadSinglePdf: upload.single("file"),
};