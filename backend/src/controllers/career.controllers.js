const Career = require("../models/career");
const Subject = require("../models/subject");
const { parseOfficialPlan, parseCorrelativas: parseCorrelativasPdf } = require("../services/pdfParser.service");
const { buildGraph } = require("../services/graph.service");
const UserProgress = require("../models/userprogress");
const { deriveCareerColor } = require("../utils/careerColor");
const crypto = require("crypto");
const { chat, isConfigured } = require("../services/ai.service");

const createCareer = async (req, res) => {
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
    res.status(400).json({ message: "Error al crear la carrera", error: error.message });
  }
};

const getAllCareers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const careers = await Career.find(filter).sort({ createdAt: -1 }).select("-__v");
    const withCount = await Promise.all(
      careers.map(async (c) => ({
        ...c.toObject(),
        subjectCount: await Subject.countDocuments({ careerId: c._id }),
      })),
    );
    res.status(200).json(withCount);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las carreras", error: error.message });
  }
};

const getCareerSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const subjects = await Subject.find({ careerId: id })
      .sort({ year: 1, cuatrimestre: 1, name: 1 })
      .select("-__v");
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las materias", error: error.message });
  }
};

// POST /careers/:id/parse-official (multipart, campo "file")
const parseOfficial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Enviá el PDF en el campo 'file'" });
    }
    const parsed = await parseOfficialPlan(req.file.buffer);
    res.status(200).json({
      sourceKind: parsed.sourceKind,
      subjects: parsed.subjects,
      detectedCount: parsed.subjects.length,
      intermediateTitle: parsed.intermediateTitle || null,
      creditsFinal: parsed.creditsFinal || 0,
      creditsIntermediate: parsed.creditsIntermediate || 0,
    });
  } catch (error) {
    res.status(400).json({ message: "Error al parsear el PDF" });
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

// Intenta resolver por sinonimia/embedding las materias que el matching clásico
// (exacto, compacto, Levenshtein y prefijo) no pudo casar.
async function enrichSemantic(rows, dbSubjects) {
  const pending = rows.filter((r) => !r.matched);
  if (!pending.length || !dbSubjects.length) return;
  try {
    const { embedTexts, cosine, MIN_SIMILARITY } = require("../services/embeddings.service");
    const dbVectors = await embedTexts(dbSubjects.map((d) => d.name));
    for (let i = 0; i < pending.length; i++) {
      const nameVec = await embedTexts([pending[i].name]);
      let bestDb = null;
      let bestSim = MIN_SIMILARITY;
      for (let j = 0; j < dbVectors.length; j++) {
        const sim = cosine(nameVec[0], dbVectors[j]);
        if (sim > bestSim) {
          bestSim = sim;
          bestDb = dbSubjects[j];
        }
      }
      if (bestDb) {
        pending[i].matched = true;
        pending[i].dbCode = bestDb.code;
        pending[i].dbName = bestDb.name;
        pending[i].confidence = "semantic";
      }
    }
  } catch (error) {
    // conserva el matching clásico si el modelo no está disponible
  }
}

// POST /careers/:id/parse-correlativas (multipart, campo "file")
const parseCorrelativas = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Enviá el PDF en el campo 'file'" });
    }
    const { id } = req.params;
    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });

    const dbSubjects = await Subject.find({ careerId: id }).select("-__v");
    const parsed = await parseCorrelativasPdf(req.file.buffer);

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

    await enrichSemantic(rows, dbSubjects);

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
    res.status(200).json({
      sourceKind: parsed.sourceKind,
      total: parsed.total,
      careerSubjects: dbSubjects.length,
      matchedCount,
      partial: matchedCount < parsed.total,
      subjects: rows,
      unresolved: rows.filter((r) => !r.matched),
    });
  } catch (error) {
    res.status(400).json({ message: "Error al parsear las correlativas" });
  }
};

// POST /careers/:id/correlativas (JSON) — actualiza SOLO el campo requires
const saveCorrelativas = async (req, res) => {
  try {
    const { id } = req.params;
    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });

    const incoming = Array.isArray(req.body.subjects) ? req.body.subjects : [];
    if (!incoming.length) {
      return res.status(400).json({ message: "Enviá un arreglo de materias" });
    }

    let saved = 0;
    for (const raw of incoming) {
      const code = (raw.code || "").trim();
      const name = (raw.name || "").trim();
      if (!code && !name) continue;
      const requires = Array.isArray(raw.requires)
        ? raw.requires.map(String)
        : [];
      const filter = code
        ? { careerId: career._id, code }
        : { careerId: career._id, slug: normalizeName(name) };
      const subj = await Subject.findOne(filter).select("_id code name requires");
      if (!subj) continue;
      await Subject.updateOne({ _id: subj._id }, { $set: { requires } });
      saved++;
    }

    res.status(200).json({
      saved,
      total: await Subject.countDocuments({ careerId: career._id }),
    });
  } catch (error) {
    res.status(500).json({ message: "Error al guardar las correlativas", error: error.message });
  }
};

// POST /careers/:id/subjects (JSON) — guardado/merge por nombre
const saveSubjects = async (req, res) => {
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
        generic: ["CFC", "CFB", "CFP", "ACA", null].includes(raw.generic) ? raw.generic : null,
        trayecto: raw.trayecto ? String(raw.trayecto).trim().slice(0, 20) : null,
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
    });
  } catch (error) {
    res.status(500).json({ message: "Error al guardar las materias", error: error.message });
  }
};

// PATCH /careers/:id — actualiza datos de la carrera (nombre, instituto, color, etc.)
const updateCareer = async (req, res) => {
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
    res.status(400).json({ message: "Error al actualizar la carrera", error: error.message });
  }
};

// DELETE /careers/:id — borra la carrera y todo lo asociado (materias, avance)
const deleteCareer = async (req, res) => {
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
    res.status(500).json({ message: "Error al eliminar la carrera", error: error.message });
  }
};

const publishCareer = async (req, res) => {
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
    res.status(500).json({ message: "Error al publicar la carrera", error: error.message });
  }
};

// GET /careers/:id/graph?userId=...
const getGraph = async (req, res) => {
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
    const intermediateHours = (list) =>
    list.reduce(
      (acc, s) => ({
        hit: (acc.hit || 0) + (s.hours?.hit || 0),
        htat: (acc.htat || 0) + (s.hours?.htat || 0),
        ht: (acc.ht || 0) + (s.hours?.ht || 0),
      }),
      { hit: 0, htat: 0, ht: 0 },
    );
    const intermediate = {
      title: career.intermediateTitle || null,
      total: interMat.length,
      credits: intermediateTarget || interSum,
      hours: intermediateHours(interAll),
      subjects: interMat.map((s) => ({
        code: s.code,
        name: s.name,
        slug: s.slug,
        year: s.year,
        cuatrimestre: s.cuatrimestre,
        hours: s.hours || {},
        credits: s.credits || 0,
      })),
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
    res.status(500).json({ message: "Error al generar el grafo", error: error.message });
  }
};

// POST /careers/:id/chat — orientador académico por IA, basado en el plan real
const chatCareer = async (req, res) => {
  try {
    const { id } = req.params;
    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt) return res.status(400).json({ message: "Enviá un prompt" });
    if (!isConfigured()) {
      return res.status(503).json({
        message:
          "No hay proveedor de IA configurado. Configurá GROQ_API_KEY, GEMINI_API_KEY o un Ollama local.",
      });
    }

    const career = await Career.findById(id);
    if (!career) return res.status(404).json({ message: "Carrera no encontrada" });

    const subjects = await Subject.find({ careerId: id })
      .sort({ year: 1, cuatrimestre: 1, name: 1 })
      .select("code name year credits requires");

    const lines = subjects.map(
      (s) =>
        `${s.code} | ${s.name}${s.year ? ` | Año ${s.year}` : ""}${s.credits ? ` | ${s.credits} créditos` : ""}${
          s.requires?.length ? ` | Requiere: ${s.requires.join(", ")}` : ""
        }`,
    );

    const system = `Sos un orientador académico de la UNAHUR. Respondés en español, conciso y práctico, sobre la carrera "${career.name}". Plan de estudios (código | materia | año | créditos | requiere):\n${lines.join("\n")}`;

    const key = `ai:chat:${id}:${crypto
      .createHash("sha256")
      .update(prompt.toLowerCase())
      .digest("hex")}`;

    const result = await chat(system, prompt, key);
    res.status(200).json({ ...result, careerId: id, subjects: subjects.length });
  } catch (error) {
    res.status(500).json({ message: "Error al consultar la IA", error: error.message });
  }
};

module.exports = {
  createCareer,
  getAllCareers,
  getCareerSubjects,
  parseOfficial,
  saveSubjects,
  parseCorrelativas,
  saveCorrelativas,
  publishCareer,
  getGraph,
  deleteCareer,
  updateCareer,
  chatCareer,
};