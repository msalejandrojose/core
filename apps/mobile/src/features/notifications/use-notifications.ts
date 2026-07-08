import { useCallback, useEffect, useState } from 'react';
import type { components } from '@core/api-client';
import { apiClient } from '@/api/client';
import { useUnreadStore } from './notifications.store';

/** Una notificación in-app tal como la devuelve `GET /me/notifications`. */
export type Notification = components['schemas']['UserNotificationResponseDto'];

type Status = 'loading' | 'ready' | 'error';

/**
 * Inbox de notificaciones del usuario. Encapsula la paginación por cursor de
 * `GET /me/notifications`, el contador de no leídas y las mutaciones (marcar
 * una / todas como leídas) con actualización optimista del estado local.
 */
export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // El contador de no leídas vive en un store compartido para que el badge del
  // tab bar y esta pantalla no se desincronicen.
  const unread = useUnreadStore((s) => s.unread);
  const refreshUnread = useUnreadStore((s) => s.refresh);
  const decrementUnread = useUnreadStore((s) => s.decrement);
  const resetUnread = useUnreadStore((s) => s.reset);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data, error } = await apiClient.GET('/me/notifications', {
        params: { query: { limit: 20 } },
      });
      if (error || !data) {
        setStatus('error');
        return;
      }
      setItems(data.data);
      setNextCursor(data.meta.hasMore ? (data.meta.nextCursor ?? null) : null);
      setStatus('ready');
      void refreshUnread();
    } catch {
      setStatus('error');
    }
  }, [refreshUnread]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    try {
      const { data } = await apiClient.GET('/me/notifications', {
        params: { query: { limit: 20, cursor: nextCursor } },
      });
      if (!data) return;
      setItems((prev) => [...prev, ...data.data]);
      setNextCursor(data.meta.hasMore ? (data.meta.nextCursor ?? null) : null);
    } catch {
      // Silencioso: el usuario puede reintentar el scroll.
    }
  }, [nextCursor]);

  const markRead = useCallback(async (id: string) => {
    // Optimista: marca localmente y decrementa el contador antes del round-trip.
    let wasUnread = false;
    setItems((prev) =>
      prev.map((n) => {
        if (n.id === id && n.readAt === null) {
          wasUnread = true;
          return { ...n, readAt: new Date().toISOString() };
        }
        return n;
      }),
    );
    if (wasUnread) decrementUnread();
    try {
      await apiClient.PATCH('/me/notifications/{id}/read', {
        params: { path: { id } },
      });
    } catch {
      void load(); // Revertir al estado real del servidor si falla.
    }
  }, [load, decrementUnread]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: now })),
    );
    resetUnread();
    try {
      await apiClient.POST('/me/notifications/read-all');
    } catch {
      void load();
    }
  }, [load, resetUnread]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    status,
    unread,
    hasMore: nextCursor !== null,
    reload: load,
    loadMore,
    markRead,
    markAllRead,
  };
}
