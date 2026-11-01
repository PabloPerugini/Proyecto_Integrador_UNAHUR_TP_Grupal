// Cálculos de caminos sobre el grafo ya resuelto (estados efectivos).
// Todo es puro: recibe nodos/aristas y no toca la base de datos.

// ANUAL y OTRA (trabajo final) ocupan dos períodos; el resto, uno.
const DURATION_COSTS = { ANUAL: 2, OTRA: 2 };

function durationCost(duration) {
  return DURATION_COSTS[duration] || 1;
}

function isPending(node) {
  return node.effectiveStatus !== "Aprobada";
}

function emptyTargetPath(target, hasCycle = false) {
  return {
    target,
    chain: [],
    chainCosts: [],
    cost: 0,
    edgeIds: [],
    hasCycle,
  };
}

// Camino más largo entre las materias pendientes, ponderado por duración.
// Devuelve la cadena, sus costos, el total y las aristas que la unen.
function longestPendingPath(nodes, edges, approved) {
  const pending = new Map(
    nodes.filter((node) => !approved.has(node.id)).map((node) => [node.id, node]),
  );
  const g = new Map([...pending.keys()].map((id) => [id, []]));
  const inDeg = new Map([...pending.keys()].map((id) => [id, 0]));
  const edgeId = new Map();

  for (const edge of edges) {
    if (!pending.has(edge.source) || !pending.has(edge.target)) continue;
    g.get(edge.source).push(edge.target);
    inDeg.set(edge.target, (inDeg.get(edge.target) || 0) + 1);
    edgeId.set(`${edge.source}->${edge.target}`, edge.id);
  }

  // Kahn: un ciclo solo entre materias sin aprobar queda fuera del topo.
  const queue = [...inDeg.keys()].filter((id) => inDeg.get(id) === 0);
  const topo = [];
  while (queue.length > 0) {
    const u = queue.shift();
    topo.push(u);
    for (const v of g.get(u) || []) {
      inDeg.set(v, (inDeg.get(v) || 0) - 1);
      if (inDeg.get(v) === 0) queue.push(v);
    }
  }
  const hasCycle = topo.length < pending.size;

  // DP: dp[u] = costo(u) + max(dp[sucesores]).
  const dp = new Map();
  for (const id of pending.keys()) dp.set(id, durationCost(pending.get(id)?.duration));
  for (const u of [...topo].reverse()) {
    const best = (g.get(u) || []).reduce(
      (max, v) => Math.max(max, dp.get(v) ?? 0),
      0,
    );
    dp.set(u, durationCost(pending.get(u)?.duration) + best);
  }

  let start = topo[0];
  for (const id of topo) {
    if ((dp.get(id) ?? 0) > (dp.get(start) ?? 0)) start = id;
  }

  const criticalPath = [];
  const criticalPathEdges = [];
  const visited = new Set();
  let cur = start;
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    criticalPath.push(cur);
    const next = (g.get(cur) || [])
      .filter((v) => pending.has(v))
      .sort((a, b) => (dp.get(b) ?? 0) - (dp.get(a) ?? 0) || a.localeCompare(b))[0];
    if (!next) break;
    const id = edgeId.get(`${cur}->${next}`);
    if (id) criticalPathEdges.push(id);
    cur = next;
  }

  const criticalPathCosts = criticalPath.map((id) => durationCost(pending.get(id)?.duration));
  const criticalPathCost = criticalPathCosts.reduce((total, cost) => total + cost, 0);

  return {
    criticalPath,
    criticalPathCosts,
    criticalPathCost,
    criticalPathEdges,
    hasCycle,
    topologicalOrder: topo,
  };
}

// Cadena más larga que desemboca en `target`, suponiendo cursadas en paralelo.
// Sin destino devuelve null; con un destino que no está pendiente, vacío.
function computeTargetPath(nodes, edges, target) {
  if (target === null || target === undefined) return null;

  const pending = new Map(
    nodes.filter(isPending).map((node) => [node.id, node]),
  );
  if (!pending.has(target)) return emptyTargetPath(target);

  const incoming = new Map();
  for (const edge of edges) {
    if (!pending.has(edge.source) || !pending.has(edge.target)) continue;
    const list = incoming.get(edge.target) || [];
    list.push(edge);
    incoming.set(edge.target, list);
  }

  const costs = new Map();
  const predecessor = new Map();
  const visiting = new Set();
  let hasCycle = false;

  const visit = (code) => {
    if (visiting.has(code)) {
      hasCycle = true;
      return 0;
    }
    const cached = costs.get(code);
    if (cached !== undefined) return cached;

    visiting.add(code);
    let best = 0;
    for (const edge of incoming.get(code) || []) {
      const cost = visit(edge.source);
      if (cost > best) {
        best = cost;
        predecessor.set(code, edge);
      }
    }
    visiting.delete(code);

    const cost = best + durationCost(pending.get(code)?.duration);
    costs.set(code, cost);
    return cost;
  };

  const cost = visit(target);
  if (hasCycle) return emptyTargetPath(target, true);

  const chain = [];
  const edgeIds = [];
  let cur = target;
  while (cur) {
    chain.push(cur);
    const edge = predecessor.get(cur);
    if (edge) edgeIds.push(edge.id);
    cur = edge?.source;
  }
  chain.reverse();
  edgeIds.reverse();

  return {
    target,
    chain,
    chainCosts: chain.map((code) => durationCost(pending.get(code)?.duration)),
    cost,
    edgeIds,
    hasCycle: false,
  };
}

module.exports = {
  computeTargetPath,
  durationCost,
  longestPendingPath,
};
