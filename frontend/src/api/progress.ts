import { request, uploadPdf } from './client';
import type { ParsedSubject } from '../types';

export interface PersonalPdfResult {
  detectedCount: number;
  subjects: ParsedSubject[];
}
export const progressApi = {
  // Endpoint histórico. La pantalla de progreso nueva utiliza SubjectProgress.
  parsePersonal: (file: File) => uploadPdf<PersonalPdfResult>('/progress/parse-history', file),
  getMine: (careerId: string) => request<unknown>(`/progress/me?careerId=${encodeURIComponent(careerId)}`),
};
