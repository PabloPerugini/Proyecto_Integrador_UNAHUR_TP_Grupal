import type { GraphEdge, GraphNode } from '../types';

type PathNode = Pick<GraphNode, 'code' | 'status' | 'duration'>;

// Cadena que limita el tiempo restante, suponiendo cursadas en paralelo.
// Sin destino se busca en todo el plan; con destino, solo entre sus requisitos.
export function getStudyPath(nodes: readonly PathNode[], edges: readonly GraphEdge[], targetCode?: string | null) {
  const empty = (hasCycle = false) => ({
    chain: [] as string[], chainCosts: [] as number[], cost: 0,
    set: new Set<string>(), edgeSet: new Set<string>(), hasCycle,
  });
  const pending = new Map(nodes.filter(n => n.status !== 'Aprobada').map(n => [n.code, n]));
  if (targetCode === null || (targetCode !== undefined && !pending.has(targetCode))) return empty();
  const incoming = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    if (!pending.has(edge.source) || !pending.has(edge.target)) continue;
    const list = incoming.get(edge.target) ?? [];
    list.push(edge);
    incoming.set(edge.target, list);
  }
  const costs = new Map<string, number>();
  const predecessor = new Map<string, GraphEdge>();
  const visiting = new Set<string>();
  let hasCycle = false;
  const duration = (code: string) => {
    const value = pending.get(code)?.duration;
    return value === 'A' || value === 'TF' ? 2 : 1;
  };
  const visit = (code: string): number => {
    if (visiting.has(code)) { hasCycle = true; return 0; }
    const cached = costs.get(code);
    if (cached !== undefined) return cached;
    visiting.add(code);
    let best = 0;
    for (const edge of incoming.get(code) ?? []) {
      const cost = visit(edge.source);
      if (cost > best) {
        best = cost;
        predecessor.set(code, edge);
      }
    }
    visiting.delete(code);
    const cost = best + duration(code);
    costs.set(code, cost);
    return cost;
  };
  let end = targetCode;
  let cost = 0;
  for (const code of targetCode === undefined ? pending.keys() : [targetCode]) {
    const candidate = visit(code);
    if (candidate > cost) { cost = candidate; end = code; }
  }
  if (hasCycle) return empty(true);
  const chain: string[] = [];
  const edgeSet = new Set<string>();
  while (end !== undefined) {
    chain.push(end);
    const edge = predecessor.get(end);
    if (edge) edgeSet.add(edge.id);
    end = edge?.source;
  }
  chain.reverse();
  return { chain, chainCosts: chain.map(duration), cost, set: new Set(chain), edgeSet, hasCycle: false };
}
