import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Node, NodeChange } from '@xyflow/react';
import ELK from 'elkjs/lib/elk-api';
import elkWorkerUrl from 'elkjs/lib/elk-worker.min.js?url';
import { layoutAcademicEdges, type AcademicLayout, type AcademicLayoutNode } from '../utils/academicEdgeLayout';

export function useAcademicEdgeLayout(nodes: Node[], edges: readonly { id: string; source: string; target: string }[]) {
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const dimensions = changes.filter(change => change.type === 'dimensions' && change.dimensions);
    if (!dimensions.length) return;
    setSizes(previous => {
      let next = previous;
      for (const change of dimensions) {
        if (change.type !== 'dimensions' || !change.dimensions) continue;
        const { width, height } = change.dimensions;
        if (previous[change.id]?.width === width && previous[change.id]?.height === height) continue;
        if (next === previous) next = { ...previous };
        next[change.id] = { width, height };
      }
      return next;
    });
  }, []);
  // Only card sizes affect routing. Heading widths change after layout and must
  // not trigger another layout. Selection, colors and opacity are not inputs.
  const signature = JSON.stringify(nodes.some(n => n.type === 'plan' && !sizes[n.id]?.height) ? null : nodes.map(n => ({
      id: n.id, position: n.position,
      width: n.type === 'plan' ? sizes[n.id].width : Number(n.data.width ?? 220),
      height: n.type === 'plan' ? sizes[n.id].height : (n.data.isYear ? 24 : 48),
      subject: n.type === 'plan', isYear: n.data.isYear === true,
  })));
  const measuredNodes = useMemo(() => JSON.parse(signature) as AcademicLayoutNode[] | null, [signature]);
  const edgeSignature = JSON.stringify(edges);
  const layoutEdges = useMemo(() => JSON.parse(edgeSignature) as typeof edges, [edgeSignature]);
  const [completed, setCompleted] = useState<{ input: typeof measuredNodes; edges: typeof layoutEdges; layout?: AcademicLayout; error?: string }>();
  useEffect(() => {
    if (!measuredNodes?.length) return;
    let active = true;
    const elk = new ELK({ workerFactory: () => new Worker(elkWorkerUrl) });
    layoutAcademicEdges(measuredNodes, layoutEdges, elk).then(
      layout => { if (active) setCompleted({ input: measuredNodes, edges: layoutEdges, layout }); },
      error => { if (active) setCompleted({ input: measuredNodes, edges: layoutEdges, error: error instanceof Error ? error.message : 'Error calculando las rutas' }); },
    );
    return () => { active = false; elk.terminateWorker(); };
  }, [measuredNodes, layoutEdges]);
  const current = completed?.input === measuredNodes && completed?.edges === layoutEdges ? completed : undefined;
  return { layout: current?.layout, layoutError: current?.error, onNodesChange, nodeSizes: sizes };
}
