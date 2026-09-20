import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiService } from '../api';
import { AuthContext } from './AuthContextValue';
import type { AuthStatus } from './AuthContextValue';
import type { User } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const logout = useCallback(() => {
    void apiService.logout().catch(() => {});
    setUser(null);
    setStatus('guest');
  }, []);

  useEffect(() => {
    let alive = true;
    apiService
      .getMe()
      .then((me) => {
        if (alive) {
          setUser(me);
          setStatus('authed');
        }
      })
      .catch(() => {
        if (alive) setStatus('guest');
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [logout]);

  const login = useCallback(async (nickName: string, password: string) => {
    const loggedUser = await apiService.loginUser(nickName, password);
    setUser(loggedUser);
    setStatus('authed');
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}