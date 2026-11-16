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

export interface RoutineExerciseInput {
  exerciseId: string;
  sets: number;
  reps: number;
  weightKg?: number | null;
  restSec?: number | null;
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
    exercises: exercises.map((e) => ({
      exerciseId: e.exerciseId,
      sets: intIn(e.sets, 1, 20) ?? 3,
      reps: intIn(e.reps, 1, 100) ?? 10,
      weightKg:
        e.weightKg == null || !Number.isFinite(e.weightKg) || e.weightKg <= 0
          ? null
          : Math.round(Math.min(e.weightKg, 500) * 4) / 4,
      restSec: intIn(e.restSec, 0, 900),
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
  superset_id: null;
  rest_seconds: number | null;
  notes: null;
  sets: { type: 'normal'; weight_kg: number | null; reps: number }[];
}

/** Ejercicios de la rutina en el formato de Hevy; los que no tienen equivalente quedan fuera. */
export function hevyRoutineFrom(
  exercises: {
    exerciseId: string;
    name: string;
    sets: number;
    reps: number;
    weightKg: number | null;
    restSec: number | null;
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
      superset_id: null,
      rest_seconds: e.restSec,
      notes: null,
      sets: Array.from({ length: e.sets }, () => ({
        type: 'normal' as const,
        weight_kg: e.weightKg,
        reps: e.reps,
      })),
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
