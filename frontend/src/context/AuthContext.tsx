import { createContext, useState, useCallback, type ReactNode } from 'react';
import { apiService } from '../api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (nickName: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const login = useCallback(async (nickName: string, password: string) => {
    const loggedUser = await apiService.loginUser(nickName, password);
    setUser(loggedUser);
    localStorage.setItem('user', JSON.stringify(loggedUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };