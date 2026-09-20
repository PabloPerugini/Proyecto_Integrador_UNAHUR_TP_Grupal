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
  const [reloadToken, setReloadToken] = useState(0);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let alive = true;
    apiService
      .getAll(scope === 'published' ? 'published' : undefined)
      .then((list) => {
        if (alive) setCareers(list);
      })
      .catch((err) => {
        if (!alive) return;
        const message = err instanceof Error ? err.message : 'Error cargando los planes';
        onErrorRef.current?.(message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [scope, reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  return { careers, loading, reload };
}