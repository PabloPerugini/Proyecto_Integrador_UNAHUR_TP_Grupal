import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface CareerSelectionContextType {
  careerId: string | null;
  setCareerId: (id: string | null) => void;
}

const CareerSelectionContext = createContext<CareerSelectionContextType | null>(null);

// Conservamos el nombre público del contexto, pero ahora la selección es un ID de StudyPlan.
// Clave nueva: evita recuperar un ID antiguo de Career que ya no corresponde al grafo.
const CAREER_KEY = 'gradify-selected-study-plan';

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

  return (
    <CareerSelectionContext.Provider value={{ careerId, setCareerId }}>
      {children}
    </CareerSelectionContext.Provider>
  );
}

export function useCareerSelection() {
  const ctx = useContext(CareerSelectionContext);
  if (!ctx) throw new Error('useCareerSelection debe usarse dentro de <CareerSelectionProvider>');
  return ctx;
}