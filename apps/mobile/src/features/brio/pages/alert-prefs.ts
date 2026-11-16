import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const KINDS = [
  { id: 'comidas', label: 'Comidas sin registrar', desc: 'Si a las 16:00 o 22:00 falta alguna' },
  { id: 'cena', label: 'Cena según tu dieta', desc: 'A las 20:30, con las kcal que te quedan' },
  { id: 'sesion', label: 'Entrenos', desc: 'Media hora antes del de hoy y la noche antes del de mañana' },
  { id: 'recup', label: 'Ajuste por recuperación', desc: 'Si tu recuperación está baja y toca carga alta' },
  { id: 'peso', label: 'Pesarte', desc: 'Lunes a las 8:00' },
  { id: 'resumen', label: 'Resumen semanal', desc: 'Domingo a las 20:00' },
] as const;

export type Kind = (typeof KINDS)[number]['id'];

/**
 * Preferencias de avisos. Se guardan en el dispositivo: los recordatorios son
 * notificaciones locales que programa el propio teléfono (ver reminders/).
 */
export const useAlertPrefs = create<{ on: Record<Kind, boolean>; toggle: (k: Kind) => void }>()(
  persist(
    (set) => ({
      on: { comidas: true, cena: true, sesion: true, recup: true, peso: false, resumen: true },
      toggle: (k) => set((s) => ({ on: { ...s.on, [k]: !s.on[k] } })),
    }),
    { name: 'brio-alert-prefs', storage: createJSONStorage(() => localStorage) },
  ),
);

/** Cuántos avisos están activos (fila «Avisos» del Perfil). */
export function activeAlerts(on: Record<Kind, boolean>): number {
  return KINDS.filter((k) => on[k.id]).length;
}
