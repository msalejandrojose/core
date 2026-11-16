import type { LogActivityBody } from '../api';
import type { Routine, SaveRoutineBody } from '../routines/routines.api';

/**
 * Entreno de gimnasio hecho en Brío, serie a serie. Todo es puro: la pantalla
 * guarda el estado (y lo persiste para no perderlo si se cierra la app) y aquí
 * se decide cómo cambia y cómo se convierte en un entreno para la API.
 */

export interface LiveSet {
  weight: string;
  reps: string;
  done: boolean;
}

export interface PreviousSets {
  exerciseId: string;
  day: string;
  sets: { weightKg: number; reps: number }[];
}

export interface LiveExercise {
  exerciseId: string;
  name: string;
  bodyweight: boolean;
  /** Músculos principales, en texto. */
  muscles: string;
  restSec: number | null;
  sets: LiveSet[];
  previous: PreviousSets | null;
}

export interface LiveWorkout {
  routineId: string | null;
  name: string;
  startedAt: number;
  exercises: LiveExercise[];
  /** Fin del descanso en curso (ms) y cuánto dura, para la barra. */
  restUntil: number | null;
  restFor: number | null;
}

const fmt = (n: number) => String(n).replace('.', ',');
const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) ? n : null;
};

/** Empieza un entreno con las series de la rutina; el peso, el de la rutina o el de la última vez. */
export function startFromRoutine(
  r: Routine,
  previous: PreviousSets[],
  muscleName: (m: string) => string,
  now = Date.now(),
): LiveWorkout {
  return {
    routineId: r.id,
    name: r.name,
    startedAt: now,
    restUntil: null,
    restFor: null,
    exercises: r.exercises.map((e) => {
      const prev = previous.find((p) => p.exerciseId === e.exerciseId) ?? null;
      const prevTop = prev?.sets.length ? Math.max(...prev.sets.map((s) => s.weightKg)) : null;
      const weight = e.weightKg ?? (prevTop && prevTop > 0 ? prevTop : null);
      return {
        exerciseId: e.exerciseId,
        name: e.name,
        bodyweight: false,
        muscles: e.muscles
          .filter((m) => m.weight >= 1)
          .map((m) => muscleName(m.muscle))
          .join(', '),
        restSec: e.restSec,
        previous: prev,
        sets: Array.from({ length: e.sets }, () => ({
          weight: weight !== null ? fmt(weight) : '',
          reps: String(e.reps),
          done: false,
        })),
      };
    }),
  };
}

/** Entreno libre (sin rutina): se van añadiendo ejercicios. */
export const emptyWorkout = (name = 'Entreno de fuerza', now = Date.now()): LiveWorkout => ({
  routineId: null,
  name,
  startedAt: now,
  restUntil: null,
  restFor: null,
  exercises: [],
});

const mapExercise = (w: LiveWorkout, i: number, f: (e: LiveExercise) => LiveExercise): LiveWorkout => ({
  ...w,
  exercises: w.exercises.map((e, j) => (j === i ? f(e) : e)),
});

export function editSet(w: LiveWorkout, i: number, k: number, changes: Partial<Omit<LiveSet, 'done'>>): LiveWorkout {
  return mapExercise(w, i, (e) => ({ ...e, sets: e.sets.map((s, y) => (y === k ? { ...s, ...changes } : s)) }));
}

/**
 * Marca (o desmarca) una serie. Al marcarla empieza el descanso del ejercicio
 * y, si las siguientes series no tienen peso, heredan el de esta.
 */
export function toggleSet(w: LiveWorkout, i: number, k: number, now = Date.now()): LiveWorkout {
  const ex = w.exercises[i];
  const set = ex?.sets[k];
  if (!set) return w;
  const done = !set.done;
  const next = mapExercise(w, i, (e) => ({
    ...e,
    sets: e.sets.map((s, y) => {
      if (y === k) return { ...s, done };
      if (done && y > k && !s.done && !s.weight.trim()) return { ...s, weight: set.weight };
      return s;
    }),
  }));
  const rest = done && ex.restSec ? ex.restSec : null;
  return {
    ...next,
    restUntil: rest ? now + rest * 1000 : done ? null : w.restUntil,
    restFor: rest ?? (done ? null : w.restFor),
  };
}

export function addSet(w: LiveWorkout, i: number): LiveWorkout {
  return mapExercise(w, i, (e) => {
    const last = e.sets[e.sets.length - 1];
    return { ...e, sets: [...e.sets, { weight: last?.weight ?? '', reps: last?.reps ?? '', done: false }] };
  });
}

export function removeSet(w: LiveWorkout, i: number, k: number): LiveWorkout {
  return mapExercise(w, i, (e) => (e.sets.length > 1 ? { ...e, sets: e.sets.filter((_, y) => y !== k) } : e));
}

export function addExercise(
  w: LiveWorkout,
  e: Omit<LiveExercise, 'sets' | 'previous'>,
  previous: PreviousSets | null,
): LiveWorkout {
  const top = previous?.sets.length ? Math.max(...previous.sets.map((s) => s.weightKg)) : null;
  const reps = previous?.sets[0]?.reps ?? 10;
  return {
    ...w,
    exercises: [
      ...w.exercises,
      {
        ...e,
        previous,
        sets: Array.from({ length: 3 }, () => ({ weight: top ? fmt(top) : '', reps: String(reps), done: false })),
      },
    ],
  };
}

export const removeExercise = (w: LiveWorkout, i: number): LiveWorkout => ({
  ...w,
  exercises: w.exercises.filter((_, j) => j !== i),
});

export const skipRest = (w: LiveWorkout): LiveWorkout => ({ ...w, restUntil: null, restFor: null });

export function addRest(w: LiveWorkout, sec: number, now = Date.now()): LiveWorkout {
  if (!w.restUntil) return w;
  return { ...w, restUntil: Math.max(now, w.restUntil) + sec * 1000, restFor: (w.restFor ?? 0) + sec };
}

/** Series válidas hechas: con repeticiones y con peso (o de peso corporal). */
function doneSets(e: LiveExercise) {
  return e.sets.flatMap((s) => {
    if (!s.done) return [];
    const reps = num(s.reps);
    const weight = num(s.weight) ?? (e.bodyweight ? 0 : 0);
    if (reps === null || reps < 1 || weight < 0) return [];
    return [{ weightKg: Math.round(weight * 100) / 100, reps: Math.round(reps) }];
  });
}

export function progress(w: LiveWorkout): { done: number; total: number; volumeKg: number } {
  let done = 0;
  let total = 0;
  let volumeKg = 0;
  for (const e of w.exercises) {
    total += e.sets.length;
    for (const s of doneSets(e)) {
      done += 1;
      volumeKg += s.weightKg * s.reps;
    }
  }
  return { done, total, volumeKg: Math.round(volumeKg) };
}

/** Entreno para `POST /brio/activities`: solo las series marcadas como hechas. */
export function toLogBody(
  w: LiveWorkout,
  activityTypeId: string,
  effort: NonNullable<LogActivityBody['effort']>,
  now = Date.now(),
): LogActivityBody {
  const exercises = w.exercises
    .map((e) => ({
      exerciseId: e.exerciseId,
      sets: doneSets(e).map((s, k) => ({
        ...s,
        ...(k > 0 && e.restSec ? { restSec: e.restSec } : {}),
      })),
    }))
    .filter((e) => e.sets.length);
  return {
    activityTypeId,
    startedAt: new Date(w.startedAt).toISOString(),
    durationSec: Math.max(60, Math.round((now - w.startedAt) / 1000)),
    effort,
    ...(w.routineId ? { routineId: w.routineId } : {}),
    ...(exercises.length ? { exercises } : {}),
  };
}

/**
 * La rutina con los pesos de hoy: para cada ejercicio de la rutina, el mayor
 * peso de las series hechas (si se hizo). El resto se queda igual.
 */
export function routineWithTodayWeights(r: Routine, w: LiveWorkout): SaveRoutineBody {
  return {
    name: r.name,
    kind: r.kind,
    notes: r.notes,
    plannedDurationMin: r.plannedDurationMin,
    exercises: r.exercises.map((e) => {
      const live = w.exercises.find((x) => x.exerciseId === e.exerciseId);
      const sets = live ? doneSets(live) : [];
      const top = sets.length ? Math.max(...sets.map((s) => s.weightKg)) : null;
      return {
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: e.reps,
        weightKg: top && top > 0 ? top : e.weightKg,
        restSec: e.restSec,
      };
    }),
  };
}

/** «La última vez: 70 kg × 8, 8, 7» (o con pesos distintos, serie a serie). */
export function previousLine(p: PreviousSets | null): string | null {
  if (!p?.sets.length) return null;
  const same = p.sets.every((s) => s.weightKg === p.sets[0].weightKg);
  if (same) {
    const w = p.sets[0].weightKg;
    return `La última vez: ${w ? `${fmt(w)} kg × ` : ''}${p.sets.map((s) => s.reps).join(', ')}${w ? '' : ' reps'}`;
  }
  return `La última vez: ${p.sets.map((s) => `${fmt(s.weightKg)}×${s.reps}`).join(', ')}`;
}

export const clock = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};
