import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { SubjectStatus } from '../types';
import { planCardClasses, periodLabel } from '../utils/planCard';
import { resolveNodeStatus } from '../utils/status';
import { yearLabel } from '../utils/subjects';
import { HIGHLIGHT_COLOR, UNLOCK_COLOR } from '../utils/graphHighlight';
import SubjectStatusAction from './SubjectStatusAction';

export interface PlanNodeData {
  onAdvance?: (code: string, backwards?: boolean) => void;
  progressSaving?: boolean;
  code: string;
  name: string;
  year: number | null;
  cuatrimestre?: number | null;
  duration?: string | null;
  status: SubjectStatus;
  available: boolean;
  critical: boolean;
  optimal: boolean;
  highlightedNext: boolean;
  newlyUnlocked?: boolean;
  selectedSubject: boolean;
  credits: number;
}

export function toPlanNodeData(
  n: { code: string; name: string; year: number | null; cuatrimestre: number | null; duration?: string | null; status: PlanNodeData['status']; credits: number },
  availableSet: Set<string>,
  criticalSet: Set<string>,
  fastSet: Set<string>,
): PlanNodeData {
  const status = resolveNodeStatus(n.status, availableSet.has(n.code));
  return {
    code: n.code,
    name: n.name,
    year: n.year,
    cuatrimestre: n.cuatrimestre,
    duration: n.duration ?? null,
    status,
    available: status === 'Disponible',
    critical: criticalSet.has(n.code),
    optimal: fastSet.has(n.code),
    highlightedNext: false,
    selectedSubject: false,
    credits: n.credits,
  };
}

/** Badges de estado; `null` cuando no hay ninguno (evita cajas vacías con gap). */
export function StatusBadges({ d }: { d: Pick<PlanNodeData, 'available' | 'optimal' | 'critical'> }) {
  if (!d.available && !d.optimal && !d.critical) return null;
  return (
    <div className="plan-node__badges">
      {d.available && <span className="badge text-bg-warning">disponible</span>}
      {d.optimal && <span className="badge" style={{ background: '#d9870b', color: '#211407' }}>óptima</span>}
      {d.critical && <span className="badge text-bg-dark">crítico</span>}
    </div>
  );
}

function PlanNode({ data }: NodeProps<Node<Record<string, unknown>>>) {
  const d = data as unknown as PlanNodeData;
  return (
    <div className={planCardClasses(d)}>
      <SubjectStatusAction
        status={d.status}
        name={d.name}
        onAdvance={d.onAdvance ? () => d.onAdvance?.(d.code) : undefined}
        onRevert={d.onAdvance ? () => d.onAdvance?.(d.code, true) : undefined}
        disabled={d.progressSaving}
        highlightColor={d.newlyUnlocked ? UNLOCK_COLOR : d.highlightedNext ? HIGHLIGHT_COLOR : undefined}
      />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      {/* Nombre de la materia */}
      <div className="plan-node__name">{d.name}</div>
      <div className="plan-node__period">{yearLabel(d.year)} · {periodLabel(d)}</div>
      <StatusBadges d={d} />

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

export default PlanNode;
