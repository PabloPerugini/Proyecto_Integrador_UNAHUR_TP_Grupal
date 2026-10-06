const multer = require("multer");

const storage = multer.memoryStorage();

// Firma real de PDF (%PDF-): el fileFilter de multer solo ve metadata
// (mimetype/nombre), así que el contenido se valida en los controladores
// antes de parsear o de enviarlo a APIs externas.
const isPdfBuffer = (buf) =>
  Buffer.isBuffer(buf) && buf.length > 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-";

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
  isPdfBuffer,
};