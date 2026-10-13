import { request, uploadPdf } from './client';

export interface CareerRef {
  _id: string;
  name?: string;
  color?: string;
  university?: string | { _id: string; name: string } | null;
}
export interface CorrRow {
  name: string;
  matched: boolean;
  code: string | null;
  dbName: string | null;
  confidence: string | null;
  requires: string[];
}
export interface CorrParseResult {
  sourceKind?: string;
  total: number;
  planSubjects: number;
  matchedCount: number;
  rows: CorrRow[];
  unmatched: string[];
}
export interface CorrUpdate {
  code: string;
  requires: string[];
}
export interface CorrSaveResult {
  saved: number;
  dropped: string[];
}
export interface GraphLike {
  nodes: unknown[];
  edges: unknown[];
  availableNow: unknown[];
  [key: string]: unknown;
}
export interface SugerenciaDisponible {
  code: string;
  name: string;
  critica?: boolean;
  desbloquea?: number;
  [key: string]: unknown;
}
export interface SugerenciasLike {
  mensajes: unknown[];
  disponibles: SugerenciaDisponible[];
  [key: string]: unknown;
}
export interface IntermediateSubject {
  code: string;
  name: string;
  year: number | null;
  credits: number;
  requires: string[];
  externalRequires: string[];
}
export interface IntermediateView {
  planId: string;
  planName: string;
  intermediateTitle: string;
  creditsIntermediate: number;
  closed: boolean;
  total: number;
  subjects: IntermediateSubject[];
}

async function uploadCorrelativas<T>(url: string, file: File): Promise<T> {
  return uploadPdf<T>(url, file);
}
export interface StudyPlan {
  _id: string;
  name: string;
  career: string | CareerRef | null;
  resolution?: string;
  durationYears?: number;
  creditsFinal?: number;
  creditsIntermediate?: number;
  intermediateTitle?: string | null;
  status: 'draft' | 'published';
  createdBy?: string | { _id: string } | null;
  createdAt?: string;
  updatedAt?: string;
}
export interface SubjectRef {
  _id: string;
  name?: string;
  slug?: string;
  description?: string;
}
export interface PlanPrerequisite {
  planSubject: string | { _id: string; code?: string } | null;
  requiredStatus: 'REGULARIZADA' | 'APROBADA';
}
export interface PlanSubject {
  _id: string;
  studyPlan: string;
  subject: string | SubjectRef | null;
  code?: string;
  kind?: 'Materia' | 'ACA' | 'AU' | 'OTRA';
  generic?: 'CFC' | 'CFB' | 'CFP' | 'ACA' | null;
  year?: number | null;
  period?: number | null;
  duration?: 'CUATRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'TRIMESTRAL' | 'OTRA';
  credits?: number;
  hours?: Record<string, number | null>;
  optional?: boolean;
  intermediate?: boolean;
  prerequisites?: PlanPrerequisite[];
}
export interface UserStudyPlan {
  _id: string;
  user: string;
  studyPlan: string | StudyPlan | null;
  createdAt?: string;
}
export type ProgressStatus = 'PENDIENTE' | 'CURSANDO' | 'REGULARIZADA' | 'APROBADA';
export interface SubjectProgress {
  _id: string;
  userStudyPlan: string;
  planSubject: string | PlanSubject | null;
  status: ProgressStatus;
  grade: number | null;
  academicDate?: string | null;
  origin?: string | null;
}
export interface ProgressInput {
  status: ProgressStatus;
  grade?: number | null;
  academicDate?: string | null;
  origin?: string | null;
}

export function subjectName(subject: PlanSubject): string {
  const name = subject.subject && typeof subject.subject === 'object' ? subject.subject.name : null;
  return (typeof name === 'string' && name.trim()) || subject.code?.trim() || 'Materia sin nombre';
}
export function careerName(plan: StudyPlan): string {
  return plan.career && typeof plan.career === 'object' ? plan.career.name || 'Carrera sin nombre' : 'Carrera no disponible';
}
export function prerequisiteId(prerequisite: PlanPrerequisite): string | null {
  return prerequisite.planSubject && (typeof prerequisite.planSubject === 'string'
    ? prerequisite.planSubject : prerequisite.planSubject._id);
}
export function orderedSubjects(subjects: PlanSubject[]): PlanSubject[] {
  return [...subjects].filter(Boolean).sort((a, b) =>
    (a.year ?? 999) - (b.year ?? 999) ||
    (a.period ?? 99) - (b.period ?? 99) ||
    subjectName(a).localeCompare(subjectName(b), 'es')
  );
}
export const studyPlansApi = {
  getAll: (careerId?: string) => request<StudyPlan[]>(
    careerId ? `/study-plans?career=${encodeURIComponent(careerId)}` : '/study-plans',
  ),
  getById: (id: string) => request<StudyPlan>(`/study-plans/${id}`),
  update: async (id: string, data: Partial<StudyPlan>) => {
    const result = await request<{ studyPlan: StudyPlan }>(`/study-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    return result.studyPlan;
  },
  getSubjects: (planId: string) => request<PlanSubject[]>(`/study-plans/${planId}/subjects`),  updateSubject: async (planId: string, subjectId: string, data: Partial<PlanSubject>) => {
    const result = await request<{ planSubject: PlanSubject }>(`/study-plans/${planId}/subjects/${subjectId}`, { method: 'PATCH', body: JSON.stringify(data) });
    return result.planSubject;
  },
  deleteSubject: (planId: string, subjectId: string) => request<unknown>(`/study-plans/${planId}/subjects/${subjectId}`, { method: 'DELETE' }),
  getGraph: (planId: string) => request<GraphLike>(`/study-plans/${planId}/graph`),
  getIntermediate: (planId: string) => request<IntermediateView>(`/study-plans/${planId}/intermediate`),
  getSugerencias: (planId: string) => request<SugerenciasLike>(`/study-plans/${planId}/sugerencias`),
  parseCorrelativas: (planId: string, file: File) => uploadCorrelativas<CorrParseResult>(`/study-plans/${planId}/parse-correlativas`, file),
  saveCorrelativas: (planId: string, updates: CorrUpdate[]) => request<CorrSaveResult>(`/study-plans/${planId}/correlativas`, { method: 'POST', body: JSON.stringify({ updates }) }),
  getMine: () => request<UserStudyPlan[]>('/user-study-plans'),
  enroll: async (studyPlanId: string) => {
    const result = await request<{ userStudyPlan: UserStudyPlan }>('/user-study-plans', {
      method: 'POST', body: JSON.stringify({ studyPlanId }),
    });
    return result.userStudyPlan;
  },
  getProgress: (userStudyPlanId: string) => request<SubjectProgress[]>(`/user-study-plans/${userStudyPlanId}/progress`),
  saveProgress: async (userStudyPlanId: string, subjectId: string, data: ProgressInput) => {
    const result = await request<{ progress: SubjectProgress }>(`/user-study-plans/${userStudyPlanId}/progress/${subjectId}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
    return result.progress;
  },
};
