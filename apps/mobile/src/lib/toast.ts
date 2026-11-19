import { create } from 'zustand';

/** Tipo del aviso: decide icono, color y prioridad si no se dice otra cosa. */
export type ToastKind = 'success' | 'error' | 'info' | 'warning' | 'loading';

/**
 * Color del dominio (Brío DS: «el color significa algo»). Sustituye al del
 * tipo en el icono: comida en naranja, actividad en verde, peso en índigo…
 */
export type ToastTone = 'food' | 'activity' | 'weight' | 'digestion' | 'gold' | 'bronze' | 'coach' | 'social';

/** Iconos de la isla (trazo de 24×24), dibujados en IslandToaster. */
export type ToastIcon =
  | 'check'
  | 'x'
  | 'warning'
  | 'info'
  | 'food'
  | 'scale'
  | 'link'
  | 'medal'
  | 'week'
  | 'spark'
  | 'sync'
  | 'dumbbell'
  | 'book'
  | 'leaf';

export interface ToastAction {
  label: string;
  run: () => void | Promise<void>;
}

export interface ToastOptions {
  /** Milisegundos visible; 0 = hasta que se quite. Por defecto según el tipo (ver `defaultDuration`). */
  duration?: number;
  /** Una sola acción, a la derecha: «Deshacer», «Reintentar», «Ver»… */
  action?: ToastAction;
  icon?: ToastIcon;
  tone?: ToastTone;
  /** Iniciales en vez de icono (avisos de personas). */
  avatar?: string;
  /** Anillo alrededor del icono que se vacía con el tiempo (ventana de «Deshacer»). */
  countdown?: boolean;
  /** Avance conocido, 0–1: barra bajo el texto. */
  progress?: number;
  /** Filo dorado: solo para récords. */
  glow?: boolean;
}

export interface IslandToast extends Omit<ToastOptions, 'duration'> {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  duration: number;
  /** Sube con cada `update`: la isla reinicia su tiempo al cambiar. */
  version: number;
}

/**
 * Lo que la isla enseña en pequeño cuando no hay aviso: el descanso o el
 * entreno en curso (lo pone `useLiveIsland`, que sabe de rutas y del entreno).
 */
export type LiveIsland =
  | {
      kind: 'rest';
      /** Fin del descanso (ms) y cuánto dura, para el anillo. */
      until: number;
      total: number;
      next: string | null;
      onAdd: () => void;
      onSkip: () => void;
    }
  | {
      kind: 'workout';
      name: string;
      startedAt: number;
      done: number;
      total: number;
      volumeKg: number;
      onOpen: () => void;
    };

interface IslandState {
  current: IslandToast | null;
  /** Avisos que esperan turno por tener menos prioridad que el visible. */
  queue: IslandToast[];
  live: LiveIsland | null;
  show: (t: IslandToast) => void;
  update: (id: string, patch: Partial<Omit<IslandToast, 'id' | 'version'>>) => void;
  dismiss: (id?: string) => void;
  setLive: (live: LiveIsland | null) => void;
}

/** Cuántos pueden esperar; si llegan más, se pierden los más viejos. */
const MAX_QUEUE = 3;

/** Error, después lo que tiene acción o está en marcha, después aviso, después el resto. */
export function priority(t: Pick<IslandToast, 'kind' | 'action'>): number {
  if (t.kind === 'error') return 3;
  if (t.action || t.kind === 'loading') return 2;
  if (t.kind === 'warning') return 1;
  return 0;
}

export function defaultDuration(kind: ToastKind, options: Pick<ToastOptions, 'action'> = {}): number {
  if (kind === 'loading') return 0;
  if (options.action) return kind === 'error' ? 6000 : 5000;
  if (kind === 'error') return 5000;
  if (kind === 'warning') return 4000;
  return 3500;
}

/**
 * Avisos de arriba al estilo Dynamic Island: UNO a la vez. Uno nuevo
 * sustituye al visible si tiene al menos su prioridad; si no, espera su turno
 * y la isla enseña «+1». Lo pinta `<IslandToaster/>`, montado una vez en `App`.
 */
export const useIslandStore = create<IslandState>((set, get) => ({
  current: null,
  queue: [],
  live: null,
  show: (t) => {
    const { current, queue } = get();
    if (!current || priority(t) >= priority(current)) {
      set({ current: t });
      return;
    }
    // Más importante primero; a igual prioridad, por orden de llegada.
    const next = [...queue, t].sort((a, b) => priority(b) - priority(a)).slice(0, MAX_QUEUE);
    set({ queue: next });
  },
  update: (id, patch) => {
    const apply = (t: IslandToast) => ({ ...t, ...patch, version: t.version + 1 });
    const { current, queue } = get();
    if (current?.id === id) set({ current: apply(current) });
    else if (queue.some((t) => t.id === id)) set({ queue: queue.map((t) => (t.id === id ? apply(t) : t)) });
  },
  dismiss: (id) => {
    const { current, queue } = get();
    if (id !== undefined && current?.id !== id) {
      // Puede que esté esperando: se quita de la cola.
      if (queue.some((t) => t.id === id)) set({ queue: queue.filter((t) => t.id !== id) });
      return;
    }
    if (!current) return;
    const [next, ...rest] = queue;
    set({ current: next ?? null, queue: rest });
  },
  setLive: (live) => set({ live }),
}));

let nextId = 1;

function push(kind: ToastKind, title: string, description?: string, options: ToastOptions = {}): string {
  const id = `t${nextId++}`;
  const { duration, ...rest } = options;
  useIslandStore.getState().show({
    ...rest,
    id,
    kind,
    title,
    description,
    duration: duration ?? defaultDuration(kind, options),
    version: 0,
  });
  return id;
}

const emit =
  (kind: ToastKind) =>
  (title: string, description?: string, options?: ToastOptions): string =>
    push(kind, title, description, options);

export interface ProgressToast {
  id: string;
  /** Avance 0–1 (y, si cambia, la descripción). */
  progress: (value: number, description?: string) => void;
  /** Se transforma en su resultado sin cerrarse. */
  success: (title: string, description?: string, options?: ToastOptions) => void;
  error: (title: string, description?: string, options?: ToastOptions) => void;
}

/**
 * API por `(título, descripción?, opciones?)`. Devuelve el id para
 * `toast.dismiss(id)`.
 */
export const toast = {
  success: emit('success'),
  error: emit('error'),
  info: emit('info'),
  warning: emit('warning'),

  /**
   * Algo que tarda: círculo girando hasta que llega el resultado, y entonces
   * la misma píldora se convierte en «hecho» o en el error.
   */
  progress(title: string, description?: string, options: ToastOptions = {}): ProgressToast {
    const id = push('loading', title, description, options);
    const store = () => useIslandStore.getState();
    const finish = (kind: 'success' | 'error') => (t: string, d?: string, o: ToastOptions = {}) => {
      const { duration, ...rest } = o;
      store().update(id, {
        progress: undefined,
        ...rest,
        kind,
        title: t,
        description: d,
        duration: duration ?? defaultDuration(kind, o),
      });
    };
    return {
      id,
      progress: (value, d) =>
        store().update(id, { progress: Math.max(0, Math.min(1, value)), ...(d !== undefined ? { description: d } : {}) }),
      success: finish('success'),
      error: finish('error'),
    };
  },

  /**
   * Lo que se apuntó con un toque, con «Deshacer» y su anillo de 5 s. Si se
   * deshace, sale `undone` (por defecto «Deshecho») un momento.
   */
  undo(
    title: string,
    description: string | undefined,
    run: () => void | Promise<void>,
    options: Omit<ToastOptions, 'action' | 'countdown'> & { undone?: string } = {},
  ): string {
    const { undone = 'Deshecho', ...rest } = options;
    const id: string = push('success', title, description, {
      ...rest,
      countdown: true,
      action: {
        label: 'Deshacer',
        run: async () => {
          // Se va antes de hacer nada, para que «Deshecho» no espere tras él.
          useIslandStore.getState().dismiss(id);
          try {
            await run();
            push('success', undone, undefined, { duration: 2500 });
          } catch {
            push('error', 'No se pudo deshacer');
          }
        },
      },
    });
    return id;
  },

  /** Cambia un aviso visible o en cola (título, descripción, tipo…). */
  update: (id: string, patch: Partial<Omit<IslandToast, 'id' | 'version'>>) => useIslandStore.getState().update(id, patch),
  /** Descarta un aviso por su id (visible o en cola). */
  dismiss: (id: string) => useIslandStore.getState().dismiss(id),
  /** Descarta el aviso visible (y entra el siguiente de la cola). */
  clear: () => useIslandStore.getState().dismiss(),
};
