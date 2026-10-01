// parseJsonStrict compartido (Fase 5.2 — antes duplicado en
// aiExtract.service.js y aiCorrelativas.service.js).
function parseJsonStrict(reply) {
  const clean = String(reply || "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("la IA no devolvió un JSON reconocible");
  }
  return JSON.parse(clean.slice(start, end + 1));
}

module.exports = { parseJsonStrict };
