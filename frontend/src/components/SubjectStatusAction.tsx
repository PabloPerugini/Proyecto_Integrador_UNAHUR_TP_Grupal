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
  const advanceLabel = canAdvance ? `Marcar ${name} como ${next!.toLowerCase()}` : '';
  const label = canAdvance
    ? `${advanceLabel}${canRevert ? `. Shift+Enter, Supr o clic derecho: volver a ${previous}` : ''}`
    : `${name}: Shift+Enter, Supr o clic derecho para marcar como ${previous}`;
  const hint = canAdvance && canRevert ? `${advanceLabel}. Shift+Enter, Supr o clic derecho: volver a ${previous}.` : label;
  const revert = () => {
    if (!disabled && canRevert) onRevert?.();
  };
  const advance = () => {
    if (!disabled && canAdvance) onAdvance?.();
  };
  return (
    <button type="button" className={`plan-node__status-icon plan-status-action nodrag nopan${canAdvance ? ' plan-status-action--advance' : ''}`}
      disabled={disabled} aria-label={label} aria-keyshortcuts={canRevert ? 'Shift+Enter Delete' : undefined}
      title={disabled ? 'Guardando progreso…' : hint}
      onPointerDown={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()}
      onContextMenu={event => {
        event.preventDefault();
        event.stopPropagation();
        revert();
      }}
      onKeyDown={event => {
        if (!canRevert) return;
        if (event.key === 'Delete' || (event.key === 'Enter' && event.shiftKey)) {
          event.preventDefault();
          event.stopPropagation();
          revert();
        }
      }}
      onClick={event => {
        event.stopPropagation();
        if (event.shiftKey && canRevert) {
          revert();
          return;
        }
        advance();
      }}>
      <span className="plan-status-action__current" aria-hidden="true"><SubjectStatusIcon status={status} highlightColor={highlightColor} /></span>
      {canAdvance && next && <span className="plan-status-action__next" aria-hidden="true"><SubjectStatusIcon status={next} /></span>}
    </button>
  );
}
