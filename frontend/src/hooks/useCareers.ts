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

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiService.getAll(scope === 'published' ? 'published' : undefined);
      setCareers(list);
    } catch (err) {
      onErrorRef.current?.(err instanceof Error ? err.message : 'Error cargando los planes');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  return { careers, loading, reload: load };
}