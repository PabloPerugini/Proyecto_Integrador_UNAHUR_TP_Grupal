import { useEffect } from 'react';
import { Alert } from 'react-bootstrap';
import type { FlashMessage } from '../hooks/useFlashMessage';

interface MessageBannerProps {
  message: FlashMessage | null;
  onClose: () => void;
}

// Notificación flotante (esquina superior derecha). Los éxitos y avisos se
// cierran solos; los errores quedan hasta que el usuario los descarte.
export default function MessageBanner({ message, onClose }: MessageBannerProps) {
  useEffect(() => {
    if (!message || message.type === 'danger') return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const isError = message.type === 'danger';

  return (
    <div
      className="toast-float"
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <Alert
        variant={message.type}
        dismissible
        onClose={onClose}
        className="mb-0 shadow-sm"
      >
        {message.text}
      </Alert>
    </div>
  );
}
