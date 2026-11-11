import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Objetivo diario del diseño: 8 vasos. */
export const WATER_GOAL = 8;

interface WaterState {
  byDay: Record<string, number>;
  add: (day: string, delta: number) => void;
}

/**
 * Vasos de agua por día. Se guarda en el dispositivo y no en la API: es un
 * contador rápido sin efecto en las calorías, y la API aún no tiene dónde
 * guardarlo. Cuando lo tenga, este store pasa a sincronizar.
 */
export const useWaterStore = create<WaterState>()(
  persist(
    (set) => ({
      byDay: {},
      add: (day, delta) =>
        set((s) => ({
          byDay: { ...s.byDay, [day]: Math.max(0, Math.min(12, (s.byDay[day] ?? 0) + delta)) },
        })),
    }),
    { name: 'ritmo-water', storage: createJSONStorage(() => localStorage) },
  ),
);
