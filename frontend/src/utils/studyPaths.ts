import type { GraphEdge, GraphNode } from '../types';

type PathNode = Pick<GraphNode, 'code' | 'status'>;

// Busca la secuencia más larga de correlativas pendientes.
// Sin destino recorre todo el plan; con destino, solo sus requisitos.
export function getStudyPath(nodes: readonly PathNode[], edges: readonly GraphEdge[], targetCode?: string | null) {
  const empty = (hasCycle = false) => ({
    chain: [] as string[],
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
  const lengths = new Map<string, number>();
  const predecessor = new Map<string, GraphEdge>();
  const visiting = new Set<string>();
  let hasCycle = false;
  const visit = (code: string): number => {
    if (visiting.has(code)) { hasCycle = true; return 0; }
    const cached = lengths.get(code);
    if (cached !== undefined) return cached;
    visiting.add(code);
    let best = 0;
    for (const edge of incoming.get(code) ?? []) {
      const length = visit(edge.source);
      if (length > best) {
        best = length;
        predecessor.set(code, edge);
      }
    }
    visiting.delete(code);
    const length = best + 1;
    lengths.set(code, length);
    return length;
  };
  let end = targetCode;
  let longest = 0;
  for (const code of targetCode === undefined ? pending.keys() : [targetCode]) {
    const candidate = visit(code);
    if (candidate > longest) { longest = candidate; end = code; }
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
  return { chain, set: new Set(chain), edgeSet, hasCycle: false };
}
