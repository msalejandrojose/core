import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/lib/storage';
import type { LiveWorkout } from './live-workout';

/**
 * Entreno en curso. Se guarda en el teléfono para que cerrar la app (o que
 * iOS la mate en segundo plano) no haga perder las series ya marcadas.
 */
interface LiveState {
  workout: LiveWorkout | null;
  set: (w: LiveWorkout | null) => void;
  update: (f: (w: LiveWorkout) => LiveWorkout) => void;
}

export const useLiveStore = create<LiveState>()(
  persist(
    (set) => ({
      workout: null,
      set: (workout) => set({ workout }),
      update: (f) => set((s) => (s.workout ? { workout: f(s.workout) } : s)),
    }),
    {
      name: 'brio-live-workout',
      storage: createJSONStorage(() => capacitorStorage),
      partialize: (s) => ({ workout: s.workout }),
    },
  ),
);
