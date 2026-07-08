import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

/** Una notificación in-app tal como la devuelve `GET /me/notifications`. */
export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

interface CursorMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

interface Paginated<T> {
  data: T[];
  meta: CursorMeta;
}

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
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await apiFetch<{ count: number }>(
        '/me/notifications/unread-count',
      );
      setUnread(res.count);
    } catch {
      // El badge es best-effort; si falla, no rompemos la pantalla.
    }
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const page = await apiFetch<Paginated<Notification>>(
        '/me/notifications?limit=20',
      );
      setItems(page.data);
      setNextCursor(page.meta.hasMore ? page.meta.nextCursor : null);
      setStatus('ready');
      void refreshUnread();
    } catch {
      setStatus('error');
    }
  }, [refreshUnread]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    try {
      const page = await apiFetch<Paginated<Notification>>(
        `/me/notifications?limit=20&cursor=${encodeURIComponent(nextCursor)}`,
      );
      setItems((prev) => [...prev, ...page.data]);
      setNextCursor(page.meta.hasMore ? page.meta.nextCursor : null);
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
    if (wasUnread) setUnread((c) => Math.max(0, c - 1));
    try {
      await apiFetch(`/me/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      void load(); // Revertir al estado real del servidor si falla.
    }
  }, [load]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: now })),
    );
    setUnread(0);
    try {
      await apiFetch('/me/notifications/read-all', { method: 'POST' });
    } catch {
      void load();
    }
  }, [load]);

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
