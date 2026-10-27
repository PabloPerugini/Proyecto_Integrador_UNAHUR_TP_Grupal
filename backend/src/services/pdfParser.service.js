// Fachada pública del parser de PDFs.
//
// La implementación vive en ./pdf y está separada por tipo de documento:
//  - raw.js              extracción de texto con coordenadas (pdfjs-dist)
//  - shared.js           helpers de texto compartidos por los tres parsers
//  - officialPlan.js     plan de estudios oficial (tabla de estructura)
//  - academicHistory.js  historia académica / plan personal
//  - correlativas.js     planes de correlatividades
//
// Los consumidores siguen importando desde acá: la API no cambió.
const { parseOfficialPlan } = require("./pdf/officialPlan");
const { parseAcademicHistory } = require("./pdf/academicHistory");
const { parseCorrelativas } = require("./pdf/correlativas");
const { extractLines } = require("./pdf/raw");

module.exports = {
  parseOfficialPlan,
  parseAcademicHistory,
  parseCorrelativas,
  extractLines,
};
