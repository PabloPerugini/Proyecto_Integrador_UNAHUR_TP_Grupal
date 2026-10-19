import { request } from './client';
import type { AcademicUnit } from '../types';

export interface AcademicUnitPayload {
  name?: string;
  type?: string;
  description?: string;
  color?: string | null;
  university?: string;
  parentUnit?: string | null;
}

export const academicUnitsApi = {
  getAll: (withCounts = false) =>
    request<AcademicUnit[]>(
      `/academic-units${withCounts ? '?withCounts=1' : ''}`,
    ),
  create: async (data: AcademicUnitPayload) => {
    const result = await request<{ academicUnit: AcademicUnit }>(
      '/academic-units',
      { method: 'POST', body: JSON.stringify(data) },
    );
    return result.academicUnit;
  },
  update: async (id: string, data: AcademicUnitPayload) => {
    const result = await request<{ academicUnit: AcademicUnit }>(
      `/academic-units/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) },
    );
    return result.academicUnit;
  },
  remove: (id: string) =>
    request<unknown>(`/academic-units/${id}`, { method: 'DELETE' }),
};
