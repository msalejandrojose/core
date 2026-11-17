import { closesRound } from '../routines/supersets';
import type { LiveExercise, LiveWorkout } from './live-workout';

/**
 * Traducción entre el entreno en vivo y la Live Activity de iOS (pantalla
 * bloqueada y Dynamic Island). Mismo formato que
 * `BrioWorkoutAttributes.ContentState` en `native/ios/Shared`.
 */
export interface ActivitySet {
  w: string;
  r: string;
  d: boolean;
}
export interface ActivityExercise {
  name: string;
  unit: 'reps' | 'm' | 'time' | 'cal';
  rest: number;
  sets: ActivitySet[];
}
export interface ActivityState {
  title: string;
  startedAt: number;
  focus: number;
  restUntil: number | null;
  exercises: ActivityExercise[];
  rev: number;
}

const UNIT: Record<LiveExercise['measure'], ActivityExercise['unit']> = {
  REPS: 'reps',
  DISTANCE: 'm',
  TIME: 'time',
  CALORIES: 'cal',
};

/** Lo que se cuenta en cada serie según cómo se mide el ejercicio. */
function amount(e: LiveExercise, s: LiveExercise['sets'][number]): string {
  switch (e.measure) {
    case 'DISTANCE':
      return s.distance;
    case 'TIME':
      return s.time;
    case 'CALORIES':
      return s.cal;
    default:
      return s.reps;
  }
}

/** Ejercicio que toca: el enfocado o, si no hay, el primero con series sin hacer. */
export function currentFocus(w: LiveWorkout): number {
  if (w.focus != null && w.focus >= 0 && w.focus < w.exercises.length) return w.focus;
  const i = w.exercises.findIndex((e) => e.sets.some((s) => !s.done));
  return i >= 0 ? i : 0;
}

export function toActivityState(w: LiveWorkout, rev = 0): ActivityState {
  const groups = w.exercises.map((e) => e.group);
  return {
    title: w.name,
    startedAt: w.startedAt,
    focus: currentFocus(w),
    restUntil: w.restUntil,
    rev,
    exercises: w.exercises.map((e, i) => ({
      name: e.name,
      unit: UNIT[e.measure] ?? 'reps',
      rest: closesRound(groups, i) && e.restSec ? e.restSec : 0,
      sets: e.sets.map((s) => ({ w: s.weight, r: amount(e, s), d: s.done })),
    })),
  };
}

/**
 * Aplica al entreno lo que se cambió desde la Live Activity (series marcadas,
 * peso, repes, ejercicio enfocado y descanso). Si el entreno cambió de forma
 * mientras tanto (otros ejercicios o series), solo se toma lo que encaja.
 */
export function mergeActivityState(w: LiveWorkout, st: ActivityState): LiveWorkout {
  const exercises = w.exercises.map((e, i) => {
    const a = st.exercises[i];
    if (!a || a.name !== e.name) return e;
    return {
      ...e,
      sets: e.sets.map((s, k) => {
        const x = a.sets[k];
        if (!x) return s;
        return {
          ...s,
          weight: x.w,
          ...(e.measure === 'REPS' ? { reps: x.r } : {}),
          done: x.d,
        };
      }),
    };
  });
  const focus = st.focus >= 0 && st.focus < exercises.length ? st.focus : w.focus;
  const restChanged = st.restUntil !== w.restUntil;
  const restFor =
    st.restUntil && restChanged ? (st.exercises[st.focus]?.rest || st.exercises.find((x) => x.rest)?.rest || w.restFor) : st.restUntil ? w.restFor : null;
  return { ...w, exercises, focus, restUntil: st.restUntil, restFor: restFor ?? null };
}
