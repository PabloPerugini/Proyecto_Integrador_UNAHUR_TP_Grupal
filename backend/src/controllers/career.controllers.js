const Career = require("../models/career");
const Subject = require("../models/subject");
const { parseOfficialPlan, parseCorrelativas: parseCorrelativasPdf } = require("../services/pdfParser.service");
const { isConfigured } = require("../services/ai.service");
const { isPdfBuffer } = require("../middlewares/upload");
const { extractPlanWithAI } = require("../services/aiExtract.service");
const { extractCorrelativasWithAI } = require("../services/aiCorrelativas.service");
const path = require("path");
const fs = require("fs");
const { buildGraph } = require("../services/graph.service");
const { buildSugerencias } = require("../services/sugerencias.service");
const UserProgress = require("../models/userprogress");
const { deriveCareerColor } = require("../utils/careerColor");
const AppError = require("../utils/AppError");

const createCareer = async (req, res, next) => {
  try {
    const {
      name,
      institute,
      color,
      planResolution,
      ruleCode,
      durationYears,
      creditsFinal,
      creditsIntermediate,
    } = req.body;
    if (!name) {
      return res.status(400).json({ message: "El nombre de la carrera es obligatorio" });
    }

    // Guard anti-duplicados: si ya existe una carrera con el mismo nombre
    // (ignorando acentos, mayúsculas y puntuación), se reutiliza en vez de
    // crear otra (evita planes repetidos al subir el mismo PDF dos veces).
    // El front detecta `reused: true` para avisar que se actualizó.
    const all = await Career.find().select("_id name institute color status subjectCount").lean();
    const dup = all.find((c) => compactKey(c.name) === compactKey(name));
    if (dup) {
      return res.status(200).json({ ...dup, reused: true });
    }

    const career = await Career.create({
      name,
      institute,
      color: color || deriveCareerColor(institute, name),
      planResolution,
      ruleCode,
      durationYears,
      creditsFinal,
      creditsIntermediate,
    });
    res.status(201).json(career);
  } catch (error) {
    next(error);
  }
};

const getAllCareers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    // 1 query: subjectCount ya persistido en Career (saveSubjects/publish lo
    // mantienen); evita el N+1 de un countDocuments por carrera.
    const careers = await Career.find(filter).sort({ createdAt: -1 }).select("-__v").lean();
    res.status(200).json(careers);
  } catch (error) {
    next(error);
  }
};

const getCareerSubjects = async (req, res, next) => {
  try {
    const { id } = req.params;
    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });
    const subjects = await Subject.find({ careerId: id })
      .sort({ year: 1, cuatrimestre: 1, name: 1 })
      .select("-__v");
    res.status(200).json(subjects);
  } catch (error) {
    next(error);
  }
};

const updateSubject = async (req, res, next) => {
  try {
    const { id, subjectId } = req.params;
    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });

    const subject = await Subject.findOne({ _id: subjectId, careerId: id });
    if (!subject) return res.status(404).json({ message: "Materia no encontrada" });

    const { code, name, requires, year, cuatrimestre, duration, credits, kind, optional, intermediate } = req.body;
    const cleanName = typeof name === "string" ? name.trim() : subject.name;
    const cleanCode = typeof code === "string" ? code.trim() : subject.code;
    if (!cleanName || !cleanCode) {
      return res.status(400).json({ message: "El código y el nombre de la materia son obligatorios" });
    }

    const duplicate = await Subject.findOne({
      careerId: id,
      _id: { $ne: subjectId },
      $or: [{ code: cleanCode }, { slug: normalizeName(cleanName) }],
    }).select("_id");
    if (duplicate) {
      return res.status(409).json({ message: "Ya existe otra materia con ese código o nombre" });
    }

    const numericOrNull = (value, fallback) => {
      if (value === null || value === "" || value === undefined) return fallback;
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    };
    const nextYear = numericOrNull(year, subject.year);
    const nextCuatrimestre = numericOrNull(cuatrimestre, subject.cuatrimestre);
    const nextCredits = numericOrNull(credits, subject.credits);
    if (nextYear !== null && (!Number.isInteger(nextYear) || nextYear < 1)) {
      return res.status(400).json({ message: "El año debe ser un entero mayor o igual a 1" });
    }
    if (nextCuatrimestre !== null && (!Number.isInteger(nextCuatrimestre) || nextCuatrimestre < 1 || nextCuatrimestre > 2)) {
      return res.status(400).json({ message: "El cuatrimestre debe ser 1 o 2" });
    }
    if (nextCredits === null || nextCredits < 0) {
      return res.status(400).json({ message: "Los créditos deben ser un número mayor o igual a 0" });
    }
    const previousCode = subject.code;
    let nextRequires = subject.requires || [];
    if (requires !== undefined) {
      if (!Array.isArray(requires)) {
        return res.status(400).json({ message: "Las correlativas deben enviarse como un arreglo de códigos" });
      }
      const all = await Subject.find({ careerId: id }).select("code requires").lean();
      const validCodes = new Set(all.map((item) => item.code));
      validCodes.delete(previousCode);
      validCodes.add(cleanCode);
      const cleaned = cleanRequiresList(cleanCode, requires, validCodes);
      if (cleaned.dropped.length) {
        return res.status(400).json({
          message: `Las correlativas contienen referencias inválidas: ${cleaned.dropped.join(", ")}`,
          dropped: cleaned.dropped,
        });
      }

      const allRequires = {};
      for (const item of all) {
        const itemCode = item.code === previousCode ? cleanCode : item.code;
        allRequires[itemCode] = (item.requires || []).map((itemRequire) =>
          itemRequire === previousCode ? cleanCode : itemRequire,
        );
      }
      const cycle = findCycle(allRequires, [{ code: cleanCode, requires: cleaned.clean }]);
      if (cycle) {
        return res.status(400).json({
          message: `Las correlativas forman un ciclo (${cycle.join(" -> ")}): no se guardó nada`,
          cycle,
        });
      }
      nextRequires = cleaned.clean;
    }
    subject.code = cleanCode;
    subject.name = cleanName;
    subject.slug = normalizeName(cleanName);
    subject.year = nextYear;
    subject.cuatrimestre = nextCuatrimestre;
    subject.duration = ["C", "A", "TF"].includes(duration) ? duration : subject.duration;
    subject.credits = nextCredits;
    subject.requires = nextRequires;
    subject.kind = ["Materia", "ACA", "AU", "OTRA"].includes(kind) ? kind : subject.kind;
    if (typeof optional === "boolean") subject.optional = optional;
    if (typeof intermediate === "boolean") subject.intermediate = intermediate;
    await subject.save();
    if (previousCode !== cleanCode) {
      await Subject.updateMany(
        { careerId: id, requires: previousCode },
        { $set: { "requires.$": cleanCode } },
      );
      await UserProgress.updateMany(
        { careerId: id, subjectCode: previousCode },
        { $set: { subjectCode: cleanCode } },
      );
    }

    res.status(200).json(subject);
  } catch (error) {
    next(error);
  }
};

const deleteSubject = async (req, res, next) => {
  try {
    const { id, subjectId } = req.params;
    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });

    const subject = await Subject.findOneAndDelete({ _id: subjectId, careerId: id });
    if (!subject) return res.status(404).json({ message: "Materia no encontrada" });

    await Subject.updateMany(
      { careerId: id, requires: subject.code },
      { $pull: { requires: subject.code } },
    );
    await UserProgress.deleteMany({ careerId: id, subjectCode: subject.code });
    career.subjectCount = await Subject.countDocuments({ careerId: id });
    await career.save();

    res.status(200).json({ deleted: subject.code, deletedId: subject._id });
  } catch (error) {
    next(error);
  }
};

// Rango esperado [min,max] de materias según docs/testing/planes-referencia.json
// (se matchea por nombre de archivo subido). Null si no hay referencia.
let planesRefCache = null;
function lookupRange(originalname) {
  try {
    if (!planesRefCache) {
      const p = path.join(__dirname, "..", "..", "..", "docs", "testing", "planes-referencia.json");
      planesRefCache = JSON.parse(fs.readFileSync(p, "utf8")).planes || [];
    }
    const base = String(originalname || "").toLowerCase();
    const entry = planesRefCache.find((e) =>
      String(e.file || "").toLowerCase().endsWith(base) ||
      base.endsWith(String(e.file || "").toLowerCase().split("/").pop()),
    );
    if (entry && Array.isArray(entry.expectedSubjects)) {
      return { min: entry.expectedSubjects[0], max: entry.expectedSubjects[1] };
    }
  } catch {
    /* sin referencia: solo fallback ante 0 materias */
  }
  return null;
}

// POST /careers/:id/parse-official (multipart, campo "file")
const parseOfficial = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Enviá el PDF en el campo 'file'" });
    }
    if (!isPdfBuffer(req.file.buffer)) {
      return res.status(400).json({ message: "Solo se aceptan archivos PDF" });
    }
    let parsed;
    try {
      parsed = await parseOfficialPlan(req.file.buffer);
    } catch (error) {
      throw new AppError(
        400,
        "No se pudo leer el PDF. Asegurate de que sea un PDF con texto (no escaneado).",
        error.message,
      );
    }
    // Fallback IA: si el parser determinístico no detectó nada o quedó fuera
    // del rango de referencia (tabla no soportada), se intenta la extracción
    // con IA. La respuesta avisa con aiFallback para revisión humana.
    let aiFallback = false;
    let aiProvider = null;
    const range = lookupRange(req.file.originalname);
    const outOfRange =
      range && (parsed.subjects.length < range.min || parsed.subjects.length > range.max);
    if ((parsed.subjects.length === 0 || outOfRange) && isConfigured()) {
      try {
        const hint = String(req.file.originalname || "")
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]+/g, " ")
          .slice(0, 120);
        const ai = await extractPlanWithAI(req.file.buffer, {
          careerHint: hint,
          expectedMin: range?.min ?? null,
          expectedMax: range?.max ?? null,
        });
        parsed = ai;
        aiFallback = true;
        aiProvider = ai.provider;
      } catch (error) {
        // La IA tampoco resolvió: se responde el resultado del parser con aviso.
        console.error(`[parse-official] fallback IA no resolvió ${req.file.originalname}: ${error.message}`);
        parsed._aiNote = error.message;
      }
    }
    res.status(200).json({
      sourceKind: parsed.sourceKind,
      subjects: parsed.subjects,
      detectedCount: parsed.subjects.length,
      intermediateTitle: parsed.intermediateTitle || null,
      creditsFinal: parsed.creditsFinal || 0,
      creditsIntermediate: parsed.creditsIntermediate || 0,
      aiFallback,
      aiProvider,
      ...(parsed._aiNote ? { aiNote: parsed._aiNote } : {}),
    });
  } catch (error) {
    next(error);
  }
};

function normalizeName(name) {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

// Normaliza para comparar: minúsculas, sin acentos, sin puntuación.
function normKey(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

// POST /careers/:id/parse-correlativas (multipart, campo "file")
const parseCorrelativas = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Enviá el PDF en el campo 'file'" });
    }
    if (!isPdfBuffer(req.file.buffer)) {
      return res.status(400).json({ message: "Solo se aceptan archivos PDF" });
    }
    const { id } = req.params;
    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });

    const dbSubjects = await Subject.find({ careerId: id }).select("-__v");
    let parsed;
    try {
      parsed = await parseCorrelativasPdf(req.file.buffer);
    } catch (error) {
      throw new AppError(
        400,
        "No se pudo leer el PDF de correlatividades. Asegurate de que sea un PDF con texto (no escaneado).",
        error.message,
      );
    }

    const rows = parsed.subjects.map((s) => {
      const r = bestDbMatch(s.name, dbSubjects);
      return {
        num: s.num,
        parsedCode: s.code,
        name: s.name,
        matched: !!r.db,
        dbCode: r.db ? r.db.code : null,
        dbName: r.db ? r.db.name : null,
        confidence: r.confidence,
        requires: [],
      };
    });

    // Mapea las referencias internas (CR###) a códigos reales de la carrera.
    const byPCode = new Map(rows.map((r) => [r.parsedCode, r]));
    for (const s of parsed.subjects) {
      const row = byPCode.get(s.code);
      for (const pc of s.requires) {
        const ref = byPCode.get(pc);
        if (ref && ref.dbCode && !row.requires.includes(ref.dbCode)) {
          row.requires.push(ref.dbCode);
        }
      }
    }

    const matchedCount = rows.filter((r) => r.matched).length;
    // Fallback IA lectora (BUG-004/005): si el matching determinístico queda
    // bajo, la IA extrae pares LITERALES del PDF y bestDbMatch los resuelve
    // contra la base: es la única vía a códigos. Solo exact+compact van a
    // `aiSuggested` (aplicables); fuzzy/prefix a `aiReview` (lectura).
    let aiSuggested = [];
    let aiReview = [];
    let aiUnresolved = [];
    let aiFallback = false;
    let aiProvider = null;
    let aiCoverage = null;
    const ratio = parsed.total ? matchedCount / parsed.total : 0;
    if ((parsed.total === 0 || ratio < 0.7) && isConfigured()) {
      try {
        const ai = await extractCorrelativasWithAI(req.file.buffer, {
          careerHint: career.name,
        });
        aiCoverage = { extraidos: ai.pairs.length, total: parsed.total };
        const rank = { exact: 0, compact: 1, fuzzy: 2, prefix: 2 };
        for (const pair of ai.pairs) {
          const sm = bestDbMatch(pair.subject, dbSubjects);
          if (!sm.db) {
            aiUnresolved.push(pair.subject);
            continue;
          }
          const resolved = [];
          let worst = rank[sm.confidence] ?? 3;
          for (const reqName of pair.requires) {
            const rm = bestDbMatch(reqName, dbSubjects);
            if (!rm.db) {
              aiUnresolved.push(`${pair.subject} requiere "${reqName}" (sin coincidencia oficial)`);
              continue;
            }
            worst = Math.max(worst, rank[rm.confidence] ?? 3);
            resolved.push({ code: rm.db.code, name: rm.db.name, confidence: rm.confidence });
          }
          const subjConf = sm.confidence;
          if (worst <= 1) {
            aiSuggested.push({
              code: sm.db.code,
              requires: resolved.map((r) => r.code),
              confidence: worst === 0 ? "exact" : "compact",
              evidence: pair.evidence || null,
            });
          } else {
            aiReview.push({
              code: sm.db.code,
              subject: sm.db.name,
              subjectConfidence: subjConf,
              requires: resolved,
              evidence: pair.evidence || null,
            });
          }
        }
        aiFallback = true;
        aiProvider = ai.provider;
      } catch (error) {
        console.error(`[parse-correlativas] fallback IA no resolvió ${req.file.originalname}: ${error.message}`);
      }
    }
    res.status(200).json({
      sourceKind: parsed.sourceKind,
      total: parsed.total,
      careerSubjects: dbSubjects.length,
      matchedCount,
      partial: matchedCount < parsed.total,
      subjects: rows,
      unresolved: rows.filter((r) => !r.matched),
      aiSuggested,
      aiReview,
      aiUnresolved,
      aiFallback,
      aiProvider,
      aiCoverage,
    });
  } catch (error) {
    next(error);
  }
};

// POST /careers/:id/correlativas (JSON) — actualiza SOLO el campo requires
const saveCorrelativas = async (req, res, next) => {
  try {
    const { id } = req.params;
    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });

    const incoming = Array.isArray(req.body.subjects) ? req.body.subjects : [];
    if (!incoming.length) {
      return res.status(400).json({ message: "Enviá un arreglo de materias" });
    }

    // Blindaje: solo se persisten códigos que existan en la carrera (nunca
    // códigos inventados por IA o a mano), sin autorreferencias y sin ciclos.
    const all = await Subject.find({ careerId: career._id }).select("_id code slug requires");
    const validCodes = new Set(all.map((s) => s.code));
    const byCode = new Map(all.map((s) => [s.code, s]));
    const bySlug = new Map(all.map((s) => [s.slug, s]));

    const updates = [];
    const dropped = [];
    for (const raw of incoming) {
      const code = (raw.code || "").trim();
      const name = (raw.name || "").trim();
      if (!code && !name) continue;
      const subj = (code && byCode.get(code)) || (name && bySlug.get(normalizeName(name)));
      if (!subj) continue;
      const clean = [];
      for (const r of Array.isArray(raw.requires) ? raw.requires : []) {
        const rc = String(r).trim();
        if (!validCodes.has(rc)) {
          dropped.push(`${subj.code} -> ${rc || "(vacío)"} (código inexistente)`);
          continue;
        }
        if (rc === subj.code) {
          dropped.push(`${subj.code} -> ${rc} (autorreferencia)`);
          continue;
        }
        if (!clean.includes(rc)) clean.push(rc);
      }
      updates.push({ subj, requires: clean });
    }

    // Detección de ciclos limitada a las materias tocadas (un ciclo previo en
    // otra parte de la carrera no bloquea este guardado). Todo ciclo nuevo
    // incluye una arista actualizada, así que basta con DFS desde cada require
    // nuevo buscando volver al origen.
    const graph = new Map(all.map((s) => [s.code, [...(s.requires || [])]]));
    for (const u of updates) graph.set(u.subj.code, u.requires);
    let cycle = null;
    for (const u of updates) {
      const parent = new Map();
      const stack = [...u.requires];
      for (const r of u.requires) parent.set(r, u.subj.code);
      const seen = new Set();
      while (stack.length && !cycle) {
        const node = stack.pop();
        if (node === u.subj.code) {
          const path = [node];
          let cur = parent.get(node);
          while (cur && cur !== u.subj.code) {
            path.unshift(cur);
            cur = parent.get(cur);
          }
          path.unshift(u.subj.code);
          cycle = path;
          break;
        }
        if (seen.has(node) || !graph.has(node)) continue;
        seen.add(node);
        for (const nxt of graph.get(node) || []) {
          if (!parent.has(nxt)) parent.set(nxt, node);
          stack.push(nxt);
        }
      }
      if (cycle) break;
    }
    if (cycle) {
      return res.status(400).json({
        message: `Las correlativas forman un ciclo (${cycle.join(" -> ")}): no se guardó nada`,
        cycle,
      });
    }

    let saved = 0;
    if (updates.length) {
      await Subject.bulkWrite(
        updates.map((u) => ({
          updateOne: { filter: { _id: u.subj._id }, update: { $set: { requires: u.requires } } },
        })),
        { ordered: false },
      );
      saved = updates.length;
    }

    res.status(200).json({
      saved,
      total: await Subject.countDocuments({ careerId: career._id }),
      dropped,
    });
  } catch (error) {
    next(error);
  }
};

// POST /careers/:id/subjects (JSON) — guardado/merge por nombre
const saveSubjects = async (req, res, next) => {
  try {
    const { id } = req.params;
    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });

    const incoming = Array.isArray(req.body.subjects) ? req.body.subjects : [];
    if (!incoming.length) {
      return res.status(400).json({ message: "Enviá un arreglo de materias" });
    }

    const ops = [];
    const usedCodes = new Map();
    for (const raw of incoming) {
      const name = (raw.name || "").trim();
      if (!name) continue;

      // el código solo se asigna al insertar ($setOnInsert); si ya existe la
      // materia (mismo nombre), no se pisa el código real que tenga asignado
      let code = (raw.code || "").trim();
      if (!code) {
        code = `SR${String(usedCodes.size + 1).padStart(3, "0")}`;
      }
      if (usedCodes.has(code) && usedCodes.get(code) !== normalizeName(name)) {
        code = `${code}-${usedCodes.size + 1}`;
      }
      usedCodes.set(code, normalizeName(name));

      const slug = normalizeName(name);

      const set = {
        name,
        slug,
        year: raw.year ?? null,
        cuatrimestre: raw.cuatrimestre ?? null,
        duration: ["C", "A", "TF"].includes(raw.duration) ? raw.duration : "C",
        "hours.his": raw.hours?.his ?? 0,
        "hours.hit": raw.hours?.hit ?? 0,
        "hours.hite": raw.hours?.hite ?? 0,
        "hours.hip": raw.hours?.hip ?? 0,
        "hours.htat": raw.hours?.htat ?? 0,
        "hours.ht": raw.hours?.ht ?? 0,
        credits: raw.credits ?? 0,
        kind: ["Materia", "ACA", "AU", "OTRA"].includes(raw.kind) ? raw.kind : "Materia",
        optional: !!raw.optional,
        intermediate: !!raw.intermediate,
        requires: Array.isArray(raw.requires) ? raw.requires.map(String) : [],
      };
      const setOnInsert = { code, careerId: career._id };

      ops.push({
        updateOne: {
          filter: { careerId: career._id, slug },
          update: { $set: set, $setOnInsert: setOnInsert },
          upsert: true,
        },
      });
    }

    const result = ops.length ? await Subject.bulkWrite(ops, { ordered: false }) : null;

    // Blindaje (igual que saveCorrelativas): los requires solo pueden apuntar
    // a códigos existentes de la carrera y nunca a sí mismos. Segunda pasada
    // porque los códigos del mismo lote aún no existían al armar el upsert.
    const allCodes = new Set(
      (await Subject.find({ careerId: career._id }).select("code").lean()).map((s) => s.code),
    );
    const dirty = await Subject.find({
      careerId: career._id,
      requires: { $exists: true, $not: { $size: 0 } },
    }).select("_id code requires");
    let droppedRequires = 0;
    for (const s of dirty) {
      const clean = [...new Set((s.requires || []).map(String))].filter(
        (rc) => rc !== s.code && allCodes.has(rc),
      );
      if (clean.length !== (s.requires || []).length) {
        droppedRequires += (s.requires || []).length - clean.length;
        // eslint-disable-next-line no-await-in-loop
        await Subject.updateOne({ _id: s._id }, { $set: { requires: clean } });
      }
    }
    career.subjectCount = await Subject.countDocuments({ careerId: career._id });

    // Título intermedio: persistir el nombre detectado en el PDF y recalcular
    // el total de créditos de las materias que integran la titulación intermedia.
    const incomingTitle =
      req.body.intermediateTitle !== undefined && String(req.body.intermediateTitle).trim()
        ? String(req.body.intermediateTitle).trim()
        : null;
    if (incomingTitle) career.intermediateTitle = incomingTitle;
    const bodyCreditsFinal = Number(req.body.creditsFinal);
    if (Number.isFinite(bodyCreditsFinal) && bodyCreditsFinal > 0) {
      career.creditsFinal = bodyCreditsFinal;
    }
    const intermRes = await Subject.aggregate([
      {
        $match: {
          careerId: career._id,
          intermediate: true,
          kind: { $ne: "ACA" },
        },
      },
      { $group: { _id: null, n: { $sum: 1 }, credits: { $sum: "$credits" } } },
    ]);
    const hasIntermedia = !!intermRes.length && intermRes[0].n > 0;
    const bodyCreditsInter = Number(req.body.creditsIntermediate);
    if (Number.isFinite(bodyCreditsInter) && bodyCreditsInter > 0) {
      career.creditsIntermediate = bodyCreditsInter;
    } else if (hasIntermedia || career.intermediateTitle) {
      career.creditsIntermediate = intermRes.length ? intermRes[0].credits : 0;
    }
    await career.save();

    res.status(200).json({
      saved: result ? result.upsertedCount + result.modifiedCount + result.matchedCount : 0,
      total: career.subjectCount,
      droppedRequires,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /careers/:id — actualiza datos de la carrera (nombre, instituto, color, etc.)
const updateCareer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      institute,
      color,
      planResolution,
      ruleCode,
      durationYears,
      creditsFinal,
      creditsIntermediate,
    } = req.body;

    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ message: "El nombre de la carrera no puede estar vacío" });
      career.name = trimmed;
    }
    if (institute !== undefined) career.institute = institute ?? "";
    if (color !== undefined) career.color = color || deriveCareerColor(career.institute, career.name);
    if (planResolution !== undefined) career.planResolution = planResolution ?? "";
    if (ruleCode !== undefined) career.ruleCode = ruleCode ?? "";
    if (durationYears !== undefined) career.durationYears = durationYears;
    if (creditsFinal !== undefined) career.creditsFinal = creditsFinal;
    if (creditsIntermediate !== undefined) career.creditsIntermediate = creditsIntermediate;

    await career.save();
    res.status(200).json(career);
  } catch (error) {
    next(error);
  }
};

// DELETE /careers/:id — borra la carrera y todo lo asociado (materias, avance)
const deleteCareer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });

    await Promise.all([
      Subject.deleteMany({ careerId: career._id }),
      UserProgress.deleteMany({ careerId: career._id }),
    ]);
    await Career.deleteOne({ _id: career._id });

    res.status(200).json({ deleted: career.name, deletedId: career._id });
  } catch (error) {
    next(error);
  }
};

const publishCareer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const career = await Career.findByIdAndUpdate(
      id,
      { status: "published", subjectCount: await Subject.countDocuments({ careerId: id }) },
      { returnDocument: "after" },
    );
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });
    res.status(200).json(career);
  } catch (error) {
    next(error);
  }
};

// GET /careers/:id/sugerencias — AR-3 (FRD §3.1.2–3.1.3, Cuerpo C Fase 6.1).
// Sugerencias de inscripción R0–R6 a partir del historial (x-user-id).
const getSugerencias = async (req, res, next) => {
  try {
    const { id } = req.params;
    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });
    const subjects = await Subject.find({ careerId: id }).select("-__v");
    const progress = await UserProgress.find({ careerId: id, userId: req.userId }).select("-__v");
    res.status(200).json(buildSugerencias({ subjects, progress }));
  } catch (error) {
    next(error);
  }
};

// GET /careers/:id/graph?userId=...
const getGraph = async (req, res, next) => {
  try {
    const { id } = req.params;
    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });

    const subjects = await Subject.find({ careerId: id })
      .sort({ year: 1, cuatrimestre: 1, name: 1 })
      .select("-__v");

    let progress = [];
    if (req.userId) {
      progress = await UserProgress.find({ careerId: id, userId: req.userId }).select("-__v");
    }
    const graph = buildGraph({
      subjects,
      progress,
      title: career.name,
    });

    const interAll = subjects.filter((s) => s.intermediate);
    const interMat = interAll.filter((s) => s.kind !== "ACA");
    const interAca = interAll.filter((s) => s.kind === "ACA");
    const acaCredits = interAca.reduce((acc, s) => acc + (s.credits || 0), 0);
    const interSum = interMat.reduce((acc, s) => acc + (s.credits || 0), 0);
    const intermediateTarget =
      career.creditsIntermediate > 0
        ? career.creditsIntermediate
        : interSum + acaCredits || interSum;
    const intermediate = {
      title: career.intermediateTitle || null,
      total: interMat.length,
      credits: intermediateTarget || interSum,
      aprobadas: 0,
      creditsAprob: 0,
    };
    if (interMat.length > 0) {
      const approvedCodes = new Set(
        progress.filter((p) => p.status === "Aprobada").map((p) => p.subjectCode),
      );
      let approvedSum = 0;
      for (const s of interMat) {
        if (approvedCodes.has(s.code)) {
          intermediate.aprobadas += 1;
          approvedSum += s.credits || 0;
        }
      }
      for (const s of interAca) {
        if (approvedCodes.has(s.code)) {
          approvedSum += Math.min(s.credits || 0, Math.max(0, intermediateTarget - approvedSum));
        }
      }
      intermediate.creditsAprob = Math.min(approvedSum, intermediateTarget);
    }

    res.status(200).json({
      ...graph,
      color: career.color || deriveCareerColor(career.institute, career.name),
      intermediate,
    });
  } catch (error) {
    next(error);
  }
};

// Helpers puros exportados para unitarios (Fase 3): misma lógica que usa
// saveCorrelativas, sin tocar Mongo. No cambian comportamiento en runtime.
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

module.exports = {
  createCareer,
  getAllCareers,
  getCareerSubjects,
  updateSubject,
  deleteSubject,
  parseOfficial,
  saveSubjects,
  parseCorrelativas,
  saveCorrelativas,
  publishCareer,
  getGraph,
  getSugerencias,
  deleteCareer,
  updateCareer,
  bestDbMatch,
  cleanRequiresList,
  findCycle,
};