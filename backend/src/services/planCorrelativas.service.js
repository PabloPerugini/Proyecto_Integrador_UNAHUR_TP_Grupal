// Carga de correlativas a un StudyPlan desde PDF (solo ADMIN/dueño).
// Flujo en dos pasos como la UI: parse (sin guardar, con matching) y save
// (whitelist + anti-ciclos). Adaptación a la nueva arquitectura del flujo
// pre-merge de career.controllers (parseCorrelativas/saveCorrelativas).
const PlanSubject = require("../models/planSubject");
const { parseCorrelativas } = require("./pdfParser.service");
const {
  bestDbMatch,
  cleanRequiresList,
  findCycle,
} = require("./correlativas.service");

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Parsea el PDF y matchea cada fila contra las materias del plan.
// Devuelve filas { name, matched, code, dbName, confidence, requires[] }.
async function parseAndMatch(studyPlanId, buffer) {
  const items = await PlanSubject.find({ studyPlan: studyPlanId })
    .populate("subject", "name")
    .lean();
  if (!items.length) {
    throw httpError("El plan no tiene materias cargadas", 422);
  }
  const dbSubjects = items.map((ps) => ({
    code: ps.code,
    name: ps.subject?.name || ps.code,
  }));
  let parsed;
  try {
    parsed = await parseCorrelativas(buffer);
  } catch {
    throw httpError(
      "No se pudo leer el PDF de correlatividades. Asegurate de que sea un PDF con texto (no escaneado).",
    );
  }
  const rows = (parsed.subjects || []).map((s) => {
    const r = bestDbMatch(s.name, dbSubjects);
    return {
      parsedCode: s.code,
      name: s.name,
      matched: !!r.db,
      code: r.db ? r.db.code : null,
      dbName: r.db ? r.db.name : null,
      confidence: r.confidence,
      requires: [],
      _parsedRequires: s.requires || [],
    };
  });
  // Mapea referencias internas (CR###) a códigos reales del plan.
  const byPCode = new Map(rows.map((r) => [r.parsedCode, r]));
  for (const row of rows) {
    for (const pc of row._parsedRequires) {
      const ref = byPCode.get(pc);
      if (ref && ref.code && !row.requires.includes(ref.code)) {
        row.requires.push(ref.code);
      }
    }
    delete row._parsedRequires;
    delete row.parsedCode;
  }
  const matchedCount = rows.filter((r) => r.matched).length;
  return {
    sourceKind: parsed.sourceKind,
    total: parsed.total,
    planSubjects: items.length,
    matchedCount,
    rows,
    unmatched: rows.filter((r) => !r.matched).map((r) => r.name),
  };
}

// Guarda correlativas: solo códigos del plan, sin autorreferencias ni ciclos.
// updates: [{ code, requires: [code] }] (requires: [] limpia las del código).
async function saveCorrelativas(studyPlanId, updates) {
  const incoming = Array.isArray(updates) ? updates : [];
  const items = await PlanSubject.find({ studyPlan: studyPlanId })
    .select("_id code prerequisites")
    .lean();
  const validCodes = new Set(items.map((s) => s.code));

  const resolved = [];
  const dropped = [];
  for (const raw of incoming) {
    const code = String(raw.code || "").trim();
    if (!code || !validCodes.has(code)) {
      if (code) dropped.push(`${code} (código inexistente en el plan)`);
      continue;
    }
    const { clean, dropped: d } = cleanRequiresList(
      code,
      raw.requires,
      validCodes,
    );
    dropped.push(...d);
    resolved.push({ code, requires: clean });
  }

  // Anti-ciclos sobre el grafo completo del plan (como el blindaje BUG-009).
  const allRequires = {};
  for (const s of items) {
    allRequires[s.code] = (s.prerequisites || [])
      .map((p) => {
        const ref = items.find((x) => String(x._id) === String(p.planSubject));
        return ref ? ref.code : null;
      })
      .filter(Boolean);
  }
  const cycle = findCycle(allRequires, resolved);
  if (cycle) {
    const error = httpError(
      `Las correlativas forman un ciclo (${cycle.join(" -> ")}): no se guardó nada`,
    );
    error.cycle = cycle;
    throw error;
  }

  let saved = 0;
  if (resolved.length) {
    const idByCode = new Map(items.map((s) => [s.code, s._id]));
    await PlanSubject.bulkWrite(
      resolved.map((u) => ({
        updateOne: {
          filter: { studyPlan: studyPlanId, code: u.code },
          update: {
            $set: {
              prerequisites: u.requires
                .map((rc) => idByCode.get(rc))
                .filter(Boolean)
                .map((refId) => ({
                  planSubject: refId,
                  // Alcanza regularizada para avanzar (editable luego en
                  // Administrar planes, materia por materia).
                  requiredStatus: "REGULARIZADA",
                })),
            },
          },
        },
      })),
      { ordered: false },
    );
    saved = resolved.length;
  }
  return { saved, dropped };
}

module.exports = { parseAndMatch, saveCorrelativas };
