import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { peopleOutline } from 'ionicons/icons';
import { EmptyState } from '@/components/ux';

/**
 * Tab "Feed": sitios visitados y puntuados por la gente que sigues, más
 * recientes primero. Contenido real llega en TASK-184, sobre
 * `GET /andanzas/feed`.
 */
export default function FeedPage() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Feed</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <EmptyState
          icon={peopleOutline}
          title="Todavía no sigues a nadie"
          description="Cuando sigas a otros usuarios, verás aquí los sitios que van puntuando."
        />
      </IonContent>
    </IonPage>
  );
}
