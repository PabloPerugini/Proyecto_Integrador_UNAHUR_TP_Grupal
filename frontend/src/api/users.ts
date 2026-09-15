import { request } from './client';
import type { User, CreateUserPayload } from '../types';

export const usersApi = {
  loginUser: (nickName: string, password: string) =>
    request<User>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ nickName, password }),
    }),
  createUser: (data: CreateUserPayload) =>
    request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};