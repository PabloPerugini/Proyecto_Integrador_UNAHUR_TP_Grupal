import type { GraphData, GraphNode, GraphResponse, GraphResponseNode, SubjectStatus, TargetPath } from '../types';
import type { StudyPlan } from '../api/studyPlans';

// El backend ya resolvió estados, costos y caminos: acá solo se adapta el
// formato de presentación (duración y etiqueta de estado).
function toDuration(value: string | null): GraphNode['duration'] {
  if (value === 'ANUAL') return 'A';
  if (value === 'OTRA') return 'TF';
  return 'C';
}

function toNode(node: GraphResponseNode): GraphNode {
  const effective = node.effectiveStatus as SubjectStatus;
  return {
    ...node,
    duration: toDuration(node.duration),
    status: effective,
    savedStatus: node.savedStatus,
    effectiveStatus: effective,
  };
}

function fallbackTitle(plan: Pick<StudyPlan, 'name' | 'career'>): string {
  const career = plan.career && typeof plan.career === 'object' ? plan.career : null;
  if (!career) return plan.name;
  return `${career.name || 'Carrera sin nombre'} · ${plan.name}`;
}

function toTargetPath(path: TargetPath | null | undefined): TargetPath | null {
  if (!path) return null;
  return {
    target: path.target,
    chain: path.chain ?? [],
    chainCosts: path.chainCosts ?? [],
    cost: path.cost ?? 0,
    edgeIds: path.edgeIds ?? [],
    hasCycle: Boolean(path.hasCycle),
  };
}

export function mapGraphResponse(
  plan: Pick<StudyPlan, 'name' | 'career'>,
  response: GraphResponse,
): GraphData {
  return {
    title: response.title || fallbackTitle(plan),
    ...(response.userStudyPlanId ? { userStudyPlanId: response.userStudyPlanId } : {}),
    ...(response.color ? { color: response.color } : {}),
    nodes: response.nodes.map(toNode),
    edges: response.edges ?? [],
    availableNow: response.availableNow ?? [],
    criticalPath: response.criticalPath ?? [],
    criticalPathCosts: response.criticalPathCosts ?? [],
    criticalPathCost: response.criticalPathCost ?? 0,
    criticalPathEdges: response.criticalPathEdges ?? [],
    hasCycle: Boolean(response.hasCycle),
    topologicalOrder: response.topologicalOrder ?? [],
    targetPath: toTargetPath(response.targetPath),
    stats: response.stats,
    ...(response.intermediate ? { intermediate: response.intermediate } : {}),
  };
}
