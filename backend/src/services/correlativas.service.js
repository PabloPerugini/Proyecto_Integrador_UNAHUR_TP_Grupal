/*
 * Resolución de correlatividades para la nueva arquitectura (StudyPlan/PlanSubject).
 *
 * Los matchers puros (normalizeName, normKey, compactKey, levenshtein,
 * bestDbMatch, cleanRequiresList, findCycle) se portan verbatim del
 * backend pre-merge (commit 1fccfa6^, controllers/career.controllers.js):
 * misma lógica probada, sin tocar Mongo. Se exponen para unitarios.
 *
 * Lo nuevo: resolvePrerequisites() resuelve el `correlativasTexto` libre que
 * trae el preview del parser contra las materias del propio plan, por
 * contenido (el texto cita varias materias sin delimitador, p. ej.
 * "Programación estructurada Estructuras de datos"). Solo se aceptan
 * coincidencias exactas (y compactas como fallback) con borde de palabra;
 * ante solapes gana el nombre más largo ("Inglés II" no arrastra "Inglés I").
 * Lo no resuelto va a `review` para revisión humana: ningún código se inventa.
 */

function normalizeName(name) {
  if (typeof name !== "string") return "";
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

// Normaliza para comparar: minúsculas, sin acentos, sin puntuación.
function normKey(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Forma "compacta": sin espacios. Absorbe los artefactos de extracción del PDF
// como "cientí fi ca" / "curr í culum" / "P rácticas" y los equipara al nombre
// real de la base.
function compactKey(name) {
  return normKey(name).replace(/\s+/g, "");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

function bestDbMatch(parsedName, dbSubjects) {
  const spaced = normKey(parsedName);
  const compact = compactKey(parsedName);
  let best = null;
  let bestScore = Infinity;
  for (const db of dbSubjects) {
    if (spaced === normKey(db.name)) return { db, confidence: "exact" };
    if (compact === compactKey(db.name)) return { db, confidence: "compact" };
    const d = levenshtein(compact, compactKey(db.name));
    if (d < bestScore) {
      bestScore = d;
      best = db;
    }
  }
  const threshold = Math.max(1, Math.round(0.08 * compact.length));
  if (best && bestScore <= threshold) return { db: best, confidence: "fuzzy" };

  // Los nombres pueden quedar truncados por el ancho de la celda del PDF
  // (p. ej. "Historia de la Nación Argentina y sus" en el plan de Matemática).
  // Si un nombre es prefijo completo de otro (por palabras), y el sobrante es
  // corto, son la misma materia. Comparación por palabras evita confundir
  // "…I" con "…II", y se exige un nombre base largo para no casar "Didáctica"
  // con "Didáctica de la matemática".
  const ta = spaced.split(" ");
  if (ta.length >= 4) {
    let preBest = null;
    let preTail = Infinity;
    for (const db of dbSubjects) {
      const tb = normKey(db.name).split(" ");
      const short = ta.length <= tb.length ? ta : tb;
      const long = ta.length <= tb.length ? tb : ta;
      if (short.length < 4) continue;
      if (short.every((w, i) => w === long[i])) {
        const tail = long.length - short.length;
        if (tail >= 1 && tail <= Math.min(3, Math.floor(short.length / 2))) {
          if (tail < preTail) {
            preTail = tail;
            preBest = db;
          }
        }
      }
    }
    if (preBest) return { db: preBest, confidence: "prefix" };
  }
  return { db: null, confidence: null };
}

// Helpers puros (misma lógica que usaba saveCorrelativas, sin tocar Mongo).
function cleanRequiresList(subjCode, requires, validCodes) {
  const clean = [];
  const dropped = [];
  for (const r of Array.isArray(requires) ? requires : []) {
    const rc = String(r).trim();
    if (!validCodes.has(rc)) {
      dropped.push(`${subjCode} -> ${rc || "(vacío)"} (código inexistente)`);
      continue;
    }
    if (rc === subjCode) {
      dropped.push(`${subjCode} -> ${rc} (autorreferencia)`);
      continue;
    }
    if (!clean.includes(rc)) clean.push(rc);
  }
  return { clean, dropped };
}

function findCycle(allRequires, updates) {
  const graph = new Map(Object.entries(allRequires).map(([k, v]) => [k, [...v]]));
  for (const u of updates) graph.set(u.code, u.requires);
  for (const u of updates) {
    const parent = new Map();
    const stack = [...u.requires];
    for (const r of u.requires) parent.set(r, u.code);
    const seen = new Set();
    while (stack.length) {
      const node = stack.pop();
      if (node === u.code) {
        const path = [node];
        let cur = parent.get(node);
        while (cur && cur !== u.code) {
          path.unshift(cur);
          cur = parent.get(cur);
        }
        path.unshift(u.code);
        return path;
      }
      if (seen.has(node) || !graph.has(node)) continue;
      seen.add(node);
      for (const nxt of graph.get(node) || []) {
        if (!parent.has(nxt)) parent.set(nxt, node);
        stack.push(nxt);
      }
    }
  }
  return null;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Busca ocurrencias no solapadas de `needle` en `hay` (índices de inicio/fin).
function findSpans(hay, needle) {
  const spans = [];
  if (!needle) return spans;
  let from = 0;
  for (;;) {
    const i = hay.indexOf(needle, from);
    if (i === -1) return spans;
    spans.push([i, i + needle.length]);
    from = i + 1;
  }
}

/*
 * Resuelve correlativasTexto libre contra las materias del plan.
 * items: [{ code, name, correlativasTexto }]
 * Devuelve { resolved: [{ code, requires: [code] }], review: [{ code, name, text }] }.
 * `dropped` sigue el formato histórico de cleanRequiresList (informativo).
 */
function resolvePrerequisites(items) {
  const valid = new Set(items.map((i) => i.code).filter(Boolean));
  const resolved = [];
  const review = [];
  const dropped = [];

  for (const item of items) {
    const raw = item.correlativasTexto;
    if (!raw || !String(raw).trim() || !item.code) continue;
    const spaced = ` ${normKey(raw)} `;
    const compact = compactKey(raw);

    // Candidatos por coincidencia exacta con borde de palabra. El texto ya
    // viene acolchado con espacios, así que ` nombre ` cubre inicio/fin.
    const spans = [];
    for (const other of items) {
      if (!other.code || other.code === item.code) continue;
      const on = normKey(other.name);
      if (!on) continue;
      for (const [a, b] of findSpans(spaced, ` ${on} `)) {
        spans.push({ a: a + 1, b: b - 1, code: other.code, tier: 0 });
      }
    }

    // Fallback compacto solo si no hubo nada exacto (artefactos del PDF).
    if (!spans.length && compact.length >= 10) {
      for (const other of items) {
        if (!other.code || other.code === item.code) continue;
        const oc = compactKey(other.name);
        if (!oc || oc.length < 10) continue;
        for (const [a, b] of findSpans(compact, oc)) {
          spans.push({ a, b, code: other.code, tier: 1 });
        }
      }
    }

    // Ante solapes gana el nombre más largo ("Inglés II" vs "Inglés I").
    spans.sort((x, y) => (y.b - y.a) - (x.b - x.a) || x.tier - y.tier);
    const taken = [];
    const codes = [];
    for (const s of spans) {
      if (taken.some(([a, b]) => s.a < b && a < s.b)) continue;
      if (!codes.includes(s.code)) codes.push(s.code);
      taken.push([s.a, s.b]);
    }

    const { clean, dropped: d } = cleanRequiresList(item.code, codes, valid);
    dropped.push(...d);
    if (!clean.length) review.push({ code: item.code, name: item.name, text: String(raw) });
    else resolved.push({ code: item.code, requires: clean });
  }
  return { resolved, review, dropped };
}

module.exports = {
  normalizeName,
  normKey,
  compactKey,
  bestDbMatch,
  cleanRequiresList,
  findCycle,
  resolvePrerequisites,
};
