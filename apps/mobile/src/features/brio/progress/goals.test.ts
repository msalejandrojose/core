import { describe, expect, it } from 'vitest';
import type { BrioProfile } from '../api';
import { weightGoal } from './goals';

const profile = (p: Partial<BrioProfile>) => ({ targetWeightKg: 76, currentWeightKg: 80, weeklyWeightChangeKg: -0.5, ...p }) as BrioProfile;
const w = (day: string, weightKg: number) => ({ day, weightKg, bodyFatPct: null });

describe('weightGoal', () => {
  it('mide el camino desde la primera pesada', () => {
    const g = weightGoal(profile({}), [w('2026-10-01', 82), w('2026-11-10', 80)])!;
    expect(g.pct).toBe(33); // de 82 a 76 llevas 2 de 6
    expect(g.left).toBe(4);
    expect(g.weeksLeft).toBe(8);
    expect(g.etaLabel).toBe('≈ 8 semanas');
  });
  it('calcula el ritmo real de las últimas cuatro semanas', () => {
    const g = weightGoal(profile({}), [w('2026-10-13', 81), w('2026-11-10', 80)])!;
    expect(g.actual).toBeCloseTo(-0.25, 2);
  });
  it('sin peso objetivo no hay meta', () => {
    expect(weightGoal(profile({ targetWeightKg: null }), [])).toBeNull();
  });
  it('conseguido', () => {
    const g = weightGoal(profile({ currentWeightKg: 76 }), [w('2026-10-01', 80), w('2026-11-10', 76)])!;
    expect(g.pct).toBe(100);
    expect(g.etaLabel).toBe('conseguido');
  });
});

it('el ritmo redondeado no suma una semana de más', () => {
  const g = weightGoal(profile({ weeklyWeightChangeKg: -0.57 }), [w('2026-11-01', 80), w('2026-11-10', 80)])!;
  expect(g.weeksLeft).toBe(7);
});
