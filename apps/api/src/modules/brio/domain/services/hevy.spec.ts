import {
  catalogCodeFor,
  durationSecOf,
  lowerShare,
  musclesFor,
  routineFrom,
  setsFrom,
  splitTitle,
  type HevyWorkout,
} from './hevy';

const CODES = new Set([
  'bench_press',
  'dumbbell_bench_press',
  'back_squat',
  'pull_up',
  'leg_press',
  'hammer_curl',
]);

const workout = (over: Partial<HevyWorkout> = {}): HevyWorkout => ({
  id: 'w1',
  title: 'Torso',
  description: null,
  start_time: '2026-11-10T18:00:00Z',
  end_time: '2026-11-10T19:05:00Z',
  exercises: [],
  ...over,
});

describe('hevy: nombres de ejercicio', () => {
  it('separa el nombre del material', () => {
    expect(splitTitle('Bench Press (Barbell)')).toEqual({
      base: 'bench press',
      equipment: 'barbell',
    });
    expect(splitTitle('Pull Up')).toEqual({ base: 'pull up', equipment: null });
  });

  it('encuentra el ejercicio del catálogo por alias, material o nombre', () => {
    expect(catalogCodeFor('Bench Press (Barbell)', CODES)).toBe('bench_press');
    expect(catalogCodeFor('Bench Press (Dumbbell)', CODES)).toBe(
      'dumbbell_bench_press',
    );
    expect(catalogCodeFor('Squat (Barbell)', CODES)).toBe('back_squat');
    expect(catalogCodeFor('Pull Up', CODES)).toBe('pull_up');
    expect(catalogCodeFor('Leg Press (Machine)', CODES)).toBe('leg_press');
  });

  it('no inventa equivalencias', () => {
    expect(catalogCodeFor('Zottman Curl (Dumbbell)', CODES)).toBeNull();
    expect(catalogCodeFor('Bench Press (Barbell)', new Set())).toBeNull();
  });
});

describe('hevy: músculos de un ejercicio fuera del catálogo', () => {
  it('cuenta entero el grupo principal y la mitad los secundarios', () => {
    expect(
      musclesFor({
        primary_muscle_group: 'chest',
        secondary_muscle_groups: ['triceps', 'shoulders'],
      }),
    ).toEqual([
      { muscle: 'CHEST', weight: 1 },
      { muscle: 'TRICEPS', weight: 0.5 },
      { muscle: 'FRONT_DELT', weight: 0.5 },
      { muscle: 'SIDE_DELT', weight: 0.25 },
    ]);
  });

  it('ignora los grupos que Brío no mide', () => {
    expect(
      musclesFor({
        primary_muscle_group: 'cardio',
        secondary_muscle_groups: ['neck'],
      }),
    ).toEqual([]);
  });
});

describe('hevy: series', () => {
  const w = workout({
    exercises: [
      {
        index: 1,
        title: 'Plank',
        exercise_template_id: 'plank',
        sets: [
          { index: 0, type: 'normal', weight_kg: null, reps: null, rpe: null },
        ],
      },
      {
        index: 0,
        title: 'Bench Press (Barbell)',
        exercise_template_id: 'bench',
        sets: [
          { index: 1, type: 'normal', weight_kg: 80.126, reps: 8, rpe: 8.5 },
          { index: 0, type: 'warmup', weight_kg: 40, reps: 10, rpe: null },
        ],
      },
      {
        index: 2,
        title: 'Pull Up',
        exercise_template_id: 'pull',
        sets: [{ index: 0, type: 'normal', weight_kg: null, reps: 9, rpe: 10 }],
      },
    ],
  });
  const ids: Record<string, string> = { bench: 'E1', pull: 'E2', plank: 'E3' };

  it('ordena, salta las series sin repeticiones y convierte RPE en reserva', () => {
    expect(setsFrom(w, (id) => ids[id])).toEqual([
      {
        exerciseId: 'E1',
        exerciseOrder: 0,
        setOrder: 0,
        weightKg: 40,
        reps: 10,
        rir: null,
        restSec: null,
        isWarmup: true,
      },
      {
        exerciseId: 'E1',
        exerciseOrder: 0,
        setOrder: 1,
        weightKg: 80.13,
        reps: 8,
        rir: 2,
        restSec: null,
        isWarmup: false,
      },
      {
        exerciseId: 'E2',
        exerciseOrder: 1,
        setOrder: 0,
        weightKg: 0,
        reps: 9,
        rir: 0,
        restSec: null,
        isWarmup: false,
      },
    ]);
  });

  it('deja fuera los ejercicios sin equivalente', () => {
    expect(setsFrom(w, () => undefined)).toEqual([]);
  });

  it('acota la duración', () => {
    expect(durationSecOf(w)).toBe(65 * 60);
    expect(durationSecOf(workout({ end_time: '2026-11-10T18:00:01Z' }))).toBe(
      60,
    );
    expect(durationSecOf(workout({ end_time: '2026-11-12T18:00:00Z' }))).toBe(
      6 * 3600,
    );
    expect(durationSecOf(workout({ end_time: 'nope' }))).toBe(60);
  });
});

describe('hevy: rutina a partir de un entreno', () => {
  const set = (
    exerciseId: string,
    exerciseOrder: number,
    setOrder: number,
    weightKg: number,
    isWarmup = false,
  ) => ({
    exerciseId,
    exerciseOrder,
    setOrder,
    weightKg,
    reps: 8,
    rir: null,
    restSec: setOrder === 0 ? 120 : null,
    isWarmup,
    exerciseName: exerciseId === 'E9' ? 'Mi invento' : 'Press banca',
  });

  it('agrupa por ejercicio y avisa de los que no existen en Hevy', () => {
    const r = routineFrom(
      [
        set('E1', 0, 1, 80),
        set('E1', 0, 0, 40, true),
        set('E9', 1, 0, 10),
        set('E2', 2, 0, 0),
      ],
      (id) => ({ E1: 'T1', E2: 'T2' })[id],
    );
    expect(r.skipped).toEqual(['Mi invento']);
    expect(r.exercises).toEqual([
      {
        exercise_template_id: 'T1',
        superset_id: null,
        rest_seconds: 120,
        notes: null,
        sets: [
          { type: 'warmup', weight_kg: 40, reps: 8 },
          { type: 'normal', weight_kg: 80, reps: 8 },
        ],
      },
      {
        exercise_template_id: 'T2',
        superset_id: null,
        rest_seconds: 120,
        notes: null,
        sets: [{ type: 'normal', weight_kg: null, reps: 8 }],
      },
    ]);
  });

  it('distingue una sesión de pierna de una de torso', () => {
    expect(
      lowerShare([
        { primaryMuscle: 'QUADS' },
        { primaryMuscle: 'GLUTES' },
        { primaryMuscle: 'ABS' },
      ]),
    ).toBeCloseTo(2 / 3);
    expect(lowerShare([{ primaryMuscle: 'CHEST' }])).toBe(0);
    expect(lowerShare([{ primaryMuscle: null }])).toBe(0.5);
  });
});
