import type { Subject } from '../types';

const NO_YEAR = 999;

export function sortSubjects<T extends Pick<Subject, 'year' | 'cuatrimestre' | 'name'>>(list: T[]): T[] {
  return [...list].sort(
    (a, b) =>
      (a.year ?? NO_YEAR) - (b.year ?? NO_YEAR) ||
      (a.cuatrimestre ?? 0) - (b.cuatrimestre ?? 0) ||
      a.name.localeCompare(b.name),
  );
}

export function yearLabel(year: number | null | undefined): string {
  return year == null || year === NO_YEAR ? 'Sin año' : `Año ${year}`;
}

interface YearGroup<T> {
  year: number | null;
  items: T[];
}

export function groupSubjectsByYear<T extends Pick<Subject, 'year'>>(list: T[]): YearGroup<T>[] {
  const years = Array.from(new Set(list.map((s) => s.year ?? null)));
  return years.map((year) => ({
    year,
    items: list.filter((s) => (s.year ?? null) === year),
  }));
}