import { create } from 'zustand';
import type { Routine, RoutineKind } from './routines.api';

/**
 * Rutina recién creada desde «Editar sesión» de un día del plan: el editor la
 * deja aquí al guardar y vuelve atrás; la sesión del día la recoge y la elige.
 */
interface RoutinePickState {
  pick: { day: string; routineId: string } | null;
  set: (day: string, routineId: string) => void;
  clear: () => void;
}

export const useRoutinePick = create<RoutinePickState>((set) => ({
  pick: null,
  set: (day, routineId) => set({ pick: { day, routineId } }),
  clear: () => set({ pick: null }),
}));

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS: readonly RoutineKind[] = ['STRENGTH', 'RUN', 'CYCLE', 'WALK', 'HIKE', 'SWIM', 'ELLIPTICAL', 'OTHER_CARDIO', 'OTHER'];

/** `?para=YYYY-MM-DD&tipo=RUN` del editor: para qué día del plan se crea y de qué tipo. */
export function routineForDayParams(search: string): { day: string | null; kind: RoutineKind | null } {
  const q = new URLSearchParams(search);
  const day = q.get('para');
  const kind = q.get('tipo') as RoutineKind | null;
  return { day: day && DAY_RE.test(day) ? day : null, kind: kind && KINDS.includes(kind) ? kind : null };
}

/** Enlace al editor para crear una rutina que se usará en `day`. */
export const newRoutineForDayPath = (day: string, kind?: string) =>
  `/tabs/entrenos/rutinas/nueva?para=${day}${kind && KINDS.includes(kind as RoutineKind) ? `&tipo=${kind}` : ''}`;

/** Lo que una rutina rellena de la sesión del día al elegirla (los campos vacíos se quedan vacíos). */
export function sessionFromRoutine(r: Pick<Routine, 'name' | 'kind' | 'plannedDurationMin' | 'plannedDistanceM'>): {
  kind: string;
  title: string;
  minutes: string;
  km: string;
} {
  return {
    kind: r.kind,
    title: r.name,
    minutes: r.plannedDurationMin ? String(r.plannedDurationMin) : '',
    km: r.plannedDistanceM ? String(Math.round(r.plannedDistanceM / 100) / 10).replace('.', ',') : '',
  };
}

/** Las rutinas que encajan con el tipo de sesión, primero; luego el resto. */
export function routinesForKind<T extends Pick<Routine, 'kind'>>(routines: T[], kind: string): T[] {
  const match = (r: T) => (kind === 'OTHER' ? r.kind === 'OTHER' : r.kind === kind);
  return [...routines.filter(match), ...routines.filter((r) => !match(r))];
}
