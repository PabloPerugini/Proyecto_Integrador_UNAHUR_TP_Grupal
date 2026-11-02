import { usersApi } from './users';
import { careersApi } from './careers';
import { academicUnitsApi } from './academicUnits';
import { studyPlansApi } from './studyPlans';
export const apiService = { ...usersApi, ...careersApi, studyPlans: studyPlansApi, academicUnits: academicUnitsApi };
export { usersApi, careersApi, academicUnitsApi, studyPlansApi };
export type { StudyPlan, PlanSubject, SubjectProgress, UserStudyPlan, ProgressStatus } from './studyPlans';
