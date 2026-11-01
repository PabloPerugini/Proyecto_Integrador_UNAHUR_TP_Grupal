// Construye el grafo de correlatividades para el frontend.
// Nodos: estado guardado (status/savedStatus) y estado efectivo derivado.
// Aristas: correlatividades resueltas a códigos conocidos.

const {
  computeTargetPath,
  longestPendingPath,
} = require("./graphPaths.service");

const STATUS_ES = {
  APROBADA: "Aprobada",
  REGULARIZADA: "Regular",
  CURSANDO: "Cursando",
  PENDIENTE: "Pendiente",
};

function normalizeStatus(value) {
  const upper = String(value ?? "").trim().toUpperCase();
  if (upper === "APROBADA") return "APROBADA";
  if (upper === "REGULARIZADA" || upper === "REGULAR") return "REGULARIZADA";
  if (upper === "CURSANDO") return "CURSANDO";
  return "PENDIENTE";
}

// `requirements` trae el requiredStatus por correlativa. `requires` es el
// formato viejo (solo códigos) y se conserva para sugerencias: exige aprobada.
function requirementsOf(subject) {
  if (Array.isArray(subject.requirements)) {
    return subject.requirements
      .map((requirement) =>
        typeof requirement === "string"
          ? { code: requirement, requiredStatus: "APROBADA" }
          : {
              code: requirement.code,
              requiredStatus:
                requirement.requiredStatus === "REGULARIZADA"
                  ? "REGULARIZADA"
                  : "APROBADA",
            },
      )
      .filter((requirement) => requirement.code);
  }

  return (subject.requires || []).map((code) => ({
    code,
    requiredStatus: "APROBADA",
  }));
}

function buildGraph({
  subjects,
  progress = [],
  title = "",
  color = null,
  intermediateTitle = null,
  userStudyPlanId = null,
  target = null,
}) {
  const byCode = new Map(subjects.map((subject) => [subject.code, subject]));
  const requirementsByCode = new Map(
    subjects.map((subject) => [subject.code, requirementsOf(subject)]),
  );

  const savedByCode = new Map(
    subjects.map((subject) => [subject.code, "PENDIENTE"]),
  );
  for (const item of progress) {
    savedByCode.set(item.subjectCode, normalizeStatus(item.status));
  }

  const grounded = new Set();
  const meets = (code) =>
    (requirementsByCode.get(code) || []).every((requirement) => {
      if (!byCode.has(requirement.code)) return true;
      if (!grounded.has(requirement.code)) return false;
      const state = savedByCode.get(requirement.code);
      return (
        state === "APROBADA" ||
        (requirement.requiredStatus === "REGULARIZADA" && state === "REGULARIZADA")
      );
    });

  // Punto fijo: solo una aprobada/regularizada con sustento habilita a otras.
  let changed = true;
  while (changed) {
    changed = false;
    for (const subject of subjects) {
      if (grounded.has(subject.code)) continue;
      const saved = savedByCode.get(subject.code);
      if (saved !== "APROBADA" && saved !== "REGULARIZADA") continue;
      if (meets(subject.code)) {
        grounded.add(subject.code);
        changed = true;
      }
    }
  }

  const effectiveByCode = new Map();
  for (const subject of subjects) {
    const saved = savedByCode.get(subject.code);
    let effective;
    if (saved === "APROBADA" || saved === "REGULARIZADA") {
      effective = grounded.has(subject.code) ? STATUS_ES[saved] : "Bloqueada";
    } else if (saved === "CURSANDO") {
      effective = meets(subject.code) ? "Cursando" : "Bloqueada";
    } else {
      effective = meets(subject.code) ? "Disponible" : "Bloqueada";
    }
    effectiveByCode.set(subject.code, effective);
  }

  const nodes = [];
  const edges = [];
  const edgeIds = new Set();

  for (const subject of subjects) {
    nodes.push({
      id: subject.code,
      planSubjectId: subject.planSubjectId ? String(subject.planSubjectId) : null,
      code: subject.code,
      name: subject.name,
      year: subject.year,
      cuatrimestre: subject.cuatrimestre,
      duration: subject.duration,
      credits: subject.credits,
      kind: subject.kind,
      optional: subject.optional,
      intermediate: !!subject.intermediate,
      status: STATUS_ES[savedByCode.get(subject.code)],
      savedStatus: STATUS_ES[savedByCode.get(subject.code)],
      effectiveStatus: effectiveByCode.get(subject.code),
      position: { x: 0, y: 0 },
    });

    for (const requirement of requirementsByCode.get(subject.code) || []) {
      if (!byCode.has(requirement.code)) continue;
      const id = `${requirement.code}->${subject.code}`;
      if (edgeIds.has(id)) continue;
      edgeIds.add(id);
      edges.push({ id, source: requirement.code, target: subject.code });
    }
  }

  layoutNodes(nodes);

  const approved = new Set(
    nodes.filter((node) => node.effectiveStatus === "Aprobada").map((node) => node.code),
  );
  const countEffective = (status) =>
    nodes.filter((node) => node.effectiveStatus === status).length;

  const path = longestPendingPath(nodes, edges, approved);
  const targetPath = computeTargetPath(nodes, edges, target);

  const intermediateNodes = nodes.filter((node) => node.intermediate);
  const intermediate = intermediateNodes.length
    ? {
        title: intermediateTitle,
        total: intermediateNodes.length,
        aprobadas: intermediateNodes.filter((node) => node.effectiveStatus === "Aprobada").length,
        credits: intermediateNodes.reduce((total, node) => total + (node.credits || 0), 0),
        creditsAprob: intermediateNodes
          .filter((node) => node.effectiveStatus === "Aprobada")
          .reduce((total, node) => total + (node.credits || 0), 0),
      }
    : undefined;

  return {
    title,
    color,
    ...(userStudyPlanId ? { userStudyPlanId } : {}),
    nodes,
    edges,
    availableNow: nodes
      .filter((node) => node.effectiveStatus === "Disponible")
      .map((node) => node.code),
    criticalPath: path.criticalPath,
    criticalPathCosts: path.criticalPathCosts,
    criticalPathCost: path.criticalPathCost,
    criticalPathEdges: path.criticalPathEdges,
    hasCycle: path.hasCycle,
    topologicalOrder: path.topologicalOrder,
    targetPath,
    stats: {
      total: nodes.length,
      aprobadas: approved.size,
      pendientes: nodes.length - approved.size,
      disponibles: countEffective("Disponible"),
      bloqueadas: countEffective("Bloqueada"),
      enCurso: countEffective("Cursando"),
      regulares: countEffective("Regular"),
      creditsTotal: subjects.reduce((total, subject) => total + (subject.credits || 0), 0),
      creditsAprobados: subjects.reduce(
        (total, subject) => total + (approved.has(subject.code) ? subject.credits || 0 : 0),
        0,
      ),
    },
    intermediate,
  };
}

function layoutNodes(nodes) {
  const byYear = new Map();
  for (const node of nodes) {
    const year = node.year ?? 99; // materias sin año van al final
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(node);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const colW = 300;
  const rowH = 140;
  const maxRows = 8;

  let colCursor = 0;
  for (const year of years) {
    const list = byYear
      .get(year)
      .slice()
      .sort(
        (a, b) =>
          (a.cuatrimestre ?? 0) - (b.cuatrimestre ?? 0) ||
          a.name.localeCompare(b.name),
      );
    const cols = Math.max(1, Math.ceil(list.length / maxRows));
    list.forEach((node, index) => {
      const column = Math.floor(index / maxRows);
      node.position = {
        x: (colCursor + column) * colW + 40,
        y: 40 + (index % maxRows) * rowH,
      };
    });
    colCursor += cols;
  }
}

module.exports = { buildGraph };
