// Parser de historia académica / plan personal
// Lee el reporte de materias con estado, nota, fecha y origen.

const { cleanName } = require("./shared");
const { extractLines } = require("./raw");

const STATUS_RE = /\((Promocionado|Aprobado|Regular|Libre|Pendiente|En [cC]urso)\)/i;
const ORIGEN_RE = /\b(Promoci[oó]n|Equivalencia|Final|Examen final)\b/i;
const KING_RE = /(Materia|ACA_UC|Actividad\s*Curricular)/i;

// Normaliza el estado leído del PDF a uno de los valores válidos de la app
// (Promocionado/En curso/Libre son variantes que el frontend no maneja).
const STATUS_ALIASES = {
  promocionado: "Aprobada",
  aprobado: "Aprobada",
  aprobada: "Aprobada",
  libre: "Aprobada",
  "en_curso": "Cursando",
  cursando: "Cursando",
  regular: "Regular",
  pendiente: "Pendiente",
};

function normalizeStatus(raw) {
  const key = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return STATUS_ALIASES[key] || null;
}

// Parser del documento "Plan de estudios" / reporte con estado del alumno.
// Línea tipo: Nombre (código) [!] Materia 3 -Cuatrimestral 9 (Promocionado) Promoción 7.00
function parseStudentReportLine(text) {
  const m = text.match(/^(?<name>.+?)\s+\((?<code>[^()]+)\)\s*(?<rest>.*)$/);
  if (!m) return null;

  const rest = m.groups.rest.replace(/\([!*-]\)/g, " ").replace(/\s+/g, " ").trim();

  const statusMatch = STATUS_RE.exec(rest);
  const status = statusMatch ? statusMatch[1] : null;

  const notaMatch = rest.match(/(\d{1,2})\s*\((Promocionado|Aprobado|Regular|Libre|Pendiente)\)/i);
  const nota = notaMatch ? parseInt(notaMatch[1], 10) : null;

  const origenMatch = ORIGEN_RE.exec(rest);
  const origen = origenMatch ? origenMatch[1] : null;

  const yearMatch = rest.match(/(^|\s)(\d)\s*-?\s*Cuatrimestral/);
  const year = yearMatch ? parseInt(yearMatch[2], 10) : null;
  const duration = /Cuatrimestral/.test(rest) ? "C" : "A";

  const kindMatch = KING_RE.exec(rest);
  const kindRaw = kindMatch ? kindMatch[1] : null;
  const kind = kindRaw === "ACA_UC" ? "ACA" : "Materia";

  // Créditos solo si vienen explicitados con etiqueta (evita tomar la nota
  // de la línea, p.ej. "Promoción 7.00", como si fueran créditos).
  const creditsMatch = rest.match(/(?:cr[eé]ditos?|cre)\b[:\s]*(\d+(?:\.\d{1,2})?)/i);
  const credits = creditsMatch ? parseFloat(creditsMatch[1]) : 0;

  return {
    code: m.groups.code.trim(),
    name: cleanName([m.groups.name]),
    year,
    cuatrimestre: null,
    duration,
    credits: credits ?? 0,
    kind,
    optional: kind === "ACA" || /^AU[_ ]/i.test(m.groups.name),
    status: normalizeStatus(status || (origen ? "Aprobada" : "Pendiente")) ?? "Pendiente",
    nota,
    fecha: null,
    origen,
  };
}

const HISTORIA_RE = /^(?<name>.+?)\s+\((?<code>[^()]+)\)\s+(?<fecha>\d{2}\/\d{2}\/\d{4})\s+(?<tipo>\w+)\s+(?<nota>\d{1,2})\s+(?<resultado>.+)$/;

// Parser de la "Historia académica" (materias aprobadas con fecha y nota).
function parseHistoriaLine(text) {
  const m = text.match(HISTORIA_RE);
  if (!m) return null;
  const resultado = m.groups.resultado.trim();
  const status = /Libre|Regular/.test(resultado)
    ? resultado
    : /Aprobado|Promocionad/i.test(resultado)
      ? "Aprobada"
      : "Pendiente";
  return {
    code: m.groups.code.trim(),
    name: cleanName([m.groups.name]),
    year: null,
    cuatrimestre: null,
    duration: "C",
    credits: 0,
    kind: "Materia",
    optional: /^AU[_ ]/i.test(m.groups.name) || /^ACA/.test(m.groups.name),
    status: normalizeStatus(status) ?? "Pendiente",
    nota: parseInt(m.groups.nota, 10),
    fecha: m.groups.fecha,
    origen: /Promoci/i.test(m.groups.tipo) ? "Promoción" : m.groups.tipo,
  };
}

// Parser del PDF personal (plan de estudios con estado u historia académica).
async function parseAcademicHistory(data) {
  const pages = await extractLines(data);
  const subjects = [];
  const seen = new Set();
  let careerHint = null;

  for (const page of pages) {
    for (const line of page.lines) {
      const text = line.text.trim();
      if (!text) continue;

      if (!careerHint && /Propuesta:/i.test(text)) {
        careerHint = text
          .replace(/Propuesta:/i, "")
          .replace(/Plan:.*$/i, "")
          .trim();
      }

      const parsed = parseHistoriaLine(text) || parseStudentReportLine(text);
      if (!parsed) continue;
      if (!parsed.name || !parsed.name.trim()) continue;
      if (/^(Propuesta|Versi[oó]n|Plan[:]?|Cuadro de equivalencias)/i.test(parsed.name.trim())) continue;
      if (seen.has(parsed.code)) continue;
      seen.add(parsed.code);

      if (parsed.status === "Pendiente" && !parsed.nota) {
        parsed.status = "Pendiente";
      }
      subjects.push(parsed);
    }
  }

  return {
    sourceKind: subjects.length
      ? /historia/i.test(pages.map((p) => p.lines.map((l) => l.text).join(" ")).join(" ").slice(0, 200))
        ? "historia"
        : "plan"
      : "desconocido",
    careerHint,
    subjects,
  };
}


module.exports = { parseAcademicHistory };
