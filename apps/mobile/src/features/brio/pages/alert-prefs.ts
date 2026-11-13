import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const KINDS = [
  { id: 'comidas', label: 'Comidas sin registrar', desc: 'Si a las 16:00 o 22:00 falta alguna' },
  { id: 'cena', label: 'Cena según tu dieta', desc: 'A las 20:30, con las kcal que te quedan' },
  { id: 'sesion', label: 'Sesión de mañana', desc: 'La noche antes, con qué comer' },
  { id: 'recup', label: 'Ajuste por recuperación', desc: 'Si sueño o VFC piden cambiar el plan' },
  { id: 'peso', label: 'Pesarte', desc: 'Lunes a las 8:00' },
  { id: 'resumen', label: 'Resumen semanal', desc: 'Domingo a las 20:00' },
] as const;

export type Kind = (typeof KINDS)[number]['id'];

/**
 * Preferencias de avisos. Se guardan en el dispositivo hasta que el servidor
 * envíe estos avisos y tenga dónde guardarlas.
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
