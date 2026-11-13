import { create } from 'zustand';
import { brioApi, type MealHabits, type MealType } from './api';

interface HabitsState {
  byMeal: Partial<Record<MealType, MealHabits>>;
  load: (mealType: MealType) => Promise<MealHabits | null>;
  /** Tras registrar algo los hábitos cambian: se vuelven a pedir al usarlos. */
  invalidate: () => void;
}

/** Caché de hábitos por momento del día (Hoy, Registrar y Añadir los comparten). */
export const useHabitsStore = create<HabitsState>((set, get) => ({
  byMeal: {},
  load: async (mealType) => {
    const cached = get().byMeal[mealType];
    if (cached) return cached;
    try {
      const habits = await brioApi.mealHabits(mealType);
      set((s) => ({ byMeal: { ...s.byMeal, [mealType]: habits } }));
      return habits;
    } catch {
      return null;
    }
  },
  invalidate: () => set({ byMeal: {} }),
}));
