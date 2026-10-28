import type { SubjectStatus } from '../types';

export interface PlanCardState {
  status: SubjectStatus;
  critical: boolean;
  optimal: boolean;
  highlightedNext: boolean;
  newlyUnlocked?: boolean;
  selectedSubject: boolean;
}

/**
 * Atenuado de las materias bloqueadas en el grafo. A 0.75 el texto
 * STATUS_TEXT_COLOR sobre fondo blanco mantiene contraste ≥ 4.5:1
 * (verificado en tests/planCard.test.mjs); a 0.55 quedaría por debajo.
 */
export const BLOCKED_FAINT_OPACITY = 0.75;

/**
 * Clases CSS de una tarjeta del grafo/tablero, en orden fijo. La prioridad
 * visual entre estados la define el orden de las reglas en styles/graph.css:
 * base → status → highlighted-next → unlocked → selected → critical → optimal.
 */
export function planCardClasses(d: PlanCardState): string {
  return [
    'plan-node',
    `plan-node--status-${d.status.toLowerCase()}`,
    d.status === 'Cursando' && 'plan-node--in-progress',
    d.highlightedNext && 'plan-node--highlighted-next',
    d.newlyUnlocked && 'plan-node--unlocked',
    d.selectedSubject && 'plan-node--selected',
    d.critical && 'plan-node--critical',
    d.optimal && 'plan-node--optimal',
  ].filter(Boolean).join(' ');
}

/** Etiqueta de periodo para el subtítulo de la tarjeta. */
export function periodLabel(s: { cuatrimestre?: number | null; duration?: string | null }): string {
  if (s.duration === 'A' || s.duration === 'TF') return 'Anual';
  if (s.cuatrimestre === 1) return '1° cuatri';
  if (s.cuatrimestre === 2) return '2° cuatri';
  return 'Cuatrimestral';
}
