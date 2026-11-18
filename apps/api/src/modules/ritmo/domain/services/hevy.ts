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
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
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
  'chest fly|machine': 'pec_deck',
  'butterfly pec deck': 'pec_deck',
  'cable fly crossovers': 'chest_fly',
  'chest dip': 'dip',
  'triceps dip': 'dip',
  'overhead press|barbell': 'overhead_press',
  'overhead press|dumbbell': 'dumbbell_shoulder_press',
  'shoulder press|dumbbell': 'dumbbell_shoulder_press',
  'lateral raise|dumbbell': 'lateral_raise',
  'lateral raise|cable': 'lateral_raise',
  'lateral raise|machine': 'machine_lateral_raise',
  'triceps pushdown': 'triceps_pushdown',
  'triceps rope pushdown': 'rope_pushdown',
  'triceps pressdown': 'triceps_pushdown',
  'overhead triceps extension|cable': 'overhead_triceps_extension',
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
  'rear delt reverse fly|machine': 'rear_delt_machine',
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
  'good morning|barbell': 'good_morning',
  'good morning': 'good_morning',
  // Hevy en español traduce «Good Morning» al pie de la letra.
  'buenos dias|barra': 'good_morning',
  'buenos dias': 'good_morning',
  'romanian deadlift|barbell': 'romanian_deadlift',
  'romanian deadlift|dumbbell': 'romanian_deadlift',
  'lying leg curl|machine': 'leg_curl',
  'seated leg curl|machine': 'seated_leg_curl',
  'hip thrust|barbell': 'hip_thrust',
  'hip thrust|machine': 'hip_thrust',
  'standing calf raise|machine': 'calf_raise',
  'seated calf raise': 'seated_calf_raise',
  'calf press|machine': 'calf_raise',
  'back extension hyperextension': 'back_extension',
  'back extension|machine': 'back_extension',
  // Más nombres en inglés de Hevy para máquinas y variantes.
  'bench press|smith machine': 'smith_bench_press',
  'incline bench press|smith machine': 'smith_incline_bench_press',
  'decline bench press|smith machine': 'smith_decline_bench_press',
  'squat|smith machine': 'smith_squat',
  'chest press|machine': 'machine_chest_press',
  'iso lateral chest press|machine': 'machine_chest_press',
  'incline chest press|machine': 'machine_incline_chest_press',
  'single arm lateral raise|cable': 'cable_lateral_raise',
  'front raise|cable': 'cable_front_raise',
  'shoulder press|machine': 'machine_shoulder_press',
  'seated dip machine': 'seated_dip_machine',
  'bench dip': 'bench_dip',
  'assisted dip': 'assisted_dip',
  'iso lateral row|machine': 'iso_lateral_row',
  'iso lateral row': 'iso_lateral_row',
  'chin up': 'chin_up',
  'pull up|assisted': 'assisted_pull_up',
  'assisted pull up': 'assisted_pull_up',
  'chin up|assisted': 'assisted_chin_up',
  'incline bicep curl|dumbbell': 'incline_dumbbell_curl',
  'bicep curl|cable': 'cable_curl',
  'rope cable curl': 'cable_curl',
  'behind the back curl|cable': 'cable_curl',
  'preacher curl|barbell': 'preacher_curl',
  'preacher curl|machine': 'preacher_curl',
  'preacher curl|dumbbell': 'preacher_curl',
  'bicep curl|machine': 'preacher_curl',
  'hip abduction|machine': 'hip_abduction',
  'hip adduction|machine': 'hip_adduction',
  'box jump': 'box_jump',
  'decline crunch': 'decline_crunch',
  'bicycle crunch raised legs': 'bicycle_crunch',
  'bicycle crunch': 'bicycle_crunch',
  'scissor kicks': 'scissor_kicks',
  plank: 'plank',
  // Hevy en español (también los nombres que salen en su exportación CSV).
  'press de banca|barra': 'bench_press',
  'press de banca agarre abierto|barra': 'bench_press',
  'press de banca|mancuerna': 'dumbbell_bench_press',
  'press de banca inclinado|barra': 'incline_bench_press',
  'press de banca|maquina smith': 'smith_bench_press',
  'press de banca inclinado|maquina smith': 'smith_incline_bench_press',
  'press de banca en declive|maquina smith': 'smith_decline_bench_press',
  'press de pecho iso lateral|maquina': 'machine_chest_press',
  'press de pecho|maquina': 'machine_chest_press',
  'press de pecho inclinado|maquina': 'machine_incline_chest_press',
  'mariposa|pec deck': 'pec_deck',
  'aperturas|maquina': 'pec_deck',
  'aperturas|mancuerna': 'chest_fly',
  fondos: 'dip',
  'fondos|asistidos': 'assisted_dip',
  'fondos en banco': 'bench_dip',
  'maquina para fondos sentado': 'seated_dip_machine',
  'press de hombros|mancuerna': 'dumbbell_shoulder_press',
  'press de hombros sentado|maquina': 'machine_shoulder_press',
  'elevacion laterales|mancuerna': 'lateral_raise',
  'elevacion lateral|mancuerna': 'lateral_raise',
  'elevacion laterales|maquina': 'machine_lateral_raise',
  'elevacion lateral|maquina': 'machine_lateral_raise',
  'elevacion lateral a un brazo|cable': 'cable_lateral_raise',
  'elevacion frontal|cable': 'cable_front_raise',
  'jalon de triceps con cuerda': 'rope_pushdown',
  'triceps con polea': 'triceps_pushdown',
  'extension de triceps por encima de la cabeza|cable':
    'overhead_triceps_extension',
  'press frances|barra': 'skull_crusher',
  'jalon al pecho|cable': 'lat_pulldown',
  'jalon al pecho|maquina': 'lat_pulldown',
  'remo sentado con agarre en v|cable': 'seated_cable_row',
  'remo sentado con cable': 'seated_cable_row',
  'remo iso lateral': 'iso_lateral_row',
  'remo iso lateral|maquina': 'iso_lateral_row',
  'remo inclinado|barra': 'barbell_row',
  'remo con mancuerna': 'dumbbell_row',
  dominada: 'pull_up',
  dominadas: 'pull_up',
  'dominada|asistida': 'assisted_pull_up',
  'dominada supina': 'chin_up',
  'dominadas chin up': 'chin_up',
  'dominada supina|asistida': 'assisted_chin_up',
  'dominadas chin up|asistida': 'assisted_chin_up',
  'vuelos posteriores|mancuerna': 'reverse_fly',
  'vuelos posteriores|maquina': 'rear_delt_machine',
  'encogimiento de hombros|mancuerna': 'shrug',
  'encogimiento de hombros|barra': 'shrug',
  'curl de biceps|mancuerna': 'dumbbell_curl',
  'curl de biceps|barra': 'barbell_curl',
  'curl con barra ez': 'barbell_curl',
  'curl martillo|mancuerna': 'hammer_curl',
  'curl de biceps inclinado|mancuerna': 'incline_dumbbell_curl',
  'curl de biceps|cable': 'cable_curl',
  'curl de biceps con cable': 'cable_curl',
  'curl con cuerda|cable': 'cable_curl',
  'curl de biceps|maquina': 'preacher_curl',
  'curl predicador|barra': 'preacher_curl',
  'curl predicador|maquina': 'preacher_curl',
  'sentadilla|barra': 'back_squat',
  'sentadilla|maquina smith': 'smith_squat',
  'sentadilla frontal|barra': 'front_squat',
  'sentadilla bulgara': 'bulgarian_split_squat',
  'sentadilla bulgara|mancuerna': 'bulgarian_split_squat',
  'zancada|mancuerna': 'lunge',
  'zancada|barra': 'lunge',
  'press de piernas': 'leg_press',
  'press de piernas|maquina': 'leg_press',
  'press de piernas sentado': 'leg_press',
  'extension de pierna': 'leg_extension',
  'extension de pierna|maquina': 'leg_extension',
  'curl de piernas acostado|maquina': 'leg_curl',
  'curl de pierna sentado': 'seated_leg_curl',
  'curl de piernas sentado|maquina': 'seated_leg_curl',
  'peso muerto|barra': 'deadlift',
  'peso muerto rumano|barra': 'romanian_deadlift',
  'peso muerto rumano|mancuerna': 'romanian_deadlift',
  'empuje de caderas|barra': 'hip_thrust',
  'empuje de caderas|maquina': 'hip_thrust',
  'extension de pantorrilla|maquina': 'calf_raise',
  'elevacion de gemelos de pie|maquina': 'calf_raise',
  'elevacion de gemelos sentado': 'seated_calf_raise',
  'abduccion de cadera|maquina': 'hip_abduction',
  'abduccion de caderas': 'hip_abduction',
  'aduccion de caderas': 'hip_adduction',
  'aduccion de cadera|maquina': 'hip_adduction',
  'salto al cajon': 'box_jump',
  plancha: 'plank',
  'abdominal corto en banco declinado': 'decline_crunch',
  'abdominal corto en banco inclinado': 'decline_crunch',
  'abdominal corto en banco inclinado|con peso anadido': 'decline_crunch',
  'abdominales bicicleta piernas levantadas': 'bicycle_crunch',
  'abdominales tijera': 'scissor_kicks',
  'elevacion de piernas colgado': 'hanging_leg_raise',
  hiperextension: 'back_extension',
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
