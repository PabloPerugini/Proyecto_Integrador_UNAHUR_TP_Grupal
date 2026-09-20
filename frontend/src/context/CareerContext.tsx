import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { CareerSelectionContext } from './CareerContextValue';

const CAREER_KEY = 'gca-selected-career';

export function CareerSelectionProvider({ children }: { children: ReactNode }) {
  const [careerId, setCareerIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CAREER_KEY) ?? null;
    } catch {
      return null;
    }
  });

  const setCareerId = useCallback((id: string | null) => {
    setCareerIdState(id);
    try {
      if (id) localStorage.setItem(CAREER_KEY, id);
      else localStorage.removeItem(CAREER_KEY);
    } catch {
      // storage no disponible
    }
  }, []);

  const value = useMemo(() => ({ careerId, setCareerId }), [careerId, setCareerId]);

  return (
    <CareerSelectionContext.Provider value={value}>
      {children}
    </CareerSelectionContext.Provider>
  );
}