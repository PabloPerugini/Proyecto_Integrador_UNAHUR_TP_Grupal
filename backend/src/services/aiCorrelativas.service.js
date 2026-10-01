// IA SOLO LECTORA para correlatividades (BUG-004 / BUG-005).
//
// Principio: la IA NUNCA propone códigos ni decide matches. Solo extrae del
// PDF pares literales {materia, correlativas, evidencia} tal cual figuran
// (tolerando nombres partidos en varias líneas e ignorando prosa legal). La
// resolución a códigos oficiales la hace el matcher determinístico en el
// controlador, que es la ÚNICA vía por la que un código llega a `requires`.
// Por eso el prompt NO incluye la lista oficial: lo que no venga del archivo
// no puede transformarse en una correlativa "exacta" plausible pero falsa.
const crypto = require("crypto");
const { chat } = require("./ai.service");
const { parseJsonStrict } = require("./aiJson");
const { extractLines } = require("./pdfParser.service");

// 1B.B4: igual que aiExtract — invalida caché al cambiar prompt/modelo/carrera.
const PROMPT_VERSION = "v2-json-native";
const cacheTag = (careerHint) =>
  crypto
    .createHash("sha256")
    .update([PROMPT_VERSION, process.env.GROQ_MODEL || "", process.env.GEMINI_MODEL || "", careerHint || ""].join("|"))
    .digest("hex")
    .slice(0, 8);

const MAX_TEXT_CHARS = 40000;

const CORREL_PAGE_RE =
  /correlativ|actividad curricular|aprobad|regularizad|requisito|UNIDAD CURRICULAR/i;

function selectCorrelText(pages) {
  const scored = pages.map((p) => {
    const t = p.lines.map((l) => l.text).join("\n");
    const numbered = (t.match(/^\s*\d{1,3}\s+\S/gm) || []).length;
    return { t, keep: CORREL_PAGE_RE.test(t) || numbered >= 2 };
  });
  const kept = scored.filter((s) => s.keep);
  const chosen = kept.length ? kept : scored;
  return {
    text: chosen.map((s) => s.t).join("\n"),
    tablePages: kept.length,
    totalPages: pages.length,
  };
}

const SYSTEM = `Sos un lector literal de tablas de correlatividades universitarias (UNAHUR, Argentina).
Te doy el texto de un PDF de correlatividades (puede tener nombres partidos en varias líneas, tablas sin números de fila, o prosa resolutiva que hay que ignorar).
Extraé cada fila como aparece, SIN normalizar ni completar nada.
Respondé SOLO con un objeto JSON válido, sin markdown ni texto extra, con esta forma exacta:
{"pairs":[{"subject":"Nombre tal cual figura","requires":["Correlativa tal cual figura"],"evidence":"fragmento del PDF donde lo leíste"}]}
Reglas: subject y requires son texto LITERAL del PDF (reconstruyendo líneas partidas); requires vacío si la fila no pide nada o dice "-" o "ninguna"; evidence es una cita corta del fragmento (máx. 200 caracteres); ignorá encabezados, prosa legal ("RESUELVE", "Regístrese", artículos), totales y equivalencias; no inventes filas ni nombres: solo lo que está escrito.`;

function parsePairsStrict(reply) {
  const data = parseJsonStrict(reply);
  // Validación estricta de forma: solo pares literales de strings.
  if (!data || !Array.isArray(data.pairs)) {
    throw new Error("la IA no devolvió pares con la forma esperada");
  }
  const pairs = [];
  for (const q of data.pairs) {
    const subject = String(q?.subject || "").replace(/\s+/g, " ").trim();
    if (!subject) continue;
    const requires = [];
    if (Array.isArray(q?.requires)) {
      for (const r of q.requires) {
        const name = String(r || "").replace(/\s+/g, " ").trim();
        if (name && !/^[-–—\s]*$/.test(name) && !requires.includes(name)) {
          requires.push(name);
        }
      }
    }
    pairs.push({
      subject,
      requires,
      evidence: String(q?.evidence || "").replace(/\s+/g, " ").trim().slice(0, 200),
    });
  }
  if (!pairs.length) throw new Error("la IA no devolvió pares utilizables");
  return pairs;
}

async function extractCorrelativasWithAI(buffer, { careerHint }) {
  const pages = await extractLines(buffer);
  const { text, tablePages, totalPages } = selectCorrelText(pages);
  const fullText = text.slice(0, MAX_TEXT_CHARS);
  console.log(`[aiCorrelativas] páginas con tabla: ${tablePages}/${totalPages}, chars enviados: ${fullText.length}`);
  if (fullText.trim().length < 200) {
    throw new Error("el PDF casi no tiene texto extraíble");
  }
  const user = `Carrera: ${careerHint || "desconocida"}.\n\nTEXTO DEL PDF DE CORRELATIVIDADES:\n${fullText}`;
  const cacheKey =
    "ai:corrread:v2:" + crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16) + ":" + cacheTag(careerHint);
  // Gemini primero: el texto es grande y Groq lo rechaza (413) con este modelo.
  const { reply, provider } = await chat(SYSTEM, user, cacheKey, "gemini");
  const pairs = parsePairsStrict(reply);
  return { pairs, provider };
}

module.exports = { extractCorrelativasWithAI };
