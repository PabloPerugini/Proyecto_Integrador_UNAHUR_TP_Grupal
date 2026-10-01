// Fallback de IA para la carga de planes oficiales.
//
// Se usa SOLO cuando el parser determinístico no entiende la tabla
// (0 materias o cantidad fuera del rango de referencia). La IA recibe el
// texto extraído del PDF y devuelve JSON estricto, que acá se valida de
// forma dura: si el resultado no cumple el esquema o el rango esperado se
// descarta (nunca se persiste una alucinación en silencio).
const crypto = require("crypto");
const { chat } = require("./ai.service");
const { parseJsonStrict } = require("./aiJson");
const { extractLines } = require("./pdfParser.service");

// 1B.B4: versión de prompt+modelos — cambiar el SYSTEM o el modelo invalida
// la caché (antes solo hash del buffer, 7 días de stale).
const PROMPT_VERSION = "v2-json-native";
const cacheTag = (careerHint) =>
  crypto
    .createHash("sha256")
    .update([PROMPT_VERSION, process.env.GROQ_MODEL || "", process.env.GEMINI_MODEL || "", careerHint || ""].join("|"))
    .digest("hex")
    .slice(0, 8);

const MAX_TEXT_CHARS = 40000;

// El texto completo del PDF (fundamentación, contenidos mínimos, anexos)
// supera el límite por request de algunos proveedores y además confunde al
// modelo. Se envían solo las páginas con pinta de tabla de estructura;
// si ninguna califica, se manda el texto recortado.
const TABLE_PAGE_RE =
  /asignatura|campo|carga|cuatrimestr|anual|correlativ|\ba[ñn]o\b|cr[eé]ditos|r[eé]gimen|\bhis\b|\bhit\b|\bht\b|\bcre\b/i;

function selectTableText(pages) {
  const scored = pages.map((p) => {
    const t = p.lines.map((l) => l.text).join("\n");
    const numbered = (t.match(/^\s*\d{1,2}\s+\S/gm) || []).length;
    return { t, keep: TABLE_PAGE_RE.test(t) || numbered >= 2 };
  });
  const kept = scored.filter((s) => s.keep);
  const chosen = kept.length ? kept : scored;
  return {
    text: chosen.map((s) => s.t).join("\n"),
    tablePages: kept.length,
    totalPages: pages.length,
  };
}

const SYSTEM = `Sos un lector de planes de estudios universitarios (UNAHUR, Argentina).
Del texto extraído de un PDF oficial tenés que identificar la TABLA DE ESTRUCTURA del plan
(columnas tipo: Nro/Asignatura/Campo/Carga horaria/Créditos, o Código/Unidad curricular/Horas/CRE)
e ignorar el resto (fundamentación, contenidos mínimos, anexos, equivalencias).
Respondé SOLO con un objeto JSON válido, sin markdown ni texto extra, con esta forma exacta:
{"subjects":[{"name":"...","year":1,"cuatrimestre":1,"duration":"C","hours":{"his":0,"hit":64,"hite":0,"hip":0,"htat":61,"ht":125},"credits":5,"intermediate":false}],"creditsFinal":0,"intermediateTitle":null}
Reglas: name = nombre limpio de la materia (sin números de orden ni siglas de campo); year = año (1-7) o null si no se deduce; cuatrimestre = 1-2 o null; duration "C" (cuatrimestral) salvo que diga anual; hours con las cargas que figuren (0 si no); credits el de la fila; intermediate true solo si la fila pertenece a la sección del título intermedio; creditsFinal = suma de créditos del plan (0 si no se sabe); intermediateTitle = nombre del título intermedio si figura ("Técnico/a ..." / null). No inventes materias: solo las que aparecen en la tabla.`;

const numOr = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

function validateSubjects(raw, { expectedMin, expectedMax }) {
  if (!raw || !Array.isArray(raw.subjects) || !raw.subjects.length) {
    throw new Error("la IA no devolvió materias");
  }
  const seen = new Set();
  const subjects = [];
  raw.subjects.forEach((s) => {
    const name = String(s?.name || "").replace(/\s+/g, " ").trim();
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    const h = s?.hours || {};
    const year = Number.isInteger(s?.year) && s.year >= 1 && s.year <= 7 ? s.year : null;
    const cuatrimestre =
      Number.isInteger(s?.cuatrimestre) && s.cuatrimestre >= 1 && s.cuatrimestre <= 3
        ? s.cuatrimestre
        : null;
    const duration = ["C", "A", "TF"].includes(s?.duration) ? s.duration : "C";
    const isAca = /\bACA\b/i.test(name);
    subjects.push({
      code: `IA${String(subjects.length + 1).padStart(3, "0")}`,
      name,
      year,
      cuatrimestre,
      duration,
      hours: {
        his: numOr(h.his),
        hit: numOr(h.hit),
        hite: numOr(h.hite),
        hip: numOr(h.hip),
        htat: numOr(h.htat),
        ht: numOr(h.ht),
      },
      credits: numOr(s?.credits),
      kind: isAca ? "ACA" : "Materia",
      generic: isAca ? "ACA" : null,
      optional: isAca || /^AU[_ ]/i.test(name),
      intermediate: s?.intermediate === true,
    });
  });
  if (!subjects.length) throw new Error("la IA no devolvió materias válidas");
  if (expectedMin != null && (subjects.length < expectedMin || subjects.length > expectedMax)) {
    throw new Error(
      `la IA devolvió ${subjects.length} materias, fuera del rango esperado [${expectedMin}-${expectedMax}]: se descarta`,
    );
  }
  return subjects;
}

async function extractPlanWithAI(buffer, { careerHint, expectedMin, expectedMax }) {
  const pages = await extractLines(buffer);
  const { text, tablePages, totalPages } = selectTableText(pages);
  const fullText = text.slice(0, MAX_TEXT_CHARS);
  console.log(`[aiExtract] páginas con tabla: ${tablePages}/${totalPages}, chars enviados: ${fullText.length}`);
  if (fullText.trim().length < 200) {
    throw new Error("el PDF casi no tiene texto extraíble");
  }
  const rangeHint =
    expectedMin != null ? `Se esperan entre ${expectedMin} y ${expectedMax} materias.` : "";
  const user = `Carrera: ${careerHint || "desconocida"}. ${rangeHint}\n\nTEXTO DEL PDF (páginas de la tabla de estructura):\n${fullText}`;
  const cacheKey =
    "ai:parse:v2:" + crypto.createHash("sha256").update(buffer).digest("hex") + ":" + cacheTag(careerHint);
  // Gemini primero: la extracción envía decenas de miles de caracteres y
  // Groq rechaza ese tamaño (413) con este modelo.
  const { reply, provider } = await chat(SYSTEM, user, cacheKey, "gemini");
  const raw = parseJsonStrict(reply);
  const subjects = validateSubjects(raw, { expectedMin, expectedMax });
  return {
    sourceKind: "ia",
    subjects,
    intermediateTitle:
      raw.intermediateTitle != null ? String(raw.intermediateTitle).trim() || null : null,
    creditsFinal: subjects.reduce((acc, s) => acc + (s.credits || 0), 0),
    creditsIntermediate: 0,
    provider,
  };
}

module.exports = { extractPlanWithAI };
