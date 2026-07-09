import { useEffect } from 'react';
import { useIonRouter } from '@ionic/react';
import { registerPush } from './push';
import { useUnreadStore } from './notifications.store';

/**
 * Arranca las push nativas para el área autenticada. Cuando llega una
 * notificación en primer plano refresca el badge de no leídas; al tocar una
 * navega a su deep-link. No-op en web/PWA (lo detecta el servicio).
 *
 * Se monta una sola vez (en TabsShell) para no duplicar listeners; por eso el
 * efecto corre sin dependencias reactivas y captura router/refresh del primer
 * render (ambos estables durante la sesión autenticada).
 */
export function usePushNotifications() {
  const refreshUnread = useUnreadStore((s) => s.refresh);
  const router = useIonRouter();

  useEffect(() => {
    let cleanup = () => {};
    void registerPush({
      onReceived: () => {
        void refreshUnread();
      },
      onAction: (deepLink) => {
        void refreshUnread();
        if (deepLink) router.push(deepLink, 'forward');
      },
    }).then((dispose) => {
      cleanup = dispose;
    });
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
