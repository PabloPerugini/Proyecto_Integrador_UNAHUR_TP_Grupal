import type { AcaActivity, AcaActivityCategory } from '../api/studyPlans';

export const ACA_ACTIVITY_CATEGORIES: {
  id: AcaActivityCategory;
  label: string;
}[] = [
  { id: 'UC', label: 'Unidades curriculares fuera del plan (UC)' },
  { id: 'EF', label: 'Experiencias formativas diversas (EF)' },
  { id: 'INSTITUTO', label: 'Créditos definidos por el Instituto' },
];

export const ACA_CATEGORY_TOTAL = 10;
export const ACA_CATEGORY_INTERMEDIATE = 4;
export const ACA_INTERMEDIATE_TOTAL = 12;
export const ACA_DEGREE_TOTAL = 30;
export const ACA_PEDAGOGICAL_HOURS = 75;

export interface AcaCreditSummary {
  totalCredits: number;
  creditsByCategory: Record<AcaActivityCategory, number>;
  interactionHours: number;
  intermediateCredits: number;
  degreeCredits: number;
  intermediateComplete: boolean;
  degreeComplete: boolean;
}

export function summarizeAcaCredits(activities: AcaActivity[]): AcaCreditSummary {
  const creditsByCategory: Record<AcaActivityCategory, number> = {
    UC: 0,
    EF: 0,
    INSTITUTO: 0,
  };
  let totalCredits = 0;
  let interactionHours = 0;

  for (const activity of activities) {
    creditsByCategory[activity.category] += activity.credits;
    totalCredits += activity.credits;
    interactionHours += activity.interactionHours;
  }

  for (const category of Object.keys(creditsByCategory) as AcaActivityCategory[]) {
    creditsByCategory[category] = Math.round((creditsByCategory[category] + Number.EPSILON) * 100) / 100;
  }
  totalCredits = Math.round((totalCredits + Number.EPSILON) * 100) / 100;
  interactionHours = Math.round((interactionHours + Number.EPSILON) * 100) / 100;

  const intermediateComplete =
    totalCredits >= ACA_INTERMEDIATE_TOTAL &&
    Object.values(creditsByCategory).every((credits) => credits >= ACA_CATEGORY_INTERMEDIATE);
  const degreeComplete =
    totalCredits >= ACA_DEGREE_TOTAL &&
    Object.values(creditsByCategory).every((credits) => credits >= ACA_CATEGORY_TOTAL) &&
    interactionHours >= ACA_PEDAGOGICAL_HOURS;
  const intermediateCredits = Object.values(creditsByCategory)
    .reduce((sum, credits) => sum + Math.min(credits, ACA_CATEGORY_INTERMEDIATE), 0);
  const degreeCredits = Object.values(creditsByCategory)
    .reduce((sum, credits) => sum + Math.min(credits, ACA_CATEGORY_TOTAL), 0);

  return {
    totalCredits,
    creditsByCategory,
    interactionHours,
    intermediateCredits,
    degreeCredits,
    intermediateComplete,
    degreeComplete,
  };
}

export function acaActivityCategoryLabel(category: AcaActivityCategory): string {
  return ACA_ACTIVITY_CATEGORIES.find((item) => item.id === category)?.label ?? category;
}
