import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonList,
  IonItem,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  type RefresherEventDetail,
} from '@ionic/react';
import { chevronBack, notificationsOffOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNotifications, type Notification } from './use-notifications';

interface Props {
  onBack: () => void;
}

/** Tiempo relativo compacto tipo iOS: "ahora", "5 min", "2 h", "3 d", o fecha. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return 'ahora';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD} d`;
  return new Date(iso).toLocaleDateString();
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const unread = notification.readAt === null;
  return (
    <IonItem
      button
      detail={false}
      lines="inset"
      onClick={() => unread && onRead(notification.id)}
    >
      {/* Punto clay de no leída (ocupa hueco fijo para alinear el texto). */}
      <span
        aria-hidden="true"
        slot="start"
        style={{
          width: 8,
          height: 8,
          borderRadius: '9999px',
          marginInlineEnd: 4,
          background: unread ? 'var(--ion-color-primary)' : 'transparent',
          flex: '0 0 auto',
        }}
      />
      <IonLabel className="ion-text-wrap">
        <div
          style={{
            fontSize: 16,
            fontWeight: unread ? 550 : 450,
            color: 'var(--ion-text-color)',
          }}
        >
          {notification.title}
        </div>
        {notification.body ? (
          <div style={{ fontSize: 14, color: 'var(--core-muted)', marginTop: 2 }}>
            {notification.body}
          </div>
        ) : null}
      </IonLabel>
      <span
        slot="end"
        style={{ fontSize: 12, color: 'var(--core-muted)', flex: '0 0 auto' }}
      >
        {relativeTime(notification.createdAt)}
      </span>
    </IonItem>
  );
}

/**
 * Pantalla del inbox in-app. Lista las notificaciones del usuario (paginadas),
 * con pull-to-refresh, scroll infinito, marcar-como-leída al tocar y
 * "Marcar todo". Estados de carga / error / vacío cuidados (skeleton sobre
 * superficie, nunca spinner a pantalla completa).
 */
export default function NotificationsPage({ onBack }: Props) {
  const {
    items,
    status,
    unread,
    hasMore,
    reload,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications();

  async function handleRefresh(e: CustomEvent<RefresherEventDetail>) {
    await reload();
    e.detail.complete();
  }

  async function onMarkAll() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // La háptica no existe en web/PWA; no es un error.
    }
    void markAllRead();
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onBack} aria-label="Volver">
              <IonIcon slot="icon-only" icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>Notificaciones</IonTitle>
          <IonButtons slot="end">
            {unread > 0 ? (
              <IonButton onClick={onMarkAll}>Marcar todo</IonButton>
            ) : null}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {status === 'loading' ? (
          <div className="core-group" style={{ padding: '4px 0' }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 18,
                  margin: '18px 16px',
                  borderRadius: 6,
                  background: 'var(--core-surface-inset)',
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        ) : status === 'error' ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ color: 'var(--core-muted)', marginBottom: 16 }}>
              No se pudieron cargar las notificaciones.
            </p>
            <IonButton fill="clear" onClick={() => void reload()}>
              Reintentar
            </IonButton>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <IonIcon
              icon={notificationsOffOutline}
              style={{ fontSize: 40, color: 'var(--core-muted)' }}
              aria-hidden="true"
            />
            <p style={{ color: 'var(--core-muted)', marginTop: 12 }}>
              No tienes notificaciones.
            </p>
          </div>
        ) : (
          <>
            <IonList inset className="core-group">
              {items.map((n) => (
                <NotificationRow key={n.id} notification={n} onRead={markRead} />
              ))}
            </IonList>

            <IonInfiniteScroll
              disabled={!hasMore}
              onIonInfinite={async (e) => {
                await loadMore();
                await e.target.complete();
              }}
            >
              <IonInfiniteScrollContent>
                <IonSpinner name="dots" />
              </IonInfiniteScrollContent>
            </IonInfiniteScroll>
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
