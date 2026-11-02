import type { GraphData } from '../types';
import { studyPlansApi, type StudyPlan } from './studyPlans';
import { mapGraphResponse } from '../utils/graphMapper';
import { getPlanCareerColor } from '../utils/careerColor';

// El backend es la fuente de verdad del grafo (D2): estados, disponibilidad,
// camino crítico, estadísticas y camino al nodo seleccionado.
export async function getPlanGraph(
  plan: StudyPlan,
  { target = null }: { target?: string | null } = {},
): Promise<GraphData> {
  const response = await studyPlansApi.getGraph(plan._id, target);
  return mapGraphResponse(plan, {
    ...response,
    color: response.color || getPlanCareerColor(plan),
  });
}
