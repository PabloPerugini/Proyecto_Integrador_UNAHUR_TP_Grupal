import type { PlanSubject, ProgressStatus, ResolvedProgressStatus } from '../api/studyPlans';

export function hasStarted(status: string | undefined): boolean {
  return status === 'APROBADA' || status === 'REGULARIZADA' || status === 'CURSANDO';
}

// Los avances ya registrados se conservan; la disponibilidad de materias
// pendientes se calcula con el estado guardado de cada correlativa directa.
export function resolveProgressStatuses(
  subjects: Pick<PlanSubject, '_id' | 'prerequisites'>[],
  saved: ReadonlyMap<string, string | undefined>,
  preserveStarted = true,
): Map<string, ResolvedProgressStatus> {
  const meetsRequirements = (subject: Pick<PlanSubject, 'prerequisites'>) =>
    (subject.prerequisites ?? []).every((requirement) => {
      const ref = requirement.planSubject;
      const id = typeof ref === 'string' ? ref : ref?._id;
      const state = id ? saved.get(id) : undefined;
      return state === 'APROBADA'
        || (requirement.requiredStatus === 'REGULARIZADA' && state === 'REGULARIZADA');
    });

  return new Map(subjects.map((subject) => {
    const state = saved.get(subject._id);
    if (state === 'LIBRE') return [subject._id, 'LIBRE'];
    if (preserveStarted && hasStarted(state)) return [subject._id, state as ProgressStatus];
    if (!meetsRequirements(subject)) return [subject._id, 'BLOQUEADA'];
    return [subject._id, 'DISPONIBLE'];
  }));
}
