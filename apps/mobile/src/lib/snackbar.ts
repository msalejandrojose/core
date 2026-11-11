import { create } from 'zustand';

/** Cuánto se queda visible por defecto (DS Snackbar: unos 5 segundos). */
export const SNACKBAR_MS = 5000;

export interface SnackbarMessage {
  id: number;
  text: string;
  /** Acción única, normalmente "Deshacer". Sin ella es un aviso informativo. */
  action?: { label: string; run: () => void | Promise<void> };
}

interface SnackbarState {
  current: SnackbarMessage | null;
  show: (text: string, action?: SnackbarMessage['action']) => void;
  dismiss: (id?: number) => void;
}

let nextId = 1;

/**
 * Aviso breve tras una acción de un toque (Ritmo DS · Snackbar). Hay UNO a la
 * vez: mostrar otro sustituye al anterior en vez de apilarlos. Los errores que
 * exigen decidir algo no van aquí, sino en un toast o una alerta.
 */
export const useSnackbarStore = create<SnackbarState>((set, get) => ({
  current: null,
  show: (text, action) => set({ current: { id: nextId++, text, action } }),
  dismiss: (id) => {
    const current = get().current;
    if (!current || (id !== undefined && current.id !== id)) return;
    set({ current: null });
  },
}));

/** Atajo para llamar desde fuera de React (sheets, stores). */
export const snackbar = {
  show: (text: string, action?: SnackbarMessage['action']) =>
    useSnackbarStore.getState().show(text, action),
  undo: (text: string, run: () => void | Promise<void>) =>
    useSnackbarStore.getState().show(text, { label: 'Deshacer', run }),
};
