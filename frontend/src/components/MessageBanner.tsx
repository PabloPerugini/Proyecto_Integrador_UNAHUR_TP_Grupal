import { Alert } from 'react-bootstrap';
import type { FlashMessage } from '../hooks/useFlashMessage';

interface MessageBannerProps {
  message: FlashMessage | null;
  onClose: () => void;
}

export default function MessageBanner({ message, onClose }: MessageBannerProps) {
  if (!message) return null;
  return (
    <Alert variant={message.type} dismissible onClose={onClose} role="alert">
      {message.text}
    </Alert>
  );
}