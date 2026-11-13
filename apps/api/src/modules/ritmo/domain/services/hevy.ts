import type { MuscleWeight, StrengthSet } from '../entities/performance.entity';

/**
 * Traducción entre Hevy y Ritmo, sin red ni base de datos: qué ejercicio del
 * catálogo corresponde a uno de Hevy, cómo se reparte entre músculos uno que
 * no está en el catálogo, y cómo pasan las series de un lado a otro.
 */

export interface HevySet {
  index: number;
  type: string;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
}

export interface HevyExercise {
  index: number;
  title: string;
  exercise_template_id: string;
  sets: HevySet[];
}

export interface HevyWorkout {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  exercises: HevyExercise[];
}

export interface HevyTemplate {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  is_custom: boolean;
}

/** "Bench Press (Barbell)" → { base: "bench press", equipment: "barbell" }. */
export function splitTitle(title: string): {
  base: string;
  equipment: string | null;
} {
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(title.trim());
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  return m
    ? { base: clean(m[1]), equipment: clean(m[2]) }
    : { base: clean(title), equipment: null };
}

/**
 * Nombres de Hevy que no coinciden con el código del catálogo de Ritmo ni
 * siquiera añadiendo el material. Clave: "base|material" o solo "base".
 */
const ALIASES: Record<string, string> = {
  'bench press|barbell': 'bench_press',
  'bench press|dumbbell': 'dumbbell_bench_press',
  'incline bench press|barbell': 'incline_bench_press',
  'chest fly|dumbbell': 'chest_fly',
  'chest fly|machine': 'chest_fly',
  'cable fly crossovers': 'chest_fly',
  'chest dip': 'dip',
  'triceps dip': 'dip',
  'overhead press|barbell': 'overhead_press',
  'overhead press|dumbbell': 'dumbbell_shoulder_press',
  'shoulder press|dumbbell': 'dumbbell_shoulder_press',
  'lateral raise|dumbbell': 'lateral_raise',
  'lateral raise|cable': 'lateral_raise',
  'lateral raise|machine': 'lateral_raise',
  'triceps pushdown': 'triceps_pushdown',
  'triceps rope pushdown': 'triceps_pushdown',
  'skullcrusher|barbell': 'skull_crusher',
  'skullcrusher|dumbbell': 'skull_crusher',
  'lat pulldown|cable': 'lat_pulldown',
  'lat pulldown|machine': 'lat_pulldown',
  'bent over row|barbell': 'barbell_row',
  'bent over row|dumbbell': 'dumbbell_row',
  'dumbbell row': 'dumbbell_row',
  'seated cable row v grip|cable': 'seated_cable_row',
  'seated cable row bar grip': 'seated_cable_row',
  'seated row|machine': 'seated_cable_row',
  'rear delt reverse fly|dumbbell': 'reverse_fly',
  'rear delt reverse fly|machine': 'reverse_fly',
  'rear delt reverse fly|cable': 'reverse_fly',
  'shrug|barbell': 'shrug',
  'shrug|dumbbell': 'shrug',
  'bicep curl|barbell': 'barbell_curl',
  'bicep curl|dumbbell': 'dumbbell_curl',
  'ez bar biceps curl': 'barbell_curl',
  'hammer curl|dumbbell': 'hammer_curl',
  'squat|barbell': 'back_squat',
  'front squat': 'front_squat',
  'leg press|machine': 'leg_press',
  'leg press horizontal|machine': 'leg_press',
  'lunge|dumbbell': 'lunge',
  'lunge|barbell': 'lunge',
  'walking lunge|dumbbell': 'lunge',
  'bulgarian split squat': 'bulgarian_split_squat',
  'leg extension|machine': 'leg_extension',
  'deadlift|barbell': 'deadlift',
  'romanian deadlift|barbell': 'romanian_deadlift',
  'romanian deadlift|dumbbell': 'romanian_deadlift',
  'lying leg curl|machine': 'leg_curl',
  'seated leg curl|machine': 'leg_curl',
  'hip thrust|barbell': 'hip_thrust',
  'hip thrust|machine': 'hip_thrust',
  'standing calf raise|machine': 'calf_raise',
  'seated calf raise': 'calf_raise',
  'calf press|machine': 'calf_raise',
  'back extension hyperextension': 'back_extension',
  'back extension|machine': 'back_extension',
};

/**
 * Código del catálogo de Ritmo para un ejercicio de Hevy, o null si no hay
 * equivalente claro (entonces se crea como ejercicio propio del usuario).
 */
export function catalogCodeFor(
  title: string,
  codes: ReadonlySet<string>,
): string | null {
  const { base, equipment } = splitTitle(title);
  const slug = (s: string) => s.replace(/ /g, '_');
  const candidates = [
    equipment ? ALIASES[`${base}|${equipment}`] : undefined,
    ALIASES[base],
    equipment ? slug(`${equipment} ${base}`) : undefined,
    slug(base),
  ];
  return candidates.find((c): c is string => !!c && codes.has(c)) ?? null;
}

/** Reparto por músculo de un grupo muscular de Hevy cuando es el principal. */
const GROUP_MUSCLES: Record<string, MuscleWeight[]> = {
  abdominals: [{ muscle: 'ABS', weight: 1 }],
  shoulders: [
    { muscle: 'FRONT_DELT', weight: 1 },
    { muscle: 'SIDE_DELT', weight: 0.5 },
  ],
  biceps: [{ muscle: 'BICEPS', weight: 1 }],
  triceps: [{ muscle: 'TRICEPS', weight: 1 }],
  forearms: [{ muscle: 'FOREARMS', weight: 1 }],
  quadriceps: [{ muscle: 'QUADS', weight: 1 }],
  hamstrings: [{ muscle: 'HAMSTRINGS', weight: 1 }],
  calves: [{ muscle: 'CALVES', weight: 1 }],
  glutes: [{ muscle: 'GLUTES', weight: 1 }],
  abductors: [{ muscle: 'GLUTES', weight: 1 }],
  lats: [{ muscle: 'LATS', weight: 1 }],
  upper_back: [
    { muscle: 'LATS', weight: 1 },
    { muscle: 'TRAPS', weight: 0.5 },
    { muscle: 'REAR_DELT', weight: 0.5 },
  ],
  traps: [{ muscle: 'TRAPS', weight: 1 }],
  lower_back: [{ muscle: 'LOWER_BACK', weight: 1 }],
  chest: [{ muscle: 'CHEST', weight: 1 }],
};

/**
 * Músculos de un ejercicio de Hevy que no está en el catálogo: el grupo
 * principal cuenta entero y los secundarios la mitad. Los grupos que Ritmo no
 * mide (cardio, cuello, aductores…) no aportan nada.
 */
export function musclesFor(template: {
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
}): MuscleWeight[] {
  const out = new Map<string, number>();
  const add = (group: string, factor: number) => {
    for (const m of GROUP_MUSCLES[group] ?? []) {
      out.set(m.muscle, Math.max(out.get(m.muscle) ?? 0, m.weight * factor));
    }
  };
  add(template.primary_muscle_group, 1);
  for (const g of template.secondary_muscle_groups ?? []) add(g, 0.5);
  return [...out.entries()].map(([muscle, weight]) => ({
    muscle: muscle as MuscleWeight['muscle'],
    weight,
  }));
}

const BODYWEIGHT_TYPES = new Set([
  'reps_only',
  'bodyweight_reps',
  'bodyweight_assisted_reps',
]);
export const isBodyweightType = (type: string) => BODYWEIGHT_TYPES.has(type);

/**
 * Series de fuerza de un entreno de Hevy. Solo entran las que tienen
 * repeticiones: las de tiempo o distancia (plancha, cinta) no son comparables.
 * El RPE de Hevy (6–10) se guarda como repeticiones en reserva (10 − RPE).
 */
export function setsFrom(
  workout: HevyWorkout,
  exerciseIdOf: (templateId: string) => string | undefined,
): StrengthSet[] {
  const sets: StrengthSet[] = [];
  let exerciseOrder = 0;
  for (const ex of [...workout.exercises].sort((a, b) => a.index - b.index)) {
    const exerciseId = exerciseIdOf(ex.exercise_template_id);
    if (!exerciseId) continue;
    let setOrder = 0;
    for (const s of [...ex.sets].sort((a, b) => a.index - b.index)) {
      if (!s.reps || s.reps <= 0) continue;
      sets.push({
        exerciseId,
        exerciseOrder,
        setOrder,
        weightKg: Math.min(9999, Math.max(0, round2(s.weight_kg ?? 0))),
        reps: Math.min(999, Math.round(s.reps)),
        rir:
          s.rpe == null
            ? null
            : Math.min(10, Math.max(0, Math.round(10 - s.rpe))),
        restSec: null,
        isWarmup: s.type === 'warmup',
      });
      setOrder += 1;
    }
    if (setOrder > 0) exerciseOrder += 1;
  }
  return sets;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Duración del entreno en segundos, acotada a algo razonable (1 min – 6 h). */
export function durationSecOf(workout: HevyWorkout): number {
  const sec = Math.round(
    (Date.parse(workout.end_time) - Date.parse(workout.start_time)) / 1000,
  );
  return Math.min(6 * 3600, Math.max(60, Number.isFinite(sec) ? sec : 60));
}

export interface RoutineSet {
  type: 'warmup' | 'normal';
  weight_kg: number | null;
  reps: number;
}

export interface RoutineExercise {
  exercise_template_id: string;
  superset_id: null;
  rest_seconds: number | null;
  notes: null;
  sets: RoutineSet[];
}

export interface RoutineSourceSet extends StrengthSet {
  exerciseName: string;
}

/**
 * Rutina de Hevy a partir de las series de un entreno. Devuelve también los
 * ejercicios que no se han podido enviar por no tener equivalente en Hevy.
 */
export function routineFrom(
  sets: RoutineSourceSet[],
  templateIdOf: (exerciseId: string) => string | undefined,
): { exercises: RoutineExercise[]; skipped: string[] } {
  const exercises: RoutineExercise[] = [];
  const skipped: string[] = [];
  const ordered = [...sets].sort(
    (a, b) => a.exerciseOrder - b.exerciseOrder || a.setOrder - b.setOrder,
  );
  const byOrder = new Map<number, RoutineSourceSet[]>();
  for (const s of ordered) {
    byOrder.set(s.exerciseOrder, [...(byOrder.get(s.exerciseOrder) ?? []), s]);
  }
  for (const group of byOrder.values()) {
    const templateId = templateIdOf(group[0].exerciseId);
    if (!templateId) {
      if (!skipped.includes(group[0].exerciseName))
        skipped.push(group[0].exerciseName);
      continue;
    }
    const rest = group.find((s) => s.restSec)?.restSec ?? null;
    exercises.push({
      exercise_template_id: templateId,
      superset_id: null,
      rest_seconds: rest,
      notes: null,
      sets: group.map((s) => ({
        type: s.isWarmup ? 'warmup' : 'normal',
        weight_kg: s.weightKg > 0 ? s.weightKg : null,
        reps: s.reps,
      })),
    });
  }
  return { exercises, skipped };
}

/** Músculos del tren inferior, para distinguir una sesión de pierna de una de torso. */
const LOWER = new Set(['QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES']);

/** Parte de las series (0–1) que trabajan sobre todo el tren inferior. */
export function lowerShare(sets: { primaryMuscle: string | null }[]): number {
  const known = sets.filter((s) => s.primaryMuscle);
  if (!known.length) return 0.5;
  return known.filter((s) => LOWER.has(s.primaryMuscle!)).length / known.length;
}
