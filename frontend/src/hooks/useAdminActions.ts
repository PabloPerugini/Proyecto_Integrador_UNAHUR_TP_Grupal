import { useCallback, useState } from 'react';
import { apiService } from '../api';
import type { Career } from '../types';
import type { FlashMessage } from './useFlashMessage';

// Acciones de administración compartidas por UploadPlan y PlanAdmin
// (Fase 5 §11.4): publicar, pedir confirmación y eliminar. La única
// divergencia (PlanAdmin navega a /admin al borrar la seleccionada) entra
// por afterDelete; el resto es idéntico.
export const CONFIRM_DELETE = (name: string) =>
  `¿Eliminar el plan "${name}"? Se borrarán también todas sus materias y el avance de los usuarios. Esta acción no se puede deshacer.`;

interface AdminActionsOptions {
  reload: () => Promise<unknown>;
  flash: (type: FlashMessage['type'], text: string) => void;
  flashFromError: (err: unknown, fallback: string) => void;
  isSelected?: (id: string) => boolean;
  clearSelection?: () => void;
  afterDelete?: () => void;
}

export function useAdminActions({
  reload,
  flash,
  flashFromError,
  isSelected,
  clearSelection,
  afterDelete,
}: AdminActionsOptions) {
  const [candidate, setCandidate] = useState<Career | null>(null);
  const [deleting, setDeleting] = useState(false);

  const publish = useCallback(
    async (id: string) => {
      try {
        await apiService.publish(id);
        flash('success', 'Carrera publicada');
        await reload();
      } catch (err) {
        flashFromError(err, 'Error publicando la carrera');
      }
    },
    [flash, flashFromError, reload],
  );

  const confirmRemove = useCallback(async () => {
    if (!candidate) return;
    setDeleting(true);
    try {
      await apiService.deleteCareer(candidate._id);
      if (isSelected?.(candidate._id)) clearSelection?.();
      flash('success', `Plan "${candidate.name}" eliminado`);
      setCandidate(null);
      afterDelete?.();
      await reload();
    } catch (err) {
      flashFromError(err, 'Error eliminando el plan');
    } finally {
      setDeleting(false);
    }
  }, [candidate, isSelected, clearSelection, afterDelete, flash, flashFromError, reload]);

  return { candidate, setCandidate, deleting, publish, confirmRemove, CONFIRM_DELETE };
}
