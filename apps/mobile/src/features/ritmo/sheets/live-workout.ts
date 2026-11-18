import { exerciseVolume, type DraftExercise } from './workout-draft';

/**
 * Entreno en vivo guardado en el dispositivo: si la app se cierra o el móvil
 * la mata en segundo plano a mitad de entreno, al volver se retoma tal cual.
 * El cronómetro se calcula desde `startedAt`, así que sigue corriendo aunque
 * la pantalla no esté abierta.
 */
export interface LiveWorkout {
  /** Epoch ms del arranque. */
  startedAt: number;
  exercises: DraftExercise[];
  /** Descanso en marcha: cuándo acaba (epoch ms) y cuánto dura en total (s). */
  rest: { endsAt: number; totalSec: number } | null;
}

const KEY = 'ritmo.live-workout';

export function loadLive(): LiveWorkout | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as LiveWorkout;
    return typeof v?.startedAt === 'number' && Array.isArray(v.exercises) ? v : null;
  } catch {
    return null;
  }
}

export function saveLive(v: LiveWorkout): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // Sin almacenamiento (privado, lleno): el entreno sigue en memoria.
  }
}

export function clearLive(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nada que limpiar.
  }
}

/** Totales en directo: solo cuenta lo marcado como hecho. */
export function liveTotals(exercises: DraftExercise[]) {
  const done = exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }));
  return {
    sets: done.reduce((n, e) => n + e.sets.filter((s) => !s.warmup).length, 0),
    volume: Math.round(done.reduce((v, e) => v + exerciseVolume(e), 0)),
    exercises: done.filter((e) => e.sets.length > 0).length,
  };
}
