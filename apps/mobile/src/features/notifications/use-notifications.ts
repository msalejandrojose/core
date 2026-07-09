import { useCallback } from 'react';
import type { components } from '@core/api-client';
import { apiClient } from '@/api/client';
import { useCursorList, type CursorFetcher } from '@/components/list';
import { useUnreadStore } from './notifications.store';

/** Una notificación in-app tal como la devuelve `GET /me/notifications`. */
export type Notification = components['schemas']['UserNotificationResponseDto'];

/**
 * Inbox de notificaciones del usuario. La paginación por cursor se delega en el
 * primitivo `useCursorList` (MOB-09); aquí solo vive lo específico de
 * notificaciones: el contador de no leídas (store compartido con el badge del
 * tab bar) y las mutaciones (marcar una / todas como leídas) con actualización
 * optimista del estado local.
 */
export function useNotifications() {
  // El contador de no leídas vive en un store compartido para que el badge del
  // tab bar y esta pantalla no se desincronicen.
  const unread = useUnreadStore((s) => s.unread);
  const refreshUnread = useUnreadStore((s) => s.refresh);
  const decrementUnread = useUnreadStore((s) => s.decrement);
  const resetUnread = useUnreadStore((s) => s.reset);

  const fetcher = useCallback<CursorFetcher<Notification>>(
    async ({ cursor, limit }) => {
      const { data, error } = await apiClient.GET('/me/notifications', {
        params: { query: { limit, cursor: cursor ?? undefined } },
      });
      if (error || !data) return null;
      return { data: data.data, meta: data.meta };
    },
    [],
  );

  const {
    items,
    status,
    hasMore,
    reload: reloadList,
    loadMore,
    setItems,
  } = useCursorList<Notification>(fetcher, { limit: 20 });

  // Recargar la lista (pull-to-refresh) reconcilia también el contador con el
  // servidor. La reconciliación al abrir la pestaña la hace la pantalla
  // (view-enter) y TabsShell al montar; el hook solo aplica los cambios
  // optimistas de marcar-como-leída para no pisarlos con una relectura tardía.
  const reload = useCallback(async () => {
    await reloadList();
    void refreshUnread();
  }, [reloadList, refreshUnread]);

  const markRead = useCallback(
    async (id: string) => {
      // Determina si estaba sin leer con los items actuales (síncrono), no dentro
      // del updater de setState —que React puede ejecutar más tarde—.
      const wasUnread = items.some((n) => n.id === id && n.readAt === null);
      if (!wasUnread) return;

      // Optimista: marca localmente y decrementa el contador antes del round-trip.
      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      decrementUnread();
      try {
        await apiClient.PATCH('/me/notifications/{id}/read', {
          params: { path: { id } },
        });
      } catch {
        void reload(); // Revertir al estado real del servidor si falla.
      }
    },
    [items, setItems, decrementUnread, reload],
  );

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    resetUnread();
    try {
      await apiClient.POST('/me/notifications/read-all');
    } catch {
      void reload();
    }
  }, [setItems, resetUnread, reload]);

  return {
    items,
    status,
    unread,
    hasMore,
    reload,
    loadMore,
    markRead,
    markAllRead,
  };
}
