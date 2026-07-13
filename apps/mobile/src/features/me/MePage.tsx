import {
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { notificationsOutline, settingsOutline } from 'ionicons/icons';
import { useAuthStore } from '@/store/auth.store';
import { useUnreadStore } from '@/features/notifications/notifications.store';

/**
 * Tab "Perfil": raíz de tab y hub de la cuenta. Estadísticas propias
 * (visitados/wishlist) llegan en TASK-183 junto con "Mi lista", que es quien
 * expone esos datos (`GET /andanzas/site-entries/me`). Mientras tanto, sirve
 * de punto de entrada a Notificaciones y Ajustes, que dejaron de tener tab
 * propia al sustituir el shell genérico (TASK-180).
 */
export default function MePage() {
  const user = useAuthStore((s) => s.user);
  const unread = useUnreadStore((s) => s.unread);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h2 className="core-title" style={{ margin: '8px 4px 4px' }}>
          {user?.firstName?.trim() || 'Hola'}
        </h2>
        <p className="core-subtitle" style={{ margin: '0 4px 28px' }}>
          {user?.email ?? 'Sesión iniciada'}
        </p>

        <IonList inset className="core-group">
          <IonItem
            button
            detail
            lines="inset"
            routerLink="/tabs/notifications"
            routerDirection="forward"
          >
            <span slot="start" className="core-tint-icon" aria-hidden="true">
              <IonIcon icon={notificationsOutline} />
            </span>
            <IonLabel>Notificaciones</IonLabel>
            {unread > 0 ? (
              <IonBadge slot="end" color="primary">
                {unread > 99 ? '99+' : unread}
              </IonBadge>
            ) : null}
          </IonItem>

          <IonItem
            button
            detail
            lines="none"
            routerLink="/tabs/settings"
            routerDirection="forward"
          >
            <span
              slot="start"
              className="core-tint-icon core-tint-icon--purple"
              aria-hidden="true"
            >
              <IonIcon icon={settingsOutline} />
            </span>
            <IonLabel>Ajustes</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
}
