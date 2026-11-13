import type { GraphEdge, SubjectStatus } from '../types';

// Recorridos sobre el grafo de correlatividades del plan.
// Convenciones de la facultad:
// - Una correlativa queda satisfecha solo con la APROBACIÓN EFECTIVA de la
//   materia (RN04): Regular y Cursando todavía no habilitan la siguiente.
// - "Desbloquea": al aprobar una materia, las materias que la tienen como
//   correlativa pasan a estar disponibles para cursar; en cascada, habilita
//   todo su ramo.

/** Recorrido calculado sobre el plan.
 * - `chain`: códigos de materia en orden de cursada.
 * - `set`: los mismos códigos, como conjunto para marcar el mapa.
 * - `edgeSet`: ids de las flechas que forman el recorrido.
 * - `hasCycle`: hay un ciclo entre correlativas pendientes y no se pudo calcular. */
export interface StudyPath {
  chain: string[];
  set: Set<string>;
  edgeSet: Set<string>;
  hasCycle: boolean;
}

// Materia del plan: el año y el cuatrimestre desempatan el orden sugerido.
type OrderNode = {
  code: string;
  status: SubjectStatus;
  year?: number | null;
  cuatrimestre?: number | null;
};

// Materias que todavía deben aprobarse.
const pendingMap = (nodes: readonly OrderNode[]) =>
  new Map(nodes.filter(n => n.status !== 'Aprobada').map(n => [n.code, n]));

const empty = (hasCycle = false): StudyPath => ({
  chain: [],
  set: new Set<string>(),
  edgeSet: new Set<string>(),
  hasCycle,
});

// Flechas entre materias pendientes (las que exigen trabajo futuro).
const pendingEdgesOf = (pending: Map<string, OrderNode>, edges: readonly GraphEdge[]) =>
  edges.filter(edge => pending.has(edge.source) && pending.has(edge.target));

const successorsMap = (pendingEdges: readonly GraphEdge[]) => {
  const successors = new Map<string, string[]>();
  for (const edge of pendingEdges) {
    const list = successors.get(edge.source) ?? [];
    list.push(edge.target);
    successors.set(edge.source, list);
  }
  return successors;
};

// Un ciclo entre correlativas pendientes vuelve imposible proponer un orden:
// ninguna materia del ciclo puede cursarse antes que las demás.
const hasPendingCycle = (
  pending: Map<string, OrderNode>,
  successors: Map<string, string[]>,
): boolean => {
  const state = new Map<string, 'visitando' | 'resuelto'>();
  const visit = (code: string): boolean => {
    const current = state.get(code);
    if (current === 'visitando') return true;
    if (current === 'resuelto') return false;
    state.set(code, 'visitando');
    for (const next of successors.get(code) ?? []) {
      if (visit(next)) return true;
    }
    state.set(code, 'resuelto');
    return false;
  };
  for (const code of pending.keys()) {
    if (visit(code)) return true;
  }
  return false;
};

// Potencial de desbloqueo: cuántas materias pendientes quedan habilitadas, en
// cascada, al aprobar esta materia.
const unlockPotential = (
  successors: Map<string, string[]>,
): ((code: string) => number) => {
  const cache = new Map<string, Set<string>>();
  const descendantsOf = (code: string): Set<string> => {
    const cached = cache.get(code);
    if (cached !== undefined) return cached;
    const found = new Set<string>();
    for (const next of successors.get(code) ?? []) {
      found.add(next);
      for (const deeper of descendantsOf(next)) found.add(deeper);
    }
    cache.set(code, found);
    return found;
  };
  return (code: string) => descendantsOf(code).size;
};

// Clave de cuatrimestre del plan: año ascendente y, dentro del año,
// cuatrimestre ascendente. Las materias sin año van al final; las anuales o
// sin cuatrimestre se ubican antes del 1.er cuatrimestre de su año.
const termOf = (node: OrderNode | undefined): [number, number] => [
  node?.year ?? Number.MAX_SAFE_INTEGER,
  node?.cuatrimestre ?? 0,
];

const compareTerms = (a: OrderNode | undefined, b: OrderNode | undefined): number => {
  const [yearA, cuatA] = termOf(a);
  const [yearB, cuatB] = termOf(b);
  return yearA - yearB || cuatA - cuatB;
};

// Dentro de un cuatrimestre gana la materia que más desbloquea; el código
// mantiene estable el resultado.
const compareUnlock = (unlocks: (code: string) => number) => (a: string, b: string): number =>
  unlocks(b) - unlocks(a) || a.localeCompare(b);

// Primera materia del camino: el cuatrimestre más temprano que tenga una
// materia disponible con sucesoras; dentro de ese cuatrimestre, la que más
// desbloquea. Si ninguna abre camino, arranca en la más temprana disponible.
const pickStart = (
  roots: readonly string[],
  pending: Map<string, OrderNode>,
  unlocks: (code: string) => number,
): string | undefined => {
  const byTerm = (a: string, b: string) =>
    compareTerms(pending.get(a), pending.get(b)) || compareUnlock(unlocks)(a, b);
  const sorted = [...roots].sort(byTerm);
  return sorted.find(code => unlocks(code) > 0) ?? sorted[0];
};

// Siguiente materia del camino: la sucesora del cuatrimestre inmediato que
// abra camino; si el inmediato es un callejón sin salida, la del cuatrimestre
// siguiente más cercano. Nunca retrocede de cuatrimestre.
const pickNext = (
  successors: readonly string[],
  current: string,
  pending: Map<string, OrderNode>,
  unlocks: (code: string) => number,
): string | undefined => {
  if (successors.length === 0) return undefined;
  const currentTerm = pending.get(current);
  const later = successors.filter(code => compareTerms(pending.get(code), currentTerm) > 0);
  const pool = later.length > 0 ? later : successors;
  const viable = pool.filter(code => unlocks(code) > 0);
  const candidates = viable.length > 0 ? viable : pool;
  return [...candidates].sort(
    (a, b) => compareTerms(pending.get(a), pending.get(b)) || compareUnlock(unlocks)(a, b),
  )[0];
};

/** Orden sugerido de cursada: un único camino de materias pendientes.
 * Arranca en el cuatrimestre más temprano que pueda abrir camino y, dentro de
 * cada cuatrimestre, elige la correlativa directa que más desbloquea. Avanza
 * al cuatrimestre inmediato siguiente y, si ese es un callejón sin salida,
 * salta al más cercano que continúe el recorrido. El camino nunca retrocede
 * de cuatrimestre ni propone una materia antes que su correlativa.
 * Devuelve un recorrido vacío si hay un ciclo entre correlativas pendientes. */
export function getSuggestedOrder(
  nodes: readonly OrderNode[],
  edges: readonly GraphEdge[],
): StudyPath {
  const pending = pendingMap(nodes);
  if (pending.size === 0) return empty();
  const pendingEdges = pendingEdgesOf(pending, edges);
  const successors = successorsMap(pendingEdges);
  if (hasPendingCycle(pending, successors)) return empty(true);
  const unlocks = unlockPotential(successors);
  // Materias disponibles con el avance actual: ninguna correlativa pendiente.
  const required = new Set(pendingEdges.map(edge => edge.target));
  const roots = [...pending.keys()].filter(code => !required.has(code));
  const start = pickStart(roots, pending, unlocks);
  if (start === undefined) return empty(true);
  const chain: string[] = [start];
  let current = start;
  for (;;) {
    const next = pickNext(successors.get(current) ?? [], current, pending, unlocks);
    if (next === undefined) break;
    chain.push(next);
    current = next;
  }
  const set = new Set(chain);
  const edgeSet = new Set(
    pendingEdges
      .filter(edge => set.has(edge.source) && set.has(edge.target))
      .map(edge => edge.id),
  );
  return { chain, set, edgeSet, hasCycle: false };
}

/** Requisitos de cursada de una materia: todas sus correlativas pendientes,
 * directas e indirectas, incluida la materia elegida como destino del
 * recorrido. Las ya aprobadas no forman parte. Devuelve un recorrido vacío
 * si hay un ciclo entre las correlativas o si la materia ya está aprobada. */
export function getRequirements(
  nodes: readonly OrderNode[],
  edges: readonly GraphEdge[],
  targetCode: string | null | undefined,
): StudyPath {
  const pending = pendingMap(nodes);
  if (targetCode === null || targetCode === undefined || !pending.has(targetCode)) return empty();
  // Flechas entre materias pendientes, agrupadas por destino.
  const incoming = new Map<string, GraphEdge[]>();
  for (const edge of pendingEdgesOf(pending, edges)) {
    const list = incoming.get(edge.target) ?? [];
    list.push(edge);
    incoming.set(edge.target, list);
  }
  const visiting = new Set<string>();
  const closure = new Set<string>();
  const edgeSet = new Set<string>();
  const order: string[] = [];
  let hasCycle = false;
  const visit = (code: string): void => {
    if (closure.has(code)) return;
    if (visiting.has(code)) { hasCycle = true; return; }
    visiting.add(code);
    for (const edge of incoming.get(code) ?? []) {
      edgeSet.add(edge.id);
      visit(edge.source);
    }
    visiting.delete(code);
    closure.add(code);
    order.push(code);
  };
  visit(targetCode);
  if (hasCycle) return empty(true);
  return { chain: order, set: closure, edgeSet, hasCycle: false };
}
