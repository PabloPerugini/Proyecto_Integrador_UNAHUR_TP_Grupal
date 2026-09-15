// Construye el grafo de correlatividades para el frontend (React Flow).
// nodes: {id, code, name, year, cuatrimestre, duration, credits, status, kind, position}
// edges: {id, source, target} con las correlatividades resueltas a códigos conocidos.

function buildGraph({ subjects, progress = [], title = "" }) {
  const byCode = new Map();
  for (const s of subjects) byCode.set(s.code, s);

  const statusByCode = new Map();
  for (const p of progress) statusByCode.set(p.subjectCode, p.status || "Pendiente");
  for (const s of subjects) {
    if (!statusByCode.has(s.code)) statusByCode.set(s.code, "Pendiente");
  }

  const nodes = [];
  const edges = [];
  const edgeIds = new Set();

  for (const s of subjects) {
    nodes.push({
      id: s.code,
      code: s.code,
      name: s.name,
      year: s.year,
      cuatrimestre: s.cuatrimestre,
      duration: s.duration,
      credits: s.credits,
      kind: s.kind,
      optional: s.optional,
      intermediate: !!s.intermediate,
      status: statusByCode.get(s.code),
      position: { x: 0, y: 0 },
    });
    for (const req of s.requires || []) {
      if (!byCode.has(req)) continue;
      const id = `${req}->${s.code}`;
      if (edgeIds.has(id)) continue;
      edgeIds.add(id);
      edges.push({ id, source: req, target: s.code });
    }
  }

  layoutNodes(nodes);

  const approved = new Set();
  for (const [code, st] of statusByCode) {
    if (st === "Aprobada") approved.add(code);
  }

  const availableNow = nodes
    .filter((n) => !approved.has(n.id))
    .filter((n) => {
      const subj = byCode.get(n.id);
      return (subj.requires || []).every((req) => approved.has(req) || !byCode.has(req));
    })
    .map((n) => n.id);

  const { criticalPath, hasCycle, topologicalOrder } = longestPendingPath(nodes, edges, approved);

  const stats = {
    total: nodes.length,
    aprobadas: approved.size,
    disponibles: availableNow.length,
    pendientes: nodes.length - approved.size,
    enCurso: nodes.filter((n) => n.status === "Cursando").length,
    regulares: nodes.filter((n) => n.status === "Regular").length,
    creditsTotal: subjects.reduce((a, s) => a + (s.credits || 0), 0),
    creditsAprobados: subjects.reduce((a, s) => a + (approved.has(s.code) ? s.credits || 0 : 0), 0),
  };

  return { title, nodes, edges, availableNow, criticalPath, hasCycle, topologicalOrder, stats };
}

function layoutNodes(nodes) {
  const byYear = new Map();
  for (const n of nodes) {
    const y = n.year ?? 99; // materias sin año van al final
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(n);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const colW = 300;
  const rowH = 140;
  const maxRows = 8;

  let colCursor = 0;
  for (const y of years) {
    const list = byYear
      .get(y)
      .slice()
      .sort(
        (a, b) => (a.cuatrimestre ?? 0) - (b.cuatrimestre ?? 0) || a.name.localeCompare(b.name),
      );
    const cols = Math.max(1, Math.ceil(list.length / maxRows));
    list.forEach((n, i) => {
      const k = Math.floor(i / maxRows);
      n.position = { x: (colCursor + k) * colW + 40, y: 40 + (i % maxRows) * rowH };
    });
    colCursor += cols;
  }
}

function longestPendingPath(nodes, edges, approved) {
  // g: prerequisito -> sucesores (flecha de correlatividad)
  const g = new Map();
  for (const n of nodes) {
    if (!approved.has(n.id)) g.set(n.id, []);
  }
  const inDeg = new Map();
  for (const n of nodes) {
    if (!approved.has(n.id)) inDeg.set(n.id, 0);
  }
  for (const e of edges) {
    const skip = approved.has(e.source) || approved.has(e.target);
    if (skip) continue;
    if (!g.has(e.source) || !g.has(e.target)) continue;
    g.get(e.source).push(e.target);
    inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
  }

  // Kahn: ciclo solo entre materias sin aprobar
  const queue = [...inDeg.keys()].filter((k) => inDeg.get(k) === 0);
  const topo = [];
  while (queue.length) {
    const u = queue.shift();
    topo.push(u);
    for (const v of g.get(u) || []) {
      inDeg.set(v, inDeg.get(v) - 1);
      if (inDeg.get(v) === 0) queue.push(v);
    }
  }
  const pendingCount = nodes.filter((n) => !approved.has(n.id)).length;
  const hasCycle = topo.length < pendingCount;

  // DP: dp[u] = 1 + max(dp[v]) sobre sucesores pendientes
  const dp = new Map();
  for (const n of nodes) dp.set(n.id, approved.has(n.id) ? 0 : 1);
  for (const u of [...topo].reverse()) {
    const best = (g.get(u) || []).reduce((m, v) => Math.max(m, dp.get(v) ?? 0), 0);
    dp.set(u, 1 + best);
  }

  // nodo de arranque: el de mayor dp
  let start = topo[0];
  for (const u of topo) {
    if ((dp.get(u) ?? 0) > (dp.get(start) ?? 0)) start = u;
  }

  const criticalPath = [];
  let cur = start;
  while (cur) {
    criticalPath.push(cur);
    const next = (g.get(cur) || [])
      .filter((v) => !approved.has(v))
      .sort((a, b) => (dp.get(b) ?? 0) - (dp.get(a) ?? 0) || a.localeCompare(b))[0];
    const d = dp.get(next) ?? 0;
    cur = d >= 1 ? next : null;
  }

  return { criticalPath, hasCycle, topologicalOrder: topo };
}

module.exports = { buildGraph };