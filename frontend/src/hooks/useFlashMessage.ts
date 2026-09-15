import { useCallback, useState } from 'react';

export interface FlashMessage {
  type: 'success' | 'danger' | 'info' | 'warning';
  text: string;
}

export function useFlashMessage() {
  const [msg, setMsg] = useState<FlashMessage | null>(null);

  const flash = useCallback((type: FlashMessage['type'], text: string) => setMsg({ type, text }), []);
  const clear = useCallback(() => setMsg(null), []);
  const flashFromError = useCallback(
    (err: unknown, fallback: string) => setMsg({ type: 'danger', text: err instanceof Error ? err.message : fallback }),
    [],
  );

  return { msg, flash, clear, flashFromError };
}