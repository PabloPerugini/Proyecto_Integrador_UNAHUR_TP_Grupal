import type { GraphData, GraphNode, SubjectStatus } from '../types';
import { studyPlansApi, orderedSubjects, subjectName, prerequisiteId, careerName, type PlanSubject, type StudyPlan, type ProgressStatus } from './studyPlans';
import { getCareerColor } from '../utils/careerColor';

function toLabel(status: ProgressStatus | undefined): SubjectStatus {
  return status === 'APROBADA' ? 'Aprobada' : status === 'REGULARIZADA' ? 'Regular' : status === 'CURSANDO' ? 'Cursando' : 'Pendiente';
}
function isSatisfied(status: ProgressStatus | undefined, required: string): boolean {
  return status === 'APROBADA' || (required === 'REGULARIZADA' && status === 'REGULARIZADA');
}
export async function getPlanGraph(plan: StudyPlan): Promise<GraphData> {
  const [items, enrollments] = await Promise.all([
    studyPlansApi.getSubjects(plan._id),
    studyPlansApi.getMine().catch(() => []),
  ]);
  const enrollment = enrollments.find(p => (typeof p.studyPlan === 'string' ? p.studyPlan : p.studyPlan?._id) === plan._id);
  const savedProgress = enrollment ? await studyPlansApi.getProgress(enrollment._id).catch(() => []) : [];
  const statusById = new Map(savedProgress.map(p => [typeof p.planSubject === 'string' ? p.planSubject : p.planSubject?._id, p.status]));
  const itemsSorted = orderedSubjects(items);
  const byId = new Map(itemsSorted.map(s => [s._id, s]));
  const seen = new Set<string>();
  const codeById = new Map<string,string>();
  for (const item of itemsSorted) {
    let code = item.code?.trim() || item._id.slice(-8);
    if (seen.has(code)) code = `${code}-${item._id.slice(-5)}`;
    seen.add(code);
    codeById.set(item._id, code);
  }
  const inYear = new Map<number, number>();
  const nodes: GraphNode[] = itemsSorted.map((item: PlanSubject) => {
    const year = item.year ?? 0;
    const row = inYear.get(year) || 0;
    inYear.set(year, row + 1);
    const d: GraphNode['duration'] = item.duration === 'ANUAL' ? 'A' : item.duration === 'OTRA' ? 'TF' : 'C';
    return {
      id: codeById.get(item._id)!, code: codeById.get(item._id)!, name: subjectName(item),
      year: item.year ?? null, cuatrimestre: item.period ?? null, duration: d,
      credits: item.credits ?? 0, kind: item.kind ?? 'Materia', optional: item.optional ?? false,
      intermediate: item.intermediate ?? false, status: toLabel(statusById.get(item._id)),
      position: { x: (year === 0 ? 0 : year - 1) * 310, y: row * 125 + 70 },
    };
  });
  const edges = itemsSorted.flatMap(item => (item.prerequisites ?? []).flatMap(prereq => {
    const sourceId = prerequisiteId(prereq);
    if (!sourceId || !byId.has(sourceId)) return [];
    const source = codeById.get(sourceId)!;
    const target = codeById.get(item._id)!;
    return [{ id: `${source}->${target}`, source, target }];
  }));
  const availableNow = itemsSorted.filter(item => {
    const status = statusById.get(item._id);
    return status !== 'APROBADA' && status !== 'CURSANDO' &&
      (item.prerequisites ?? []).every(prereq => {
        const otherId = prerequisiteId(prereq);
        return otherId && isSatisfied(statusById.get(otherId), prereq.requiredStatus);
      });
  }).map(item => codeById.get(item._id)!);
  const approved = itemsSorted.filter(item => statusById.get(item._id) === 'APROBADA');
  const totalCredits = itemsSorted.reduce((a,s) => a + (s.credits ?? 0), 0);
  const approvedCredits = approved.reduce((a,s) => a + (s.credits ?? 0), 0);
  const intermediateItems = itemsSorted.filter(s => s.intermediate);
  return {
    title: `${careerName(plan)} · ${plan.name}`,
    color: typeof plan.career === 'object' && plan.career ? getCareerColor({ name: plan.career.name || '', color: plan.career.color }) : '#6841df',
    nodes, edges, availableNow, criticalPath: [], hasCycle: false, topologicalOrder: [],
    stats: {
      total: nodes.length, aprobadas: approved.length, disponibles: availableNow.length,
      pendientes: nodes.filter(n => n.status === 'Pendiente').length,
      enCurso: nodes.filter(n => n.status === 'Cursando').length,
      regulares: nodes.filter(n => n.status === 'Regular').length,
      creditsTotal: totalCredits, creditsAprobados: approvedCredits,
    },
    intermediate: intermediateItems.length ? {
      title: plan.intermediateTitle ?? null,
      total: intermediateItems.length,
      aprobadas: intermediateItems.filter(s => statusById.get(s._id) === 'APROBADA').length,
      credits: intermediateItems.reduce((a,s) => a + (s.credits ?? 0), 0),
      creditsAprob: intermediateItems.filter(s => statusById.get(s._id) === 'APROBADA').reduce((a,s) => a + (s.credits ?? 0), 0),
    } : undefined,
  };
}
