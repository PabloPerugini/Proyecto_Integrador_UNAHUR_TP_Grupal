import type { GraphEdge, GraphNode } from '../types';

type PathNode = Pick<GraphNode, 'code' | 'status' | 'workloadHours'>;

// Sin destino traza el camino pendiente con mayor carga horaria acumulada.
// Con destino incluye todas las ramas pendientes necesarias para aprobarlo.
export function getStudyPath(nodes: readonly PathNode[], edges: readonly GraphEdge[], targetCode?: string | null) {
  const empty = (hasCycle = false) => ({
    chain: [] as string[],
    set: new Set<string>(), edgeSet: new Set<string>(), hasCycle,
  });
  const pending = new Map(nodes.filter(n => n.status !== 'Aprobada').map(n => [n.code, n]));
  if (targetCode === null || (targetCode !== undefined && !pending.has(targetCode))) return empty();
  if (targetCode !== undefined) {
    const incoming = new Map<string, GraphEdge[]>();
    for (const edge of edges) {
      if (!pending.has(edge.source) || !pending.has(edge.target)) continue;
      const list = incoming.get(edge.target) ?? [];
      list.push(edge);
      incoming.set(edge.target, list);
    }
    const chain = new Set<string>();
    const edgeSet = new Set<string>();
    const visiting = new Set<string>();
    let hasCycle = false;
    const visit = (code: string) => {
      if (visiting.has(code)) { hasCycle = true; return; }
      if (chain.has(code)) return;
      chain.add(code);
      visiting.add(code);
      for (const edge of incoming.get(code) ?? []) {
        edgeSet.add(edge.id);
        visit(edge.source);
      }
      visiting.delete(code);
    };
    visit(targetCode);
    if (hasCycle) return empty(true);
    return { chain: Array.from(chain), set: chain, edgeSet, hasCycle: false };
  }
  const outgoing = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    if (!pending.has(edge.source) || !pending.has(edge.target)) continue;
    const outgoingEdges = outgoing.get(edge.source) ?? [];
    outgoingEdges.push(edge);
    outgoing.set(edge.source, outgoingEdges);
  }
  if (pending.size === 0) return empty();
  const workload = new Map<string, number>();
  for (const node of pending.values()) workload.set(node.code, node.workloadHours ?? 1);
  const pathHours = new Map<string, number>();
  const pathLengths = new Map<string, number>();
  const bestNextEdges = new Map<string, GraphEdge[]>();
  const visiting = new Set<string>();
  let hasCycle = false;
  const visit = (code: string): number => {
    if (visiting.has(code)) { hasCycle = true; return 0; }
    const cached = pathHours.get(code);
    if (cached !== undefined) return cached;
    visiting.add(code);
    let bestTailHours = 0;
    let bestTailLength = 0;
    const bestEdges: GraphEdge[] = [];
    for (const edge of outgoing.get(code) ?? []) {
      const tailHours = visit(edge.target);
      const tailLength = pathLengths.get(edge.target) ?? 0;
      if (tailHours > bestTailHours || (tailHours === bestTailHours && tailLength > bestTailLength)) {
        bestTailHours = tailHours;
        bestTailLength = tailLength;
        bestEdges.splice(0, bestEdges.length, edge);
      } else if (tailHours === bestTailHours && tailLength === bestTailLength) {
        bestEdges.push(edge);
      }
    }
    visiting.delete(code);
    bestNextEdges.set(code, bestEdges);
    pathLengths.set(code, bestTailLength + 1);
    const totalHours = (workload.get(code) ?? 1) + bestTailHours;
    pathHours.set(code, totalHours);
    return totalHours;
  };
  for (const code of pending.keys()) visit(code);
  if (hasCycle) return empty(true);
  const maxPathHours = Math.max(...pathHours.values());
  const maxPathLength = Math.max(...Array.from(pathHours.keys())
    .filter(code => pathHours.get(code) === maxPathHours)
    .map(code => pathLengths.get(code) ?? 0));
  const set = new Set<string>();
  const edgeSet = new Set<string>();
  const visited = new Set<string>();
  const collectPath = (code: string) => {
    set.add(code);
    for (const edge of outgoing.get(code) ?? []) {
      if (!(bestNextEdges.get(code) ?? []).some(best => best.id === edge.id)) continue;
      edgeSet.add(edge.id);
      if (visited.has(edge.target)) continue;
      visited.add(edge.target);
      collectPath(edge.target);
    }
  };
  for (const [code, hours] of pathHours) {
    if (hours !== maxPathHours || pathLengths.get(code) !== maxPathLength) continue;
    visited.add(code);
    collectPath(code);
  }
  return { chain: Array.from(set), set, edgeSet, hasCycle: false };
}
