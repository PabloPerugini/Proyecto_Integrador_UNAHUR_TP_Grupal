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
 * Atenuado de las materias bloqueadas en el grafo. A 0.75 el color de texto
 * de la tarjeta (styles/graph.css) sobre fondo blanco mantiene contraste
 * ≥ 4.5:1 (verificado en tests/statusContrast.test.mjs); a 0.55 quedaría por
 * debajo.
 */
export const BLOCKED_FAINT_OPACITY = 0.75;

/**
 * El atenuado de bloqueadas nunca baja la opacidad de las tarjetas
 * destacadas del camino crítico/óptimo: con el fondo naranja/ámbar, el texto
 * mezclado al 75% caería por debajo de 4.5:1 y el camino debe lucir a plena
 * opacidad.
 */
export function blockedFaintApplies(b: { blocked: boolean; critical: boolean; optimal: boolean }): boolean {
  return b.blocked && !b.critical && !b.optimal;
}

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
