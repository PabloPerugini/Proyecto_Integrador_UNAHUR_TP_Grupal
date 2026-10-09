import { usersApi } from './users';
import { careersApi } from './careers';
import { progressApi } from './progress';
import { studyPlansApi } from './studyPlans';
export const apiService = { ...usersApi, ...careersApi, ...progressApi, studyPlans: studyPlansApi };
export { usersApi, careersApi, progressApi, studyPlansApi };
export type { StudyPlan, PlanSubject, SubjectProgress, UserStudyPlan, ProgressStatus } from './studyPlans';
