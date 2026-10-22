/** Absolute card bounds; decorative period islands are deliberately not obstacles. */
export interface RoutingNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoutingEdge {
  id: string;
  source: string;
  target: string;
}

export type RoutingSide = 'left' | 'right' | 'top' | 'bottom';
export interface RoutingPoint { x: number; y: number }
export interface AcademicEdgeRoute {
  points: RoutingPoint[];
  sourceSide: RoutingSide;
  targetSide: RoutingSide;
  path: string;
}

export interface RoutingOptions {
  cardClearance: number;
  laneGap: number;
  outerMargin: number;
  bendPenalty: number;
  crossingPenalty: number;
  overlapPenalty: number;
}

/** Distances are in graph coordinates, before React Flow applies zoom. */
export const ROUTING_OPTIONS: Readonly<RoutingOptions> = {
  cardClearance: 12,
  laneGap: 24,
  outerMargin: 48,
  bendPenalty: 22,
  crossingPenalty: 34,
  overlapPenalty: 0.7,
};

interface Rectangle { left: number; right: number; top: number; bottom: number }
interface Port { side: RoutingSide; anchor: RoutingPoint; stub: RoutingPoint; axis: number }
interface Segment { a: RoutingPoint; b: RoutingPoint }
interface Candidate { points: RoutingPoint[]; source: Port; target: Port; score: number }
interface Grid {
  xs: number[];
  ys: number[];
  xIndices: Map<number, number>;
  yIndices: Map<number, number>;
  horizontalBlocked: Uint8Array;
  verticalBlocked: Uint8Array;
}

const EPSILON = 0.0001;
const SIDES: readonly RoutingSide[] = ['right', 'bottom', 'left', 'top'];
const distance = (a: RoutingPoint, b: RoutingPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const samePoint = (a: RoutingPoint, b: RoutingPoint) => distance(a, b) < EPSILON;
const axis = (a: RoutingPoint, b: RoutingPoint) => Math.abs(a.y - b.y) < EPSILON ? 0 : 1;

function rectangle(node: RoutingNode, margin: number): Rectangle {
  return {
    left: node.x - margin, right: node.x + node.width + margin,
    top: node.y - margin, bottom: node.y + node.height + margin,
  };
}

function ports(node: RoutingNode, margin: number): Port[] {
  const x = node.x + node.width / 2;
  const y = node.y + node.height / 2;
  return SIDES.map((side) => {
    switch (side) {
      case 'right': return { side, axis: 0, anchor: { x: node.x + node.width, y }, stub: { x: node.x + node.width + margin, y } };
      case 'left': return { side, axis: 0, anchor: { x: node.x, y }, stub: { x: node.x - margin, y } };
      case 'bottom': return { side, axis: 1, anchor: { x, y: node.y + node.height }, stub: { x, y: node.y + node.height + margin } };
      case 'top': return { side, axis: 1, anchor: { x, y: node.y }, stub: { x, y: node.y - margin } };
    }
  });
}

/** Touching an obstacle's boundary is allowed; entering its interior is not. */
function intersects(a: RoutingPoint, b: RoutingPoint, box: Rectangle): boolean {
  if (axis(a, b) === 0) {
    return a.y > box.top + EPSILON && a.y < box.bottom - EPSILON
      && Math.max(a.x, b.x) > box.left + EPSILON && Math.min(a.x, b.x) < box.right - EPSILON;
  }
  return a.x > box.left + EPSILON && a.x < box.right - EPSILON
    && Math.max(a.y, b.y) > box.top + EPSILON && Math.min(a.y, b.y) < box.bottom - EPSILON;
}

function compact(points: RoutingPoint[]): RoutingPoint[] {
  const result: RoutingPoint[] = [];
  for (const point of points) {
    if (result.length && samePoint(result[result.length - 1], point)) continue;
    while (result.length > 1) {
      const a = result[result.length - 2];
      const b = result[result.length - 1];
      // Only remove a point between its neighbours: preserve deliberate reversals.
      if (axis(a, b) !== axis(b, point) || distance(a, point) + EPSILON < distance(a, b) + distance(b, point)) break;
      result.pop();
    }
    result.push(point);
  }
  return result;
}

function trafficCost(a: RoutingPoint, b: RoutingPoint, used: readonly Segment[], options: RoutingOptions): number {
  let cost = 0;
  const horizontal = axis(a, b) === 0;
  for (const segment of used) {
    const otherHorizontal = axis(segment.a, segment.b) === 0;
    if (horizontal === otherHorizontal) {
      const alignment = horizontal ? Math.abs(a.y - segment.a.y) : Math.abs(a.x - segment.a.x);
      if (alignment > EPSILON) continue;
      const [a0, a1, b0, b1] = horizontal
        ? [a.x, b.x, segment.a.x, segment.b.x]
        : [a.y, b.y, segment.a.y, segment.b.y];
      const overlap = Math.min(Math.max(a0, a1), Math.max(b0, b1)) - Math.max(Math.min(a0, a1), Math.min(b0, b1));
      if (overlap > 0) cost += overlap * options.overlapPenalty;
    } else {
      const h = horizontal ? { a, b } : segment;
      const v = horizontal ? segment : { a, b };
      if (v.a.x > Math.min(h.a.x, h.b.x) + EPSILON && v.a.x < Math.max(h.a.x, h.b.x) - EPSILON
        && h.a.y > Math.min(v.a.y, v.b.y) + EPSILON && h.a.y < Math.max(v.a.y, v.b.y) - EPSILON) {
        cost += options.crossingPenalty;
      }
    }
  }
  return cost;
}

function routeScore(points: RoutingPoint[], used: readonly Segment[], options: RoutingOptions, upperBound = Infinity): number {
  let score = Math.max(0, points.length - 2) * options.bendPenalty;
  for (let i = 1; i < points.length; i++) {
    score += distance(points[i - 1], points[i]);
  }
  // Traffic penalties are nonnegative. Do not compare every previous route
  // when this candidate is already longer than the best complete solution.
  for (let i = 1; i < points.length && score < upperBound; i++) {
    score += trafficCost(points[i - 1], points[i], used, options);
  }
  return score;
}

function candidateRoute(
  sources: Port[], targets: Port[], obstacles: Rectangle[], used: readonly Segment[],
  options: RoutingOptions, self: boolean,
): Candidate | undefined {
  let best: Candidate | undefined;
  for (const source of sources) {
    for (const target of targets) {
      if (self && source.side === target.side) continue;
      const a = source.stub;
      const b = target.stub;
      const middleX = (a.x + b.x) / 2;
      const middleY = (a.y + b.y) / 2;
      const candidates: RoutingPoint[][] = [
        [a, { x: b.x, y: a.y }, b],
        [a, { x: a.x, y: b.y }, b],
        [a, { x: middleX, y: a.y }, { x: middleX, y: b.y }, b],
        [a, { x: a.x, y: middleY }, { x: b.x, y: middleY }, b],
      ];
      for (const x of [Math.min(a.x, b.x) - options.laneGap, Math.max(a.x, b.x) + options.laneGap]) {
        candidates.push([a, { x, y: a.y }, { x, y: b.y }, b]);
      }
      for (const y of [Math.min(a.y, b.y) - options.laneGap, Math.max(a.y, b.y) + options.laneGap]) {
        candidates.push([a, { x: a.x, y }, { x: b.x, y }, b]);
      }
      for (const middle of candidates) {
        if (middle.some((point, i) => i > 0 && !samePoint(middle[i - 1], point)
          && obstacles.some((box) => intersects(middle[i - 1], point, box)))) continue;
        const points = compact([source.anchor, ...middle, target.anchor]);
        const score = routeScore(points, used, options, best?.score);
        if (!best || score < best.score - EPSILON) best = { source, target, points, score };
      }
    }
  }
  return best;
}

/**
 * A compressed visibility grid uses card boundaries and port centre lines.
 * Rectangle range additions mark all blocked segments in O(cards + grid area),
 * so a route search never has to test every card for every visited point.
 */
function buildGrid(nodes: readonly RoutingNode[], margin: number, outerMargin: number): Grid {
  const boxes = nodes.map((node) => rectangle(node, margin));
  const xValues = boxes.flatMap((box) => [box.left, box.right, (box.left + box.right) / 2]);
  const yValues = boxes.flatMap((box) => [box.top, box.bottom, (box.top + box.bottom) / 2]);
  xValues.push(Math.min(...xValues) - outerMargin, Math.max(...xValues) + outerMargin);
  yValues.push(Math.min(...yValues) - outerMargin, Math.max(...yValues) + outerMargin);
  // Use the exact arithmetic of ports as keys (measured card dimensions may be fractional).
  for (const node of nodes) {
    xValues.push(node.x + node.width / 2);
    yValues.push(node.y + node.height / 2);
  }
  const xs = [...new Set(xValues)].sort((a, b) => a - b);
  const ys = [...new Set(yValues)].sort((a, b) => a - b);
  const xIndices = new Map(xs.map((x, index) => [x, index]));
  const yIndices = new Map(ys.map((y, index) => [y, index]));
  const width = xs.length;
  const height = ys.length;
  const horizontal = new Int32Array((width + 1) * (height + 1));
  const vertical = new Int32Array(horizontal.length);
  const stride = width + 1;
  const add = (field: Int32Array, left: number, top: number, right: number, bottom: number) => {
    if (left >= right || top >= bottom) return;
    field[top * stride + left]++;
    field[top * stride + right]--;
    field[bottom * stride + left]--;
    field[bottom * stride + right]++;
  };
  for (const box of boxes) {
    const left = xIndices.get(box.left)!;
    const right = xIndices.get(box.right)!;
    const top = yIndices.get(box.top)!;
    const bottom = yIndices.get(box.bottom)!;
    add(horizontal, left, top + 1, right, bottom);
    add(vertical, left + 1, top, right, bottom);
  }
  const resolve = (field: Int32Array) => {
    const blocked = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      let row = 0;
      for (let x = 0; x < width; x++) {
        const index = y * stride + x;
        row += field[index];
        field[index] = row + (y ? field[index - stride] : 0);
        blocked[y * width + x] = Number(field[index] > 0);
      }
    }
    return blocked;
  };
  return { xs, ys, xIndices, yIndices, horizontalBlocked: resolve(horizontal), verticalBlocked: resolve(vertical) };
}

interface QueueEntry { state: number; score: number; cost: number }
class MinQueue {
  private items: QueueEntry[] = [];
  get length() { return this.items.length; }
  push(entry: QueueEntry) {
    const items = this.items;
    let index = items.length;
    items.push(entry);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (items[parent].score <= entry.score) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = entry;
  }
  pop(): QueueEntry {
    const first = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length) {
      let index = 0;
      while (index * 2 + 1 < this.items.length) {
        let child = index * 2 + 1;
        if (child + 1 < this.items.length && this.items[child + 1].score < this.items[child].score) child++;
        if (this.items[child].score >= last.score) break;
        this.items[index] = this.items[child];
        index = child;
      }
      this.items[index] = last;
    }
    return first;
  }
}

function gridRoute(
  grid: Grid, sources: Port[], targets: Port[], used: readonly Segment[], options: RoutingOptions,
): Candidate | undefined {
  const { xs, ys } = grid;
  const width = xs.length;
  const vertex = (point: RoutingPoint) => grid.yIndices.get(point.y)! * width + grid.xIndices.get(point.x)!;
  const point = (index: number): RoutingPoint => ({ x: xs[index % width], y: ys[Math.floor(index / width)] });
  const costs = new Float64Array(width * ys.length * 2).fill(Infinity);
  const parents = new Int32Array(costs.length).fill(-1);
  const origins = new Uint8Array(costs.length);
  const targetsByVertex = new Map<number, Port[]>();
  for (const target of targets) {
    const index = vertex(target.stub);
    targetsByVertex.set(index, [...(targetsByVertex.get(index) ?? []), target]);
  }
  const heuristic = (position: RoutingPoint) => Math.min(...targets.map((target) => distance(position, target.anchor)));
  const queue = new MinQueue();
  sources.forEach((source, index) => {
    const state = vertex(source.stub) * 2 + source.axis;
    const cost = distance(source.anchor, source.stub);
    if (cost >= costs[state]) return;
    costs[state] = cost;
    origins[state] = index;
    queue.push({ state, cost, score: cost + heuristic(source.stub) });
  });
  let best: { state: number; target: Port; score: number } | undefined;
  while (queue.length) {
    const current = queue.pop();
    if (current.cost !== costs[current.state]) continue;
    if (best && current.score >= best.score) break;
    const index = current.state >> 1;
    const incomingAxis = current.state % 2;
    const here = point(index);
    for (const target of targetsByVertex.get(index) ?? []) {
      const score = current.cost + distance(here, target.anchor)
        + (incomingAxis === target.axis ? 0 : options.bendPenalty);
      if (!best || score < best.score) best = { state: current.state, target, score };
    }
    const x = index % width;
    const y = Math.floor(index / width);
    const neighbours: [number, number, boolean][] = [
      [index + 1, 0, x < width - 1 && !grid.horizontalBlocked[index]],
      [index + width, 1, y < ys.length - 1 && !grid.verticalBlocked[index]],
      [index - 1, 0, x > 0 && !grid.horizontalBlocked[index - 1]],
      [index - width, 1, y > 0 && !grid.verticalBlocked[index - width]],
    ];
    for (const [next, nextAxis, allowed] of neighbours) {
      if (!allowed) continue;
      const destination = point(next);
      const nextState = next * 2 + nextAxis;
      const cost = current.cost + distance(here, destination)
        + (incomingAxis === nextAxis ? 0 : options.bendPenalty)
        + trafficCost(here, destination, used, options);
      if (cost >= costs[nextState] - EPSILON) continue;
      costs[nextState] = cost;
      parents[nextState] = current.state;
      origins[nextState] = origins[current.state];
      queue.push({ state: nextState, cost, score: cost + heuristic(destination) });
    }
  }
  if (!best) return undefined;
  const source = sources[origins[best.state]];
  const middle: RoutingPoint[] = [];
  for (let state = best.state; state !== -1; state = parents[state]) middle.push(point(state >> 1));
  middle.reverse();
  return {
    source, target: best.target, score: best.score,
    points: compact([source.anchor, ...middle, best.target.anchor]),
  };
}

function availablePorts(node: RoutingNode, nodes: readonly RoutingNode[], margin: number): Port[] {
  const otherBoxes = nodes.filter((other) => other.id !== node.id).map((other) => rectangle(other, margin));
  return ports(node, margin).filter((port) => !otherBoxes.some((box) => intersects(port.anchor, port.stub, box)));
}

/**
 * Route only real subject edges, with direction preserved. Short edges reserve
 * lanes first; ties use IDs, so neither API order nor academic status changes
 * the result. Missing endpoints cannot be routed and are omitted from the map.
 */
export function routeAcademicMapEdges(
  nodes: readonly RoutingNode[], edges: readonly RoutingEdge[], overrides: Partial<RoutingOptions> = {},
): Map<string, AcademicEdgeRoute> {
  const options = { ...ROUTING_OPTIONS, ...overrides };
  const result = new Map<string, AcademicEdgeRoute>();
  if (!nodes.length || !edges.length) return result;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const validEdges = edges.filter((edge) => byId.has(edge.source) && byId.has(edge.target));
  const edgeLength = (edge: RoutingEdge) => distance(byId.get(edge.source)!, byId.get(edge.target)!);
  validEdges.sort((a, b) => edgeLength(a) - edgeLength(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const used: Segment[] = [];
  const grids = new Map<number, Grid>();
  for (const edge of validEdges) {
    const sourceNode = byId.get(edge.source)!;
    const targetNode = byId.get(edge.target)!;
    let route: Candidate | undefined;
    // A smaller clearance is a fallback for very tightly packed imported layouts.
    for (const clearance of [...new Set([Math.max(0, options.cardClearance), 0])]) {
      const obstacles = nodes.map((node) => rectangle(node, clearance));
      const sources = availablePorts(sourceNode, nodes, clearance);
      const targets = availablePorts(targetNode, nodes, clearance);
      route = candidateRoute(sources, targets, obstacles, used, options, edge.source === edge.target);
      if (!route && sources.length && targets.length) {
        if (!grids.has(clearance)) grids.set(clearance, buildGrid(nodes, clearance, options.outerMargin));
        route = gridRoute(grids.get(clearance)!, sources, targets, used, options);
      }
      if (route) break;
    }
    // Overlapping input cards can make obstacle-free routing impossible. Still
    // preserve the relationship visually rather than silently dropping an edge.
    if (!route) {
      const source = ports(sourceNode, 0)[0];
      const target = ports(targetNode, 0)[2];
      route = {
        source, target, score: Infinity,
        points: compact([source.anchor, { x: target.anchor.x, y: source.anchor.y }, target.anchor]),
      };
    }
    for (let i = 1; i < route.points.length; i++) used.push({ a: route.points[i - 1], b: route.points[i] });
    result.set(edge.id, {
      points: route.points,
      sourceSide: route.source.side,
      targetSide: route.target.side,
      path: route.points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '),
    });
  }
  return result;
}
