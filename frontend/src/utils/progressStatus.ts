import type { PlanSubject, ProgressStatus } from '../api/studyPlans';

export function hasStarted(status: string | undefined): boolean {
  return status === 'APROBADA' || status === 'REGULARIZADA' || status === 'CURSANDO';
}

// La disponibilidad se calcula siempre: los valores guardados pueden haber
// quedado desactualizados después de modificar una correlativa.
export function resolveProgressStatuses(
  subjects: Pick<PlanSubject, '_id' | 'prerequisites'>[],
  saved: ReadonlyMap<string, string | undefined>,
  preserveStarted = true,
): Map<string, ProgressStatus> {
  const effective = new Map<string, string>();
  const meetsRequirements = (subject: Pick<PlanSubject, 'prerequisites'>) =>
    (subject.prerequisites ?? []).every((requirement) => {
      const ref = requirement.planSubject;
      const id = typeof ref === 'string' ? ref : ref?._id;
      const state = id ? effective.get(id) : undefined;
      return state === 'APROBADA'
        || (requirement.requiredStatus === 'REGULARIZADA' && state === 'REGULARIZADA');
    });

  // Solo las aprobaciones/regularidades con sustento habilitan otras materias.
  let changed = true;
  while (changed) {
    changed = false;
    for (const subject of subjects) {
      const state = saved.get(subject._id);
      if (effective.has(subject._id) || (state !== 'APROBADA' && state !== 'REGULARIZADA')) continue;
      if (meetsRequirements(subject)) {
        effective.set(subject._id, state);
        changed = true;
      }
    }
  }

  return new Map(subjects.map((subject) => {
    const state = saved.get(subject._id);
    // El historial se conserva, pero no se muestra como avance vigente si una
    // correlativa perdió sustento. effective propaga ese bloqueo a toda la cadena.
    if (!meetsRequirements(subject)) return [subject._id, 'BLOQUEADA'];
    return [subject._id, preserveStarted && hasStarted(state)
      ? state as ProgressStatus
      : 'DISPONIBLE'];
  }));
}
