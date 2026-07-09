import type { ReactNode } from 'react';
import { IonButton, IonIcon } from '@ionic/react';

interface EmptyStateProps {
  /** Icono de ionicons (opcional). Se pinta en muted, tamaño grande. */
  icon?: string;
  /** Título corto. */
  title: string;
  /** Descripción secundaria opcional. */
  description?: string;
  /** Texto del botón de acción opcional (p. ej. "Reintentar"). */
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

/**
 * Estado vacío centrado y aireado (DS §1: editorial, sin ruido). Unifica los
 * bloques "no hay nada aún" que se repetían inline en varias pantallas. Para el
 * estado de error usa `ErrorState`, que es este mismo patrón con acción de
 * reintento por defecto.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '56px 24px',
        gap: 12,
      }}
    >
      {icon ? (
        <IonIcon
          icon={icon}
          aria-hidden="true"
          style={{ fontSize: 40, color: 'var(--core-muted)' }}
        />
      ) : null}
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--ion-text-color)',
          }}
        >
          {title}
        </p>
        {description ? (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 14,
              color: 'var(--core-muted)',
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <IonButton fill="clear" onClick={onAction}>
          {actionLabel}
        </IonButton>
      ) : null}
      {children}
    </div>
  );
}
