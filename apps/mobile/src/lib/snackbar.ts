import { toast, type ToastOptions } from './toast';

/** Ventana de «Deshacer» (DS: unos 5 segundos). */
export const SNACKBAR_MS = 5000;

type Extra = Pick<ToastOptions, 'icon' | 'tone'> & { undone?: string };

/**
 * «Primera parte · resto» → título y descripción: «Almuerzo apuntado · 540
 * kcal» sale como título «Almuerzo apuntado» y debajo «540 kcal».
 */
export function splitMessage(text: string): { title: string; description?: string } {
  const at = text.indexOf(' · ');
  if (at < 0) return { title: text };
  return { title: text.slice(0, at), description: text.slice(at + 3) };
}

/**
 * Aviso breve tras una acción de un toque. Antes era una barra sobre las
 * pestañas; ahora sale de la isla (ver `toast.undo`), con el mismo uso.
 */
export const snackbar = {
  show: (text: string, action?: ToastOptions['action'], extra: Extra = {}) => {
    const { title, description } = splitMessage(text);
    return toast.success(title, description, { ...extra, action });
  },
  undo: (text: string, run: () => void | Promise<void>, extra: Extra = {}) => {
    const { title, description } = splitMessage(text);
    return toast.undo(title, description, run, { duration: SNACKBAR_MS, ...extra });
  },
};
