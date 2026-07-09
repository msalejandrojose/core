import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonLabel,
  IonItem,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { notificationsOffOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNotifications, type Notification } from './use-notifications';
import { useUnreadStore } from './notifications.store';
import { CursorList } from '@/components/list';
import { toast } from '@/lib/toast';

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
          <div
            style={{ fontSize: 14, color: 'var(--core-muted)', marginTop: 2 }}
          >
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
 * Pantalla del inbox in-app. Lista las notificaciones del usuario (paginadas
 * sobre el primitivo `CursorList`, MOB-09), con pull-to-refresh, scroll
 * infinito, marcar-como-leída al tocar y "Marcar todo". Al (re)entrar en la
 * pestaña refresca el contador de no leídas para que el badge no quede obsoleto.
 * Es una raíz de tab, así que no lleva botón de volver.
 */
export default function NotificationsPage() {
  const { items, status, unread, hasMore, reload, loadMore, markRead, markAllRead } =
    useNotifications();
  const refreshUnread = useUnreadStore((s) => s.refresh);

  // Al volver a la pestaña, reconcilia el badge sin forzar un skeleton en la
  // lista (refresco silencioso; el usuario puede tirar para recargar el listado).
  useIonViewWillEnter(() => {
    void refreshUnread();
  });

  async function onMarkAll() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // La háptica no existe en web/PWA; no es un error.
    }
    void markAllRead();
    toast.success('Notificaciones marcadas como leídas');
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Notificaciones</IonTitle>
          <IonButtons slot="end">
            {unread > 0 ? (
              <IonButton onClick={onMarkAll}>Marcar todo</IonButton>
            ) : null}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <CursorList
          items={items}
          status={status}
          hasMore={hasMore}
          onReload={reload}
          onLoadMore={loadMore}
          keyFor={(n) => n.id}
          emptyIcon={notificationsOffOutline}
          emptyTitle="No tienes notificaciones."
          errorMessage="No se pudieron cargar las notificaciones."
          renderItem={(n) => <NotificationRow notification={n} onRead={markRead} />}
        />
      </IonContent>
    </IonPage>
  );
}
