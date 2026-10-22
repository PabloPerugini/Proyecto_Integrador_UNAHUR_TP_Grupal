import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BaseEdge,
  Controls,
  MarkerType,
  ReactFlow,
  ViewportPortal,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import type { GraphData } from '../types';
import {
  ACADEMIC_MAP_LAYOUT,
  layoutAcademicMap,
  type AcademicMapSubject,
} from '../utils/academicMapLayout';
import { routeAcademicMapEdges } from '../utils/academicMapRouting';
import './AcademicMap.css';

interface AcademicMapCanvasProps {
  subjects: GraphData['nodes'];
  nodes: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  onNodeClick: NodeMouseHandler;
}

type Dimensions = { width: number; height: number };
type Point = { x: number; y: number };
type RoutedEdge = Edge<{ path: string }>;
const EMPTY_POSITIONS = new Map<string, Point>();

// These inert nodes give fitView the complete island bounds, including its title.
// Subjects deliberately have no parentId: connections remain ordinary node-to-node edges.
function AcademicIsland({ data }: NodeProps) {
  return <div className={`academic-island academic-island--${data.paletteIndex}`} aria-hidden="true" />;
}

function AcademicConnection({ id, data, markerEnd, style, interactionWidth }: EdgeProps<RoutedEdge>) {
  return (
    <BaseEdge
      id={id}
      path={data?.path ?? ''}
      markerEnd={markerEnd}
      style={style}
      interactionWidth={interactionWidth}
    />
  );
}

const edgeTypes = { academic: AcademicConnection };

export default function AcademicMapCanvas({
  subjects,
  nodes,
  edges,
  nodeTypes,
  onNodeClick,
}: AcademicMapCanvasProps) {
  const { fitView } = useReactFlow();
  const [measurements, setMeasurements] = useState(new Map<string, Dimensions>());
  const [movedNodes, setMovedNodes] = useState({ structure: '', positions: EMPTY_POSITIONS });
  const fittedStructure = useRef<string | null>(null);

  // Serialize only structural fields. Progress and selection must not trigger layout/routing.
  const structureKey = JSON.stringify(subjects.map(({ code, name, year, cuatrimestre, duration }) => ({
    code, name, year, cuatrimestre, duration,
  })).sort((a, b) => a.code.localeCompare(b.code, 'es')));
  const structure = useMemo(() => JSON.parse(structureKey) as AcademicMapSubject[], [structureKey]);
  const subjectById = useMemo(() => new Map(structure.map((n) => [n.code, n])), [structure]);
  const measuredSizes = useMemo(() => {
    const sizes = new Map<string, Dimensions>();
    for (const n of structure) {
      const size = measurements.get(`${n.code}\0${n.name}`);
      if (size) sizes.set(n.code, size);
    }
    return sizes;
  }, [structure, measurements]);
  const layout = useMemo(() => layoutAcademicMap(structure, measuredSizes), [structure, measuredSizes]);
  const positions = movedNodes.structure === structureKey ? movedNodes.positions : EMPTY_POSITIONS;
  const placedNodes = useMemo(() => layout.nodes.map((n) => ({
    ...n, ...(positions.get(n.id) ?? {}),
  })), [layout, positions]);
  const placedById = useMemo(() => new Map(placedNodes.map((n) => [n.id, n])), [placedNodes]);
  const groups = useMemo(() => layout.groups.map((group) => {
    // Keep the existing ability to drag a subject, and keep its island around it.
    const members = group.nodeIds.map((id) => placedById.get(id)!).filter(Boolean);
    const left = Math.min(group.x, ...members.map((n) => n.x - ACADEMIC_MAP_LAYOUT.paddingX));
    const top = Math.min(group.y, ...members.map((n) => n.y - ACADEMIC_MAP_LAYOUT.headerHeight - ACADEMIC_MAP_LAYOUT.paddingY));
    const right = Math.max(group.x + group.width, ...members.map((n) => n.x + n.width + ACADEMIC_MAP_LAYOUT.paddingX));
    const bottom = Math.max(group.y + group.height, ...members.map((n) => n.y + n.height + ACADEMIC_MAP_LAYOUT.paddingY));
    return { ...group, x: left, y: top, width: right - left, height: bottom - top };
  }), [layout, placedById]);

  const edgeKey = JSON.stringify(edges.map(({ id, source, target }) => ({ id, source, target }))
    .sort((a, b) => a.id.localeCompare(b.id, 'es')));
  const structuralEdges = useMemo(() => JSON.parse(edgeKey) as GraphData['edges'], [edgeKey]);
  const routes = useMemo(() => routeAcademicMapEdges(placedNodes, structuralEdges), [placedNodes, structuralEdges]);
  const canvasEdges: Edge[] = useMemo(() => edges.map((edge) => {
    const route = routes.get(edge.id);
    return {
      ...edge,
      type: 'academic',
      sourceHandle: route?.sourceSide,
      targetHandle: route?.targetSide,
      data: { path: route?.path ?? '' },
      zIndex: 0,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: typeof edge.style?.stroke === 'string' ? edge.style.stroke : '#94A3B8',
        width: 14,
        height: 14,
        markerUnits: 'userSpaceOnUse',
      },
    };
  }), [edges, routes]);

  const canvasNodeTypes = useMemo(() => ({ ...nodeTypes, academicIsland: AcademicIsland }), [nodeTypes]);
  const canvasNodes: Node[] = useMemo(() => [
    ...groups.map((group): Node => ({
      id: `__academic-island:${group.id}`,
      type: 'academicIsland',
      data: { paletteIndex: group.paletteIndex },
      position: { x: group.x, y: group.y },
      style: { width: group.width, height: group.height, pointerEvents: 'none' },
      width: group.width,
      height: group.height,
      zIndex: -2,
      draggable: false,
      selectable: false,
      connectable: false,
      focusable: false,
    })),
    ...nodes.map((node): Node => {
      const placement = placedById.get(node.id)!;
      return {
        ...node,
        position: { x: placement.x, y: placement.y },
        style: { ...node.style, width: placement.width },
        measured: measuredSizes.get(node.id),
        zIndex: 3,
      };
    }),
  ], [groups, nodes, placedById, measuredSizes]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const dimensions = changes.filter((c) => c.type === 'dimensions' && c.dimensions && subjectById.has(c.id));
    if (dimensions.length) {
      setMeasurements((previous) => {
        let next = previous;
        for (const change of dimensions) {
          if (change.type !== 'dimensions' || !change.dimensions) continue;
          const subject = subjectById.get(change.id)!;
          const key = `${change.id}\0${subject.name}`;
          const size = change.dimensions;
          const existing = previous.get(key);
          if (existing && Math.abs(existing.width - size.width) < 0.5 && Math.abs(existing.height - size.height) < 0.5) continue;
          if (next === previous) next = new Map(previous);
          next.set(key, size);
        }
        return next;
      });
    }
    const moves = changes.filter((c) => c.type === 'position' && c.position && subjectById.has(c.id));
    if (moves.length) {
      setMovedNodes((previous) => {
        const next = new Map(previous.structure === structureKey ? previous.positions : EMPTY_POSITIONS);
        for (const move of moves) {
          if (move.type === 'position' && move.position) next.set(move.id, move.position);
        }
        return { structure: structureKey, positions: next };
      });
    }
  }, [subjectById, structureKey]);

  const allMeasured = structure.length > 0 && measuredSizes.size === structure.length;
  useEffect(() => {
    if (!allMeasured || fittedStructure.current === structureKey) return;
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.12, maxZoom: 1 });
      fittedStructure.current = structureKey;
    });
    return () => cancelAnimationFrame(frame);
  }, [allMeasured, structureKey, layout, fitView]);

  return (
    <ReactFlow
      className="academic-map"
      nodes={canvasNodes}
      edges={canvasEdges}
      nodeTypes={canvasNodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
      minZoom={0.05}
      nodesDraggable
      style={{ width: '100%', height: '100%' }}
    >
      <Background gap={24} size={1} color="var(--academic-map-dot)" />
      <ViewportPortal>
        {groups.map((group) => (
          <div
            key={group.id}
            className="academic-island-heading"
            style={{
              left: group.x + ACADEMIC_MAP_LAYOUT.paddingX,
              top: group.y + ACADEMIC_MAP_LAYOUT.paddingY,
              width: group.width - ACADEMIC_MAP_LAYOUT.paddingX * 2,
            }}
          >
            <span className={`academic-island-step academic-island-step--${group.paletteIndex}`}>
              {String(group.sequence).padStart(2, '0')}
            </span>
            <div>
              <div className="academic-island-title">{group.title}</div>
              <div className="academic-island-subtitle">{group.subtitle} · {group.nodeIds.length} {group.nodeIds.length === 1 ? 'materia' : 'materias'}</div>
            </div>
          </div>
        ))}
      </ViewportPortal>
      <Controls position="bottom-left" />
    </ReactFlow>
  );
}
