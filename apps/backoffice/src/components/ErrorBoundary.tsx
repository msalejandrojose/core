import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Captura errores de render no controlados y muestra un fallback amable en vez
 * de una pantalla en blanco. Es un class component porque React aún no expone
 * error boundaries con hooks.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, info);
  }

  private handleReload = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="text-destructive" size={40} />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Algo ha ido mal</h1>
          <p className="text-muted-foreground text-sm">
            Ha ocurrido un error inesperado. Puedes volver al inicio e
            intentarlo de nuevo.
          </p>
        </div>
        <Button onClick={this.handleReload}>Volver al inicio</Button>
      </div>
    );
  }
}
