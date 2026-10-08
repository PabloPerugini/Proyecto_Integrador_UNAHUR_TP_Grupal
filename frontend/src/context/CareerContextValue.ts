import { createContext } from 'react';

export interface CareerSelectionContextType {
  careerId: string | null;
  setCareerId: (id: string | null) => void;
}

export const CareerSelectionContext = createContext<CareerSelectionContextType | null>(null);