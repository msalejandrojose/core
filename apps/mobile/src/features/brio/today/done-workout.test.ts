import { describe, expect, it } from 'vitest';
import { SWIPE_ACTION_W, doneWorkoutFacts, swipeRelease } from './done-workout';

describe('done-workout', () => {
  it('resume el entreno: hora, distancia, pulso, esfuerzo, series y origen', () => {
    expect(
      doneWorkoutFacts({
        startTime: '18:30',
        distanceM: 8400,
        avgHeartRate: 152,
        rpe: 7,
        effort: 'VIGOROUS',
        source: 'GARMIN',
      }),
    ).toEqual(['A las 18:30', '8,4 km', '152 ppm de media', 'Esfuerzo 7/10', 'De Garmin']);
  });

  it('en fuerza cuenta ejercicios y series sin el calentamiento', () => {
    const sets = [
      { exerciseId: 'a', isWarmup: true },
      { exerciseId: 'a', isWarmup: false },
      { exerciseId: 'a', isWarmup: false },
      { exerciseId: 'b', isWarmup: false },
    ];
    expect(doneWorkoutFacts({ sets, effort: 'MODERATE', source: 'MANUAL' })).toEqual(['Moderado', '2 ejercicios · 3 series']);
  });

  it('deslizar: poco se cierra, media acción abre y casi toda la fila borra', () => {
    expect(swipeRelease(-20, 360)).toBe('closed');
    expect(swipeRelease(-SWIPE_ACTION_W / 2 - 1, 360)).toBe('open');
    expect(swipeRelease(-250, 360)).toBe('delete');
    // Ya abierta: arrastrar a la derecha la cierra.
    expect(swipeRelease(60, 360, true)).toBe('closed');
    expect(swipeRelease(-10, 360, true)).toBe('open');
  });
});
