import { request } from './client';
import type { User, CreateUserPayload } from '../types';
interface LoginResult { user: User; token?: string; message?: string }
interface RegisterResult { user: User; message?: string }
export const usersApi = {
  loginUser: async (nickName: string, password: string): Promise<User> => {
    const result = await request<LoginResult>('/users/login', {
      method: 'POST', body: JSON.stringify({ nickName, password }),
    });
    if (!result.user?._id) throw new Error('El servidor no devolvió un usuario válido');
    return result.user;
  },
  createUser: async (data: CreateUserPayload): Promise<User> => {
    const result = await request<RegisterResult>('/users/register', {
      method: 'POST', body: JSON.stringify(data),
    });
    if (!result.user?._id) throw new Error('El servidor no devolvió el usuario creado');
    return result.user;
  },
  getAll: () => request<User[]>('/users'),
  updateUser: async (nickName: string, data: Partial<CreateUserPayload> & { rol?: 'ADMIN' | 'USUARIO' }): Promise<User> => {
    const result = await request<{ user: User }>(`/users/${encodeURIComponent(nickName)}`, {
      method: 'PATCH', body: JSON.stringify(data),
    });
    if (!result.user?._id) throw new Error('El servidor no devolvió el usuario actualizado');
    return result.user;
  },
  getMe: () => request<User>('/users/me'),
  logout: () => request<{ message: string }>('/users/logout', { method: 'POST' }),
  deleteUser: (nickName: string) =>
    request<{ message: string }>(`/users/${encodeURIComponent(nickName)}`, { method: 'DELETE' }),
};
