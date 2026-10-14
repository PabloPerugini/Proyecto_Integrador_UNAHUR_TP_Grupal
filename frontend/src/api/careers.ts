import { request } from './client';
import type { Career } from '../types';

export const careersApi = {
  // F1: filtro por instituto. El backend ignora valores no-ObjectId.
  getAll: async (unit?: string, includeArchived = false) => {
    const params = new URLSearchParams();
    if (unit) params.set('unit', unit);
    if (includeArchived) params.set('includeArchived', '1');
    const query = params.toString();
    return request<Career[]>(`/careers${query ? `?${query}` : ''}`);
  },
  create: (data: Partial<Career>) => request<Career>('/careers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Omit<Partial<Career>, 'continuesIn'> & { continuesIn?: string[] }) => request<Career>(`/careers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCareer: (id: string) => request<unknown>(`/careers/${id}`, { method: 'DELETE' }),
  // No existe POST /careers/:id/publish en el backend nuevo.
  publish: async (_id: string): Promise<never> => {
    void _id;
    throw new Error('Se publican planes de estudio, no carreras.');
  },
};
