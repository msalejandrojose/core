/**
 * Rutinas guardadas: un entreno que el usuario repite. Las de gimnasio llevan
 * ejercicios con series previstas; las de cardio, duración/distancia/ritmo.
 * Aquí solo hay reglas puras: validar, repartir por músculos y traducir a Hevy.
 */

export type RoutineKind =
  | 'STRENGTH'
  | 'RUN'
  | 'CYCLE'
  | 'WALK'
  | 'HIKE'
  | 'SWIM'
  | 'ELLIPTICAL'
  | 'OTHER_CARDIO'
  | 'OTHER';

/** Una serie prevista con sus repeticiones y su peso. */
export interface RoutineSetPlan {
  reps: number;
  weightKg: number | null;
}

export interface RoutineExerciseInput {
  exerciseId: string;
  sets: number;
  reps: number;
  weightKg?: number | null;
  /**
   * Repeticiones y peso de cada serie (pirámides, series descendentes…). Si
   * llega, manda sobre `sets`, `reps` y `weightKg`.
   */
  setPlan?: { reps: number; weightKg?: number | null }[] | null;
  restSec?: number | null;
  /** Mismo número que el ejercicio de al lado = superserie. */
  supersetGroup?: number | null;
  /** Objetivo por serie de los ejercicios que no van por repeticiones. */
  distanceM?: number | null;
  durationSec?: number | null;
  calories?: number | null;
}

export interface RoutineInput {
  name: string;
  kind: RoutineKind;
  notes?: string | null;
  plannedDurationMin?: number | null;
  plannedDistanceM?: number | null;
  targetPaceSecPerKm?: number | null;
  exercises?: RoutineExerciseInput[];
}

export interface CleanRoutine {
  name: string;
  kind: RoutineKind;
  notes: string | null;
  plannedDurationMin: number | null;
  plannedDistanceM: number | null;
  targetPaceSecPerKm: number | null;
  exercises: Required<RoutineExerciseInput>[];
}

export const MAX_ROUTINE_EXERCISES = 30;

export class InvalidRoutineError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const intIn = (n: number | null | undefined, min: number, max: number) =>
  n == null || !Number.isFinite(n)
    ? null
    : Math.min(max, Math.max(min, Math.round(n)));

/** Peso redondeado a 0,25 kg; nada, cero o negativo = sin peso. */
const cleanWeight = (w: number | null | undefined) =>
  w == null || !Number.isFinite(w) || w <= 0
    ? null
    : Math.round(Math.min(w, 500) * 4) / 4;

export const MAX_ROUTINE_SETS = 20;

/**
 * Series de un ejercicio: sin plan por serie, `sets` iguales; con él, cada una
 * la suya. `sets`, `reps` y `weightKg` quedan como resumen (número de series,
 * repeticiones de la primera y el peso más alto) y el plan solo se guarda si
 * de verdad cambia de una serie a otra.
 */
export function cleanSets(e: {
  sets: number;
  reps: number;
  weightKg?: number | null;
  setPlan?: { reps: number; weightKg?: number | null }[] | null;
}): {
  sets: number;
  reps: number;
  weightKg: number | null;
  setPlan: RoutineSetPlan[] | null;
} {
  const plan = (e.setPlan ?? []).slice(0, MAX_ROUTINE_SETS).map((s) => ({
    reps: intIn(s.reps, 1, 100) ?? 10,
    weightKg: cleanWeight(s.weightKg),
  }));
  if (!plan.length) {
    return {
      sets: intIn(e.sets, 1, MAX_ROUTINE_SETS) ?? 3,
      reps: intIn(e.reps, 1, 100) ?? 10,
      weightKg: cleanWeight(e.weightKg),
      setPlan: null,
    };
  }
  const weights = plan
    .map((s) => s.weightKg)
    .filter((w): w is number => w !== null);
  const same = plan.every(
    (s) => s.reps === plan[0].reps && s.weightKg === plan[0].weightKg,
  );
  return {
    sets: plan.length,
    reps: plan[0].reps,
    weightKg: weights.length ? Math.max(...weights) : null,
    setPlan: same ? null : plan,
  };
}

/** Las series una a una, tengan plan propio o no. */
export function expandSets(e: {
  sets: number;
  reps: number;
  weightKg: number | null;
  setPlan?: RoutineSetPlan[] | null;
}): RoutineSetPlan[] {
  if (e.setPlan?.length) return e.setPlan;
  return Array.from({ length: e.sets }, () => ({
    reps: e.reps,
    weightKg: e.weightKg,
  }));
}

/**
 * Deja las superseries limpias: solo cuentan los ejercicios seguidos con el
 * mismo número, un grupo de uno no es superserie y se numeran 1, 2, 3…
 */
export function normalizeSupersets(
  groups: (number | null | undefined)[],
): (number | null)[] {
  const out: (number | null)[] = groups.map(() => null);
  let next = 1;
  let i = 0;
  while (i < groups.length) {
    const g = groups[i];
    let j = i + 1;
    if (g != null) while (j < groups.length && groups[j] === g) j += 1;
    if (g != null && j - i >= 2) {
      for (let k = i; k < j; k += 1) out[k] = next;
      next += 1;
    }
    i = j;
  }
  return out;
}

/** Valida y normaliza una rutina. Las de cardio no llevan ejercicios. */
export function cleanRoutine(input: RoutineInput): CleanRoutine {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) throw new InvalidRoutineError('BRIO_ROUTINE_NAME_REQUIRED');
  const strength = input.kind === 'STRENGTH';
  const exercises = strength ? (input.exercises ?? []) : [];
  if (strength && !exercises.length)
    throw new InvalidRoutineError('BRIO_ROUTINE_EXERCISES_REQUIRED');
  if (exercises.length > MAX_ROUTINE_EXERCISES)
    throw new InvalidRoutineError('BRIO_ROUTINE_TOO_MANY_EXERCISES');
  const groups = normalizeSupersets(exercises.map((e) => e.supersetGroup));
  return {
    name: name.slice(0, 80),
    kind: input.kind,
    notes: input.notes?.trim().slice(0, 500) || null,
    plannedDurationMin: intIn(input.plannedDurationMin, 1, 600),
    plannedDistanceM: strength
      ? null
      : intIn(input.plannedDistanceM, 1, 500_000),
    targetPaceSecPerKm: strength
      ? null
      : intIn(input.targetPaceSecPerKm, 60, 1800),
    exercises: exercises.map((e, i) => ({
      exerciseId: e.exerciseId,
      supersetGroup: groups[i],
      ...cleanSets(e),
      restSec: intIn(e.restSec, 0, 900),
      distanceM: intIn(e.distanceM, 1, 100_000),
      durationSec: intIn(e.durationSec, 1, 7200),
      calories: intIn(e.calories, 1, 2000),
    })),
  };
}

export interface MuscleShare {
  muscle: string;
  /** Parte del trabajo de la rutina (0–1), por series × peso del músculo. */
  share: number;
  /** Principal en algún ejercicio (no solo secundario). */
  primary: boolean;
}

/**
 * Qué músculos trabaja la rutina y cuánto: cada serie reparte su peso entre
 * los músculos del ejercicio (1 principal, 0.5 secundario, 0.25 indirecto).
 */
export function routineMuscles(
  exercises: { sets: number; muscles: { muscle: string; weight: number }[] }[],
): MuscleShare[] {
  const load = new Map<string, number>();
  const primary = new Set<string>();
  for (const e of exercises)
    for (const m of e.muscles) {
      load.set(m.muscle, (load.get(m.muscle) ?? 0) + e.sets * m.weight);
      if (m.weight >= 1) primary.add(m.muscle);
    }
  const total = [...load.values()].reduce((a, b) => a + b, 0);
  if (!total) return [];
  return [...load]
    .map(([muscle, l]) => ({
      muscle,
      share: Math.round((l / total) * 100) / 100,
      primary: primary.has(muscle),
    }))
    .sort((a, b) => b.share - a.share);
}

export interface HevyRoutineExercise {
  exercise_template_id: string;
  superset_id: number | null;
  rest_seconds: number | null;
  notes: null;
  sets: {
    type: 'normal';
    weight_kg: number | null;
    reps: number | null;
    distance_meters?: number | null;
    duration_seconds?: number | null;
  }[];
}

/** Ejercicios de la rutina en el formato de Hevy; los que no tienen equivalente quedan fuera. */
export function hevyRoutineFrom(
  exercises: {
    exerciseId: string;
    name: string;
    sets: number;
    reps: number;
    weightKg: number | null;
    setPlan?: RoutineSetPlan[] | null;
    restSec: number | null;
    supersetGroup?: number | null;
    measure?: string;
    distanceM?: number | null;
    durationSec?: number | null;
  }[],
  templateIdOf: (exerciseId: string) => string | undefined,
): { exercises: HevyRoutineExercise[]; skipped: string[] } {
  const out: HevyRoutineExercise[] = [];
  const skipped: string[] = [];
  for (const e of exercises) {
    const templateId = templateIdOf(e.exerciseId);
    if (!templateId) {
      if (!skipped.includes(e.name)) skipped.push(e.name);
      continue;
    }
    out.push({
      exercise_template_id: templateId,
      // Hevy numera las superseries desde 0.
      superset_id: e.supersetGroup ? e.supersetGroup - 1 : null,
      rest_seconds: e.restSec,
      notes: null,
      sets: expandSets(e).map((s) => {
        const measure = e.measure ?? 'REPS';
        return {
          type: 'normal' as const,
          weight_kg: s.weightKg,
          reps: measure === 'REPS' ? s.reps : null,
          ...(measure === 'DISTANCE'
            ? { distance_meters: e.distanceM ?? null }
            : {}),
          ...(measure === 'TIME'
            ? { duration_seconds: e.durationSec ?? null }
            : {}),
        };
      }),
    });
  }
  return { exercises: out, skipped };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Rutina a la que pertenece un entreno importado de Hevy: la que se creó en
 * Hevy desde Brío (mismo id) o, si no, la que se llama igual que el entreno.
 */
export function routineForHevyWorkout<
  R extends { id: string; name: string; hevyRoutineId: string | null },
>(
  routines: R[],
  workout: { routineId: string | null; title: string },
): R | null {
  if (workout.routineId) {
    const byId = routines.find((r) => r.hevyRoutineId === workout.routineId);
    if (byId) return byId;
  }
  const title = norm(workout.title);
  return title ? (routines.find((r) => norm(r.name) === title) ?? null) : null;
}

/** Disciplina de una sesión importada de Garmin que encaja con la rutina. */
export function kindMatches(
  routineKind: RoutineKind,
  sessionKind: string,
): boolean {
  if (routineKind === sessionKind) return true;
  // «Otro cardio» acepta cualquier cardio; el resto, solo su disciplina.
  return (
    routineKind === 'OTHER_CARDIO' &&
    !['STRENGTH', 'OTHER'].includes(sessionKind)
  );
}
