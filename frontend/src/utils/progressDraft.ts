export interface GradeInput {
  id: string;
  name: string;
  grade: string;
}

// Parsea y valida todas las notas antes de guardar. Si una falla, no se
// devuelve ningún resultado: el llamador no llega a hacer PUT parciales.
export function parseGrades(
  inputs: readonly GradeInput[],
): Map<string, number | null> {
  const grades = new Map<string, number | null>();

  for (const input of inputs) {
    const raw = input.grade.trim();

    if (!raw) {
      grades.set(input.id, null);
      continue;
    }

    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 10) {
      throw new Error(`La nota de ${input.name} debe estar entre 0 y 10`);
    }

    grades.set(input.id, value);
  }

  return grades;
}
