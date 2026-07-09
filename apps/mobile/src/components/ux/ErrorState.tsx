import { alertCircleOutline } from 'ionicons/icons';
import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  /** Mensaje de error legible. */
  message?: string;
  /** Handler de reintento. Si se pasa, muestra el botón "Reintentar". */
  onRetry?: () => void;
  /** Texto del botón (default "Reintentar"). */
  retryLabel?: string;
  /** Oculta el icono de alerta (para errores inline discretos). */
  hideIcon?: boolean;
}

/**
 * Estado de error inline con reintento. Reutiliza `EmptyState` para mantener el
 * mismo aire editorial; unifica los "No se pudieron cargar…" + botón Reintentar
 * que estaban duplicados en la home y el inbox.
 */
export function ErrorState({
  message = 'Algo no ha ido bien. Vuelve a intentarlo.',
  onRetry,
  retryLabel = 'Reintentar',
  hideIcon = false,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={hideIcon ? undefined : alertCircleOutline}
      title="Se ha producido un error"
      description={message}
      actionLabel={onRetry ? retryLabel : undefined}
      onAction={onRetry}
    />
  );
}
