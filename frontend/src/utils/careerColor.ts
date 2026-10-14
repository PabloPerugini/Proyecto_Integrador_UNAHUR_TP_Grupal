import type { Career } from '../types';
import { instituteColor, DEFAULT_INSTITUTE_COLOR } from './instituteColors';

// Fuente canónica de color por instituto (hex oficiales UNAHUR).
// Se resuelve por nombre de unidad académica; `institute`/`name` quedan
// como compatibilidad para llamadores viejos.
export function deriveCareerColor(
  institute: string | undefined,
  name: string | undefined,
  academicUnitName?: string | null,
): string {
  if (academicUnitName) return instituteColor(academicUnitName);
  if (institute && instituteColor(institute) !== DEFAULT_INSTITUTE_COLOR) {
    return instituteColor(institute);
  }
  void name;
  return DEFAULT_INSTITUTE_COLOR;
}

export function getCareerColor(
  career:
    | Pick<Career, 'color' | 'institute' | 'name'> & {
        academicUnit?: string | { _id: string; name: string } | null;
      }
    | null
    | undefined,
): string {
  if (career?.color) return career.color;
  const unit = career?.academicUnit;
  const unitName =
    unit && typeof unit === 'object' ? unit.name : undefined;
  return deriveCareerColor(career?.institute, career?.name, unitName);
}
