import { request } from './client';
import type { Career } from '../types';

export const careersApi = {
  // F1: filtro por instituto. El backend ignora valores no-ObjectId.
  getAll: async (unit?: string) => {
    return request<Career[]>(
      unit ? `/careers?unit=${encodeURIComponent(unit)}` : '/careers',
    );
  },
  create: (data: Partial<Career>) => request<Career>('/careers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Career>) => request<Career>(`/careers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCareer: (id: string) => request<unknown>(`/careers/${id}`, { method: 'DELETE' }),
  // No existe POST /careers/:id/publish en el backend nuevo.
  publish: async (_id: string): Promise<never> => {
    void _id;
    throw new Error('Se publican planes de estudio, no carreras.');
  },
};
