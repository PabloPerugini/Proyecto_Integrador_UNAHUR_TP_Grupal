import { Link } from 'react-router-dom';

export default function Error404() {
  return (
    <div className="text-center py-5">
      <h1 className="display-1">404</h1>
      <p className="text-muted">La página que buscás no existe.</p>
      <Link to="/" className="btn btn-primary">
        Volver al inicio
      </Link>
    </div>
  );
}