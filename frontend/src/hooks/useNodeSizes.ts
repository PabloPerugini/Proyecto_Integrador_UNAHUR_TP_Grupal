import { useCallback, useState } from 'react';
import type { NodeChange } from '@xyflow/react';

/**
 * Medición de tarjetas para el área del mapa y los paneles de cuatrimestre.
 * Persiste solo los cambios de dimensiones: posición, colores y selección no
 * son entradas.
 */
export function useNodeSizes() {
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number; height: number }>>({});

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const dimensions = changes.filter(change => change.type === 'dimensions' && change.dimensions);
    if (!dimensions.length) return;
    setNodeSizes(previous => {
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

  return { nodeSizes, onNodesChange };
}
