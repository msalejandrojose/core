import { sileo, type SileoOptions } from 'sileo';

// Adaptador de toasts sobre `sileo` (librería de notificaciones con física de
// muelle). Expone la misma API que veníamos usando (`toast.success('texto')`,
// `toast.error('texto')`) para no tocar los ~150 call-sites, pero por debajo
// habla con sileo, cuya API nativa recibe un objeto de opciones en vez de un
// string. Todo el backoffice debe importar `toast` desde aquí, nunca de la
// librería directamente, para poder cambiar de proveedor en un único sitio.

/** Opciones extra de sileo, sin `title`/`type` que gestiona el adaptador. */
export type ToastOptions = Partial<Omit<SileoOptions, 'title' | 'type'>>;

function build(message: string, options?: ToastOptions): SileoOptions {
  return { title: message, ...options };
}

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    sileo.success(build(message, options)),
  error: (message: string, options?: ToastOptions) =>
    sileo.error(build(message, options)),
  warning: (message: string, options?: ToastOptions) =>
    sileo.warning(build(message, options)),
  info: (message: string, options?: ToastOptions) =>
    sileo.info(build(message, options)),
  /** Toast neutro (sin estado). Equivale al `toast()` plano de otras libs. */
  message: (message: string, options?: ToastOptions) =>
    sileo.show(build(message, options)),
  promise: sileo.promise,
  dismiss: sileo.dismiss,
  clear: sileo.clear,
};
