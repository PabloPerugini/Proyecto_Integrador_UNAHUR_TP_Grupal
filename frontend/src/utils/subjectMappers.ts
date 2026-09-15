import type { ParsedSubject, Subject } from '../types';

export function toSubjectPayload(s: ParsedSubject): Partial<Subject> {
  return {
    code: s.code,
    name: s.name,
    year: s.year,
    cuatrimestre: s.cuatrimestre,
    duration: s.duration,
    credits: s.credits,
    kind: s.kind,
    optional: s.optional,
    intermediate: s.intermediate,
  };
}