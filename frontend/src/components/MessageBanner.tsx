import { useEffect } from 'react';
import { Alert } from 'react-bootstrap';
import type { FlashMessage } from '../hooks/useFlashMessage';

interface MessageBannerProps {
  message: FlashMessage | null;
  onClose: () => void;
}

// Notificación flotante (esquina superior derecha) con autocierre.
export default function MessageBanner({ message, onClose }: MessageBannerProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="toast-float" role="status" aria-live="polite">
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
