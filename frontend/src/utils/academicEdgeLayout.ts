import type { ElkNode, ElkPoint, ELK } from 'elkjs/lib/elk-api';

export interface AcademicLayoutNode {
  id: string;
  position: ElkPoint;
  width: number;
  height: number;
  subject: boolean;
  isYear: boolean;
}

export interface AcademicLayout {
  positions: Record<string, ElkPoint>;
  yearWidths: Record<string, number>;
  routes: Record<string, ElkPoint[][]>;
}

export const EDGE_LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.partitioning.activate': 'true',
  'elk.separateConnectedComponents': 'false',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.nodePlacement.strategy': 'INTERACTIVE',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.spacing.nodeNodeBetweenLayers': '110',
  'elk.layered.spacing.edgeNodeBetweenLayers': '24',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '14',
  'elk.spacing.edgeNode': '24',
  'elk.spacing.edgeEdge': '14',
  'elk.spacing.nodeNode': '40',
  'elk.padding': '[top=70,left=30,bottom=30,right=30]',
  'elk.randomSeed': '1',
};

/** Columns are routing obstacles, not new academic nodes. Fixed ports preserve
 * every subject's column and keep long edges outside intervening cards. */
export async function layoutAcademicEdges(
  nodes: readonly AcademicLayoutNode[],
  edges: readonly { id: string; source: string; target: string }[],
  elk: Pick<ELK, 'layout'>,
): Promise<AcademicLayout> {
  const result: AcademicLayout = { positions: {}, yearWidths: {}, routes: {} };
  const columnXs = [...new Set(nodes.filter(n => !n.isYear).map(n => n.position.x))].sort((a, b) => a - b);
  if (!columnXs.length) return result;
  const localPositions = new Map<string, ElkPoint>();
  const portIds = new Map<string, { input: string; output: string }>();
  const children: ElkNode[] = columnXs.map((x, index) => {
    const members = nodes.filter(n => !n.isYear && n.position.x === x).sort((a, b) => a.position.y - b.position.y);
    const width = Math.max(...members.map(n => n.width), 170);
    const top = Math.min(...members.map(n => n.position.y));
    let bottom = 0;
    const ports: NonNullable<ElkNode['ports']> = [];
    for (const [i, member] of members.entries()) {
      const y = Math.max(member.position.y - top, bottom);
      localPositions.set(member.id, { x: 0, y });
      bottom = y + member.height + (member.subject ? 32 : 16);
      if (!member.subject) continue;
      const ids = { input: `port-${index}-${i}-in`, output: `port-${index}-${i}-out` };
      portIds.set(member.id, ids);
      ports.push(
        { id: ids.input, x: 0, y: y + member.height / 2, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'WEST' } },
        { id: ids.output, x: width, y: y + member.height / 2, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'EAST' } },
      );
    }
    ports.push(
      { id: `guide-${index}-in`, x: 0, y: 0, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'WEST' } },
      { id: `guide-${index}-out`, x: width, y: 0, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'EAST' } },
    );
    return {
      id: `column-${index}`, x, y: 0, width, height: bottom,
      layoutOptions: { 'elk.portConstraints': 'FIXED_POS', 'elk.partitioning.partition': String(index) },
      ports,
    };
  });
  const graph: ElkNode = {
    id: 'academic-layout', layoutOptions: EDGE_LAYOUT_OPTIONS,
    // Interactive placement preserves the shared top without padding short
    // columns to the tallest one: ELK can route through the empty space below.
    children,
    edges: [
      // Layout-only guides preserve empty columns and the academic sequence.
      ...columnXs.slice(1).map((_, i) => ({ id: `guide-edge-${i}`, sources: [`guide-${i}-out`], targets: [`guide-${i + 1}-in`] })),
      ...edges.map((edge, i) => {
        const source = portIds.get(edge.source);
        const target = portIds.get(edge.target);
        if (!source || !target) throw new Error(`Correlatividad sin materia: ${edge.id}`);
        return { id: `relation-${i}`, sources: [source.output], targets: [target.input] };
      }),
    ],
  };
  const laidOut = await elk.layout(graph);
  const columns = columnXs.map((_, i) => laidOut.children!.find(n => n.id === `column-${i}`)!);
  // Never silently accept a layout that changes the academic column order.
  if (columns.some((column, i) => i > 0 && column.x! <= columns[i - 1].x!)) {
    throw new Error('ELK no conservó el orden de las columnas académicas');
  }
  for (const node of nodes) {
    const index = columnXs.indexOf(node.position.x);
    const column = columns[index];
    if (!column) continue;
    if (node.isYear) {
      const next = columns[index + 1] ?? column;
      result.positions[node.id] = { x: column.x!, y: Math.min(column.y!, next.y!) - 50 };
      result.yearWidths[node.id] = next.x! + next.width! - column.x!;
    } else {
      const local = localPositions.get(node.id)!;
      result.positions[node.id] = { x: column.x! + local.x, y: column.y! + local.y };
    }
  }
  for (const [i, edge] of edges.entries()) {
    const sections = laidOut.edges?.find(e => e.id === `relation-${i}`)?.sections;
    if (!sections?.length) throw new Error(`ELK no devolvió una ruta para ${edge.id}`);
    result.routes[edge.id] = sections.map(s => [s.startPoint, ...(s.bendPoints ?? []), s.endPoint]);
  }
  return result;
}

/** Round only corners; the straight segments remain horizontal/vertical. */
export function roundedOrthogonalPath(points: readonly ElkPoint[], radius = 6): string {
  const clean = points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y);
  if (!clean.length) return '';
  let path = `M ${clean[0].x} ${clean[0].y}`;
  for (let i = 1; i < clean.length - 1; i++) {
    const prev = clean[i - 1], point = clean[i], next = clean[i + 1];
    const incoming = Math.hypot(point.x - prev.x, point.y - prev.y);
    const outgoing = Math.hypot(next.x - point.x, next.y - point.y);
    const r = Math.min(radius, incoming / 2, outgoing / 2);
    if ((prev.x === point.x && point.x === next.x) || (prev.y === point.y && point.y === next.y)) {
      path += ` L ${point.x} ${point.y}`;
    } else {
      const before = { x: point.x + (prev.x - point.x) * r / incoming, y: point.y + (prev.y - point.y) * r / incoming };
      const after = { x: point.x + (next.x - point.x) * r / outgoing, y: point.y + (next.y - point.y) * r / outgoing };
      path += ` L ${before.x} ${before.y} Q ${point.x} ${point.y} ${after.x} ${after.y}`;
    }
  }
  if (clean.length > 1) path += ` L ${clean.at(-1)!.x} ${clean.at(-1)!.y}`;
  return path;
}
