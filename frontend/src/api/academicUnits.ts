import { request } from './client';
import type { AcademicUnit } from '../types';

export const academicUnitsApi = {
  getAll: (withCounts = false) =>
    request<AcademicUnit[]>(
      `/academic-units${withCounts ? '?withCounts=1' : ''}`,
    ),
};
