import { useContext } from 'react';
import { CareerSelectionContext } from '../context/CareerContextValue';

export function useCareerSelection() {
  const ctx = useContext(CareerSelectionContext);
  if (!ctx) throw new Error('useCareerSelection debe usarse dentro de <CareerSelectionProvider>');
  return ctx;
}