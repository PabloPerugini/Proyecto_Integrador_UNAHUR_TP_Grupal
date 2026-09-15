import Spinner from 'react-bootstrap/Spinner';

interface PageLoaderProps {
  text?: string;
  pad?: string;
}

export default function PageLoader({ text = 'Cargando…', pad = 'py-5' }: PageLoaderProps) {
  return (
    <div className={`text-center text-muted ${pad}`}>
      <Spinner animation="border" role="status" aria-label="Cargando" />
      <div className="mt-2 small">{text}</div>
    </div>
  );
}