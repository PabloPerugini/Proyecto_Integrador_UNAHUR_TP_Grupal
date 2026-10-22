import type { GraphNode } from '../types';

/**
 * Only academic structure belongs in the layout input. Changing progress,
 * selection or availability must not move the map.
 */
export type AcademicMapSubject = Pick<
  GraphNode,
  'code' | 'name' | 'year' | 'cuatrimestre' | 'duration'
>;

export interface AcademicMapSpacing {
  cardWidth: number;
  minCardHeight: number;
  cardGapX: number;
  cardGapY: number;
  paddingX: number;
  paddingY: number;
  headerHeight: number;
  islandGapX: number;
  islandGapY: number;
  maxGridColumns: number;
  gridAspectRatio: number;
  targetAspectRatio: number;
  stagger: number;
}

/** Shared with the card CSS/renderer; all distances are canvas pixels. */
export const ACADEMIC_MAP_LAYOUT: Readonly<AcademicMapSpacing> = {
  cardWidth: 210,
  minCardHeight: 88,
  cardGapX: 40,
  cardGapY: 48,
  paddingX: 40,
  paddingY: 32,
  headerHeight: 56,
  islandGapX: 100,
  islandGapY: 108,
  maxGridColumns: 3,
  gridAspectRatio: 1.6,
  targetAspectRatio: 1.35,
  stagger: 56,
};

export interface AcademicMapSize {
  width: number;
  height: number;
}

export type AcademicMapMeasurements =
  | ReadonlyMap<string, AcademicMapSize>
  | Readonly<Record<string, AcademicMapSize>>;

export interface AcademicMapBounds extends AcademicMapSize {
  x: number;
  y: number;
}

export type AcademicMapGroupKind = 'period' | 'annual' | 'unassigned';

export interface AcademicMapGroup extends AcademicMapBounds {
  id: string;
  year: number | null;
  period: number | null;
  kind: AcademicMapGroupKind;
  title: string;
  subtitle: string;
  sequence: number;
  paletteIndex: number;
  nodeIds: string[];
}

export interface AcademicMapNode extends AcademicMapBounds {
  id: string;
  groupId: string;
}

export interface AcademicMapLayout {
  groups: AcademicMapGroup[];
  nodes: AcademicMapNode[];
  bounds: AcademicMapBounds;
}

export interface AcademicMapOptions {
  compareSubjects?: (a: AcademicMapSubject, b: AcademicMapSubject) => number;
  spacing?: Partial<AcademicMapSpacing>;
}

interface SubjectGroup {
  id: string;
  year: number | null;
  period: number | null;
  kind: AcademicMapGroupKind;
  subjects: AcademicMapSubject[];
}

interface SizedGroup {
  group: AcademicMapGroup;
  /** Coordinates relative to the island until the outer layout is applied. */
  nodes: AcademicMapNode[];
}

const nameCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

export function compareAcademicSubjects(a: AcademicMapSubject, b: AcademicMapSubject): number {
  return nameCollator.compare(a.name, b.name)
    || nameCollator.compare(a.code, b.code)
    || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
}

function positiveInteger(value: number | null | undefined): number | null {
  return value != null && Number.isInteger(value) && value > 0 ? value : null;
}

function positiveSize(value: number | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

function measurementFor(
  measurements: AcademicMapMeasurements | undefined,
  id: string,
): AcademicMapSize | undefined {
  if (!measurements) return undefined;
  return 'get' in measurements && typeof measurements.get === 'function'
    ? measurements.get(id)
    : (measurements as Readonly<Record<string, AcademicMapSize>>)[id];
}

function periodTitle(period: number): string {
  const ordinal = period === 1 || period === 3 ? `${period}.er` : `${period}.º`;
  return `${ordinal} cuatrimestre`;
}

function groupSubjects(subjects: readonly AcademicMapSubject[]): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup>();
  for (const subject of subjects) {
    const year = positiveInteger(subject.year);
    // An annual subject is never silently moved into a semester, even when a
    // source file also supplies a period. TF means "other", not necessarily annual.
    const kind = subject.duration === 'A'
      ? 'annual'
      : positiveInteger(subject.cuatrimestre) !== null ? 'period' : 'unassigned';
    const period = kind === 'period' ? positiveInteger(subject.cuatrimestre) : null;
    const id = `academic-period:${year ?? 'none'}:${kind}:${period ?? 'none'}`;
    let group = groups.get(id);
    if (!group) {
      group = { id, year, period, kind, subjects: [] };
      groups.set(id, group);
    }
    group.subjects.push(subject);
  }

  const kindOrder: Record<AcademicMapGroupKind, number> = {
    period: 0,
    annual: 1,
    unassigned: 2,
  };
  return [...groups.values()].sort((a, b) =>
    ((a.year ?? Infinity) - (b.year ?? Infinity))
    || kindOrder[a.kind] - kindOrder[b.kind]
    || (a.period ?? 0) - (b.period ?? 0));
}

/**
 * Conservative first render estimate. React Flow's measured dimensions replace
 * it afterwards. Word wrapping includes long codes/words and explicit newlines.
 */
function estimateCardHeight(name: string, width: number, spacing: AcademicMapSpacing): number {
  const charactersPerLine = Math.max(1, Math.floor((width - 40) / 7.5));
  let lineCount = 0;
  for (const paragraph of name.split(/\r?\n/)) {
    let lineLength = 0;
    lineCount += 1;
    for (const word of paragraph.trim().split(/\s+/)) {
      if (!word) continue;
      if (lineLength && lineLength + 1 + word.length > charactersPerLine) {
        lineCount += 1;
        lineLength = 0;
      }
      const totalLength = lineLength + (lineLength ? 1 : 0) + word.length;
      lineCount += Math.floor((totalLength - 1) / charactersPerLine);
      lineLength = ((totalLength - 1) % charactersPerLine) + 1;
    }
  }
  return Math.max(spacing.minCardHeight, lineCount * 19 + 56);
}

function sizeGroup(
  input: SubjectGroup,
  sequence: number,
  cardWidth: number,
  measurements: AcademicMapMeasurements | undefined,
  spacing: AcademicMapSpacing,
  compareSubjects: NonNullable<AcademicMapOptions['compareSubjects']>,
): SizedGroup {
  const subjects = [...input.subjects].sort((a, b) =>
    compareSubjects(a, b) || compareAcademicSubjects(a, b));
  const heights = subjects.map(subject => {
    const height = measurementFor(measurements, subject.code)?.height;
    return positiveSize(height)
      ? Math.max(spacing.minCardHeight, height)
      : estimateCardHeight(subject.name, cardWidth, spacing);
  });
  let best = { columns: 1, width: 0, height: 0, rowHeights: [] as number[], score: Infinity };
  const maxColumns = Math.min(subjects.length, Math.max(1, Math.floor(spacing.maxGridColumns)));
  for (let columns = 1; columns <= maxColumns; columns += 1) {
    const rowHeights: number[] = [];
    heights.forEach((height, index) => {
      const row = Math.floor(index / columns);
      rowHeights[row] = Math.max(rowHeights[row] ?? 0, height);
    });
    const width = spacing.paddingX * 2 + cardWidth * columns + spacing.cardGapX * (columns - 1);
    const height = spacing.paddingY * 2 + spacing.headerHeight
      + rowHeights.reduce((total, rowHeight) => total + rowHeight, 0)
      + spacing.cardGapY * (rowHeights.length - 1);
    const emptyFraction = (columns * rowHeights.length - subjects.length)
      / (columns * rowHeights.length);
    const score = Math.abs(Math.log((width / height) / spacing.gridAspectRatio))
      + emptyFraction * 0.35;
    if (score < best.score) best = { columns, width, height, rowHeights, score };
  }

  const nodes: AcademicMapNode[] = [];
  let y = spacing.paddingY + spacing.headerHeight;
  best.rowHeights.forEach((rowHeight, row) => {
    const countInRow = Math.min(best.columns, subjects.length - row * best.columns);
    // Center an incomplete final row without introducing oversized empty cells.
    const startX = spacing.paddingX
      + (best.columns - countInRow) * (cardWidth + spacing.cardGapX) / 2;
    for (let column = 0; column < countInRow; column += 1) {
      const index = row * best.columns + column;
      nodes.push({
        id: subjects[index].code,
        groupId: input.id,
        x: startX + column * (cardWidth + spacing.cardGapX),
        y: y + (rowHeight - heights[index]) / 2,
        width: cardWidth,
        height: heights[index],
      });
    }
    y += rowHeight + spacing.cardGapY;
  });

  return {
    group: {
      id: input.id,
      year: input.year,
      period: input.period,
      kind: input.kind,
      title: input.kind === 'annual' ? 'Materias anuales'
        : input.kind === 'unassigned' ? 'Sin asignar' : periodTitle(input.period!),
      subtitle: input.year === null ? 'Sin año asignado' : `Año ${input.year}`,
      sequence,
      paletteIndex: (sequence - 1) % 5,
      nodeIds: subjects.map(subject => subject.code),
      x: 0,
      y: 0,
      width: best.width,
      height: best.height,
    },
    nodes,
  };
}

/**
 * Partition consecutive academic periods into balanced shelves. Minimizing
 * leftover width across every row avoids a needlessly sparse final row.
 */
function buildRows(groups: readonly SizedGroup[], maxWidth: number, gap: number): SizedGroup[][] {
  const costs = Array<number>(groups.length + 1).fill(Infinity);
  const next = Array<number>(groups.length).fill(0);
  costs[groups.length] = 0;
  for (let start = groups.length - 1; start >= 0; start -= 1) {
    let width = 0;
    for (let end = start; end < groups.length; end += 1) {
      width += groups[end].group.width + (end === start ? 0 : gap);
      if (width > maxWidth && end !== start) break;
      const unusedFraction = Math.max(0, (maxWidth - width) / maxWidth);
      const cost = 1 + unusedFraction * unusedFraction * 0.45 + costs[end + 1];
      if (cost < costs[start]) {
        costs[start] = cost;
        next[start] = end + 1;
      }
    }
  }
  const rows: SizedGroup[][] = [];
  for (let start = 0; start < groups.length; start = next[start]) {
    rows.push(groups.slice(start, next[start]));
  }
  return rows;
}

/**
 * Deterministic academic islands, independent of React Flow and academic state.
 * Output node coordinates are absolute: grouping is visual, so connections can
 * freely cross island boundaries without parentId/extent constraints.
 */
export function layoutAcademicMap(
  subjects: readonly AcademicMapSubject[],
  measurements?: AcademicMapMeasurements,
  options: AcademicMapOptions = {},
): AcademicMapLayout {
  if (!subjects.length) {
    return { groups: [], nodes: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };
  }
  const spacing = { ...ACADEMIC_MAP_LAYOUT, ...options.spacing };
  const cardWidth = subjects.reduce((width, subject) => {
    const measuredWidth = measurementFor(measurements, subject.code)?.width;
    return positiveSize(measuredWidth) ? Math.max(width, measuredWidth) : width;
  }, spacing.cardWidth);
  const sizedGroups = groupSubjects(subjects).map((group, index) =>
    sizeGroup(group, index + 1, cardWidth, measurements, spacing,
      options.compareSubjects ?? compareAcademicSubjects));

  const totalArea = sizedGroups.reduce((area, { group }) => area
    + (group.width + spacing.islandGapX) * (group.height + spacing.islandGapY), 0);
  const widestIsland = Math.max(...sizedGroups.map(({ group }) => group.width));
  // The small packing allowance prevents nearly fitting pairs from becoming a
  // long single column. Larger plans naturally gain more islands per row.
  const targetWidth = Math.max(widestIsland, Math.sqrt(totalArea * spacing.targetAspectRatio) * 1.12);
  const rows = buildRows(sizedGroups, targetWidth, spacing.islandGapX);
  const rowWidths = rows.map(row => row.reduce((width, { group }) => width + group.width, 0)
    + spacing.islandGapX * (row.length - 1));
  const widestRow = Math.max(...rowWidths);

  const groups: AcademicMapGroup[] = [];
  const nodes: AcademicMapNode[] = [];
  let rowY = 0;
  rows.forEach((row, rowIndex) => {
    const reversed = rowIndex % 2 === 1;
    const rowX = (widestRow - rowWidths[rowIndex]) / 2;
    let cursorX = reversed ? rowX + rowWidths[rowIndex] : rowX;
    let rowHeight = 0;
    row.forEach(({ group, nodes: groupNodes }, columnIndex) => {
      const offsetY = (columnIndex + rowIndex) % 2 === 1 ? spacing.stagger : 0;
      const x = reversed ? cursorX - group.width : cursorX;
      const y = rowY + offsetY;
      groups.push({ ...group, x, y });
      nodes.push(...groupNodes.map(node => ({ ...node, x: node.x + x, y: node.y + y })));
      cursorX += (reversed ? -1 : 1) * (group.width + spacing.islandGapX);
      rowHeight = Math.max(rowHeight, offsetY + group.height);
    });
    rowY += rowHeight + spacing.islandGapY;
  });

  return {
    groups,
    nodes,
    bounds: {
      x: 0,
      y: 0,
      width: widestRow,
      height: rowY - spacing.islandGapY,
    },
  };
}
