import { create } from 'zustand';
import type { MealType } from './api';
import { mealForHour } from './format';

export type RegisterSheet = 'menu' | 'meal' | 'activity' | 'weight' | 'copy' | 'digestion';

interface RegisterState {
  /** Hoja abierta, o null si no hay ninguna. Solo una a la vez. */
  sheet: RegisterSheet | null;
  /** Comida preseleccionada al abrir la hoja de comida. */
  mealType: MealType;
  /** Rutina ya elegida al abrir «Registrar entreno» (la del plan de hoy). */
  routineId: string | null;
  open: (sheet: RegisterSheet, mealType?: MealType, opts?: { routineId?: string | null }) => void;
  close: () => void;
}

/**
 * Qué hoja de registro está abierta. Vive fuera de las pantallas porque el
 * botón + de la tab bar abre "Registrar" desde cualquier pestaña, y las hojas
 * se montan una sola vez en el shell (`RegisterSheets`).
 */
export const useRegisterStore = create<RegisterState>((set) => ({
  sheet: null,
  mealType: 'LUNCH',
  routineId: null,
  open: (sheet, mealType, opts) =>
    set({
      sheet,
      mealType: mealType ?? mealForHour(new Date().getHours()),
      routineId: opts?.routineId ?? null,
    }),
  close: () => set({ sheet: null }),
}));
