import type { PlanSubject } from '../api/studyPlans';

// El nombre editado en el plan manda sobre el nombre del catálogo.
export function subjectName(subject: PlanSubject): string {
  const override = typeof subject.nameOverride === 'string' ? subject.nameOverride.trim() : '';
  if (override) return override;

  const name = subject.subject && typeof subject.subject === 'object' ? subject.subject.name : null;
  return (typeof name === 'string' && name.trim()) || subject.code?.trim() || 'Materia sin nombre';
}
