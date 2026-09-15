import { request, uploadPdf } from './client';
import type { ParsedSubject, ProgressEntry, ProgressSummary } from '../types';

export const progressApi = {
  parsePersonal: (file: File) =>
    uploadPdf<{ subjects: ParsedSubject[]; detectedCount: number; careerHint: string | null; intermediateTitle?: string | null }>(
      '/progress/parse-history',
      file,
    ),

  save: (careerId: string, entries: ProgressEntry[]) =>
    request<{ saved: number }>('/progress', {
      method: 'POST',
      body: JSON.stringify({ careerId, entries }),
    }),

  getMine: (careerId?: string) =>
    request<{ entries: ProgressEntry[]; summary: ProgressSummary | null }>(
      `/progress/me${careerId ? `?careerId=${careerId}` : ''}`,
    ),
};