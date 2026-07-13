import {
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { addOutline, listOutline } from 'ionicons/icons';
import { EmptyState } from '@/components/ux';

/**
 * Tab "Mi lista": ranking personal (visitados, ordenados por nota) y wishlist
 * (quiero ir). El listado real llega en TASK-183, sobre
 * `GET /andanzas/site-entries/me`; el FAB "+" ya lleva al flujo de añadir
 * sitio construido en TASK-181.
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

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton routerLink="/tabs/list/add">
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
}
