import { careersApi } from './careers';
import { progressApi } from './progress';
import { studyPlansApi } from './studyPlans';

// Compatibilidad con componentes aún no migrados; los planes tienen API propia.
export const apiService = { ...careersApi, ...progressApi, studyPlans: studyPlansApi };
export { careersApi, progressApi, studyPlansApi };
export type { StudyPlan, PlanSubject, SubjectProgress, UserStudyPlan, ProgressStatus } from './studyPlans';
