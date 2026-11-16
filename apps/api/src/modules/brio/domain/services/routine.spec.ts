import {
  InvalidRoutineError,
  cleanRoutine,
  hevyRoutineFrom,
  kindMatches,
  routineForHevyWorkout,
  routineMuscles,
} from './routine';

describe('routine', () => {
  it('limpia una rutina de gimnasio y acota series, repeticiones y peso', () => {
    const r = cleanRoutine({
      name: '  Torso   A ',
      kind: 'STRENGTH',
      plannedDistanceM: 5000,
      exercises: [
        { exerciseId: 'e1', sets: 40, reps: 0, weightKg: 61.3, restSec: 2000 },
        { exerciseId: 'e2', sets: 3, reps: 12, weightKg: 0 },
      ],
    });
    expect(r.name).toBe('Torso A');
    expect(r.plannedDistanceM).toBeNull();
    expect(r.exercises).toEqual([
      { exerciseId: 'e1', sets: 20, reps: 1, weightKg: 61.25, restSec: 900 },
      { exerciseId: 'e2', sets: 3, reps: 12, weightKg: null, restSec: null },
    ]);
  });

  it('exige nombre y, en gimnasio, al menos un ejercicio', () => {
    expect(() => cleanRoutine({ name: ' ', kind: 'RUN' })).toThrow(
      InvalidRoutineError,
    );
    expect(() => cleanRoutine({ name: 'Pierna', kind: 'STRENGTH' })).toThrow(
      'BRIO_ROUTINE_EXERCISES_REQUIRED',
    );
  });

  it('las de cardio no guardan ejercicios', () => {
    const r = cleanRoutine({
      name: 'Series 6×800',
      kind: 'RUN',
      plannedDistanceM: 8000,
      targetPaceSecPerKm: 270,
      exercises: [{ exerciseId: 'e1', sets: 3, reps: 10 }],
    });
    expect(r.exercises).toEqual([]);
    expect(r.targetPaceSecPerKm).toBe(270);
  });

  it('reparte el trabajo por músculos según series y peso del músculo', () => {
    const m = routineMuscles([
      {
        sets: 4,
        muscles: [
          { muscle: 'CHEST', weight: 1 },
          { muscle: 'TRICEPS', weight: 0.5 },
        ],
      },
      { sets: 2, muscles: [{ muscle: 'TRICEPS', weight: 1 }] },
    ]);
    // Pecho 4, tríceps 2 + 2 = 4 → mitad y mitad.
    expect(m).toEqual([
      { muscle: 'CHEST', share: 0.5, primary: true },
      { muscle: 'TRICEPS', share: 0.5, primary: true },
    ]);
    expect(routineMuscles([])).toEqual([]);
  });

  it('traduce a Hevy con una serie por cada serie prevista', () => {
    const r = hevyRoutineFrom(
      [
        {
          exerciseId: 'e1',
          name: 'Press de banca',
          sets: 2,
          reps: 8,
          weightKg: 70,
          restSec: 120,
        },
        {
          exerciseId: 'e2',
          name: 'Raro',
          sets: 3,
          reps: 10,
          weightKg: null,
          restSec: null,
        },
      ],
      (id) => (id === 'e1' ? 'T-BENCH' : undefined),
    );
    expect(r.skipped).toEqual(['Raro']);
    expect(r.exercises).toEqual([
      {
        exercise_template_id: 'T-BENCH',
        superset_id: null,
        rest_seconds: 120,
        notes: null,
        sets: [
          { type: 'normal', weight_kg: 70, reps: 8 },
          { type: 'normal', weight_kg: 70, reps: 8 },
        ],
      },
    ]);
  });

  it('enlaza un entreno de Hevy por id de rutina o por nombre', () => {
    const routines = [
      { id: 'a', name: 'Torso A', hevyRoutineId: 'H1' },
      { id: 'b', name: 'Pierna', hevyRoutineId: null },
    ];
    expect(
      routineForHevyWorkout(routines, { routineId: 'H1', title: 'X' })?.id,
    ).toBe('a');
    expect(
      routineForHevyWorkout(routines, { routineId: null, title: 'pierna ' })
        ?.id,
    ).toBe('b');
    expect(
      routineForHevyWorkout(routines, { routineId: 'H9', title: 'Otra' }),
    ).toBeNull();
  });

  it('«otro cardio» acepta cualquier cardio; el resto solo su disciplina', () => {
    expect(kindMatches('RUN', 'RUN')).toBe(true);
    expect(kindMatches('RUN', 'CYCLE')).toBe(false);
    expect(kindMatches('OTHER_CARDIO', 'SWIM')).toBe(true);
    expect(kindMatches('OTHER_CARDIO', 'STRENGTH')).toBe(false);
  });
});
