import { instituteColor, DEFAULT_INSTITUTE_COLOR } from './instituteColors';

// Fuente canónica de color por instituto: prioridad al color guardado en
// la unidad académica (DB), luego los hex oficiales UNAHUR por nombre.
// `institute`/`name` quedan como compatibilidad para llamadores viejos.
export function deriveCareerColor(
  institute: string | undefined,
  name: string | undefined,
  academicUnitName?: string | null,
  academicUnitColor?: string | null,
): string {
  if (academicUnitColor) return academicUnitColor;
  if (academicUnitName) return instituteColor(academicUnitName);
  if (institute && instituteColor(institute) !== DEFAULT_INSTITUTE_COLOR) {
    return instituteColor(institute);
  }
  void name;
  return DEFAULT_INSTITUTE_COLOR;
}

export interface CareerColorInput {
  color?: string | null;
  institute?: string;
  name?: string;
  academicUnit?:
    | string
    | { _id?: string; name: string; color?: string | null }
    | null;
}

export function getCareerColor(
  career: CareerColorInput | null | undefined,
): string {
  if (career?.color) return career.color;
  const unit = career?.academicUnit;
  const unitName = unit && typeof unit === 'object' ? unit.name : undefined;
  const unitColor =
    unit && typeof unit === 'object' ? unit.color : undefined;
  return deriveCareerColor(
    career?.institute,
    career?.name,
    unitName,
    unitColor,
  );
}

/** Color de un plan: usa la carrera poblada y cae al color por defecto. */
export function getPlanCareerColor(
  plan: { career?: string | CareerColorInput | null } | null | undefined,
): string {
  const career = plan?.career && typeof plan.career === 'object' ? plan.career : null;
  return getCareerColor(career);
}
