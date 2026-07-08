import type { CSSProperties, ReactNode } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
} from '@ionic/react';

interface Props {
  title: string;
  subtitle?: string;
  /** Destino del botón atrás cuando no hay historial (enlaces desde email). */
  backHref?: string;
  children: ReactNode;
}

/**
 * Contenedor común de las pantallas de auth secundarias (recuperar/restablecer
 * contraseña, verificar email). Look editorial y tranquilo como el login:
 * columna centrada, título serif y aire. Header transparente con botón atrás.
 */
export default function AuthShell({
  title,
  subtitle,
  backHref = '/login',
  children,
}: Props) {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': 'transparent' } as CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref={backHref} text="" />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ maxWidth: 420, margin: '0 auto', paddingTop: '4vh' }}>
          <h1 className="core-title" style={{ marginBottom: subtitle ? 6 : 20 }}>
            {title}
          </h1>
          {subtitle ? (
            <p className="core-subtitle" style={{ marginBottom: 28 }}>
              {subtitle}
            </p>
          ) : null}
          {children}
        </div>
      </IonContent>
    </IonPage>
  );
}
