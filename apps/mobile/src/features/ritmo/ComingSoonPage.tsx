import { IonContent, IonHeader, IonPage, IonToolbar } from '@ionic/react';
import { EmptyState } from '@/components/ux';

interface ComingSoonPageProps {
  title: string;
  icon: string;
  heading: string;
  description: string;
}

/**
 * Pestaña que ya ocupa su sitio en la tab bar del diseño pero aún no tiene
 * pantalla (Plan, Social). Se sustituye en su tarea de diseño; mientras, dice
 * con honestidad qué va a haber aquí en vez de mostrar datos inventados.
 */
export function ComingSoonPage({ title, icon, heading, description }: ComingSoonPageProps) {
  return (
    <IonPage>
      {/* Cabecera vacía: da el mismo hueco superior (y safe area) que Hoy. */}
      <IonHeader className="ion-no-border">
        <IonToolbar />
      </IonHeader>
      <IonContent>
        <div className="ritmo-screen">
          <h1 className="ritmo-large-title">{title}</h1>
          <div className="core-card">
            <EmptyState icon={icon} title={heading} description={description} />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
