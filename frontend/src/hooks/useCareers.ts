import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../api';
import type { Career } from '../types';

interface UseCareersOptions {
  scope?: 'all' | 'published';
  unit?: string;
  onError?: (message: string) => void;
}

export function useCareers({ scope = 'all', unit, onError }: UseCareersOptions = {}) {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // scope legado sin efecto en backend; el filtro real es unit.
      void scope;
      const list = await apiService.getAll(unit);
      setCareers(Array.isArray(list) ? list : []);
    } catch (err) {
      onErrorRef.current?.(err instanceof Error ? err.message : 'Error cargando los planes');
    } finally {
      setLoading(false);
    }
  }, [scope, unit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { careers, loading, reload: load };
}