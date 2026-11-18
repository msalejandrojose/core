import { templateExercisesFrom } from './workout-template';
import type { StrengthSet } from '../entities/performance.entity';

const set = (
  exerciseId: string,
  exerciseOrder: number,
  setOrder: number,
  weightKg: number,
  reps: number,
  isWarmup = false,
): StrengthSet => ({
  exerciseId,
  exerciseOrder,
  setOrder,
  weightKg,
  reps,
  rir: null,
  restSec: null,
  isWarmup,
});

describe('plantilla a partir de un entreno', () => {
  it('un ejercicio por bloque, en orden, con las series de trabajo y la serie más pesada', () => {
    expect(
      templateExercisesFrom([
        set('remo', 1, 0, 40, 12),
        set('jalon', 0, 0, 30, 12, true),
        set('jalon', 0, 1, 52, 10),
        set('jalon', 0, 2, 66, 8),
        set('jalon', 0, 3, 66, 10),
        set('remo', 1, 1, 45, 10),
      ]),
    ).toEqual([
      { exerciseId: 'jalon', sets: 3, reps: 10, weightKg: 66 },
      { exerciseId: 'remo', sets: 2, reps: 10, weightKg: 45 },
    ]);
  });

  it('sin carga (peso corporal) la referencia es solo de repeticiones', () => {
    expect(templateExercisesFrom([set('fondos', 0, 0, 0, 10)])).toEqual([
      { exerciseId: 'fondos', sets: 1, reps: 10, weightKg: null },
    ]);
  });

  it('si un ejercicio se repite en el entreno, cuenta la primera vez', () => {
    const t = templateExercisesFrom([
      set('curl', 0, 0, 10, 12),
      set('press', 1, 0, 50, 8),
      set('curl', 2, 0, 12, 10),
    ]);
    expect(t.map((e) => e.exerciseId)).toEqual(['curl', 'press']);
  });
});
