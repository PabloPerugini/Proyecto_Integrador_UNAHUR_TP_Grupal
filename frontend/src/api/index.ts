import { usersApi } from './users';
import { careersApi } from './careers';
import { academicUnitsApi } from './academicUnits';
import { progressApi } from './progress';
import { studyPlansApi } from './studyPlans';
export const apiService = { ...usersApi, ...careersApi, ...progressApi, studyPlans: studyPlansApi, academicUnits: academicUnitsApi };
export { usersApi, careersApi, academicUnitsApi, progressApi, studyPlansApi };
export type { StudyPlan, PlanSubject, SubjectProgress, UserStudyPlan, ProgressStatus } from './studyPlans';
