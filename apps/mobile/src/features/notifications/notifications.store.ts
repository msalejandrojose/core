import { create } from 'zustand';
import { apiFetch } from '@/lib/api';

/**
 * Contador de notificaciones sin leer, compartido entre el badge del tab bar y
 * la pantalla de notificaciones para que se mantengan en sync (marcar una/todas
 * como leídas se refleja al instante en el badge). El inbox actualiza este
 * store de forma optimista; `refresh` reconcilia con el servidor.
 */
interface UnreadState {
  unread: number;
  /** Fija el contador (reconciliación con el servidor). */
  set: (n: number) => void;
  /** Decrementa en uno (al marcar una notificación como leída). */
  decrement: () => void;
  /** Pone el contador a cero (al marcar todas como leídas). */
  reset: () => void;
  /** Relee el contador desde la API. Best-effort: si falla, no rompe nada. */
  refresh: () => Promise<void>;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  unread: 0,
  set: (n) => set({ unread: Math.max(0, n) }),
  decrement: () => set({ unread: Math.max(0, get().unread - 1) }),
  reset: () => set({ unread: 0 }),
  refresh: async () => {
    try {
      const res = await apiFetch<{ count: number }>(
        '/me/notifications/unread-count',
      );
      set({ unread: Math.max(0, res.count) });
    } catch {
      // El badge es best-effort; si falla, se conserva el valor anterior.
    }
  },
}));
