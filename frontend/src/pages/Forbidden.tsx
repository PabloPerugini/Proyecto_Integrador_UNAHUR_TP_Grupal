import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { IconBoard } from '../components/icons';

export default function Forbidden() {
  return (
    <EmptyState
      icon={<IconBoard size={46} />}
      title="No tenés permiso para ver esto"
      text="Esta sección es solo para administradores."
      action={
        <Link to="/" className="btn btn-gradify">
          Volver al inicio
        </Link>
      }
    />
  );
}
