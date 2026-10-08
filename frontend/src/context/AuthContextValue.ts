import { createContext } from 'react';
import type { User } from '../types';

export type AuthStatus = 'loading' | 'authed' | 'guest';

export interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  login: (nickName: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);