import { useEffect } from 'react';
import { Button, Modal } from 'react-bootstrap';

interface ModalConfirmProps {
  show: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'success' | 'primary' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ModalConfirm({
  show,
  title,
  message,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: ModalConfirmProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, loading, onClose]);

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" size="sm" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant={variant} size="sm" onClick={onConfirm} disabled={loading}>
          {loading ? 'Procesando…' : confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}