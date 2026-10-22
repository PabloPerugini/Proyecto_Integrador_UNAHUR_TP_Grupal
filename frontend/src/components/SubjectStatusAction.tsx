import type { SubjectStatus } from '../types';
import SubjectStatusIcon from './SubjectStatusIcon';

interface Props {
  status: SubjectStatus;
  name: string;
  highlightColor?: string;
  onAdvance?: () => void;
  onRevert?: () => void;
  disabled?: boolean;
}

export default function SubjectStatusAction({ status, name, highlightColor, onAdvance, onRevert, disabled }: Props) {
  const next = status === 'Disponible' ? 'Cursando' : status === 'Cursando' ? 'Aprobada' : null;
  const previous = status === 'Aprobada' ? 'cursando' : status === 'Cursando' ? 'sin cursar' : null;
  const canAdvance = !!next && !!onAdvance;
  const canRevert = !!previous && !!onRevert;
  if (!canAdvance && !canRevert) return <SubjectStatusIcon status={status} highlightColor={highlightColor} className="plan-node__status-icon" />;
  const label = canAdvance ? `Marcar ${name} como ${next!.toLowerCase()}` : `${name}: clic derecho para marcar como ${previous}`;
  const hint = canAdvance && canRevert ? `${label}. Clic derecho: volver a ${previous}.` : label;
  return (
    <button type="button" className={`plan-node__status-icon plan-status-action nodrag nopan${canAdvance ? ' plan-status-action--advance' : ''}`}
      disabled={disabled} aria-label={label} title={disabled ? 'Guardando progreso…' : hint}
      onPointerDown={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()}
      onContextMenu={event => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled && canRevert) onRevert?.();
      }}
      onClick={event => { event.stopPropagation(); if (!disabled && canAdvance) onAdvance?.(); }}>
      <span className="plan-status-action__current" aria-hidden="true"><SubjectStatusIcon status={status} highlightColor={highlightColor} /></span>
      {canAdvance && next && <span className="plan-status-action__next" aria-hidden="true"><SubjectStatusIcon status={next} /></span>}
    </button>
  );
}
