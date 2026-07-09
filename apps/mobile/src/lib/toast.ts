import { sileo, type SileoOptions } from 'sileo';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

/**
 * Wrapper fino sobre Sileo (toasts). Expone una API por `(título, descripción?)`
 * —más cómoda que el objeto de opciones de Sileo— y desacopla los call sites de
 * la librería concreta, por si se cambia en el futuro. El `<Toaster/>` se monta
 * una sola vez en `App` (ver App.tsx), así que aquí solo se disparan toasts.
 *
 * Uso: `toast.success('Guardado')`, `toast.error('No se pudo guardar', detalle)`.
 * Devuelve el id del toast para poder descartarlo con `toast.dismiss(id)`.
 */
function emit(kind: ToastKind) {
  return (
    title: string,
    description?: string,
    options?: Partial<SileoOptions>,
  ): string => sileo[kind]({ title, description, ...options });
}

export const toast = {
  success: emit('success'),
  error: emit('error'),
  info: emit('info'),
  warning: emit('warning'),
  /** Descarta un toast por su id. */
  dismiss: (id: string) => sileo.dismiss(id),
  /** Descarta todos los toasts visibles. */
  clear: () => sileo.clear(),
};
