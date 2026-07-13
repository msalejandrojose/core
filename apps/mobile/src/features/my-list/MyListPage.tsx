import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { listOutline } from 'ionicons/icons';
import { EmptyState } from '@/components/ux';

/**
 * Tab "Mi lista": ranking personal (visitados, ordenados por nota) y wishlist
 * (quiero ir). Contenido real llega en TASK-183, sobre
 * `GET /andanzas/site-entries/me`.
 */
export default function MyListPage() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mi lista</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <EmptyState
          icon={listOutline}
          title="Aún no has guardado ningún sitio"
          description="Los sitios que visites o quieras visitar aparecerán aquí, ordenados por tu puntuación."
        />
      </IonContent>
    </IonPage>
  );
}
