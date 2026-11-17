import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  /** Milisegundos visible. Por defecto 3,5 s (5 s los errores). */
  duration?: number;
}

export interface IslandToast {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  duration: number;
}

interface IslandState {
  current: IslandToast | null;
  show: (t: IslandToast) => void;
  dismiss: (id?: string) => void;
}

/**
 * Avisos de arriba al estilo Dynamic Island: UNO a la vez, como la isla de
 * iOS; uno nuevo sustituye al anterior. Lo pinta `<IslandToaster/>`, montado
 * una sola vez en `App`.
 */
export const useIslandStore = create<IslandState>((set, get) => ({
  current: null,
  show: (t) => set({ current: t }),
  dismiss: (id) => {
    const c = get().current;
    if (!c || (id !== undefined && c.id !== id)) return;
    set({ current: null });
  },
}));

let nextId = 1;

function emit(kind: ToastKind) {
  return (title: string, description?: string, options?: ToastOptions): string => {
    const id = `t${nextId++}`;
    useIslandStore.getState().show({
      id,
      kind,
      title,
      description,
      duration: options?.duration ?? (kind === 'error' ? 5000 : 3500),
    });
    return id;
  };
}

/**
 * API por `(título, descripción?)`, la misma que había con Sileo, para que
 * los call sites no cambien. Devuelve el id para `toast.dismiss(id)`.
 */
export const toast = {
  success: emit('success'),
  error: emit('error'),
  info: emit('info'),
  warning: emit('warning'),
  /** Descarta un aviso por su id (si sigue siendo el visible). */
  dismiss: (id: string) => useIslandStore.getState().dismiss(id),
  /** Descarta el aviso visible. */
  clear: () => useIslandStore.getState().dismiss(),
};
