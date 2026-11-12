// Catálogo global de ejercicios de fuerza de Ritmo, con cuánto trabaja cada
// uno cada músculo: 1.0 principal, 0.5 secundario, 0.25 indirecto. Son los
// valores de partida; se guardan en `ritmo_exercise_muscle` y se pueden
// ajustar por ejercicio sin tocar código.

export type Muscle =
  | 'CHEST'
  | 'LATS'
  | 'TRAPS'
  | 'FRONT_DELT'
  | 'SIDE_DELT'
  | 'REAR_DELT'
  | 'BICEPS'
  | 'TRICEPS'
  | 'FOREARMS'
  | 'QUADS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'ABS'
  | 'LOWER_BACK';

export interface SeedExercise {
  code: string;
  name: string;
  compound?: boolean;
  bodyweight?: boolean;
  /** Principales (1.0). */
  p: Muscle[];
  /** Secundarios (0.5). */
  s?: Muscle[];
  /** Indirectos (0.25). */
  i?: Muscle[];
}

export const EXERCISES: readonly SeedExercise[] = [
  // Empuje
  {
    code: 'bench_press',
    name: 'Press de banca',
    compound: true,
    p: ['CHEST'],
    s: ['TRICEPS', 'FRONT_DELT'],
  },
  {
    code: 'incline_bench_press',
    name: 'Press inclinado',
    compound: true,
    p: ['CHEST'],
    s: ['FRONT_DELT', 'TRICEPS'],
  },
  {
    code: 'dumbbell_bench_press',
    name: 'Press con mancuernas',
    compound: true,
    p: ['CHEST'],
    s: ['TRICEPS', 'FRONT_DELT'],
  },
  {
    code: 'chest_fly',
    name: 'Aperturas de pecho',
    p: ['CHEST'],
    i: ['FRONT_DELT'],
  },
  {
    code: 'push_up',
    name: 'Flexiones',
    compound: true,
    bodyweight: true,
    p: ['CHEST'],
    s: ['TRICEPS', 'FRONT_DELT'],
    i: ['ABS'],
  },
  {
    code: 'dip',
    name: 'Fondos en paralelas',
    compound: true,
    bodyweight: true,
    p: ['CHEST', 'TRICEPS'],
    s: ['FRONT_DELT'],
  },
  {
    code: 'overhead_press',
    name: 'Press militar',
    compound: true,
    p: ['FRONT_DELT'],
    s: ['SIDE_DELT', 'TRICEPS'],
    i: ['TRAPS', 'ABS'],
  },
  {
    code: 'dumbbell_shoulder_press',
    name: 'Press de hombro con mancuernas',
    compound: true,
    p: ['FRONT_DELT'],
    s: ['SIDE_DELT', 'TRICEPS'],
  },
  {
    code: 'lateral_raise',
    name: 'Elevaciones laterales',
    p: ['SIDE_DELT'],
    i: ['TRAPS'],
  },
  {
    code: 'triceps_pushdown',
    name: 'Extensión de tríceps en polea',
    p: ['TRICEPS'],
  },
  { code: 'skull_crusher', name: 'Press francés', p: ['TRICEPS'] },
  // Tirón
  {
    code: 'pull_up',
    name: 'Dominadas',
    compound: true,
    bodyweight: true,
    p: ['LATS'],
    s: ['BICEPS', 'REAR_DELT'],
    i: ['FOREARMS', 'TRAPS'],
  },
  {
    code: 'lat_pulldown',
    name: 'Jalón al pecho',
    compound: true,
    p: ['LATS'],
    s: ['BICEPS'],
    i: ['REAR_DELT', 'FOREARMS'],
  },
  {
    code: 'barbell_row',
    name: 'Remo con barra',
    compound: true,
    p: ['LATS'],
    s: ['TRAPS', 'REAR_DELT', 'BICEPS'],
    i: ['LOWER_BACK', 'FOREARMS'],
  },
  {
    code: 'dumbbell_row',
    name: 'Remo con mancuerna',
    compound: true,
    p: ['LATS'],
    s: ['TRAPS', 'REAR_DELT', 'BICEPS'],
    i: ['FOREARMS'],
  },
  {
    code: 'seated_cable_row',
    name: 'Remo en polea baja',
    compound: true,
    p: ['LATS'],
    s: ['TRAPS', 'REAR_DELT', 'BICEPS'],
  },
  { code: 'face_pull', name: 'Face pull', p: ['REAR_DELT'], s: ['TRAPS'] },
  { code: 'reverse_fly', name: 'Pájaros', p: ['REAR_DELT'], i: ['TRAPS'] },
  { code: 'shrug', name: 'Encogimientos', p: ['TRAPS'], i: ['FOREARMS'] },
  {
    code: 'barbell_curl',
    name: 'Curl con barra',
    p: ['BICEPS'],
    s: ['FOREARMS'],
  },
  {
    code: 'dumbbell_curl',
    name: 'Curl con mancuernas',
    p: ['BICEPS'],
    s: ['FOREARMS'],
  },
  { code: 'hammer_curl', name: 'Curl martillo', p: ['BICEPS', 'FOREARMS'] },
  { code: 'wrist_curl', name: 'Curl de muñeca', p: ['FOREARMS'] },
  // Pierna
  {
    code: 'back_squat',
    name: 'Sentadilla',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS', 'LOWER_BACK'],
    i: ['ABS', 'CALVES'],
  },
  {
    code: 'front_squat',
    name: 'Sentadilla frontal',
    compound: true,
    p: ['QUADS'],
    s: ['GLUTES'],
    i: ['ABS', 'LOWER_BACK'],
  },
  {
    code: 'leg_press',
    name: 'Prensa de piernas',
    compound: true,
    p: ['QUADS'],
    s: ['GLUTES'],
    i: ['HAMSTRINGS'],
  },
  {
    code: 'lunge',
    name: 'Zancadas',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
    i: ['CALVES'],
  },
  {
    code: 'bulgarian_split_squat',
    name: 'Sentadilla búlgara',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
  },
  { code: 'leg_extension', name: 'Extensión de cuádriceps', p: ['QUADS'] },
  {
    code: 'deadlift',
    name: 'Peso muerto',
    compound: true,
    p: ['HAMSTRINGS', 'GLUTES', 'LOWER_BACK'],
    s: ['TRAPS', 'QUADS', 'FOREARMS'],
    i: ['LATS'],
  },
  {
    code: 'romanian_deadlift',
    name: 'Peso muerto rumano',
    compound: true,
    p: ['HAMSTRINGS'],
    s: ['GLUTES', 'LOWER_BACK'],
    i: ['FOREARMS'],
  },
  { code: 'leg_curl', name: 'Curl femoral', p: ['HAMSTRINGS'] },
  {
    code: 'hip_thrust',
    name: 'Hip thrust',
    compound: true,
    p: ['GLUTES'],
    s: ['HAMSTRINGS'],
    i: ['QUADS'],
  },
  { code: 'calf_raise', name: 'Elevación de gemelos', p: ['CALVES'] },
  // Core
  {
    code: 'plank',
    name: 'Plancha',
    bodyweight: true,
    p: ['ABS'],
    i: ['LOWER_BACK'],
  },
  { code: 'crunch', name: 'Crunch abdominal', bodyweight: true, p: ['ABS'] },
  {
    code: 'hanging_leg_raise',
    name: 'Elevación de piernas colgado',
    bodyweight: true,
    p: ['ABS'],
    i: ['FOREARMS'],
  },
  {
    code: 'back_extension',
    name: 'Hiperextensiones',
    bodyweight: true,
    p: ['LOWER_BACK'],
    s: ['GLUTES', 'HAMSTRINGS'],
  },
];

/** Disciplina de cada tipo de actividad del catálogo (por `code`). */
export const ACTIVITY_KINDS: Record<string, string> = {
  walking: 'WALK',
  running: 'RUN',
  cycling: 'CYCLE',
  swimming: 'SWIM',
  strength: 'STRENGTH',
  hiit: 'OTHER_CARDIO',
  football: 'OTHER_CARDIO',
  padel: 'OTHER_CARDIO',
  basketball: 'OTHER_CARDIO',
  yoga: 'OTHER',
  hiking: 'HIKE',
  rowing: 'OTHER_CARDIO',
  elliptical: 'ELLIPTICAL',
  dancing: 'OTHER_CARDIO',
  climbing: 'OTHER',
};
