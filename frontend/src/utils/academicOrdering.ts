export interface CrossingSubject {
  code: string;
}

export interface CrossingEdge {
  source: string;
  target: string;
}

interface Position {
  column: number;
  row: number;
}

function indexPositions(
  columns: readonly (readonly CrossingSubject[])[],
): Map<string, Position> {
  const positions = new Map<string, Position>();
  columns.forEach((column, columnIndex) => {
    column.forEach((subject, row) => {
      if (!positions.has(subject.code)) {
        positions.set(subject.code, { column: columnIndex, row });
      }
    });
  });
  return positions;
}

function orientation(a: Position, b: Position, c: Position): number {
  return (
    (b.column - a.column) * (c.row - a.row) -
    (b.row - a.row) * (c.column - a.column)
  );
}

function segmentsCross(a: Position, b: Position, c: Position, d: Position): boolean {
  const firstSide = orientation(c, d, a);
  const secondSide = orientation(c, d, b);
  const thirdSide = orientation(a, b, c);
  const fourthSide = orientation(a, b, d);
  return (
    ((firstSide > 0 && secondSide < 0) || (firstSide < 0 && secondSide > 0)) &&
    ((thirdSide > 0 && fourthSide < 0) || (thirdSide < 0 && fourthSide > 0))
  );
}

/**
 * Counts proper crossings between straight relationships in a layered drawing.
 * Relationships that share a subject meet at their endpoint, which is not a
 * crossing. The count is a comparative metric for orderings, not a prediction
 * of the exact orthogonal route ELK will draw.
 */
export function countCrossings(
  columns: readonly (readonly CrossingSubject[])[],
  edges: readonly CrossingEdge[],
): number {
  const positions = indexPositions(columns);
  const segments: {
    source: string;
    target: string;
    from: Position;
    to: Position;
  }[] = [];
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    const from = positions.get(edge.source);
    const to = positions.get(edge.target);
    if (!from || !to) continue;
    segments.push({ source: edge.source, target: edge.target, from, to });
  }

  let crossings = 0;
  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const first = segments[i];
      const second = segments[j];
      if (
        first.source === second.source ||
        first.source === second.target ||
        first.target === second.source ||
        first.target === second.target
      ) {
        continue;
      }
      if (segmentsCross(first.from, first.to, second.from, second.to)) {
        crossings += 1;
      }
    }
  }
  return crossings;
}

function buildAdjacency(edges: readonly CrossingEdge[]) {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  const append = (map: Map<string, string[]>, key: string, value: string) => {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    append(outgoing, edge.source, edge.target);
    append(incoming, edge.target, edge.source);
  }
  return { incoming, outgoing };
}

function sweep<T extends CrossingSubject>(
  columns: readonly (readonly T[])[],
  edges: readonly CrossingEdge[],
  direction: 'left' | 'right',
): T[][] {
  const positions = indexPositions(columns);
  const { incoming, outgoing } = buildAdjacency(edges);
  const result = columns.map(column => column.slice());
  const columnOrder = columns.map((_, index) => index);
  if (direction === 'right') columnOrder.reverse();

  for (const columnIndex of columnOrder) {
    const ranked = result[columnIndex].map((subject, row) => {
      const neighbors = direction === 'left'
        ? incoming.get(subject.code) ?? []
        : outgoing.get(subject.code) ?? [];
      const rows = neighbors
        .map(code => positions.get(code))
        .filter((position): position is Position =>
          position != null &&
          (direction === 'left'
            ? position.column < columnIndex
            : position.column > columnIndex))
        .map(position => position.row);
      const barycenter = rows.length
        ? rows.reduce((sum, neighborRow) => sum + neighborRow, 0) / rows.length
        : row;
      return { subject, row, barycenter };
    });

    ranked.sort((a, b) =>
      a.barycenter - b.barycenter ||
      a.row - b.row ||
      (a.subject.code < b.subject.code ? -1 : a.subject.code > b.subject.code ? 1 : 0));

    result[columnIndex] = ranked.map(entry => entry.subject);
    result[columnIndex].forEach((subject, row) => {
      positions.set(subject.code, { column: columnIndex, row });
    });
  }
  return result;
}

function transpose<T extends CrossingSubject>(
  columns: T[][],
  edges: readonly CrossingEdge[],
  crossings: number,
): T[][] {
  let best = columns;
  let bestCrossings = crossings;
  for (let pass = 0; pass < 4; pass += 1) {
    let improved = false;
    for (let columnIndex = 0; columnIndex < best.length; columnIndex += 1) {
      for (let row = 0; row + 1 < best[columnIndex].length; row += 1) {
        const candidate = best.map((column, index) => {
          if (index !== columnIndex) return column;
          const swapped = column.slice();
          [swapped[row], swapped[row + 1]] = [swapped[row + 1], swapped[row]];
          return swapped;
        });
        const candidateCrossings = countCrossings(candidate, edges);
        if (candidateCrossings < bestCrossings) {
          best = candidate;
          bestCrossings = candidateCrossings;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return best;
}

/**
 * Reorders subjects inside each academic column without moving them between
 * columns. Uses barycenter sweeps (Sugiyama) plus adjacent transpositions, the
 * same family of heuristics ELK applies when it is allowed to reorder layers.
 */
export function orderColumnsForCrossings<T extends CrossingSubject>(
  columns: readonly (readonly T[])[],
  edges: readonly CrossingEdge[],
): T[][] {
  const base = columns.map(column => column.slice());
  if (base.length < 2 || edges.length === 0) return base;

  const present = new Set(base.flat().map(subject => subject.code));
  const relevantEdges = edges.filter(edge =>
    edge.source !== edge.target &&
    present.has(edge.source) &&
    present.has(edge.target));
  if (!relevantEdges.length) return base;

  let best = base;
  let bestCrossings = countCrossings(best, relevantEdges);
  let current = base;
  for (let pass = 0; pass < 6; pass += 1) {
    current = sweep(current, relevantEdges, pass % 2 === 0 ? 'left' : 'right');
    const crossings = countCrossings(current, relevantEdges);
    if (crossings < bestCrossings) {
      best = current;
      bestCrossings = crossings;
    }
    if (bestCrossings === 0) break;
  }
  if (bestCrossings === 0) return best;
  return transpose(best, relevantEdges, bestCrossings);
}
