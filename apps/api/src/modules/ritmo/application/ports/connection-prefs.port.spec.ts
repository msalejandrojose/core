import { countedExerciseKcal } from './connection-prefs.port';

describe('kcal de ejercicio que cuentan para el día', () => {
  it('aplica el porcentaje elegido', () => {
    expect(countedExerciseKcal(640, 100)).toBe(640);
    expect(countedExerciseKcal(640, 75)).toBe(480);
    expect(countedExerciseKcal(641, 50)).toBe(321);
    expect(countedExerciseKcal(640, 0)).toBe(0);
  });

  it('acota porcentajes fuera de rango', () => {
    expect(countedExerciseKcal(640, 150)).toBe(640);
    expect(countedExerciseKcal(640, -10)).toBe(0);
  });
});
