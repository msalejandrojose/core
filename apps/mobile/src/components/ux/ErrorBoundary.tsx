import { Component, type ErrorInfo, type ReactNode } from 'react';
import { IonButton } from '@ionic/react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Error boundary global. Captura errores de render de cualquier pantalla y
 * muestra una pantalla de recuperación en vez de un WebView en blanco (que es
 * lo que vería el usuario en nativo sin esto). "Reintentar" limpia el error y
 * vuelve a montar el árbol; si el fallo es persistente, recargar la app.
 *
 * Nota: los boundaries de React solo capturan errores de render/lifecycle, no
 * los de handlers async (esos los cubren los estados de error por pantalla).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En producción esto alimentaría el error tracking (Sentry, TASK-21).
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          height: '100%',
          padding: '32px 24px',
          gap: 12,
          background: 'var(--ion-background-color)',
        }}
      >
        <h2 className="core-title">Algo se ha roto</h2>
        <p style={{ margin: 0, color: 'var(--core-muted)', maxWidth: 320 }}>
          Ha ocurrido un error inesperado en la app. Puedes reintentar; si sigue
          fallando, cierra y vuelve a abrirla.
        </p>
        <IonButton onClick={this.reset} style={{ marginTop: 8 }}>
          Reintentar
        </IonButton>
      </div>
    );
  }
}
