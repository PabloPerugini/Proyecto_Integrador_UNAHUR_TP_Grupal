import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from 'react-bootstrap';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de renderizado:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="text-center py-5">
        <h1 className="display-5">Algo salió mal</h1>
        <p className="text-muted">
          Ocurrió un error inesperado al mostrar esta pantalla.
        </p>
        {this.state.error.message && (
          <p className="text-danger small">{this.state.error.message}</p>
        )}
        <Button variant="primary" onClick={() => window.location.reload()}>
          Recargar la aplicación
        </Button>
      </div>
    );
  }
}