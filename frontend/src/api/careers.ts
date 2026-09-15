import { request, uploadPdf } from './client';
import type { Career, GraphData, ParsedSubject, ParseCorrelativasResponse, Subject } from '../types';

export const careersApi = {
  getAll: (status?: string) =>
    request<Career[]>(`/careers${status ? `?status=${status}` : ''}`),

  create: (data: Partial<Career>) =>
    request<Career>('/careers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  publish: (id: string) =>
    request<Career>(`/careers/${id}/publish`, { method: 'POST' }),

  update: (id: string, data: Partial<Career>) =>
    request<Career>(`/careers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getSubjects: (id: string) => request<Subject[]>(`/careers/${id}/subjects`),

  parseOfficial: (id: string, file: File) =>
    uploadPdf<{
      subjects: ParsedSubject[];
      detectedCount: number;
      intermediateTitle?: string | null;
      creditsFinal?: number;
      creditsIntermediate?: number;
    }>(`/careers/${id}/parse-official`, file),

  saveSubjects: (
    id: string,
    subjects: Partial<Subject>[],
    intermediateTitle?: string | null,
    creditsFinal?: number,
    creditsIntermediate?: number,
  ) =>
    request<{ saved: number; total: number }>(`/careers/${id}/subjects`, {
      method: 'POST',
      body: JSON.stringify({
        subjects,
        ...(intermediateTitle ? { intermediateTitle } : {}),
        ...(creditsFinal && creditsFinal > 0 ? { creditsFinal } : {}),
        ...(creditsIntermediate && creditsIntermediate > 0 ? { creditsIntermediate } : {}),
      }),
    }),

  parseCorrelativas: (id: string, file: File) =>
    uploadPdf<ParseCorrelativasResponse>(`/careers/${id}/parse-correlativas`, file),

  saveCorrelativas: (id: string, subjects: { code: string; name: string; requires: string[] }[]) =>
    request<{ saved: number; total: number }>(`/careers/${id}/correlativas`, {
      method: 'POST',
      body: JSON.stringify({ subjects }),
    }),

  getGraph: (id: string) => request<GraphData>(`/careers/${id}/graph`),

  deleteCareer: (id: string) =>
    request<{ deleted: string; deletedId: string }>(`/careers/${id}`, { method: 'DELETE' }),
};