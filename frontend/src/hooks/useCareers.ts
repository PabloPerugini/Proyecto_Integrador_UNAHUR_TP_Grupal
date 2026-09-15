import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../api';
import type { Career } from '../types';

interface UseCareersOptions {
  scope?: 'all' | 'published';
  onError?: (message: string) => void;
}

export function useCareers({ scope = 'all', onError }: UseCareersOptions = {}) {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiService.getAll(scope === 'published' ? 'published' : undefined);
      setCareers(list);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando los planes';
      setError(message);
      onErrorRef.current?.(message);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  return { careers, setCareers, loading, error, reload: load };
}