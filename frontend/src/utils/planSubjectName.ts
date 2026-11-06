interface PlanSubjectNameSource {
  nameOverride?: string | null;
  code?: string | null;
  subject?: string | { name?: string | null } | null;
}

export function planSubjectName(subject: PlanSubjectNameSource): string {
  const override = subject.nameOverride?.trim();
  const catalogName = subject.subject && typeof subject.subject === 'object'
    ? subject.subject.name?.trim()
    : undefined;
  return override || catalogName || subject.code?.trim() || 'Materia sin nombre';
}
