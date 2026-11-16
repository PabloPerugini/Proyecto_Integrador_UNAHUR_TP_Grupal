// Helpers de datos del test E2E de correlatividades. Viven fuera del test
// para respetar el límite de 300 líneas por archivo.
const fs = require("fs");
const path = require("path");
const { normKey } = require("../../src/services/correlativas.service");

// El confirm rechaza nombres con el mismo slug (dos variantes del PDF, p. ej.
// "... (ACA" y "... (ACA)"). Agrupa por nombre normalizado y conserva la
// variante más completa para poder importar el plan par.
function dedupeSubjects(subjects) {
  const byKey = new Map();
  const duplicates = [];
  for (const subject of subjects) {
    const key = normKey(subject.name);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, subject);
      continue;
    }
    duplicates.push(`${subject.name} / ${current.name}`);
    if (String(subject.name).length > String(current.name).length) {
      byKey.set(key, subject);
    }
  }
  return { subjects: [...byKey.values()], duplicates };
}

function goldenTotal(goldenDir, file) {
  const slug = path.basename(file).replace(/\.pdf$/i, "");
  const goldenPath = path.join(goldenDir, `${slug}.json`);
  if (!fs.existsSync(goldenPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(goldenPath, "utf8")).total ?? null;
  } catch {
    return null;
  }
}

module.exports = { dedupeSubjects, goldenTotal };
