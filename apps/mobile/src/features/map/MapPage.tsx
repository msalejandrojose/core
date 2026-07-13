import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { mapOutline } from 'ionicons/icons';
import { EmptyState } from '@/components/ux';

/**
 * Tab "Mapa": pines de tus sitios (TASK-181/183) y, más adelante, de tu feed
 * de amigos (TASK-184). Placeholder hasta que esas tareas aterricen contenido.
 */
export default function MapPage() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mapa</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <EmptyState
          icon={mapOutline}
          title="Tu mapa está en camino"
          description="Aquí verás los pines de tus sitios en cuanto tengas alguno guardado."
        />
      </IonContent>
    </IonPage>
  );
}
