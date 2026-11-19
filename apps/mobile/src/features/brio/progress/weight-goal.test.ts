import { describe, expect, it } from 'vitest';
import { dailyDeltaKcal, direction, etaLabel, goalSummary, goalTypeOf, paceFor, signedWeekly, weeksToGoal } from './weight-goal';

const base = { targetWeightKg: null, weeklyWeightChangeKg: null, currentWeightKg: 80, tdeeKcal: 2600, dailyKcalTarget: 2600 };

describe('weight-goal', () => {
  it('deduce la dirección del peso meta (medio kilo de margen = mantener)', () => {
    expect(direction(80, 74)).toBe('lose');
    expect(direction(80, 84)).toBe('gain');
    expect(direction(80, 80.3)).toBe('maintain');
    expect(direction(80, null)).toBe('maintain');
    expect(goalTypeOf('lose')).toBe('LOSE_WEIGHT');
  });

  it('firma el ritmo y calcula el déficit diario', () => {
    expect(signedWeekly('lose', 0.5)).toBe(-0.5);
    expect(signedWeekly('maintain', 0.5)).toBe(0);
    expect(dailyDeltaKcal(-0.5)).toBe(-550);
    expect(dailyDeltaKcal(0.25)).toBe(280);
  });

  it('calcula semanas y fecha de llegada', () => {
    expect(weeksToGoal(80, 74, -0.5)).toBe(12);
    expect(weeksToGoal(80, 80, 0)).toBeNull();
    expect(etaLabel(12, new Date(2026, 10, 18))).toBe('10 feb');
    expect(etaLabel(70, new Date(2026, 10, 18))).toBe('22 mar 2028');
  });

  it('precarga el ritmo más cercano al guardado', () => {
    expect(paceFor('lose', -0.6)).toBe('normal');
    expect(paceFor('lose', -0.8)).toBe('rapido');
    expect(paceFor('gain', 0.1)).toBe('suave');
  });

  it('resume el objetivo del perfil', () => {
    expect(goalSummary(base).kind).toBe('none');
    expect(goalSummary({ ...base, targetWeightKg: 74, weeklyWeightChangeKg: -0.5, dailyKcalTarget: 2050 })).toEqual({
      kind: 'lose',
      targetKg: 74,
      weeklyKg: -0.5,
      deltaKcal: -550,
      etaWeeks: 12,
    });
  });
});
